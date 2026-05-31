import type { LlmProviderId, LlmRuntimeConfig } from "./callDirector";

/** 玩家在下拉中选的品牌（仅存浏览器 localStorage） */
export type LlmProviderPresetId = "openrouter" | "deepseek" | "openai" | "custom";

export type ClientLlmSettings = {
  providerId: LlmProviderPresetId;
  apiKey: string;
  model: string;
  /** 仅 custom 或高级用户覆盖 */
  baseUrl?: string;
};

export type LlmProviderPreset = {
  id: LlmProviderPresetId;
  label: string;
  hint: string;
  defaultModel: string;
  defaultBaseUrl: string;
  runtimeProvider: LlmProviderId;
};

export const LLM_SETTINGS_STORAGE_KEY = "hitman.llmSettings.v1";

export const LLM_PROVIDER_PRESETS: LlmProviderPreset[] = [
  {
    id: "openrouter",
    label: "OpenRouter",
    hint: "一个 Key 用多家模型；推荐 DeepSeek V4 Pro",
    defaultModel: "deepseek/deepseek-v4-pro",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    runtimeProvider: "openrouter",
  },
  {
    id: "deepseek",
    label: "DeepSeek 官方",
    hint: "platform.deepseek.com 创建的 API Key",
    defaultModel: "deepseek-v4-pro",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    runtimeProvider: "openai_compatible",
  },
  {
    id: "openai",
    label: "OpenAI",
    hint: "api.openai.com",
    defaultModel: "gpt-4o-mini",
    defaultBaseUrl: "https://api.openai.com/v1",
    runtimeProvider: "openai_compatible",
  },
  {
    id: "custom",
    label: "OpenAI 兼容 · 自定义",
    hint: "填写兼容 /v1/chat/completions 的 Base URL",
    defaultModel: "",
    defaultBaseUrl: "",
    runtimeProvider: "openai_compatible",
  },
];

export function getProviderPreset(id: LlmProviderPresetId): LlmProviderPreset {
  return LLM_PROVIDER_PRESETS.find((p) => p.id === id) ?? LLM_PROVIDER_PRESETS[0]!;
}

export function defaultClientLlmSettings(): ClientLlmSettings {
  const p = LLM_PROVIDER_PRESETS[0]!;
  return {
    providerId: p.id,
    apiKey: "",
    model: p.defaultModel,
    baseUrl: p.defaultBaseUrl,
  };
}

export function normalizeClientLlmSettings(raw: Partial<ClientLlmSettings>): ClientLlmSettings {
  const providerId =
    raw.providerId && LLM_PROVIDER_PRESETS.some((p) => p.id === raw.providerId)
      ? raw.providerId
      : "openrouter";
  const preset = getProviderPreset(providerId);
  const model = (raw.model ?? preset.defaultModel).trim() || preset.defaultModel;
  const baseUrl = (raw.baseUrl ?? preset.defaultBaseUrl).trim().replace(/\/$/, "");
  return {
    providerId,
    apiKey: (raw.apiKey ?? "").trim(),
    model,
    baseUrl: providerId === "custom" ? baseUrl : preset.defaultBaseUrl || baseUrl,
  };
}

/** 浏览器 localStorage → API 请求体（不含多余字段） */
export function clientLlmForApi(client: ClientLlmSettings | null | undefined): ClientLlmSettings | null {
  if (!client?.apiKey?.trim()) return null;
  const n = normalizeClientLlmSettings(client);
  if (!n.apiKey) return null;
  return n;
}

export function clientLlmToRuntime(client: ClientLlmSettings): LlmRuntimeConfig | null {
  const n = normalizeClientLlmSettings(client);
  if (!n.apiKey) return null;
  const preset = getProviderPreset(n.providerId);
  const baseUrl =
    n.providerId === "custom"
      ? (n.baseUrl || "").trim()
      : preset.defaultBaseUrl;
  if (!baseUrl) return null;
  return {
    provider: preset.runtimeProvider,
    apiKey: n.apiKey,
    baseUrl: baseUrl.replace(/\/$/, ""),
    model: n.model || preset.defaultModel,
  };
}
