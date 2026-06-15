window.CONFIG = {
  API_BASE_URL: "http://127.0.0.1:5000/api",
};

window.AUTH_API = {
  async register(name, email, password, role) {
    const res = await fetch(`${CONFIG.API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Registration failed");
    }

    return data;
  },

  async login(email, password) {
    const res = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Login failed");
    }

    return data;
  },

  async logout() {
    const res = await fetch(`${CONFIG.API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    return await res.json();
  },

  async getCurrentUser() {
    const res = await fetch(`${CONFIG.API_BASE_URL}/auth/me`, {
      credentials: "include",
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.user || null;
  },
};

window.API = {
  getHealthUrl() {
    const base =
      (window.CONFIG && window.CONFIG.API_BASE_URL) ||
      "http://127.0.0.1:5000/api";
    return `${base.replace(/\/api\/?$/, "")}/health`;
  },

  async checkHealth() {
    const host =
      window.location && window.location.hostname
        ? window.location.hostname
        : "127.0.0.1";
    const protocol =
      window.location && window.location.protocol
        ? window.location.protocol
        : "http:";

    const candidates = [
      this.getHealthUrl(),
      `${protocol}//${host}:5000/health`,
      `http://${host}:5000/health`,
      "http://127.0.0.1:5000/health",
      "http://localhost:5000/health",
    ].filter((url, idx, arr) => arr.indexOf(url) === idx);

    let lastError = null;

    for (const url of candidates) {
      try {
        const res = await fetch(url, {
          method: "GET",
          cache: "no-store",
          credentials: "omit",
        });

        if (!res.ok) {
          lastError = `HTTP ${res.status} from ${url}`;
          continue;
        }

        const data = await res.json().catch(() => null);
        if (data && data.status === "ok") {
          return { ok: true, data, url };
        }

        lastError = `Invalid health payload from ${url}`;
      } catch (error) {
        lastError = error?.message || `Health check failed for ${url}`;
      }
    }

    return { ok: false, error: lastError };
  },
};

window.NER_API = {
  async analyze(text) {
    const res = await fetch(`${CONFIG.API_BASE_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      credentials: "include",
    });

    const data = await res.json();
    console.log("ANALYZE RESPONSE:", data);

    if (!res.ok) {
      throw new Error(data.message || "Failed to analyze text");
    }

    return data;
  },
};

window.HISTORY_API = {
  async getHistory() {
    const res = await fetch(`${CONFIG.API_BASE_URL}/history`, {
      credentials: "include",
    });

    if (!res.ok) {
      return { analyses: [] };
    }

    return await res.json();
  },

  async saveAnalysis(inputText, processedText, entities, tokens) {
    const res = await fetch(`${CONFIG.API_BASE_URL}/history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input_text: inputText,
        processed_text: processedText,
        entities,
        tokens,
      }),
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to save analysis");
    }

    return data;
  },

  async deleteAnalysis(analysisId) {
    const res = await fetch(`${CONFIG.API_BASE_URL}/history/${analysisId}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to delete analysis");
    }

    return data;
  },

  async clearHistory() {
    const res = await fetch(`${CONFIG.API_BASE_URL}/history/clear`, {
      method: "POST",
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to clear history");
    }

    return data;
  },
};
