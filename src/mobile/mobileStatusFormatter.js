function formatMs(value) {
  const totalSeconds = Math.max(0, Math.ceil((Number(value) || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function titleCase(value) {
  return String(value ?? "")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function addEntry(entries, label, value) {
  if (value == null || value === "") {
    return;
  }

  entries.push({
    label,
    value: typeof value === "number" ? String(value) : String(value),
  });
}

function resolvePrimaryText(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }

  if (snapshot.result?.title) {
    return snapshot.result.subtitle
      ? `${snapshot.result.title} · ${snapshot.result.subtitle}`
      : snapshot.result.title;
  }

  if (snapshot.summary?.title) {
    return snapshot.summary.text
      ? `${snapshot.summary.title} · ${snapshot.summary.text}`
      : snapshot.summary.title;
  }

  if (snapshot.message) {
    return snapshot.message;
  }

  if (snapshot.statusLabel) {
    return snapshot.statusLabel;
  }

  if (snapshot.phase) {
    return titleCase(snapshot.phase);
  }

  if (snapshot.screen) {
    return titleCase(snapshot.screen);
  }

  if (snapshot.mode) {
    return titleCase(snapshot.mode);
  }

  return null;
}

export function formatMobileStatus(snapshot, locale = "es") {
  if (!snapshot || typeof snapshot !== "object") {
    return {
      primaryText:
        locale === "en"
          ? "Loading match status..."
          : "Cargando estado de la partida...",
      entries: [],
    };
  }

  const entries = [];
  const score = snapshot.score;
  const scoreboard = snapshot.scoreboard;
  const timing = snapshot.timing;
  const level = snapshot.level;
  const timeLabel = locale === "en" ? "Time" : "Tiempo";

  if (scoreboard && typeof scoreboard === "object") {
    if (Number.isFinite(scoreboard.playerGoals) || Number.isFinite(scoreboard.rivalGoals)) {
      addEntry(entries, locale === "en" ? "Score" : "Marcador", `${scoreboard.playerGoals ?? 0} - ${scoreboard.rivalGoals ?? 0}`);
    }
    addEntry(entries, locale === "en" ? "Round" : "Ronda", scoreboard.round);
    addEntry(entries, locale === "en" ? "Left" : "Restantes", scoreboard.remainingInitialShots);
  }

  if (score && typeof score === "object") {
    if (Number.isFinite(score.you) || Number.isFinite(score.cpu)) {
      addEntry(entries, locale === "en" ? "Score" : "Marcador", `${score.you ?? 0} - ${score.cpu ?? 0}`);
    }
    if (Number.isFinite(score.player) || Number.isFinite(score.ai)) {
      addEntry(entries, locale === "en" ? "Score" : "Marcador", `${score.player ?? 0} - ${score.ai ?? 0}`);
    }
    addEntry(entries, locale === "en" ? "Strokes" : "Golpes", score.strokes);
    addEntry(entries, locale === "en" ? "Stars" : "Estrellas", score.starsAwarded ?? score.totalStars);
    addEntry(entries, locale === "en" ? "Session" : "Sesion", score.totalStrokesSession);
  } else if (Number.isFinite(score)) {
    addEntry(entries, "Score", score);
  }

  addEntry(entries, timeLabel, snapshot.timerLabel);
  addEntry(entries, timeLabel, snapshot.timer);

  if (!entries.some((entry) => entry.label === timeLabel)) {
    if (timing?.elapsedMs != null) {
      addEntry(entries, timeLabel, formatMs(timing.elapsedMs));
    } else if (snapshot.elapsedMs != null) {
      addEntry(entries, timeLabel, formatMs(snapshot.elapsedMs));
    } else if (snapshot.remainingMs != null) {
      addEntry(entries, timeLabel, formatMs(snapshot.remainingMs));
    }
  }

  addEntry(entries, locale === "en" ? "Level" : "Nivel", level?.index != null && level?.total != null ? `${level.index}/${level.total}` : level?.index);
  addEntry(entries, locale === "en" ? "Wave" : "Oleada", snapshot.wave);
  addEntry(entries, locale === "en" ? "Round" : "Ronda", snapshot.roundLabel);
  addEntry(entries, locale === "en" ? "Phase" : "Fase", snapshot.status ?? snapshot.playState);
  addEntry(entries, locale === "en" ? "Sector" : "Sector", snapshot.sectorName);
  addEntry(entries, locale === "en" ? "World" : "Mundo", level?.worldName);
  addEntry(entries, locale === "en" ? "Lives" : "Vidas", snapshot.ballsLeft);
  addEntry(entries, locale === "en" ? "Multiplier" : "Multiplicador", snapshot.multiplier);
  addEntry(entries, locale === "en" ? "Best" : "Mejor", snapshot.bestScore ?? snapshot.hiScore);

  return {
    primaryText: resolvePrimaryText(snapshot),
    entries: entries.slice(0, 6),
  };
}

export function isPreplayState(snapshot) {
  const probe = String(
    snapshot?.screen ?? snapshot?.phase ?? snapshot?.mode ?? ""
  ).toLowerCase();

  return [
    "menu",
    "intro",
    "booting",
    "starting",
    "setup",
    "ready",
    "levelselect",
    "level_select",
  ].includes(probe);
}
