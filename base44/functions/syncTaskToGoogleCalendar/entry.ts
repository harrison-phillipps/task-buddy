import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { task, scheduled_date, scheduled_time, timezone, recurring, recurrence_end } = await req.json();

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlecalendar");

    const tz = timezone || 'UTC';
    const startIso = `${scheduled_date}T${scheduled_time || '09:00'}:00`;
    const endIso = new Date(new Date(startIso).getTime() + (task.estimated_minutes || 30) * 60000).toISOString();

    const event = {
      summary: task.title,
      description: task.description || '',
      start: { dateTime: startIso, timeZone: tz },
      end: { dateTime: endIso, timeZone: tz },
    };

    if (recurring && recurring !== 'none') {
      const freqMap = {
        daily: 'DAILY',
        weekly: 'WEEKLY',
        weekdays: 'WEEKLY;BYDAY=MO,TU,WE,TH,FR',
        biweekly: 'WEEKLY;INTERVAL=2',
        monthly: 'MONTHLY',
      };
      let rrule = `RRULE:FREQ=${freqMap[recurring] || 'WEEKLY'}`;
      if (recurrence_end) {
        rrule += `;UNTIL=${recurrence_end.replace(/-/g, '')}T000000Z`;
      }
      event.recurrence = [rrule];
    }

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Google Calendar API error:", err);
      return Response.json({ success: false, error: err }, { status: 500 });
    }

    const created = await response.json();
    console.log(`Synced task "${task.title}" to Google Calendar: ${created.id}`);

    return Response.json({ success: true, event_id: created.id, html_link: created.htmlLink });
  } catch (error) {
    console.error("syncTaskToGoogleCalendar error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});