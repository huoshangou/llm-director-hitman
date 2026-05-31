/** 玩家 BYOK：供应商下拉 + Key 存 localStorage（与主站共用 key） */
const LlmSettings = {
  storageKey: "hitman.llmSettings.v1",
  testedKey: "hitman.llmTestedOk",
  presets: [],
  settings: null,

  async init() {
    try {
      const res = await fetch("/api/llm-providers");
      const data = await res.json();
      this.presets = data.presets ?? [];
      this.storageKey = data.storageKey ?? this.storageKey;
    } catch {
      this.presets = [
        {
          id: "openrouter",
          label: "OpenRouter",
          hint: "聚合 DeepSeek 等",
          defaultModel: "deepseek/deepseek-chat",
          defaultBaseUrl: "https://openrouter.ai/api/v1",
        },
        {
          id: "deepseek",
          label: "DeepSeek 官方",
          hint: "api.deepseek.com",
          defaultModel: "deepseek-chat",
          defaultBaseUrl: "https://api.deepseek.com/v1",
        },
        {
          id: "openai",
          label: "OpenAI",
          hint: "api.openai.com",
          defaultModel: "gpt-4o-mini",
          defaultBaseUrl: "https://api.openai.com/v1",
        },
        {
          id: "custom",
          label: "OpenAI 兼容 · 自定义",
          hint: "自定义 Base URL",
          defaultModel: "",
          defaultBaseUrl: "",
        },
      ];
    }
    this.settings = this.load();
    this.bindUi();
    this.refreshStatus();
    this.applyFoldState();
  },

  applyFoldState() {
    const fold = document.getElementById("llm-fold");
    if (!fold) return;
    const has = (this.settings?.apiKey ?? "").length > 0;
    const tested = localStorage.getItem(this.testedKey) === "1";
    fold.open = !(has && tested);
  },

  markTestedOk() {
    localStorage.setItem(this.testedKey, "1");
    this.applyFoldState();
  },

  clearTestedFlag() {
    localStorage.removeItem(this.testedKey);
    const fold = document.getElementById("llm-fold");
    if (fold) fold.open = true;
  },

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return this.defaultSettings();
      return this.normalize(JSON.parse(raw));
    } catch {
      return this.defaultSettings();
    }
  },

  defaultSettings() {
    const p = this.presets[0] ?? {
      id: "openrouter",
      defaultModel: "deepseek/deepseek-chat",
      defaultBaseUrl: "https://openrouter.ai/api/v1",
    };
    return {
      providerId: p.id,
      apiKey: "",
      model: p.defaultModel,
      baseUrl: p.defaultBaseUrl,
    };
  },

  normalize(raw) {
    const id = this.presets.some((p) => p.id === raw.providerId) ? raw.providerId : "openrouter";
    const preset = this.presets.find((p) => p.id === id) ?? this.presets[0];
    return {
      providerId: id,
      apiKey: (raw.apiKey ?? "").trim(),
      model: (raw.model ?? preset?.defaultModel ?? "").trim(),
      baseUrl: (raw.baseUrl ?? preset?.defaultBaseUrl ?? "").trim().replace(/\/$/, ""),
    };
  },

  save() {
    const provider = document.getElementById("llm-provider");
    const model = document.getElementById("llm-model");
    const key = document.getElementById("llm-api-key");
    const base = document.getElementById("llm-base-url");
    this.settings = this.normalize({
      providerId: provider?.value,
      model: model?.value,
      apiKey: key?.value,
      baseUrl: base?.value,
    });
    localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
    this.refreshStatus();
    const flash = document.getElementById("llm-save-flash");
    if (flash) {
      flash.textContent = "已保存到本机";
      setTimeout(() => {
        flash.textContent = "";
      }, 2000);
    }
  },

  clear() {
    localStorage.removeItem(this.storageKey);
    this.clearTestedFlag();
    this.settings = this.defaultSettings();
    this.fillForm();
    this.refreshStatus();
  },

  presetById(id) {
    return this.presets.find((p) => p.id === id) ?? this.presets[0];
  },

  fillForm() {
    const s = this.settings ?? this.defaultSettings();
    const provider = document.getElementById("llm-provider");
    const model = document.getElementById("llm-model");
    const key = document.getElementById("llm-api-key");
    const base = document.getElementById("llm-base-url");
    const hint = document.getElementById("llm-provider-hint");
    const baseRow = document.getElementById("llm-base-row");
    if (provider) provider.value = s.providerId;
    const p = this.presetById(s.providerId);
    if (model) model.value = s.model || p?.defaultModel || "";
    if (key) key.value = s.apiKey || "";
    if (base) base.value = s.baseUrl || p?.defaultBaseUrl || "";
    if (hint) hint.textContent = p?.hint ?? "";
    if (baseRow) baseRow.style.display = s.providerId === "custom" ? "block" : "none";
  },

  onProviderChange() {
    const provider = document.getElementById("llm-provider");
    const p = this.presetById(provider?.value ?? "openrouter");
    const model = document.getElementById("llm-model");
    const base = document.getElementById("llm-base-url");
    if (model) model.value = p?.defaultModel ?? "";
    if (base) base.value = p?.defaultBaseUrl ?? "";
    const baseRow = document.getElementById("llm-base-row");
    if (baseRow) baseRow.style.display = p?.id === "custom" ? "block" : "none";
    const hint = document.getElementById("llm-provider-hint");
    if (hint) hint.textContent = p?.hint ?? "";
  },

  bindUi() {
    const provider = document.getElementById("llm-provider");
    if (!provider) return;
    provider.innerHTML = this.presets
      .map((p) => `<option value="${p.id}">${p.label}</option>`)
      .join("");
    this.fillForm();
    provider.addEventListener("change", () => this.onProviderChange());
    document.getElementById("llm-save")?.addEventListener("click", () => this.save());
    document.getElementById("llm-clear")?.addEventListener("click", () => this.clear());
    document.getElementById("llm-test")?.addEventListener("click", () => void this.testConnection());
  },

  async testConnection() {
    this.save();
    const resultEl = document.getElementById("llm-test-result");
    const btn = document.getElementById("llm-test");
    if (resultEl) {
      resultEl.textContent = "测试中…";
      resultEl.style.color = "#fcd34d";
    }
    if (btn) btn.disabled = true;
    try {
      const res = await fetch("/api/llm-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ llm: this.toApiPayload() }),
      });
      const data = await res.json();
      if (data.ok) {
        if (resultEl) {
          resultEl.textContent = `连通成功 · ${data.model}`;
          resultEl.style.color = "#86efac";
        }
        const flash = document.getElementById("llm-save-flash");
        if (flash) flash.textContent = "Key 可用";
        this.markTestedOk();
        shellLog(`AI 连通成功 · ${data.model}`, "director");
      } else {
        if (resultEl) {
          resultEl.textContent = data.error ?? "连接失败";
          resultEl.style.color = "#fca5a5";
        }
      }
    } catch (err) {
      if (resultEl) {
        resultEl.textContent = `请求失败: ${err.message}`;
        resultEl.style.color = "#fca5a5";
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  refreshStatus() {
    const el = document.getElementById("llm-status-badge");
    if (!el) return;
    const has = (this.settings?.apiKey ?? "").length > 0;
    el.textContent = has ? "AI 已接入" : "未配 Key · 规则 stub";
    el.style.background = has ? "#14532d" : "#334155";
    el.style.color = has ? "#bbf7d0" : "#94a3b8";
  },

  toApiPayload() {
    const s = this.settings ?? this.load();
    if (!s.apiKey) return null;
    return {
      providerId: s.providerId,
      apiKey: s.apiKey,
      model: s.model,
      baseUrl: s.providerId === "custom" ? s.baseUrl : undefined,
    };
  },
};
