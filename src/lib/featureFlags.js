/**
 * Feature flags.
 *
 * TEAM_FOCUS_ENABLED — collaborative team focus sessions.
 *
 * Off: the "Start Session" entry and the Active Focus Sessions card are hidden
 * in TeamDashboard, and /TeamFocusSession redirects to the team dashboard so
 * older invite notices don't land on the half-finished page.
 *
 * The CollaborativeFocusSession entity, its backend functions and existing rows
 * are untouched — flip this to true to restore the feature exactly as it was.
 */
export const TEAM_FOCUS_ENABLED = false;

/**
 * FOCUS_NUDGE_BETA_EMAILS — who may see the gentle focus nudge opt-in.
 *
 * Beta only, matched case-insensitively against the signed-in user's email. An
 * account not on this list never sees the one-time prompt or the Settings card,
 * and the nudge fields are simply never written for them.
 *
 * Keep this in step with NUDGE_ALLOWED_EMAILS in the sendFocusNudges function:
 * that server-side list is what actually decides who can receive a nudge, this
 * one only decides who is offered the switch.
 */
export const FOCUS_NUDGE_BETA_EMAILS = [
  'harrison.phillipps@hotmail.com',
];