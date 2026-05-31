import { NextResponse } from "next/server";
import { testLlmConnection } from "@/lib/director/testLlmConnection";
import type { ClientLlmSettings } from "@/lib/director/llmProviders";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { llm?: ClientLlmSettings | null };
    const result = await testLlmConnection(body.llm ?? null);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "测试失败" },
      { status: 500 },
    );
  }
}
