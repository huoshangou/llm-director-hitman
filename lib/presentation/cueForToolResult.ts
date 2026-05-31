import type { ToolUseResult } from "../tools/toolTypes";
import type { PresentationCue } from "./presentationCue";

function ok(result: ToolUseResult): boolean {
  return result.status === "success" || result.status === "partial";
}

/** Deterministic cues from executed tool results — never claim unsupported actions. */
export function cuesForToolResult(result: ToolUseResult): PresentationCue[] {
  if (!ok(result)) return [];

  const { toolId } = result.request;

  if (toolId === "spoof_message") {
    return [
      { type: "world_fx", effect: "phone_ring", targetId: "target", text: "目标手机震动" },
      {
        type: "overlay",
        targetId: "target",
        assetId: "phone_message",
        text: "私密短信",
        tone: "success",
      },
      { type: "map_ping", targetId: "target", tone: "success", text: "短信送达" },
      {
        type: "dialogue",
        speaker: "Target",
        text: "手机收到一条可疑的阳台私密邀约。",
      },
    ];
  }

  if (toolId === "disable_power_panel") {
    return [
      { type: "world_fx", effect: "lights_dim", targetId: "power_panel", text: "画廊/阳台灯光下压" },
      {
        type: "world_fx",
        effect: "camera_glitch",
        targetId: "hallway_camera",
        text: "监控画面抖动",
      },
      { type: "map_ping", targetId: "power_panel", tone: "warning", text: "配电干扰" },
      { type: "map_ping", targetId: "kitchen", tone: "warning", text: "保安查电" },
      {
        type: "dialogue",
        speaker: "WORLD",
        text: "配电被干扰：低光窗口打开，保安转向厨房查电。",
      },
    ];
  }

  if (toolId === "move_cleaning_cart") {
    return [
      {
        type: "world_fx",
        effect: "sightline_blocked",
        targetId: "cleaning_cart",
        text: "视线被清洁车遮挡",
      },
      { type: "map_ping", targetId: "cleaning_cart", tone: "success", text: "挡线就位" },
      { type: "map_ping", targetId: "balcony_rail", tone: "warning", text: "阳台窗口" },
      {
        type: "dialogue",
        speaker: "WORLD",
        text: "清洁车挡住 guard/camera 到阳台栏杆的视线窗口。",
      },
    ];
  }

  if (toolId === "lure_with_private_meeting") {
    const partly =
      result.generatedEvents?.some((e) => e.text?.includes("only partly buys")) ?? false;
    const approached = result.generatedEvents?.some(
      (e) => e.type === "agent_move" && e.actor === "face",
    );
    return [
      {
        type: "dialogue",
        speaker: "Face",
        text: approached
          ? "Face 在目标所在区域当面接触，出示联络人身份。"
          : "Face 在目标身旁发起 VIP 私密接触。",
      },
      {
        type: "dialogue",
        speaker: "Face",
        text: partly
          ? "目标只部分相信——还缺手机或名单背书。"
          : "目标接受了私密邀约叙事，动线偏向阳台。",
      },
      {
        type: "map_ping",
        targetId: "face",
        tone: "success",
        text: "Face 接触",
      },
      {
        type: "map_ping",
        targetId: "target",
        tone: partly ? "warning" : "success",
        text: partly ? "半信半疑" : "社交诱导",
      },
    ];
  }

  if (toolId === "modify_guest_list") {
    return [
      {
        type: "dialogue",
        speaker: "Face",
        text: "名单改好了——我现在能当 VIP 联络人开口。",
      },
      { type: "map_ping", targetId: "guest_list_terminal", tone: "success", text: "Face 背书" },
    ];
  }

  return [];
}
