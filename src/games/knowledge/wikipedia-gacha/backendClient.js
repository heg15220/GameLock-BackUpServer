const BACKEND_ROOT =
  import.meta.env.VITE_WIKIPEDIA_GACHA_BACKEND_URL ?? "http://127.0.0.1:8791";

async function request(path, options = {}) {
  const response = await fetch(`${BACKEND_ROOT}${path}`, {
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || `backend_${response.status}`);
    error.code = payload.error || `backend_${response.status}`;
    error.status = response.status;
    throw error;
  }
  return payload;
}

function authHeaders(browserToken) {
  return browserToken ? { "X-Browser-Token": browserToken } : {};
}

function normalizePreferredLanguage(preferredLanguage) {
  if (!preferredLanguage) {
    return {};
  }
  return {
    "X-Wikipedia-Language": String(preferredLanguage).toLowerCase().startsWith("es")
      ? "es"
      : "en",
  };
}

function buildHeaders(browserToken, preferredLanguage) {
  return {
    ...authHeaders(browserToken),
    ...normalizePreferredLanguage(preferredLanguage),
  };
}

export function bootstrapWikipediaGachaSession(payload = {}, preferredLanguage) {
  return request("/api/wikipedia-gacha/session/bootstrap", {
    method: "POST",
    headers: normalizePreferredLanguage(preferredLanguage ?? payload.preferredLanguage),
    body: JSON.stringify({
      ...payload,
      preferredLanguage: preferredLanguage ?? payload.preferredLanguage,
    }),
  });
}

export function fetchWikipediaGachaSession(browserToken, preferredLanguage) {
  return request("/api/wikipedia-gacha/session/me", {
    headers: buildHeaders(browserToken, preferredLanguage),
  });
}

export function fetchWikipediaGachaCollection(browserToken, params = {}, preferredLanguage) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    search.set(key, String(value));
  });
  return request(`/api/wikipedia-gacha/collection?${search.toString()}`, {
    headers: buildHeaders(browserToken, preferredLanguage),
  });
}

export function fetchWikipediaGachaMissions(browserToken, preferredLanguage) {
  return request("/api/wikipedia-gacha/missions", {
    headers: buildHeaders(browserToken, preferredLanguage),
  });
}

export function fetchWikipediaGachaTrophies(browserToken, unlockedOnly = false, preferredLanguage) {
  return request(
    unlockedOnly
      ? "/api/wikipedia-gacha/trophies/unlocked"
      : "/api/wikipedia-gacha/trophies",
    {
      headers: buildHeaders(browserToken, preferredLanguage),
    }
  );
}

export function openWikipediaGachaPack(browserToken, preferredLanguage) {
  return request("/api/wikipedia-gacha/packs/open", {
    method: "POST",
    headers: buildHeaders(browserToken, preferredLanguage),
    body: JSON.stringify({ browserToken }),
  });
}

export function claimWikipediaGachaRewardedAdPacks(browserToken, preferredLanguage) {
  return request("/api/wikipedia-gacha/ads/rewarded-packs", {
    method: "POST",
    headers: buildHeaders(browserToken, preferredLanguage),
    body: JSON.stringify({ browserToken }),
  });
}

export function toggleWikipediaGachaFavorite(browserToken, articleId, favorite, preferredLanguage) {
  return request(`/api/wikipedia-gacha/collection/${articleId}/favorite`, {
    method: "PATCH",
    headers: buildHeaders(browserToken, preferredLanguage),
    body: JSON.stringify({ browserToken, favorite }),
  });
}

export function fetchWikipediaGachaArticle(browserToken, articleId, preferredLanguage) {
  return request(`/api/wikipedia-gacha/articles/${articleId}`, {
    headers: buildHeaders(browserToken, preferredLanguage),
  });
}

export function registerWikipediaGachaArticleClick(browserToken, articleId, preferredLanguage) {
  return request(`/api/wikipedia-gacha/articles/${articleId}/click`, {
    method: "POST",
    headers: buildHeaders(browserToken, preferredLanguage),
    body: JSON.stringify({ browserToken }),
  });
}

export function claimWikipediaGachaMission(browserToken, missionId, preferredLanguage) {
  return request(`/api/wikipedia-gacha/missions/${missionId}/claim`, {
    method: "POST",
    headers: buildHeaders(browserToken, preferredLanguage),
    body: JSON.stringify({ browserToken }),
  });
}

export function exportWikipediaGachaRecovery(browserToken, preferredLanguage) {
  return request("/api/wikipedia-gacha/recovery/export", {
    method: "POST",
    headers: buildHeaders(browserToken, preferredLanguage),
    body: JSON.stringify({ browserToken }),
  });
}

export function importWikipediaGachaRecovery(browserToken, recoveryCode, preferredLanguage) {
  return request("/api/wikipedia-gacha/recovery/import", {
    method: "POST",
    headers: buildHeaders(browserToken, preferredLanguage),
    body: JSON.stringify({ browserToken, recoveryCode }),
  });
}
