/**
 * Polls Google Calendar and Outlook for TaskBuddy events and syncs
 * date/title changes back to the corresponding tasks (Calendar → Task direction).
 * Runs on a schedule every 30 minutes via automation.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const GCAL_BASE = 'https://www.googleapis.com/calendar/v3';
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const TASKBUDDY_ID_PATTERN = /TaskBuddy task ID:\s*([a-zA-Z0-9_-]+)/;

function extractTaskId(description) {
  if (!description) return null;
  const match = description.match(TASKBUDDY_ID_PATTERN);
  return match ? match[1] : null;
}

async function syncFromGoogle(base44, accessToken) {
  const timeMin = new Date().toISOString();
  const future = new Date();
  future.setDate(future.getDate() + 90);

  const url = new URL(`${GCAL_BASE}/calendars/primary/events`);
  url.searchParams.set('timeMin', timeMin);
  url.searchParams.set('timeMax', future.toISOString());
  url.searchParams.set('maxResults', '100');
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('q', 'TaskBuddy task ID');

  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Google Calendar fetch error: ${await res.text()}`);

  const events = (await res.json()).items || [];
  let updated = 0;

  for (const event of events) {
    const taskId = extractTaskId(event.description);
    if (!taskId) continue;

    const eventDate = event.start?.date || event.start?.dateTime?.split('T')[0];
    if (!eventDate) continue;

    try {
      const task = await base44.asServiceRole.entities.Task.get(taskId);
      if (!task || task.status === 'completed') continue;

      const updates = {};
      const taskDate = task.due_date ? task.due_date.split('T')[0] : null;
      if (taskDate !== eventDate) {
        updates.due_date = eventDate;
        updates.calendar_event_id = event.id;
        updates.calendar_synced = true;
      }

      // Sync title changes (only if it's a TaskBuddy-generated event)
      if (event.summary?.startsWith('📋 ')) {
        const eventTitle = event.summary.replace(/^📋\s*/, '').trim();
        if (eventTitle && eventTitle !== task.title) updates.title = eventTitle;
      }

      if (Object.keys(updates).length > 0) {
        console.log(`Updating task "${task.title}" from Google Calendar:`, updates);
        await base44.asServiceRole.entities.Task.update(taskId, updates);
        updated++;
      }
    } catch (err) {
      console.error(`Failed to sync task ${taskId} from Google:`, err.message);
    }
  }
  return updated;
}

async function syncFromOutlook(base44, accessToken) {
  const now = new Date().toISOString();
  const future = new Date();
  future.setDate(future.getDate() + 90);

  const url = new URL(`${GRAPH_BASE}/me/calendarView`);
  url.searchParams.set('startDateTime', now);
  url.searchParams.set('endDateTime', future.toISOString());
  url.searchParams.set('$top', '100');
  url.searchParams.set('$select', 'id,subject,start,body,categories');

  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Outlook fetch error: ${await res.text()}`);

  const events = (await res.json()).value || [];
  const taskBuddyEvents = events.filter(e =>
    e.categories?.includes('TaskBuddy') || e.body?.content?.includes('TaskBuddy task ID')
  );

  let updated = 0;
  for (const event of taskBuddyEvents) {
    const taskId = extractTaskId(event.body?.content || '');
    if (!taskId) continue;

    const eventDate = event.start?.dateTime?.split('T')[0];
    if (!eventDate) continue;

    try {
      const task = await base44.asServiceRole.entities.Task.get(taskId);
      if (!task || task.status === 'completed') continue;

      const updates = {};
      const taskDate = task.due_date ? task.due_date.split('T')[0] : null;
      if (taskDate !== eventDate) {
        updates.due_date = eventDate;
        updates.calendar_event_id = event.id;
        updates.calendar_synced = true;
      }

      if (event.subject?.startsWith('📋 ')) {
        const eventTitle = event.subject.replace(/^📋\s*/, '').trim();
        if (eventTitle && eventTitle !== task.title) updates.title = eventTitle;
      }

      if (Object.keys(updates).length > 0) {
        console.log(`Updating task "${task.title}" from Outlook:`, updates);
        await base44.asServiceRole.entities.Task.update(taskId, updates);
        updated++;
      }
    } catch (err) {
      console.error(`Failed to sync task ${taskId} from Outlook:`, err.message);
    }
  }
  return updated;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduler (no token) or admin only — pure sync poller with no
    // legitimate per-user trigger case. Same pattern as sendDeadlineReminders.
    try {
      const user = await base44.auth.me();
      if (user !== null && user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch {
      // No user token — scheduler context, safe to proceed
    }

    let googleUpdated = 0;
    let outlookUpdated = 0;
    const errors = [];

    try {
      const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
      googleUpdated = await syncFromGoogle(base44, accessToken);
      console.log(`Google Calendar → Tasks: ${googleUpdated} tasks updated`);
    } catch (err) {
      console.log('Google Calendar sync skipped:', err.message);
      errors.push(`Google: ${err.message}`);
    }

    try {
      const { accessToken } = await base44.asServiceRole.connectors.getConnection('outlook');
      outlookUpdated = await syncFromOutlook(base44, accessToken);
      console.log(`Outlook Calendar → Tasks: ${outlookUpdated} tasks updated`);
    } catch (err) {
      console.log('Outlook sync skipped:', err.message);
      errors.push(`Outlook: ${err.message}`);
    }

    return Response.json({
      success: true,
      google_updated: googleUpdated,
      outlook_updated: outlookUpdated,
      total_updated: googleUpdated + outlookUpdated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('syncCalendarToTasks error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});