import { z } from "zod";
import type { ToolUseRequest } from "../tools/toolTypes";

export const PlanConstraintSchema = z.object({
  id: z.string(),
  description: z.string(),
  strictness: z.enum(["hard", "soft"]),
  relatedRisk: z.enum(["alarm", "suspicion", "evidence", "exposure", "time"]).optional(),
});

export const PlanAssumptionSchema = z.object({
  id: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(100),
});

export const ToolUseRequestSchema = z.object({
  toolId: z.string(),
  actor: z.enum(["player", "face", "runner", "hacker"]),
  targets: z.array(z.string()),
  intent: z.string(),
  constraints: z.array(z.string()).optional(),
  timing: z.string().optional(),
  priority: z.number().min(0).max(100).optional(),
  params: z.record(z.string(), z.unknown()).optional(),
});

export const UnsupportedPartSchema = z.object({
  text: z.string(),
  reason: z.string(),
});

export const FallbackSuggestionSchema = z.object({
  description: z.string(),
  toolChain: z.array(ToolUseRequestSchema),
});

export const AgentCommSchema = z.object({
  agent: z.enum(["face", "hacker", "runner", "player"]),
  text: z.string(),
  tone: z.enum(["confident", "cautious", "urgent", "blocked", "suggestion"]).optional(),
});

export const DirectorPlanSchema = z.object({
  recognizedIntent: z.string(),
  planStyle: z.enum([
    "low_profile",
    "social_engineering",
    "technical_intrusion",
    "physical_accident",
    "panic_distraction",
    "direct_violence",
    "evidence_control",
    "improvised",
  ]),
  constraints: z.array(PlanConstraintSchema).default([]),
  assumptions: z.array(PlanAssumptionSchema).default([]),
  feasibility: z.enum(["high", "medium", "low", "partial", "impossible"]),
  toolChain: z.array(ToolUseRequestSchema),
  unsupportedParts: z.array(UnsupportedPartSchema).default([]),
  fallbackSuggestions: z.array(FallbackSuggestionSchema).default([]),
  riskSummary: z.array(z.string()).default([]),
  playerFacingSummary: z.string(),
  agentComms: z.array(AgentCommSchema).default([]),
});

export type DirectorPlanRaw = z.infer<typeof DirectorPlanSchema>;

export type DirectorPlan = Omit<DirectorPlanRaw, "toolChain" | "fallbackSuggestions"> & {
  toolChain: ToolUseRequest[];
  fallbackSuggestions: Array<
    Omit<DirectorPlanRaw["fallbackSuggestions"][number], "toolChain"> & {
      toolChain: ToolUseRequest[];
    }
  >;
};
