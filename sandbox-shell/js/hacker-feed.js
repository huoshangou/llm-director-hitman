/** Command Feed / TRANSCRIPT — 玩家主反馈通道（play-command-feed-v1） */
const hackerFeed = {
  seen: new Set(),
};

const COMMAND_FEED_MAX = 48;
const AGENT_LABEL = { face: "Face", runner: "Runner", hacker: "Hacker", system: "System" };

const INTRO_RADIO_KEY = "play_intro_radio_seen";

function getSessionFlag(key) {
  try {
    return window.sessionStorage?.getItem(key);
  } catch {
    return null;
  }
}

function setSessionFlag(key, value) {
  try {
    window.sessionStorage?.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function formatFeedLine(speaker, text) {
  return `${speaker} / ${text}`;
}

function postFeedToServer(speaker, text, tone) {
  const logType = tone === "debug" ? "debug" : "feed";
  if (typeof postServerLog === "function") {
    postServerLog(formatFeedLine(speaker, text), logType);
  }
}

function trimCommandFeed(el) {
  while (el.querySelectorAll(".feed-line").length > COMMAND_FEED_MAX) {
    el.querySelector(".feed-line")?.remove();
  }
}

/**
 * @param {{ speaker: string, text: string, tone?: string, persist?: boolean }} opts
 */
function pushCommandFeed({ speaker, text, tone = "system", persist = true }) {
  const body = String(text ?? "").trim();
  if (!body) return;

  const el = document.getElementById("hacker-feed");
  if (!el) return;
  const empty = el.querySelector(".hacker-empty");
  if (empty) empty.remove();

  const div = document.createElement("div");
  const speakerKey = String(speaker).toLowerCase().replace(/\s+/g, "-");
  div.className = `feed-line feed-tone-${tone} feed-speaker-${speakerKey}`;
  div.dataset.speaker = speaker;
  div.textContent = formatFeedLine(speaker, body);
  el.appendChild(div);
  trimCommandFeed(el);
  el.scrollTop = el.scrollHeight;

  if (persist) {
    postFeedToServer(speaker, body, tone);
  }
}

function renderHackerFeed() {
  const el = document.getElementById("hacker-feed");
  if (!el) return;
  const items = el.querySelectorAll(".feed-line");
  if (!items.length) {
    el.innerHTML =
      '<p class="hacker-empty">指令与现场广播会显示在此；点地图看下方骇入分析</p>';
  }
}

function pushHackerIntel(trigger, selectionKind, selectionId) {
  const w = shell.playerWorld ?? shell.session?.world;
  if (!w || typeof HitmanCore.pickHackerIntel !== "function") return;
  const sel =
    selectionKind && selectionId
      ? { kind: selectionKind, id: selectionId }
      : null;
  const line = HitmanCore.pickHackerIntel(w, trigger, hackerFeed.seen, sel);
  if (!line) return;
  hackerFeed.seen.add(line.id);
  pushCommandFeed({ speaker: "Hacker", text: line.text, tone: "world", persist: false });
}

function resetHackerFeed() {
  hackerFeed.seen = new Set();
  const el = document.getElementById("hacker-feed");
  if (!el) return;
  el.innerHTML = "";
  const w = shell.playerWorld ?? shell.session?.world;
  if (typeof HitmanCore.collectHackerIntel === "function" && w) {
    for (const line of HitmanCore.collectHackerIntel(w, "boot")) {
      hackerFeed.seen.add(line.id);
      pushCommandFeed({ speaker: "Hacker", text: line.text, tone: "world", persist: false });
    }
  }
  renderHackerFeed();
}

function pushOpeningRadio(options = {}) {
  if (typeof HitmanCore?.openingRadioLines !== "function") return;
  const oncePerSession = options.oncePerSession !== false;
  if (oncePerSession && getSessionFlag(INTRO_RADIO_KEY) === "1") return;

  const lines = HitmanCore.openingRadioLines();
  pushFieldAgentRadio(lines);

  if (oncePerSession) {
    setSessionFlag(INTRO_RADIO_KEY, "1");
  }
}

function pushFieldAgentRadio(lines) {
  if (!lines?.length) return;
  for (const line of lines) {
    const who = AGENT_LABEL[line.agent] ?? line.agent;
    pushCommandFeed({ speaker: who, text: line.text, tone: "agent" });
  }
}

function pushFieldAgentReplies(replies) {
  const lines = (replies ?? []).map((reply) => ({
    agent: reply.speaker,
    text: reply.text,
  }));
  pushFieldAgentRadio(lines);
}

function pushPlayerCommandTranscript(commandText) {
  pushCommandFeed({ speaker: "YOU", text: commandText, tone: "player" });
}

function pushOpsStatus(text) {
  pushCommandFeed({ speaker: "OPS", text, tone: "system", persist: false });
}

function pushNextHint(hint) {
  const raw = String(hint ?? "").trim();
  if (!raw) return;
  const body = raw.replace(/^NEXT\s*\/\s*/i, "").trim();
  pushCommandFeed({ speaker: "NEXT", text: body || raw, tone: "warning" });
}

function pushTurnEventsToCommandFeed(events) {
  if (!events?.length || typeof HitmanCore.commandFeedLinesFromTimeline !== "function") {
    return;
  }
  const lines = HitmanCore.commandFeedLinesFromTimeline(events);
  for (const line of lines) {
    pushCommandFeed({
      speaker: line.speaker,
      text: line.text,
      tone: line.speaker === "WORLD" ? "world" : "agent",
    });
  }
}

function pushIntentOutcomeToFeed(outcome) {
  if (!outcome || typeof HitmanCore.commandFeedLinesForIntentOutcome !== "function") return;
  const lines = HitmanCore.commandFeedLinesForIntentOutcome(outcome);
  for (const line of lines) {
    pushCommandFeed({
      speaker: line.speaker,
      text: line.text,
      tone: line.tone ?? "system",
    });
  }
}

window.pushIntentOutcomeToFeed = pushIntentOutcomeToFeed;
