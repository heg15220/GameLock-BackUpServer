// Draft de Leyendas NBA — textos bilingües (ES/EN), etiquetas de rol y narrador
// del play-by-play. Mantiene la simulación neutral en idioma: los eventos son
// estructurados y aquí se convierten en frases.

export const ROLE_LABELS = {
  es: { BASE: "Base", ESCOLTA: "Escolta", ALERO: "Alero", ALA_PIVOT: "Ala-Pívot", PIVOT: "Pívot" },
  en: { BASE: "PG", ESCOLTA: "SG", ALERO: "SF", ALA_PIVOT: "PF", PIVOT: "C" },
};

export const ROLE_SHORT = {
  BASE: "BAS", ESCOLTA: "ESC", ALERO: "ALE", ALA_PIVOT: "A-P", PIVOT: "PIV",
};

export function roleLabel(role, lang = "es") {
  return (ROLE_LABELS[lang] || ROLE_LABELS.es)[role] || role;
}

export const UI = {
  es: {
    title: "Draft de Leyendas NBA",
    tagline: "Draftea leyendas de todas las épocas y conquista el anillo.",
    play: "Jugar",
    howto: "Tira el dado para elegir década, escoge 1 de 7 leyendas y repite hasta tener 8. Luego fija tu quinteto y disputa la temporada + playoffs NBA.",
    rollDie: "Tirar el dado",
    rolling: "Tirando…",
    decade: "Década",
    round: "Ronda",
    pickOne: "Elige una carta",
    yourRoster: "Tu plantilla",
    chooseStarters: "Elige tu quinteto titular (5 de 8)",
    starters: "Titulares",
    bench: "Banquillo",
    confirmLineup: "Confirmar quinteto",
    need5: "Selecciona exactamente 5 titulares",
    overall: "MED",
    regularSeason: "Temporada regular",
    standings: "Clasificación",
    playMyGame: "Jugar mi partido",
    nextGame: "Siguiente partido",
    vs: "vs",
    watch: "Ver partido",
    simSpeed: "Velocidad",
    skipToEnd: "Ir al final",
    finalScore: "Marcador final",
    boxScore: "Estadísticas",
    continue: "Continuar",
    playoffs: "Playoffs",
    bracket: "Cuadro",
    champion: "¡CAMPEÓN!",
    championMsg: "levanta el trofeo",
    playAgain: "Jugar de nuevo",
    conference: "Conferencia",
    seed: "Cabeza de serie",
    series: "Serie",
    wins: "V",
    losses: "D",
    eliminated: "Eliminado",
    yourResult: "Tu resultado",
    won: "Victoria",
    lost: "Derrota",
    startPlayoffs: "Empezar playoffs",
    advanceRound: "Avanzar ronda",
    firstRound: "Primera ronda",
    confSemis: "Semifinales de conferencia",
    confFinals: "Finales de conferencia",
    finals: "Finales NBA",
    pts: "PTS", reb: "REB", ast: "AST", stl: "ROB", blk: "TAP",
    min: "MIN", fg: "TC", tp: "T3",
    east: "Este", west: "Oeste",
    simmingRest: "Simulando el resto de la liga…",
  },
  en: {
    title: "NBA Legends Draft",
    tagline: "Draft legends from every era and chase the ring.",
    play: "Play",
    howto: "Roll the die to pick a decade, choose 1 of 7 legends and repeat until you have 8. Then set your starting five and play the season + NBA playoffs.",
    rollDie: "Roll the die",
    rolling: "Rolling…",
    decade: "Decade",
    round: "Round",
    pickOne: "Pick a card",
    yourRoster: "Your roster",
    chooseStarters: "Pick your starting five (5 of 8)",
    starters: "Starters",
    bench: "Bench",
    confirmLineup: "Confirm lineup",
    need5: "Select exactly 5 starters",
    overall: "OVR",
    regularSeason: "Regular season",
    standings: "Standings",
    playMyGame: "Play my game",
    nextGame: "Next game",
    vs: "vs",
    watch: "Watch game",
    simSpeed: "Speed",
    skipToEnd: "Skip to end",
    finalScore: "Final score",
    boxScore: "Box score",
    continue: "Continue",
    playoffs: "Playoffs",
    bracket: "Bracket",
    champion: "CHAMPION!",
    championMsg: "lifts the trophy",
    playAgain: "Play again",
    conference: "Conference",
    seed: "Seed",
    series: "Series",
    wins: "W",
    losses: "L",
    eliminated: "Eliminated",
    yourResult: "Your result",
    won: "Win",
    lost: "Loss",
    startPlayoffs: "Start playoffs",
    advanceRound: "Advance round",
    firstRound: "First round",
    confSemis: "Conference semifinals",
    confFinals: "Conference finals",
    finals: "NBA Finals",
    pts: "PTS", reb: "REB", ast: "AST", stl: "STL", blk: "BLK",
    min: "MIN", fg: "FG", tp: "3P",
    east: "East", west: "West",
    simmingRest: "Simulating the rest of the league…",
  },
};

export function t(lang, key) {
  const l = UI[lang] || UI.es;
  return l[key] ?? UI.es[key] ?? key;
}

// Convierte un evento estructurado del play-by-play en una frase.
export function describeEvent(ev, lang = "es") {
  const a = ev.actor;
  if (lang === "en") {
    switch (ev.kind) {
      case "make3": return `${a} drills a three${ev.assist ? ` (assist ${ev.assist})` : ""}`;
      case "make2": return `${a} scores${ev.assist ? ` (assist ${ev.assist})` : ""}`;
      case "ft": return `${a} makes ${ev.points} free throw${ev.points > 1 ? "s" : ""}`;
      case "steal": return `${a} steals it!`;
      case "block": return `${a} rejects the shot!`;
      case "period": return ev.period > 4 ? `End of OT${ev.period - 4}` : `End of Q${ev.period}`;
      default: return "";
    }
  }
  switch (ev.kind) {
    case "make3": return `${a} clava un triple${ev.assist ? ` (asist. ${ev.assist})` : ""}`;
    case "make2": return `${a} anota${ev.assist ? ` (asist. ${ev.assist})` : ""}`;
    case "ft": return `${a} anota ${ev.points} tiro${ev.points > 1 ? "s" : ""} libre${ev.points > 1 ? "s" : ""}`;
    case "steal": return `¡${a} roba el balón!`;
    case "block": return `¡${a} tapona el tiro!`;
    case "period": return ev.period > 4 ? `Fin de la PR${ev.period - 4}` : `Fin del Q${ev.period}`;
    default: return "";
  }
}

export function periodLabel(period, lang = "es") {
  if (period > 4) return `PR${period - 4}`;
  return `Q${period}`;
}
