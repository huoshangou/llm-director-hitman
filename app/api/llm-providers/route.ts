import { NextResponse } from "next/server";
import { LLM_PROVIDER_PRESETS } from "@/lib/director/llmProviders";

/** 供应商目录（无密钥），供 /play 与主站下拉共用 */
export async function GET() {
  return NextResponse.json({
    storageKey: "hitman.llmSettings.v1",
    presets: LLM_PROVIDER_PRESETS.map((p) => ({
      id: p.id,
      label: p.label,
      hint: p.hint,
      defaultModel: p.defaultModel,
      defaultBaseUrl: p.defaultBaseUrl,
    })),
  });
}
