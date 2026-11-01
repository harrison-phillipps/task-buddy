import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { asRows } from '../../shared/entityResults.ts';

// Accepts an invite code on behalf of the signed-in user. The service role is
// used only AFTER the caller, the code, its expiry and the invitee email have
// all been verified server-side. The browser never writes to a clinician's
// profile.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id || !user.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : '';
    if (!code) {
      return Response.json({ error: 'An invite code is required' }, { status: 400 });
    }

    const invites = asRows(await base44.asServiceRole.entities.ClientInvite.filter({ invite_code: code }));
    const now = Date.now();
    const invite = invites.find(
      (inv) =>
        (inv.status === 'pending' || inv.status === 'declined') &&
        (!inv.expires_at || new Date(inv.expires_at).getTime() > now)
    );
    if (!invite) {
      console.warn(`[acceptClinicianInvite] invalid or expired code from user ${user.id}`);
      return Response.json({ error: 'Invalid or expired invite code' }, { status: 404 });
    }

    // An invite must name the address it was issued to, and that must be the caller's.
    const inviteEmail = typeof invite.client_email === 'string' ? invite.client_email.trim().toLowerCase() : '';
    if (!inviteEmail) {
      console.warn(`[acceptClinicianInvite] invite ${invite.id} has no client_email`);
      return Response.json(
        { error: 'This invite is missing an email address. Ask your clinician to send a new one.' },
        { status: 400 }
      );
    }
    if (inviteEmail !== user.email.trim().toLowerCase()) {
      console.warn(`[acceptClinicianInvite] code ${code} issued to a different address than user ${user.id}`);
      return Response.json({ error: 'This invite was issued to a different email address' }, { status: 403 });
    }

    const profiles = asRows(await base44.asServiceRole.entities.ClinicianProfile.filter({
      user_id: invite.clinician_user_id,
    }));
    const profile = profiles[0];
    if (!profile) {
      return Response.json({ error: 'This clinician no longer has a profile' }, { status: 404 });
    }

    const existing = Array.isArray(profile.clients) ? profile.clients : [];
    const alreadyLinked = existing.some((c) => c.client_user_id === user.id);
    const clients = alreadyLinked
      ? existing.map((c) =>
          c.client_user_id === user.id ? { ...c, status: 'active', client_email: inviteEmail } : c
        )
      : [
          ...existing,
          {
            client_user_id: user.id,
            client_display_name: user.display_name || user.full_name || inviteEmail,
            client_email: inviteEmail,
            linked_date: new Date().toISOString().split('T')[0],
            goal_description: invite.goal_description || '',
            status: 'active',
          },
        ];

    await base44.asServiceRole.entities.ClinicianProfile.update(profile.id, { clients });
    await base44.asServiceRole.entities.ClientInvite.update(invite.id, { status: 'accepted', client_email: inviteEmail });

    console.log(`[acceptClinicianInvite] linked user ${user.id} to clinician ${invite.clinician_user_id}`);
    return Response.json({
      success: true,
      clinician_user_id: invite.clinician_user_id,
      clinician_name: invite.clinician_name || '',
      clinician_organisation: invite.clinician_organisation || '',
    });
  } catch (error) {
    console.error('[acceptClinicianInvite] error:', error.message);
    return Response.json({ error: 'Could not accept this invite' }, { status: 500 });
  }
});