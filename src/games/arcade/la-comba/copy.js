// Bilingual UI copy for La Comba (Jump Rope).

export const COPY = {
  es: {
    title: "La comba",
    subtitle: "Dale a la comba con ritmo: cinco Mii saltan si vas a tiempo.",
    start: "Comenzar",
    again: "Otra vez",
    restart: "Reiniciar",
    changeSetup: "Cambiar dificultad",
    fullscreen: "Pantalla completa",
    soundOn: "Sonido ON",
    soundOff: "Sonido OFF",
    soundEnable: "Activar sonido",
    soundDisable: "Silenciar sonido",
    pause: "Pausa",
    resume: "Reanudar",
    paused: "En pausa",
    menuStatus: "Elige dificultad y empieza",
    turn: "¡Dale!",
    jumps: "Saltos",
    target: "Objetivo",
    time: "Tiempo",
    combo: "Seguidos",
    best: "Récord",
    wins: "Victorias",
    trips: "Tropiezos",
    sync: "Compás",
    recovering: "Recogiendo la comba…",
    judges: { perfect: "¡A tiempo!", good: "Bien", miss: "Fuera de tiempo" },
    difficulty: "Dificultad",
    difficulties: { facil: "Fácil", normal: "Normal", dificil: "Difícil" },
    difficultyNotes: {
      facil: "25 saltos, comba lenta y margen ancho.",
      normal: "40 saltos, la comba acelera de verdad.",
      dificil: "60 saltos, muy rápida y sin margen.",
    },
    menuLead:
      "Tú no saltas: tú das a la comba. Marca una vuelta de cuerda a cada golpe de ritmo y los cinco Mii de la plaza irán saltando. La comba acelera sin parar, así que el ritmo que te valía al principio no te va a valer al final.",
    menuTip:
      "Si vas a tiempo les salen notas musicales; si te descompensas, les verás sudar. Tres vueltas seguidas fuera de tiempo y alguien se enreda: la comba se para y hay que recogerla.",
    winLead: "¡Objetivo cumplido!",
    loseLead: "Se acabó el tiempo.",
    hint:
      "Marca cada vuelta de la comba con Espacio, ↑, clic o toque, justo cuando la cuerda toca el suelo. A tiempo suma un salto, fuera de tiempo no. Tres fallos seguidos y alguien tropieza. P pausa, R reinicia, M sonido y F pantalla completa.",
  },
  en: {
    title: "Jump Rope",
    subtitle: "Turn the rope in time and five Miis keep skipping.",
    start: "Start",
    again: "Again",
    restart: "Restart",
    changeSetup: "Change difficulty",
    fullscreen: "Fullscreen",
    soundOn: "Sound ON",
    soundOff: "Sound OFF",
    soundEnable: "Enable sound",
    soundDisable: "Mute sound",
    pause: "Pause",
    resume: "Resume",
    paused: "Paused",
    menuStatus: "Choose a difficulty and start",
    turn: "Turn!",
    jumps: "Jumps",
    target: "Target",
    time: "Time",
    combo: "In a row",
    best: "Record",
    wins: "Wins",
    trips: "Trips",
    sync: "Timing",
    recovering: "Picking the rope back up…",
    judges: { perfect: "On the beat!", good: "Good", miss: "Off the beat" },
    difficulty: "Difficulty",
    difficulties: { facil: "Easy", normal: "Normal", dificil: "Hard" },
    difficultyNotes: {
      facil: "25 jumps, a slow rope and a wide window.",
      normal: "40 jumps, and the rope really does speed up.",
      dificil: "60 jumps, very fast and no room for error.",
    },
    menuLead:
      "You are not the one jumping — you turn the rope. Mark one turn of the rope on every beat and the five Miis in the square keep skipping. The rope speeds up the whole time, so the rhythm that worked at the start will not work at the end.",
    menuTip:
      "Stay on the beat and musical notes come off them; drift and you will watch them sweat. Three turns off the beat in a row and somebody catches a foot: the rope stops and has to be picked back up.",
    winLead: "Target reached!",
    loseLead: "Time ran out.",
    hint:
      "Mark every turn of the rope with Space, ↑, a click or a tap, right as the rope hits the ground. On the beat scores a jump, off the beat does not. Three misses in a row and somebody trips. P pauses, R restarts, M sound, and F toggles fullscreen.",
  },
};

export function getCopy(locale) {
  return COPY[locale] ?? COPY.en;
}

export default getCopy;
