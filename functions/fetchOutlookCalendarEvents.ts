import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("outlook");

    const now = new Date();
    const startDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString();

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${encodeURIComponent(startDateTime)}&endDateTime=${encodeURIComponent(endDateTime)}&$top=50&$select=subject,start,end,bodyPreview`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Microsoft Graph API error:", err);
      return Response.json({ error: 'Failed to fetch Outlook calendar events', details: err }, { status: 500 });
    }

    const data = await response.json();
    const outlookEvents = (data.value || []);
    console.log(`Fetched ${outlookEvents.length} events from Outlook Calendar`);

    // Remove old outlook-sourced events to avoid duplicates
    const existing = await base44.asServiceRole.entities.CalendarEvent.filter({ source: "outlook" });
    await Promise.all(existing.map(e => base44.asServiceRole.entities.CalendarEvent.delete(e.id)));

    let created = 0;
    for (const event of outlookEvents) {
      const startDate = event.start?.dateTime?.split('T')[0];
      if (!startDate) continue;

      const startTime = event.start?.dateTime ? event.start.dateTime.split('T')[1]?.substring(0, 5) : null;
      const endTime = event.end?.dateTime ? event.end.dateTime.split('T')[1]?.substring(0, 5) : null;

      let durationMinutes = null;
      if (event.start?.dateTime && event.end?.dateTime) {
        durationMinutes = Math.round((new Date(event.end.dateTime) - new Date(event.start.dateTime)) / 60000);
      }

      await base44.asServiceRole.entities.CalendarEvent.create({
        title: event.subject || 'Untitled Event',
        description: event.bodyPreview || '',
        start_date: startDate,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: durationMinutes,
        source: "outlook",
        external_id: event.id,
        color: "#0078D4",
      });
      created++;
    }

    await base44.asServiceRole.entities.User.update(user.id, {
      calendar_connected: true,
      calendar_provider: "outlook",
    });

    return Response.json({ success: true, events_synced: created });
  } catch (error) {
    console.error("fetchOutlookCalendarEvents error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});