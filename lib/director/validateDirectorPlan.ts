import { validateToolChain } from "../tools/checkPreconditions";
import { toolRegistry } from "../tools/toolRegistry";
import type { ToolUseRequest } from "../tools/toolTypes";
import type { WorldState } from "../world/worldTypes";
import type { DirectorPlan } from "./directorSchema";
import { normalizeToolChain } from "./normalizePlan";

export type DirectorValidation = {
  errors: string[];
  warnings: string[];
  executableChain: ToolUseRequest[];
  rejected: { request: ToolUseRequest; reasons: string[] }[];
};

export function validateDirectorPlan(plan: DirectorPlan, world: WorldState): DirectorValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const chain = normalizeToolChain(plan.toolChain as ToolUseRequest[]);

  for (const req of chain) {
    const tool = toolRegistry[req.toolId];
    if (!tool) {
      errors.push(`未知工具: ${req.toolId}`);
      continue;
    }
    if (!tool.allowedActors.includes(req.actor)) {
      errors.push(`${req.actor} 不能使用 ${req.toolId}`);
    }
    for (const target of req.targets) {
      const exists =
        target in world.npcs ||
        target in world.agents ||
        target in world.objects ||
        target in world.locations;
      if (!exists) warnings.push(`目标可能不存在: ${target}`);
    }
  }

  const { executableChain, rejected } = validateToolChain(chain, world);
  if (plan.feasibility === "impossible" && executableChain.length === 0) {
    warnings.push("Director 判定为 impossible 且无本 turn 可执行步骤");
  }

  return { errors, warnings, executableChain, rejected };
}
