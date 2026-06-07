import type { AgentState, NpcState, ObjectState } from "./worldTypes";

export const TAG = {
  disguisedAsWaiter: "disguised_as_waiter",
  coverValidService: "cover_valid_service",
  targetPrivateMeetingBelief: "target_has_private_meeting_belief",
  targetRouteBalconyCommitted: "target_route_balcony_committed",
  wineBottlePoisoned: "wine_bottle_poisoned",
  tamperedObject: "tampered_object",
  poisonServedToTarget: "poison_served_to_target",
  targetAcceptedPoisonedDrink: "target_accepted_poisoned_drink",
  targetPoisoned: "target_poisoned",
  targetHandled: "target_handled",
  cameraRecordingSuppressed: "camera_recording_suppressed",
  cameraHasRelevantFootage: "camera_has_relevant_footage",
  guardSuspiciousOfRunner: "guard_suspicious_of_runner",
  guardSuspiciousOfFace: "guard_suspicious_of_face",
} as const;

export type SemanticTag = (typeof TAG)[keyof typeof TAG];

export function addUniqueTags(existing: string[] | undefined, tags: string[]): string[] {
  const next = [...(existing ?? [])];
  for (const tag of tags) {
    if (!next.includes(tag)) next.push(tag);
  }
  return next;
}

export function patchAgentTags(agent: AgentState, tags: string[]): Pick<AgentState, "stateTags"> {
  return { stateTags: addUniqueTags(agent.stateTags, tags) };
}

export function patchNpcTags(npc: NpcState, tags: string[]): Pick<NpcState, "stateTags"> {
  return { stateTags: addUniqueTags(npc.stateTags, tags) };
}

export function patchObjectTags(object: ObjectState, tags: string[]): Pick<ObjectState, "tags"> {
  return { tags: addUniqueTags(object.tags, tags) };
}
