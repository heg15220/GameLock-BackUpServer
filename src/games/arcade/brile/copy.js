// Bilingual UI copy for Brilé (Dodgeball / balón prisionero).

export const COPY = {
  es: {
    title: "Brilé",
    subtitle: "Balón prisionero en el cementerio: brila a los rivales y vacía su campo.",
    chooseDifficulty: "Elige dificultad",
    difficulties: { facil: "Fácil", normal: "Normal", dificil: "Difícil" },
    difficultyHints: {
      facil: "IA que falla, esquiva poco y tarda en lanzar.",
      normal: "IA equilibrada: buena puntería y reflejos.",
      dificil: "IA rápida y certera que atrapa y esquiva mucho.",
    },
    menuLead:
      "Balón prisionero 6 contra 6 en un cementerio vallado partido por la línea central. Manejas a UN jugador del equipo azul (el resto son IA). Con el balón, pulsa Lanzar y va al rival más peligroso; si le das antes de que bote, queda brilado y va al cementerio de detrás de su campo. Pulsa Atrapar justo cuando te llega un balón para cazarlo al vuelo y mandar al lanzador al cementerio; o muévete para esquivar. Desde el cementerio también se lanza, y si brilas a un rival vuelves a tu campo. Gana el equipo que deja al rival sin nadie en su campo.",
    // HUD / stage
    teamYou: "Azul (tú)",
    teamRival: "Rojo",
    inCourt: "en campo",
    grace: "¡Preparados!",
    incoming: "¡ATRAPA!",
    prisonBanner: "Estás en el cementerio: lanza y brila para volver.",
    throwPrompt: "Pulsa Lanzar",
    // controls
    move: "Mover",
    throw: "Lanzar",
    catch: "Atrapar",
    // result
    youWin: "¡Ganó tu equipo!",
    youLose: "Tu equipo cayó",
    durationLabel: "Duración",
    hitsLabel: "Tus brilados",
    catchesLabel: "Tus atrapadas",
    best: "Mejor",
    seconds: "s",
    again: "Otra vez",
    changeDifficulty: "Cambiar dificultad",
    restart: "Reiniciar",
    fullscreen: "Pantalla completa",
    soundOn: "Sonido ON",
    soundOff: "Sonido OFF",
    soundEnable: "Activar sonido",
    soundDisable: "Silenciar sonido",
    pause: "Pausa",
    resume: "Reanudar",
    paused: "En pausa",
    menuPrompt: "Elige la dificultad en los botones del panel para empezar.",
    overPrompt: "Usa «Otra vez» o «Cambiar» en los botones del panel.",
    hint:
      "Muévete con WASD o las flechas (arrastra sobre el tablero o usa la cruceta en móvil). Con el balón, Espacio/J lanza al rival más peligroso; K/Mayús atrapa (púlsalo justo cuando te llega para cazarlo y brilar al lanzador). No puedes cruzar la línea central. Enter empieza, P pausa, R reinicia, M sonido y F pantalla completa.",
  },
  en: {
    title: "Dodgeball",
    subtitle: "Graveyard dodgeball: strike out the rivals and empty their court.",
    chooseDifficulty: "Choose difficulty",
    difficulties: { facil: "Easy", normal: "Normal", dificil: "Hard" },
    difficultyHints: {
      facil: "AI that misses, rarely dodges and is slow to throw.",
      normal: "Balanced AI: good aim and reflexes.",
      dificil: "Fast, accurate AI that catches and dodges a lot.",
    },
    menuLead:
      "6-a-side dodgeball in a fenced graveyard split by a centre line. You control ONE player on the blue team (the rest are AI). Holding the ball, press Throw and it flies at the most dangerous rival; hit them before it bounces and they're out, sent to the graveyard behind their court. Press Catch just as a ball reaches you to snatch it midair and send the thrower out instead — or move to dodge. Prisoners throw too, and landing a hit brings you back. A team wins when the other has nobody left in its court.",
    teamYou: "Blue (you)",
    teamRival: "Red",
    inCourt: "in court",
    grace: "Get ready!",
    incoming: "CATCH!",
    prisonBanner: "You're in the graveyard: throw and hit to return.",
    throwPrompt: "Press Throw",
    move: "Move",
    throw: "Throw",
    catch: "Catch",
    youWin: "Your team wins!",
    youLose: "Your team fell",
    durationLabel: "Duration",
    hitsLabel: "Your hits",
    catchesLabel: "Your catches",
    best: "Best",
    seconds: "s",
    again: "Again",
    changeDifficulty: "Change difficulty",
    restart: "Restart",
    fullscreen: "Fullscreen",
    soundOn: "Sound ON",
    soundOff: "Sound OFF",
    soundEnable: "Enable sound",
    soundDisable: "Mute sound",
    pause: "Pause",
    resume: "Resume",
    paused: "Paused",
    menuPrompt: "Pick the difficulty from the panel buttons to start.",
    overPrompt: "Use «Again» or «Change» from the panel buttons.",
    hint:
      "Move with WASD or the arrows (drag on the field or use the D-pad on mobile). Holding the ball, Space/J throws at the most dangerous rival; K/Shift catches (press it right as a ball reaches you to snatch it and send the thrower out). You can't cross the centre line. Enter starts, P pauses, R restarts, M sound, and F toggles fullscreen.",
  },
};

export function getCopy(locale) {
  return COPY[locale] ?? COPY.en;
}

export default getCopy;
