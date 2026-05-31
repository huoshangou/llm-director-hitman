import { resolveLlmConfig, type ClientLlmSettings } from "./callDirector";

export type LlmTestResult =
  | { ok: true; model: string; provider: string }
  | { ok: false; error: string };

/** 最小请求验证 Key / Base URL / 模型是否可用 */
export async function testLlmConnection(
  clientLlm?: ClientLlmSettings | null,
): Promise<LlmTestResult> {
  const cfg = resolveLlmConfig(clientLlm);
  if (!cfg) {
    return { ok: false, error: "请先填写并保存 API Key" };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${cfg.apiKey}`,
    "Content-Type": "application/json",
  };
  if (cfg.provider === "openrouter") {
    headers["HTTP-Referer"] = process.env.OPENROUTER_REFERER ?? "http://127.0.0.1:8747";
    headers["X-Title"] = "LLM Director Hitman";
  }

  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: cfg.model,
        messages: [{ role: "user", content: "Reply with exactly: ok" }],
        max_tokens: 8,
        temperature: 0,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      let detail = errText.slice(0, 280);
      try {
        const j = JSON.parse(errText) as { error?: { message?: string } };
        if (j.error?.message) detail = j.error.message;
      } catch {
        /* keep raw */
      }
      return { ok: false, error: `HTTP ${res.status}: ${detail}` };
    }

    return { ok: true, model: cfg.model, provider: cfg.provider };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
