import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { postTeamNotificationCore } from '../../shared/teamPosting.ts';

/**
 * Writes one TeamNotification on the caller's behalf.
 *
 * The caller must be signed in and a member of the team. The member snapshot
 * and created_by are stamped from the team row and the caller; the payload's
 * member list and created_by are ignored. Title is capped at 200 characters
 * and message at 1000.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const actor = await base44.auth.me().catch((e: any) => (e.status === 401 ? null : Promise.reject(e)));
    if (!actor) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const { status, json } = await postTeamNotificationCore({
      admin: base44.asServiceRole,
      actor,
      payload,
    });

    return Response.json(json, { status });
  } catch (error: any) {
    console.log('postTeamNotification failed:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}