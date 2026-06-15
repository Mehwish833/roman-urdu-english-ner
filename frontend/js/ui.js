/**
 * ui.js - DOM Manipulation, Events, and Result Rendering
 */

// --- DOM Elements ---
const navbar = document.getElementById("navbar");
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const nerInput = document.getElementById("ner-input");
const charCount = document.getElementById("char-count");
const analyzeBtn = document.getElementById("analyze-btn");
const testConnectionBtn = document.getElementById("test-connection");
const loadingDiv = document.getElementById("loading");
const resultsContainer = document.getElementById("results-container");
const outputDiv = document.getElementById("output");
const MAX_CHARS = 500;

// ==============================
// Navbar Scroll Effect
// ==============================
window.addEventListener("scroll", () => {
  if (window.scrollY > 50) {
    navbar.classList.add("scrolled");
  } else {
    navbar.classList.remove("scrolled");
  }
});

// ==============================
// Backend Status Check
// ==============================
async function updateStatus() {
  statusDot.className = "dot";
  statusText.textContent = "Checking...";
  const health = await API.checkHealth();
  const isOnline = !!(health && health.ok);
  if (isOnline) {
    statusDot.classList.add("dot-online");
    statusText.textContent = "Backend Online";
  } else {
    statusDot.classList.add("dot-offline");
    statusText.textContent = "Backend Offline";
    console.warn("[Health] UI status offline:", health && health.error);
  }
}

testConnectionBtn.addEventListener("click", async () => {
  testConnectionBtn.disabled = true;
  testConnectionBtn.textContent = "Checking...";
  await updateStatus();
  testConnectionBtn.disabled = false;
  testConnectionBtn.textContent = "Test Backend";

  const isOnline = statusText.textContent === "Backend Online";
  showToast(
    isOnline
      ? "✅ Backend connected successfully!"
      : `❌ Cannot reach backend at ${CONFIG.API_BASE_URL}. Is it running?`,
    isOnline ? "success" : "error",
  );
});

// Run health check on page load
updateStatus();

// ==============================
// Character Counter
// ==============================
nerInput.addEventListener("input", () => {
  const len = nerInput.value.length;
  charCount.textContent = `${len} / ${MAX_CHARS} characters`;
  if (len > MAX_CHARS) {
    nerInput.value = nerInput.value.substring(0, MAX_CHARS);
    charCount.style.color = "#f87171";
  } else {
    charCount.style.color = "var(--text-muted)";
  }
});

// ==============================
// NER Analysis Handler
// ==============================
analyzeBtn.addEventListener("click", async () => {
  const text = nerInput.value.trim();
  if (!text) {
    showToast("⚠️ Please enter some text to analyze.", "warning");
    return;
  }

  // Show loading state
  analyzeBtn.disabled = true;
  analyzeBtn.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing...';
  loadingDiv.style.display = "block";
  resultsContainer.style.display = "none";

  try {
    const data = await API.analyze(text);
    renderResults(text, data);
  } catch (error) {
    showToast(`❌ ${error.message}`, "error");
    console.error("[NER] Analysis failed:", error);
    // On connection error, offer simulation mode
    if (error.message.includes("Connection failed")) {
      if (
        confirm(
          "Backend is not reachable. Would you like to run a simulation to preview the UI?",
        )
      ) {
        CONFIG.SIMULATE = true;
        const data = await API.analyze(text);
        renderResults(text, data);
      }
    }
  } finally {
    loadingDiv.style.display = "none";
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML =
      '<i class="fa-solid fa-wand-magic-sparkles" style="margin-right:8px;"></i> Analyze Text';
  }
});

// ==============================
// Result Rendering
// ==============================
function renderResults(originalText, data) {
  resultsContainer.style.display = "block";
  outputDiv.innerHTML = "";

  const entities = data.entities || [];

  if (entities.length === 0) {
    outputDiv.innerHTML =
      '<p style="color: var(--text-muted);">No named entities found in the provided text.</p>';
    return;
  }

  // Build a map of word -> entity type
  const entityMap = {};
  entities.forEach((e) => {
    const cleanTag = e.entity.replace(/^[BI]-/, ""); // Remove B-/I- prefix
    entityMap[e.word] = cleanTag.toLowerCase();
  });

  // Highlight words
  const words = originalText.split(/(\s+)/);
  const fragment = document.createDocumentFragment();

  words.forEach((word) => {
    const trimmed = word.trim();
    if (entityMap[trimmed]) {
      const span = document.createElement("span");
      span.className = `entity ent-${entityMap[trimmed]}`;
      span.dataset.type = entityMap[trimmed].toUpperCase();
      span.textContent = trimmed;
      fragment.appendChild(span);
    } else {
      fragment.appendChild(document.createTextNode(word));
    }
  });

  outputDiv.appendChild(fragment);

  // Animate results
  outputDiv.style.opacity = "0";
  requestAnimationFrame(() => {
    outputDiv.style.transition = "opacity 0.4s ease";
    outputDiv.style.opacity = "1";
  });
}

// ==============================
// Toast Notification System
// ==============================
function showToast(message, type = "info") {
  const existingToast = document.querySelector(".toast");
  if (existingToast) existingToast.remove();

  const colors = {
    success: "#4ade80",
    error: "#f87171",
    warning: "#fbbf24",
    info: "#38bdf8",
  };

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "2rem",
    right: "2rem",
    background: "rgba(15, 23, 42, 0.95)",
    border: `1px solid ${colors[type] || colors.info}`,
    color: colors[type] || colors.info,
    padding: "1rem 1.5rem",
    borderRadius: "12px",
    zIndex: "9999",
    fontSize: "0.9rem",
    fontWeight: "600",
    backdropFilter: "blur(10px)",
    boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
    animation: "slideIn 0.3s ease",
    maxWidth: "400px",
  });

  const style = document.createElement("style");
  style.textContent = `@keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`;
  document.head.appendChild(style);
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "opacity 0.4s";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}
