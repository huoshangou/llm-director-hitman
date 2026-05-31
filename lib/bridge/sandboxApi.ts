/**
 * Browser bundle entry for sandbox-shell. Rules live in lib/tools + lib/world only.
 */
import { classifyTerminalState, convergenceCheckpoints } from "../convergence/terminalState";
import { showcaseRoutes } from "../routes/showcaseRoutes";
import { buildTurnTimeline } from "../timeline/buildTimeline";
import { executeToolChain } from "../tools/executePlan";
import type { ToolUseRequest } from "../tools/toolTypes";
import { cloneWorld } from "../world/initialWorld";
import type { WorldState } from "../world/worldTypes";
import { worldToScene, type SceneSnapshot } from "./worldToScene";

export function getInitialWorld(): WorldState {
  return cloneWorld();
}

export type StepOutcome = {
  world: WorldState;
  scene: SceneSnapshot;
  results: ReturnType<typeof executeToolChain>["results"];
  tickEvents: ReturnType<typeof executeToolChain>["tickEvents"];
  turnTimeline: ReturnType<typeof buildTurnTimeline>;
  terminal: ReturnType<typeof classifyTerminalState>;
  checkpoints: ReturnType<typeof convergenceCheckpoints>;
};

export function runOneStep(world: WorldState, tool: ToolUseRequest): StepOutcome {
  const exec = executeToolChain(world, [tool], "step");
  const turnTimeline = buildTurnTimeline(
    exec.results,
    exec.tickEvents,
    world.timeSeconds,
  );
  return {
    world: exec.world,
    scene: worldToScene(exec.world),
    results: exec.results,
    tickEvents: exec.tickEvents,
    turnTimeline,
    terminal: classifyTerminalState(exec.world),
    checkpoints: convergenceCheckpoints(exec.world),
  };
}

export {
  createSession,
  executeSessionStep,
  sessionBeatHeader,
  getSessionStep,
  getShowcaseRoute,
} from "./sandboxSession";

export { ROUTE_ACTS } from "../beats/routeActs";
export { buildTurnTimeline } from "../timeline/buildTimeline";
export {
  computePlaybackFrame,
  totalPlaybackDurationMs,
  PLAYBACK_MS_PER_T,
} from "../timeline/playback";
export { mapPickablesFromWorld, selectionChipText, selectionLabel } from "../ui/mapSelection";
export { buildHackerAnalysis } from "../ui/hackerAnalysis";
export type { HackerAnalysisBlock } from "../ui/hackerAnalysis";
export { planNextHint, selectionBlockerLine } from "../ui/planNextHint";
export type { RejectedStep } from "../ui/planNextHint";
export { executedStepSummary, executedStepSummaryFromResult } from "../ui/executedStepSummary";
export {
  commandFeedLineForEvent,
  commandFeedLinesFromTimeline,
} from "../ui/commandFeedWorldLine";
export type { CommandFeedLine } from "../ui/commandFeedWorldLine";
export { hintForObject } from "../ui/hintForObject";
export {
  runIdlePass,
  runAmbientStep,
  runAmbientBurst,
  primeAmbientWorld,
  warmupAmbientTasks,
  IDLE_TICKS_PER_PASS,
  AMBIENT_TICKS_PER_PULSE,
} from "../world/ambientWorld";
export { getSceneSignals } from "../world/sceneSignals";
export { ambientEntityOffset } from "../timeline/ambientMotion";
export {
  cameraAfterFieldTurn,
  cameraFrameForEntities,
  cameraFrameForPlaybackPositions,
} from "../sprites/fitPlayCamera";
export { playbackCoordAtLocation, playbackCoordForEntity } from "../sprites/playbackCoords";
export { samplePolylineAt, travelMapPolyline } from "../sprites/corridorPath";
export {
  LOCATION_LABEL_ANCHORS,
  NAVIGATION_BOUNDARIES,
  clampMapPointToLocation,
  isMapPointInsideAnyLocation,
  isMapPointInsideLocation,
  isMapPointNearAnyPortal,
} from "../sprites/navigationBoundary";
export {
  buildHackerQuickActions,
  hackerQuickActionToToolRequest,
  runHackerQuickAction,
} from "../ui/hackerQuickActions";
export type { HackerQuickAction, HackerQuickActionId } from "../ui/hackerQuickActions";
export {
  DEFAULT_PLAY_CAMERA,
  PLAY_CAMERA_LIMITS,
  mapToCanvasAligned,
  canvasToMapAligned,
  canvasClientToBuffer,
  bufferToCanvasClient,
  getMapCanvasTransform,
  cameraViewportForCanvas,
  minimapRectForCanvas,
  mapCameraFromMinimapPoint,
  cameraVisualScaleForCanvas,
} from "../sprites/canvasLayout";
export type { MapCamera, MapViewport } from "../sprites/canvasLayout";
export { GALLERY_MAP_SIZE, entityMapPosition } from "../sprites/mapLayout";
export {
  npcMapCoord,
  agentMapCoord,
  objectMapCoord,
  objectPickCoord,
  playerMapCoord,
  locationMapCoord,
} from "../ui/mapCoords";
export {
  isObjectBakedInMap,
  isObjectAlwaysVisible,
  objectPickOffset,
  objectDrawOffset,
  ANCHOR_IS_PICK_OBJECT,
  objectSpriteMaxHeight,
  shouldDrawObjectSprite,
  shouldShowMapLabel,
} from "../sprites/mapObjectPresentation";
export {
  pointInBalconyRailStrip,
  hitRadiusCanvasPx,
  hitRadiusMapPx,
  pickDistanceMap,
  pickHitZone,
} from "../ui/mapHitTest";
export { pickHackerIntel, collectHackerIntel } from "../hacker/hackerIntel";
export {
  MISSION_BRIEF_LINES,
  MISSION_OPS_LINE,
  MISSION_TARGET_NAME,
} from "../mission/missionFrame";
export { openingRadioLines } from "../hacker/hackerIntro";
export type { OpeningRadioLine } from "../hacker/hackerIntro";
export {
  fieldAgentRepliesForToolResults,
  fieldAgentReplyForRejectedStep,
  fieldAgentRepliesForValidation,
} from "../hacker/fieldAgentReply";
export type { FieldAgentReply } from "../hacker/fieldAgentReply";
export { runTurn } from "../play/runTurn";
export { buildOperationSet, buildFrontierOperationSet } from "../operation/buildOperationSet";
export { executeOperationSet } from "../operation/executeOperationSet";
export type { OperationSet, OperationAction } from "../operation/operationTypes";
export {
  operationSetSummaryLine,
  operationConflictNextLines,
} from "../ui/operationSetSummary";
export { planDeferredNextLines } from "../ui/planDeferredHints";
export { selectionUsedForCompile } from "../director/planStub";
export { mapMoodFromWorld, mapLightingFromWorld, MAP_MOOD_OVERLAY } from "../ui/mapMood";
export type { MapMood } from "../ui/mapMood";
export type { IntentOutcome, IntentOutcomeStatus, IntentOutcomeCore } from "../intent/intentOutcome";
export { recognizeIntentOutcome, NEAREST_POISON_TOOLS } from "../intent/recognizeIntentOutcome";
export type {
  PresentationCue,
  PresentationCueTone,
  ActivePresentationCue,
} from "../presentation/presentationCue";
export { PRESENTATION_CUE_TTL_MS } from "../presentation/presentationCue";
export { cuesForToolResult } from "../presentation/cueForToolResult";
export {
  cuesForIntentOutcome,
  commandFeedLinesForIntentOutcome,
  mergePresentationCues,
} from "../presentation/cueForIntentOutcome";
export type { IntentFeedLine } from "../presentation/cueForIntentOutcome";

export {
  classifyTerminalState,
  convergenceCheckpoints,
  worldToScene,
  showcaseRoutes,
};
