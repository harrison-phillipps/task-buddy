import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { task, scheduled_date, scheduled_time, timezone, recurring, recurrence_end } = await req.json();

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("outlook");

    const tz = timezone || 'UTC';
    const startDateTime = `${scheduled_date}T${scheduled_time || '09:00'}:00`;
    const durationMs = (task.estimated_minutes || 30) * 60000;
    const endDate = new Date(new Date(startDateTime).getTime() + durationMs);
    const pad = (n) => String(n).padStart(2, '0');
    const endDateTime = `${endDate.getFullYear()}-${pad(endDate.getMonth()+1)}-${pad(endDate.getDate())}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:00`;

    const event = {
      subject: task.title,
      body: { contentType: 'Text', content: task.description || '' },
      start: { dateTime: startDateTime, timeZone: tz },
      end: { dateTime: endDateTime, timeZone: tz },
      categories: ['TaskBuddy'],
    };

    if (recurring && recurring !== 'none') {
      const dayName = new Date(scheduled_date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const patternMap = {
        daily:    { type: 'daily', interval: 1 },
        weekly:   { type: 'weekly', interval: 1, daysOfWeek: [dayName] },
        weekdays: { type: 'weekly', interval: 1, daysOfWeek: ['monday','tuesday','wednesday','thursday','friday'] },
        biweekly: { type: 'weekly', interval: 2, daysOfWeek: [dayName] },
        monthly:  { type: 'absoluteMonthly', interval: 1, dayOfMonth: new Date(scheduled_date).getDate() },
      };
      const pattern = patternMap[recurring];
      if (pattern) {
        event.recurrence = {
          pattern,
          range: recurrence_end
            ? { type: 'endDate', startDate: scheduled_date, endDate: recurrence_end }
            : { type: 'noEnd', startDate: scheduled_date },
        };
      }
    }

    const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Outlook Calendar API error:", err);
      return Response.json({ success: false, error: err }, { status: 500 });
    }

    const created = await response.json();
    console.log(`Synced task "${task.title}" to Outlook Calendar: ${created.id}`);

    return Response.json({ success: true, event_id: created.id, html_link: created.webLink });
  } catch (error) {
    console.error("syncTaskToOutlook error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});