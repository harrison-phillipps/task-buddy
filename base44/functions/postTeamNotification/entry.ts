import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { postTeamNotificationHandler } from '../../shared/teamPosting.ts';

/**
 * Writes one TeamNotification on the caller's behalf.
 *
 * The handler lives in shared/teamPosting.ts (so the token-less path is
 * testable); this entry only binds the real SDK client to it. The caller must be
 * signed in and a member of the team. The member snapshot and created_by are
 * stamped from the team row and the caller; the payload's member list and
 * created_by are ignored. Title caps at 200 characters, message at 1000.
 */
export default function (req: Request): Promise<Response> {
  return postTeamNotificationHandler(req, createClientFromRequest);
}