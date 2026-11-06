/**
 * Caller gate for backend functions whose URL is public.
 *
 * A request with no token does not reliably surface as a 401 from the SDK:
 * auth.me() throws, with a status that may arrive as 403 or as a bare
 * "you must be logged in" message. Both shapes are treated as "no caller"
 * here, so an unauthenticated request answers 401 instead of escaping to the
 * handler's catch block as a 500.
 *
 * Workflow steps invoke a function as the workflow's creator (an app admin), so
 * an admin-gated function called from a scheduled or entity workflow passes.
 */

export type Caller = Record<string, any> | null;

export type Gate =
  | { ok: true; user: Caller }
  | { ok: false; response: Response };

const unauthorized = () => Response.json({ error: 'Unauthorized' }, { status: 401 });
const forbidden = () => Response.json({ error: 'Forbidden' }, { status: 403 });

/** The signed-in caller, or null when the request carries no usable token. */
export async function resolveCaller(base44: any): Promise<Caller> {
  try {
    return (await base44.auth.me()) ?? null;
  } catch {
    return null;
  }
}

/** 401 with no caller, 403 unless the caller is an app admin. */
export async function requireAdmin(base44: any): Promise<Gate> {
  const user = await resolveCaller(base44);
  if (!user) return { ok: false, response: unauthorized() };
  if (user.role !== 'admin') return { ok: false, response: forbidden() };
  return { ok: true, user };
}

/** 401 with no caller; any signed-in role passes. */
export async function requireUser(base44: any): Promise<Gate> {
  const user = await resolveCaller(base44);
  if (!user) return { ok: false, response: unauthorized() };
  return { ok: true, user };
}