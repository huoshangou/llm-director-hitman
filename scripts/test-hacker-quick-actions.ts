import assert from "node:assert/strict";
import {
  buildHackerQuickActions,
  hackerQuickActionToToolRequest,
} from "../lib/ui/hackerQuickActions";
import { executeToolChain } from "../lib/tools/executePlan";
import { cloneWorld } from "../lib/world/initialWorld";

const initial = cloneWorld();
const initialActions = buildHackerQuickActions(initial);
const fakeMessage = initialActions.find((a) => a.id === "send_fake_message");
assert.ok(fakeMessage?.enabled, "fake message should be available from Hacker panel");
assert.equal(hackerQuickActionToToolRequest("send_fake_message", initial)?.toolId, "spoof_message");

const cameraBefore = initialActions.find((a) => a.id === "disable_camera");
assert.equal(cameraBefore?.enabled, false, "camera quick action should be disabled before power disruption");
assert.ok(cameraBefore?.reason?.includes("配电"), "disabled camera action should explain power prerequisite");

const powerWorld = executeToolChain(
  initial,
  [
    {
      toolId: "disable_power_panel",
      actor: "runner",
      targets: ["power_panel"],
      intent: "Cut power",
    },
  ],
  "step",
  { tickPlayIdle: true },
).world;

const cameraAfter = buildHackerQuickActions(powerWorld).find((a) => a.id === "disable_camera");
assert.ok(cameraAfter?.enabled, "camera quick action should unlock after backup power");
assert.equal(hackerQuickActionToToolRequest("disable_camera", powerWorld)?.toolId, "suppress_camera_record");

console.log("test-hacker-quick-actions: ok");
