/**
 * OneSignal delivery, in one place.
 *
 * The v1 send endpoint answers HTTP 200 even when nothing was delivered, so the
 * response body — not the status code — decides success. `recipients` is how
 * many devices the message actually reached, and `errors` carries OneSignal's
 * own explanation (for example "All included players are not subscribed").
 *
 * Nothing here logs the REST key or the raw response body.
 */

export type SendResult = {
  ok: boolean;
  status: number;
  recipients: number;
  errors: string[];
};

export type OneSignalPayload = {
  title?: string;
  body?: string;
  taskId?: string | null;
  taskTitle?: string | null;
  dueDate?: string | null;
  estimatedMinutes?: number | null;
};

const toErrorList = (raw: unknown): string[] => {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map((entry) => String(entry)).filter(Boolean);
  return [String(raw)];
};

const notificationId = (body: unknown): string | null => {
  if (!body || typeof body !== 'object') return null;
  const id = (body as Record<string, unknown>).id;
  return typeof id === 'string' ? id : null;
};

/**
 * Success means: a 2xx status, at least one recipient reached, and no errors.
 * `recipients: 0` is the silent-failure mode this parsing exists to catch.
 */
export function parseOneSignalResponse(status: number, body: unknown): SendResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, status, recipients: 0, errors: ['OneSignal response could not be read'] };
  }
  const record = body as Record<string, unknown>;
  const rawRecipients = record.recipients;
  const recipients =
    typeof rawRecipients === 'number' && Number.isFinite(rawRecipients) ? rawRecipients : 0;
  const errors = toErrorList(record.errors);
  const ok = status >= 200 && status < 300 && recipients > 0 && errors.length === 0;
  // A failure with no explanation still gets one, so logs never read "failed, errors=[]".
  if (!ok && errors.length === 0) {
    errors.push(
      status >= 200 && status < 300
        ? 'no recipients were reached'
        : `OneSignal rejected the request with status ${status}`,
    );
  }
  return { ok, status, recipients, errors };
}

/**
 * The only errors that mean the stored player id is dead: the device was
 * uninstalled or reset, or the id belongs to a subscription that is no longer
 * subscribed. Anything else (auth, rate limit, payload) must leave the id alone.
 */
const DEAD_PLAYER_ID_PATTERNS = [
  /all included players are not subscribed/i,
  /not subscribed/i,
  /no longer subscribed/i,
  /player[\s_-]*id.*(invalid|not found|does not exist|no longer)/i,
  /invalid.*player[\s_-]*id/i,
  /invalid.*(subscription|identifier)/i,
];

export function isInvalidPlayerIdError(errors: string[]): boolean {
  return errors.some((error) => DEAD_PLAYER_ID_PATTERNS.some((pattern) => pattern.test(error)));
}

/** Sends one notification to one player id and returns the parsed outcome. */
export async function sendOneSignal(
  playerId: string,
  payload: OneSignalPayload,
): Promise<SendResult> {
  const restKey = Deno.env.get('One_Signal_REST_API_Key') || '';
  const appId = Deno.env.get('One_Signal_APP_ID') || '';
  if (!restKey || !appId) {
    console.error('OneSignal credentials not configured');
    return { ok: false, status: 500, recipients: 0, errors: ['OneSignal credentials not configured'] };
  }

  // Deep-link / custom data fields travel under OneSignal's `data` block.
  const data: Record<string, unknown> = {};
  if (payload.taskId != null) data.taskId = payload.taskId;
  if (payload.taskTitle != null) data.taskTitle = payload.taskTitle;
  if (payload.dueDate != null) data.dueDate = payload.dueDate;
  if (payload.estimatedMinutes != null) data.estimatedMinutes = payload.estimatedMinutes;

  const res = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${restKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_id: appId,
      include_player_ids: [playerId],
      headings: { en: payload.title || 'TaskBuddy' },
      contents: { en: payload.body || '' },
      // Never move the app icon badge. "None" is OneSignal's "leave the badge
      // as it is" option: we send no count, so a reminder can never leave a
      // number on the icon.
      ios_badgeType: 'None',
      data,
    }),
  });

  // The body can only be read once, so read it here and hand back the summary.
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  const result = parseOneSignalResponse(res.status, body);
  console.log(
    'OneSignal send:',
    JSON.stringify({
      status: result.status,
      id: notificationId(body),
      recipients: result.recipients,
      errors: result.errors,
    }),
  );
  return result;
}

export const TEST_PUSH_LIMIT = 3;
export const TEST_PUSH_WINDOW_MS = 60 * 60 * 1000;

/** True when `attempts` already hit `limit` inside the trailing window. */
export function isOverTestPushLimit(
  attempts: unknown[],
  now: Date,
  limit: number = TEST_PUSH_LIMIT,
  windowMs: number = TEST_PUSH_WINDOW_MS,
): boolean {
  const cutoff = now.getTime() - windowMs;
  const inWindow = attempts.filter((attempt) => {
    const at = attempt instanceof Date ? attempt.getTime() : Date.parse(String(attempt));
    return Number.isFinite(at) && at > cutoff;
  });
  return inWindow.length >= limit;
}

/* ── Scheduled (future) delivery ───────────────────────────────────────────────
 *
 * POST https://api.onesignal.com/notifications accepts `send_after`, an ISO 8601
 * timestamp. A scheduled create is answered with the message id — nothing has
 * been delivered at that point, so `recipients` says nothing about whether the
 * schedule was accepted and must never be what success is judged on here.
 * Success is: a 2xx status, a non-empty id, and no errors.
 */

export type ScheduleResult = {
  ok: boolean;
  status: number;
  id: string | null;
  recipients: number;
  errors: string[];
};

export function parseScheduleResponse(status: number, body: unknown): ScheduleResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      status,
      id: null,
      recipients: 0,
      errors: ['OneSignal response could not be read'],
    };
  }
  const record = body as Record<string, unknown>;
  const id = notificationId(record);
  const rawRecipients = record.recipients;
  const recipients =
    typeof rawRecipients === 'number' && Number.isFinite(rawRecipients) ? rawRecipients : 0;
  const errors = toErrorList(record.errors);
  // An empty id is the documented "no message was created" shape.
  const ok = status >= 200 && status < 300 && !!id && errors.length === 0;
  if (!ok && errors.length === 0) {
    errors.push(
      status >= 200 && status < 300
        ? 'OneSignal did not return a message id'
        : `OneSignal rejected the request with status ${status}`,
    );
  }
  return { ok, status, id, recipients, errors };
}

/** Schedules one notification for one player id at an ISO 8601 instant. */
export async function scheduleOneSignal(
  playerId: string,
  payload: OneSignalPayload,
  sendAfter: string,
): Promise<ScheduleResult> {
  const restKey = Deno.env.get('One_Signal_REST_API_Key') || '';
  const appId = Deno.env.get('One_Signal_APP_ID') || '';
  if (!restKey || !appId) {
    console.error('OneSignal credentials not configured');
    return {
      ok: false,
      status: 500,
      id: null,
      recipients: 0,
      errors: ['OneSignal credentials not configured'],
    };
  }

  let res: Response;
  try {
    res = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        Authorization: `Key ${restKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: appId,
        target_channel: 'push',
        include_subscription_ids: [playerId],
        headings: { en: payload.title || 'TaskBuddy' },
        contents: { en: payload.body || '' },
        // Same rule as the immediate send: a scheduled end-of-phase push never
        // changes the badge.
        ios_badgeType: 'None',
        send_after: sendAfter,
      }),
    });
  } catch (error) {
    return {
      ok: false,
      status: 0,
      id: null,
      recipients: 0,
      errors: [`OneSignal request failed: ${(error as Error).message}`],
    };
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  const result = parseScheduleResponse(res.status, body);
  console.log(
    'OneSignal schedule:',
    JSON.stringify({
      status: result.status,
      id: result.id,
      recipients: result.recipients,
      errors: result.errors,
      send_after: sendAfter,
    }),
  );
  return result;
}

export type CancelResult = {
  ok: boolean;
  status: number;
  notFound: boolean;
  errors: string[];
};

/**
 * Cancelling something already gone is a success, not a failure: `notFound`
 * covers both a 404 and OneSignal's "notification not found" wording.
 */
export function parseCancelResponse(status: number, body: unknown): CancelResult {
  const record =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  const errors = toErrorList(record.errors);
  const notFound =
    status === 404 ||
    errors.some((error) => /not\s*found|no (such )?notification|could not find/i.test(error));
  const flagged = record.success;
  const clean = status >= 200 && status < 300 && flagged !== false;
  const ok = clean || notFound;
  if (!ok && errors.length === 0) {
    errors.push(`OneSignal rejected the cancel with status ${status}`);
  }
  return { ok, status, notFound, errors };
}

/** Cancels a scheduled (or currently outgoing) message by its id. */
export async function cancelOneSignal(messageId: string): Promise<CancelResult> {
  const restKey = Deno.env.get('One_Signal_REST_API_Key') || '';
  const appId = Deno.env.get('One_Signal_APP_ID') || '';
  if (!restKey || !appId) {
    console.error('OneSignal credentials not configured');
    return { ok: false, status: 500, notFound: false, errors: ['OneSignal credentials not configured'] };
  }

  let res: Response;
  try {
    res = await fetch(
      `https://api.onesignal.com/notifications/${encodeURIComponent(messageId)}?app_id=${encodeURIComponent(appId)}`,
      { method: 'DELETE', headers: { Authorization: `Key ${restKey}` } },
    );
  } catch (error) {
    return {
      ok: false,
      status: 0,
      notFound: false,
      errors: [`OneSignal request failed: ${(error as Error).message}`],
    };
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  const result = parseCancelResponse(res.status, body);
  console.log(
    'OneSignal cancel:',
    JSON.stringify({ status: result.status, not_found: result.notFound, ok: result.ok, errors: result.errors }),
  );
  return result;
}