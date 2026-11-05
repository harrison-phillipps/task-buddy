import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { postTeamMessageCore } from '../../shared/teamPosting.ts';

/**
 * Writes one TeamMessage on the caller's behalf.
 *
 * The caller must be signed in and a member of the team (or the host / a
 * participant of the focus session, for session chat). The member snapshot and
 * the author are stamped from server data; a member list or user id in the
 * payload is ignored.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const actor = await base44.auth.me().catch((e: any) => (e.status === 401 ? null : Promise.reject(e)));
    if (!actor) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const { status, json } = await postTeamMessageCore({
      admin: base44.asServiceRole,
      actor,
      payload,
    });

    return Response.json(json, { status });
  } catch (error: any) {
    console.log('postTeamMessage failed:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}