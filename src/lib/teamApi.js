import { base44 } from "@/api/base44Client";

/**
 * Calls a team backend function and normalises both SDK outcomes: a successful
 * body on res.data, or a thrown error whose response body carries { error }.
 * Throws with the server's message so callers can show it directly.
 */
export async function callTeamFn(name, payload = {}) {
  try {
    const res = await base44.functions.invoke(name, payload);
    const data = res?.data ?? {};
    if (data.error) throw new Error(data.error);
    return data;
  } catch (error) {
    const body = error?.response?.data || error?.data || null;
    throw new Error(body?.error || error?.message || "Something went wrong. Please try again.");
  }
}