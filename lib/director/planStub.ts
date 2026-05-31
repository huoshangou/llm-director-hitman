import { hintForObject } from "../ui/hintForObject";
import type { MapSelection } from "../ui/mapSelection";
import { toolRegistry } from "../tools/toolRegistry";
import type { ToolId, ToolUseRequest } from "../tools/toolTypes";
import {
  buildWorldContinuationChain,
  playerExplicitlyCommitsFinal,
  playerPlanLooksLikeContinuation,
  poisonServeActorForText,
} from "./worldContinuation";
import {
  buildDeclineRequest,
  buildEliminateRequest,
  guidanceKeyForTargetKill,
  parseLethalIntent,
} from "./lethalPolicy";
import { canFaceInfiltrateGallery } from "../world/galleryInfiltration";
import type { ActorId, FieldAgentId, WorldState } from "../world/worldTypes";

export type PlanCompileResult =
  | { ok: true; chain: ToolUseRequest[]; note: string }
  | { ok: false; message: string };

type Rule = {
  test: (t: string) => boolean;
  build: (world: WorldState, sel: MapSelection | null) => ToolUseRequest | null;
};

function pickActor(toolId: string, prefer: ActorId): ActorId {
  const tool = toolRegistry[toolId];
  if (!tool) return prefer;
  if (tool.allowedActors.includes(prefer)) return prefer;
  return tool.allowedActors[0] ?? prefer;
}

const RULES: Rule[] = [
  {
    test: (t) =>
      /伪造|短信|spoof|假消息|邀约短信|骇入.*(手机|目标)|目标手机|给目标.*(发|约)|手机.*(约|短信|消息)/i.test(
        t,
      ),
    build: () => ({
      toolId: "spoof_message",
      actor: "player",
      targets: ["target", "target_phone"],
      intent: "Spoof private meeting message",
      params: { message: "Private art deal on the balcony." },
    }),
  },
  {
    test: (t) => /名单|guest.?list|终端|前台/i.test(t),
    build: () => ({
      toolId: "modify_guest_list",
      actor: "player",
      targets: ["guest_list_terminal"],
      intent: "Modify guest list",
    }),
  },
  {
    test: (t) => /摄像头|监控|camera|录像/i.test(t),
    build: () => ({
      toolId: "suppress_camera_record",
      actor: "player",
      targets: ["hallway_camera"],
      intent: "Suppress camera recording",
    }),
  },
  {
    test: (t) => /日程|冲突|schedule/i.test(t),
    build: () => ({
      toolId: "fake_schedule_conflict",
      actor: "player",
      targets: ["target"],
      intent: "Insert schedule conflict",
    }),
  },
  {
    test: (t) =>
      /混进.*画廊|混到.*画廊|混入画廊|进画廊|画廊.*混|趁乱.*画廊|等.*(保安|guard).*(离开|走开).*(混|进).*画廊|离开.*(走廊|通道).*(混|进).*画廊/i.test(
        t,
      ),
    build: () => ({
      toolId: "infiltrate_gallery",
      actor: "face",
      targets: ["gallery"],
      intent: "Infiltrate gallery when guard allows",
    }),
  },
  {
    test: (t) => /投诉|complaint|名单问题|行政/i.test(t),
    build: () => ({
      toolId: "create_complaint",
      actor: "face",
      targets: ["guard", "guest_list_terminal"],
      intent: "Admin complaint at front desk",
      params: { frame: "admin_issue" },
    }),
  },
  {
    test: (t) => /引开|支开|guard|保安|注意力/i.test(t),
    build: () => ({
      toolId: "redirect_guard_attention",
      actor: "face",
      targets: ["guard"],
      intent: "Redirect guard attention",
      params: { frame: "admin_issue" },
    }),
  },
  {
    test: (t) =>
      /私密|邀约|搭话|寒暄|lure|阳台见|引到阳台|引.*阳台|接触.*目标|face.*接触|去接触/i.test(t),
    build: () => ({
      toolId: "lure_with_private_meeting",
      actor: "face",
      targets: ["target"],
      intent: "Lure target toward balcony",
    }),
  },
  {
    test: (t) => /伪装|制服|服务员|impersonate/i.test(t),
    build: (world) => ({
      toolId: "impersonate_staff",
      actor: pickActor("impersonate_staff", world.agents.runner.location === "kitchen" ? "runner" : "face"),
      targets: ["waiter_uniform"],
      intent: "Take waiter cover",
    }),
  },
  {
    test: (t) => /清洁车|推车|挡视线|cart/i.test(t),
    build: () => ({
      toolId: "move_cleaning_cart",
      actor: "runner",
      targets: ["cleaning_cart", "gallery"],
      intent: "Block sightline with cart",
    }),
  },
  {
    test: (t) => /洒|泼|spill|酒杯/i.test(t),
    build: () => ({
      toolId: "spill_drink",
      actor: "runner",
      targets: ["wine_glass", "gallery"],
      intent: "Spill drink",
    }),
  },
  {
    test: (t) => /配电|供电|断电|停电|破坏.*电|电力|power/i.test(t),
    build: () => ({
      toolId: "disable_power_panel",
      actor: "runner",
      targets: ["power_panel"],
      intent: "Tamper power",
    }),
  },
  {
    test: (t) => /栏杆|rail|破坏阳台/i.test(t),
    build: () => ({
      toolId: "tamper_balcony_rail",
      actor: "runner",
      targets: ["balcony_rail"],
      intent: "Tamper balcony rail",
    }),
  },
  {
    test: (t) => /事故|accident|推落|stage/i.test(t),
    build: () => ({
      toolId: "stage_accident",
      actor: "runner",
      targets: ["balcony_rail", "target"],
      intent: "Stage balcony accident",
    }),
  },
];

const POISON_CHAIN_ORDER: ToolId[] = [
  "spoof_message",
  "prepare_poisoned_drink",
  "lure_with_private_meeting",
  "serve_poisoned_drink_on_balcony",
  "resolve_poison_on_balcony",
];

const CART_INFILTRATE_ORDER: ToolId[] = [
  "redirect_guard_attention",
  "disable_power_panel",
  "impersonate_staff",
  "infiltrate_gallery",
  "move_cleaning_cart",
];

const POISON_CHAIN_RE =
  /下毒|毒酒|备毒|毒.*酒|把酒.*毒|阳台.*毒|毒.*阳台|递.*毒酒|毒酒链/i;

const CART_COMBO_RE =
  /(清洁车|推车).*(画廊|混进|清扫|伪装|服务员)|(画廊|混进|清扫).*(清洁车|推车|伪装|服务员)/i;

function buildPoisonToolChain(text: string, world: WorldState): ToolUseRequest[] {
  const steps: ToolUseRequest[] = [];
  const served = world.objects.wine_bottle.state.poison_served === true;
  const poisoned = world.objects.wine_bottle.state.poisoned === true;

  if (/短信|spoof|伪造|骇入.*手机|约.*阳台/i.test(text)) {
    steps.push({
      toolId: "spoof_message",
      actor: "player",
      targets: ["target", "target_phone"],
      intent: "Spoof balcony private meeting",
      params: { message: "Private art deal on the balcony." },
    });
  }
  if (/下毒|备毒|毒酒|把酒.*毒|吧台.*毒|酒瓶.*毒/i.test(text)) {
    steps.push({
      toolId: "prepare_poisoned_drink",
      actor: "runner",
      targets: ["wine_bottle"],
      intent: "Prepare poisoned drink at bar",
    });
  }
  if (/引.*阳台|邀约|私密|勾.*阳台|上阳台|阳台.*见/i.test(text)) {
    steps.push({
      toolId: "lure_with_private_meeting",
      actor: "face",
      targets: ["target"],
      intent: "Lure Victor toward balcony",
    });
  }
  if (/递.*(毒|酒|杯)|阳台.*递|端.*酒|喝一杯|递酒|送.*(目标|Victor)|送去阳台/i.test(text)) {
    steps.push({
      toolId: "serve_poisoned_drink_on_balcony",
      actor: poisonServeActorForText(text, world),
      targets: ["target", "wine_bottle"],
      intent: "Serve poisoned drink on balcony",
    });
  }
  if (playerExplicitlyCommitsFinal(text)) {
    steps.push({
      toolId: "resolve_poison_on_balcony",
      actor: poisonServeActorForText(text, world),
      targets: ["target"],
      intent: "Resolve poison collapse on balcony",
    });
  }

  if (served && playerExplicitlyCommitsFinal(text)) {
    steps.push({
      toolId: "resolve_poison_on_balcony",
      actor: poisonServeActorForText(text, world),
      targets: ["target"],
      intent: "Resolve poison collapse on balcony",
    });
  }

  if (steps.length === 0 && /毒/i.test(text)) {
    steps.push({
      toolId: "prepare_poisoned_drink",
      actor: "runner",
      targets: ["wine_bottle"],
      intent: "Prepare poisoned drink",
    });
  }

  if (steps.length === 0 && poisoned && !served && world.npcs.target.location === "balcony") {
    steps.push({
      toolId: "serve_poisoned_drink_on_balcony",
      actor: poisonServeActorForText(text, world),
      targets: ["target", "wine_bottle"],
      intent: "Serve poisoned drink on balcony",
    });
  }

  if (poisoned && world.npcs.target.location === "balcony" && !served) {
    if (!steps.some((s) => s.toolId === "serve_poisoned_drink_on_balcony")) {
      steps.push({
        toolId: "serve_poisoned_drink_on_balcony",
        actor: poisonServeActorForText(text, world),
        targets: ["target", "wine_bottle"],
        intent: "Serve poisoned drink on balcony",
      });
    }
  }
  if (served && world.npcs.target.location === "balcony" && playerExplicitlyCommitsFinal(text)) {
    if (!steps.some((s) => s.toolId === "resolve_poison_on_balcony")) {
      steps.push({
        toolId: "resolve_poison_on_balcony",
        actor: poisonServeActorForText(text, world),
        targets: ["target"],
        intent: "Resolve poison collapse on balcony",
      });
    }
  }

  return [...steps].sort(
    (a, b) => POISON_CHAIN_ORDER.indexOf(a.toolId) - POISON_CHAIN_ORDER.indexOf(b.toolId),
  );
}

function buildCartInfiltrateChain(text: string, world: WorldState): ToolUseRequest[] {
  const steps: ToolUseRequest[] = [];
  const wantsGallery = /画廊|混进|清扫|infiltrate/i.test(text);
  const wantsCart = /清洁车|推车|cart/i.test(text);
  const wantsDisguise = /伪装|服务员|impersonate/i.test(text);

  if (!wantsGallery && !wantsCart) return [];

  if (!canFaceInfiltrateGallery(world).ok) {
    steps.push({
      toolId: "redirect_guard_attention",
      actor: "face",
      targets: ["guard"],
      intent: "Clear guard before gallery entry",
      params: { frame: "admin_issue" },
    });
    steps.push({
      toolId: "disable_power_panel",
      actor: "runner",
      targets: ["power_panel"],
      intent: "Draw guard to kitchen before cart infiltration",
    });
  }

  if (wantsDisguise && world.agents.runner.coverIdentity !== "waiter") {
    steps.push({
      toolId: "impersonate_staff",
      actor: "runner",
      targets: ["waiter_uniform"],
      intent: "Take waiter cover for gallery sweep",
    });
  }

  if (wantsGallery && world.agents.face.location !== "gallery") {
    steps.push({
      toolId: "infiltrate_gallery",
      actor: "face",
      targets: ["gallery"],
      intent: "Infiltrate gallery when guard allows",
    });
  }

  if (wantsCart && world.objects.cleaning_cart.state.blockingSightline !== true) {
    steps.push({
      toolId: "move_cleaning_cart",
      actor: "runner",
      targets: ["cleaning_cart", "gallery"],
      intent: "Block sightline with cart",
    });
  }

  return [...steps].sort(
    (a, b) => CART_INFILTRATE_ORDER.indexOf(a.toolId) - CART_INFILTRATE_ORDER.indexOf(b.toolId),
  );
}

function requestFromNpcSelection(sel: MapSelection): ToolUseRequest | null {
  if (sel.kind !== "npc" || sel.id !== "target") return null;
  return {
    toolId: "spoof_message",
    actor: "player",
    targets: ["target", "target_phone"],
    intent: "Spoof private meeting via target phone attack surface",
    params: { message: "Private art deal on the balcony." },
  };
}

function requestFromSelection(world: WorldState, sel: MapSelection): ToolUseRequest | null {
  if (sel.kind === "npc") {
    return requestFromNpcSelection(sel);
  }
  if (sel.kind === "object") {
    const obj = world.objects[sel.id];
    if (!obj) return null;
    const hints = hintForObject(obj);
    if (hints.length !== 1) return null;
    const toolId = hints[0].toolId as ToolId;
    const tool = toolRegistry[toolId];
    if (!tool) return null;
    const actor: ActorId = tool.allowedActors.includes("player")
      ? "player"
      : (tool.allowedActors[0] as FieldAgentId);
    const targets: string[] = [sel.id];
    if (toolId === "spoof_message") targets.push("target", "target_phone");
    if (toolId === "create_complaint" || toolId === "redirect_guard_attention") {
      targets.length = 0;
      targets.push("guard", "guest_list_terminal");
    }
    if (toolId === "lure_with_private_meeting") {
      targets.length = 0;
      targets.push("target");
    }
    if (toolId === "stage_accident") targets.push("target");
    if (toolId === "spill_drink") targets.push("wine_glass", "gallery");
    if (toolId === "move_cleaning_cart") targets.push("cleaning_cart", "gallery");
    if (toolId === "prepare_poisoned_drink") targets.push("wine_bottle");
    if (toolId === "serve_poisoned_drink_on_balcony") {
      targets.length = 0;
      targets.push("target", "wine_bottle");
    }
    if (toolId === "resolve_poison_on_balcony") {
      targets.length = 0;
      targets.push("target");
    }
    return {
      toolId,
      actor,
      targets,
      intent: `Use ${sel.id} via selection`,
      params:
        toolId === "spoof_message"
          ? { message: "Private art deal on the balcony." }
          : toolId === "create_complaint" || toolId === "redirect_guard_attention"
            ? { frame: "admin_issue" }
            : undefined,
    };
  }
  return null;
}

function refersToSelection(text: string): boolean {
  if (!text.trim()) return false;
  return /这个|这个点|它|该物件|该目标|选中|刚才|this|it|selected/i.test(text);
}

/** Selection may compile only when empty command or explicit pronoun/chip. */
export function selectionUsedForCompile(planText: string, selection: MapSelection | null): boolean {
  if (!selection) return false;
  const text = planText.trim();
  if (!text) return true;
  return refersToSelection(text);
}

const ACTOR_ORDER: ActorId[] = ["player", "face", "runner"];

function orderChainByActor(chain: ToolUseRequest[]): ToolUseRequest[] {
  return [...chain].sort(
    (a, b) => ACTOR_ORDER.indexOf(a.actor) - ACTOR_ORDER.indexOf(b.actor),
  );
}

function countRuleHits(text: string): number {
  let n = 0;
  for (const rule of RULES) {
    if (rule.test(text)) n += 1;
  }
  return n;
}

function augmentInfiltrateChain(chain: ToolUseRequest[], world: WorldState): ToolUseRequest[] {
  const needsGallery = chain.some((r) => r.toolId === "infiltrate_gallery");
  if (!needsGallery || canFaceInfiltrateGallery(world).ok) return chain;
  if (chain.some((r) => r.toolId === "redirect_guard_attention")) return chain;
  if (chain.some((r) => r.toolId === "disable_power_panel")) return chain;
  return [
    {
      toolId: "redirect_guard_attention",
      actor: "face",
      targets: ["guard"],
      intent: "Clear gallery path before infiltrate",
      params: { frame: "admin_issue" },
    },
    ...chain,
  ];
}

/** Multiple explicit actor mentions or several rule hits → collect all matching rules. */
function wantsParallelCompile(text: string, world: WorldState): boolean {
  if (countRuleHits(text) >= 2) return true;
  const hasFace = /\bface\b|脸\b|让\s*face|face\s*去/i.test(text) || /社交|搭话|接触目标|引开/i.test(text);
  const hasRunner =
    /\brunner\b|跑手/i.test(text) ||
    /runner\s*(换|动|推|去)|清洁车|伪装|配电|栏杆|吧台.*毒|备毒|下毒/i.test(text);
  const hasPlayer = /我先|玩家|骇入|伪造.*短信|改名单/i.test(text);
  let n = 0;
  if (hasFace) n += 1;
  if (hasRunner) n += 1;
  if (hasPlayer) n += 1;
  if (n >= 2) return true;
  if (POISON_CHAIN_RE.test(text) && buildPoisonToolChain(text, world).length > 1) return true;
  return false;
}

/** Pre-LLM: keyword + selection → single-tool chain for step mode. */
export function compilePlanFromText(
  planText: string,
  world: WorldState,
  selection: MapSelection | null,
): PlanCompileResult {
  const text = planText.trim();
  if (!text && !selection) {
    return {
      ok: false,
      message: "先点击地图上的物件或角色，再写本 turn 要做什么；或写出明确动作（如「伪造短信」「引开保安」）。",
    };
  }

  if (selection && refersToSelection(text)) {
    const fromSel = requestFromSelection(world, selection);
    if (fromSel) {
      return {
        ok: true,
        chain: [fromSel],
        note: "已把「这个/它」解析为当前地图选中项。",
      };
    }
  }

  if (text && playerPlanLooksLikeContinuation(text, world)) {
    const cont = buildWorldContinuationChain(world, text);
    if (cont.length) {
      return {
        ok: true,
        chain: cont,
        note: "已根据当前世界态续接下一步（规则 stub）。",
      };
    }
  }

  if (text) {
    const lethal = parseLethalIntent(text);
    if (lethal?.victim === "guard") {
      return {
        ok: true,
        chain: [buildEliminateRequest(text, "guard")],
        note: "已匹配清除保安威胁（需 stealth 窗口；resolver 判定成败）。",
      };
    }
    if (lethal?.victim === "guest") {
      return {
        ok: true,
        chain: [buildEliminateRequest(text, "guest")],
        note: "已匹配清除宾客（成功将触发误伤坏结局）。",
      };
    }
    if (lethal?.victim === "target") {
      return {
        ok: true,
        chain: [buildDeclineRequest(text, "target", guidanceKeyForTargetKill(world))],
        note: "已匹配对合同目标的拒绝与阳台引导。",
      };
    }
  }

  if (text && CART_COMBO_RE.test(text)) {
    const cartChain = buildCartInfiltrateChain(text, world);
    if (cartChain.length) {
      return {
        ok: true,
        chain: cartChain,
        note: "已匹配清洁车 + 画廊潜入组合（先引开保安/配电，再伪装与推车）。",
      };
    }
  }

  const poisonContext =
    POISON_CHAIN_RE.test(text) ||
    world.objects.wine_bottle.state.poisoned === true ||
    world.objects.wine_bottle.state.poison_served === true;
  if (text && poisonContext) {
    const poisonChain = buildPoisonToolChain(text, world);
    if (poisonChain.length > 0) {
      return {
        ok: true,
        chain: poisonChain,
        note: "已匹配阳台毒酒链（规则 stub）；本 turn 执行链上当前可执行步骤。",
      };
    }
  }

  if (text) {
    const parallel = wantsParallelCompile(text, world);
    if (parallel) {
      const chain: ToolUseRequest[] = [];
      for (const rule of RULES) {
        if (rule.test(text)) {
          const req = rule.build(world, selection);
          if (req) chain.push(req);
        }
      }
      if (chain.length) {
        const ordered = orderChainByActor(augmentInfiltrateChain(chain, world));
        return {
          ok: true,
          chain: ordered,
          note: "已按关键词匹配多个并行动作（每 actor 本 turn 最多一步）。",
        };
      }
    } else {
      for (const rule of RULES) {
        if (rule.test(text)) {
          const req = rule.build(world, selection);
          if (req) {
            return {
              ok: true,
              chain: [req],
              note: "已按关键词匹配工具（Day 4 前为规则 stub，非 LLM）。",
            };
          }
        }
      }
    }
  }

  if (!text && selection) {
    const fromSel = requestFromSelection(world, selection);
    if (fromSel) {
      return {
        ok: true,
        chain: [fromSel],
        note: "已根据选中物件的唯一 affordance 生成指令（可再补自然语言细化意图）。",
      };
    }
  }

  return {
    ok: false,
    message:
      "无法从描述解析出工具。试试：伪造短信、改名单、引开保安、私密邀约、移动清洁车、破坏栏杆… 或选中只有一个可用操作的物件后提交。",
  };
}
