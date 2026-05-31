import { hintForObject } from "./hintForObject";
import { OBJECT_LABELS } from "../sprites/objectVisualOffsets";
import { AGENT_LABELS, NPC_LABELS } from "./labels";
import { selectionBlockerLine } from "./planNextHint";
import type { FieldAgentId, NpcId, ObjectId, WorldState } from "../world/worldTypes";
import type { MapSelection } from "./mapSelection";

const LOC_ZH: Record<string, string> = {
  lobby: "大堂",
  bar: "吧台",
  kitchen: "厨房",
  gallery: "画廊",
  balcony: "阳台",
};

export type HackerAnalysisBlock = {
  title: string;
  subtitle: string;
  lines: string[];
  affordances: string[];
};

const NPC_DOSSIER: Record<NpcId, { role: string; relation: string; leverage: string }> = {
  target: {
    role: "暗杀目标",
    relation: "任务目标：Victor Vale。把他从画廊人群里带到阳台，才有干净窗口。",
    leverage: "可利用入口：目标手机、私人邀约叙事、阳台独处习惯。",
  },
  guard: {
    role: "现场阻碍",
    relation: "任务关系：保安控制画廊/阳台视线；不先移开他，现场动作会抬高风险。",
    leverage: "可利用入口：行政投诉、宾客名单问题、配电异常。",
  },
  waiter: {
    role: "服务动线",
    relation: "任务关系：服务员动线连接厨房、吧台和宾客；制服可给 Runner 提供合理移动理由。",
    leverage: "可利用入口：服务员制服、酒水托盘、吧台备酒。",
  },
  cleaner: {
    role: "环境遮挡",
    relation: "任务关系：保洁会响应洒酒和清洁车移动，可制造短暂遮挡或人员调度。",
    leverage: "可利用入口：洒酒点、清洁车、走廊服务路线。",
  },
  guest: {
    role: "人群噪声",
    relation: "任务关系：宾客群提供掩护，也会让显眼动作更难解释。",
    leverage: "可利用入口：投诉、名单、日程冲突。",
  },
};

const OBJECT_DOSSIER: Record<ObjectId, string> = {
  guest_list_terminal: "任务关系：宾客终端能给 Face 写入身份背书，也能作为伪造消息的入口。",
  wine_glass: "任务关系：酒杯可制造服务事故；真正的毒酒链仍围绕吧台酒具和阳台递杯。",
  wine_bottle: "任务关系：吧台酒具是毒酒链核心；备好后还需要把 Victor 引到阳台再递出。",
  waiter_uniform: "任务关系：服务员制服让 Runner 的吧台和送酒动作更自然。",
  cleaning_cart: "任务关系：清洁车适合制造局部遮挡或服务动线窗口，不是远距离万能挡线。",
  power_panel: "任务关系：配电异常会吸引保安并让摄像头进入备用供电窗口。",
  balcony_rail: "任务关系：阳台栏杆是事故路线核心，但必须先清掉视线并让目标到阳台。",
  hallway_camera: "任务关系：走廊摄像头记录阳台通道；主电源正常时很难直接压制。",
  target_phone: "任务关系：目标手机可植入阳台私密邀约，给 Face 一个可信开场。",
  kitchen_door: "任务关系：厨房门连接配电、制服和吧台准备，是 Runner 现场动作入口。",
};

function taskLine(task: NonNullable<WorldState["npcs"][NpcId]["currentTask"]> | undefined): string {
  if (!task) return "当前行为：空闲/应酬中，可被我方计划改写路线。";
  return `当前行为：${task.type} → ${LOC_ZH[task.location ?? ""] ?? task.location ?? "—"}（约 ${task.remainingSeconds}s）`;
}

export function buildHackerAnalysis(
  world: WorldState,
  selection: MapSelection | null,
): HackerAnalysisBlock {
  if (!selection) {
    return {
      title: "骇入分析 · 待机",
      subtitle: "远程传感阵列已接入宴会楼层",
      lines: [
        "你无需到场：视觉来自入侵的监控与动线模型，点击实体可拉取可供性分析。",
        "微光处为可交互热点；选中后把名称写进下方 plan。",
      ],
      affordances: [],
    };
  }

  if (selection.kind === "object") {
    const obj = world.objects[selection.id as ObjectId];
    const label = OBJECT_LABELS[selection.id as ObjectId] ?? obj?.name ?? selection.id;
    const loc = obj?.location && LOC_ZH[obj.location] ? LOC_ZH[obj.location] : obj?.location;
    const hints = obj ? hintForObject(obj) : [];
    const lines: string[] = [
      OBJECT_DOSSIER[selection.id as ObjectId] ?? `任务关系：${label} 可作为现场计划引用点。`,
      `当前位置：${loc ?? "—"}`,
    ];
    if (obj?.state?.modified) lines.push("当前状态：记录已被改写，可作为 Face 的身份背书。");
    if (obj?.state?.spilled) lines.push("当前状态：现场已有洒酒痕迹，会牵动保洁路线。");
    if (obj?.state?.tampered) lines.push("当前状态：结构/设备已被处理，后续动作风险取决于视线。");
    if (obj?.state?.blockingSightline) lines.push("当前状态：遮挡已形成，适合推进阳台窗口。");
    const blocker = selectionBlockerLine(world, selection.id);
    if (blocker) lines.push(blocker);
    return {
      title: `任务情报 · ${label}`,
      subtitle: "现场物件 / 可利用入口",
      lines,
      affordances: hints.map((h) => h.label),
    };
  }

  if (selection.kind === "npc") {
    const npc = world.npcs[selection.id as NpcId];
    const label = NPC_LABELS[selection.id as NpcId]?.short ?? selection.id;
    const loc = npc ? (LOC_ZH[npc.location] ?? npc.location) : "—";
    const dossier = NPC_DOSSIER[selection.id as NpcId];
    const lines: string[] = [
      dossier?.relation ?? `任务关系：${label} 是现场人物，可作为计划引用点。`,
      `当前观察：${label} 在${loc}，状态 ${npc?.attentionMode ?? "—"}。`,
      taskLine(npc?.currentTask),
    ];

    const affordances: string[] = ["可把该人物写进指令，让 Face / Runner 围绕他行动"];
    if (selection.id === "target") {
      const phone = world.objects.target_phone;
      lines.splice(1, 0, dossier.leverage);
      if (phone?.state?.reachable === true) {
        lines.push("当前机会：目标手机可被伪造/篡改为阳台私密邀约；Face 可以借这个理由接触他。");
        affordances.unshift("Hacker：伪造阳台私密短信");
      }
      const hasPhoneBelief = npc?.beliefs.some(
        (b) => b.source === "spoof" || b.predicate.includes("private_meeting"),
      );
      if (hasPhoneBelief) {
        lines.push("当前状态：目标已收到伪造私密邀约，Face 社交链可引用同一叙事。");
      }
    } else if (dossier?.leverage) {
      lines.push(dossier.leverage);
    }

    return {
      title: `任务情报 · ${NPC_LABELS[selection.id as NpcId]?.full ?? label}`,
      subtitle: dossier?.role ?? "人员情报",
      lines,
      affordances,
    };
  }

  const agent = world.agents[selection.id as FieldAgentId];
  const label = AGENT_LABELS[selection.id as FieldAgentId]?.short ?? selection.id;
  const loc = agent ? (LOC_ZH[agent.location] ?? agent.location) : "—";
  const roleLine =
    selection.id === "face"
      ? "我方交涉员：负责接触目标、包装理由、引导路线，尽量把行动伪装成社交。"
      : "我方执行员：负责配电、伪装、清洁车、酒水和物理动作，承担现场风险。";
  return {
    title: `任务情报 · ${AGENT_LABELS[selection.id as FieldAgentId]?.full ?? label}`,
    subtitle: "我方干员 / 可下令对象",
    lines: [
      roleLine,
      `当前位置：${loc} · 状态 ${agent?.status ?? "—"}`,
      `风险读数：压力 ${agent?.stress ?? 0} · 暴露 ${agent?.exposure ?? 0}`,
      "用自然语言直接点名他；干员会自行到场执行合法工具。",
    ],
    affordances: agent?.availableTools?.slice(0, 4).map((t) => `可执行：${t}`) ?? [],
  };
}
