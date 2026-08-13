import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Parses a date+time as wall-clock Adelaide local and returns the true UTC
// instant. Intl resolves the actual IANA offset (ACST +09:30 / ACDT +10:30),
// so this stays correct across daylight-saving transitions.
function adelaideLocalToUtc(dateStr, timeStr, timeZone = 'Australia/Adelaide') {
  const naiveUtc = new Date(`${dateStr}T${timeStr}:00Z`);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = Object.fromEntries(formatter.formatToParts(naiveUtc).map(p => [p.type, p.value]));
  const asIfLocal = new Date(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
  const offsetMs = naiveUtc.getTime() - asIfLocal.getTime();
  return new Date(naiveUtc.getTime() + offsetMs);
}

// Returns the Adelaide-local weekday (0=Sun..6=Sat) for a given Date instant,
// matching JS getDay() numbering. Must use Intl — .getDay() reads the UTC
// calendar and returns the wrong weekday during the Adelaide-morning blind
// spot (Adelaide 00:00–09:30/10:30 = previous UTC day).
function adelaideWeekday(date, timeZone = 'Australia/Adelaide') {
  const short = new Intl.DateTimeFormat('en-US', {
    timeZone, weekday: 'short',
  }).format(date);
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[short];
}

// Returns the Adelaide-local YYYY-MM-DD for a given Date, so date-window
// boundaries align with Adelaide wall-clock days, not the server's UTC day.
function adelaideDateString(date, timeZone = 'Australia/Adelaide') {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const y = parts.find(p => p.type === 'year').value;
  const m = parts.find(p => p.type === 'month').value;
  const d = parts.find(p => p.type === 'day').value;
  return `${y}-${m}-${d}`;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function addWeeks(date, n) { return addDays(date, n * 7); }
function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}
function formatDate(date) {
  return adelaideDateString(date);
}
function today() { return adelaideDateString(new Date()); }

function calculateNextOccurrence(fromDate, template) {
  // Anchor fromDate (YYYY-MM-DD) to Adelaide midnight as a true UTC instant,
  // so addDays/addWeeks/addMonths resolve against the Adelaide calendar.
  const base = adelaideLocalToUtc(fromDate, '00:00');
  switch (template.recurrence_pattern) {
    case 'daily':
      return addDays(base, template.recurrence_interval || 1);
    case 'weekly':
      if (template.recurrence_days && template.recurrence_days.length > 0) {
        let next = addDays(base, 1);
        for (let i = 0; i < 14; i++) {
          if (template.recurrence_days.includes(adelaideWeekday(next))) return next;
          next = addDays(next, 1);
        }
      }
      return addWeeks(base, 1);
    case 'biweekly':
      return addWeeks(base, 2);
    case 'monthly':
      return addMonths(base, 1);
    case 'custom':
      return addDays(base, template.recurrence_interval || 1);
    default:
      return addDays(base, 1);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data, old_data } = body;

    // Only act on update events where status just changed to 'completed'
    if (event?.type !== 'update') {
      return Response.json({ skipped: 'not an update event' });
    }

    const task = data;
    const wasCompleted = old_data?.status !== 'completed' && task?.status === 'completed';

    if (!wasCompleted) {
      return Response.json({ skipped: 'task not just completed' });
    }

    console.log(`Task completed: ${task.id} — "${task.title}"`);

    // Resolve the template: either the task is a template itself, or find its parent template
    let template = null;

    if (task.is_recurring && !task.parent_recurring_task_id && task.recurrence_pattern && task.recurrence_pattern !== 'none') {
      // This IS the recurring template
      template = task;
    } else if (task.parent_recurring_task_id) {
      // This is an instance — fetch the parent template
      const allTasks = await base44.asServiceRole.entities.Task.list();
      template = allTasks.find(t => t.id === task.parent_recurring_task_id);
    }

    if (!template) {
      return Response.json({ skipped: 'no recurring template found' });
    }

    // Check if recurrence has expired
    if (template.recurrence_end_date && template.recurrence_end_date < today()) {
      console.log(`Recurrence end date passed for template ${template.id}`);
      return Response.json({ skipped: 'recurrence end date passed' });
    }

    // Determine the base date to calculate next occurrence from
    const baseDateStr = task.due_date || today();
    const nextDate = calculateNextOccurrence(baseDateStr, template);
    const nextDateStr = formatDate(nextDate);

    // Check no instance already exists for that date
    const allTasks = await base44.asServiceRole.entities.Task.list();
    const alreadyExists = allTasks.some(t =>
      t.parent_recurring_task_id === template.id &&
      t.due_date === nextDateStr &&
      t.id !== task.id
    );

    if (alreadyExists) {
      console.log(`Instance already exists for ${template.id} on ${nextDateStr}`);
      return Response.json({ skipped: 'instance already exists for next date' });
    }

    // Spawn the next instance
    const nextInstance = {
      title: template.title,
      description: template.description || '',
      category: template.category || 'personal',
      difficulty: template.difficulty || 'medium',
      priority: template.priority || 'medium',
      energy_level_needed: template.energy_level_needed || 'medium',
      estimated_minutes: template.estimated_minutes || 30,
      subtasks: (template.subtasks || []).map(s => ({ ...s, completed: false, completed_date: undefined })),
      status: 'not_started',
      due_date: nextDateStr,
      parent_recurring_task_id: template.id,
      is_recurring: false,
      team_id: template.team_id || undefined,
      goal_id: template.goal_id || undefined,
      owner_user_id: template.created_by_id,
    };

    const created = await base44.asServiceRole.entities.Task.create(nextInstance);
    console.log(`Created next recurring instance: ${created.id} due ${nextDateStr}`);

    // Update the template's next_occurrence_date
    await base44.asServiceRole.entities.Task.update(template.id, {
      next_occurrence_date: nextDateStr
    });

    return Response.json({
      success: true,
      next_instance_id: created.id,
      next_due_date: nextDateStr,
    });

  } catch (error) {
    console.error('recurringTaskHandler error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});