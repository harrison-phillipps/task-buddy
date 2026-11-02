/**
 * Team membership engine shared by createTeam, joinTeamByCode, leaveTeam,
 * inviteMember, removeMember and createTeamTask.
 *
 * A Team row stores membership in six places, and they drift apart:
 *   owner_id         the owner (always counts as an admin)
 *   members[]        { user_id, user_name, user_email, role }
 *   member_ids       legacy mirror of the member user ids
 *   member_user_ids  the field read rules must anchor on
 *   admin_user_ids   admins (the owner is NOT implied here)
 *   member_roles     map of user_id -> role
 *
 * Every mutation rewrites all six together, reads the row back, and restores
 * the pre-write shape if the read-back does not match.
 *
 * Task.team_member_ids is not declared in base44/entities/Task.jsonc, so the
 * task-side sync probes for the field on a real row and reports itself as
 * skipped with a reason instead of writing an undeclared column.
 */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32 (no I, L, O, U)
export const CODE_LENGTH = 10;
const CODE_RE = /^[0-9A-HJKMNP-TV-Z]{6,16}$/;
const ID_RE = /^[A-Za-z0-9_-]{6,64}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CODE_ATTEMPT_LIMIT = 6;
export const CODE_ATTEMPT_WINDOW_MS = 10 * 60 * 1000;

const asRows = (page) => (Array.isArray(page) ? page : (page?.items || []));
const isId = (value) => typeof value === 'string' && ID_RE.test(value.trim());

export const cleanText = (value, max = 200) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

export const normalizeEmail = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase().slice(0, 200) : '';

export const normalizeCode = (value) => {
  const raw = typeof value === 'string' ? value.toUpperCase().replace(/[\s-]/g, '') : '';
  return CODE_RE.test(raw) ? raw : '';
};

export const newInviteCode = (length = CODE_LENGTH) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) out += ALPHABET[bytes[i] % 32];
  return out;
};

/* ---------------------------------------------------------------- rate limit */

const BUCKETS = new Map();

export const rateLimitHit = (key, max = CODE_ATTEMPT_LIMIT, windowMs = CODE_ATTEMPT_WINDOW_MS) => {
  const now = Date.now();
  let bucket = BUCKETS.get(key);
  if (!bucket || now - bucket.start >= windowMs) {
    bucket = { start: now, count: 0 };
    BUCKETS.set(key, bucket);
  }
  bucket.count += 1;
  if (BUCKETS.size > 2000) {
    for (const [k, v] of BUCKETS) if (now - v.start >= windowMs) BUCKETS.delete(k);
  }
  const allowed = bucket.count <= max;
  return {
    allowed,
    remaining: Math.max(0, max - bucket.count),
    retry_after_seconds: allowed ? 0 : Math.ceil((bucket.start + windowMs - now) / 1000),
  };
};

export const rateLimitClear = (key) => {
  BUCKETS.delete(key);
};

/* ------------------------------------------------------------------- members */

const normRole = (role) => (role === 'admin' ? 'admin' : role === 'viewer' ? 'viewer' : 'member');

/**
 * Canonical member list. Built from members[] only, then the owner and any
 * admin_user_ids that are missing are added back as admins, so an owner or an
 * admin can never be dropped by a normalisation pass.
 */
export const normMembers = (team) => {
  const out = [];
  const seen = new Set();
  const push = (member) => {
    if (!member?.user_id || seen.has(member.user_id)) return;
    seen.add(member.user_id);
    out.push(member);
  };

  for (const m of Array.isArray(team?.members) ? team.members : []) {
    const id = typeof m?.user_id === 'string' ? m.user_id.trim() : '';
    if (!id) continue;
    push({
      user_id: id,
      user_name: cleanText(m.user_name, 120),
      user_email: cleanText(m.user_email, 200),
      role: normRole(m.role),
    });
  }

  for (const id of Array.isArray(team?.admin_user_ids) ? team.admin_user_ids : []) {
    if (typeof id !== 'string' || !id.trim()) continue;
    push({ user_id: id.trim(), user_name: '', user_email: '', role: 'admin' });
  }

  const ownerId = typeof team?.owner_id === 'string' ? team.owner_id.trim() : '';
  if (ownerId) {
    const existing = out.find((m) => m.user_id === ownerId);
    if (existing) existing.role = 'admin';
    else push({ user_id: ownerId, user_name: cleanText(team.owner_name, 120), user_email: cleanText(team.owner_email, 200), role: 'admin' });
  }

  return out;
};

/** All six representations, derived from one canonical member list. */
export const membershipPayload = (members) => {
  const list = (members || []).map((m) => ({
    user_id: m.user_id,
    user_name: cleanText(m.user_name, 120),
    user_email: cleanText(m.user_email, 200),
    role: normRole(m.role),
  }));
  const ids = list.map((m) => m.user_id);
  return {
    members: list,
    member_ids: ids,
    member_user_ids: ids,
    admin_user_ids: list.filter((m) => m.role === 'admin').map((m) => m.user_id),
    member_roles: list.reduce((acc, m) => { acc[m.user_id] = m.role; return acc; }, {}),
  };
};

const MEMBERSHIP_FIELDS = ['members', 'member_ids', 'member_user_ids', 'admin_user_ids', 'member_roles', 'pending_invites'];
const OWNER_FIELDS = ['owner_id', 'owner_name', 'owner_email'];

export const snapshotTeam = (team) => {
  const snap = {};
  for (const field of [...OWNER_FIELDS, ...MEMBERSHIP_FIELDS]) snap[field] = team?.[field] ?? null;
  return snap;
};

export const roleOf = (team, userId) => {
  if (!team || !userId) return 'none';
  if (team.owner_id === userId) return 'admin';
  if (Array.isArray(team.admin_user_ids) && team.admin_user_ids.includes(userId)) return 'admin';
  const hit = (Array.isArray(team.members) ? team.members : []).find((m) => m?.user_id === userId);
  if (hit) return normRole(hit.role);
  if (Array.isArray(team.member_user_ids) && team.member_user_ids.includes(userId)) return 'member';
  if (Array.isArray(team.member_ids) && team.member_ids.includes(userId)) return 'member';
  return 'none';
};

export const isMember = (team, userId) => roleOf(team, userId) !== 'none';
export const isTeamAdmin = (team, userId) => roleOf(team, userId) === 'admin';

const sameSet = (a, b) => {
  const left = [...(Array.isArray(a) ? a : [])].sort();
  const right = [...(Array.isArray(b) ? b : [])].sort();
  return left.length === right.length && left.every((v, i) => v === right[i]);
};

/* ---------------------------------------------------------------- team reads */

export const currentUser = async (base44) =>
  base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));

export async function readTeam(admin, teamId) {
  if (!isId(teamId)) return null;
  return asRows(await admin.entities.Team.filter({ id: teamId.trim() }))[0] || null;
}

export async function findTeamByCode(admin, code) {
  if (!code) return null;
  return asRows(await admin.entities.Team.filter({ invite_code: code }))[0] || null;
}

/**
 * A non-member sees the team's name and headcount only: no members[], no
 * member ids, no invite code. Admins and members get the full row.
 */
export const sanitizeTeam = (team, audience) => {
  if (!team) return null;
  const base = {
    id: team.id,
    name: team.name ?? null,
    description: team.description ?? '',
    color: team.color ?? null,
    owner_id: team.owner_id ?? null,
    member_count: (Array.isArray(team.member_user_ids) ? team.member_user_ids : Array.isArray(team.member_ids) ? team.member_ids : []).length,
  };
  if (audience !== 'member' && audience !== 'admin') return base;
  const full = {
    ...base,
    owner_name: team.owner_name ?? null,
    members: Array.isArray(team.members) ? team.members : [],
    member_user_ids: Array.isArray(team.member_user_ids) ? team.member_user_ids : [],
    admin_user_ids: Array.isArray(team.admin_user_ids) ? team.admin_user_ids : [],
  };
  if (audience === 'admin') full.invite_code = team.invite_code ?? null;
  return full;
};

/* ------------------------------------------------------------- membership IO */

export async function saveMembership(admin, team, nextMembers) {
  const kept = [];
  const orphanEmails = [];
  for (const member of nextMembers || []) {
    if (isId(member?.user_id)) {
      kept.push(member);
      continue;
    }
    // A legacy row that stored an email where a user id belongs. It must never
    // reach an id array, so it is kept as a pending invite instead.
    const email = normalizeEmail(member?.user_id) || normalizeEmail(member?.user_email);
    if (email && EMAIL_RE.test(email)) orphanEmails.push(email);
  }

  const payload = membershipPayload(kept);
  const before = snapshotTeam(team);

  const patch = { ...payload };
  if (orphanEmails.length) {
    const pending = Array.isArray(team?.pending_invites) ? [...team.pending_invites] : [];
    for (const email of orphanEmails) {
      if (!pending.some((p) => p?.email === email)) {
        pending.push({ email, invited_at: new Date().toISOString(), invited_by: null });
      }
    }
    patch.pending_invites = pending;
  }

  try {
    await admin.entities.Team.update(team.id, patch);
  } catch (error) {
    return { ok: false, stage: 'write', error: error?.message || 'write_failed', rolled_back: true };
  }

  const after = await readTeam(admin, team.id);
  const verified = Boolean(after)
    && String(after.owner_id) === String(team.owner_id)
    && sameSet(after.member_user_ids, payload.member_user_ids)
    && sameSet(after.member_ids, payload.member_ids)
    && sameSet(after.admin_user_ids, payload.admin_user_ids);

  if (verified) return { ok: true, team: after, payload };

  let rolledBack = false;
  try {
    await admin.entities.Team.update(team.id, before);
    const reverted = await readTeam(admin, team.id);
    rolledBack = Boolean(reverted)
      && String(reverted.owner_id) === String(before.owner_id)
      && sameSet(reverted.member_user_ids, before.member_user_ids || []);
  } catch {
    rolledBack = false;
  }

  return { ok: false, stage: 'verify', error: 'membership_read_back_mismatch', rolled_back: rolledBack };
}

/* ------------------------------------------------------------- task snapshot */

/** Does a Task row actually carry a team_member_ids field today? */
export async function probeTaskMemberField(admin, teamId) {
  const scope = isId(teamId) ? { team_id: teamId.trim() } : {};
  const rows = asRows(await admin.entities.Task.filter(scope, { limit: 1 }));
  const row = rows[0];
  return Boolean(row) && Object.prototype.hasOwnProperty.call(row, 'team_member_ids');
}

const TASK_MEMBER_SKIP = 'Task.team_member_ids is not declared in base44/entities/Task.jsonc — nothing to sync';

/**
 * Keep the denormalised team_member_ids snapshot on a team's tasks in step with
 * membership. No-ops with a reason while the field does not exist.
 */
export async function syncTaskTeamMembers(admin, teamId, memberUserIds) {
  const declared = await probeTaskMemberField(admin, teamId);
  if (!declared) return { synced: 0, field_present: false, skipped_reason: TASK_MEMBER_SKIP };

  let cursor = null;
  let synced = 0;
  let awaiting_backfill = 0;
  for (let page = 0; page < 10; page += 1) {
    const result = await admin.entities.Task.filter(
      { team_id: teamId },
      { limit: 200, ...(cursor ? { cursor } : {}) },
    );
    const rows = Array.isArray(result) ? result : (result?.items || []);
    // Only refresh rows that already carry the snapshot. Seeding the field is the
    // separately approved backfill's job, so leaving or removing a member never
    // mass-writes it.
    const seeded = rows.filter((row) => Object.prototype.hasOwnProperty.call(row, 'team_member_ids'));
    await Promise.all(seeded.map((row) => admin.entities.Task.update(row.id, { team_member_ids: memberUserIds })));
    synced += seeded.length;
    awaiting_backfill += rows.length - seeded.length;
    cursor = !Array.isArray(result) && result?.has_more ? result.next_cursor : null;
    if (!cursor) break;
  }
  return { synced, field_present: true, awaiting_backfill };
}

/* ------------------------------------------------------------------ runners */

const fail = (status, error, extra = {}) => ({ status, json: { ok: false, error, ...extra } });

export async function runCreateTeam(ctx, actor, body) {
  const name = cleanText(body?.name, 80);
  if (!name) return fail(400, 'name is required');
  const description = cleanText(body?.description, 500);
  const color = cleanText(body?.color, 20) || '#8B5CF6';

  let inviteCode = '';
  for (let i = 0; i < 5 && !inviteCode; i += 1) {
    const candidate = newInviteCode();
    const clash = await findTeamByCode(ctx.admin, candidate);
    if (!clash) inviteCode = candidate;
  }
  if (!inviteCode) return fail(500, 'Could not allocate an invite code');

  const owner = {
    user_id: actor.id,
    user_name: cleanText(actor.full_name || actor.email, 120),
    user_email: cleanText(actor.email, 200),
    role: 'admin',
  };

  const created = await ctx.base44.entities.Team.create({
    name,
    description,
    color,
    owner_id: actor.id,
    owner_name: owner.user_name,
    owner_email: owner.user_email,
    invite_code: inviteCode,
    ...membershipPayload([owner]),
  });

  const verified = await readTeam(ctx.admin, created?.id);
  const okRow = Boolean(verified)
    && String(verified.owner_id) === String(actor.id)
    && sameSet(verified.admin_user_ids, [actor.id])
    && sameSet(verified.member_user_ids, [actor.id]);

  if (!okRow) {
    let rolledBack = false;
    if (created?.id) {
      try {
        await ctx.admin.entities.Team.delete(created.id);
        rolledBack = !(await readTeam(ctx.admin, created.id));
      } catch {
        rolledBack = false;
      }
    }
    return fail(500, 'Team creation could not be verified', { rolled_back: rolledBack });
  }

  return {
    status: 201,
    json: {
      ok: true,
      team: sanitizeTeam(verified, 'admin'),
      invite_code: verified.invite_code,
      invite_code_length: String(verified.invite_code || '').length,
    },
  };
}

export async function runJoinTeamByCode(ctx, actor, body) {
  const code = normalizeCode(body?.code);
  if (!code) return fail(400, 'code is required');

  const key = `join:${actor.id}`;
  const gate = rateLimitHit(key);
  if (!gate.allowed) {
    return fail(429, 'Too many invite code attempts', { retry_after_seconds: gate.retry_after_seconds });
  }

  const team = await findTeamByCode(ctx.admin, code);
  // Identical response for a wrong code and a code that does not exist.
  if (!team) return fail(400, 'Invalid invite code', { attempts_remaining: gate.remaining });

  const existingRole = roleOf(team, actor.id);
  if (existingRole !== 'none') {
    rateLimitClear(key);
    return { status: 200, json: { ok: true, already_member: true, role: existingRole, team: sanitizeTeam(team, 'member') } };
  }

  const next = normMembers(team);
  next.push({
    user_id: actor.id,
    user_name: cleanText(actor.full_name || actor.email, 120),
    user_email: cleanText(actor.email, 200),
    role: 'member',
  });

  const saved = await saveMembership(ctx.admin, team, next);
  if (!saved.ok) return fail(500, 'Could not join team', { stage: saved.stage, rolled_back: saved.rolled_back });

  rateLimitClear(key);

  // A pending invite for the email that just joined is spent.
  const pending = Array.isArray(team.pending_invites) ? team.pending_invites : [];
  const joinedEmail = normalizeEmail(actor.email);
  if (joinedEmail && pending.some((p) => p?.email === joinedEmail)) {
    await ctx.admin.entities.Team.update(team.id, {
      pending_invites: pending.filter((p) => p?.email !== joinedEmail),
    });
  }

  return { status: 200, json: { ok: true, joined: true, team: sanitizeTeam(saved.team, 'member') } };
}

export async function runLeaveTeam(ctx, actor, body) {
  const team = await readTeam(ctx.admin, body?.team_id);
  if (!team) return fail(404, 'Team not found');

  const role = roleOf(team, actor.id);
  if (role === 'none') return fail(403, 'Not a member of this team');
  if (team.owner_id === actor.id) return fail(409, 'The owner cannot leave; transfer ownership first');

  const admins = Array.isArray(team.admin_user_ids) ? team.admin_user_ids : [];
  if (role === 'admin' && admins.length <= 1) return fail(409, 'You are the only admin; promote another admin first');

  const next = normMembers(team).filter((m) => m.user_id !== actor.id);
  const saved = await saveMembership(ctx.admin, team, next);
  if (!saved.ok) return fail(500, 'Could not leave team', { stage: saved.stage, rolled_back: saved.rolled_back });

  const taskSync = await syncTaskTeamMembers(ctx.admin, team.id, saved.payload.member_user_ids);
  return {
    status: 200,
    json: { ok: true, left: true, team_id: team.id, member_count: saved.payload.member_user_ids.length, task_sync: taskSync },
  };
}

export async function runInviteMember(ctx, actor, body) {
  const team = await readTeam(ctx.admin, body?.team_id);
  if (!team) return fail(404, 'Team not found');
  if (!isTeamAdmin(team, actor.id)) return fail(403, 'Admin access required');

  /* ----------------------------------------------------- invite by email */

  const email = normalizeEmail(body?.email);

  /**
   * An email invite never touches the membership arrays. A registered user is
   * added as a member under their user id; anyone else is recorded as a pending
   * invite on the team row. No email address reaches member_ids,
   * member_user_ids or admin_user_ids, and a pending invite grants no access.
   */
  if (email) {
    if (!EMAIL_RE.test(email)) return fail(400, 'A valid email address is required');

    const members = normMembers(team);
    const alreadyMember = String(team.owner_email || '').toLowerCase() === email
      || members.some((m) => String(m.user_email || '').toLowerCase() === email);
    if (alreadyMember) return fail(409, 'That person is already a member');

    const registered = asRows(await ctx.admin.entities.User.filter({ email }))[0] || null;

    if (!registered?.id) {
      const pending = Array.isArray(team.pending_invites) ? [...team.pending_invites] : [];
      if (!pending.some((p) => p?.email === email)) {
        pending.push({ email, invited_at: new Date().toISOString(), invited_by: actor.id });
        try {
          await ctx.admin.entities.Team.update(team.id, { pending_invites: pending });
        } catch (error) {
          return fail(500, 'Could not record the pending invite', { detail: error?.message });
        }
        const after = await readTeam(ctx.admin, team.id);
        const recorded = (Array.isArray(after?.pending_invites) ? after.pending_invites : [])
          .some((p) => p?.email === email);
        if (!recorded) return fail(500, 'Could not record the pending invite', { rolled_back: false });
      }
      return { status: 202, json: { ok: true, pending: true, email, member_count: members.length } };
    }

    const saved = await saveMembership(ctx.admin, team, [
      ...members,
      {
        user_id: registered.id,
        user_name: cleanText(registered.full_name || registered.email, 120),
        user_email: email,
        role: 'member',
      },
    ]);
    if (!saved.ok) return fail(500, 'Could not add that member', { stage: saved.stage, rolled_back: saved.rolled_back });

    return {
      status: 201,
      json: {
        ok: true,
        joined: true,
        user_id: registered.id,
        email,
        member_count: saved.payload.member_user_ids.length,
        team: sanitizeTeam(saved.team, 'admin'),
      },
    };
  }

  const rotate = body?.rotate === true;
  let code = normalizeCode(team.invite_code);
  let rotated = false;

  if (rotate || !code) {
    let candidate = '';
    for (let i = 0; i < 5 && !candidate; i += 1) {
      const attempt = newInviteCode();
      const clash = await findTeamByCode(ctx.admin, attempt);
      if (!clash) candidate = attempt;
    }
    if (!candidate) return fail(500, 'Could not allocate an invite code');

    try {
      await ctx.admin.entities.Team.update(team.id, { invite_code: candidate });
      const after = await readTeam(ctx.admin, team.id);
      if (after?.invite_code !== candidate) throw new Error('invite_code_read_back_mismatch');
      code = candidate;
      rotated = true;
    } catch (error) {
      try {
        await ctx.admin.entities.Team.update(team.id, { invite_code: team.invite_code ?? null });
      } catch {
        /* rollback reported below */
      }
      return fail(500, 'Could not rotate the invite code', { rolled_back: true, detail: error?.message });
    }
  }

  return {
    status: 200,
    json: { ok: true, team_id: team.id, invite_code: code, rotated, member_count: normMembers(team).length },
  };
}

export async function runRemoveMember(ctx, actor, body) {
  const team = await readTeam(ctx.admin, body?.team_id);
  if (!team) return fail(404, 'Team not found');
  if (!isTeamAdmin(team, actor.id)) return fail(403, 'Admin access required');

  const targetId = cleanText(body?.user_id || body?.member_user_id, 64);
  if (!targetId) return fail(400, 'user_id is required');
  if (!isId(targetId)) return fail(400, 'user_id must be a user id');
  if (targetId === team.owner_id) return fail(409, 'The team owner cannot be removed');

  const members = normMembers(team);
  if (!members.some((m) => m.user_id === targetId)) return fail(404, 'That user is not a member of this team');

  const remaining = members.filter((m) => m.user_id !== targetId);
  if (!remaining.some((m) => m.role === 'admin')) return fail(409, 'That is the last admin; promote another admin first');

  const saved = await saveMembership(ctx.admin, team, remaining);
  if (!saved.ok) return fail(500, 'Could not remove member', { stage: saved.stage, rolled_back: saved.rolled_back });

  const taskSync = await syncTaskTeamMembers(ctx.admin, team.id, saved.payload.member_user_ids);
  return {
    status: 200,
    json: {
      ok: true,
      removed_user_id: targetId,
      team_id: team.id,
      member_count: saved.payload.member_user_ids.length,
      admin_user_ids: saved.payload.admin_user_ids,
      task_sync: taskSync,
    },
  };
}

export async function runSetMemberRole(ctx, actor, body) {
  const team = await readTeam(ctx.admin, body?.team_id);
  if (!team) return fail(404, 'Team not found');
  if (!isTeamAdmin(team, actor.id)) return fail(403, 'Admin access required');

  const targetId = cleanText(body?.user_id, 64);
  if (!targetId) return fail(400, 'user_id is required');
  if (!isId(targetId)) return fail(400, 'user_id must be a user id');
  if (targetId === team.owner_id) return fail(409, 'The owner role cannot be changed');

  const role = normRole(body?.role);
  const members = normMembers(team);
  const target = members.find((m) => m.user_id === targetId);
  if (!target) return fail(404, 'That user is not a member of this team');

  if (target.role === role) {
    return {
      status: 200,
      json: { ok: true, unchanged: true, user_id: targetId, role, member_roles: team.member_roles || {} },
    };
  }

  const next = members.map((m) => (m.user_id === targetId ? { ...m, role } : m));
  // The owner is always an admin, so this only fires for a team with no owner row.
  if (!next.some((m) => m.role === 'admin')) return fail(409, 'The team would be left without an admin');

  const saved = await saveMembership(ctx.admin, team, next);
  if (!saved.ok) return fail(500, 'Could not update the role', { stage: saved.stage, rolled_back: saved.rolled_back });

  return {
    status: 200,
    json: {
      ok: true,
      user_id: targetId,
      role,
      member_count: saved.payload.member_user_ids.length,
      admin_user_ids: saved.payload.admin_user_ids,
      member_roles: saved.payload.member_roles,
    },
  };
}

export async function runCreateTeamTask(ctx, actor, body) {
  const team = await readTeam(ctx.admin, body?.team_id);
  if (!team) return fail(404, 'Team not found');
  if (!isMember(team, actor.id)) return fail(403, 'Not a member of this team');

  const title = cleanText(body?.title, 200);
  if (!title) return fail(400, 'title is required');

  const members = normMembers(team);
  const requested = cleanText(body?.assigned_to, 64);
  const assigneeId = requested && members.some((m) => m.user_id === requested) ? requested : actor.id;
  const assignee = members.find((m) => m.user_id === assigneeId);
  const assigneeName = cleanText(assignee?.user_name || actor.full_name || actor.email, 120);

  const created = await ctx.base44.entities.Task.create({
    title,
    description: cleanText(body?.description, 2000),
    team_id: team.id,
    status: 'not_started',
    priority: cleanText(body?.priority, 20) || 'medium',
    category: cleanText(body?.category, 20) || 'personal',
    difficulty: cleanText(body?.difficulty, 20) || 'medium',
    energy_level_needed: cleanText(body?.energy_level_needed, 20) || 'medium',
    due_date: cleanText(body?.due_date, 20) || null,
    estimated_minutes: typeof body?.estimated_minutes === 'number' ? body.estimated_minutes : null,
    owner_user_id: actor.id,
    assigned_to: assigneeId,
    assigned_to_name: assigneeName,
    assigned_to_users: [{ user_id: assigneeId, user_name: assigneeName }],
    subtasks: Array.isArray(body?.subtasks) ? body.subtasks : [],
  });

  let task = null;
  try {
    const rows = asRows(await ctx.admin.entities.Task.filter({ id: created?.id }));
    task = rows[0] || null;
    if (!task) throw new Error('task_read_back_missing');
  } catch (error) {
    if (created?.id) {
      try {
        await ctx.admin.entities.Task.delete(created.id);
      } catch {
        /* rollback reported below */
      }
    }
    return fail(500, 'Task creation could not be verified', { rolled_back: true, detail: error?.message });
  }

  const declared = await probeTaskMemberField(ctx.admin, team.id);
  let taskMemberSync = { synced: 0, field_present: false, skipped_reason: TASK_MEMBER_SKIP };
  if (declared) {
    try {
      await ctx.admin.entities.Task.update(task.id, { team_member_ids: members.map((m) => m.user_id) });
      taskMemberSync = { synced: 1, field_present: true };
    } catch (error) {
      try {
        await ctx.admin.entities.Task.delete(task.id);
      } catch {
        /* rollback reported below */
      }
      return fail(500, 'Team member snapshot on the task could not be written', { rolled_back: true, detail: error?.message });
    }
  }

  return {
    status: 201,
    json: {
      ok: true,
      task: {
        id: task.id,
        title: task.title,
        team_id: task.team_id,
        assigned_to: task.assigned_to,
        assigned_to_name: task.assigned_to_name,
        owner_user_id: task.owner_user_id,
        status: task.status,
      },
      task_member_sync: taskMemberSync,
    },
  };
}