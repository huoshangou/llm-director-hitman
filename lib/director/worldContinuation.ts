import type { ToolUseRequest } from "../tools/toolTypes";
import { canFaceInfiltrateGallery } from "../world/galleryInfiltration";
import type { FieldAgentId, WorldState } from "../world/worldTypes";

export const FINAL_COMMIT_RE =
  /确认|动手|下手|收尾|结算|毒发|倒下|发作|让他死|弄死|喝完|完成|execute|finish|resolve|collapse/i;

export function playerExplicitlyCommitsFinal(text: string): boolean {
  return FINAL_COMMIT_RE.test(text);
}

export function poisonServeActorForText(text: string, world: WorldState): FieldAgentId {
  const asksRunner = /runner|服务员|送酒|送去|端过去|端酒|吧台.*送|一路往阳台/i.test(text);
  if (asksRunner && world.agents.runner.coverIdentity === "waiter") return "runner";
  return "face";
}

/** 玩家短指令是否像在续接当前世界态（毒酒 / 清洁车链）。 */
export function playerPlanLooksLikeContinuation(text: string, world: WorldState): boolean {
  const t = text.trim();
  if (!t) return false;

  const poisoned = world.objects.wine_bottle.state.poisoned === true;
  const served = world.objects.wine_bottle.state.poison_served === true;
  const onBalcony = world.npcs.target.location === "balcony";

  if (/^(继续|下一步|执行计划|递杯|递酒|结算|毒发|混进画廊|推车)/i.test(t)) return true;

  if (poisoned && onBalcony && !served) {
    return /送|递|酒|杯|阳台|跟上|怎么没|送去|端过去|送过去/i.test(t);
  }
  if (served && onBalcony) {
    return /结算|倒下|毒发|弄死|喝完|collapse|resolve/i.test(t);
  }
  if (poisoned && !onBalcony) {
    return /引|阳台|邀约|lure|上去|勾/i.test(t);
  }

  if (
    world.objects.cleaning_cart.state.blockingSightline !== true &&
    (world.agents.runner.coverIdentity === "waiter" || world.agents.face.location === "gallery")
  ) {
    return /清洁车|推车|混进|画廊|清扫|伪装好了|继续/i.test(t);
  }

  return false;
}

export function buildWorldContinuationChain(world: WorldState, text = ""): ToolUseRequest[] {
  const poisoned = world.objects.wine_bottle.state.poisoned === true;
  const served = world.objects.wine_bottle.state.poison_served === true;
  const onBalcony = world.npcs.target.location === "balcony";

  if (poisoned && onBalcony && !served) {
    const actor = poisonServeActorForText(text, world);
    return [
      {
        toolId: "serve_poisoned_drink_on_balcony",
        actor,
        targets: ["target", "wine_bottle"],
        intent: "Serve poisoned drink on balcony",
      },
    ];
  }
  if (served && onBalcony && !playerExplicitlyCommitsFinal(text)) return [];
  if (served && onBalcony) {
    return [
      {
        toolId: "resolve_poison_on_balcony",
        actor: poisonServeActorForText(text, world),
        targets: ["target"],
        intent: "Resolve poison collapse on balcony",
      },
    ];
  }
  if (poisoned && !onBalcony) {
    return [
      {
        toolId: "lure_with_private_meeting",
        actor: "face",
        targets: ["target"],
        intent: "Lure Victor toward balcony",
      },
    ];
  }

  const steps: ToolUseRequest[] = [];

  if (!canFaceInfiltrateGallery(world).ok) {
    steps.push({
      toolId: "redirect_guard_attention",
      actor: "face",
      targets: ["guard"],
      intent: "Clear guard before gallery",
      params: { frame: "admin_issue" },
    });
  }
  if (world.objects.power_panel.state.powerStable !== false) {
    steps.push({
      toolId: "disable_power_panel",
      actor: "runner",
      targets: ["power_panel"],
      intent: "Draw guard for infiltration",
    });
  }
  if (world.agents.runner.coverIdentity !== "waiter") {
    steps.push({
      toolId: "impersonate_staff",
      actor: "runner",
      targets: ["waiter_uniform"],
      intent: "Waiter cover for cart",
    });
  }
  if (world.agents.face.location !== "gallery" && canFaceInfiltrateGallery(world).ok) {
    steps.push({
      toolId: "infiltrate_gallery",
      actor: "face",
      targets: ["gallery"],
      intent: "Infiltrate gallery",
    });
  }
  if (world.objects.cleaning_cart.state.blockingSightline !== true) {
    steps.push({
      toolId: "move_cleaning_cart",
      actor: "runner",
      targets: ["cleaning_cart", "gallery"],
      intent: "Block sightline with cart",
    });
  }

  return steps;
}
