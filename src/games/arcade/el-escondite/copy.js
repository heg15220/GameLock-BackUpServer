// Bilingual UI copy for El Escondite (Hide and Seek).

export const COPY = {
  es: {
    title: "El escondite",
    subtitle: "Tres se esconden en siete sitios. Tienes 5 búsquedas y 30 segundos.",
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
    seeking: "Busca",
    menuStatus: "Elige dificultad y empieza",
    time: "Tiempo",
    searches: "Búsquedas",
    found: "Encontrados",
    score: "Puntos",
    best: "Mejor",
    wins: "Victorias",
    difficulty: "Dificultad",
    difficulties: { facil: "Fácil", normal: "Normal", dificil: "Difícil" },
    difficultyNotes: {
      facil: "Se esconden juntos y el escondite tiembla mucho y a menudo.",
      normal: "Se reparten a medias y el temblor es más breve.",
      dificil: "Cada uno a un sitio distinto y el temblor es un parpadeo.",
    },
    menuLead:
      "Tres jugadores se esconden en los siete sitios del parque y tú los buscas. Tienes cinco búsquedas y treinta segundos; al mirar en un sitio encuentras a todos los que haya dentro, y pueden esconderse varios juntos.",
    menuTip:
      "No adivines: mira. Un escondite ocupado se mueve de vez en cuando, y ese temblor es la única pista que vas a tener.",
    winLead: "¡Los has encontrado a los tres!",
    loseTime: "Se acabó el tiempo.",
    loseSearches: "Te quedaste sin búsquedas.",
    revealLead: "Ahí estaban.",
    hint:
      "Haz clic o toca un escondite para mirar dentro (también valen las teclas 1-7). Un escondite ocupado tiembla de vez en cuando. Cinco búsquedas, 30 segundos y tres escondidos. P pausa, R reinicia, M sonido y F pantalla completa.",
  },
  en: {
    title: "Hide and Seek",
    subtitle: "Three hide across seven places. You get 5 searches and 30 seconds.",
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
    seeking: "Seek",
    menuStatus: "Choose a difficulty and start",
    time: "Time",
    searches: "Searches",
    found: "Found",
    score: "Score",
    best: "Best",
    wins: "Wins",
    difficulty: "Difficulty",
    difficulties: { facil: "Easy", normal: "Normal", dificil: "Hard" },
    difficultyNotes: {
      facil: "They hide together, and the place shakes often and for a while.",
      normal: "They half split up, and the shake is briefer.",
      dificil: "Every one in a different place, and the shake is a blink.",
    },
    menuLead:
      "Three players hide across the park's seven places and you look for them. You get five searches and thirty seconds; searching a place finds everyone inside it, and several of them can hide together.",
    menuTip:
      "Do not guess — watch. An occupied hiding place shifts every so often, and that twitch is the only clue you are going to get.",
    winLead: "You found all three!",
    loseTime: "Time ran out.",
    loseSearches: "You ran out of searches.",
    revealLead: "That is where they were.",
    hint:
      "Click or tap a hiding place to look inside (keys 1-7 work too). An occupied place twitches now and then. Five searches, 30 seconds, three hiders. P pauses, R restarts, M sound, and F toggles fullscreen.",
  },
};

export function getCopy(locale) {
  return COPY[locale] ?? COPY.en;
}

export default getCopy;
