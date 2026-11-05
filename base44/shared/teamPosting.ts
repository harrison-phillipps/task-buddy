/**
 * Server-side posting for team chat (TeamMessage) and team notices
 * (TeamNotification).
 *
 * Both rows used to be written straight from the browser, and both carry a
 * `member_user_ids` snapshot that the entity read rules trust. That made the
 * snapshot a client-supplied read grant: any signed-in user could name any ids
 * and hand those users access to a row.
 *
 * Here the scope is resolved from the database, the caller's membership is
 * checked against the real Team row (or, for session chat, against the session
 * host / participant list), and the snapshot plus the author are stamped from
 * server data. Nothing in the payload can set them.
 */

import { asRows } from './entityResults.ts';

/** Longest accepted chat message body, in characters. */
export const MESSAGE_BODY_MAX = 4000;
/** TeamNotification title is truncated to this length. */
export const NOTIFICATION_TITLE_MAX = 200;
/** TeamNotification message is truncated to this length. */
export const NOTIFICATION_MESSAGE_MAX = 1000;

const NOTIFICATION_TYPES = [
  'task_assigned',
  'task_commented',
  'status_changed',
  'deadline_reminder',
  'session_started',
  'task_completed',
  'general',
];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const asText = (value: any) => (typeof value === 'string' ? value : '');
const asId = (value: any) => asText(value).trim();
const unique = (ids: string[]) => [...new Set(ids)];

export const sameIds = (a: any, b: any) => {
  const left = Array.isArray(a) ? [...a].sort() : [];
  const right = Array.isArray(b) ? [...b].sort() : [];
  return left.length === right.length && left.every((value, i) => value === right[i]);
};

/**
 * Plain user-id list from a team row. Legacy rows stored emails in these
 * arrays; those are dropped rather than copied into a snapshot.
 */
export const memberIdsOf = (team: any): string[] => {
  const primary = Array.isArray(team?.member_user_ids) ? team.member_user_ids : [];
  const fallback = Array.isArray(team?.member_ids) ? team.member_ids : [];
  const source = primary.length ? primary : fallback;
  return source
    .filter((id: any) => typeof id === 'string' && id.trim() && !id.includes('@'))
    .map((id: string) => id.trim());
};

export const isTeamMember = (team: any, userId: string) =>
  Boolean(userId) && memberIdsOf(team).includes(userId);

/** Display name as stored on the row: the caller's own name, never the payload's. */
export const displayName = (user: any): string => {
  const name = asText(user?.full_name).trim();
  if (name) return name;
  const email = asText(user?.email).trim();
  return email || 'A teammate';
};

const loadTeam = async (admin: any, teamId: string) =>
  teamId
    ? admin.entities.Team.get(teamId).catch((e: any) => (e.status === 404 ? null : Promise.reject(e)))
    : null;

const loadSession = async (admin: any, sessionId: string) =>
  sessionId
    ? admin.entities.CollaborativeFocusSession.get(sessionId).catch((e: any) =>
        e.status === 404 ? null : Promise.reject(e),
      )
    : null;

/**
 * Post one team message.
 *
 * payload: { team_id } for a team chat, or { session_id } for focus-session
 * chat (which is still stored under the session id in team_id, as the chat
 * component reads it). Any member list, user id or display name in the payload
 * is ignored.
 */
export async function postTeamMessageCore({ admin, actor, payload }: { admin: any; actor: any; payload: any }) {
  const body = payload && typeof payload === 'object' ? payload : {};
  const content = asText(body.content).trim();
  const sessionId = asId(body.session_id);
  const teamId = asId(body.team_id);
  const replyTo = asId(body.reply_to);

  if (!content) return { status: 400, json: { error: 'A message body is required' } };
  if (content.length > MESSAGE_BODY_MAX) {
    return {
      status: 400,
      json: { error: `Messages are limited to ${MESSAGE_BODY_MAX} characters (${content.length} typed)` },
    };
  }
  if (!sessionId && !teamId) return { status: 400, json: { error: 'team_id or session_id is required' } };

  let scopeId: string;
  let memberIds: string[];

  if (sessionId) {
    const session = await loadSession(admin, sessionId);
    if (!session) return { status: 404, json: { error: 'Session not found' } };

    const sessionMembers = Array.isArray(session.member_user_ids)
      ? session.member_user_ids.filter((id: any) => typeof id === 'string')
      : [];
    const isHost = session.host_id === actor.id;
    if (!isHost && !sessionMembers.includes(actor.id)) {
      return { status: 403, json: { error: 'Only the host or a participant can post in this session' } };
    }

    const team = session.team_id ? await loadTeam(admin, session.team_id) : null;
    // The snapshot comes from the session's team, with the session's own
    // participants unioned in so a participant who has since left the team can
    // still read the conversation they took part in.
    memberIds = unique([...memberIdsOf(team), ...sessionMembers, actor.id]);
    scopeId = session.id;
  } else {
    const team = await loadTeam(admin, teamId);
    if (!team) return { status: 404, json: { error: 'Team not found' } };
    if (!isTeamMember(team, actor.id)) {
      return { status: 403, json: { error: 'You are not a member of this team' } };
    }
    memberIds = memberIdsOf(team);
    scopeId = team.id;
  }

  const row = await admin.entities.TeamMessage.create({
    team_id: scopeId,
    member_user_ids: memberIds,
    user_id: actor.id,
    user_name: displayName(actor),
    content,
    ...(replyTo ? { reply_to: replyTo } : {}),
  });

  return {
    status: 201,
    json: {
      message: {
        id: row?.id,
        team_id: row?.team_id,
        created_date: row?.created_date,
        user_id: row?.user_id,
        user_name: row?.user_name,
        content: row?.content,
      },
    },
  };
}

/**
 * Post one team notice (TeamNotification).
 *
 * payload: { team_id, type, title, message, priority, related_id }. Title and
 * message are truncated to their caps; the member snapshot and created_by come
 * from the team row and the caller.
 */
export async function postTeamNotificationCore({ admin, actor, payload }: { admin: any; actor: any; payload: any }) {
  const body = payload && typeof payload === 'object' ? payload : {};
  const teamId = asId(body.team_id);
  if (!teamId) return { status: 400, json: { error: 'team_id is required' } };

  const team = await loadTeam(admin, teamId);
  if (!team) return { status: 404, json: { error: 'Team not found' } };
  if (!isTeamMember(team, actor.id)) {
    return { status: 403, json: { error: 'You are not a member of this team' } };
  }

  const title = asText(body.title).trim().slice(0, NOTIFICATION_TITLE_MAX);
  const message = asText(body.message).trim().slice(0, NOTIFICATION_MESSAGE_MAX);
  if (!title || !message) return { status: 400, json: { error: 'title and message are required' } };

  const relatedId = asId(body.related_id);
  const row = await admin.entities.TeamNotification.create({
    team_id: team.id,
    member_user_ids: memberIdsOf(team),
    type: NOTIFICATION_TYPES.includes(body.type) ? body.type : 'general',
    title,
    message,
    priority: PRIORITIES.includes(body.priority) ? body.priority : 'medium',
    ...(relatedId ? { related_id: relatedId } : {}),
    // created_by is the legacy author field and cannot be queried; created_by_id
    // is the service account here, so the author owns the row through this.
    created_by: actor.id,
    author_user_id: actor.id,
  });

  return {
    status: 201,
    json: {
      notification: { id: row?.id, team_id: row?.team_id, created_date: row?.created_date },
    },
  };
}

/** Counts rows for a scope — used by the self-test's leftover check. */
export const countRowsForTeam = async (admin: any, entity: string, teamId: string) =>
  asRows(await admin.entities[entity].filter({ team_id: teamId })).length;

/**
 * The signed-in caller, or null when the request carries no usable token.
 * auth.me() surfaces a token-less request as an error whose status is not
 * reliably 401 (it can arrive as 403, or as a bare message), so both shapes map
 * to null instead of escaping as a 500.
 */
export const resolveActor = async (base44: any) => {
  try {
    return (await base44.auth.me()) ?? null;
  } catch (error: any) {
    const message = String(error?.message ?? '');
    const status = Number(error?.status ?? error?.response?.status ?? 0);
    const unauthenticated =
      status === 401 ||
      status === 403 ||
      /logged in|unauthori[sz]ed|unauthenticated|not authenticated/i.test(message);
    if (unauthenticated) return null;
    throw error;
  }
};

/**
 * The handler the postTeamMessage entrypoint serves. The client factory is
 * injected so the token-less path can be exercised in-process: a request with
 * no valid token returns 401 before anything is read or written.
 */
export async function postTeamMessageHandler(
  req: Request,
  createClient: (req: Request) => any,
): Promise<Response> {
  try {
    const base44 = createClient(req);
    const actor = await resolveActor(base44);
    if (!actor) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const { status, json } = await postTeamMessageCore({ admin: base44.asServiceRole, actor, payload });
    return Response.json(json, { status });
  } catch (error: any) {
    console.log('postTeamMessage failed:', error?.message);
    return Response.json({ error: error?.message ?? 'Request failed' }, { status: 500 });
  }
}

/**
 * The handler the postTeamNotification entrypoint serves. Same contract:
 * no valid token, no work — 401 first.
 */
export async function postTeamNotificationHandler(
  req: Request,
  createClient: (req: Request) => any,
): Promise<Response> {
  try {
    const base44 = createClient(req);
    const actor = await resolveActor(base44);
    if (!actor) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const { status, json } = await postTeamNotificationCore({ admin: base44.asServiceRole, actor, payload });
    return Response.json(json, { status });
  } catch (error: any) {
    console.log('postTeamNotification failed:', error?.message);
    return Response.json({ error: error?.message ?? 'Request failed' }, { status: 500 });
  }
}