/** Shared helpers for the RLS probe checks (team set and entity set). */

export const asRows = (p) => (Array.isArray(p) ? p : (p?.items || []));

export const describeError = (err) => ({
  failed: true,
  status: err?.response?.status ?? err?.status ?? null,
  error: err?.response?.data?.error ?? err?.message ?? 'request failed',
});

/** Runs one check and stamps it with UTC start/finish plus duration. */
export const stamped = (fn) => async () => {
  const started_at = new Date().toISOString();
  const t0 = Date.now();
  let result;
  try {
    result = await fn();
  } catch (err) {
    result = { check: 'unexpected failure', ok: false, raw: describeError(err) };
  }
  return {
    ...result,
    started_at,
    finished_at: new Date().toISOString(),
    duration_ms: Date.now() - t0,
  };
};

/** Waits out one subscription window and returns the events the socket delivered. */
export const windowSubscribe = async (entity, ms) => {
  const events = [];
  let unsubscribe = null;
  let subscribeError = null;
  try {
    unsubscribe = entity.subscribe((event) => {
      events.push({
        type: event?.type ?? null,
        id: event?.id ?? event?.data?.id ?? null,
        at: new Date().toISOString(),
      });
    });
  } catch (err) {
    subscribeError = describeError(err);
  }
  return {
    events,
    subscribeError,
    close: () => {
      try {
        if (typeof unsubscribe === 'function') unsubscribe();
      } catch {
        /* unsubscribe is best-effort; the socket closes on unmount anyway */
      }
    },
    wait: () => new Promise((resolve) => setTimeout(resolve, ms)),
  };
};