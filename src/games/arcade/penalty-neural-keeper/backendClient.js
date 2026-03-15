const BACKEND_ROOT =
  import.meta.env.VITE_PENALTY_SHOOTOUT_BACKEND_URL ?? "http://127.0.0.1:8788";

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
