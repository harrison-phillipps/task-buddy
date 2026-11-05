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