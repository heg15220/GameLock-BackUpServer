const ENV_BACKEND_ROOT = import.meta.env.VITE_PENALTY_SHOOTOUT_BACKEND_URL ?? "";
const DEFAULT_BACKEND_PORT = 8788;

let resolvedBackendRoot = ENV_BACKEND_ROOT || null;

function normalizeRoot(root) {
  if (typeof root !== "string") {
    return "";
  }
  return root.trim().replace(/\/+$/, "");
}

function buildCandidateRoots() {
  const roots = [];
  const pushRoot = (root) => {
    const normalized = normalizeRoot(root);
    if (!normalized && root !== "") {
      return;
    }
    if (!roots.includes(normalized)) {
      roots.push(normalized);
    }
  };

  pushRoot(ENV_BACKEND_ROOT);

  if (typeof window !== "undefined") {
    pushRoot("");

    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    const { hostname, port } = window.location;

    if (hostname) {
      pushRoot(`${protocol}//${hostname}:${DEFAULT_BACKEND_PORT}`);
    }

    if (port === String(DEFAULT_BACKEND_PORT)) {
      pushRoot(window.location.origin);
    }
  }

  pushRoot(`http://localhost:${DEFAULT_BACKEND_PORT}`);
  pushRoot(`http://127.0.0.1:${DEFAULT_BACKEND_PORT}`);

  if (resolvedBackendRoot) {
    pushRoot(resolvedBackendRoot);
    roots.sort((a, b) => (a === resolvedBackendRoot ? -1 : b === resolvedBackendRoot ? 1 : 0));
  }

  return roots;
}

async function requestAgainstRoot(root, path, options = {}) {
  const url = root ? `${root}${path}` : path;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = await response.json().catch(() => ({}));
  if (response.ok && !contentType.toLowerCase().includes("application/json")) {
    const error = new Error("invalid_backend_payload");
    error.code = "invalid_backend_payload";
    error.status = 502;
    throw error;
  }
  if (!response.ok) {
    const error = new Error(payload.message || `backend_${response.status}`);
    error.code = payload.error || `backend_${response.status}`;
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function request(path, options = {}) {
  const roots = buildCandidateRoots();
  let lastError = null;

  for (const root of roots) {
    try {
      const payload = await requestAgainstRoot(root, path, options);
      resolvedBackendRoot = root;
      return payload;
    } catch (error) {
      lastError = error;
      const isRetryableStatus = !error?.status || error.status === 404 || error.status >= 500;
      if (!isRetryableStatus) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error("penalty_backend_unreachable");
}

export async function fetchPenaltyTeams() {
  return request("/api/penalty-shootout/teams");
}

export async function createPenaltyMatch(payload) {
  return request("/api/penalty-shootout/matches", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchPenaltyMatchState(matchId) {
  return request(`/api/penalty-shootout/matches/${matchId}`);
}

export async function submitPenaltyShot(matchId, payload, idempotencyKey) {
  return request(`/api/penalty-shootout/matches/${matchId}/shots`, {
    method: "POST",
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
    body: JSON.stringify(payload),
  });
}

export async function fetchPenaltyStats() {
  return request("/api/penalty-shootout/stats");
}
