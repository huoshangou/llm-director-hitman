const logEl = document.getElementById("log");
const actionLogWrap = document.getElementById("action-log");
let logCount = 0;

function postServerLog(text, type = "world") {
  try {
    void fetch("/api/play-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, type, ts: Date.now() }),
      keepalive: true,
    });
  } catch {
    /* ignore */
  }
}

window.postServerLog = postServerLog;

function shellLog(text, type = "world") {
  if (!logEl) return;
  const e = document.createElement("div");
  e.className = "log-entry";
  const n = new Date();
  const ts = `${String(n.getMinutes()).padStart(2, "0")}:${String(n.getSeconds()).padStart(2, "0")}`;
  e.innerHTML = `<span class="log-t">${ts}</span><span class="log-${type}">${text}</span>`;
  logEl.appendChild(e);
  logEl.scrollTop = logEl.scrollHeight;
  if (actionLogWrap) actionLogWrap.scrollTop = actionLogWrap.scrollHeight;
  postServerLog(text, type);
  if (++logCount > 300) {
    logEl.removeChild(logEl.firstChild);
    logCount--;
  }
}
