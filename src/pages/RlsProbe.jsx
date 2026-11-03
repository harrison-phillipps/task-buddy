import React from "react";
import { base44 } from "@/api/base44Client";
import { runAllChecks } from "@/lib/rlsProbeChecks";
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
  const [sentinelCode, setSentinelCode] = React.useState(params.get("code") || "");
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
  };

  const handleTeardown = async () => {
    const data = await call("rlsProbeTeardown", {});
    setSetupResult(data);
  };

  const handleRun = async () => {
    setError(null);
    setBusy("run");
    setResults([]);
    try {
      setResults(await runAllChecks({ sentinelAId, sentinelCode }));
    } finally {
      setBusy("");
    }
  };

  const shareLink = sentinelAId
    ? `${window.location.origin}/rls-probe?a=${sentinelAId}&code=${sentinelCode}`
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 pb-24">
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        <h1 className="text-lg font-bold text-amber-900">RLS probe (temporary)</h1>
        <p className="mt-1 text-sm text-amber-800">
          Every check runs as the signed-in user. Checks 2–5 only address the throwaway team
          whose exact id came in this link, and the service role refuses any id that setup did
          not register — a team merely named <code>zzProbe-*</code> is not accepted. The join
          check runs last because it is the only one that changes data. Not linked from anywhere.
        </p>
        {me && (
          <p className="mt-2 text-xs text-amber-900">
            Signed in as <strong>{me.email}</strong> · role <strong>{me.role}</strong>
          </p>
        )}
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
        <h2 className="text-sm font-semibold text-gray-900">2. Run the checks</h2>
        <p className="text-xs text-gray-600">
          Takes about 10 seconds (the subscription check waits out its window). Order is fixed:
          read, filter, update, subscribe, then join last. Each result is stamped when it finished.
        </p>
        <Button onClick={handleRun} disabled={busy === "run"}>
          {busy === "run" ? "Running…" : "Run all checks"}
        </Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!sentinelAId && (
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