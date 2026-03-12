import {
  syncFocusSessionToCalendar,
  syncTaskDueDateToCalendar,
  fetchUpcomingEvents as fetchGoogleEvents,
  deleteCalendarEvent as deleteGoogleEvent,
} from '@/components/calendar/gcalSync';

import {
  syncFocusSessionToOutlook,
  syncTaskDueDateToOutlook,
  fetchUpcomingOutlookEvents,
  deleteOutlookEvent,
} from '@/components/calendar/outlookSync';

export async function syncFocusSession(session, task, config) {
  if (config.provider === 'google') return syncFocusSessionToCalendar(session, task, config.token);
  if (config.provider === 'outlook') return syncFocusSessionToOutlook(session, task, config.token);
  throw new Error(`Unknown calendar provider: ${config.provider}`);
}

export async function syncTaskDueDate(task, config) {
  if (config.provider === 'google') return syncTaskDueDateToCalendar(task, config.token);
  if (config.provider === 'outlook') return syncTaskDueDateToOutlook(task, config.token);
  throw new Error(`Unknown calendar provider: ${config.provider}`);
}

export async function fetchUpcomingEvents(config, maxResults = 20) {
  if (config.provider === 'google') {
    const events = await fetchGoogleEvents(config.token, maxResults);
    return events.map(e => ({
      id: e.id,
      title: e.summary,
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      isAllDay: !!e.start?.date,
      link: e.htmlLink,
      provider: 'google',
      raw: e,
    }));
  }
  if (config.provider === 'outlook') {
    const events = await fetchUpcomingOutlookEvents(config.token, maxResults);
    return events.map(e => ({
      id: e.id,
      title: e.subject,
      start: e.start?.dateTime,
      end: e.end?.dateTime,
      isAllDay: e.isAllDay,
      link: e.webLink,
      provider: 'outlook',
      raw: e,
    }));
  }
  throw new Error(`Unknown calendar provider: ${config.provider}`);
}

export async function deleteEvent(eventId, config) {
  if (config.provider === 'google') return deleteGoogleEvent(eventId, config.token);
  if (config.provider === 'outlook') return deleteOutlookEvent(eventId, config.token);
  throw new Error(`Unknown calendar provider: ${config.provider}`);
}