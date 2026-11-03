import React from "react";

/** One probe result: a verdict line plus the untouched raw payload. */
export default function ProbeResult({ result }) {
  const passed = result?.ok === true;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
      <div className="flex items-start gap-2">
        <span
          className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
            passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {passed ? "ALLOWED" : "DENIED / FAILED"}
        </span>
        <span className="font-medium text-sm text-gray-900">{result?.check}</span>
      </div>
      <pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs leading-relaxed text-gray-100">
        {JSON.stringify(result?.raw ?? null, null, 2)}
      </pre>
    </div>
  );
}