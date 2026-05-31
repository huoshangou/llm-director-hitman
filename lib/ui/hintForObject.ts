import { toolRegistry } from "../tools/toolRegistry";
import type { ObjectState } from "../world/worldTypes";
import { TOOL_HINT_LABELS } from "./toolHintLabels";

export type AffordanceHint = {
  toolId: string;
  label: string;
};

export function hintForObject(obj: ObjectState): AffordanceHint[] {
  const registered = new Set(Object.keys(toolRegistry));
  return obj.affordances
    .filter((id) => registered.has(id))
    .map((toolId) => ({
      toolId,
      label: TOOL_HINT_LABELS[toolId] ?? toolId,
    }));
}
