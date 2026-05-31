import { validateToolRequest } from "../tools/checkPreconditions";
import { buildTurnTimeline } from "../timeline/buildTimeline";
import { applyToolResult, resolveTool } from "../tools/resolveTool";
import type { GameEvent } from "../world/worldTypes";
import type { ToolUseRequest } from "../tools/toolTypes";
import type { WorldState } from "../world/worldTypes";

export type HackerQuickActionId =
  | "send_fake_message"
  | "disable_camera"
  | "modify_guest_list";

export type HackerQuickAction = {
  id: HackerQuickActionId;
  label: string;
  enabled: boolean;
  reason?: string;
  request: ToolUseRequest;
};

export type HackerQuickActionResult = {
  world: WorldState;
  results: ReturnType<typeof resolveTool>[];
  tickEvents: GameEvent[];
  turnTimeline: GameEvent[];
};

const REQUESTS: Record<HackerQuickActionId, ToolUseRequest> = {
  send_fake_message: {
    toolId: "spoof_message",
    actor: "player",
    targets: ["target", "target_phone"],
    intent: "Send fake balcony message to target",
    params: { message: "Private art deal on the balcony." },
  },
  disable_camera: {
    toolId: "suppress_camera_record",
    actor: "player",
    targets: ["hallway_camera"],
    intent: "Suppress hallway camera on backup power",
  },
  modify_guest_list: {
    toolId: "modify_guest_list",
    actor: "player",
    targets: ["guest_list_terminal"],
    intent: "Modify guest list record",
  },
};

const LABELS: Record<HackerQuickActionId, string> = {
  send_fake_message: "篡改目标手机",
  disable_camera: "压制备用摄像头",
  modify_guest_list: "写入宾客记录",
};

function disabledReason(id: HackerQuickActionId, reasons: string[]): string {
  if (id === "disable_camera") {
    return "需先干扰配电，让摄像头切到备用供电。";
  }
  if (id === "send_fake_message") {
    return "需先取得宾客终端权限。";
  }
  return reasons[0] ?? "当前条件不足。";
}

export function hackerQuickActionToToolRequest(
  id: HackerQuickActionId,
  world: WorldState,
): ToolUseRequest | null {
  const request = REQUESTS[id];
  if (!request) return null;
  if (!validateToolRequest(request, world).ok) return null;
  return structuredClone(request);
}

export function buildHackerQuickActions(world: WorldState): HackerQuickAction[] {
  return (Object.keys(REQUESTS) as HackerQuickActionId[]).map((id) => {
    const request = REQUESTS[id];
    const validation = validateToolRequest(request, world);
    return {
      id,
      label: LABELS[id],
      enabled: validation.ok,
      reason: validation.ok ? undefined : disabledReason(id, validation.reasons),
      request: structuredClone(request),
    };
  });
}

export function runHackerQuickAction(
  world: WorldState,
  id: HackerQuickActionId,
): HackerQuickActionResult {
  const request = REQUESTS[id];
  if (!request) {
    return { world, results: [], tickEvents: [], turnTimeline: [] };
  }

  const result = resolveTool(structuredClone(request), world);
  const nextWorld = result.status === "blocked" ? structuredClone(world) : applyToolResult(world, result);
  const tickEvents: GameEvent[] = [];
  const turnTimeline = buildTurnTimeline([result], tickEvents, world.timeSeconds);

  return {
    world: nextWorld,
    results: [result],
    tickEvents,
    turnTimeline,
  };
}
