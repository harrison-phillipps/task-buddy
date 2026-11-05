import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { postTeamMessageHandler } from '../../shared/teamPosting.ts';

/**
 * Writes one TeamMessage on the caller's behalf.
 *
 * The handler lives in shared/teamPosting.ts (so the token-less path is
 * testable); this entry only binds the real SDK client to it. The caller must be
 * signed in and a member of the team — or the host / a participant of the focus
 * session, for session chat. The member snapshot and the author are stamped from
 * server data; a member list or user id in the payload is ignored.
 */
export default function (req: Request): Promise<Response> {
  return postTeamMessageHandler(req, createClientFromRequest);
}