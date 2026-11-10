/**
 * The dry-run report for a reminder sweep: what WOULD be notified, and why each
 * other task was passed over.
 *
 * Pure, and it borrows decideTaskReminder, so a dry run can never disagree with
 * the live sweep it is describing. Ids only — no task titles, no addresses — so
 * the report is safe to read in a log or hand back to the caller.
 */
import {
  decideTaskReminder,
  type ReminderContext,
  type ReminderSkipReason,
  type ReminderTimeSource,
} from './taskReminderSelection.ts';

export interface DryRunEntry {
  task_id: string;
  owner_user_id: string | null;
  time_source: ReminderTimeSource;
  /** Minutes until the due instant; null for an untimed task. */
  diff_minutes: number | null;
  quiet: boolean;
  can_push: boolean;
  /** null means this task would be notified. */
  reason_skipped: ReminderSkipReason | null;
}

export function buildDryRunReport(tasks: any[], ctx: ReminderContext = {}): DryRunEntry[] {
  return (tasks ?? []).filter(Boolean).map((task) => {
    const decision = decideTaskReminder(task, ctx);
    return {
      task_id: task.id,
      owner_user_id: decision.userId,
      time_source: decision.timeSource,
      diff_minutes: decision.diffMinutes === null ? null : Number(decision.diffMinutes.toFixed(2)),
      quiet: decision.quiet,
      can_push: decision.canPush,
      reason_skipped: decision.reason,
    };
  });
}