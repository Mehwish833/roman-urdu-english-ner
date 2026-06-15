const AppStorage = (() => {
  let cachedUser = null;
  let cachedHistory = [];

  async function fetchUser() {
    try {
      cachedUser = await AUTH_API.getCurrentUser();
      return cachedUser;
    } catch (error) {
      console.error("Failed to fetch user:", error);
      cachedUser = null;
      return null;
    }
  }

  async function fetchHistory() {
    try {
      if (!cachedUser) return [];
      const data = await HISTORY_API.getHistory();
      cachedHistory = data.analyses || [];
      return cachedHistory;
    } catch (error) {
      console.error("Failed to fetch history:", error);
      return [];
    }
  }

  return {
    async getUser() {
      if (!cachedUser) {
        await fetchUser();
      }
      return cachedUser;
    },

    async setUser(user) {
      cachedUser = user;
    },

    async login(email, password) {
      const res = await AUTH_API.login(email, password);
      cachedUser = res.user;
      return res;
    },

    async logout() {
      await AUTH_API.logout();
      cachedUser = null;
      cachedHistory = [];
    },

    async getHistory() {
      if (!cachedUser) {
        await fetchUser();
      }
      if (!cachedUser) return [];
      return await fetchHistory();
    },

    async saveAnalysis(inputText, processedText, entities, tokens) {
      const res = await HISTORY_API.saveAnalysis(
        inputText,
        processedText,
        entities,
        tokens,
      );
      cachedHistory.unshift(res.analysis);
      return res;
    },

    async clearHistory() {
      await HISTORY_API.clearHistory();
      cachedHistory = [];
    },

    async getStats() {
      const history = await this.getHistory();
      let totalEntities = 0;
      const entityCounts = { PER: 0, LOC: 0, ORG: 0 };

      history.forEach((analysis) => {
        const entities = analysis.entities || [];
        totalEntities += entities.length;
        entities.forEach((entity) => {
          const group = entity.entity_group || "O";
          if (group in entityCounts) {
            entityCounts[group]++;
          }
        });
      });

      return {
        total_analyses: history.length,
        total_entities: totalEntities,
        entity_distribution: entityCounts,
      };
    },
  };
})();
