// Bilingual UI copy for Obstáculos Rodantes (Rolling Obstacles).

export const COPY = {
  es: {
    title: "Obstáculos rodantes",
    subtitle: "Salta troncos y barriles y llega el primero al final del puente.",
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
    jump: "¡Salta!",
    distance: "Distancia",
    time: "Tiempo",
    hits: "Choques",
    place: "Puesto",
    best: "Mejor tiempo",
    wins: "Victorias",
    hover: "Suspensión",
    speed: "Velocidad",
    impulse: "Impulsos",
    jumpCue: "ESPACIO / TOQUE",
    you: "Tú",
    rival: "Rival",
    difficulty: "Dificultad",
    difficulties: { facil: "Fácil", normal: "Normal", dificil: "Difícil" },
    difficultyNotes: {
      facil: "Obstáculos separados y rivales que tropiezan mucho.",
      normal: "Se juntan de dos en dos y los rivales fallan poco.",
      dificil: "Muy juntos, muchos barriles y rivales casi limpios.",
    },
    menuLead:
      "Cuatro corredores bajan el puente mientras troncos y barriles ruedan hacia ellos. Gana el primero en cruzar los 100 metros; chocar no te elimina, te frena, y con tres rivales al lado eso basta para perder.",
    menuTip:
      "Una pulsación salta. Estando en el aire, pulsar otra vez te sostiene un poco más: un salto normal cubre un obstáculo suelto, pero para un par pegado hay que machacar el botón y quedarse arriba.",
    winLead: "¡Primero en la meta!",
    loseLead: "Llegaron antes que tú.",
    hint:
      "Espacio, ↑, W, clic o toque para saltar. Pulsa otra vez en el aire para mantenerte suspendido y encadenar dos obstáculos. Chocar te frena 0,7 s. P pausa, R reinicia, M sonido y F pantalla completa.",
  },
  en: {
    title: "Rolling Obstacles",
    subtitle: "Jump the logs and barrels and reach the end of the bridge first.",
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
    jump: "Jump!",
    distance: "Distance",
    time: "Time",
    hits: "Hits",
    place: "Place",
    best: "Best time",
    wins: "Wins",
    hover: "Hang time",
    speed: "Speed",
    impulse: "Boosts",
    jumpCue: "SPACE / TAP",
    you: "You",
    rival: "Rival",
    difficulty: "Difficulty",
    difficulties: { facil: "Easy", normal: "Normal", dificil: "Hard" },
    difficultyNotes: {
      facil: "Obstacles well apart and rivals who stumble a lot.",
      normal: "They come in pairs and the rivals rarely miss.",
      dificil: "Packed tight, plenty of barrels, and near-flawless rivals.",
    },
    menuLead:
      "Four runners head down the bridge while logs and barrels roll toward them. First over the 100 metres wins; hitting something does not knock you out, it slows you down — and with three rivals alongside that is enough to lose.",
    menuTip:
      "One press jumps. Pressing again while you are already in the air holds you up a little longer: a normal jump clears a lone obstacle, but a tight pair needs you to mash and stay up.",
    winLead: "First across the line!",
    loseLead: "They got there before you.",
    hint:
      "Space, ↑, W, a click or a tap to jump. Press again in mid-air to hang there and chain two obstacles. A hit costs you 0.7s of speed. P pauses, R restarts, M sound, and F toggles fullscreen.",
  },
};

export function getCopy(locale) {
  return COPY[locale] ?? COPY.en;
}

export default getCopy;
