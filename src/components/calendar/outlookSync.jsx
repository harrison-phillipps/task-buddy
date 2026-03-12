/**
 * TaskBuddy → Outlook Calendar Sync
 */

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

export async function syncFocusSessionToOutlook(session, task, accessToken) {
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
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const toLocalISO = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const bodyContent = [
    'Focus session from TaskBuddy',
    session.focus_technique ? `Technique: ${session.focus_technique}` : null,
    session.work_interval ? `Work interval: ${session.work_interval} mins` : null,
    session.notes ? `Notes: ${session.notes}` : null,
    task?.description ? `Task: ${task.description}` : null,
  ].filter(Boolean).join('<br>');

  const eventBody = {
    subject: `🎯 Focus: ${session.task_title || 'TaskBuddy Session'}`,
    body: { contentType: 'HTML', content: bodyContent },
    start: { dateTime: toLocalISO(startDate), timeZone: userTimezone },
    end: { dateTime: toLocalISO(endDate), timeZone: userTimezone },
    categories: ['TaskBuddy'],
    isReminderOn: true,
    reminderMinutesBeforeStart: 5,
  };

  const existingEventId = task?.calendar_event_id;
  let outlookEventId = null;

  if (existingEventId) {
    const res = await fetch(`${GRAPH_BASE}/me/events/${existingEventId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(eventBody),
    });
    if (res.ok) outlookEventId = (await res.json()).id;
  }

  if (!outlookEventId) {
    const res = await fetch(`${GRAPH_BASE}/me/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(eventBody),
    });
    if (!res.ok) throw new Error(`Failed to create Outlook Calendar event: ${await res.text()}`);
    outlookEventId = (await res.json()).id;
  }

  return outlookEventId;
}

export async function syncTaskDueDateToOutlook(task, accessToken) {
  if (!task.due_date) throw new Error('Task has no due date to sync');

  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dueDate = new Date(task.due_date);
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${dueDate.getFullYear()}-${pad(dueDate.getMonth()+1)}-${pad(dueDate.getDate())}`;
  const nextDay = new Date(dueDate);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDateStr = `${nextDay.getFullYear()}-${pad(nextDay.getMonth()+1)}-${pad(nextDay.getDate())}`;

  const bodyContent = [
    task.description || '',
    task.category ? `Category: ${task.category}` : null,
    task.priority ? `Priority: ${task.priority}` : null,
    `TaskBuddy task ID: ${task.id}`,
  ].filter(Boolean).join('<br>');

  const eventBody = {
    subject: `📋 ${task.title}`,
    body: { contentType: 'HTML', content: bodyContent },
    start: { dateTime: `${dateStr}T00:00:00`, timeZone: userTimezone },
    end: { dateTime: `${nextDateStr}T00:00:00`, timeZone: userTimezone },
    isAllDay: true,
    categories: ['TaskBuddy'],
    isReminderOn: true,
    reminderMinutesBeforeStart: 1440,
  };

  const existingEventId = task.calendar_event_id;
  let outlookEventId = null;

  if (existingEventId) {
    const res = await fetch(`${GRAPH_BASE}/me/events/${existingEventId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(eventBody),
    });
    if (res.ok) outlookEventId = (await res.json()).id;
  }

  if (!outlookEventId) {
    const res = await fetch(`${GRAPH_BASE}/me/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(eventBody),
    });
    if (!res.ok) throw new Error(`Failed to create Outlook Calendar event: ${await res.text()}`);
    outlookEventId = (await res.json()).id;
  }

  return outlookEventId;
}

export async function fetchUpcomingOutlookEvents(accessToken, maxResults = 20) {
  const now = new Date().toISOString();
  const future = new Date();
  future.setDate(future.getDate() + 30);

  const url = new URL(`${GRAPH_BASE}/me/calendarView`);
  url.searchParams.set('startDateTime', now);
  url.searchParams.set('endDateTime', future.toISOString());
  url.searchParams.set('$top', maxResults);
  url.searchParams.set('$orderby', 'start/dateTime');
  url.searchParams.set('$select', 'id,subject,start,end,bodyPreview,webLink,isAllDay,categories');

  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Failed to fetch Outlook events: ${await res.text()}`);
  return (await res.json()).value || [];
}

export async function deleteOutlookEvent(eventId, accessToken) {
  const res = await fetch(`${GRAPH_BASE}/me/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 404) throw new Error(`Failed to delete Outlook event: ${await res.text()}`);
}