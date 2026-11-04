import React from "react";
import { base44 } from "@/api/base44Client";
import { runAllChecks } from "@/lib/rlsProbeChecks";
import { runAllEntityChecks, ROW_ENTITIES } from "@/lib/rlsProbeEntityChecks";
import { runTaskChecks, resolveTaskEmails } from "@/lib/rlsProbeTaskChecks";
import { runSessionChecks } from "@/lib/rlsProbeCollaborativeSessionChecks";
import { runCalendarEventCheck } from "@/lib/rlsProbeCalendarCheck";
import { runPreferencesCheck } from "@/lib/rlsProbePreferencesCheck";
import ProbeResult from "@/components/rlsprobe/ProbeResult";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * TEMPORARY RLS probe page — link-only, never referenced in navigation.
 *
 * Reads ?a=<sentinel A id>&code=<sentinel A code> from the URL so an account
 * that RLS correctly hides the sentinel from can still address it. Delete this
 * page once the Team rules are signed off.
 */
export default function RlsProbe() {
  const params = new URLSearchParams(window.location.search);

  const [me, setMe] = React.useState(null);
  const [memberEmail, setMemberEmail] = React.useState("");
  const [sentinelAId, setSentinelAId] = React.useState(params.get("a") || "");
  const [sentinelBId, setSentinelBId] = React.useState(params.get("b") || "");
  const [sentinelCode, setSentinelCode] = React.useState(params.get("code") || "");
  const [rowSentinels, setRowSentinels] = React.useState(() => {
    try {
      return JSON.parse(params.get("rs") || "{}") || {};
    } catch {
      return {};
    }
  });
  const [memberEmails, setMemberEmails] = React.useState("");
  const [setupResult, setSetupResult] = React.useState(null);
  const [results, setResults] = React.useState([]);
  const [busy, setBusy] = React.useState("");
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    base44.auth
      .me()
      .then((user) => setMe(user))
      .catch(() => setMe(null));
  }, []);

  const call = async (fn, body) => {
    setError(null);
    setBusy(fn);
    try {
      const res = await base44.functions.invoke(fn, body);
      return res?.data ?? res;
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || `${fn} failed`);
      return null;
    } finally {
      setBusy("");
    }
  };

  const handleSetup = async () => {
    const data = await call("rlsProbeSetup", { member_email: memberEmail });
    if (!data) return;
    setSetupResult(data);
    const a = (data.sentinels || []).find((s) => s.name === "zzProbe-A");
    if (a) {
      setSentinelAId(a.id);
      setSentinelCode(a.code || "");
    }
    const b = (data.sentinels || []).find((s) => s.name === "zzProbe-B");
    if (b) setSentinelBId(b.id);
  };

  const handleTeardown = async () => {
    const data = await call("rlsProbeTeardown", {});
    setSetupResult(data);
  };

  const handleRowSetup = async () => {
    const emails = memberEmails
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    const data = await call("rlsProbeRowSetup", { member_emails: emails });
    if (!data) return;
    setSetupResult(data);
    if (data.sentinels) setRowSentinels(data.sentinels);
  };

  const handleRowTeardown = async () => {
    const data = await call("rlsProbeRowTeardown", {});
    setSetupResult(data);
    setRowSentinels({});
  };

  const handleRun = async () => {
    setError(null);
    setBusy("run");
    setResults([]);
    try {
      if (!me?.id) {
        setError("The signed-in account is still loading — reload the page and run again.");
        return;
      }
      let sentinels = rowSentinels;
      if (sentinels?.Task) {
        const resolved = await resolveTaskEmails(sentinels.Task);
        if (resolved !== sentinels.Task) {
          sentinels = { ...sentinels, Task: resolved };
          setRowSentinels(sentinels);
        }
      }
      const collected = [];
      if (sentinelAId) {
        collected.push(...(await runAllChecks({ sentinelAId, sentinelBId, sentinelCode })));
        setResults([...collected]);
      }
      collected.push(...(await runAllEntityChecks(sentinels)));
      setResults([...collected]);
      try {
        collected.push(await runPreferencesCheck(me || {}));
      } catch (err) {
        collected.push({
          check: "NotificationPreferences check",
          ok: false,
          label: `FAIL — the NotificationPreferences check did not finish: ${err?.message || "unknown error"}`,
          raw: { error: String(err?.message || err) },
        });
      }
      setResults([...collected]);
      try {
        collected.push(await runCalendarEventCheck(me || {}));
      } catch (err) {
        collected.push({
          check: "CalendarEvent check",
          ok: false,
          label: `FAIL — the CalendarEvent check did not finish: ${err?.message || "unknown error"}`,
          raw: { error: String(err?.message || err) },
        });
      }
      setResults([...collected]);
      if (sentinels?.Task) {
        try {
          collected.push(...(await runTaskChecks(sentinels.Task, me || {})));
        } catch (err) {
          collected.push({
            check: "Task checks",
            ok: false,
            label: `FAIL — the Task set did not finish: ${err?.message || "unknown error"}`,
            raw: { error: String(err?.message || err) },
          });
        }
        setResults([...collected]);
      }
      if (sentinels?.CollaborativeFocusSession) {
        try {
          collected.push(
            ...(await runSessionChecks(sentinels.CollaborativeFocusSession, me || {})),
          );
        } catch (err) {
          collected.push({
            check: "CollaborativeFocusSession checks",
            ok: false,
            label: `FAIL — the session set did not finish: ${err?.message || "unknown error"}`,
            raw: { error: String(err?.message || err) },
          });
        }
        setResults([...collected]);
      }
    } finally {
      setBusy("");
    }
  };

  const teamParam = sentinelAId
    ? `a=${sentinelAId}&code=${sentinelCode}${sentinelBId ? `&b=${sentinelBId}` : ""}`
    : "";
  const rowParam = Object.keys(rowSentinels).length
    ? `rs=${encodeURIComponent(JSON.stringify(rowSentinels))}`
    : "";
  const query = [teamParam, rowParam].filter(Boolean).join("&");
  const shareLink = query ? `${window.location.origin}/rls-probe?${query}` : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 pb-24">
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        <h1 className="text-lg font-bold text-amber-900">RLS probe (temporary)</h1>
        <p className="mt-1 text-sm text-amber-800">
          Every check runs as the signed-in user. Checks 2–6 only address the throwaway teams
          whose exact ids came in this link, and the service role refuses any id that setup did
          not register — a team merely named <code>zzProbe-*</code> is not accepted. The join
          check runs last because it is the only one that changes data. Entity checks address only the
          sentinel rows whose exact ids came in this link. Not linked from anywhere.
        </p>
        <div className="mt-3 rounded-lg border border-amber-400 bg-white/80 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
            Signed-in account
          </p>
          {me ? (
            <>
              <p className="break-all text-base font-bold text-amber-950">{me.email}</p>
              <p className="break-all font-mono text-xs text-amber-900">user id {me.id}</p>
              <p className="text-xs text-amber-900">role {me.role}</p>
            </>
          ) : (
            <p className="text-sm text-amber-900">not signed in (or still loading)</p>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">1. Sentinels (admin only)</h2>
        <Input
          placeholder="second member email for zzProbe-B (e.g. your hotmail account)"
          value={memberEmail}
          onChange={(e) => setMemberEmail(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSetup} disabled={busy === "rlsProbeSetup"}>
            {busy === "rlsProbeSetup" ? "Creating…" : "Create sentinels"}
          </Button>
          <Button variant="outline" onClick={handleTeardown} disabled={busy === "rlsProbeTeardown"}>
            {busy === "rlsProbeTeardown" ? "Deleting…" : "Delete sentinels"}
          </Button>
        </div>
        {setupResult && (
          <pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
            {JSON.stringify(setupResult, null, 2)}
          </pre>
        )}
        {shareLink && (
          <p className="break-all text-xs text-gray-600">
            Link for other accounts: <span className="font-mono">{shareLink}</span>
          </p>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">2. Entity sentinels (admin only)</h2>
        <p className="text-xs text-gray-600">
          Two rows each in {ROW_ENTITIES.join(", ")}. ActiveSession is owner-only (user_id): a
          non-owner must see neither row and get no events. TeamNotification and TeamMessage are
          member-scoped (member_user_ids): A hidden, B visible to the accounts below.
          Task adds three rows for the live rule: A personal (owner = outlook), B team
          (members = hotmail + schools), C assigned to hotmail. Eight checks: list, filter A,
          update A / B / C (B and C restore their original value), delete A (expected refused,
          never executed for a caller who could succeed), then a 10-second window on A and on B.
          CollaborativeFocusSession adds three rows for its live rule: A host-only, B host plus
          hotmail and schools, C hosted by hotmail. Seven checks, no subscription window: list,
          filter A, filter C, update A, update C (both restore their value), delete A and delete C
          (403 or 404 expected, never executed for a caller who could succeed).
        </p>
        <Input
          placeholder="extra member emails, comma separated (hotmail, schools…)"
          value={memberEmails}
          onChange={(e) => setMemberEmails(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleRowSetup} disabled={busy === "rlsProbeRowSetup"}>
            {busy === "rlsProbeRowSetup" ? "Creating…" : "Create entity sentinels"}
          </Button>
          <Button variant="outline" onClick={handleRowTeardown} disabled={busy === "rlsProbeRowTeardown"}>
            {busy === "rlsProbeRowTeardown" ? "Deleting…" : "Delete entity sentinels"}
          </Button>
        </div>
        {Object.keys(rowSentinels).length > 0 && (
          <p className="break-all text-xs text-gray-600">
            {ROW_ENTITIES.map(
              (e) => `${e}: A ${rowSentinels[e]?.a || "—"} · B ${rowSentinels[e]?.b || "—"}`,
            ).join("   |   ")}
            {rowSentinels.Task &&
              `   |   Task: A ${rowSentinels.Task.a || "—"} · B ${rowSentinels.Task.b || "—"} · C ${
                rowSentinels.Task.c || "—"
              }`}
            {rowSentinels.CollaborativeFocusSession &&
              `   |   Session: A ${rowSentinels.CollaborativeFocusSession.a || "—"} · B ${
                rowSentinels.CollaborativeFocusSession.b || "—"
              } · C ${rowSentinels.CollaborativeFocusSession.c || "—"}`}
          </p>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">3. Run the checks</h2>
        <p className="text-xs text-gray-600">
          Entity checks take about 60 seconds (two 10-second windows per entity); the Task set adds
          about 20 more and the team set 20 more, each only when the link carries those sentinels.
          Every verdict is a sentence with the number in it.
        </p>
        <Button onClick={handleRun} disabled={busy === "run"}>
          {busy === "run" ? "Running…" : "Run all checks"}
        </Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!sentinelAId && Object.keys(rowSentinels).length === 0 && (
          <p className="text-xs text-amber-700">
            No sentinel in this link — open the link the admin copied, or create the sentinels above.
          </p>
        )}
      </div>

      {results.map((result, index) => (
        <ProbeResult key={index} result={result} />
      ))}
    </div>
  );
}