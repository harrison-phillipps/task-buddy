import React from "react";

/** One probe result: verdict line with its timestamp, plus the untouched raw payload. */
export default function ProbeResult({ result }) {
  const passed = result?.ok === true;
  // A check may carry its own text verdict (e.g. "PASS — 2 events received").
  // When it does, the badge is neutral grey so the pass/fail reads from the words,
  // not from a colour.
  const label = typeof result?.label === "string" && result.label.length > 0 ? result.label : null;

  const finished = result?.finished_at ? new Date(result.finished_at) : null;
  const localTime = finished
    ? finished.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
      <div className="flex items-start gap-2">
        <span
          className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
            label
              ? "bg-gray-100 text-gray-800"
              : passed
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
          }`}
        >
          {label ?? (passed ? "ALLOWED" : "DENIED / FAILED")}
        </span>
        <span className="font-medium text-sm text-gray-900">{result?.check}</span>
      </div>

      <p className="text-xs text-gray-500">
        {localTime ? (
          <>
            finished <span className="font-mono">{localTime}</span>
            {result?.duration_ms != null && <> · took {result.duration_ms} ms</>}
          </>
        ) : (
          "no timestamp recorded"
        )}
        {result?.started_at && (
          <>
            {" · started "}
            <span className="font-mono">{new Date(result.started_at).toLocaleTimeString()}</span>
          </>
        )}
      </p>

      <pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs leading-relaxed text-gray-100">
        {JSON.stringify(result?.raw ?? null, null, 2)}
      </pre>
    </div>
  );
}