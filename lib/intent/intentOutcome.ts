import type { PresentationCue } from "../presentation/presentationCue";
import type { ToolId, ToolUseRequest } from "../tools/toolTypes";

export type IntentOutcomeStatus =
  | "executable"
  | "convertible"
  | "locked"
  | "out_of_slice"
  | "dirty";

export type IntentOutcome =
  | {
      status: "executable";
      summary: string;
      toolRequest: ToolUseRequest;
      cues: PresentationCue[];
    }
  | {
      status: "convertible";
      summary: string;
      originalIntent: string;
      convertedTo: ToolUseRequest;
      cues: PresentationCue[];
    }
  | {
      status: "locked";
      summary: string;
      reason: string;
      next: string;
      relatedObjectIds?: string[];
      cues: PresentationCue[];
    }
  | {
      status: "out_of_slice";
      summary: string;
      recognizedIntent: string;
      nearestTools: ToolId[];
      inWorldReply: string;
      cues: PresentationCue[];
    }
  | {
      status: "dirty";
      summary: string;
      risk: "alarm" | "compromise" | "evidence";
      toolRequest?: ToolUseRequest;
      cues: PresentationCue[];
    };

export type IntentOutcomeCore = {
  [K in IntentOutcome as K["status"]]: Omit<K, "cues">;
}[IntentOutcome["status"]];
