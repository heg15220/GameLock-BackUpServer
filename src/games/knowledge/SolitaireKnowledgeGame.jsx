import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import useGameRuntimeBridge from "../../utils/useGameRuntimeBridge";
import {
  KNOWLEDGE_ARCADE_MATCH_COUNT,
  createSeededRandom,
  getRandomKnowledgeMatchId,
  getRandomKnowledgeMatchIdExcept,
  resolveKnowledgeArcadeLocale,
  shuffleWithRandom
} from "./knowledgeArcadeUtils";

const SUITS = ["spades", "hearts", "diamonds", "clubs"];
const SUIT_GLYPH = { spades: "♠", hearts: "♥", diamonds: "♦", clubs: "♣" };
const RED_SUITS = new Set(["hearts", "diamonds"]);
const TABLEAU_COLUMNS = 7;
const KING_RANK = 13;
const ACE_RANK = 1;
const STORAGE_KEY = "paciencia_klondike_v1";
const TAP_THRESHOLD_PX = 6;
const DOUBLE_TAP_MS = 320;

const COPY = {
  es: {
    title: "Paciencia Klondike",
    subtitle: "Solitario clásico: arrastra o pulsa para mover. Doble click envía a la fundación.",
    restart: "Nueva partida",
    match: "Partida",
    moves: "Movimientos",
    time: "Tiempo",
    stock: "Mazo",
    waste: "Descarte",
    status: "Estado",
    statusWon: "¡Resuelto!",
    statusPlaying: "En curso",
    draw: "Robar",
    recycle: "Reciclar mazo",
    autoFoundation: "Auto fundación",
    foundationsLabel: "Fundaciones",
    tableauLabel: "Tableau",
    bestMoves: "Mínimo movs.",
    bestTime: "Mejor tiempo",
    startMessage: "Construye las fundaciones de A a K, una por palo.",
    drawnCard: "Has robado una carta.",
    recycledWaste: "Descarte reciclado al mazo.",
    noCards: "El mazo y el descarte están vacíos.",
    invalidMove: "Movimiento inválido.",
    movedToFoundation: "Carta enviada a fundación.",
    movedInTableau: "Carta movida en el tableau.",
    autoNoCandidate: "No hay cartas listas para fundación.",
    solved: "¡Paciencia resuelta!",
    cardLabel: (rank, suit) => `${rankLabel(rank)} de ${suitLabel(suit, "es")}`,
    helpTitle: "Cómo se juega",
    helpRulesTitle: "Reglas (Klondike)",
    helpRules: [
      "Objetivo: construir las 4 fundaciones por palo, de As a Rey (A → 2 → 3 … J, Q, K).",
      "Tableau (7 columnas): coloca cartas en orden descendente y de color alternado (rojo sobre negro y viceversa).",
      "Una columna vacía solo admite un Rey (o una secuencia que empiece en Rey).",
      "Puedes mover una carta o una secuencia completa válida desde el tableau.",
      "El mazo (stock) reparte una carta al descarte; cuando se vacía, púlsalo para reciclar el descarte sin límite.",
      "Solo es jugable la carta superior del descarte y la superior de cada columna (o secuencias válidas).",
      "Las cartas boca abajo se giran automáticamente al quedar arriba.",
    ],
    helpControlsTitle: "Controles",
    helpControls: [
      "Ratón / táctil: arrastra una carta o pila al destino, o pulsa origen y destino en dos toques.",
      "Doble click / doble toque sobre una carta la envía a su fundación si es válido.",
      "Pulsa el mazo para robar; pulsa de nuevo (cuando esté vacío) para reciclar el descarte.",
      "Atajos: D robar/reciclar · F auto-fundación · P nueva partida · Esc deselecciona.",
      "Móvil/tablet: el tableau se desplaza horizontalmente si no cabe; las pilas superiores son fijas.",
    ],
  },
  en: {
    title: "Klondike Solitaire",
    subtitle: "Classic solitaire: drag or tap to move. Double click sends to foundation.",
    restart: "New game",
    match: "Game",
    moves: "Moves",
    time: "Time",
    stock: "Stock",
    waste: "Waste",
    status: "Status",
    statusWon: "Solved!",
    statusPlaying: "In progress",
    draw: "Draw",
    recycle: "Recycle stock",
    autoFoundation: "Auto foundation",
    foundationsLabel: "Foundations",
    tableauLabel: "Tableau",
    bestMoves: "Best moves",
    bestTime: "Best time",
    startMessage: "Build the foundations from A to K, one per suit.",
    drawnCard: "Card drawn from stock.",
    recycledWaste: "Waste recycled into stock.",
    noCards: "Stock and waste are both empty.",
    invalidMove: "Invalid move.",
    movedToFoundation: "Card sent to foundation.",
    movedInTableau: "Card moved on the tableau.",
    autoNoCandidate: "No cards ready for the foundation.",
    solved: "Solitaire solved!",
    cardLabel: (rank, suit) => `${rankLabel(rank)} of ${suitLabel(suit, "en")}`,
    helpTitle: "How to play",
    helpRulesTitle: "Rules (Klondike)",
    helpRules: [
      "Goal: build the 4 foundations by suit, from Ace to King (A → 2 → 3 … J, Q, K).",
      "Tableau (7 columns): place cards in descending order with alternating colors (red on black and vice versa).",
      "An empty column only accepts a King (or a sequence starting with a King).",
      "You can move a single card or a full valid sequence from the tableau.",
      "The stock deals one card to the waste; when empty, click it to recycle the waste without limit.",
      "Only the top of the waste and the top of each column (or valid sequences) are playable.",
      "Face-down cards flip automatically when they end up on top.",
    ],
    helpControlsTitle: "Controls",
    helpControls: [
      "Mouse / touch: drag a card or stack to the destination, or tap source then destination in two taps.",
      "Double click / double tap on a card sends it to its foundation if valid.",
      "Tap the stock to draw; tap again (once empty) to recycle the waste.",
      "Shortcuts: D draw/recycle · F auto foundation · P new game · Esc deselect.",
      "Mobile/tablet: the tableau scrolls horizontally if it does not fit; top piles stay aligned.",
    ],
  }
};

function rankLabel(rank) {
  if (rank === 1) return "A";
  if (rank === 11) return "J";
  if (rank === 12) return "Q";
  if (rank === 13) return "K";
  return String(rank);
}

function suitLabel(suit, locale) {
  if (locale === "es") {
    if (suit === "spades") return "picas";
    if (suit === "hearts") return "corazones";
    if (suit === "diamonds") return "diamantes";
    return "tréboles";
  }
  if (suit === "spades") return "spades";
  if (suit === "hearts") return "hearts";
  if (suit === "diamonds") return "diamonds";
  return "clubs";
}

const isRed = (suit) => RED_SUITS.has(suit);
const oppositeColor = (suitA, suitB) => isRed(suitA) !== isRed(suitB);

function buildDeck() {
  const cards = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= KING_RANK; rank += 1) {
      cards.push({ id: `${suit}-${rank}`, suit, rank });
    }
  }
  return cards;
}

function deal(matchId) {
  const random = createSeededRandom((Number(matchId) || 0) * 9301 + 49297);
  const deck = shuffleWithRandom(buildDeck(), random);
  const tableau = [[], [], [], [], [], [], []];
  let cursor = 0;
  for (let col = 0; col < TABLEAU_COLUMNS; col += 1) {
    for (let row = 0; row <= col; row += 1) {
      const card = deck[cursor];
      cursor += 1;
      tableau[col].push({ ...card, faceUp: row === col });
    }
  }
  const stock = deck.slice(cursor).map((card) => ({ ...card, faceUp: false }));
  return { tableau, stock };
}

function createInitialState(matchId, copy) {
  const { tableau, stock } = deal(matchId);
  return {
    matchId,
    tableau,
    stock,
    waste: [],
    foundations: { spades: [], hearts: [], diamonds: [], clubs: [] },
    moves: 0,
    invalidMoves: 0,
    status: "playing",
    startedAt: null,
    finishedAt: null,
    message: copy.startMessage
  };
}

function topOf(pile) {
  return pile.length ? pile[pile.length - 1] : null;
}

function canPlaceOnFoundation(card, foundationPile) {
  const top = topOf(foundationPile);
  if (!top) return card.rank === ACE_RANK;
  return top.suit === card.suit && card.rank === top.rank + 1;
}

function canPlaceOnTableau(card, columnPile) {
  const top = topOf(columnPile);
  if (!top) return card.rank === KING_RANK;
  if (!top.faceUp) return false;
  return oppositeColor(top.suit, card.suit) && card.rank === top.rank - 1;
}

function isValidTableauSequence(cards) {
  if (!cards.length) return false;
  for (let i = 0; i < cards.length; i += 1) {
    if (!cards[i].faceUp) return false;
    if (i > 0) {
      const prev = cards[i - 1];
      const next = cards[i];
      if (!oppositeColor(prev.suit, next.suit)) return false;
      if (next.rank !== prev.rank - 1) return false;
    }
  }
  return true;
}

function flipTopIfFaceDown(column) {
  if (!column.length) return column;
  const top = column[column.length - 1];
  if (top.faceUp) return column;
  return [...column.slice(0, -1), { ...top, faceUp: true }];
}

function isWon(foundations) {
  return SUITS.every((suit) => foundations[suit].length === KING_RANK);
}

function loadBest() {
  if (typeof window === "undefined") return { bestMoves: null, bestTimeMs: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { bestMoves: null, bestTimeMs: null };
    const parsed = JSON.parse(raw);
    return {
      bestMoves: Number.isFinite(parsed?.bestMoves) ? parsed.bestMoves : null,
      bestTimeMs: Number.isFinite(parsed?.bestTimeMs) ? parsed.bestTimeMs : null
    };
  } catch {
    return { bestMoves: null, bestTimeMs: null };
  }
}

function saveBest(next) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

function formatTime(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function findAutoFoundationCandidate(snapshot) {
  let best = null;

  const wasteTop = topOf(snapshot.waste);
  if (wasteTop && canPlaceOnFoundation(wasteTop, snapshot.foundations[wasteTop.suit])) {
    if (!best || wasteTop.rank < best.card.rank) {
      best = { source: "waste", card: wasteTop };
    }
  }

  for (let col = 0; col < snapshot.tableau.length; col += 1) {
    const top = topOf(snapshot.tableau[col]);
    if (top && top.faceUp && canPlaceOnFoundation(top, snapshot.foundations[top.suit])) {
      if (!best || top.rank < best.card.rank) {
        best = { source: "tableau", column: col, card: top };
      }
    }
  }

  return best;
}

function SolitaireKnowledgeGame() {
  const locale = useMemo(resolveKnowledgeArcadeLocale, []);
  const copy = useMemo(() => COPY[locale] ?? COPY.en, [locale]);

  const [state, setState] = useState(() => createInitialState(getRandomKnowledgeMatchId(), copy));
  const [now, setNow] = useState(() => Date.now());
  const [best, setBest] = useState(loadBest);

  const [drag, setDrag] = useState(null);
  const [selection, setSelection] = useState(null);
  const pointerRef = useRef(null);
  const lastTapRef = useRef({ key: null, time: 0 });
  const stageRef = useRef(null);

  const restart = useCallback(() => {
    setState((prev) => createInitialState(getRandomKnowledgeMatchIdExcept(prev.matchId), copy));
    setSelection(null);
    setDrag(null);
  }, [copy]);

  const ensureStarted = useCallback((prev) => {
    if (prev.startedAt) return prev;
    return { ...prev, startedAt: Date.now() };
  }, []);

  const drawCard = useCallback(() => {
    setState((prev) => {
      if (prev.status !== "playing") return prev;
      const seeded = ensureStarted(prev);
      if (seeded.stock.length) {
        const next = [...seeded.stock];
        const drawn = next.pop();
        return {
          ...seeded,
          stock: next,
          waste: [...seeded.waste, { ...drawn, faceUp: true }],
          moves: seeded.moves + 1,
          message: copy.drawnCard
        };
      }
      if (seeded.waste.length) {
        return {
          ...seeded,
          stock: [...seeded.waste].reverse().map((card) => ({ ...card, faceUp: false })),
          waste: [],
          moves: seeded.moves + 1,
          message: copy.recycledWaste
        };
      }
      return { ...seeded, message: copy.noCards };
    });
    setSelection(null);
  }, [copy, ensureStarted]);

  const applyMove = useCallback((source, cards, target) => {
    setState((prev) => {
      if (prev.status !== "playing") return prev;
      const seeded = ensureStarted(prev);

      const draftWaste = [...seeded.waste];
      const draftTableau = seeded.tableau.map((column) => column.slice());
      const draftFoundations = {
        spades: [...seeded.foundations.spades],
        hearts: [...seeded.foundations.hearts],
        diamonds: [...seeded.foundations.diamonds],
        clubs: [...seeded.foundations.clubs]
      };

      // Validate target acceptance.
      let targetValid = false;
      if (target.kind === "foundation") {
        if (cards.length !== 1 || cards[0].suit !== target.suit) {
          return { ...seeded, invalidMoves: seeded.invalidMoves + 1, message: copy.invalidMove };
        }
        targetValid = canPlaceOnFoundation(cards[0], draftFoundations[target.suit]);
      } else if (target.kind === "tableau") {
        targetValid = canPlaceOnTableau(cards[0], draftTableau[target.column]);
      }

      if (!targetValid) {
        return { ...seeded, invalidMoves: seeded.invalidMoves + 1, message: copy.invalidMove };
      }

      // Detach from source.
      if (source.kind === "waste") {
        if (cards.length !== 1) {
          return { ...seeded, invalidMoves: seeded.invalidMoves + 1, message: copy.invalidMove };
        }
        const sourceTop = topOf(draftWaste);
        if (!sourceTop || sourceTop.id !== cards[0].id) {
          return { ...seeded, invalidMoves: seeded.invalidMoves + 1, message: copy.invalidMove };
        }
        draftWaste.pop();
      } else if (source.kind === "tableau") {
        const sourceColumn = draftTableau[source.column];
        const startIndex = source.index;
        if (startIndex < 0 || startIndex >= sourceColumn.length) {
          return { ...seeded, invalidMoves: seeded.invalidMoves + 1, message: copy.invalidMove };
        }
        const slice = sourceColumn.slice(startIndex);
        if (slice.length !== cards.length || slice.some((card, idx) => card.id !== cards[idx].id)) {
          return { ...seeded, invalidMoves: seeded.invalidMoves + 1, message: copy.invalidMove };
        }
        draftTableau[source.column] = flipTopIfFaceDown(sourceColumn.slice(0, startIndex));
      } else if (source.kind === "foundation") {
        if (cards.length !== 1) {
          return { ...seeded, invalidMoves: seeded.invalidMoves + 1, message: copy.invalidMove };
        }
        const pile = draftFoundations[source.suit];
        const top = topOf(pile);
        if (!top || top.id !== cards[0].id) {
          return { ...seeded, invalidMoves: seeded.invalidMoves + 1, message: copy.invalidMove };
        }
        pile.pop();
      } else {
        return { ...seeded, invalidMoves: seeded.invalidMoves + 1, message: copy.invalidMove };
      }

      // Attach to target.
      if (target.kind === "foundation") {
        draftFoundations[target.suit].push(cards[0]);
      } else if (target.kind === "tableau") {
        for (const card of cards) {
          draftTableau[target.column].push({ ...card, faceUp: true });
        }
      }

      const won = isWon(draftFoundations);
      return {
        ...seeded,
        waste: draftWaste,
        tableau: draftTableau,
        foundations: draftFoundations,
        moves: seeded.moves + 1,
        message: target.kind === "foundation" ? copy.movedToFoundation : copy.movedInTableau,
        status: won ? "won" : "playing",
        finishedAt: won ? Date.now() : null
      };
    });
    setSelection(null);
  }, [copy, ensureStarted]);

  const tryAutoFoundation = useCallback(() => {
    setState((prev) => {
      if (prev.status !== "playing") return prev;
      const candidate = findAutoFoundationCandidate(prev);
      if (!candidate) {
        return { ...prev, invalidMoves: prev.invalidMoves + 1, message: copy.autoNoCandidate };
      }
      const seeded = ensureStarted(prev);
      const draftWaste = [...seeded.waste];
      const draftTableau = seeded.tableau.map((column) => column.slice());
      const draftFoundations = {
        spades: [...seeded.foundations.spades],
        hearts: [...seeded.foundations.hearts],
        diamonds: [...seeded.foundations.diamonds],
        clubs: [...seeded.foundations.clubs]
      };
      if (candidate.source === "waste") {
        draftWaste.pop();
      } else {
        const column = draftTableau[candidate.column];
        column.pop();
        draftTableau[candidate.column] = flipTopIfFaceDown(column);
      }
      draftFoundations[candidate.card.suit].push(candidate.card);
      const won = isWon(draftFoundations);
      return {
        ...seeded,
        waste: draftWaste,
        tableau: draftTableau,
        foundations: draftFoundations,
        moves: seeded.moves + 1,
        message: copy.movedToFoundation,
        status: won ? "won" : "playing",
        finishedAt: won ? Date.now() : null
      };
    });
    setSelection(null);
  }, [copy, ensureStarted]);

  // Live timer update while playing.
  useEffect(() => {
    if (state.status !== "playing" || !state.startedAt) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [state.status, state.startedAt]);

  // Persist best moves/time on win.
  useEffect(() => {
    if (state.status !== "won" || !state.startedAt || !state.finishedAt) return;
    const elapsed = state.finishedAt - state.startedAt;
    const update = { ...best };
    let changed = false;
    if (best.bestMoves == null || state.moves < best.bestMoves) {
      update.bestMoves = state.moves;
      changed = true;
    }
    if (best.bestTimeMs == null || elapsed < best.bestTimeMs) {
      update.bestTimeMs = elapsed;
      changed = true;
    }
    if (changed) {
      setBest(update);
      saveBest(update);
    }
  }, [best, state.finishedAt, state.moves, state.startedAt, state.status]);

  // Pointer handling: drag-or-tap unified for desktop and touch.
  const startGesture = useCallback((event, source, cards) => {
    if (state.status !== "playing") return;
    if (!cards.length) return;
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // ignore
    }
    pointerRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      source,
      cards,
      moved: false,
      element: event.currentTarget
    };
  }, [state.status]);

  const handleStockTap = useCallback(() => {
    drawCard();
  }, [drawCard]);

  const handleEmptyDropClick = useCallback((target) => {
    if (!selection) return;
    applyMove(selection.source, selection.cards, target);
  }, [applyMove, selection]);

  const handlePointerMoveWindow = useCallback((event) => {
    const ref = pointerRef.current;
    if (!ref) return;
    if (event.pointerId !== ref.pointerId) return;
    const dx = event.clientX - ref.startX;
    const dy = event.clientY - ref.startY;
    if (!ref.moved && Math.hypot(dx, dy) >= TAP_THRESHOLD_PX) {
      ref.moved = true;
      setSelection(null);
      setDrag({
        cards: ref.cards,
        source: ref.source,
        x: event.clientX,
        y: event.clientY,
        offsetX: 28,
        offsetY: 22
      });
    }
    if (ref.moved) {
      ref.x = event.clientX;
      ref.y = event.clientY;
      setDrag((prev) => (prev ? { ...prev, x: event.clientX, y: event.clientY } : prev));
    }
  }, []);

  const findDropTarget = useCallback((x, y) => {
    if (typeof document === "undefined") return null;
    const stack = document.elementsFromPoint?.(x, y) || [document.elementFromPoint(x, y)];
    for (const el of stack) {
      if (!el) continue;
      const target = el.closest?.("[data-drop-target]");
      if (target) return target.getAttribute("data-drop-target");
    }
    return null;
  }, []);

  const parseTarget = (raw) => {
    if (!raw) return null;
    const [kind, payload] = raw.split(":");
    if (kind === "foundation") return { kind: "foundation", suit: payload };
    if (kind === "tableau") return { kind: "tableau", column: Number(payload) };
    return null;
  };

  const handlePointerUpWindow = useCallback((event) => {
    const ref = pointerRef.current;
    if (!ref) return;
    if (event.pointerId !== ref.pointerId) return;
    pointerRef.current = null;
    if (!ref.moved) {
      // Tap path: handle selection / move-to-selected / double-tap.
      const tapKey = ref.source.kind === "waste"
        ? "waste"
        : ref.source.kind === "tableau"
          ? `tableau:${ref.source.column}:${ref.source.index}`
          : `foundation:${ref.source.suit}`;

      const lastTap = lastTapRef.current;
      const nowTime = Date.now();
      if (lastTap.key === tapKey && nowTime - lastTap.time < DOUBLE_TAP_MS) {
        // Double tap → try foundation.
        lastTapRef.current = { key: null, time: 0 };
        const card = ref.cards[ref.cards.length - 1];
        const foundationPile = state.foundations[card.suit] ?? [];
        if (ref.cards.length === 1 && canPlaceOnFoundation(card, foundationPile)) {
          applyMove(ref.source, [card], { kind: "foundation", suit: card.suit });
          setDrag(null);
          return;
        }
      } else {
        lastTapRef.current = { key: tapKey, time: nowTime };
      }

      // Single tap: if there is an active selection, try to move there.
      if (selection) {
        const candidateTarget = ref.source.kind === "tableau"
          ? { kind: "tableau", column: ref.source.column }
          : ref.source.kind === "foundation"
            ? { kind: "foundation", suit: ref.source.suit }
            : null;
        if (candidateTarget) {
          if (selection.source.kind === "tableau" &&
              candidateTarget.kind === "tableau" &&
              selection.source.column === candidateTarget.column) {
            // Same column: deselect.
            setSelection(null);
            setDrag(null);
            return;
          }
          applyMove(selection.source, selection.cards, candidateTarget);
          setDrag(null);
          return;
        }
      }
      // Otherwise, set selection.
      setSelection({ source: ref.source, cards: ref.cards });
      setDrag(null);
      return;
    }

    // Drag path: hit-test for drop target.
    const targetRaw = findDropTarget(event.clientX, event.clientY);
    const target = parseTarget(targetRaw);
    if (target) {
      applyMove(ref.source, ref.cards, target);
    } else {
      setState((prev) => ({ ...prev, message: copy.invalidMove, invalidMoves: prev.invalidMoves }));
    }
    setDrag(null);
  }, [applyMove, copy.invalidMove, findDropTarget, selection, state.foundations]);

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMoveWindow);
    window.addEventListener("pointerup", handlePointerUpWindow);
    window.addEventListener("pointercancel", handlePointerUpWindow);
    return () => {
      window.removeEventListener("pointermove", handlePointerMoveWindow);
      window.removeEventListener("pointerup", handlePointerUpWindow);
      window.removeEventListener("pointercancel", handlePointerUpWindow);
    };
  }, [handlePointerMoveWindow, handlePointerUpWindow]);

  // Keyboard shortcuts: D draw, F auto-foundation, P new game.
  useEffect(() => {
    const onKey = (event) => {
      const target = event.target;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "d") { event.preventDefault(); drawCard(); return; }
      if (key === "f") { event.preventDefault(); tryAutoFoundation(); return; }
      if (key === "p") { event.preventDefault(); restart(); return; }
      if (key === "escape") { setSelection(null); setDrag(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawCard, restart, tryAutoFoundation]);

  // Runtime bridge payload for the harness.
  const payloadBuilder = useCallback((snapshot) => ({
    mode: "knowledge-arcade",
    variant: "paciencia",
    rules: "klondike-draw1",
    locale,
    match: { current: snapshot.matchId + 1, total: KNOWLEDGE_ARCADE_MATCH_COUNT },
    status: snapshot.status,
    moves: snapshot.moves,
    invalidMoves: snapshot.invalidMoves,
    stockSize: snapshot.stock.length,
    wasteTop: topOf(snapshot.waste) ? `${rankLabel(topOf(snapshot.waste).rank)}${SUIT_GLYPH[topOf(snapshot.waste).suit]}` : null,
    foundations: SUITS.reduce((acc, suit) => {
      acc[suit] = snapshot.foundations[suit].length;
      return acc;
    }, {}),
    tableau: snapshot.tableau.map((column) => column.map((card) => ({
      r: rankLabel(card.rank),
      s: SUIT_GLYPH[card.suit],
      up: card.faceUp
    }))),
    message: snapshot.message
  }), [locale]);

  useGameRuntimeBridge(state, payloadBuilder, useCallback(() => undefined, []));

  // ── Derived render values ────────────────────────────────────────────────
  const elapsedMs = state.startedAt
    ? (state.finishedAt ?? now) - state.startedAt
    : 0;
  const wasteTop = topOf(state.waste);
  const stockEmpty = state.stock.length === 0;
  const recyclable = stockEmpty && state.waste.length > 0;
  const statusLabel = state.status === "won" ? copy.statusWon : copy.statusPlaying;

  const isCardSelected = (source) => {
    if (!selection) return false;
    const sel = selection.source;
    if (sel.kind !== source.kind) return false;
    if (sel.kind === "waste") return true;
    if (sel.kind === "foundation") return sel.suit === source.suit;
    return sel.column === source.column && sel.index === source.index;
  };

  const isCardDragging = (source) => {
    if (!drag) return false;
    const sel = drag.source;
    if (sel.kind !== source.kind) return false;
    if (sel.kind === "waste") return true;
    if (sel.kind === "foundation") return sel.suit === source.suit;
    return sel.column === source.column && source.index >= sel.index;
  };

  return (
    <div className="mini-game knowledge-game knowledge-arcade-game knowledge-paciencia">
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <button type="button" onClick={restart}>{copy.restart}</button>
      </div>

      <section className="knowledge-mode-shell" ref={stageRef}>
        <div className="klondike-status-row">
          <span><strong>{copy.match}:</strong> {state.matchId + 1}/{KNOWLEDGE_ARCADE_MATCH_COUNT}</span>
          <span><strong>{copy.moves}:</strong> {state.moves}</span>
          <span><strong>{copy.time}:</strong> {formatTime(elapsedMs)}</span>
          <span><strong>{copy.status}:</strong> {statusLabel}</span>
          {best.bestMoves != null && <span><strong>{copy.bestMoves}:</strong> {best.bestMoves}</span>}
          {best.bestTimeMs != null && <span><strong>{copy.bestTime}:</strong> {formatTime(best.bestTimeMs)}</span>}
        </div>

        <div className="klondike-board">
          <div className="klondike-top-row">
            <div className="klondike-stock-pair">
              <button
                type="button"
                className={`klondike-pile klondike-stock ${stockEmpty ? "empty" : "filled"} ${recyclable ? "recycle" : ""}`}
                onClick={handleStockTap}
                aria-label={recyclable ? copy.recycle : copy.draw}
              >
                {!stockEmpty && (
                  <span className="klondike-card facedown small">
                    <span className="back-pattern" />
                  </span>
                )}
                {stockEmpty && (
                  <span className="klondike-pile-icon">{recyclable ? "↺" : "∅"}</span>
                )}
                <span className="klondike-pile-label">{copy.stock} ({state.stock.length})</span>
              </button>

              <div className={`klondike-pile klondike-waste ${wasteTop ? "filled" : "empty"}`}>
                {wasteTop ? (
                  <KlondikeCard
                    card={wasteTop}
                    selected={isCardSelected({ kind: "waste" })}
                    dragging={isCardDragging({ kind: "waste" })}
                    locale={locale}
                    onPointerDown={(event) => startGesture(event, { kind: "waste" }, [wasteTop])}
                  />
                ) : (
                  <span className="klondike-pile-icon">{copy.waste}</span>
                )}
                <span className="klondike-pile-label">{copy.waste}</span>
              </div>
            </div>

            <div className="klondike-foundations" aria-label={copy.foundationsLabel}>
              {SUITS.map((suit) => {
                const pile = state.foundations[suit];
                const top = topOf(pile);
                const target = { kind: "foundation", suit };
                return (
                  <div
                    key={suit}
                    className={`klondike-pile klondike-foundation ${top ? "filled" : "empty"} ${isRed(suit) ? "red" : "black"}`}
                    data-drop-target={`foundation:${suit}`}
                    onClick={top ? undefined : () => handleEmptyDropClick(target)}
                  >
                    {top ? (
                      <KlondikeCard
                        card={top}
                        selected={isCardSelected(target)}
                        dragging={isCardDragging(target)}
                        locale={locale}
                        onPointerDown={(event) => startGesture(event, target, [top])}
                      />
                    ) : (
                      <span className="klondike-pile-icon">{SUIT_GLYPH[suit]}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="klondike-actions">
            <button type="button" onClick={drawCard} disabled={state.status === "won"}>
              {recyclable ? copy.recycle : copy.draw}
            </button>
            <button type="button" onClick={tryAutoFoundation} disabled={state.status === "won"}>
              {copy.autoFoundation}
            </button>
          </div>

          <div className="klondike-tableau" aria-label={copy.tableauLabel}>
            {state.tableau.map((column, colIndex) => {
              const lastFaceUpIndex = column.findIndex((card) => card.faceUp);
              const columnTarget = { kind: "tableau", column: colIndex };
              return (
                <div
                  key={colIndex}
                  className={`klondike-column ${column.length === 0 ? "empty" : ""}`}
                  data-drop-target={`tableau:${colIndex}`}
                  onClick={column.length === 0 ? () => handleEmptyDropClick(columnTarget) : undefined}
                >
                  {column.length === 0 && <span className="klondike-pile-icon ghost">K</span>}
                  {column.map((card, cardIndex) => {
                    const source = { kind: "tableau", column: colIndex, index: cardIndex };
                    const draggable = card.faceUp && cardIndex >= lastFaceUpIndex;
                    const slice = column.slice(cardIndex);
                    const validStack = card.faceUp && isValidTableauSequence(slice);
                    return (
                      <KlondikeCard
                        key={card.id}
                        card={card}
                        positionIndex={cardIndex}
                        selected={isCardSelected(source)}
                        dragging={isCardDragging(source)}
                        locale={locale}
                        onPointerDown={draggable && validStack
                          ? (event) => startGesture(event, source, slice)
                          : undefined}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <p className="game-message klondike-message">{state.message}</p>

        <details className="klondike-help" open>
          <summary>{copy.helpTitle}</summary>
          <div className="klondike-help-grid">
            <div>
              <h5>{copy.helpRulesTitle}</h5>
              <ul>
                {copy.helpRules.map((line) => <li key={line}>{line}</li>)}
              </ul>
            </div>
            <div>
              <h5>{copy.helpControlsTitle}</h5>
              <ul>
                {copy.helpControls.map((line) => <li key={line}>{line}</li>)}
              </ul>
            </div>
          </div>
        </details>
      </section>

      {drag && (
        <DragLayer
          cards={drag.cards}
          x={drag.x}
          y={drag.y}
          offsetX={drag.offsetX}
          offsetY={drag.offsetY}
          locale={locale}
        />
      )}
    </div>
  );
}

function KlondikeCard({ card, positionIndex = 0, selected = false, dragging = false, locale, onPointerDown }) {
  const className = [
    "klondike-card",
    card.faceUp ? "faceup" : "facedown",
    isRed(card.suit) ? "red" : "black",
    selected ? "selected" : "",
    dragging ? "dragging" : "",
    onPointerDown ? "interactive" : ""
  ].filter(Boolean).join(" ");

  const style = positionIndex > 0 ? { marginTop: card.faceUp ? "var(--klondike-faceup-offset)" : "var(--klondike-facedown-offset)" } : undefined;

  return (
    <div
      className={className}
      style={style}
      onPointerDown={onPointerDown}
      role={onPointerDown ? "button" : undefined}
      tabIndex={onPointerDown ? 0 : undefined}
      aria-label={card.faceUp ? COPY[locale]?.cardLabel?.(card.rank, card.suit) : undefined}
    >
      {card.faceUp ? (
        <>
          <span className="klondike-card-corner top">
            <span className="rank">{rankLabel(card.rank)}</span>
            <span className="suit">{SUIT_GLYPH[card.suit]}</span>
          </span>
          <span className="klondike-card-pip">{SUIT_GLYPH[card.suit]}</span>
          <span className="klondike-card-corner bottom">
            <span className="rank">{rankLabel(card.rank)}</span>
            <span className="suit">{SUIT_GLYPH[card.suit]}</span>
          </span>
        </>
      ) : (
        <span className="back-pattern" />
      )}
    </div>
  );
}

function DragLayer({ cards, x, y, offsetX, offsetY, locale }) {
  return (
    <div className="klondike-drag-layer" style={{ left: x - offsetX, top: y - offsetY }}>
      {cards.map((card, index) => (
        <KlondikeCard
          key={card.id}
          card={card}
          positionIndex={index}
          locale={locale}
        />
      ))}
    </div>
  );
}

export default SolitaireKnowledgeGame;
