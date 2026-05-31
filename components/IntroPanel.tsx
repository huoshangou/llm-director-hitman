"use client";

export default function IntroPanel() {
  return (
    <div className="rounded-2xl border border-amber-700/50 bg-amber-950/30 p-4 text-sm leading-relaxed text-amber-50/90">
      <div className="font-semibold text-amber-100">GM / 开发模式（/gm）</div>
      <p className="mt-2 text-amber-50/80">
        玩家打开站点会进入{" "}
        <a href="/play/" className="font-medium text-amber-200 underline">
          /play/
        </a>
        。本页保留 Showcase 点步、手写测试与 Debug，方便你对照规则与路线。
      </p>
      <p className="mt-2 text-xs text-amber-200/70">
        上方「AI 接入」与 /play 共用同一浏览器存储。
      </p>
    </div>
  );
}
