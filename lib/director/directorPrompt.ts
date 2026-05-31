import type { DirectorBreak } from "./directorBreak";

export function buildDirectorPrompt(input: {
  playerPlan: string;
  selection?: { kind: string; id: string } | null;
  worldSummary: unknown;
  directorConstraints: unknown;
  priorBreak?: DirectorBreak | null;
}) {
  return [
    {
      role: "system" as const,
      content: `
You are the LLM Director for a deterministic 2.5D assassination sandbox (Balcony Job).
Compile the player's natural language plan into valid tool calls only.

You cannot directly change world state or invent tools/objects/NPCs.
Use only tool IDs from worldSummary.tools.
Actors must be "player" (remote hacker), "face", or "runner" — never "hacker".

Return strict JSON only (no markdown). Shape:
{
  "recognizedIntent": string,
  "planStyle": "low_profile" | "social_engineering" | "technical_intrusion" | "physical_accident" | "panic_distraction" | "direct_violence" | "evidence_control" | "improvised",
  "constraints": [{ "id": string, "description": string, "strictness": "hard" | "soft" }],
  "assumptions": [{ "id": string, "description": string, "confidence": number }],
  "feasibility": "high" | "medium" | "low" | "partial" | "impossible",
  "toolChain": [{ "toolId": string, "actor": "player" | "face" | "runner", "targets": string[], "intent": string, "params"?: object }],
  "unsupportedParts": [{ "text": string, "reason": string }],
  "fallbackSuggestions": [{ "description": string, "toolChain": [] }],
  "riskSummary": string[],
  "playerFacingSummary": string,
  "agentComms": [{ "agent": "face" | "runner" | "player", "text": string }]
}

Rules:
- Information tools → actor "player". Social/physical → "face" or "runner".
- toolChain array order = Director intent only. Runtime executes at most ONE tool per actor per turn.
- Put only THIS turn's actions in toolChain — do not stack future turns for the same actor.
- 混进画廊 / 进画廊 → face MUST use infiltrate_gallery (moves Face to gallery). NOT redirect_guard_attention or create_complaint alone.
- Match other player phrases to the correct tool per directorConstraints.forbiddenSubstitutions.
- mapSelection is authoritative ONLY when playerPlan is empty or uses 这个/它/selected; otherwise ignore mapSelection for targets.
- If any part is impossible or unsupported: unsupportedParts + toolChain MUST be [] (no substitute tools).
- Kill / assassinate guard: no tool exists — unsupportedParts + empty toolChain.
- spoof_message needs params.message; social tools may use params.frame: admin_issue | service_problem.
- Avoid disable_power_panel unless player explicitly wants loud diversion.
- Do not stage_accident unless setup plausibly exists or is included earlier in chain.
`.trim(),
    },
    {
      role: "user" as const,
      content: JSON.stringify({
        playerPlan: input.playerPlan,
        mapSelection: input.selection ?? null,
        worldSummary: input.worldSummary,
        directorConstraints: input.directorConstraints,
        priorBreak: input.priorBreak ?? null,
      }),
    },
  ];
}
