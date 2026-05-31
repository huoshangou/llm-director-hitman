"use client";

export default function DebugPanel({ data }: { data: unknown }) {
  return (
    <div className="max-h-96 overflow-auto rounded-2xl border border-neutral-700 bg-neutral-900 p-4">
      <div className="mb-2 font-semibold">Debug</div>
      <pre className="whitespace-pre-wrap text-[10px] text-neutral-400">
        {data ? JSON.stringify(data, null, 2) : "Run a manual test to see resolver output."}
      </pre>
    </div>
  );
}
