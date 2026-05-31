import type { ToolUseRequest } from "../tools/toolTypes";
import type { ActorId } from "../world/worldTypes";

export type OperationActionSource = "llm" | "stub" | "selection" | "chip";

export type OperationAction = {
  actor: ActorId;
  request: ToolUseRequest;
  source: OperationActionSource;
};

export type OperationSet = {
  actions: OperationAction[];
  rejected: { request: ToolUseRequest; reasons: string[] }[];
  conflicts: { actor: ActorId; requests: ToolUseRequest[]; reason: string }[];
};
