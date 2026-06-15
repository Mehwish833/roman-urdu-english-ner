document.addEventListener("DOMContentLoaded", async () => {
  const userName = document.getElementById("dashboard-user-name");
  const analysesCount = document.getElementById("metric-analyses");
  const entityCount = document.getElementById("metric-entities");
  const tokenCount = document.getElementById("metric-tokens");
  const backendBadge = document.getElementById("dashboard-backend-status");
  const recentList = document.getElementById("recent-history-list");
  const distribution = document.getElementById("entity-distribution");
  const clearButton = document.getElementById("clear-history-btn");

  function render() {
    const user = AppStorage.getUser();
    const stats = AppStorage.getStats();

    if (userName) {
      userName.textContent = user ? user.name : "Guest researcher";
    }

    if (analysesCount) analysesCount.textContent = stats.analyses;
    if (entityCount) entityCount.textContent = stats.totalEntities;
    if (tokenCount) tokenCount.textContent = stats.totalTokens;

    if (recentList) {
      if (!stats.history.length) {
        recentList.innerHTML =
          '<div class="empty-state"><i class="fa-regular fa-clock"></i><p>No saved analyses yet. Run the live demo to populate your dashboard.</p></div>';
      } else {
        recentList.innerHTML = stats.history
          .slice(0, 6)
          .map(
            (item) => `
              <article class="history-card compact">
                <div class="history-card-head">
                  <span class="history-date">${new Date(item.createdAt).toLocaleString()}</span>
                  <span class="mini-badge">${(item.entities || []).length} entities</span>
                </div>
                <p class="history-text">${escapeHtml(item.inputText)}</p>
                <div class="history-tags">
                  ${
                    (item.entities || [])
                      .slice(0, 4)
                      .map(
                        (entity) =>
                          `<span class="tag tag-${entity.entity_group.toLowerCase()}">${entity.word}</span>`,
                      )
                      .join("") || '<span class="muted">No entities</span>'
                  }
                </div>
              </article>
            `,
          )
          .join("");
      }
    }

    if (distribution) {
      const total = Math.max(stats.totalEntities, 1);
      const rows = [
        ["PER", stats.entityCounts.PER, "per"],
        ["LOC", stats.entityCounts.LOC, "loc"],
        ["ORG", stats.entityCounts.ORG, "org"],
      ];

      distribution.innerHTML = rows
        .map(
          ([label, value, type]) => `
            <div class="distribution-row">
              <div class="distribution-head">
                <span>${label}</span>
                <span>${value}</span>
              </div>
              <div class="distribution-bar">
                <span class="distribution-fill ${type}" style="width:${(value / total) * 100}%"></span>
              </div>
            </div>
          `,
        )
        .join("");
    }
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      AppStorage.clearHistory();
      render();
      showToast(
        "Saved result history cleared for the current session.",
        "info",
      );
    });
  }

  document.addEventListener("cognitag:user-changed", render);

  if (backendBadge && typeof API !== "undefined") {
    const status = await API.checkHealth();
    if (status.ok) {
      backendBadge.innerHTML =
        '<span class="status-dot status-dot-online"></span><span>Flask API connected</span>';
      backendBadge.title = "Backend reachable";
    } else {
      backendBadge.innerHTML =
        '<span class="status-dot status-dot-offline"></span><span>Backend unavailable</span>';
      backendBadge.title = status.error || "Backend not reachable";
      console.warn("[Health] Dashboard status offline:", status.error);
    }
  }

  render();
});

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
