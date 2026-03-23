import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlecalendar");

    // Fetch next 7 days of events
    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString();

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Google Calendar API error:", err);
      return Response.json({ error: 'Failed to fetch calendar events', details: err }, { status: 500 });
    }

    const data = await response.json();
    const googleEvents = (data.items || []).filter(e => e.status !== 'cancelled');
    console.log(`Fetched ${googleEvents.length} events from Google Calendar`);

    // Remove old google-sourced events to avoid duplicates
    const existing = await base44.asServiceRole.entities.CalendarEvent.filter({ source: "google" });
    await Promise.all(existing.map(e => base44.asServiceRole.entities.CalendarEvent.delete(e.id)));

    // Store new events
    let created = 0;
    for (const event of googleEvents) {
      const startDate = event.start?.date || event.start?.dateTime?.split('T')[0];
      if (!startDate) continue;

      const startTime = event.start?.dateTime ? event.start.dateTime.split('T')[1]?.substring(0, 5) : null;
      const endTime = event.end?.dateTime ? event.end.dateTime.split('T')[1]?.substring(0, 5) : null;

      let durationMinutes = null;
      if (event.start?.dateTime && event.end?.dateTime) {
        durationMinutes = Math.round((new Date(event.end.dateTime) - new Date(event.start.dateTime)) / 60000);
      }

      await base44.asServiceRole.entities.CalendarEvent.create({
        title: event.summary || 'Untitled Event',
        description: event.description || '',
        start_date: startDate,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: durationMinutes,
        source: "google",
        external_id: event.id,
        color: "#4285F4",
      });
      created++;
    }

    // Update user's calendar connection status
    await base44.asServiceRole.entities.User.update(user.id, {
      calendar_connected: true,
      calendar_provider: "google",
    });

    return Response.json({ success: true, events_synced: created });
  } catch (error) {
    console.error("fetchCalendarEvents error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});