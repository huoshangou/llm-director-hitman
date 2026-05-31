export type PresentationCueTone = "success" | "warning" | "locked" | "danger";

export type PresentationCue =
  | {
      type: "overlay";
      targetId: string;
      assetId: string;
      text?: string;
      tone?: PresentationCueTone;
    }
  | {
      type: "map_ping";
      targetId: string;
      tone: PresentationCueTone;
      text?: string;
    }
  | {
      type: "dialogue";
      speaker: "Face" | "Runner" | "Hacker" | "WORLD" | "Target";
      text: string;
    }
  | {
      type: "world_fx";
      effect:
        | "phone_ring"
        | "lights_dim"
        | "camera_glitch"
        | "sightline_blocked"
        | "unsupported_locked";
      targetId?: string;
      text?: string;
    };

export type ActivePresentationCue = PresentationCue & {
  id: string;
  expiresAtMs: number;
};

export const PRESENTATION_CUE_TTL_MS = 4200;
