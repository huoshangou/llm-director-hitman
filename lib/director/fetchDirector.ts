import type { DirectorPlan } from "./directorSchema";
import type { DirectorValidation } from "./validateDirectorPlan";
import type { DirectorCompileSource } from "./compileDirector";
import type { ClientLlmSettings } from "./llmProviders";
import type { MapSelection } from "../ui/mapSelection";
import type { WorldState } from "../world/worldTypes";

export type DirectorApiResponse =
  | {
      ok: true;
      plan: DirectorPlan;
      validation: DirectorValidation;
      source: DirectorCompileSource;
      llmConfigured: boolean;
      message?: string;
    }
  | { ok: false; error: string; source?: string; llmConfigured?: boolean };

export async function fetchDirectorPlan(input: {
  playerPlan: string;
  world: WorldState;
  selection: MapSelection | null;
  clientLlm?: ClientLlmSettings | null;
}): Promise<DirectorApiResponse> {
  const llm =
    input.clientLlm?.apiKey?.trim() ? input.clientLlm : undefined;
  const res = await fetch("/api/director", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      playerPlan: input.playerPlan,
      world: input.world,
      selection: input.selection,
      llm,
    }),
  });

  const data = (await res.json()) as DirectorApiResponse & { error?: string };
  if (!res.ok) {
    return {
      ok: false,
      error: data.error ?? `Director HTTP ${res.status}`,
      source: "source" in data ? data.source : undefined,
      llmConfigured: "llmConfigured" in data ? data.llmConfigured : undefined,
    };
  }
  return data;
}
