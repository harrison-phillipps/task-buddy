import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { itemType, client_user_id, title, clinician_name,
            category, estimated_minutes, energy_level, description } = await req.json();

    if (!client_user_id || !title || !itemType) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate caller has a ClinicianProfile that includes this client
    const profiles = await base44.asServiceRole.entities.ClinicianProfile.filter({ user_id: user.id });
    if (profiles.length === 0) {
      return Response.json({ error: 'No clinician profile found' }, { status: 403 });
    }
    const profile = profiles[0];
    const isLinked = (profile.clients || []).some(c => c.client_user_id === client_user_id);
    if (!isLinked) {
      return Response.json({ error: 'Client not linked to this clinician' }, { status: 403 });
    }

    let record;
    if (itemType === 'task') {
      record = await base44.asServiceRole.entities.Task.create({
        title: title.trim(),
        category: category || 'personal',
        estimated_minutes: estimated_minutes ? Number(estimated_minutes) : undefined,
        energy_level_needed: energy_level || 'medium',
        status: 'not_started',
        created_by_id: client_user_id,
        added_by_clinician: true,
        added_by_clinician_name: clinician_name,
      });
    } else {
      record = await base44.asServiceRole.entities.Goal.create({
        title: title.trim(),
        description: description?.trim() || undefined,
        type: 'personal',
        status: 'not_started',
        created_by_id: client_user_id,
        added_by_clinician: true,
        added_by_clinician_name: clinician_name,
      });
    }

    return Response.json({ record });
  } catch (error) {
    console.error('addClinicianItem error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});