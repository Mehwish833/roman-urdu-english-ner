document.addEventListener("DOMContentLoaded", () => {
  const isNested = window.location.pathname.includes("/pages/");
  const base = isNested ? "../" : "";
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  renderShell();
  bindNavigation();
  bindAuth();
  updateAuthUI();
  updateBackendStatus();
  setInterval(updateBackendStatus, 15000);

  document.addEventListener("cognitag:backend-online", () => {
    const statusNode = document.getElementById("global-backend-status");
    if (!statusNode) return;
    statusNode.innerHTML =
      '<span class="status-dot status-dot-online"></span><span>Backend online</span>';
  });

  function renderShell() {
    const headerRoot = document.getElementById("site-header");
    const footerRoot = document.getElementById("site-footer");

    if (headerRoot) {
      headerRoot.innerHTML = `
        <header class="site-header">
          <div class="container nav-shell">
            <a class="brand" href="${base}index.html">
              <div class="brand-mark"><i class="fa-solid fa-brain"></i></div>
              <div>
                <div class="brand-title">CogniTag</div>
                <div class="brand-subtitle">Code-mixed NER research platform</div>
              </div>
            </a>
            <button class="mobile-nav-toggle" id="mobile-nav-toggle" aria-label="Toggle navigation">
              <i class="fa-solid fa-bars"></i>
            </button>
            <nav class="nav-menu" id="nav-menu">
              <a href="${base}index.html" class="nav-link" data-page="index.html">Overview</a>
              <a href="${base}pages/architecture.html" class="nav-link" data-page="architecture.html">Architecture</a>
              <a href="${base}pages/dataset.html" class="nav-link" data-page="dataset.html">Dataset</a>
              <a href="${base}pages/dashboard.html" class="nav-link" data-page="dashboard.html">Dashboard</a>
              <a href="${base}pages/docs.html" class="nav-link" data-page="docs.html">Docs</a>
              <a href="${base}pages/contact.html" class="nav-link" data-page="contact.html">Contact</a>
            </nav>
            <div class="nav-actions">
              <div class="status-pill" id="global-backend-status">
                <span class="status-dot status-dot-offline"></span>
                <span>Backend checking</span>
              </div>
              <button type="button" class="btn btn-secondary" id="auth-trigger">Login</button>
              <a href="${base}pages/analyzer.html" class="btn btn-primary">Live Demo</a>
            </div>
          </div>
        </header>
      `;
    }

    if (footerRoot) {
      footerRoot.innerHTML = `
        <footer class="site-footer">
          <div class="container footer-grid">
            <div>
              <div class="footer-brand">CogniTag</div>
              <p class="footer-copy">Research-grade named entity recognition for Roman Urdu and English code-mixed text, powered by XLM-RoBERTa and Flask inference.</p>
            </div>
            <div>
              <div class="footer-heading">Explore</div>
              <a href="${base}index.html">Overview</a>
              <a href="${base}pages/analyzer.html">Live Demo</a>
              <a href="${base}pages/dashboard.html">Dashboard</a>
              <a href="${base}pages/docs.html">Documentation</a>
            </div>
            <div>
              <div class="footer-heading">Research</div>
              <a href="${base}pages/architecture.html">Architecture</a>
              <a href="${base}pages/dataset.html">Dataset</a>
              <a href="${base}pages/contact.html">Collaboration</a>
            </div>
            <div>
              <div class="footer-heading">System</div>
              <p class="footer-meta">API: <code>${CONFIG.API_BASE_URL}</code></p>
              <p class="footer-meta">Storage: browser login + result history</p>
              <p class="footer-meta">Ready to connect with database-backed auth/history endpoints later</p>
            </div>
          </div>
          <div class="container footer-bottom">
            <span>© 2026 CogniTag Research Interface</span>
            <span id="footer-user-status">Guest mode</span>
          </div>
        </footer>
      `;
    }

    if (!document.getElementById("auth-modal")) {
      document.body.insertAdjacentHTML(
        "beforeend",
        `
        <div class="modal-backdrop hidden" id="auth-modal">
          <div class="modal-card">
            <div class="modal-head">
              <div>
                <div class="eyebrow">Workspace access</div>
                <h3>Research user login</h3>
              </div>
              <button type="button" class="icon-button" id="auth-close" aria-label="Close">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form id="auth-form" class="form-stack">
              <label class="field-label" for="auth-name">Full name</label>
              <input class="form-control" id="auth-name" name="name" placeholder="e.g. Hafiza Sadia Bibi" required />
              <label class="field-label" for="auth-email">Email</label>
<input class="form-control" id="auth-email" name="email" type="email" placeholder="researcher@example.com" required />

<label class="field-label" for="auth-password">Password</label>
<input class="form-control" id="auth-password" name="password" type="password" placeholder="Enter your password" required />

<label class="field-label" for="auth-role">Role</label>
<input class="form-control" id="auth-role" name="role" placeholder="Research Student / Supervisor" />
              <div class="modal-actions">
    <button type="button" class="btn btn-primary" id="auth-login">
        Login
    </button>

    <button type="button" class="btn btn-secondary" id="auth-register">
        Register
    </button>

    <button type="button" class="btn btn-ghost" id="auth-logout">
        Logout
    </button>
</div>
            </form>
           <p class="muted small">
  Login is connected to MongoDB and Flask authentication. New users will be registered automatically, and authenticated users can save and manage their analysis history.
</p>
        </div>`,
      );
    }
  }

  function bindNavigation() {
    const navLinks = document.querySelectorAll(".nav-link[data-page]");
    navLinks.forEach((link) => {
      if (link.dataset.page === currentPage) {
        link.classList.add("active");
      }
    });

    const toggle = document.getElementById("mobile-nav-toggle");
    const menu = document.getElementById("nav-menu");
    if (toggle && menu) {
      toggle.addEventListener("click", () => {
        menu.classList.toggle("open");
      });
    }
  }

  function bindAuth() {
    const modal = document.getElementById("auth-modal");
    const trigger = document.getElementById("auth-trigger");
    const close = document.getElementById("auth-close");
    const form = document.getElementById("auth-form");
    const logoutButton = document.getElementById("auth-logout");
    const loginButton = document.getElementById("auth-login");
    const registerButton = document.getElementById("auth-register");

    if (
      !modal ||
      !trigger ||
      !close ||
      !form ||
      !logoutButton ||
      !loginButton ||
      !registerButton
    ) {
      return;
    }

    trigger.addEventListener("click", async () => {
      const user = await AppStorage.getUser();

      if (user) {
        document.getElementById("auth-name").value = user.name || "";
        document.getElementById("auth-email").value = user.email || "";
        document.getElementById("auth-role").value = user.role || "";
      }

      modal.classList.remove("hidden");
    });
    close.addEventListener("click", () => modal.classList.add("hidden"));
    modal.addEventListener("click", (event) => {
      if (event.target === modal) modal.classList.add("hidden");
    });

    loginButton.addEventListener("click", async () => {
      const email = document.getElementById("auth-email").value.trim();
      const password = document.getElementById("auth-password").value.trim();

      try {
        const response = await AUTH_API.login(email, password);

        await AppStorage.setUser(response.user);
        await updateAuthUI();
        await updateBackendStatus();

        modal.classList.add("hidden");

        window.showToast(`Welcome ${response.user.name}!`, "success");

        document.dispatchEvent(new CustomEvent("cognitag:user-changed"));
        document.dispatchEvent(new CustomEvent("cognitag:backend-online"));
      } catch (error) {
        window.showToast(error.message || "Invalid email or password", "error");
      }
    });

    registerButton.addEventListener("click", async () => {
      const name = document.getElementById("auth-name").value.trim();
      const email = document.getElementById("auth-email").value.trim();
      const password = document.getElementById("auth-password").value.trim();
      const role = document.getElementById("auth-role").value.trim();

      try {
        const response = await AUTH_API.register(
          name,
          email,
          password,
          role || "Research User",
        );

        await AppStorage.setUser(response.user);
        await updateAuthUI();
        await updateBackendStatus();

        modal.classList.add("hidden");

        window.showToast("Registration successful!", "success");

        document.dispatchEvent(new CustomEvent("cognitag:user-changed"));
        document.dispatchEvent(new CustomEvent("cognitag:backend-online"));
      } catch (error) {
        window.showToast(error.message || "Registration failed", "error");
      }
    });

    logoutButton.addEventListener("click", async () => {
      try {
        await AppStorage.logout();

        await updateAuthUI();
        await updateBackendStatus();

        modal.classList.add("hidden");

        window.showToast("Logged out successfully.", "success");

        document.dispatchEvent(new CustomEvent("cognitag:user-changed"));
      } catch (error) {
        console.error(error);

        window.showToast("Logout failed.", "error");
      }
    });
  }

  async function updateAuthUI() {
    const user = await AppStorage.getUser();
    const trigger = document.getElementById("auth-trigger");
    const footerStatus = document.getElementById("footer-user-status");

    if (trigger) {
      if (user) {
        trigger.textContent = user.name.split(" ")[0];
        trigger.classList.remove("btn-secondary");
        trigger.classList.add("btn-ghost");
      } else {
        trigger.textContent = "Login";
        trigger.classList.add("btn-secondary");
        trigger.classList.remove("btn-ghost");
      }
    }

    if (footerStatus) {
      footerStatus.textContent = user
        ? `Signed in as ${user.name}`
        : "Guest mode";
    }
  }

  async function updateBackendStatus() {
  const statusNodes = [
    document.getElementById("global-backend-status"),
    document.getElementById("analyzer-backend-status")
  ].filter(Boolean);

  if (!statusNodes.length) return;

  try {
    const status = await API.checkHealth();

    if (status.ok) {
      statusNodes.forEach((node) => {
        node.innerHTML =
          '<span class="status-dot status-dot-online"></span><span>Backend online</span>';
        node.title = "Backend reachable";
      });
    } else {
      statusNodes.forEach((node) => {
        node.innerHTML =
          '<span class="status-dot status-dot-offline"></span><span>Backend offline</span>';
        node.title = status.error || "Backend not reachable";
      });

      console.warn("[Health] Global status offline:", status.error);
    }
  } catch (error) {
    statusNodes.forEach((node) => {
      node.innerHTML =
        '<span class="status-dot status-dot-offline"></span><span>Backend offline</span>';
      node.title = error?.message || "Backend check failed";
    });

    console.warn("[Health] Global status check failed:", error);
  }
}
});

window.showToast = function showToast(message, type = "info") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const colors = {
    success: "#34d399",
    error: "#f87171",
    warning: "#fbbf24",
    info: "#38bdf8",
  };

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toast.style.borderColor = colors[type] || colors.info;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 250);
  }, 3200);
};
