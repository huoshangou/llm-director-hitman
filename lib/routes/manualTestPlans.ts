import type { ToolUseRequest } from "../tools/toolTypes";

export const manualTestPlans: {
  id: string;
  title: string;
  description: string;
  chain: ToolUseRequest[];
}[] = [
  {
    id: "spoof_only",
    title: "Player: Spoof message",
    description: "Plant balcony meeting belief; target should not move same turn without tick threshold.",
    chain: [
      {
        toolId: "spoof_message",
        actor: "player",
        targets: ["target", "target_phone"],
        intent: "Create private meeting belief on balcony",
        params: { message: "Private art deal on the balcony." },
      },
    ],
  },
  {
    id: "guest_list",
    title: "Player: Modify guest list",
    description: "Front desk record change; trace rises.",
    chain: [
      {
        toolId: "modify_guest_list",
        actor: "player",
        targets: ["guest_list_terminal"],
        intent: "Add VIP cover record",
      },
    ],
  },
  {
    id: "complaint_guard",
    title: "Face: Guest list complaint",
    description: "Guard attention to terminal.",
    chain: [
      {
        toolId: "create_complaint",
        actor: "face",
        targets: ["guard", "guest_list_terminal"],
        intent: "VIP guest list issue at front desk",
        params: { frame: "admin_issue" },
      },
    ],
  },
  {
    id: "runner_spill_gallery",
    title: "Runner: Spill at gallery (cross-zone)",
    description: "Runner moves from kitchen; cleaner responds.",
    chain: [
      {
        toolId: "spill_drink",
        actor: "runner",
        targets: ["wine_glass", "gallery"],
        intent: "Spill near gallery path",
      },
    ],
  },
  {
    id: "runner_cart",
    title: "Runner: Move cart to gallery",
    description: "Cross-zone physical tool blocks guard sightline tag.",
    chain: [
      {
        toolId: "move_cleaning_cart",
        actor: "runner",
        targets: ["cleaning_cart", "gallery"],
        intent: "Block guard sightline in gallery",
      },
    ],
  },
  {
    id: "runner_disguise",
    title: "Runner: Impersonate staff",
    description: "Runner cross-zones to kitchen uniform.",
    chain: [
      {
        toolId: "impersonate_staff",
        actor: "runner",
        targets: ["waiter_uniform"],
        intent: "Take waiter cover",
      },
    ],
  },
  {
    id: "mini_chain",
    title: "Chain: spoof → complaint",
    description: "Two-step array order test (use Full chain).",
    chain: [
      {
        toolId: "spoof_message",
        actor: "player",
        targets: ["target", "target_phone"],
        intent: "Balcony private meeting",
      },
      {
        toolId: "create_complaint",
        actor: "face",
        targets: ["guard", "guest_list_terminal"],
        intent: "Admin guest list distraction",
        params: { frame: "admin_issue" },
      },
    ],
  },
];
