import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { currentUser, runLeaveTeam } from '../../shared/teamCore.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await currentUser(base44);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const result = await runLeaveTeam({ base44, admin: base44.asServiceRole }, user, body);
    return Response.json(result.json, { status: result.status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}