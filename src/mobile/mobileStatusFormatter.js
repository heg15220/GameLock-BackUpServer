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

function formatTurnValue(value, locale) {
  const turnKey = String(value ?? "").trim().toLowerCase();
  if (!turnKey) {
    return null;
  }

  if (turnKey === "w" || turnKey === "white") {
    return locale === "en" ? "White" : "Blancas";
  }

  if (turnKey === "b" || turnKey === "black") {
    return locale === "en" ? "Black" : "Negras";
  }

  return titleCase(value);
}

function resolveTurnLabel(snapshot, locale) {
  const turnId = snapshot?.currentPlayerName ?? snapshot?.current ?? snapshot?.turn;
  if (!turnId) {
    return null;
  }

  const playerLabel = Array.isArray(snapshot?.players)
    ? snapshot.players.find((player) => player?.id === turnId)?.label
    : null;

  if (playerLabel) {
    return playerLabel;
  }

  return formatTurnValue(turnId, locale);
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

  if (snapshot.statusText) {
    return snapshot.statusText;
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

  if (snapshot.variant === "minesweeper-classic") {
    const boardRows = snapshot.boardSize?.rows;
    const boardCols = snapshot.boardSize?.cols;
    const timerValue =
      snapshot.timerLabel
      ?? snapshot.timer
      ?? (snapshot.timerSeconds != null ? formatMs(snapshot.timerSeconds * 1000) : null);

    addEntry(entries, locale === "en" ? "Rows" : "Filas", boardRows);
    addEntry(entries, locale === "en" ? "Cols" : "Cols", boardCols);
    addEntry(entries, locale === "en" ? "Mines" : "Minas", snapshot.minesTotal);
    addEntry(entries, locale === "en" ? "Left" : "Restan", snapshot.minesRemaining);
    addEntry(entries, timeLabel, timerValue);
    addEntry(entries, locale === "en" ? "Score" : "Puntos", snapshot.score);

    return {
      primaryText: resolvePrimaryText(snapshot),
      entries: entries.slice(0, 6),
    };
  }

  if (snapshot.mode === "billiards_pool" && Array.isArray(snapshot.players) && snapshot.players.length) {
    addEntry(entries, locale === "en" ? "Phase" : "Fase", snapshot.statusLabel);
    if (snapshot.tableOpen) {
      addEntry(entries, locale === "en" ? "Table" : "Mesa", locale === "en" ? "Open" : "Abierta");
    }
    if (snapshot.ballInHand) {
      addEntry(entries, locale === "en" ? "Ball" : "Bola", locale === "en" ? "In hand" : "En mano");
    }
  }

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

  if (snapshot.match && typeof snapshot.match === "object") {
    addEntry(
      entries,
      locale === "en" ? "Match" : "Sesion",
      snapshot.match.current != null && snapshot.match.total != null
        ? `${snapshot.match.current}/${snapshot.match.total}`
        : snapshot.match.current
    );
  }

  addEntry(
    entries,
    locale === "en" ? "Dice" : "Dados",
    snapshot.dice != null || snapshot.diceAux != null
      ? `${snapshot.dice ?? "-"} / ${snapshot.diceAux ?? "-"}`
      : null
  );
  addEntry(entries, locale === "en" ? "Move" : "Paso", snapshot.steps);

  addEntry(
    entries,
    locale === "en" ? "Turn" : "Turno",
    resolveTurnLabel(snapshot, locale)
  );
  addEntry(entries, locale === "en" ? "Moves" : "Movs", snapshot.moves);
  addEntry(entries, locale === "en" ? "Moves" : "Movs", snapshot.moveHistory?.length);
  addEntry(entries, locale === "en" ? "Legal" : "Legales", snapshot.legalMovesCount);
  addEntry(entries, locale === "en" ? "Hints" : "Pistas", snapshot.hintsUsed);
  addEntry(entries, locale === "en" ? "Attempts" : "Intentos", snapshot.attemptsLeft);
  addEntry(
    entries,
    locale === "en" ? "Words" : "Palabras",
    snapshot.wordsFound != null && snapshot.wordsTotal != null
      ? `${snapshot.wordsFound}/${snapshot.wordsTotal}`
      : null
  );
  addEntry(
    entries,
    locale === "en" ? "Solved" : "Resuelto",
    snapshot.solvedCount != null && snapshot.remainingCount != null
      ? `${snapshot.solvedCount}/${snapshot.solvedCount + snapshot.remainingCount}`
      : null
  );
  addEntry(entries, locale === "en" ? "Players" : "Jug.", snapshot.playerCount);
  addEntry(entries, locale === "en" ? "Deck" : "Mazo", snapshot.stockCount);
  addEntry(
    entries,
    locale === "en" ? "Difficulty" : "Nivel",
    snapshot.difficultyLabel
      ?? (snapshot.difficulty ? titleCase(snapshot.difficulty) : null)
      ?? titleCase(snapshot.difficultyId ?? snapshot.difficultyKey)
  );

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
  addEntry(entries, locale === "en" ? "Start" : "Inicio", snapshot.started === false ? (locale === "en" ? "Pending" : "Pendiente") : null);
  addEntry(entries, locale === "en" ? "Sector" : "Sector", snapshot.sectorName);
  addEntry(entries, locale === "en" ? "World" : "Mundo", level?.worldName);
  addEntry(entries, locale === "en" ? "Lives" : "Vidas", snapshot.ballsLeft);
  addEntry(entries, locale === "en" ? "Multiplier" : "Multiplicador", snapshot.multiplier);
  addEntry(entries, locale === "en" ? "Best" : "Mejor", snapshot.bestScore ?? snapshot.hiScore);

  if (snapshot.variant === "valle-tranquilo") {
    addEntry(entries, locale === "en" ? "Day" : "Dia", snapshot.time?.day);
    addEntry(entries, locale === "en" ? "Gold" : "Oro", snapshot.economy?.gold);
    addEntry(entries, locale === "en" ? "Energy" : "Energia", snapshot.economy?.energy);
    addEntry(entries, locale === "en" ? "Tool" : "Herr.", titleCase(snapshot.tool));
  }

  if (snapshot.mode === "arcade-dig-hole-treasure") {
    addEntry(entries, locale === "en" ? "Depth" : "Prof.", snapshot.depthMeters != null ? `${snapshot.depthMeters}m` : null);
    addEntry(entries, locale === "en" ? "Load" : "Carga", snapshot.inventoryCount != null && snapshot.capacity != null ? `${snapshot.inventoryCount}/${snapshot.capacity}` : null);
    addEntry(entries, locale === "en" ? "Coins" : "Mon.", snapshot.coins);
    addEntry(
      entries,
      locale === "en" ? "Stamina" : "Estam.",
      snapshot.stamina != null && snapshot.maxStamina != null
        ? `${Math.ceil(snapshot.stamina)}/${snapshot.maxStamina}`
        : null
    );
  }

  return {
    primaryText: resolvePrimaryText(snapshot),
    entries: entries.slice(0, 6),
  };
}

export function isPreplayState(snapshot) {
  const probe = String(
    snapshot?.screen ?? snapshot?.phase ?? snapshot?.status ?? snapshot?.mode ?? ""
  ).toLowerCase();

  return [
    "menu",
    "intro",
    "booting",
    "starting",
    "setup",
    "config",
    "configuration",
    "idle",
    "lobby",
    "not-started",
    "not_started",
    "pregame",
    "pre-game",
    "ready",
    "levelselect",
    "level_select",
    "world_select",
    "world select",
  ].includes(probe);
}
