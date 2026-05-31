import {
  defaultClientLlmSettings,
  LLM_SETTINGS_STORAGE_KEY,
  normalizeClientLlmSettings,
  type ClientLlmSettings,
} from "../director/llmProviders";

export function loadLlmSettings(): ClientLlmSettings {
  if (typeof window === "undefined") return defaultClientLlmSettings();
  try {
    const raw = localStorage.getItem(LLM_SETTINGS_STORAGE_KEY);
    if (!raw) return defaultClientLlmSettings();
    return normalizeClientLlmSettings(JSON.parse(raw) as Partial<ClientLlmSettings>);
  } catch {
    return defaultClientLlmSettings();
  }
}

export function saveLlmSettings(settings: ClientLlmSettings): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeClientLlmSettings(settings);
  localStorage.setItem(LLM_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
}

export function clearLlmSettings(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LLM_SETTINGS_STORAGE_KEY);
}

export { LLM_SETTINGS_STORAGE_KEY };
