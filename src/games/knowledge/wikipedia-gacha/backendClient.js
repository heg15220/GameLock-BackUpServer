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

export function bootstrapWikipediaGachaSession(payload = {}) {
  return request("/api/wikipedia-gacha/session/bootstrap", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchWikipediaGachaSession(browserToken) {
  return request("/api/wikipedia-gacha/session/me", {
    headers: authHeaders(browserToken),
  });
}

export function fetchWikipediaGachaCollection(browserToken, params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    search.set(key, String(value));
  });
  return request(`/api/wikipedia-gacha/collection?${search.toString()}`, {
    headers: authHeaders(browserToken),
  });
}

export function fetchWikipediaGachaMissions(browserToken) {
  return request("/api/wikipedia-gacha/missions", {
    headers: authHeaders(browserToken),
  });
}

export function fetchWikipediaGachaTrophies(browserToken, unlockedOnly = false) {
  return request(
    unlockedOnly
      ? "/api/wikipedia-gacha/trophies/unlocked"
      : "/api/wikipedia-gacha/trophies",
    {
      headers: authHeaders(browserToken),
    }
  );
}

export function openWikipediaGachaPack(browserToken) {
  return request("/api/wikipedia-gacha/packs/open", {
    method: "POST",
    headers: authHeaders(browserToken),
    body: JSON.stringify({ browserToken }),
  });
}

export function toggleWikipediaGachaFavorite(browserToken, articleId, favorite) {
  return request(`/api/wikipedia-gacha/collection/${articleId}/favorite`, {
    method: "PATCH",
    headers: authHeaders(browserToken),
    body: JSON.stringify({ browserToken, favorite }),
  });
}

export function fetchWikipediaGachaArticle(browserToken, articleId) {
  return request(`/api/wikipedia-gacha/articles/${articleId}`, {
    headers: authHeaders(browserToken),
  });
}

export function registerWikipediaGachaArticleClick(browserToken, articleId) {
  return request(`/api/wikipedia-gacha/articles/${articleId}/click`, {
    method: "POST",
    headers: authHeaders(browserToken),
    body: JSON.stringify({ browserToken }),
  });
}

export function claimWikipediaGachaMission(browserToken, missionId) {
  return request(`/api/wikipedia-gacha/missions/${missionId}/claim`, {
    method: "POST",
    headers: authHeaders(browserToken),
    body: JSON.stringify({ browserToken }),
  });
}

export function exportWikipediaGachaRecovery(browserToken) {
  return request("/api/wikipedia-gacha/recovery/export", {
    method: "POST",
    headers: authHeaders(browserToken),
    body: JSON.stringify({ browserToken }),
  });
}

export function importWikipediaGachaRecovery(browserToken, recoveryCode) {
  return request("/api/wikipedia-gacha/recovery/import", {
    method: "POST",
    headers: authHeaders(browserToken),
    body: JSON.stringify({ browserToken, recoveryCode }),
  });
}
