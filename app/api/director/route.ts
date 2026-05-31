import { NextRequest, NextResponse } from "next/server";
import { compileDirectorPlan } from "@/lib/director/compileDirector";
import { directorLlmConfigured, resolveLlmConfig } from "@/lib/director/callDirector";
import { normalizeClientLlmSettings, type ClientLlmSettings } from "@/lib/director/llmProviders";
import type { WorldState } from "@/lib/world/worldTypes";
import type { MapSelection } from "@/lib/ui/mapSelection";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      playerPlan?: string;
      world?: WorldState;
      selection?: MapSelection | null;
      llm?: Partial<ClientLlmSettings> | null;
    };

    const clientLlm = body.llm?.apiKey
      ? normalizeClientLlmSettings(body.llm)
      : null;

    if (!body.world) {
      return NextResponse.json({ error: "缺少 world" }, { status: 400 });
    }

    const playerPlan = (body.playerPlan ?? "").trim();
    if (!playerPlan && !body.selection) {
      return NextResponse.json(
        { error: "需要 playerPlan 或地图选中目标" },
        { status: 400 },
      );
    }

    const result = await compileDirectorPlan({
      playerPlan,
      world: body.world,
      selection: body.selection ?? null,
      clientLlm,
    });

    const cfg = resolveLlmConfig(clientLlm);

    return NextResponse.json({
      ok: result.ok,
      clarificationOnly: result.clarificationOnly ?? false,
      fieldAgentRadio: result.fieldAgentRadio ?? [],
      plan: result.plan,
      validation: result.validation,
      source: result.source,
      llmConfigured: directorLlmConfigured(clientLlm),
      llmProvider: cfg?.provider ?? null,
      llmModel: cfg?.model ?? null,
      message: result.message,
      directorBreak: result.directorBreak ?? null,
      error: result.ok ? undefined : result.message,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Director 内部错误",
      },
      { status: 500 },
    );
  }
}
