import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useGameRuntimeBridge from "../utils/useGameRuntimeBridge";
import resolveBrowserLanguage from "../utils/resolveBrowserLanguage";
import battleshipRadarIcon from "../assets/sprites/battleship-radar.svg";
import battleshipFrigateIcon from "../assets/sprites/battleship-frigate.svg";
import battleshipCarrierIcon from "../assets/sprites/battleship-ship-carrier.svg";
import battleshipBattleshipIcon from "../assets/sprites/battleship-ship-battleship.svg";
import battleshipDestroyerIcon from "../assets/sprites/battleship-ship-destroyer.svg";
import battleshipSubmarineIcon from "../assets/sprites/battleship-ship-submarine.svg";
import battleshipPatrolIcon from "../assets/sprites/battleship-ship-patrol.svg";

const GRID_COLS = 4;
const GRID_ROWS = 3;
const PLAYER = "player";
const OPPONENT = "opponent";
const AI_DELAY_MS = 1300;

const SHIP_CARDS = [
  { id: "carrier", hp: 6, name: { es: "Portaaviones", en: "Carrier" } },
  { id: "battleship", hp: 5, name: { es: "Acorazado", en: "Battleship" } },
  { id: "destroyer", hp: 4, name: { es: "Destructor", en: "Destroyer" } },
  { id: "submarine", hp: 3, name: { es: "Submarino", en: "Submarine" } },
  { id: "patrol", hp: 2, name: { es: "Patrullero", en: "Patrol boat" } }
];

const BASE_HAND_TARGET = 5;
const CARRIER_HAND_TARGET = 7;
const SHIP_ICON_BY_ID = {
  carrier: battleshipCarrierIcon,
  battleship: battleshipBattleshipIcon,
  destroyer: battleshipDestroyerIcon,
  submarine: battleshipSubmarineIcon,
  patrol: battleshipPatrolIcon
};

const COPY_BY_LOCALE = {
  es: {
    title: "Hundir la Flota - Classic Card",
    subtitle: "Version por cartas basada en el reglamento del PDF oficial: coordenadas, clavijas y poderes.",
    mode: "Modo",
    modeAi: "Vs IA",
    modeLocal: "2 jugadores",
    newGame: "Nueva partida",
    continue: "Continuar",
    playerOne: "Jugador 1",
    playerTwo: "Jugador 2",
    ai: "IA",
    phaseBattle: "Batalla",
    phaseHandoff: "Cambio",
    phaseOver: "Final",
    phaseLabel: "Fase",
    turnLabel: "Turno",
    winnerLabel: "Ganador",
    cardsLabel: "Cartas",
    deckLabel: "Mazo",
    reloadLabel: "Recarga",
    sunkLabel: "Naves hundidas",
    objectiveTitle: "Objetivo",
    objective: "Hundir las 5 naves enemigas antes de que el rival hunda las tuyas.",
    rulesTitle: "Reglas del PDF aplicadas",
    rules: [
      "Cada jugador usa 12 cartas de coordenadas (5 naves + 7 fallos) en una cuadrilla 4x3 boca abajo.",
      "Cada turno juegas 1 carta de batalla y luego recargas mano hasta 5 cartas.",
      "Las cartas rojas tambien pueden explorar ocultas; si revelan una nave hacen dano inmediato.",
      "Poderes de nave activos al revelarse: Submarino, Patrullero, Destructor, Acorazado, Portaaviones.",
      "Gana quien hunda las 5 naves enemigas primero."
    ],
    turnGuideTitle: "Flujo del turno",
    turnGuideIdle: "1) Juega 1 carta de mano. 2) Apunta al objetivo valido resaltado. 3) Recarga mano.",
    turnGuideTarget: "Carta seleccionada: elige una coordenada resaltada en amarillo.",
    turnGuideChoice: "Tienes una eleccion de poder pendiente. Resuelvela para continuar.",
    selectedCardLabel: "Carta activa",
    validTargetsHint: "Objetivos validos: brillo amarillo en la cuadrilla correcta.",
    fleetStatusTitle: "Estado de flotas y poderes",
    yourFleetStatus: "Tu flota",
    enemyFleetStatus: "Flota rival",
    fleetPowerLabel: "Poder",
    statusHidden: "Oculta",
    statusRevealed: "Revelada",
    statusSunk: "Hundida",
    powerActive: "Activo",
    powerInactive: "Inactivo",
    powerCarrier: "Recarga a 7 cartas al final de turno.",
    powerBattleship: "+1 clavija roja en cada carta roja jugada.",
    powerDestroyer: "Permite hacer dano con blancas (menos excepcion Submarino).",
    powerSubmarine: "Solo recibe dano de cartas blancas.",
    powerPatrol: "Inicio de turno: repara 1 dano en una nave revelada.",
    yourGrid: "Tu cuadrilla de coordenadas",
    enemyGrid: "Cuadrilla enemiga",
    yourHand: "Tu mano",
    yourDeck: "Tu mazo",
    yourDiscard: "Tu descarte",
    hidden: "Oculta",
    miss: "Fallo",
    shield: "Escudo",
    damage: "Dano",
    chooseCard: "Selecciona una carta de batalla para jugar.",
    chooseEnemyTarget: "Selecciona una carta enemiga objetivo.",
    chooseOwnShieldTarget: "Selecciona una nave revelada propia para aplicar escudo.",
    chooseOwnRepairTarget: "Selecciona una nave propia averiada para reparar.",
    noValidTarget: "Esa carta no tiene objetivo valido ahora mismo.",
    reusedTarget: "Esa coordenada ya estaba revelada o no es valida para esta accion.",
    handoffPlacementTitle: "Cambio de jugador",
    handoffBody: (player) => `Pasa el turno. Ahora juega ${player}.`,
    waitingAi: "Esperando jugada de la IA...",
    controls: "Control rapido: 1) clic en carta de mano, 2) clic en objetivo amarillo. N nueva partida.",
    cardWhite: "Clavija Blanca",
    cardRed: "Clavija Roja",
    cardPowerShield: "Poder: Escudo",
    cardPowerTempo: "Poder: Descarta o juega dos",
    cardPowerRepair: "Poder: Repara o roba tres",
    chooseTempoChoice: "Elige efecto: descartar clavijas blancas o jugar dos cartas mas.",
    chooseRepairChoice: "Elige efecto: reparar una nave o robar tres cartas.",
    chooseDiscardWhite: "Descarta una o mas cartas de Clavija Blanca de tu mano.",
    confirmDiscardWhite: "Confirmar descarte",
    optionDiscardWhite: "Descartar blancas",
    optionPlayTwo: "Jugar dos cartas mas",
    optionRepair: "Reparar nave",
    optionDrawThree: "Robar tres cartas",
    optionSelected: "Seleccionada",
    logDiscardWhite: (actor, amount) => `${actor} descarta ${amount} carta(s) de Clavija Blanca para ciclar mano.`,
    logRevealMiss: (actor, coord) => `${actor} revela ${coord}: fallo.`,
    logRevealShip: (actor, coord, ship) => `${actor} revela ${coord}: ${ship}.`,
    logDamage: (actor, coord, amount) => `${actor} impacta ${coord} por ${amount}.`,
    logShieldAbsorb: (coord, amount) => `${coord} absorbe ${amount} con escudo.`,
    logSunk: (actor, ship) => `${actor} hunde ${ship}.`,
    logShield: (actor, ship) => `${actor} activa escudo sobre ${ship}.`,
    logTempo: (actor) => `${actor} gana dos jugadas extra este turno.`,
    logRepair: (actor, ship) => `${actor} repara 1 punto en ${ship}.`,
    logDrawThree: (actor) => `${actor} roba 3 cartas y mantiene ritmo ofensivo.`,
    logSubmarineResist: (coord) => `${coord}: el Submarino ignora cartas rojas (solo blancas hacen dano).`,
    logBattleshipBoost: (actor) => `${actor} suma +1 clavija roja por Acorazado revelado.`,
    logPtBoatRepair: (actor, ship) => `${actor} usa Patrullero y repara 1 dano en ${ship}.`,
    logCarrierReload: (actor) => `${actor} recarga hasta 7 cartas por Portaaviones activo.`,
    winner: (winner) => `${winner} gana la partida hundiendo toda la flota rival.`,
    skipTurn: "No hay acciones validas: el turno pasa al rival.",
    cancelAction: "Cancelar accion",
    clickToReveal: "Pulsa para jugar",
    aiThinking: "IA analizando cartas...",
    aiActionWhite: "IA: despliega Clavija Blanca para explorar una coordenada.",
    aiActionRed: "IA: lanza Clavija Roja sobre un objetivo enemigo.",
    aiActionShield: "IA: protege una de sus naves con Escudo.",
    aiActionTempo: "IA: activa ritmo para ganar jugadas extra.",
    aiActionRepair: "IA: ejecuta reparacion de casco en su flota.",
    aiActionDraw: "IA: roba tres cartas para abrir nuevas lineas de ataque.",
    tutorialTitle: "Tutorial avanzado: estrategia completa de Hundir la Flota Classic Card",
    tutorialParagraphs: [
      "Hundir la Flota Classic Card es un juego de informacion incompleta y gestion de riesgo. Cada jugador organiza 12 coordenadas en una matriz 4x3: 5 son naves reales y 7 son fallos. Esto hace que cada disparo no sea solo ataque, sino tambien inversion de informacion. La calidad de una jugada no depende unicamente del dano inmediato, sino de cuanto reduce la incertidumbre del rival y de cuanto aumenta la tuya para los siguientes turnos.",
      "La mano de batalla se compone de cartas blancas, cartas rojas y cartas de poder. Las blancas sirven para explorar y, en contextos concretos, tambien para hacer dano; las rojas son presion ofensiva directa; y los poderes cambian el ritmo de la partida. La clave de la jugabilidad es encadenar estas tres capas: primero localizar, despues convertir localizacion en ventaja tactica, y por ultimo transformar esa ventaja en tempo y hundimientos.",
      "Una buena fase inicial suele alternar exploracion y presion. Si disparas solo rojas sin mapa mental del tablero enemigo, desperdicias impacto en zonas de baja probabilidad. Si haces solo exploracion blanca sin preparar seguimiento, entregas turnos de valor al rival. El equilibrio correcto es usar blancas para descubrir patrones y reservar rojas potentes para cuando una coordenada revelada se convierte en objetivo rentable.",
      "La fase media gira alrededor de los poderes de barco y de cartas especiales: Portaaviones extiende recarga, Acorazado aumenta dano rojo, Destructor habilita dano con blancas, Submarino obliga a adaptar tipo de disparo, y Patrullero sostiene tu supervivencia con reparacion. Entender estos poderes en secuencia cambia por completo la lectura del tablero: no es lo mismo un impacto sobre nave sin escudo que sobre una nave protegida y con capacidad de reparacion en la siguiente ronda.",
      "Interpretar una jugada buena implica evaluar tres cosas a la vez: valor tactico inmediato (dano/escudo), valor informacional (coordenadas reveladas o descartadas) y valor de tempo (cuantas acciones de calidad te deja la mano tras recargar). Una jugada mala normalmente ignora una de esas tres dimensiones: por ejemplo, gastar un poder de ritmo cuando no hay objetivos claros, o intentar dano rojo sobre un submarino cuando deberias rotar a blanca.",
      "En defensa, no basta con tener vida restante; hay que administrar ventanas de vulnerabilidad. Aplicar escudo demasiado pronto puede ser ineficiente, pero demasiado tarde puede dejar una nave clave fuera de partida. Reparar no siempre es correcto: si reparas una nave poco relevante y pierdes iniciativa ofensiva, el rival puede compensar con un hundimiento en su turno. Debes priorizar reparacion en naves cuya supervivencia mantenga activo un poder decisivo.",
      "Para cerrar partidas, el objetivo no es acertar mucho, sino acertar donde mas duele. Cuando el rival ya tiene una o dos naves comprometidas, conviene forzar finalizacion de hundimientos en lugar de abrir nuevos frentes. Reducir el numero de naves activas enemigas limita sus opciones de comeback y simplifica tu lectura del tablero. Si vas por delante, prioriza jugadas de baja varianza; si vas por detras, busca lineas de alto impacto aunque impliquen mayor riesgo.",
      "La victoria llega hundiendo las cinco naves enemigas, pero la diferencia entre ganar justo y dominar la partida esta en la disciplina: planificar turnos en bloques de dos rondas, no improvisar cada carta, y leer continuamente que recursos quedan en mazo y descarte. Piensa como comandante: cada accion debe dejar el tablero mejor para el siguiente turno, incluso cuando no produce un dano espectacular en ese instante."
    ],
    tutorialPlaybookTitle: "Lectura de jugadas: buenas vs malas",
    tutorialGoodTitle: "Buenas decisiones",
    tutorialBadTitle: "Errores frecuentes",
    tutorialGoodPlay: [
      "Buena jugada: explorar con blanca una zona de alta probabilidad y, en el siguiente turno, rematar con roja sobre objetivo revelado.",
      "Buena jugada: activar ritmo extra cuando ya tienes objetivos claros y mano capaz de convertir acciones en dano real.",
      "Buena jugada: reparar o escudar una nave que sostiene un poder clave para los siguientes intercambios."
    ],
    tutorialBadPlay: [
      "Mala jugada: disparar rojas a ciegas sin mapa del tablero enemigo.",
      "Mala jugada: gastar poder de tempo sin objetivos, solo para vaciar mano.",
      "Mala jugada: insistir en tipo de carta incorrecto contra un objetivo cuyo poder te obliga a adaptarte."
    ]
  },
  en: {
    title: "Battleship - Classic Card",
    subtitle: "Card-based implementation aligned with the official PDF rules: coordinates, pegs, and powers.",
    mode: "Mode",
    modeAi: "Vs AI",
    modeLocal: "2 players",
    newGame: "New match",
    continue: "Continue",
    playerOne: "Player 1",
    playerTwo: "Player 2",
    ai: "AI",
    phaseBattle: "Battle",
    phaseHandoff: "Handoff",
    phaseOver: "Finished",
    phaseLabel: "Phase",
    turnLabel: "Turn",
    winnerLabel: "Winner",
    cardsLabel: "Cards",
    deckLabel: "Deck",
    reloadLabel: "Reload",
    sunkLabel: "Sunk ships",
    objectiveTitle: "Objective",
    objective: "Sink all 5 enemy ships before the opponent sinks yours.",
    rulesTitle: "Rules applied from the PDF",
    rules: [
      "Each player uses 12 coordinate cards (5 ships + 7 misses) in a 4x3 hidden grid.",
      "Each turn you play 1 battle card and refill your hand up to 5 cards.",
      "Red cards can also scout hidden cards; if they reveal a ship they hit immediately.",
      "Ship powers activate once revealed: Submarine, Patrol Boat, Destroyer, Battleship, Carrier.",
      "First player to sink all 5 enemy ships wins."
    ],
    turnGuideTitle: "Turn flow",
    turnGuideIdle: "1) Play 1 card from hand. 2) Target a valid highlighted card. 3) Reload hand.",
    turnGuideTarget: "Card selected: choose one highlighted coordinate target.",
    turnGuideChoice: "You have a pending power choice. Resolve it to continue.",
    selectedCardLabel: "Active card",
    validTargetsHint: "Valid targets: yellow glow on the correct grid.",
    fleetStatusTitle: "Fleet and power status",
    yourFleetStatus: "Your fleet",
    enemyFleetStatus: "Enemy fleet",
    fleetPowerLabel: "Power",
    statusHidden: "Hidden",
    statusRevealed: "Revealed",
    statusSunk: "Sunk",
    powerActive: "Active",
    powerInactive: "Inactive",
    powerCarrier: "Reload to 7 cards at end of turn.",
    powerBattleship: "+1 red peg on each red card you play.",
    powerDestroyer: "White cards can damage ships and shields.",
    powerSubmarine: "This ship can only be damaged by white cards.",
    powerPatrol: "Start of turn: repair 1 damage on a revealed ship.",
    yourGrid: "Your coordinate grid",
    enemyGrid: "Enemy grid",
    yourHand: "Your hand",
    yourDeck: "Your deck",
    yourDiscard: "Your discard",
    hidden: "Hidden",
    miss: "Miss",
    shield: "Shield",
    damage: "Damage",
    chooseCard: "Select a battle card to play.",
    chooseEnemyTarget: "Select an enemy card target.",
    chooseOwnShieldTarget: "Select one of your revealed ships to shield.",
    chooseOwnRepairTarget: "Select one of your damaged ships to repair.",
    noValidTarget: "This card has no valid target right now.",
    reusedTarget: "That coordinate is already revealed or invalid for this action.",
    handoffPlacementTitle: "Player handoff",
    handoffBody: (player) => `Pass control. ${player} plays now.`,
    waitingAi: "Waiting for AI move...",
    controls: "Quick control: 1) click a hand card, 2) click a yellow target. N starts a new match.",
    cardWhite: "White Peg",
    cardRed: "Red Peg",
    cardPowerShield: "Power: Shield",
    cardPowerTempo: "Power: Discard or play two",
    cardPowerRepair: "Power: Repair or draw three",
    chooseTempoChoice: "Choose effect: discard white pegs or play two more cards.",
    chooseRepairChoice: "Choose effect: repair a ship or draw three cards.",
    chooseDiscardWhite: "Discard one or more White Peg cards from your hand.",
    confirmDiscardWhite: "Confirm discard",
    optionDiscardWhite: "Discard white pegs",
    optionPlayTwo: "Play two more cards",
    optionRepair: "Repair ship",
    optionDrawThree: "Draw three",
    optionSelected: "Selected",
    logDiscardWhite: (actor, amount) => `${actor} discards ${amount} White Peg card(s) to cycle the hand.`,
    logRevealMiss: (actor, coord) => `${actor} reveals ${coord}: miss.`,
    logRevealShip: (actor, coord, ship) => `${actor} reveals ${coord}: ${ship}.`,
    logDamage: (actor, coord, amount) => `${actor} hits ${coord} for ${amount}.`,
    logShieldAbsorb: (coord, amount) => `${coord} absorbs ${amount} with shield.`,
    logSunk: (actor, ship) => `${actor} sinks ${ship}.`,
    logShield: (actor, ship) => `${actor} shields ${ship}.`,
    logTempo: (actor) => `${actor} gains two extra plays this turn.`,
    logRepair: (actor, ship) => `${actor} repairs 1 point on ${ship}.`,
    logDrawThree: (actor) => `${actor} draws 3 cards and keeps pressure.`,
    logSubmarineResist: (coord) => `${coord}: Submarine ignores red cards (white only).`,
    logBattleshipBoost: (actor) => `${actor} gains +1 red peg from revealed Battleship.`,
    logPtBoatRepair: (actor, ship) => `${actor} uses Patrol Boat to repair 1 damage on ${ship}.`,
    logCarrierReload: (actor) => `${actor} reloads to 7 cards from active Carrier.`,
    winner: (winner) => `${winner} wins by sinking the full enemy fleet.`,
    skipTurn: "No valid actions left: turn passes to opponent.",
    cancelAction: "Cancel action",
    clickToReveal: "Click to play",
    aiThinking: "AI is evaluating cards...",
    aiActionWhite: "AI: plays a White Peg to scout a coordinate.",
    aiActionRed: "AI: fires a Red Peg at your fleet.",
    aiActionShield: "AI: shields one of its revealed ships.",
    aiActionTempo: "AI: triggers tempo for extra actions.",
    aiActionRepair: "AI: repairs hull damage on its fleet.",
    aiActionDraw: "AI: draws three cards to expand options.",
    tutorialTitle: "Advanced tutorial: complete Battleship Classic Card guide",
    tutorialParagraphs: [
      "Battleship Classic Card is a hidden-information strategy game. Each player arranges 12 coordinates on a 4x3 grid: 5 ships and 7 misses. Every action is not only about damage, but also about information economy and long-term board control.",
      "Your hand mixes white pegs, red pegs, and power cards. White pegs discover and sometimes deal damage, red pegs apply direct pressure, and power cards reshape tempo. Strong gameplay comes from chaining all three layers instead of treating turns as isolated moves.",
      "Early rounds are about balancing scouting and threat projection. Too much blind aggression wastes resources; too much passive scouting loses initiative. The best opening creates future certainty while preserving high-value red plays for confirmed targets.",
      "Mid game revolves around ship powers and timing windows. Carrier improves reload ceiling, Battleship amplifies red pressure, Destroyer changes white-card value, Submarine alters damage rules, and Patrol Boat sustains durability. Understanding these interactions is the core skill gap.",
      "A good play usually scores in three dimensions at once: immediate tactical value, informational value, and tempo value for the next turn cycle. A weak play often ignores one of these dimensions and looks good only on the current board snapshot.",
      "Defensively, the objective is not just survival but quality survival. Shielding, repairing, and preserving key powers should be done with turn order in mind. Preserving the wrong ship can cost initiative and still lose the race.",
      "Closing a game efficiently means finishing damaged ships instead of spreading pressure. Reducing enemy active ships compresses their options and lowers comeback potential. When behind, you may need higher-variance lines; when ahead, prioritize consistency.",
      "You win by sinking all enemy ships, but dominant matches come from discipline: plan in multi-turn sequences, track deck/discard context, and treat every move as preparation for the next one."
    ],
    tutorialPlaybookTitle: "Play reading: strong vs weak choices",
    tutorialGoodTitle: "Strong decisions",
    tutorialBadTitle: "Common mistakes",
    tutorialGoodPlay: [
      "Strong play: white scout on high-probability zones, then convert with focused red damage.",
      "Strong play: tempo power only when follow-up targets are already identified.",
      "Strong play: defensive resources on ships that preserve decisive powers."
    ],
    tutorialBadPlay: [
      "Weak play: blind red pressure with no information edge.",
      "Weak play: spending tempo effects to cycle hand without board conversion.",
      "Weak play: repeating the wrong card type against targets that require adaptation."
    ]
  }
};

const normalizeLocale = (value) => (value === "es" ? "es" : "en");
const otherSide = (side) => (side === PLAYER ? OPPONENT : PLAYER);
const resolvePlayerLabel = (side, mode, copy) => {
  if (side === PLAYER) return copy.playerOne;
  if (mode === "ai") return copy.ai;
  return copy.playerTwo;
};
const shipName = (shipId, locale) => SHIP_CARDS.find((ship) => ship.id === shipId)?.name?.[locale] ?? shipId;
const shipIcon = (shipId) => SHIP_ICON_BY_ID[shipId] ?? battleshipFrigateIcon;

const isShipPowerActive = (coords, shipId) =>
  coords.some((card) => card.kind === "ship" && card.shipId === shipId && card.revealed && !card.sunk);

const getHandTarget = (coords) => (isShipPowerActive(coords, "carrier") ? CARRIER_HAND_TARGET : BASE_HAND_TARGET);

const canWhiteDamageTarget = (attackerHasDestroyer, targetCard) => {
  if (!targetCard || targetCard.kind !== "ship" || targetCard.sunk) return false;
  if (targetCard.shipId === "submarine") return true;
  return attackerHasDestroyer;
};
const getShipCard = (coords, shipId) => coords.find((card) => card.kind === "ship" && card.shipId === shipId) ?? null;

const shuffle = (values) => {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
};

const createCoordinateDeck = () => {
  const cards = [];
  let index = 0;

  SHIP_CARDS.forEach((ship) => {
    cards.push({
      id: `coord-ship-${ship.id}`,
      index,
      kind: "ship",
      shipId: ship.id,
      hp: ship.hp,
      damage: 0,
      shield: 0,
      revealed: false,
      sunk: false
    });
    index += 1;
  });

  for (let missIndex = 0; missIndex < 7; missIndex += 1) {
    cards.push({
      id: `coord-miss-${missIndex}`,
      index,
      kind: "miss",
      revealed: false,
      damage: 0,
      shield: 0,
      sunk: false
    });
    index += 1;
  }

  return shuffle(cards).map((card, gridIndex) => ({ ...card, index: gridIndex }));
};

let nextBattleCardId = 1;
const createBattleCard = (payload) => ({ id: `battle-${nextBattleCardId++}`, ...payload });
let nextActionFxId = 1;
const createActionFx = (ownerSide, index, type) => ({ id: nextActionFxId++, ownerSide, index, type });

const createBattleDeck = () => {
  const cards = [];

  for (let i = 0; i < 10; i += 1) cards.push(createBattleCard({ type: "white", pegs: 1 }));
  for (let i = 0; i < 6; i += 1) cards.push(createBattleCard({ type: "red", pegs: 1 }));
  for (let i = 0; i < 4; i += 1) cards.push(createBattleCard({ type: "red", pegs: 2 }));
  for (let i = 0; i < 2; i += 1) cards.push(createBattleCard({ type: "red", pegs: 4 }));

  cards.push(createBattleCard({ type: "power", power: "shield" }));
  cards.push(createBattleCard({ type: "power", power: "shield" }));
  cards.push(createBattleCard({ type: "power", power: "discard_or_play_two" }));
  cards.push(createBattleCard({ type: "power", power: "repair_or_draw_three" }));

  return shuffle(cards);
};

const drawCards = (playerState, amount) => {
  let nextDeck = [...playerState.deck];
  let nextDiscard = [...playerState.discard];
  const drawn = [];

  for (let i = 0; i < amount; i += 1) {
    if (!nextDeck.length) {
      if (!nextDiscard.length) break;
      nextDeck = shuffle(nextDiscard);
      nextDiscard = [];
    }
    const card = nextDeck.shift();
    if (card) drawn.push(card);
  }

  return {
    ...playerState,
    deck: nextDeck,
    discard: nextDiscard,
    hand: [...playerState.hand, ...drawn]
  };
};

const drawUpTo = (playerState, target = BASE_HAND_TARGET) => {
  const needed = Math.max(0, target - playerState.hand.length);
  return needed > 0 ? drawCards(playerState, needed) : playerState;
};

const createPlayerState = () => {
  const base = {
    coords: createCoordinateDeck(),
    deck: createBattleDeck(),
    hand: [],
    discard: []
  };
  return drawCards(base, BASE_HAND_TARGET);
};

const coordinateLabel = (index) => {
  const row = Math.floor(index / GRID_COLS);
  const col = index % GRID_COLS;
  return `${String.fromCharCode(65 + col)}-${row + 1}`;
};

const removeCardFromHand = (playerState, cardId) => {
  const card = playerState.hand.find((entry) => entry.id === cardId) ?? null;
  if (!card) return { playerState, card: null };
  return {
    card,
    playerState: {
      ...playerState,
      hand: playerState.hand.filter((entry) => entry.id !== cardId)
    }
  };
};

const discardCardsFromHand = (playerState, cardIds) => {
  const discardSet = new Set(cardIds);
  if (!discardSet.size) return playerState;

  const toDiscard = playerState.hand.filter((card) => discardSet.has(card.id));
  if (!toDiscard.length) return playerState;

  return {
    ...playerState,
    hand: playerState.hand.filter((card) => !discardSet.has(card.id)),
    discard: [...playerState.discard, ...toDiscard]
  };
};

const withCardDiscarded = (playerState, card) => ({
  ...playerState,
  discard: [...playerState.discard, card]
});

const createInitialState = (mode, copy, locale) => ({
  mode,
  phase: "battle",
  handoff: null,
  currentTurn: PLAYER,
  playsLeft: 1,
  pending: null,
  message: copy.chooseCard,
  winner: null,
  players: {
    [PLAYER]: createPlayerState(),
    [OPPONENT]: createPlayerState()
  },
  log: [],
  lastAction: null,
  locale
});

const countSunkShips = (coords) => coords.filter((card) => card.kind === "ship" && card.sunk).length;
const appendLog = (log, entry) => (entry ? [entry, ...log].slice(0, 14) : log);

const getPowerState = (coords) => ({
  carrier: isShipPowerActive(coords, "carrier"),
  battleship: isShipPowerActive(coords, "battleship"),
  destroyer: isShipPowerActive(coords, "destroyer"),
  submarine: isShipPowerActive(coords, "submarine"),
  patrol: isShipPowerActive(coords, "patrol")
});

const getPlayableTargets = (state, side, pending) => {
  const targetSide = pending.type === "target-opponent" ? otherSide(side) : side;
  const targetCards = state.players[targetSide].coords;
  const attackerPowers = getPowerState(state.players[side].coords);

  if (pending.type === "target-opponent") {
    if (pending.action === "white") {
      return targetCards
        .filter((card) => {
          if (card.sunk) return false;
          if (!card.revealed) return true;
          return canWhiteDamageTarget(attackerPowers.destroyer, card);
        })
        .map((card) => card.index);
    }

    return targetCards
      .filter((card) => !card.sunk && (card.kind === "ship" || !card.revealed))
      .map((card) => card.index);
  }

  if (pending.type === "target-own" && pending.action === "shield") {
    return targetCards
      .filter((card) => card.kind === "ship" && card.revealed && !card.sunk)
      .map((card) => card.index);
  }

  if (pending.type === "target-own" && pending.action === "repair") {
    return targetCards
      .filter((card) => card.kind === "ship" && !card.sunk && card.damage > 0)
      .map((card) => card.index);
  }

  return [];
};

const applyPatrolBoatStartRepair = (state, side, copy, locale) => {
  const ownCoords = state.players[side].coords;
  if (!isShipPowerActive(ownCoords, "patrol")) return state;

  const target = [...ownCoords]
    .filter((card) => card.kind === "ship" && card.revealed && !card.sunk && card.damage > 0)
    .sort((a, b) => (b.damage - a.damage) || a.hp - b.hp)[0];

  if (!target) return state;

  const nextCoords = ownCoords.map((card) =>
    card.index === target.index
      ? {
        ...card,
        damage: Math.max(0, card.damage - 1)
      }
      : card
  );

  const nextPlayers = {
    ...state.players,
    [side]: {
      ...state.players[side],
      coords: nextCoords
    }
  };

  const actor = resolvePlayerLabel(side, state.mode, copy);
  const logLine = copy.logPtBoatRepair(actor, shipName(target.shipId, locale));
  return {
    ...state,
    players: nextPlayers,
    log: appendLog(state.log, logLine)
  };
};

const finishAction = (state, side, cardId, extraPlays, message, logLine, winnerMessage = null, copy = null, locale = "en") => {
  const sideState = state.players[side];
  const { card, playerState } = removeCardFromHand(sideState, cardId);
  if (!card) return state;

  let nextPlayers = {
    ...state.players,
    [side]: withCardDiscarded(playerState, card)
  };

  const enemySide = otherSide(side);
  const enemySunk = countSunkShips(nextPlayers[enemySide].coords);
  if (enemySunk >= SHIP_CARDS.length) {
    return {
      ...state,
      players: nextPlayers,
      phase: "game_over",
      winner: side,
      pending: null,
      playsLeft: 0,
      message: winnerMessage ?? message,
      log: logLine ? appendLog(state.log, logLine) : state.log
    };
  }

  const nextPlaysLeft = Math.max(0, state.playsLeft - 1 + extraPlays);
  let nextLog = logLine ? appendLog(state.log, logLine) : state.log;

  if (nextPlaysLeft > 0) {
    return {
      ...state,
      players: nextPlayers,
      playsLeft: nextPlaysLeft,
      pending: null,
      message,
      log: nextLog
    };
  }

  const reloadTarget = getHandTarget(nextPlayers[side].coords);
  nextPlayers = {
    ...nextPlayers,
    [side]: drawUpTo(nextPlayers[side], reloadTarget)
  };
  if (reloadTarget > BASE_HAND_TARGET && copy) {
    const actor = resolvePlayerLabel(side, state.mode, copy);
    nextLog = appendLog(nextLog, copy.logCarrierReload(actor));
  }

  const nextTurn = enemySide;
  let nextState = {
    ...state,
    players: nextPlayers,
    currentTurn: nextTurn,
    playsLeft: 1,
    pending: null,
    message,
    log: nextLog
  };

  if (copy) {
    nextState = applyPatrolBoatStartRepair(nextState, nextTurn, copy, locale);
  }

  if (state.mode === "local") {
    return {
      ...nextState,
      phase: "handoff",
      handoff: { nextPlayer: nextTurn }
    };
  }

  return nextState;
};

const applyPegOnCard = (card, pegCount) => {
  if (card.kind !== "ship" || card.sunk) return { card, damage: 0, absorbed: 0, sunk: false };

  let remaining = pegCount;
  const absorbed = Math.min(remaining, card.shield ?? 0);
  remaining -= absorbed;

  const nextShield = Math.max(0, (card.shield ?? 0) - absorbed);
  const nextDamage = Math.min(card.hp, card.damage + remaining);
  const sunk = nextDamage >= card.hp;

  return {
    card: {
      ...card,
      revealed: true,
      shield: nextShield,
      damage: nextDamage,
      sunk
    },
    damage: remaining,
    absorbed,
    sunk
  };
};

const playWhiteOrRed = (state, side, targetIndex, copy, locale, nextMessage = null) => {
  if (!state.pending || state.pending.type !== "target-opponent") return state;

  const pending = state.pending;
  const enemySide = otherSide(side);
  const enemyCoords = state.players[enemySide].coords;
  const attackerPowers = getPowerState(state.players[side].coords);
  const targetCard = enemyCoords.find((card) => card.index === targetIndex);
  if (!targetCard) return state;

  const validTargets = getPlayableTargets(state, side, pending);
  if (!validTargets.includes(targetIndex)) {
    return {
      ...state,
      message: copy.reusedTarget
    };
  }

  let updatedTarget = targetCard;
  let logLine = null;
  let fxType = "reveal";
  const actor = resolvePlayerLabel(side, state.mode, copy);
  const coord = coordinateLabel(targetIndex);

  if (pending.action === "white") {
    const logs = [];
    if (!targetCard.revealed) {
      if (targetCard.kind === "ship") {
        logs.push(copy.logRevealShip(actor, coord, shipName(targetCard.shipId, locale)));
      } else {
        logs.push(copy.logRevealMiss(actor, coord));
      }
    }

    if (targetCard.kind === "ship" && canWhiteDamageTarget(attackerPowers.destroyer, targetCard)) {
      const pegResult = applyPegOnCard({ ...targetCard, revealed: true }, 1);
      updatedTarget = pegResult.card;
      fxType = pegResult.sunk ? "sunk" : "hit";
      if (pegResult.absorbed > 0) logs.push(copy.logShieldAbsorb(coord, pegResult.absorbed));
      if (pegResult.damage > 0) logs.push(copy.logDamage(actor, coord, pegResult.damage));
      if (pegResult.sunk) logs.push(copy.logSunk(actor, shipName(targetCard.shipId, locale)));
    } else {
      updatedTarget = {
        ...targetCard,
        revealed: true
      };
      fxType = "reveal";
    }
    logLine = logs.join(" ");

    const nextCoords = enemyCoords.map((card) => (card.index === targetIndex ? updatedTarget : card));
    const nextPlayers = {
      ...state.players,
      [enemySide]: {
        ...state.players[enemySide],
        coords: nextCoords
      }
    };

    return finishAction(
      {
        ...state,
        players: nextPlayers,
        lastAction: createActionFx(enemySide, targetIndex, fxType)
      },
      side,
      pending.cardId,
      0,
      nextMessage ?? (logLine || copy.chooseCard),
      logLine,
      copy.winner(actor),
      copy,
      locale
    );
  }

  const pegs = Math.max(1, (pending.pegs ?? 1) + (attackerPowers.battleship ? 1 : 0));
  const logs = [];

  if (targetCard.kind === "miss") {
    updatedTarget = {
      ...targetCard,
      revealed: true
    };
    fxType = "reveal";
    logs.push(copy.logRevealMiss(actor, coord));
  } else {
    if (!targetCard.revealed) {
      logs.push(copy.logRevealShip(actor, coord, shipName(targetCard.shipId, locale)));
    }
    if (targetCard.shipId === "submarine") {
      updatedTarget = {
        ...targetCard,
        revealed: true
      };
      fxType = "block";
      logs.push(copy.logSubmarineResist(coord));
    } else {
      if (attackerPowers.battleship) logs.push(copy.logBattleshipBoost(actor));
      const pegResult = applyPegOnCard({ ...targetCard, revealed: true }, pegs);
      updatedTarget = pegResult.card;
      fxType = pegResult.sunk ? "sunk" : "hit";
      if (pegResult.absorbed > 0) logs.push(copy.logShieldAbsorb(coord, pegResult.absorbed));
      if (pegResult.damage > 0) logs.push(copy.logDamage(actor, coord, pegResult.damage));
      if (pegResult.sunk) logs.push(copy.logSunk(actor, shipName(targetCard.shipId, locale)));
    }
  }
  logLine = logs.join(" ");

  const nextCoords = enemyCoords.map((card) => (card.index === targetIndex ? updatedTarget : card));
  const nextPlayers = {
    ...state.players,
    [enemySide]: {
      ...state.players[enemySide],
      coords: nextCoords
    }
  };

  return finishAction(
    {
      ...state,
      players: nextPlayers,
      lastAction: createActionFx(enemySide, targetIndex, fxType)
    },
    side,
    pending.cardId,
    0,
    nextMessage ?? (logLine || copy.chooseCard),
    logLine,
    copy.winner(actor),
    copy,
    locale
  );
};

const playOwnTargetAction = (state, side, targetIndex, copy, locale, nextMessage = null) => {
  if (!state.pending || state.pending.type !== "target-own") return state;

  const pending = state.pending;
  const ownCoords = state.players[side].coords;
  const targetCard = ownCoords.find((card) => card.index === targetIndex);
  if (!targetCard) return state;

  const validTargets = getPlayableTargets(state, side, pending);
  if (!validTargets.includes(targetIndex)) {
    return {
      ...state,
      message: copy.reusedTarget
    };
  }

  const actor = resolvePlayerLabel(side, state.mode, copy);
  let nextTarget = targetCard;
  let logLine = "";
  let fxType = "repair";

  if (pending.action === "shield") {
    nextTarget = {
      ...targetCard,
      shield: (targetCard.shield ?? 0) + 2
    };
    fxType = "shield";
    logLine = copy.logShield(actor, shipName(targetCard.shipId, locale));
  } else {
    nextTarget = {
      ...targetCard,
      damage: Math.max(0, targetCard.damage - 1)
    };
    fxType = "repair";
    logLine = copy.logRepair(actor, shipName(targetCard.shipId, locale));
  }

  const nextCoords = ownCoords.map((card) => (card.index === targetIndex ? nextTarget : card));
  const nextPlayers = {
    ...state.players,
    [side]: {
      ...state.players[side],
      coords: nextCoords
    }
  };

  return finishAction(
    {
      ...state,
      players: nextPlayers,
      lastAction: createActionFx(side, targetIndex, fxType)
    },
    side,
    pending.cardId,
    pending.action === "repair" ? 1 : 0,
    nextMessage ?? (logLine || copy.chooseCard),
    logLine,
    copy.winner(actor),
    copy,
    locale
  );
};

const hasValidTurnAction = (state, side) => {
  const hand = state.players[side].hand;
  const attackerPowers = getPowerState(state.players[side].coords);
  return hand.some((card) => {
    if (card.type === "white") {
      return state.players[otherSide(side)].coords.some((entry) =>
        !entry.sunk && (!entry.revealed || canWhiteDamageTarget(attackerPowers.destroyer, entry))
      );
    }
    if (card.type === "red") {
      return state.players[otherSide(side)].coords.some((entry) => !entry.sunk);
    }
    if (card.type === "power" && card.power === "shield") {
      return state.players[side].coords.some((entry) => entry.kind === "ship" && entry.revealed && !entry.sunk);
    }
    if (card.type === "power" && card.power === "repair_or_draw_three") {
      return true;
    }
    if (card.type === "power" && card.power === "discard_or_play_two") {
      return true;
    }
    return true;
  });
};

function StrategyBattleshipGame() {
  const locale = useMemo(() => normalizeLocale(resolveBrowserLanguage()), []);
  const copy = useMemo(() => COPY_BY_LOCALE[locale] ?? COPY_BY_LOCALE.en, [locale]);
  const gameRef = useRef(null);
  const aiTimerRef = useRef(0);
  const aiFrameRef = useRef(0);
  const aiLastTsRef = useRef(0);

  const [game, setGame] = useState(() => createInitialState("ai", copy, locale));
  const [aiThinking, setAiThinking] = useState(false);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  const resetGame = useCallback(
    (mode) => {
      aiTimerRef.current = 0;
      setAiThinking(false);
      setGame(createInitialState(mode, copy, locale));
    },
    [copy, locale]
  );

  const resolveCardPlay = useCallback(
    (cardId) => {
      setGame((previous) => {
        if (previous.phase !== "battle" || previous.winner) return previous;

        const side = previous.currentTurn;
        if (previous.mode === "ai" && side === OPPONENT) return previous;
        if (previous.pending) return previous;

        const sideState = previous.players[side];
        const card = sideState.hand.find((entry) => entry.id === cardId);
        if (!card) return previous;

        if (card.type === "white") {
          const pending = { type: "target-opponent", action: "white", cardId, pegs: 0 };
          const targets = getPlayableTargets(previous, side, pending);
          if (!targets.length) return { ...previous, message: copy.noValidTarget };
          return { ...previous, pending, message: copy.chooseEnemyTarget };
        }

        if (card.type === "red") {
          const pending = { type: "target-opponent", action: "red", cardId, pegs: card.pegs ?? 1 };
          const targets = getPlayableTargets(previous, side, pending);
          if (!targets.length) return { ...previous, message: copy.noValidTarget };
          return { ...previous, pending, message: copy.chooseEnemyTarget };
        }

        if (card.type === "power" && card.power === "shield") {
          const pending = { type: "target-own", action: "shield", cardId };
          const targets = getPlayableTargets(previous, side, pending);
          if (!targets.length) return { ...previous, message: copy.noValidTarget };
          return { ...previous, pending, message: copy.chooseOwnShieldTarget };
        }

        if (card.type === "power" && card.power === "discard_or_play_two") {
          const whiteCandidates = sideState.hand.filter((entry) => entry.type === "white" && entry.id !== cardId);
          if (whiteCandidates.length) {
            return {
              ...previous,
              pending: { type: "choice-tempo", cardId },
              message: copy.chooseTempoChoice
            };
          }
          const actor = resolvePlayerLabel(side, previous.mode, copy);
          return finishAction(previous, side, cardId, 2, copy.chooseCard, copy.logTempo(actor), copy.winner(actor), copy, locale);
        }

        if (card.type === "power" && card.power === "repair_or_draw_three") {
          const repairPending = { type: "target-own", action: "repair", cardId };
          const repairTargets = getPlayableTargets(previous, side, repairPending);
          if (repairTargets.length) {
            return {
              ...previous,
              pending: { type: "choice-repair-draw", cardId },
              message: copy.chooseRepairChoice
            };
          }

          const sideAfterDraw = drawCards(previous.players[side], 3);
          const nextState = {
            ...previous,
            players: {
              ...previous.players,
              [side]: sideAfterDraw
            }
          };
          const actor = resolvePlayerLabel(side, previous.mode, copy);
          return finishAction(nextState, side, cardId, 1, copy.chooseCard, copy.logDrawThree(actor), copy.winner(actor), copy, locale);
        }

        return previous;
      });
    },
    [copy, locale]
  );

  const resolvePowerChoice = useCallback(
    (choice) => {
      setGame((previous) => {
        if (previous.phase !== "battle" || previous.winner || !previous.pending) return previous;
        const side = previous.currentTurn;
        if (previous.mode === "ai" && side === OPPONENT) return previous;

        const actor = resolvePlayerLabel(side, previous.mode, copy);
        if (previous.pending.type === "choice-tempo") {
          const cardId = previous.pending.cardId;
          if (choice === "play-two") {
            return finishAction(previous, side, cardId, 2, copy.chooseCard, copy.logTempo(actor), copy.winner(actor), copy, locale);
          }

          if (choice === "discard-white") {
            const whiteCandidates = previous.players[side].hand.filter((entry) => entry.type === "white" && entry.id !== cardId);
            if (!whiteCandidates.length) return { ...previous, pending: null, message: copy.noValidTarget };
            return {
              ...previous,
              pending: { type: "discard-white", cardId, selected: [] },
              message: copy.chooseDiscardWhite
            };
          }
        }

        if (previous.pending.type === "choice-repair-draw") {
          const cardId = previous.pending.cardId;
          if (choice === "repair") {
            const repairPending = { type: "target-own", action: "repair", cardId };
            const repairTargets = getPlayableTargets(previous, side, repairPending);
            if (!repairTargets.length) return { ...previous, pending: null, message: copy.noValidTarget };
            return {
              ...previous,
              pending: repairPending,
              message: copy.chooseOwnRepairTarget
            };
          }

          if (choice === "draw-three") {
            const sideAfterDraw = drawCards(previous.players[side], 3);
            const nextState = {
              ...previous,
              players: {
                ...previous.players,
                [side]: sideAfterDraw
              }
            };
            return finishAction(nextState, side, cardId, 1, copy.chooseCard, copy.logDrawThree(actor), copy.winner(actor), copy, locale);
          }
        }

        return previous;
      });
    },
    [copy, locale]
  );

  const toggleDiscardWhiteCard = useCallback((cardId) => {
    setGame((previous) => {
      if (previous.phase !== "battle" || previous.winner || !previous.pending || previous.pending.type !== "discard-white") {
        return previous;
      }

      const side = previous.currentTurn;
      const selected = Array.isArray(previous.pending.selected) ? previous.pending.selected : [];
      const card = previous.players[side].hand.find((entry) => entry.id === cardId);
      if (!card || card.type !== "white" || card.id === previous.pending.cardId) return previous;

      const alreadySelected = selected.includes(cardId);
      const nextSelected = alreadySelected
        ? selected.filter((id) => id !== cardId)
        : [...selected, cardId];

      return {
        ...previous,
        pending: {
          ...previous.pending,
          selected: nextSelected
        }
      };
    });
  }, []);

  const confirmDiscardWhite = useCallback(() => {
    setGame((previous) => {
      if (previous.phase !== "battle" || previous.winner || !previous.pending || previous.pending.type !== "discard-white") {
        return previous;
      }

      const side = previous.currentTurn;
      const selected = Array.isArray(previous.pending.selected) ? previous.pending.selected : [];
      if (!selected.length) {
        return {
          ...previous,
          message: copy.chooseDiscardWhite
        };
      }

      const sideAfterDiscard = discardCardsFromHand(previous.players[side], selected);
      const nextState = {
        ...previous,
        players: {
          ...previous.players,
          [side]: sideAfterDiscard
        }
      };

      const actor = resolvePlayerLabel(side, previous.mode, copy);
      return finishAction(
        nextState,
        side,
        previous.pending.cardId,
        0,
        copy.chooseCard,
        copy.logDiscardWhite(actor, selected.length),
        copy.winner(actor),
        copy,
        locale
      );
    });
  }, [copy, locale]);

  const resolveTargetClick = useCallback(
    (ownerSide, cardIndex) => {
      setGame((previous) => {
        if (previous.phase !== "battle" || !previous.pending || previous.winner) return previous;
        const side = previous.currentTurn;
        if (previous.mode === "ai" && side === OPPONENT) return previous;

        if (previous.pending.type === "target-opponent") {
          if (ownerSide !== otherSide(side)) return previous;
          return playWhiteOrRed(previous, side, cardIndex, copy, locale);
        }

        if (previous.pending.type === "target-own") {
          if (ownerSide !== side) return previous;
          return playOwnTargetAction(previous, side, cardIndex, copy, locale);
        }

        return previous;
      });
    },
    [copy, locale]
  );

  const cancelPendingAction = useCallback(() => {
    setGame((previous) => {
      if (!previous.pending) return previous;
      return {
        ...previous,
        pending: null,
        message: copy.chooseCard
      };
    });
  }, [copy.chooseCard]);

  useEffect(() => {
    const state = game;
    if (state.phase !== "battle" || state.winner) return;

    if (!hasValidTurnAction(state, state.currentTurn) && !state.pending) {
      setGame((previous) => {
        if (previous.phase !== "battle" || previous.winner) return previous;
        const side = previous.currentTurn;
        const reloadTarget = getHandTarget(previous.players[side].coords);
        const sideAfterDraw = drawUpTo(previous.players[side], reloadTarget);
        const nextSide = otherSide(side);
        let next = {
          ...previous,
          players: {
            ...previous.players,
            [side]: sideAfterDraw
          },
          currentTurn: nextSide,
          playsLeft: 1,
          pending: null,
          message: copy.skipTurn,
          log: appendLog(previous.log, copy.skipTurn)
        };
        if (reloadTarget > BASE_HAND_TARGET) {
          const actor = resolvePlayerLabel(side, previous.mode, copy);
          next = {
            ...next,
            log: appendLog(next.log, copy.logCarrierReload(actor))
          };
        }

        next = applyPatrolBoatStartRepair(next, nextSide, copy, locale);

        if (previous.mode === "local") {
          return {
            ...next,
            phase: "handoff",
            handoff: { nextPlayer: nextSide }
          };
        }

        return next;
      });
    }
  }, [copy, game, locale]);

  const continueHandoff = useCallback(() => {
    setGame((previous) => {
      if (previous.phase !== "handoff" || !previous.handoff) return previous;
      return {
        ...previous,
        phase: "battle",
        handoff: null,
        message: copy.chooseCard
      };
    });
  }, [copy.chooseCard]);

  const runAiTurn = useCallback(() => {
    setGame((previous) => {
      if (previous.mode !== "ai" || previous.phase !== "battle" || previous.currentTurn !== OPPONENT || previous.winner) {
        return previous;
      }

      let working = { ...previous };
      const maxActions = 1;
      let safety = 0;

      while (working.phase === "battle" && working.currentTurn === OPPONENT && working.playsLeft > 0 && !working.winner && safety < maxActions) {
        safety += 1;
        const aiHand = working.players[OPPONENT].hand;
        const enemyCoords = working.players[PLAYER].coords;
        const ownCoords = working.players[OPPONENT].coords;
        const aiPowers = getPowerState(ownCoords);

        const hiddenTargets = enemyCoords.filter((card) => !card.revealed && !card.sunk);
        const revealedShipTargets = enemyCoords
          .filter((card) => card.kind === "ship" && card.revealed && !card.sunk)
          .sort((a, b) => (a.hp - a.damage) - (b.hp - b.damage));
        const redEffectiveTargets = revealedShipTargets.filter((card) => card.shipId !== "submarine");
        const whiteDamageTargets = revealedShipTargets.filter((card) => canWhiteDamageTarget(aiPowers.destroyer, card));
        const anyTargets = enemyCoords.filter((card) => (card.kind === "ship" && !card.sunk) || !card.revealed);
        const shieldTargets = ownCoords.filter((card) => card.kind === "ship" && card.revealed && !card.sunk);
        const repairTargets = ownCoords.filter((card) => card.kind === "ship" && !card.sunk && card.damage > 0);

        let chosen = aiHand.find((card) => card.type === "red" && redEffectiveTargets.length);
        if (!chosen) chosen = aiHand.find((card) => card.type === "white" && (hiddenTargets.length || whiteDamageTargets.length));
        if (!chosen) chosen = aiHand.find((card) => card.type === "red" && anyTargets.length);
        if (!chosen) chosen = aiHand.find((card) => card.type === "power" && card.power === "shield" && shieldTargets.length);
        if (!chosen) chosen = aiHand.find((card) => card.type === "power" && card.power === "repair_or_draw_three");
        if (!chosen) chosen = aiHand.find((card) => card.type === "power" && card.power === "discard_or_play_two");
        if (!chosen) break;

        if (chosen.type === "white") {
          const target = hiddenTargets[0] ?? whiteDamageTargets[0] ?? anyTargets[0];
          if (!target) break;
          working = {
            ...working,
            message: copy.aiActionWhite,
            pending: { type: "target-opponent", action: "white", cardId: chosen.id, pegs: 0 }
          };
          working = playWhiteOrRed(working, OPPONENT, target.index, copy, locale, copy.aiActionWhite);
          continue;
        }

        if (chosen.type === "red") {
          const target = redEffectiveTargets[0] ?? hiddenTargets[0] ?? anyTargets[0];
          if (!target) break;
          working = {
            ...working,
            message: copy.aiActionRed,
            pending: { type: "target-opponent", action: "red", cardId: chosen.id, pegs: chosen.pegs ?? 1 }
          };
          working = playWhiteOrRed(working, OPPONENT, target.index, copy, locale, copy.aiActionRed);
          continue;
        }

        if (chosen.type === "power" && chosen.power === "shield") {
          const target = shieldTargets[0];
          if (!target) {
            const actor = resolvePlayerLabel(OPPONENT, working.mode, copy);
            working = finishAction(
              working,
              OPPONENT,
              chosen.id,
              0,
              copy.chooseCard,
              `${actor}: ${copy.noValidTarget}`,
              copy.winner(actor),
              copy,
              locale
            );
            continue;
          }
          working = {
            ...working,
            message: copy.aiActionShield,
            pending: { type: "target-own", action: "shield", cardId: chosen.id }
          };
          working = playOwnTargetAction(working, OPPONENT, target.index, copy, locale, copy.aiActionShield);
          continue;
        }

        if (chosen.type === "power" && chosen.power === "discard_or_play_two") {
          const actor = resolvePlayerLabel(OPPONENT, working.mode, copy);
          const whiteCards = working.players[OPPONENT].hand.filter((card) => card.type === "white");
          const canDiscardWhite = whiteCards.length > 0;
          const shouldDiscardWhite = canDiscardWhite && !hiddenTargets.length;

          if (shouldDiscardWhite) {
            const discardIds = whiteCards.map((card) => card.id);
            const sideAfterDiscard = discardCardsFromHand(working.players[OPPONENT], discardIds);
            working = {
              ...working,
              players: {
                ...working.players,
                [OPPONENT]: sideAfterDiscard
              }
            };
            working = finishAction(
              working,
              OPPONENT,
              chosen.id,
              0,
              copy.aiActionTempo,
              copy.logDiscardWhite(actor, discardIds.length),
              copy.winner(actor),
              copy,
              locale
            );
            continue;
          }

          working = finishAction(
            working,
            OPPONENT,
            chosen.id,
            2,
            copy.aiActionTempo,
            copy.logTempo(actor),
            copy.winner(actor),
            copy,
            locale
          );
          continue;
        }

        if (chosen.type === "power" && chosen.power === "repair_or_draw_three") {
          const mostDamaged = [...repairTargets].sort((a, b) => (b.damage - a.damage) || (a.hp - a.damage) - (b.hp - b.damage))[0] ?? null;
          const redCardsInHand = working.players[OPPONENT].hand.filter((card) => card.type === "red").length;
          const shouldRepair = Boolean(mostDamaged && ((mostDamaged.hp - mostDamaged.damage) <= 2 || redCardsInHand === 0));

          if (shouldRepair && mostDamaged) {
            working = {
              ...working,
              message: copy.aiActionRepair,
              pending: { type: "target-own", action: "repair", cardId: chosen.id }
            };
            working = playOwnTargetAction(working, OPPONENT, mostDamaged.index, copy, locale, copy.aiActionRepair);
            continue;
          }

          const sideAfterDraw = drawCards(working.players[OPPONENT], 3);
          working = {
            ...working,
            players: {
              ...working.players,
              [OPPONENT]: sideAfterDraw
            }
          };
          const actor = resolvePlayerLabel(OPPONENT, working.mode, copy);
          working = finishAction(
            working,
            OPPONENT,
            chosen.id,
            1,
            copy.aiActionDraw,
            copy.logDrawThree(actor),
            copy.winner(actor),
            copy,
            locale
          );
        }
      }

      return working;
    });
  }, [copy, locale]);

  const stepAiClock = useCallback(
    (elapsedMs) => {
      if (aiTimerRef.current <= 0) return;
      aiTimerRef.current = Math.max(0, aiTimerRef.current - Math.max(0, Number(elapsedMs) || 0));
      if (aiTimerRef.current > 0) return;
      setAiThinking(false);
      runAiTurn();
    },
    [runAiTurn]
  );

  useEffect(() => {
    const needAi =
      game.mode === "ai" &&
      game.phase === "battle" &&
      game.currentTurn === OPPONENT &&
      !game.winner &&
      !game.pending;

    if (needAi) {
      if (aiTimerRef.current <= 0) {
        aiTimerRef.current = AI_DELAY_MS;
        setAiThinking(true);
      }
      return;
    }

    aiTimerRef.current = 0;
    setAiThinking(false);
  }, [game.mode, game.phase, game.currentTurn, game.winner, game.pending]);

  useEffect(() => {
    const frame = (timestamp) => {
      if (!aiLastTsRef.current) aiLastTsRef.current = timestamp;
      const delta = Math.min(140, timestamp - aiLastTsRef.current);
      aiLastTsRef.current = timestamp;
      stepAiClock(delta);
      aiFrameRef.current = window.requestAnimationFrame(frame);
    };

    aiFrameRef.current = window.requestAnimationFrame(frame);
    return () => {
      if (aiFrameRef.current) window.cancelAnimationFrame(aiFrameRef.current);
    };
  }, [stepAiClock]);

  const advanceTime = useCallback(
    (ms = 0) => {
      let remaining = Math.max(0, Number(ms) || 0);
      while (remaining > 0) {
        const step = Math.min(80, remaining);
        stepAiClock(step);
        remaining -= step;
      }
    },
    [stepAiClock]
  );

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "n") {
        event.preventDefault();
        resetGame(gameRef.current?.mode ?? "ai");
      }
      if ((event.key === "Enter" || event.key === " ") && gameRef.current?.phase === "handoff") {
        event.preventDefault();
        continueHandoff();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [continueHandoff, resetGame]);

  const payloadBuilder = useCallback(
    (snapshot) => {
      const playerPowers = getPowerState(snapshot.players[PLAYER].coords);
      const opponentPowers = getPowerState(snapshot.players[OPPONENT].coords);

      return {
        mode: "strategy-classic-card-battleship",
        coordinates: "grid_4x3_card_index_0_to_11",
        locale,
        gameMode: snapshot.mode,
        phase: snapshot.phase,
        currentTurn: snapshot.currentTurn,
        playsLeft: snapshot.playsLeft,
        pending: snapshot.pending,
        lastAction: snapshot.lastAction,
        winner: snapshot.winner,
        aiThinking,
        players: {
          player: {
            hand: snapshot.players[PLAYER].hand.map((card) => ({ type: card.type, pegs: card.pegs ?? null, power: card.power ?? null })),
            deckCount: snapshot.players[PLAYER].deck.length,
            discardCount: snapshot.players[PLAYER].discard.length,
            reloadTarget: getHandTarget(snapshot.players[PLAYER].coords),
            powerState: playerPowers,
            coords: snapshot.players[PLAYER].coords
          },
          opponent: {
            handCount: snapshot.players[OPPONENT].hand.length,
            deckCount: snapshot.players[OPPONENT].deck.length,
            discardCount: snapshot.players[OPPONENT].discard.length,
            reloadTarget: getHandTarget(snapshot.players[OPPONENT].coords),
            powerState: opponentPowers,
            coords: snapshot.players[OPPONENT].coords
          }
        },
        message: snapshot.message,
        log: snapshot.log.slice(0, 12)
      };
    },
    [aiThinking, locale]
  );

  useGameRuntimeBridge(game, payloadBuilder, advanceTime);

  const visibleSide = game.mode === "local" ? game.currentTurn : PLAYER;
  const enemySide = otherSide(visibleSide);

  const visiblePlayer = game.players[visibleSide];
  const visibleEnemy = game.players[enemySide];

  const pendingTargets = game.pending && (game.pending.type === "target-opponent" || game.pending.type === "target-own")
    ? new Set(getPlayableTargets(game, game.currentTurn, game.pending))
    : new Set();

  const isInteractiveTurn = game.phase === "battle" && (!game.winner) && (game.mode === "local" || game.currentTurn === PLAYER);
  const pendingType = game.pending?.type ?? null;
  const discardSelected = pendingType === "discard-white" ? new Set(game.pending.selected ?? []) : new Set();
  const canConfirmDiscard = pendingType === "discard-white" && discardSelected.size > 0;

  const handoffText = copy.handoffBody(resolvePlayerLabel(game.handoff?.nextPlayer ?? game.currentTurn, game.mode, copy));

  const cardLabel = (card) => {
    if (card.type === "white") return copy.cardWhite;
    if (card.type === "red") return `${copy.cardRed} x${card.pegs ?? 1}`;
    if (card.power === "shield") return copy.cardPowerShield;
    if (card.power === "discard_or_play_two") return copy.cardPowerTempo;
    return copy.cardPowerRepair;
  };

  const phaseText = game.phase === "battle" ? copy.phaseBattle : game.phase === "handoff" ? copy.phaseHandoff : copy.phaseOver;
  const selectedPendingCard = game.pending?.cardId
    ? visiblePlayer.hand.find((card) => card.id === game.pending.cardId) ?? null
    : null;

  const coachHint =
    pendingType === "target-opponent" || pendingType === "target-own"
      ? copy.turnGuideTarget
      : pendingType
        ? copy.turnGuideChoice
        : copy.turnGuideIdle;

  const powerTextByShipId = {
    carrier: copy.powerCarrier,
    battleship: copy.powerBattleship,
    destroyer: copy.powerDestroyer,
    submarine: copy.powerSubmarine,
    patrol: copy.powerPatrol
  };

  const buildFleetRows = (coords) =>
    SHIP_CARDS.map((ship) => {
      const shipCard = getShipCard(coords, ship.id);
      const status = !shipCard ? copy.statusHidden : shipCard.sunk ? copy.statusSunk : shipCard.revealed ? copy.statusRevealed : copy.statusHidden;
      return {
        ...ship,
        card: shipCard,
        status,
        active: Boolean(shipCard && shipCard.revealed && !shipCard.sunk),
        powerDescription: powerTextByShipId[ship.id]
      };
    });

  const ownFleetRows = buildFleetRows(visiblePlayer.coords);
  const enemyFleetRows = buildFleetRows(visibleEnemy.coords);
  const getFxClass = (ownerSide, index) => {
    if (!game.lastAction || game.lastAction.ownerSide !== ownerSide || game.lastAction.index !== index) return "";
    return `fx-${game.lastAction.type}`;
  };

  const getFxToken = (ownerSide, index) =>
    (game.lastAction && game.lastAction.ownerSide === ownerSide && game.lastAction.index === index)
      ? game.lastAction.id
      : 0;

  return (
    <div className="mini-game battleship-game">
      <div className="mini-head">
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.subtitle}</p>
        </div>
        <div className="battleship-head-actions">
          <button type="button" onClick={() => resetGame(game.mode)}>{copy.newGame}</button>
        </div>
      </div>

      <div className="battleship-toolbar">
        <div className="battleship-mode-selector">
          <span>{copy.mode}</span>
          <button type="button" className={game.mode === "ai" ? "active" : ""} onClick={() => resetGame("ai")}>{copy.modeAi}</button>
          <button type="button" className={game.mode === "local" ? "active" : ""} onClick={() => resetGame("local")}>{copy.modeLocal}</button>
        </div>

        <div className="battleship-phase-pills">
          <span>{`${copy.phaseLabel}: ${phaseText}`}</span>
          <span>{`${copy.turnLabel}: ${resolvePlayerLabel(game.currentTurn, game.mode, copy)}`}</span>
          <span>{`${copy.winnerLabel}: ${game.winner ? resolvePlayerLabel(game.winner, game.mode, copy) : "-"}`}</span>
          <span>{`${copy.cardsLabel}: ${visiblePlayer.hand.length} | ${copy.deckLabel}: ${visiblePlayer.deck.length} | ${copy.reloadLabel}: ${getHandTarget(visiblePlayer.coords)}`}</span>
          <span>{`${copy.sunkLabel}: ${countSunkShips(visibleEnemy.coords)}/${countSunkShips(visiblePlayer.coords)}`}</span>
        </div>
      </div>

      <section className="battleship-turn-guide" aria-live="polite">
        <h5>{copy.turnGuideTitle}</h5>
        <p>{coachHint}</p>
        {selectedPendingCard ? (
          <p className="battleship-selected-card">
            <strong>{`${copy.selectedCardLabel}:`}</strong> {cardLabel(selectedPendingCard)}
          </p>
        ) : null}
        <p className="battleship-target-hint">{copy.validTargetsHint}</p>
      </section>

      <div className="battleship-rules-panel">
        <article>
          <div className="battleship-panel-head">
            <img src={battleshipRadarIcon} alt="" aria-hidden="true" />
            <h5>{copy.objectiveTitle}</h5>
          </div>
          <p>{copy.objective}</p>
        </article>
        <article>
          <div className="battleship-panel-head">
            <img src={battleshipFrigateIcon} alt="" aria-hidden="true" />
            <h5>{copy.rulesTitle}</h5>
          </div>
          <ul>
            {copy.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </article>
      </div>

      <section className="battleship-long-tutorial" aria-labelledby="battleship-tutorial-title">
        <h5 id="battleship-tutorial-title">{copy.tutorialTitle}</h5>
        <div className="battleship-long-tutorial-body">
          {copy.tutorialParagraphs.map((paragraph, index) => (
            <p key={`battleship-tutorial-paragraph-${index}`}>{paragraph}</p>
          ))}
        </div>
        <div className="battleship-tutorial-playbook">
          <article>
            <h6>{copy.tutorialGoodTitle}</h6>
            <ul>
              {copy.tutorialGoodPlay.map((item, index) => (
                <li key={`battleship-tutorial-good-${index}`}>{item}</li>
              ))}
            </ul>
          </article>
          <article>
            <h6>{copy.tutorialBadTitle}</h6>
            <ul>
              {copy.tutorialBadPlay.map((item, index) => (
                <li key={`battleship-tutorial-bad-${index}`}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      {game.phase === "handoff" ? (
        <section className="battleship-handoff-shell" role="status" aria-live="polite">
          <h5>{copy.handoffPlacementTitle}</h5>
          <p>{handoffText}</p>
          <button type="button" onClick={continueHandoff}>{copy.continue}</button>
        </section>
      ) : null}

      {game.phase !== "handoff" ? (
      <section className="battleship-battle-shell">
        <div className="battleship-battle-layout">
          <div className="battleship-board-wrap">
            <h5>{copy.enemyGrid}</h5>
            <div className="battleship-card-grid" role="grid" aria-label={copy.enemyGrid}>
              {visibleEnemy.coords.map((card) => {
                const selectable = isInteractiveTurn && game.pending && pendingTargets.has(card.index) && game.pending.type === "target-opponent";
                const className = [
                  "battleship-card-tile",
                  card.revealed ? "revealed" : "hidden",
                  card.kind === "ship" && card.revealed ? "ship" : "",
                  card.kind === "miss" && card.revealed ? "miss" : "",
                  card.sunk ? "sunk" : "",
                  selectable ? "selectable" : "",
                  getFxClass(enemySide, card.index)
                ].filter(Boolean).join(" ");

                return (
                  <button
                    key={`enemy-card-${card.id}-${getFxToken(enemySide, card.index)}`}
                    type="button"
                    className={className}
                    onClick={() => resolveTargetClick(enemySide, card.index)}
                    disabled={!selectable}
                  >
                    <span className="coord-label">{coordinateLabel(card.index)}</span>
                    {card.revealed ? (
                      card.kind === "ship" ? (
                        <>
                          <span className="battleship-card-ship">
                            <img src={shipIcon(card.shipId)} alt="" aria-hidden="true" />
                            <span>{shipName(card.shipId, locale)}</span>
                          </span>
                          <span className="battleship-card-meter">
                            <span style={{ width: `${Math.max(0, (1 - card.damage / card.hp) * 100)}%` }} />
                          </span>
                          <small>{`${copy.damage}: ${card.damage}/${card.hp}`}</small>
                        </>
                      ) : (
                        <span>{copy.miss}</span>
                      )
                    ) : (
                      <span>{copy.hidden}</span>
                    )}
                    {card.shield > 0 ? <em>{`${copy.shield}: ${card.shield}`}</em> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="battleship-board-wrap">
            <h5>{copy.yourGrid}</h5>
            <div className="battleship-card-grid" role="grid" aria-label={copy.yourGrid}>
              {visiblePlayer.coords.map((card) => {
                const selectable = isInteractiveTurn && game.pending && pendingTargets.has(card.index) && game.pending.type === "target-own";
                const className = [
                  "battleship-card-tile",
                  card.kind === "ship" ? "ship" : "miss",
                  card.revealed ? "revealed" : "hidden",
                  card.sunk ? "sunk" : "",
                  selectable ? "selectable" : "",
                  getFxClass(visibleSide, card.index)
                ].filter(Boolean).join(" ");

                return (
                  <button
                    key={`own-card-${card.id}-${getFxToken(visibleSide, card.index)}`}
                    type="button"
                    className={className}
                    onClick={() => resolveTargetClick(visibleSide, card.index)}
                    disabled={!selectable}
                  >
                    <span className="coord-label">{coordinateLabel(card.index)}</span>
                    {card.kind === "ship" ? (
                      <>
                        <span className="battleship-card-ship">
                          <img src={shipIcon(card.shipId)} alt="" aria-hidden="true" />
                          <span>{shipName(card.shipId, locale)}</span>
                        </span>
                        <span className="battleship-card-meter">
                          <span style={{ width: `${Math.max(0, (1 - card.damage / card.hp) * 100)}%` }} />
                        </span>
                        <small>{`${copy.damage}: ${card.damage}/${card.hp}`}</small>
                      </>
                    ) : <span>{copy.miss}</span>}
                    {card.shield > 0 ? <em>{`${copy.shield}: ${card.shield}`}</em> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="battleship-fleet-columns">
          <article>
            <h5>{copy.yourHand}</h5>
            <div className="battleship-hand-row">
              {visiblePlayer.hand.map((card) => {
                const canPlayCard = isInteractiveTurn && !game.pending;
                const canToggleDiscard = isInteractiveTurn &&
                  pendingType === "discard-white" &&
                  card.type === "white" &&
                  card.id !== game.pending.cardId;
                const selectedForDiscard = discardSelected.has(card.id);

                return (
                  <button
                    key={card.id}
                    type="button"
                    className={`battleship-hand-card ${card.type} ${card.power ? `power-${card.power}` : ""} ${selectedForDiscard ? "selected" : ""}`}
                    onClick={() => {
                      if (canToggleDiscard) {
                        toggleDiscardWhiteCard(card.id);
                        return;
                      }
                      if (canPlayCard) {
                        resolveCardPlay(card.id);
                      }
                    }}
                    disabled={!(canPlayCard || canToggleDiscard)}
                    title={copy.clickToReveal}
                  >
                    <strong>{cardLabel(card)}</strong>
                    <small>{card.type === "power" ? "POWER" : "BATTLE"}</small>
                    {selectedForDiscard ? <small>{copy.optionSelected}</small> : null}
                  </button>
                );
              })}
            </div>
          </article>

          <article>
            <h5>{copy.yourDeck}</h5>
            <p>{visiblePlayer.deck.length}</p>
            <h5>{copy.yourDiscard}</h5>
            <p>{visiblePlayer.discard.length}</p>
          </article>
        </div>
      </section>
      ) : null}

      <section className="battleship-fleet-status">
        <h5>{copy.fleetStatusTitle}</h5>
        <div className="battleship-fleet-status-grid">
          <article>
            <h6>{copy.yourFleetStatus}</h6>
            <ul>
              {ownFleetRows.map((ship) => (
                <li key={`own-fleet-${ship.id}`}>
                  <img src={shipIcon(ship.id)} alt="" aria-hidden="true" />
                  <div>
                    <strong>{ship.name[locale]}</strong>
                    <span>{ship.status}</span>
                    {ship.card ? <span>{`${copy.damage}: ${ship.card.damage}/${ship.card.hp} | ${copy.shield}: ${ship.card.shield ?? 0}`}</span> : null}
                    <span>{`${copy.fleetPowerLabel}: ${ship.active ? copy.powerActive : copy.powerInactive}`}</span>
                    <small>{ship.powerDescription}</small>
                  </div>
                </li>
              ))}
            </ul>
          </article>
          <article>
            <h6>{copy.enemyFleetStatus}</h6>
            <ul>
              {enemyFleetRows.map((ship) => (
                <li key={`enemy-fleet-${ship.id}`}>
                  <img src={shipIcon(ship.id)} alt="" aria-hidden="true" />
                  <div>
                    <strong>{ship.name[locale]}</strong>
                    <span>{ship.status}</span>
                    {ship.card?.revealed ? <span>{`${copy.damage}: ${ship.card.damage}/${ship.card.hp} | ${copy.shield}: ${ship.card.shield ?? 0}`}</span> : null}
                    <span>{`${copy.fleetPowerLabel}: ${ship.active ? copy.powerActive : copy.powerInactive}`}</span>
                    <small>{ship.powerDescription}</small>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      {pendingType === "choice-tempo" ? (
        <div className="battleship-choice-row">
          <button type="button" onClick={() => resolvePowerChoice("discard-white")}>{copy.optionDiscardWhite}</button>
          <button type="button" onClick={() => resolvePowerChoice("play-two")}>{copy.optionPlayTwo}</button>
        </div>
      ) : null}

      {pendingType === "choice-repair-draw" ? (
        <div className="battleship-choice-row">
          <button type="button" onClick={() => resolvePowerChoice("repair")}>{copy.optionRepair}</button>
          <button type="button" onClick={() => resolvePowerChoice("draw-three")}>{copy.optionDrawThree}</button>
        </div>
      ) : null}

      {pendingType === "discard-white" ? (
        <div className="battleship-choice-row">
          <button type="button" onClick={confirmDiscardWhite} disabled={!canConfirmDiscard}>{copy.confirmDiscardWhite}</button>
        </div>
      ) : null}

      {game.pending ? (
        <button type="button" className="battleship-cancel" onClick={cancelPendingAction}>{copy.cancelAction}</button>
      ) : null}

      <p className="game-message battleship-message">{game.message}</p>
      <p className="battleship-controls">{game.mode === "ai" && game.currentTurn === OPPONENT ? copy.waitingAi : copy.controls}</p>
      {aiThinking ? (
        <p className="battleship-ai-wait">
          {game.mode === "ai" && game.currentTurn === OPPONENT && game.message && game.message !== copy.chooseCard
            ? game.message
            : copy.aiThinking}
        </p>
      ) : null}

      <ul className="game-log battleship-log">
        {game.log.length ? game.log.map((entry, idx) => <li key={`card-log-${idx}`}>{entry}</li>) : <li>{copy.chooseCard}</li>}
      </ul>
    </div>
  );
}

export default StrategyBattleshipGame;
