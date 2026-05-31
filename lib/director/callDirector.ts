import { DirectorPlanSchema, type DirectorPlan } from "./directorSchema";
import { buildDirectorConstraints } from "./directorConstraints";
import type { DirectorBreak } from "./directorBreak";
import { buildDirectorPrompt } from "./directorPrompt";
import {
  clientLlmToRuntime,
  type ClientLlmSettings,
} from "./llmProviders";
import { normalizeDirectorPlan } from "./normalizePlan";
import { summarizeWorldForDirector } from "./summarizeWorldForDirector";
import type { WorldState } from "../world/worldTypes";
import type { MapSelection } from "../ui/mapSelection";

export type LlmProviderId = "openrouter" | "openai_compatible";
export type { ClientLlmSettings } from "./llmProviders";

export type LlmRuntimeConfig = {
  provider: LlmProviderId;
  apiKey: string;
  baseUrl: string;
  model: string;
};

function safeParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first >= 0 && last > first) {
      return JSON.parse(text.slice(first, last + 1));
    }
    throw new Error("Director 返回了无效 JSON");
  }
}

/** BYOK：玩家本机 Key 优先，其次服务端 .env */
export function resolveLlmConfig(clientLlm?: ClientLlmSettings | null): LlmRuntimeConfig | null {
  if (clientLlm?.apiKey?.trim()) {
    const fromClient = clientLlmToRuntime(clientLlm);
    if (fromClient) return fromClient;
  }

  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (openRouterKey) {
    return {
      provider: "openrouter",
      apiKey: openRouterKey,
      baseUrl: (process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1").replace(
        /\/$/,
        "",
      ),
      model:
        process.env.OPENROUTER_MODEL?.trim() ??
        process.env.OPENAI_MODEL?.trim() ??
        "deepseek/deepseek-v4-pro",
    };
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim() ?? process.env.DIRECTOR_API_KEY?.trim();
  if (openaiKey) {
    return {
      provider: "openai_compatible",
      apiKey: openaiKey,
      baseUrl: (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, ""),
      model: process.env.OPENAI_MODEL?.trim() ?? "gpt-4o-mini",
    };
  }

  return null;
}

export function directorLlmConfigured(clientLlm?: ClientLlmSettings | null): boolean {
  return resolveLlmConfig(clientLlm) !== null;
}

async function callLlmJson(
  messages: { role: string; content: string }[],
  cfg: LlmRuntimeConfig,
): Promise<string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${cfg.apiKey}`,
    "Content-Type": "application/json",
  };
  if (cfg.provider === "openrouter") {
    headers["HTTP-Referer"] = process.env.OPENROUTER_REFERER ?? "http://127.0.0.1:8747";
    headers["X-Title"] = "LLM Director Hitman";
  }

  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: cfg.model,
      messages,
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM HTTP ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM 响应为空");
  return content;
}

export async function callDirector(params: {
  playerPlan: string;
  world: WorldState;
  selection?: MapSelection | null;
  clientLlm?: ClientLlmSettings | null;
  priorBreak?: DirectorBreak | null;
}): Promise<DirectorPlan> {
  const cfg = resolveLlmConfig(params.clientLlm);
  if (!cfg) {
    throw new Error("未配置 LLM：请在游戏内选择供应商并保存 API Key，或由管理员配置服务端环境变量");
  }

  const worldSummary = summarizeWorldForDirector(params.world);
  const directorConstraints = buildDirectorConstraints();
  const messages = buildDirectorPrompt({
    playerPlan: params.playerPlan,
    selection: params.selection ?? null,
    worldSummary,
    directorConstraints,
    priorBreak: params.priorBreak ?? null,
  });

  const rawText = await callLlmJson(messages, cfg);
  const json = safeParseJson(rawText);
  const plan = DirectorPlanSchema.parse(json);
  return normalizeDirectorPlan(plan);
}
