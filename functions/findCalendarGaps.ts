import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function extractTime(dtStr) {
  if (!dtStr || !dtStr.includes('T')) return null;
  const timePart = dtStr.split('T')[1];
  const parts = timePart.split(':');
  return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
}

function extractDate(dtStr) {
  if (!dtStr || !dtStr.includes('T')) return null;
  return dtStr.split('T')[0];
}

function toMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function fromMinutes(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function getAdjacentDay(dateStr, offset) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { date, work_start = 9, work_end = 18, min_gap_minutes = 30 } = body;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Wide query window to handle any timezone (covers full local day)
    const queryStart = `${getAdjacentDay(targetDate, -1)}T12:00:00Z`;
    const queryEnd = `${getAdjacentDay(targetDate, 1)}T12:00:00Z`;

    let rawEvents = [];
    let provider = null;

    // Try Google Calendar first
    try {
      const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(queryStart)}&timeMax=${encodeURIComponent(queryEnd)}&singleEvents=true&orderBy=startTime&maxResults=50`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) {
        const data = await res.json();
        rawEvents = (data.items || [])
          .filter(e => e.status !== 'cancelled' && e.start?.dateTime)
          .map(e => ({ title: e.summary || 'Busy', start_dt: e.start.dateTime, end_dt: e.end?.dateTime }));
        provider = 'google';
        console.log(`Fetched ${rawEvents.length} Google events`);
      } else {
        console.log('Google Calendar response not ok:', res.status);
      }
    } catch (e) {
      console.log('Google Calendar unavailable:', e.message);
    }

    // Try Outlook if Google not connected
    if (!provider) {
      try {
        const { accessToken } = await base44.asServiceRole.connectors.getConnection('outlook');
        const url = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${encodeURIComponent(queryStart)}&endDateTime=${encodeURIComponent(queryEnd)}&$orderby=start/dateTime&$top=50`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (res.ok) {
          const data = await res.json();
          rawEvents = (data.value || [])
            .filter(e => !e.isAllDay && e.start?.dateTime)
            .map(e => ({ title: e.subject || 'Busy', start_dt: e.start.dateTime, end_dt: e.end?.dateTime }));
          provider = 'outlook';
          console.log(`Fetched ${rawEvents.length} Outlook events`);
        } else {
          console.log('Outlook response not ok:', res.status);
        }
      } catch (e) {
        console.log('Outlook unavailable:', e.message);
      }
    }

    if (!provider) {
      return Response.json({ success: false, error: 'No calendar connected' });
    }

    // Filter to target date and extract local times
    const events = rawEvents
      .filter(e => extractDate(e.start_dt) === targetDate)
      .map(e => ({
        title: e.title,
        start_time: extractTime(e.start_dt),
        end_time: extractTime(e.end_dt),
      }))
      .filter(e => e.start_time && e.end_time)
      .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));

    console.log(`Filtered to ${events.length} events on ${targetDate}`);

    // Find free gaps within work hours
    const workStart = work_start * 60;
    const workEnd = work_end * 60;

    const busySlots = events
      .map(e => ({
        ...e,
        start: toMinutes(e.start_time),
        end: toMinutes(e.end_time),
      }))
      .filter(s => s.end > workStart && s.start < workEnd)
      .sort((a, b) => a.start - b.start);

    const gaps = [];
    let cursor = workStart;

    for (const slot of busySlots) {
      if (slot.start > cursor) {
        const dur = slot.start - cursor;
        if (dur >= min_gap_minutes) {
          gaps.push({ start_time: fromMinutes(cursor), end_time: fromMinutes(slot.start), duration_minutes: dur });
        }
      }
      cursor = Math.max(cursor, slot.end);
    }
    if (workEnd - cursor >= min_gap_minutes) {
      gaps.push({ start_time: fromMinutes(cursor), end_time: fromMinutes(workEnd), duration_minutes: workEnd - cursor });
    }

    // Fetch active tasks
    const allTasks = await base44.entities.Task.filter({ created_by: user.email }, '-updated_date', 50);
    const activeTasks = allTasks
      .filter(t => t.status !== 'completed')
      .map(t => ({
        id: t.id,
        title: t.title,
        estimated_minutes: t.estimated_minutes || 30,
        priority: t.priority || 'medium',
        task_priority: t.task_priority,
        category: t.category,
        difficulty: t.difficulty,
        due_date: t.due_date,
        status: t.status,
      }))
      .sort((a, b) => {
        const p = { urgent: 0, high: 1, medium: 2, low: 3 };
        return (p[a.priority] ?? 2) - (p[b.priority] ?? 2);
      })
      .slice(0, 25);

    // AI task-gap matching
    let suggestions = [];
    if (gaps.length > 0 && activeTasks.length > 0) {
      try {
        const aiResult = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a productivity scheduler. Match tasks to calendar free slots for ${targetDate}.

FREE GAPS (indexed):
${gaps.map((g, i) => `[${i}] ${g.start_time}–${g.end_time} (${g.duration_minutes} min free)`).join('\n')}

AVAILABLE TASKS:
${activeTasks.map(t => `id:${t.id} | "${t.title}" | est:${t.estimated_minutes}min | priority:${t.priority} | due:${t.due_date || 'none'} | category:${t.category}`).join('\n')}

Rules:
- Task estimated_minutes must fit within gap duration
- Urgent/high priority tasks go first
- Morning gaps (before 12:00) → high difficulty tasks; afternoon → lighter tasks
- Each task should appear in at most ONE gap
- Provide up to 3 task suggestions per gap (best fit first)
- Only suggest tasks whose estimated_minutes <= gap duration_minutes

Return gap_index matching the list above.`,
          response_json_schema: {
            type: 'object',
            properties: {
              suggestions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    gap_index: { type: 'number' },
                    task_ids: { type: 'array', items: { type: 'string' } },
                    reasoning: { type: 'string' },
                  },
                },
              },
            },
          },
        });
        suggestions = aiResult.suggestions || [];
        console.log(`AI generated ${suggestions.length} gap suggestions`);
      } catch (e) {
        console.log('AI matching skipped:', e.message);
      }
    }

    return Response.json({ success: true, provider, date: targetDate, events, gaps, tasks: activeTasks, suggestions });

  } catch (error) {
    console.error('findCalendarGaps error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});