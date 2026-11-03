import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * TEMPORARY — creates the two throwaway sentinel teams used to verify Team RLS.
 *
 * Admin only. Each created team also gets an RlsProbeSentinel row holding its exact
 * id; that row — not the team name — is what rlsProbeTouch accepts, so a team a
 * normal user happens to name "zzProbe-…" can never be treated as a sentinel.
 */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const SENTINEL_PREFIX = 'zzProbe-';
const asRows = (page) => (Array.isArray(page) ? page : (page?.items || []));

const newInviteCode = (length = 10) => {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) out += ALPHABET[bytes[i] % 32];
  return out;
};

const displayName = (u) => String(u?.display_name || u?.full_name || u?.email || '').slice(0, 120);

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const memberEmail = typeof body?.member_email === 'string' ? body.member_email.trim().toLowerCase() : '';
    const admin = base44.asServiceRole;

    let second = null;
    if (memberEmail && memberEmail !== String(user.email || '').toLowerCase()) {
      second = asRows(await admin.entities.User.filter({ email: memberEmail }))[0] || null;
      if (!second) {
        return Response.json({ error: `No app user with email ${memberEmail}` }, { status: 400 });
      }
    }

    const ownerMember = {
      user_id: user.id,
      user_name: displayName(user),
      user_email: String(user.email || '').slice(0, 200),
      role: 'admin',
    };
    const secondMember = second
      ? {
          user_id: second.id,
          user_name: displayName(second),
          user_email: String(second.email || '').slice(0, 200),
          role: 'member',
        }
      : null;

    const plan = [
      { name: `${SENTINEL_PREFIX}A`, members: [ownerMember] },
      { name: `${SENTINEL_PREFIX}B`, members: secondMember ? [ownerMember, secondMember] : [ownerMember] },
    ];

    const sentinels = [];
    for (const entry of plan) {
      let team = asRows(await admin.entities.Team.filter({ name: entry.name }))[0] || null;
      let created = false;

      if (!team) {
        const ids = entry.members.map((m) => m.user_id);
        team = await admin.entities.Team.create({
          name: entry.name,
          description: 'RLS probe sentinel. Safe to delete.',
          color: '#64748B',
          owner_id: user.id,
          owner_name: ownerMember.user_name,
          owner_email: ownerMember.user_email,
          invite_code: newInviteCode(),
          members: entry.members,
          member_ids: ids,
          member_user_ids: ids,
          admin_user_ids: [user.id],
          member_roles: entry.members.reduce((acc, m) => {
            acc[m.user_id] = m.role;
            return acc;
          }, {}),
          pending_invites: [],
        });
        created = true;
      }

      // Register the exact id. Idempotent: create the row only when it is missing.
      const existingRow = asRows(await admin.entities.RlsProbeSentinel.filter({ team_id: team.id }))[0] || null;
      if (!existingRow) {
        await admin.entities.RlsProbeSentinel.create({ team_id: team.id, label: entry.name });
      }
      const row = asRows(await admin.entities.RlsProbeSentinel.filter({ team_id: team.id }))[0] || null;

      const readBack = asRows(await admin.entities.Team.filter({ id: team.id }))[0] || null;
      sentinels.push({
        label: entry.name,
        name: readBack?.name ?? entry.name,
        id: team.id,
        code: readBack?.invite_code ?? null,
        created,
        registered: Boolean(row),
        member_user_ids: readBack?.member_user_ids ?? [],
        admin_user_ids: readBack?.admin_user_ids ?? [],
        verified: Boolean(readBack) && String(readBack.owner_id) === String(user.id) && Boolean(row),
      });
    }

    return Response.json({
      ok: true,
      sentinels,
      second_member: second ? { id: second.id, email: second.email } : null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}