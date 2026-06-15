document.addEventListener("DOMContentLoaded", () => {
  const elements = {
    input: document.getElementById("ner-input"),
    charCount: document.getElementById("char-count"),
    analyzeButton: document.getElementById("analyze-btn"),
    clearButton: document.getElementById("clear-btn"),
    exportButton: document.getElementById("export-json-btn"),
    outputArea: document.getElementById("output-area"),
    processedText: document.getElementById("processed-text"),
    entityList: document.getElementById("entity-list"),
    tokenTable: document.getElementById("token-table-body"),
    historyList: document.getElementById("history-list"),
    backendStatus: document.getElementById("analyzer-backend-status"),
    userLabel: document.getElementById("analyzer-user-label"),
    steps: ["step-1", "step-2", "step-3"],
  };

  const state = {
    latestResult: null,
  };

  bindEvents();
  refreshUser();
  refreshHistory();
  updateBackendStatus();
  document.addEventListener("cognitag:user-changed", updateBackendStatus);
  document.addEventListener("cognitag:backend-online", () => {
    if (!elements.backendStatus) return;
    elements.backendStatus.innerHTML =
      '<span class="status-dot status-dot-online"></span><span>Flask backend online</span>';
  });
  updateCharCount();

  function bindEvents() {
    elements.input?.addEventListener("input", updateCharCount);

    elements.analyzeButton?.addEventListener("click", async () => {
      const text = elements.input.value.trim();

      // 1. Check if empty
      if (!text) {
        showToast("Please enter text before running extraction.", "warning");
        return;
      }

      // 2. Check if too short
      if (text.length < 3) {
        showToast(
          "Text is too short. Please enter a valid sentence.",
          "warning",
        );
        return;
      }

      // 3. Check if it contains actual alphabetical characters (Roman Urdu / English)
      // If it's only numbers or punctuation (e.g. "123 456 !!!"), reject it
      if (!/[a-zA-Z]/.test(text)) {
        showToast(
          "Invalid text. Please enter words containing alphabets.",
          "warning",
        );
        return;
      }

      setLoading(true);
      resetSteps();

      try {
        await runStep("step-1", 220);
        await runStep("step-2", 220);
        await runStep("step-3", 220);

        const data = await NER_API.analyze(text);
        state.latestResult = {
          inputText: text,
          processedText: data.processed_text || text,
          entities: data.entities || [],
          tokens: data.tokens || [],
          meta: data.model || {},
        };

        renderAnalysis(state.latestResult);

try {
  await AppStorage.saveAnalysis(
    state.latestResult.inputText,
    state.latestResult.processedText,
    state.latestResult.entities,
    state.latestResult.tokens,
  );

  refreshHistory();
} catch (err) {
  console.warn("History save failed:", err);
}

showToast("Analysis completed.", "success");
      } catch (error) {
        console.error(error);
        showToast(error.message || "Analysis failed.", "error");
      } finally {
        setLoading(false);
      }
    });

    elements.clearButton?.addEventListener("click", () => {
      elements.input.value = "";
      state.latestResult = null;
      updateCharCount();
      clearRenderedState();
    });

    elements.exportButton?.addEventListener("click", () => {
      if (!state.latestResult) {
        showToast(
          "Run an analysis first, then export the JSON result.",
          "info",
        );
        return;
      }

      const blob = new Blob([JSON.stringify(state.latestResult, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cognitag-analysis-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    });

    document.querySelectorAll("[data-sample]").forEach((button) => {
      button.addEventListener("click", () => {
        elements.input.value = button.dataset.sample;
        updateCharCount();
        elements.input.focus();
      });
    });

    elements.historyList?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-history-id]");
      if (!button) return;
      const item = AppStorage.getHistory().find(
        (entry) => entry.id === button.dataset.historyId,
      );
      if (!item) return;

      elements.input.value = item.input_text;

      state.latestResult = {
        inputText: item.input_text,
        processedText: item.processed_text,
        entities: item.entities || [],
        tokens: item.tokens || [],
        meta: {},
      };
      renderAnalysis(state.latestResult);
      showToast("Loaded a saved analysis from history.", "info");
    });

    document
      .getElementById("clear-analyzer-history")
      ?.addEventListener("click", () => {
        AppStorage.clearHistory();
        refreshHistory();
        showToast("History cleared for the current session.", "info");
      });

    document.addEventListener("cognitag:user-changed", () => {
      refreshUser();
      refreshHistory();
    });
  }

  function updateCharCount() {
    const length = elements.input?.value.length || 0;
    if (elements.charCount) {
      elements.charCount.textContent = `${length} / 1000 characters`;
    }
  }

  function setLoading(isLoading) {
    if (!elements.analyzeButton) return;
    elements.analyzeButton.disabled = isLoading;
    elements.analyzeButton.innerHTML = isLoading
      ? '<i class="fa-solid fa-spinner fa-spin"></i> Running model'
      : '<i class="fa-solid fa-sparkles"></i> Run extraction';
  }

  async function runStep(id, delay) {
    return new Promise((resolve) => {
      setTimeout(() => {
        document.getElementById(id)?.classList.add("active");
        resolve();
      }, delay);
    });
  }

  function resetSteps() {
    elements.steps.forEach((id) =>
      document.getElementById(id)?.classList.remove("active"),
    );
  }

  function clearRenderedState() {
    resetSteps();
    if (elements.outputArea) {
      elements.outputArea.innerHTML =
        '<div class="empty-state"><i class="fa-regular fa-lightbulb"></i><p>Run the model to see highlighted entities, confidence scores, and token predictions.</p></div>';
    }
    if (elements.processedText) {
      elements.processedText.textContent =
        "Processed text will appear here after analysis.";
    }
    if (elements.entityList) {
      elements.entityList.innerHTML =
        '<div class="empty-state small"><p>No entities yet.</p></div>';
    }
    if (elements.tokenTable) {
      elements.tokenTable.innerHTML =
        '<tr><td colspan="4" class="table-empty">No token-level results yet.</td></tr>';
    }
  }

  function renderAnalysis(result) {
    if (elements.processedText) {
      elements.processedText.textContent = result.processedText || "";
    }

    renderHighlightedText(result.processedText, result.entities || []);
    renderEntities(result.entities || []);
    renderTokens(result.tokens || []);
  }

  function renderHighlightedText(text, entities) {
    if (!elements.outputArea) return;

    if (!entities.length) {
      elements.outputArea.innerHTML =
        '<div class="empty-state small"><p>No named entities detected in this text.</p></div>';
      return;
    }

    const fragment = document.createDocumentFragment();
    const sorted = [...entities].sort((a, b) => a.start - b.start);
    let cursor = 0;

    sorted.forEach((entity) => {
      const start = Math.max(0, entity.start);
      const end = Math.min(text.length, entity.end);
      if (start > cursor) {
        fragment.appendChild(
          document.createTextNode(text.slice(cursor, start)),
        );
      }

      const chip = document.createElement("span");
      chip.className = `entity-highlight ${entity.entity_group.toLowerCase()}`;
      chip.textContent = text.slice(start, end);

      const label = document.createElement("small");
      label.textContent = `${entity.entity_group} • ${(entity.score * 100).toFixed(1)}%`;
      chip.appendChild(label);
      fragment.appendChild(chip);
      cursor = end;
    });

    if (cursor < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(cursor)));
    }

    elements.outputArea.innerHTML = "";
    elements.outputArea.appendChild(fragment);
  }

  function renderEntities(entities) {
    if (!elements.entityList) return;

    if (!entities.length) {
      elements.entityList.innerHTML =
        '<div class="empty-state small"><p>No entity cards to display.</p></div>';
      return;
    }

    elements.entityList.innerHTML = entities
      .map(
        (entity) => `
          <article class="entity-card ${entity.entity_group.toLowerCase()}">
            <div>
              <div class="entity-name">${escapeHtml(entity.word)}</div>
              <div class="entity-meta">${entity.entity_group} · ${entity.start}-${entity.end}</div>
            </div>
            <div class="entity-score">${(entity.score * 100).toFixed(1)}%</div>
          </article>
        `,
      )
      .join("");
  }

  function renderTokens(tokens) {
    if (!elements.tokenTable) return;

    if (!tokens.length) {
      elements.tokenTable.innerHTML =
        '<tr><td colspan="4" class="table-empty">No token-level results yet.</td></tr>';
      return;
    }

    elements.tokenTable.innerHTML = tokens
      .map(
        (token) => `
          <tr>
            <td>${escapeHtml(token.word)}</td>
            <td>${escapeHtml(token.entity)}</td>
            <td>${token.start}-${token.end}</td>
            <td>${(token.score * 100).toFixed(1)}%</td>
          </tr>
        `,
      )
      .join("");
  }

  async function refreshUser() {
    const user = await AppStorage.getUser();

    if (elements.userLabel) {
      elements.userLabel.textContent = user
        ? `${user.name} · ${user.role}`
        : "Guest mode · results saved only in this browser";
    }
  }
  async function refreshHistory() {
    if (!elements.historyList) return;

    const history = await AppStorage.getHistory();

    if (!history || !history.length) {
      elements.historyList.innerHTML =
        '<div class="empty-state small"><p>No saved runs yet. Your last analyses will appear here.</p></div>';
      return;
    }

    elements.historyList.innerHTML = history
      .slice(0, 8)
      .map(
        (item) => `
        <button type="button" class="history-card" data-history-id="${item.id}">
          <div class="history-card-head">
            <span class="history-date">
              ${new Date(item.created_at).toLocaleString()}
            </span>
            <span class="mini-badge">
              ${(item.entities || []).length} entities
            </span>
          </div>
          <div class="history-text">
            ${escapeHtml(item.input_text)}
          </div>
        </button>
      `,
      )
      .join("");
  }
  async function updateBackendStatus() {
    if (!elements.backendStatus) return;

   try {
  const status = await API.checkHealth();

  console.log("Health Response:", status);

  if (status && status.ok === true) {
    elements.backendStatus.innerHTML =
      '<span class="status-dot status-dot-online"></span><span>Backend Reachable | Health Status: Online</span>';

    elements.backendStatus.title = "Backend reachable";
  } else {
    elements.backendStatus.innerHTML =
      '<span class="status-dot status-dot-offline"></span><span>Backend Not Reachable | Health Status: Offline</span>';

    elements.backendStatus.title = status?.error || "Health endpoint failed";

    console.warn("[Health] Analyzer status offline:", status);
  }
} catch (error) {
  elements.backendStatus.innerHTML =
    '<span class="status-dot status-dot-offline"></span><span>Backend Not Reachable | Health Status: Offline</span>';

  elements.backendStatus.title = error?.message || "Health check failed";

  console.warn("[Health] Analyzer status check failed:", error);
}
  }

  clearRenderedState();
});

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
