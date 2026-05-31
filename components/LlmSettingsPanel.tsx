"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getProviderPreset,
  LLM_PROVIDER_PRESETS,
  type ClientLlmSettings,
  type LlmProviderPresetId,
} from "@/lib/director/llmProviders";
import {
  clearLlmSettings,
  loadLlmSettings,
  saveLlmSettings,
} from "@/lib/client/llmSettingsStorage";

export default function LlmSettingsPanel({ compact }: { compact?: boolean }) {
  const [settings, setSettings] = useState<ClientLlmSettings>(() => loadLlmSettings());
  const [savedFlash, setSavedFlash] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setSettings(loadLlmSettings());
  }, []);

  const preset = getProviderPreset(settings.providerId);

  const onProviderChange = (id: LlmProviderPresetId) => {
    const p = getProviderPreset(id);
    setSettings((s) => ({
      ...s,
      providerId: id,
      model: p.defaultModel,
      baseUrl: p.defaultBaseUrl,
    }));
  };

  const persist = useCallback(() => {
    saveLlmSettings(settings);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  }, [settings]);

  const hasKey = settings.apiKey.trim().length > 0;

  return (
    <div
      className={`rounded-2xl border border-indigo-800/50 bg-indigo-950/25 text-sm ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold text-indigo-100">AI 接入（本机保存）</div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] ${
            hasKey ? "bg-emerald-900/60 text-emerald-200" : "bg-neutral-800 text-neutral-400"
          }`}
        >
          {hasKey ? "已配置 Key" : "未配置 · 将用规则 stub"}
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-indigo-200/70">
        Key 只存在你的浏览器，提交 plan 时发给本机服务器用于调用模型；我们不会写入仓库或
        .env。
      </p>

      <label className="mt-3 block text-xs text-indigo-200/80">供应商</label>
      <select
        className="mt-1 w-full rounded-lg border border-indigo-800 bg-neutral-950 px-2 py-1.5 text-xs text-indigo-50"
        value={settings.providerId}
        onChange={(e) => onProviderChange(e.target.value as LlmProviderPresetId)}
      >
        {LLM_PROVIDER_PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <p className="mt-1 text-[10px] text-indigo-300/60">{preset.hint}</p>

      <label className="mt-3 block text-xs text-indigo-200/80">模型 ID</label>
      <input
        className="mt-1 w-full rounded-lg border border-indigo-800 bg-neutral-950 px-2 py-1.5 text-xs"
        value={settings.model}
        onChange={(e) => setSettings((s) => ({ ...s, model: e.target.value }))}
        placeholder={preset.defaultModel}
      />

      {settings.providerId === "custom" && (
        <>
          <label className="mt-2 block text-xs text-indigo-200/80">Base URL</label>
          <input
            className="mt-1 w-full rounded-lg border border-indigo-800 bg-neutral-950 px-2 py-1.5 text-xs"
            value={settings.baseUrl ?? ""}
            onChange={(e) => setSettings((s) => ({ ...s, baseUrl: e.target.value }))}
            placeholder="https://your-proxy.com/v1"
          />
        </>
      )}

      <label className="mt-3 block text-xs text-indigo-200/80">API Key</label>
      <input
        type="password"
        autoComplete="off"
        className="mt-1 w-full rounded-lg border border-indigo-800 bg-neutral-950 px-2 py-1.5 text-xs"
        value={settings.apiKey}
        onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))}
        placeholder="粘贴后点保存"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
          onClick={persist}
        >
          保存到本机
        </button>
        <button
          type="button"
          disabled={testing || !hasKey}
          className="rounded-lg border border-indigo-700 px-3 py-1.5 text-xs text-indigo-100 hover:bg-indigo-900/50 disabled:opacity-40"
          onClick={() => {
            persist();
            setTesting(true);
            setTestMsg("测试中…");
            void fetch("/api/llm-test", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ llm: settings }),
            })
              .then((r) => r.json())
              .then((data: { ok?: boolean; error?: string; model?: string }) => {
                setTestMsg(
                  data.ok ? `连通成功 · ${data.model ?? ""}` : (data.error ?? "连接失败"),
                );
              })
              .catch((e: Error) => setTestMsg(`请求失败: ${e.message}`))
              .finally(() => setTesting(false));
          }}
        >
          测试连通
        </button>
        <button
          type="button"
          className="rounded-lg border border-neutral-600 px-3 py-1.5 text-xs text-neutral-400 hover:bg-neutral-800"
          onClick={() => {
            clearLlmSettings();
            setSettings(loadLlmSettings());
            setTestMsg(null);
          }}
        >
          清除
        </button>
        {savedFlash && <span className="text-xs text-emerald-300">已保存</span>}
      </div>
      {testMsg && (
        <p
          className={`mt-2 text-xs ${testMsg.includes("成功") ? "text-emerald-300" : testMsg.includes("测试") ? "text-amber-200" : "text-rose-300"}`}
        >
          {testMsg}
        </p>
      )}
    </div>
  );
}

/** 供主站提交 Director 时附带 */
export function getLlmPayloadForApi(): ClientLlmSettings | null {
  const s = loadLlmSettings();
  if (!s.apiKey.trim()) return null;
  return s;
}
