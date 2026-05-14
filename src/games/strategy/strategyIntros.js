/**
 * Pre-game intro copy for every strategy-category game.
 *
 * Shape per entry:
 *   {
 *     icon:        single glyph or short text shown in the hero badge
 *     accent:      primary accent colour for the intro card
 *     accentSoft:  soft tint used as the hero badge background
 *     es / en:     localized blocks (eyebrow, title, lead, what, bullets, cta, configHint)
 *   }
 */

const STRATEGY_INTROS = {
  "strategy-chess-grandmaster": {
    icon: "♚",
    accent: "#0f5a74",
    accentSoft: "#dff1f6",
    es: {
      eyebrow: "Estrategia / Ajedrez",
      title: "Grandmaster Chess Arena",
      lead: "Ajedrez clasico con reglas FIDE completas e IA por niveles para todos los publicos.",
      what:
        "El ajedrez es un duelo a 64 casillas en el que cada jugador maniobra rey, dama, torres, alfiles, caballos y peones para dar jaque mate al rey contrario. En esta version te enfrentas a una IA con cuatro niveles, desde principiante hasta experto, y dispones de notacion algebraica para repasar tus jugadas.",
      bullets: [
        "Movimientos legales, enroque, captura al paso y promocion de peon.",
        "Deteccion automatica de jaque, mate, ahogado y tablas reglamentarias.",
        "IA con cuatro niveles ajustables antes de empezar la partida."
      ],
      cta: "Empezar partida",
      configHint:
        "Tras pulsar el boton elegiras color de piezas, dificultad y otras opciones en los paneles. Cuando este todo a tu gusto, usa el boton Iniciar partida para comenzar."
    },
    en: {
      eyebrow: "Strategy / Chess",
      title: "Grandmaster Chess Arena",
      lead: "Classic chess with complete FIDE rules and a multi-level AI suitable for any audience.",
      what:
        "Chess is a 64-square duel where each side moves king, queen, rooks, bishops, knights and pawns to checkmate the rival king. In this version you face an AI with four difficulty levels, from beginner to expert, and you get full algebraic notation to review every move.",
      bullets: [
        "Legal-move validation, castling, en passant and pawn promotion.",
        "Automatic check, checkmate, stalemate and regulatory-draw detection.",
        "Four AI levels you can pick before the match starts."
      ],
      cta: "Start match",
      configHint:
        "Once you press the button you can choose your colour, difficulty and other options on the panels. When everything looks right, hit Start match to play."
    }
  },

  "strategy-damas-clasicas": {
    icon: "⛂",
    accent: "#7c2d12",
    accentSoft: "#fde7d7",
    es: {
      eyebrow: "Estrategia / Damas",
      title: "Damas Estrategia Pro",
      lead: "Damas 8x8 con capturas encadenadas, control de errores e IA por niveles.",
      what:
        "Las damas son un juego de tablero por turnos en el que mueves tus 12 fichas en diagonal para capturar las del rival saltando por encima. Las fichas que llegan al fondo se coronan como damas y pueden moverse en ambas direcciones. Aqui ademas se penalizan los movimientos ilegales y existen reglas configurables para resolver los bloqueos.",
      bullets: [
        "Capturas multiples encadenadas y prioridad de la dama al capturar.",
        "Cuatro niveles de IA y reglas competitivas con limite de errores.",
        "Modo de bloqueo configurable: derrota, tablas o resolucion por material."
      ],
      cta: "Empezar partida",
      configHint:
        "Antes de jugar podras escoger nivel de IA, color y reglas de bloqueo en los paneles. Despues pulsa Iniciar partida para abrir el tablero."
    },
    en: {
      eyebrow: "Strategy / Checkers",
      title: "Checkers Strategy Pro",
      lead: "8x8 checkers with chain captures, mistake limits and a multi-level AI.",
      what:
        "Checkers is a turn-based board game where you move your 12 pieces diagonally to capture the rival's by jumping over them. Pieces that reach the far row get crowned as kings and can move in both directions. This version also penalises illegal moves and offers configurable rules to resolve blocked positions.",
      bullets: [
        "Chain captures with king priority when capturing.",
        "Four AI levels and competitive rules with a mistake limit.",
        "Configurable block resolution: loss, draw or material count."
      ],
      cta: "Start match",
      configHint:
        "Before playing you can pick AI level, side colour and block-rule mode on the panels. Then press Start match to load the board."
    }
  },

  "strategy-sudoku-tecnicas": {
    icon: "▒",
    accent: "#1d4ed8",
    accentSoft: "#dde7ff",
    es: {
      eyebrow: "Estrategia / Sudoku",
      title: "Sudoku Tecnicas Pro",
      lead: "Sudoku 9x9 clasico con pistas razonadas y dificultades ajustables.",
      what:
        "El Sudoku consiste en rellenar una rejilla de 9x9 con numeros del 1 al 9 sin repetir en ninguna fila, columna ni cuadricula 3x3. Esta version genera tableros con solucion unica y, cuando te atascas, puede aplicar una pista razonada empleando tecnicas clasicas como barrido en linea, grupo completo o recuento.",
      bullets: [
        "Generador determinista de tableros con solucion unica.",
        "Tres dificultades segun la cantidad de pistas iniciales.",
        "Sistema de pistas con etiqueta de la tecnica logica utilizada."
      ],
      cta: "Empezar partida",
      configHint:
        "Tras este boton podras seleccionar dificultad y opciones en los paneles. Cuando lo tengas claro pulsa Iniciar partida para empezar a resolver."
    },
    en: {
      eyebrow: "Strategy / Sudoku",
      title: "Sudoku Techniques Pro",
      lead: "Classic 9x9 Sudoku with reasoned hints and adjustable difficulties.",
      what:
        "Sudoku is about filling a 9x9 grid with numbers 1 to 9 without repeating any digit in a row, column or 3x3 box. This version generates boards with a unique solution and, when you get stuck, can apply a reasoned hint using classic techniques such as line sweeping, naked sets or counting.",
      bullets: [
        "Deterministic board generator with a unique solution per match.",
        "Three difficulty modes based on initial-clue count.",
        "Hint system labelled with the logical technique applied."
      ],
      cta: "Start match",
      configHint:
        "After pressing the button you can choose difficulty and other options on the panels. Then hit Start match to begin solving."
    }
  },

  "strategy-hundir-flota-pro": {
    icon: "⚓",
    accent: "#1e3a8a",
    accentSoft: "#dde6ff",
    es: {
      eyebrow: "Estrategia / Hundir la flota",
      title: "Hundir la Flota Pro",
      lead: "Edicion Classic Card 4x3 con coordenadas ocultas, clavijas y poderes tacticos.",
      what:
        "Hundir la Flota es un duelo naval por turnos en el que cada jugador esconde su flota y dispara a coordenadas enemigas hasta hundirla. Esta adaptacion sigue el reglamento de la version Classic Card: organizas 12 cartas de coordenadas (5 naves y 7 fallos) en una cuadricula 4x3 boca abajo y gestionas una mano de 5 cartas de batalla con clavijas y poderes.",
      bullets: [
        "Mano de 5 cartas con clavijas blancas/rojas y poderes tacticos.",
        "Cartas de poder con decisiones: escudo, descarte, jugar dos o robar tres.",
        "Modo IA o local 2 jugadores con handoff oculto entre turnos."
      ],
      cta: "Empezar partida",
      configHint:
        "Tras pulsar el boton podras elegir modo (IA o local) y otras opciones en los paneles. Cuando lo confirmes, Iniciar partida abrira la mesa de combate."
    },
    en: {
      eyebrow: "Strategy / Battleship",
      title: "Battleship Pro",
      lead: "Classic Card 4x3 edition with hidden coordinates, peg cards and tactical powers.",
      what:
        "Battleship is a turn-based naval duel where each player hides their fleet and fires at enemy coordinates until everything is sunk. This adaptation follows the Classic Card ruleset: you arrange 12 coordinate cards face-down (5 ships and 7 misses) on a 4x3 grid and manage a five-card battle hand of pegs and powers.",
      bullets: [
        "Five-card hand with white/red pegs and tactical power cards.",
        "Power cards with choices: shield, discard, play two or draw three.",
        "AI mode or local two-player with hidden handoff between turns."
      ],
      cta: "Start match",
      configHint:
        "Once you press the button you can pick mode (AI or local) and other options on the panels. Confirm with Start match to open the battle table."
    }
  },

  "strategy-poker-holdem-no-bet": {
    icon: "♠",
    accent: "#065f46",
    accentSoft: "#d6f0e3",
    es: {
      eyebrow: "Estrategia / Poker clasico",
      title: "Poker Clasico Draw Con Apuestas",
      lead: "Poker clasico de 5 cartas con ciegas, bote real y mesa de hasta 8 IAs.",
      what:
        "El poker clasico de 5 cartas es un juego de baraja en el que cada jugador recibe cinco cartas, juega una ronda de apuestas, descarta hasta cinco cartas para mejorar su mano y disputa una segunda ronda antes del showdown. Aqui hay ciegas pequena/grande, bote real y todas las acciones tipicas: pasar, igualar, subir, all-in o retirarse.",
      bullets: [
        "Bote real con ciegas, raises, all-ins y resolucion en showdown.",
        "Descarte tactico de 0 a 5 cartas entre las dos rondas de apuesta.",
        "Mesa configurable para 2 a 9 jugadores (tu + 1 a 8 IAs)."
      ],
      cta: "Empezar partida",
      configHint:
        "Tras pulsar el boton podras configurar stack inicial, ciegas, meta de fichas y numero de IAs en los paneles. Iniciar partida repartira las primeras cartas."
    },
    en: {
      eyebrow: "Strategy / Classic Poker",
      title: "Classic Draw Poker With Betting",
      lead: "5-card draw poker with blinds, a real pot and tables up to 8 AIs.",
      what:
        "Classic 5-card draw poker is a card game where each player receives five cards, runs a betting round, discards up to five cards to improve their hand, and plays a second round before the showdown. Here you have small/big blinds, a real pot and all the standard actions: check, call, raise, all-in or fold.",
      bullets: [
        "Real pot with blinds, raises, all-ins and showdown resolution.",
        "Tactical 0-to-5-card discard between the two betting rounds.",
        "Configurable table for 2 to 9 players (you + 1 to 8 AIs)."
      ],
      cta: "Start match",
      configHint:
        "After pressing the button you can configure starting stack, blinds, chip target and the number of AIs on the panels. Start match deals the first hand."
    }
  },

  "strategy-parchis-ludoteka": {
    icon: "⚄",
    accent: "#9a3412",
    accentSoft: "#ffe5d2",
    es: {
      eyebrow: "Estrategia / Parchis",
      title: "Parchis Ludoteka Arena",
      lead: "Parchis estrategico individual (tu vs 3 IAs) con capturas, barreras y bonus.",
      what:
        "El parchis es un juego de mesa por turnos en el que mueves tus cuatro fichas alrededor del tablero segun el resultado de un dado, intentando llegar a casa antes que tus rivales. Esta version implementa las reglas clave de Ludoteka: salida obligatoria con 5, turno extra por 6, regla de tres seises, casillas seguras, capturas, barreras y llegada exacta a meta.",
      bullets: [
        "Reglas nucleares: 5 de salida, turno extra por 6 y triple 6 con penalizacion.",
        "Bonus encadenables de +10 al coronar y +20 al capturar ficha rival.",
        "Tres IAs con perfil diferenciado: facil, media y dificil."
      ],
      cta: "Empezar partida",
      configHint:
        "Tras pulsar el boton podras elegir tu color de fichas y otros ajustes en los paneles. Despues pulsa Iniciar partida para tirar el primer dado."
    },
    en: {
      eyebrow: "Strategy / Board",
      title: "Ludoteka Arena",
      lead: "Solo strategy board game (you vs 3 AIs) with captures, barriers and bonuses.",
      what:
        "It is a turn-based board game where you move your four tokens around the board based on a dice roll, trying to reach home before your opponents. This version implements the key Ludoteka rules: mandatory exit on a 5, extra turn on a 6, triple-six rule, safe squares, captures, barriers and exact-roll finish.",
      bullets: [
        "Core rules: 5 to exit, extra turn on 6, triple-6 penalty.",
        "Stackable +10 (crowning) and +20 (capturing) bonuses.",
        "Three AI profiles: easy, medium and hard."
      ],
      cta: "Start match",
      configHint:
        "After pressing the button you can pick your token colour and other options on the panels. Then press Start match to roll the first die."
    }
  },

  "strategy-baraja-ia-arena": {
    icon: "♦",
    accent: "#854d0e",
    accentSoft: "#fdecc7",
    es: {
      eyebrow: "Estrategia / Baraja",
      title: "Baraja IA Arena",
      lead: "Tres modalidades en una mesa: Brisca/Tute, Mus y Escoba del 15.",
      what:
        "Esta mesa de cartas reune tres juegos clasicos. Brisca y Tute son juegos de bazas en los que ganas la baza con la carta mas alta del palo o un triunfo. Mus es un juego de envites por parejas con grandes, chicas, pares y juego. Escoba del 15 consiste en sumar 15 puntos combinando una carta tuya con cartas de la mesa para capturarlas. Puedes cambiar de modalidad en cualquier momento desde el selector superior.",
      bullets: [
        "Brisca/Tute con motor de bazas y baraja segun idioma del navegador.",
        "Mus configurable a 40 piedras con 2, 4 o 6 jugadores (duelo, parejas o 3v3).",
        "Escoba del 15 para 2 a 4 jugadores con opcion de recogida obligatoria."
      ],
      cta: "Empezar partida",
      configHint:
        "Tras pulsar el boton elegiras la modalidad y los ajustes de cada juego en los paneles. Despues podras iniciar la mano correspondiente."
    },
    en: {
      eyebrow: "Strategy / Card Table",
      title: "AI Card Arena",
      lead: "Three modes on one table: Brisca/Tute, Mus and Sweep 15.",
      what:
        "This card table bundles three classic games. Brisca and Tute are trick-taking games where you win the trick with the highest card of the lead suit or a trump. Mus is a betting game in pairs with grandes, chicas, pares and juego. Sweep 15 is about summing 15 points by combining one of your cards with table cards to capture them. You can switch between modes at any time using the top selector.",
      bullets: [
        "Brisca/Tute with a trick-taking engine and locale-aware deck.",
        "Mus to 40 stones with 2, 4 or 6 players (duel, pairs or 3v3).",
        "Sweep 15 for 2 to 4 players with optional forced pickups."
      ],
      cta: "Start match",
      configHint:
        "After pressing the button you can choose mode and per-game settings on the panels. Then start the corresponding hand."
    }
  },

  "strategy-mansion-triple-enigma": {
    icon: "❖",
    accent: "#581c87",
    accentSoft: "#ecdcff",
    es: {
      eyebrow: "Estrategia / Misterio",
      title: "Mansion Triple Enigma",
      lead: "Deduccion competitiva contra IA adaptativa con faroles y pistas publicas.",
      what:
        "Mansion Triple Enigma es un juego de deduccion estilo misterio: hay un sobre secreto con un sospechoso, un arma y una sala. En tu turno te mueves por las habitaciones, lanzas sospechas para que tus rivales muestren cartas que las descarten y vas eliminando posibilidades hasta atreverte con la acusacion final. Tres IAs con memoria juegan contigo y pueden farolear cuando convenga.",
      bullets: [
        "Sobre secreto con una carta por categoria: sospechoso, arma y sala.",
        "Refutacion en orden de turno con informacion privada parcial.",
        "IA con memoria, mapa de sospecha y faroles contextuales."
      ],
      cta: "Empezar partida",
      configHint:
        "Tras pulsar el boton podras configurar dificultad y opciones en los paneles. Despues pulsa Iniciar partida para abrir el caso."
    },
    en: {
      eyebrow: "Strategy / Mystery",
      title: "Triple Enigma Mansion",
      lead: "Competitive deduction against adaptive AIs with bluffs and public hints.",
      what:
        "Triple Enigma Mansion is a mystery-style deduction game: a sealed envelope hides one suspect, one weapon and one room. On your turn you move between rooms, raise suggestions so rivals must show cards that disprove them, and narrow possibilities until you dare attempt the final accusation. Three AIs with memory play against you and may bluff when it suits them.",
      bullets: [
        "Sealed envelope with one card per category: suspect, weapon and room.",
        "Refutation in turn order with partial private information.",
        "AIs with memory, suspicion maps and contextual bluffing."
      ],
      cta: "Start match",
      configHint:
        "After pressing the button you can tune difficulty and options on the panels. Then press Start match to open the case."
    }
  },

  "arcade-dig-hole-treasure": {
    icon: "⛏",
    accent: "#7c2d12",
    accentSoft: "#fde7d7",
    es: {
      eyebrow: "Arcade / Excavacion",
      title: "Cavar el Hoyo",
      lead: "Una aventura de excavacion pausada con tres biomas y tres tesoros distintos por descubrir.",
      what:
        "Cavar el Hoyo es un juego de excavacion 2D en el que el subsuelo es una masa continua de tierra. Profundizas a tu ritmo, descubres minerales incrustados (piedra, ambar, cobre, jade, plata, cristal u opalo segun el bioma) y sigues las flechas talladas en piedra que aparecen al cavar hasta encontrar la puerta del tesoro. Tres mundos comparten la pantalla de seleccion: la Selva Enterrada, el Desierto Hundido y el Patio Urbano, cada uno con su propia mezcla de materiales y su propio tesoro al fondo.",
      bullets: [
        "Excava con la pala y abre tu propio camino por el subsuelo continuo.",
        "Sigue las flechas que aparecen al cavar hasta abrir la puerta del tesoro de cada mundo.",
        "Vende minerales en el puesto de superficie y mejora pala, mochila, jetpack y linternas.",
        "Vigila la estamina y la oscuridad: agotarte sin anclaje o perderte sin luz puede costarte la partida."
      ],
      cta: "Empezar a cavar",
      configHint:
        "Al pulsar el boton entraras en la pantalla de seleccion de mundo. Elige Selva Enterrada, Desierto Hundido o Patio Urbano y pulsa Iniciar excavacion para empezar a cavar."
    },
    en: {
      eyebrow: "Arcade / Digging",
      title: "Dig the Hole",
      lead: "A patient digging adventure with three biomes and three distinct treasures to uncover.",
      what:
        "Dig the Hole is a 2D excavation game where the underground is one continuous soil mass. You go deeper at your own pace, uncover embedded minerals (stone, amber, copper, jade, silver, crystal or sun opal depending on the biome) and follow the carved-stone arrows that appear as you dig until you find the treasure door. Three worlds share the selection screen: the Buried Jungle, the Sunken Desert and the Urban Yard, each with its own material mix and its own treasure at the bottom.",
      bullets: [
        "Use your shovel to carve your own path through the continuous underground.",
        "Follow the arrows that appear as you dig to open each world's treasure door.",
        "Sell minerals at the surface outpost and upgrade shovel, backpack, jetpack and torches.",
        "Mind your stamina and the darkness — running out of energy or losing your way without a torch can end the run."
      ],
      cta: "Start digging",
      configHint:
        "After pressing the button you'll enter the world selection screen. Choose Buried Jungle, Sunken Desert or Urban Yard and press Start excavation to begin digging."
    }
  }
};

export default STRATEGY_INTROS;

export function getStrategyIntro(gameId, locale) {
  const entry = STRATEGY_INTROS[gameId];
  if (!entry) return null;
  const localized = entry[locale] || entry.es || entry.en;
  return {
    icon: entry.icon,
    accent: entry.accent,
    accentSoft: entry.accentSoft,
    ...localized
  };
}
