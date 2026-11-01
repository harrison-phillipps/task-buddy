import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { asRows } from '../../shared/entityResults.ts';

// Removes the signed-in user from a clinician's clients[] with the service role,
// and returns the pairing's invite to "pending". Verifies server-side that the
// caller really is linked before touching anything.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id || !user.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const clinicianUserId = typeof body?.clinician_user_id === 'string' ? body.clinician_user_id.trim() : '';
    if (!clinicianUserId) {
      return Response.json({ error: 'Which clinician to disconnect from is required' }, { status: 400 });
    }

    const profiles = asRows(await base44.asServiceRole.entities.ClinicianProfile.filter({ user_id: clinicianUserId }));
    const profile = profiles[0];
    if (!profile) {
      return Response.json({ error: 'This clinician no longer has a profile' }, { status: 404 });
    }

    const existing = Array.isArray(profile.clients) ? profile.clients : [];
    if (!existing.some((c) => c.client_user_id === user.id)) {
      console.warn(`[disconnectClinician] user ${user.id} is not linked to clinician ${clinicianUserId}`);
      return Response.json({ error: 'You are not connected to this clinician' }, { status: 403 });
    }

    const clients = existing.filter((c) => c.client_user_id !== user.id);
    await base44.asServiceRole.entities.ClinicianProfile.update(profile.id, { clients });

    await base44.asServiceRole.entities.ClientInvite.updateMany(
      { clinician_user_id: clinicianUserId, client_email: user.email.trim().toLowerCase(), status: 'accepted' },
      { $set: { status: 'pending' } }
    );

    console.log(`[disconnectClinician] user ${user.id} disconnected from clinician ${clinicianUserId}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('[disconnectClinician] error:', error.message);
    return Response.json({ error: 'Could not disconnect right now' }, { status: 500 });
  }
});