"use client";

export default function PlanInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-neutral-700 bg-neutral-900 p-4">
      <div className="mb-2 text-sm font-medium text-neutral-400">
        自然语言计划（Day 4 接入 LLM，现在不可用）
      </div>
      <textarea
        className="h-24 w-full rounded-xl border border-neutral-700 bg-neutral-950 p-3 text-sm outline-none focus:border-neutral-500"
        placeholder="Day 4 之后在这里用自然语言描述计划。现在请用右侧「试指令」。"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
