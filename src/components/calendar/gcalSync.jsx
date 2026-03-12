/**
 * TaskBuddy → Google Calendar Sync
 */

const GCAL_BASE = 'https://www.googleapis.com/calendar/v3';

export async function syncFocusSessionToCalendar(session, task, accessToken) {
  let startDate;
  if (task?.due_date) {
    startDate = new Date(task.due_date);
    startDate.setHours(9, 0, 0, 0);
  } else {
    startDate = new Date();
    startDate.setHours(9, 0, 0, 0);
  }

  const durationMins = session.duration_minutes || 25;
  const endDate = new Date(startDate.getTime() + durationMins * 60 * 1000);

  const eventBody = {
    summary: `🎯 Focus: ${session.task_title || 'TaskBuddy Session'}`,
    description: [
      'Focus session from TaskBuddy',
      session.focus_technique ? `Technique: ${session.focus_technique}` : null,
      session.work_interval ? `Work interval: ${session.work_interval} mins` : null,
      session.notes ? `Notes: ${session.notes}` : null,
      task?.description ? `Task: ${task.description}` : null,
    ].filter(Boolean).join('\n'),
    start: { dateTime: startDate.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    end: { dateTime: endDate.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    colorId: '2',
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 5 }] },
  };

  const existingEventId = task?.calendar_event_id;
  let gcalEventId = null;

  if (existingEventId) {
    const res = await fetch(`${GCAL_BASE}/calendars/primary/events/${existingEventId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(eventBody),
    });
    if (res.ok) gcalEventId = (await res.json()).id;
  }

  if (!gcalEventId) {
    const res = await fetch(`${GCAL_BASE}/calendars/primary/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(eventBody),
    });
    if (!res.ok) throw new Error(`Failed to create Google Calendar event: ${await res.text()}`);
    gcalEventId = (await res.json()).id;
  }

  return gcalEventId;
}

export async function syncTaskDueDateToCalendar(task, accessToken) {
  if (!task.due_date) throw new Error('Task has no due date to sync');

  const dueDate = new Date(task.due_date);
  const eventBody = {
    summary: `📋 ${task.title}`,
    description: [
      task.description || '',
      task.category ? `Category: ${task.category}` : null,
      task.priority ? `Priority: ${task.priority}` : null,
      `TaskBuddy task ID: ${task.id}`,
    ].filter(Boolean).join('\n'),
    start: { date: dueDate.toISOString().split('T')[0] },
    end: { date: dueDate.toISOString().split('T')[0] },
    colorId: '5',
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 60 }, { method: 'popup', minutes: 1440 }] },
  };

  const existingEventId = task.calendar_event_id;
  let gcalEventId = null;

  if (existingEventId) {
    const res = await fetch(`${GCAL_BASE}/calendars/primary/events/${existingEventId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(eventBody),
    });
    if (res.ok) gcalEventId = (await res.json()).id;
  }

  if (!gcalEventId) {
    const res = await fetch(`${GCAL_BASE}/calendars/primary/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(eventBody),
    });
    if (!res.ok) throw new Error(`Failed to create Google Calendar event: ${await res.text()}`);
    gcalEventId = (await res.json()).id;
  }

  return gcalEventId;
}

export async function fetchUpcomingEvents(accessToken, maxResults = 20) {
  const timeMin = new Date().toISOString();
  const url = new URL(`${GCAL_BASE}/calendars/primary/events`);
  url.searchParams.set('timeMin', timeMin);
  url.searchParams.set('maxResults', maxResults);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');

  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Failed to fetch calendar events: ${await res.text()}`);
  return (await res.json()).items || [];
}

export async function deleteCalendarEvent(eventId, accessToken) {
  const res = await fetch(`${GCAL_BASE}/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 404) throw new Error(`Failed to delete calendar event: ${await res.text()}`);
}