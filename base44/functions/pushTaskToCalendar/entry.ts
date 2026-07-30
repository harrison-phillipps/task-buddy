/**
 * Pushes a task's due date to the user's connected calendar (Google or Outlook).
 * Triggered by entity automation on Task create/update when due_date exists.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const GCAL_BASE = 'https://www.googleapis.com/calendar/v3';
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

async function pushToGoogle(task, accessToken) {
  const dueDate = new Date(task.due_date);
  const dateStr = dueDate.toISOString().split('T')[0];

  const eventBody = {
    summary: `📋 ${task.title}`,
    description: [
      task.description || '',
      task.category ? `Category: ${task.category}` : null,
      task.priority ? `Priority: ${task.priority}` : null,
      `TaskBuddy task ID: ${task.id}`,
    ].filter(Boolean).join('\n'),
    start: { date: dateStr },
    end: { date: dateStr },
    colorId: '5',
    reminders: {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: 60 }, { method: 'popup', minutes: 1440 }],
    },
  };

  if (task.calendar_event_id) {
    const res = await fetch(`${GCAL_BASE}/calendars/primary/events/${task.calendar_event_id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(eventBody),
    });
    if (res.ok) return (await res.json()).id;
  }

  const res = await fetch(`${GCAL_BASE}/calendars/primary/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(eventBody),
  });
  if (!res.ok) throw new Error(`Google Calendar error: ${await res.text()}`);
  return (await res.json()).id;
}

async function pushToOutlook(task, accessToken) {
  const dueDate = new Date(task.due_date);
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${dueDate.getFullYear()}-${pad(dueDate.getMonth() + 1)}-${pad(dueDate.getDate())}`;
  const nextDay = new Date(dueDate);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDateStr = `${nextDay.getFullYear()}-${pad(nextDay.getMonth() + 1)}-${pad(nextDay.getDate())}`;

  const bodyContent = [
    task.description || '',
    task.category ? `Category: ${task.category}` : null,
    task.priority ? `Priority: ${task.priority}` : null,
    `TaskBuddy task ID: ${task.id}`,
  ].filter(Boolean).join('<br>');

  const eventBody = {
    subject: `📋 ${task.title}`,
    body: { contentType: 'HTML', content: bodyContent },
    start: { dateTime: `${dateStr}T00:00:00`, timeZone: 'UTC' },
    end: { dateTime: `${nextDateStr}T00:00:00`, timeZone: 'UTC' },
    isAllDay: true,
    categories: ['TaskBuddy'],
    isReminderOn: true,
    reminderMinutesBeforeStart: 1440,
  };

  if (task.calendar_event_id) {
    const res = await fetch(`${GRAPH_BASE}/me/events/${task.calendar_event_id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(eventBody),
    });
    if (res.ok) return (await res.json()).id;
  }

  const res = await fetch(`${GRAPH_BASE}/me/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(eventBody),
  });
  if (!res.ok) throw new Error(`Outlook Calendar error: ${await res.text()}`);
  return (await res.json()).id;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));

    // Support both entity automation payload and direct invocation
    const taskId = payload?.task_id || payload?.event?.entity_id;
    const taskData = payload?.data; // from entity automation

    if (!taskId) {
      return Response.json({ error: 'task_id required' }, { status: 400 });
    }

    const task = taskData?.id ? taskData : await base44.asServiceRole.entities.Task.get(taskId);
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

    // Auth: allow scheduler/automation (no token), task owner, or admin.
    // Uses the same dual-path pattern as sendDeadlineReminders / dailyTaskDigest:
    // me() returns null OR throws when no user token is present (scheduler context).
    try {
      const caller = await base44.auth.me();
      if (caller !== null) {
        const isOwner = caller.id === task.owner_user_id || caller.id === task.created_by_id;
        if (!isOwner && caller.role !== 'admin') {
          return Response.json({ error: 'Forbidden: you can only sync your own tasks' }, { status: 403 });
        }
      }
    } catch {
      // No user token — scheduler/automation context, safe to proceed
    }

    if (!task.due_date) return Response.json({ skipped: true, reason: 'no_due_date' });
    if (task.status === 'completed') return Response.json({ skipped: true, reason: 'task_completed' });

    let calendarEventId = null;
    let provider = null;

    // Try Google Calendar
    try {
      const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
      calendarEventId = await pushToGoogle(task, accessToken);
      provider = 'google';
      console.log(`Synced task "${task.title}" to Google Calendar: ${calendarEventId}`);
    } catch (gError) {
      console.log('Google Calendar not available:', gError.message);
      // Try Outlook
      try {
        const { accessToken } = await base44.asServiceRole.connectors.getConnection('outlook');
        calendarEventId = await pushToOutlook(task, accessToken);
        provider = 'outlook';
        console.log(`Synced task "${task.title}" to Outlook Calendar: ${calendarEventId}`);
      } catch (oError) {
        console.log('Outlook Calendar not available:', oError.message);
      }
    }

    if (calendarEventId) {
      await base44.asServiceRole.entities.Task.update(taskId, {
        calendar_event_id: calendarEventId,
        calendar_synced: true,
      });
    }

    return Response.json({ success: !!calendarEventId, calendar_event_id: calendarEventId, provider });
  } catch (error) {
    console.error('pushTaskToCalendar error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});