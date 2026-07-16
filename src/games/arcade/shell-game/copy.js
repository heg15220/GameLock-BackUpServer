// Bilingual UI copy for Trilero / Shell Game.

export const COPY = {
  es: {
    title: "Trilero",
    subtitle: "Sigue la bola. Solo tienes que no perderla de vista.",
    start: "Empezar",
    again: "Otra vez",
    restart: "Reiniciar",
    fullscreen: "Pantalla completa",
    pause: "Pausa",
    resume: "Reanudar",
    paused: "Pausa",
    level: "Nivel",
    score: "Puntos",
    streak: "Racha",
    lives: "Vidas",
    best: "Mejor racha",
    watch: "Mira bien...",
    shuffling: "¡Atento!",
    pick: "¿Dónde está la bola?",
    hit: "¡Acertaste!",
    miss: "Ahí estaba",
    gameOver: "Se acabó",
    finalScore: "Puntuación final",
    cups: "vasos",
    hint:
      "Toca o haz clic en el vaso que esconde la bola. La bola va siempre debajo de su vaso: si no lo pierdes de vista, aciertas siempre. Cada acierto sube el nivel y la mezcla se endurece; tres fallos y se acaba. Teclas 1-5 para elegir vaso, P pausa, R reinicia y F pantalla completa.",
  },
  en: {
    title: "Shell Game",
    subtitle: "Follow the ball. All you have to do is not lose it.",
    start: "Start",
    again: "Again",
    restart: "Restart",
    fullscreen: "Fullscreen",
    pause: "Pause",
    resume: "Resume",
    paused: "Paused",
    level: "Level",
    score: "Score",
    streak: "Streak",
    lives: "Lives",
    best: "Best streak",
    watch: "Watch closely...",
    shuffling: "Eyes on it!",
    pick: "Where is the ball?",
    hit: "Got it!",
    miss: "It was there",
    gameOver: "Game over",
    finalScore: "Final score",
    cups: "cups",
    hint:
      "Tap or click the cup hiding the ball. The ball always rides under its own cup: keep your eye on it and you cannot be wrong. Every hit climbs a level and tightens the shuffle; three misses and you are out. Keys 1-5 pick a cup, P pauses, R restarts, and F toggles fullscreen.",
  },
};

export function getCopy(locale) {
  return COPY[locale] ?? COPY.en;
}
