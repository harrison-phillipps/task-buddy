/**
 * Tone rules for AI nudges, enforced after the model answers.
 *
 * The prompt asks for a gentle nudge, but a model can still drift into guilt,
 * streak pressure, urgency or comparisons. Anything that breaks a rule is thrown
 * away and the fixed neutral line below is shown instead, so the user never sees
 * the bad copy — and the card never renders an empty message.
 *
 * Kept deliberately blunt: a short list of patterns, a word cap, one exclamation
 * check and an emoji count. tests/nudgeTone.test.mjs covers each rule.
 */

export const NUDGE_TYPES = [
  'energy_check',
  'productivity_boost',
  'goal_reminder',
  'break_suggestion',
  'momentum_keeper',
  'time_awareness',
];

export const MAX_NUDGE_WORDS = 20;

/** Shown whenever the model's message breaks a rule. Must itself pass every rule. */
export const NEUTRAL_NUDGE = "Whenever you're ready, there's a small step waiting.";

const BANNED_PATTERNS = [
  // Guilt, shame, or telling the user they are behind.
  /\b(behind|catch(ing)? up|should(’|')?ve|should have|you haven(’|')?t|only (got|did|managed)|falling|slack(ing)?|lazy|excuse|disappoint\w*|let ?down)\b/i,
  // Streaks, comparison, ranking.
  /\b(streak\w*|others?|everyone|everybody|nobody|most people|compared?|comparison|competit\w*|leaderboard|rank(ed|ing)?|better than|worse than)\b/i,
  // Urgency.
  /\b(urgent\w*|hurry|quick\w*|asap|immediately|right now|deadline|don(’|')?t forget|last chance|act fast|running out|no time)\b/i,
];

const EMOJI = /\p{Extended_Pictographic}/gu;

/** The rules `message` breaks, as short labels. Empty means it may be shown. */
export function nudgeViolations(message) {
  if (typeof message !== 'string') return ['missing'];
  const text = message.trim();
  const problems = [];
  if (!text) problems.push('empty');
  if (text.split(/\s+/).filter(Boolean).length > MAX_NUDGE_WORDS) problems.push('too_long');
  if (text.includes('!')) problems.push('exclamation');
  if ((text.match(EMOJI) || []).length > 1) problems.push('too_many_emoji');
  if (BANNED_PATTERNS[0].test(text)) problems.push('guilt_or_behind');
  if (BANNED_PATTERNS[1].test(text)) problems.push('streak_or_comparison');
  if (BANNED_PATTERNS[2].test(text)) problems.push('urgency');
  return problems;
}

/**
 * The nudge to render: the model's answer when it passes, otherwise the neutral
 * line with no action attached.
 */
export function sanitizeNudge(response) {
  const nudgeType = NUDGE_TYPES.includes(response?.nudge_type) ? response.nudge_type : 'productivity_boost';

  if (nudgeViolations(response?.message).length > 0) {
    return {
      ...response,
      nudge_type: nudgeType,
      message: NEUTRAL_NUDGE,
      action_label: null,
      action_type: 'none',
    };
  }

  const label = typeof response?.action_label === 'string' ? response.action_label.trim() : '';
  const labelIsSafe = label.length > 0 && label.split(/\s+/).length <= 4 && !label.includes('!');
  const actionType = response?.action_type && response.action_type !== 'none' ? response.action_type : 'none';

  return {
    ...response,
    nudge_type: nudgeType,
    message: response.message.trim(),
    action_label: labelIsSafe ? label : null,
    action_type: labelIsSafe ? actionType : 'none',
  };
}