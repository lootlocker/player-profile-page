function extractMessage(payload, fallback) {
  if (!payload) {
    return fallback;
  }

  if (typeof payload.message === "string" && payload.message) {
    return payload.message;
  }

  if (typeof payload.error === "string" && payload.error) {
    return payload.error;
  }

  if (Array.isArray(payload.errors) && payload.errors.length) {
    return payload.errors.join(", ");
  }

  return fallback;
}

export function createApiClient(config, getSessionToken) {
  async function apiRequest(path, options = {}) {
    const method = options.method || "GET";
    const tokenRequired = options.tokenRequired !== false;

    const headers = {
      "Content-Type": "application/json",
      ...(options.extraHeaders || {}),
    };

    if (tokenRequired) {
      headers["x-session-token"] = getSessionToken() || "";
    }

    const response = await fetch(`${config.apiBase}${path}`, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const contentType = response.headers.get("content-type") || "";
    let payload = null;

    if (contentType.includes("application/json")) {
      payload = await response.json();
    } else {
      payload = { message: await response.text() };
    }

    if (!response.ok) {
      const error = new Error(
        extractMessage(payload, `Request failed (${response.status})`),
      );
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  return {
    signUp(email, password) {
      return apiRequest("/white-label-login/sign-up", {
        method: "POST",
        tokenRequired: false,
        extraHeaders: {
          "domain-key": config.domainKey,
          "is-development": String(config.isDevelopment),
        },
        body: { email, password },
      });
    },

    signIn(email, password, remember) {
      return apiRequest("/white-label-login/login", {
        method: "POST",
        tokenRequired: false,
        extraHeaders: {
          "domain-key": config.domainKey,
          "is-development": String(config.isDevelopment),
        },
        body: { email, password, remember },
      });
    },

    requestPasswordReset(email) {
      return apiRequest("/white-label-login/request-reset-password", {
        method: "POST",
        tokenRequired: false,
        extraHeaders: {
          "domain-key": config.domainKey,
          "is-development": String(config.isDevelopment),
        },
        body: { email },
      });
    },

    startWhiteLabelGameSession(email, whiteLabelToken) {
      return apiRequest("/game/v2/session/white-label", {
        method: "POST",
        tokenRequired: false,
        body: {
          game_key: config.gameKey,
          email,
          token: whiteLabelToken,
          game_version: config.gameVersion,
          optionals: {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          },
        },
      });
    },

    getGameInfo() {
      return apiRequest("/game/info/v1", {
        method: "POST",
        body: {
          api_key: config.gameKey,
        },
      });
    },

    getExternalAuthenticationConfig(titleId, environmentId) {
      const query = new URLSearchParams({
        title_id: String(titleId || ""),
        environment_id: String(environmentId || ""),
      });

      return apiRequest(
        `/client/v3/config/external-authentication?${query.toString()}`,
        {
          method: "GET",
          tokenRequired: false,
        },
      );
    },

    getInfoFromSession() {
      return apiRequest("/game/player/hazy-hammock/v1/info");
    },

    listConnectedAccounts() {
      return apiRequest("/game/v1/connected-accounts");
    },

    createRemoteLease() {
      return apiRequest("/client/v3/remote/lease", {
        method: "POST",
        tokenRequired: false,
        body: {
          client_id: config.gameKey,
        },
      });
    },

    attachProvider(code, nonce) {
      return apiRequest("/game/v1/connected-accounts/attach", {
        method: "PUT",
        body: { code, nonce },
      });
    },

    deleteProvider(provider) {
      return apiRequest(
        `/game/player/providers/${encodeURIComponent(provider)}`,
        {
          method: "DELETE",
        },
      );
    },

    listFriends() {
      return apiRequest("/game/player/friends?per_page=50&page=1");
    },

    listIncomingFriendRequests() {
      return apiRequest("/game/player/friends/incoming?per_page=50&page=1");
    },

    listOutgoingFriendRequests() {
      return apiRequest("/game/player/friends/outgoing?per_page=50&page=1");
    },

    lookupPlayerInfoByPublicUid(playerPublicUid) {
      return apiRequest("/game/player/hazy-hammock/v1/info", {
        method: "POST",
        body: {
          player_id: [],
          player_legacy_id: [],
          player_public_uid: [playerPublicUid],
        },
      });
    },

    sendFriendRequest(playerId) {
      return apiRequest(
        `/game/player/friends/${encodeURIComponent(playerId)}`,
        {
          method: "POST",
        },
      );
    },

    removeFriend(playerId) {
      return apiRequest(
        `/game/player/friends/${encodeURIComponent(playerId)}`,
        {
          method: "DELETE",
        },
      );
    },

    acceptFriendRequest(playerId) {
      return apiRequest(
        `/game/player/friends/${encodeURIComponent(playerId)}`,
        {
          method: "POST",
        },
      );
    },

    cancelFriendRequest(playerId) {
      return apiRequest(
        `/game/player/friends/outgoing/${encodeURIComponent(playerId)}/cancel`,
        {
          method: "POST",
        },
      );
    },

    listFollowers(playerPublicUid) {
      const query = new URLSearchParams({ per_page: "20" });
      return apiRequest(
        `/game/player/${encodeURIComponent(playerPublicUid)}/followers?${query.toString()}`,
      );
    },

    listFollowing(playerPublicUid) {
      const query = new URLSearchParams({ per_page: "20" });
      return apiRequest(
        `/game/player/${encodeURIComponent(playerPublicUid)}/following?${query.toString()}`,
      );
    },
  };
}
