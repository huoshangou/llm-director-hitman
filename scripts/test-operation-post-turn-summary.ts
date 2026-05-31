import assert from "node:assert/strict";
import { planDeferredNextLines } from "../lib/ui/planDeferredHints";
import { operationConflictNextLines, operationSetSummaryLine } from "../lib/ui/operationSetSummary";
import type { OperationSet } from "../lib/operation/operationTypes";
import { cloneWorld } from "../lib/world/initialWorld";

const op: OperationSet = {
  rejected: [],
  actions: [
    {
      actor: "face",
      source: "llm",
      request: {
        toolId: "redirect_guard_attention",
        actor: "face",
        targets: ["guard"],
        intent: "redirect",
      },
    },
    {
      actor: "face",
      source: "llm",
      request: {
        toolId: "infiltrate_gallery",
        actor: "face",
        targets: ["gallery"],
        intent: "infiltrate",
      },
    },
    {
      actor: "face",
      source: "llm",
      request: {
        toolId: "lure_with_private_meeting",
        actor: "face",
        targets: ["target"],
        intent: "lure",
      },
    },
  ],
  conflicts: [
    {
      actor: "face",
      requests: [
        {
          toolId: "redirect_guard_attention",
          actor: "face",
          targets: ["guard"],
          intent: "redirect",
        },
        {
          toolId: "infiltrate_gallery",
          actor: "face",
          targets: ["gallery"],
          intent: "infiltrate",
        },
        {
          toolId: "lure_with_private_meeting",
          actor: "face",
          targets: ["target"],
          intent: "lure",
        },
      ],
      reason: "multi-wave face chain",
    },
  ],
};

assert.ok(
  operationSetSummaryLine(op).includes("Infiltrate Gallery"),
  "post-turn operation summary should include multi-wave executed actions",
);
assert.deepEqual(
  operationConflictNextLines(op),
  [],
  "NEXT lines should not list actions already executed in later waves",
);

assert.deepEqual(
  planDeferredNextLines(
    cloneWorld(),
    {
      executableChain: [],
      rejected: [
        {
          request: {
            toolId: "lure_with_private_meeting",
            actor: "face",
            targets: ["target"],
            intent: "lure",
          },
          reasons: ["target is not at balcony"],
        },
      ],
      errors: [],
      warnings: [],
    },
    op,
  ),
  [],
  "deferred hints should ignore validation rejections that executed in later waves",
);

console.log("test-operation-post-turn-summary: ok");
