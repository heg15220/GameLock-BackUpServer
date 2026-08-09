/**
 * UI strings, es/en.
 *
 * The season prose lives in press.js - this is only the furniture around it: labels,
 * buttons and the short explanations that make a table of odds readable.
 *
 * Register: the game speaks like the sports daily it is styled after. Short, declarative,
 * no exclamation marks, and it never congratulates you.
 */

export const POSITION_LABELS = {
  es: {
    POR: "Portero", DFC: "Central", LI: "Lateral izq.", LD: "Lateral der.",
    MCD: "Mediocentro def.", MC: "Mediocentro", MI: "Interior izq.", MD: "Interior der.",
    MCO: "Mediapunta", EI: "Extremo izq.", ED: "Extremo der.", DC: "Delantero",
  },
  en: {
    POR: "Goalkeeper", DFC: "Centre-back", LI: "Left-back", LD: "Right-back",
    MCD: "Defensive mid", MC: "Central mid", MI: "Left mid", MD: "Right mid",
    MCO: "Attacking mid", EI: "Left wing", ED: "Right wing", DC: "Striker",
  },
};

export const ROLE_LABELS = {
  es: {
    titular: "Titular",
    rotacion_alta: "Rotación alta",
    rotacion_baja: "Rotación baja",
    suplente: "Suplente",
  },
  en: {
    titular: "Starter",
    rotacion_alta: "Squad rotation",
    rotacion_baja: "Fringe",
    suplente: "Bench",
  },
};

export const TROPHY_LABELS = {
  es: {
    league: "Liga", cup: "Copa", continental_a: "Continental",
    continental_b: "Segunda continental", club_world_cup: "Mundial de Clubes",
    continental_nt: "Continental de selecciones", world_cup: "Mundial",
  },
  en: {
    league: "League", cup: "Cup", continental_a: "Continental",
    continental_b: "Secondary continental", club_world_cup: "Club World Cup",
    continental_nt: "Continental (national team)", world_cup: "World Cup",
  },
};

export const AWARD_LABELS = {
  es: { ballon_dor: "Balón de Oro", golden_boot: "Bota de Oro", golden_glove: "Guante de Oro" },
  en: { ballon_dor: "Ballon d'Or", golden_boot: "Golden Boot", golden_glove: "Golden Glove" },
};

/** Card themes, so the eyebrow reads as a section name rather than a data value. */
export const THEME_LABELS = {
  es: {
    sport: "Deporte", tactic: "Táctica", pressure: "Presión",
    personal: "Personal", moral: "Moral", story: "Historia",
    directiva: "Despacho", vestuario: "Vestuario",
  },
  en: {
    sport: "Sport", tactic: "Tactics", pressure: "Pressure",
    personal: "Personal", moral: "Moral", story: "Story",
    directiva: "The office", vestuario: "Dressing room",
  },
};

/** The five rungs of idolatría, and the language the stand uses for each. */
export const IDOLATRY_LABELS = {
  es: {
    leyenda: "Leyenda",
    idolo: "Ídolo",
    referente: "Referente",
    querido: "Querido",
    recien_llegado: "Uno más",
  },
  en: {
    leyenda: "Legend",
    idolo: "Idol",
    referente: "Key figure",
    querido: "Well liked",
    recien_llegado: "One of the squad",
  },
};

/** What is on the line in each of the season's three matches. */
export const FIXTURE_LABELS = {
  es: {
    final_mundial: "Final del Mundial",
    final_continental_nt: "Final continental",
    final_continental: "Final continental",
    ascenso: "Play-off de ascenso",
    salvacion: "Final por la permanencia",
    titulo_liga: "Partido por el título de liga",
    final_copa: "Final de copa",
    semifinal_continental: "Semifinal continental",
    clasico: "El clásico",
  },
  en: {
    final_mundial: "World Cup final",
    final_continental_nt: "Continental final",
    final_continental: "Continental final",
    ascenso: "Promotion play-off",
    salvacion: "Survival decider",
    titulo_liga: "Title decider",
    final_copa: "Cup final",
    semifinal_continental: "Continental semi-final",
    clasico: "The derby",
  },
};

/**
 * The national-team tournament a confederation actually plays, so a final is named after
 * the cup being lifted rather than after the category it belongs to. "Final continental"
 * is a taxonomy; "Final de la Eurocopa" is a match.
 */
export const NT_TOURNAMENT = {
  es: {
    UEFA: "la Eurocopa",
    CONMEBOL: "la Copa América",
    CONCACAF: "la Copa Oro",
    AFC: "la Copa de Asia",
    CAF: "la Copa África",
    OFC: "la Copa de Naciones OFC",
  },
  en: {
    UEFA: "Euro",
    CONMEBOL: "Copa América",
    CONCACAF: "Gold Cup",
    AFC: "Asian Cup",
    CAF: "Africa Cup of Nations",
    OFC: "OFC Nations Cup",
  },
};

/** The kind of chance it is - which is what makes the three placements mean something. */
export const SHOT_LABELS = {
  es: {
    penal: "Penalti",
    mano_a_mano: "Mano a mano",
    cabezazo: "Cabezazo al área",
    falta: "Falta directa",
    volea: "Volea desde la frontal",
  },
  en: {
    penal: "Penalty",
    mano_a_mano: "One on one",
    cabezazo: "Header in the box",
    falta: "Free kick",
    volea: "Volley from the edge",
  },
};

/** Where you put it. The keys are shared across shot types, so one table covers all. */
export const PLACEMENT_LABELS = {
  es: {
    izquierda: "A su izquierda",
    centro: "Por el centro",
    derecha: "A su derecha",
    cruzado: "Cruzada",
    "primer-palo": "Al primer palo",
    picadita: "Picada por encima",
    "segundo-palo": "Al segundo palo",
    atras: "Peinada hacia atrás",
    barrera: "Por encima de la barrera",
    "palo-largo": "Al palo largo",
    rasa: "Rasa por debajo",
    abajo: "Abajo, a ras de hierba",
    escuadra: "A la escuadra",
    cruzada: "Cruzada al otro palo",
  },
  en: {
    izquierda: "To his left",
    centro: "Down the middle",
    derecha: "To his right",
    cruzado: "Across him",
    "primer-palo": "Near post",
    picadita: "Dinked over him",
    "segundo-palo": "Far post",
    atras: "Nodded back across",
    barrera: "Over the wall",
    "palo-largo": "Far corner",
    rasa: "Low under the wall",
    abajo: "Low, along the grass",
    escuadra: "Into the top corner",
    cruzada: "Across to the far post",
  },
};

/**
 * Why a deal looks the way it does. `openingTerms` reads the circumstances and tags the
 * ones that moved a term; these are those tags, printed on the sheet. The game explains
 * its reasoning everywhere else and there is no reason to stop here.
 */
export const REASON_LABELS = {
  es: {
    young: "Eres joven: te atan largo",
    veteran: "A tu edad nadie firma largo",
    firstDeal: "Primer contrato: una temporada y a demostrar",
    contender: "Pelea por títulos: firma a largo",
    yearToYear: "Aquí se va año a año",
    needed: "Te necesitan: te firman para jugar",
    squadFiller: "Vas de recambio: se cubren",
    secondTier: "Segunda división",
    idol: "Eres de la casa",
    strongLeague: "Liga rica",
    weakLeague: "Liga modesta",
    promised: "Te prometen el puesto sin pedirlo",
    sellingClub: "Club vendedor: cláusula asequible",
  },
  en: {
    young: "You are young: they tie you down",
    veteran: "Nobody signs long at your age",
    firstDeal: "A first deal: one season, then prove it",
    contender: "Fighting for titles: they sign long",
    yearToYear: "Here it is year to year",
    needed: "They need you: signed to play",
    squadFiller: "Squad cover: they hedge",
    secondTier: "Second division",
    idol: "One of their own",
    strongLeague: "A rich league",
    weakLeague: "A modest league",
    promised: "The shirt promised without being asked",
    sellingClub: "A selling club: the buy-out is reachable",
  },
};

/** A wage is quoted as a role, because that is the standard the crowd measures it by. */
export const WAGE_ROLE_LABELS = {
  es: {
    titular: "Ficha de titular",
    rotacion_alta: "Ficha de rotación",
    rotacion_baja: "Ficha de suplente habitual",
    suplente: "Ficha de banquillo",
  },
  en: {
    titular: "A starter's wage",
    rotacion_alta: "A squad player's wage",
    rotacion_baja: "A fringe player's wage",
    suplente: "A bench wage",
  },
};

export const PROFILE_LABELS = {
  es: { early: "Precoz", normal: "Normal", late: "Tardío", keeper: "Portero" },
  en: { early: "Early bloomer", normal: "Normal", late: "Late bloomer", keeper: "Keeper" },
};

const COPY = {
  es: {
    title: "Trayectoria",
    subtitle: "Veinticuatro años de carrera. Ninguno se repite.",

    setup: {
      heading: "Ficha de inscripción",
      lede: "Rellena la ficha. A partir de aquí eliges club y decisiones, y disparas en los tres partidos que deciden cada temporada. El resto lo juega el modelo.",
      surname: "Apellido",
      surnamePlaceholder: "MOLINA",
      number: "Dorsal",
      foot: "Pie",
      left: "Izquierdo",
      right: "Derecho",
      country: "Selección",
      position: "Posición",
      mode: "Ritmo",
      modeHint: "Cuántas temporadas pasan entre decisión y decisión.",
      modes: {
        intensa: { label: "Intensa", detail: "1 temporada por decisión · 24 decisiones" },
        normal: { label: "Normal", detail: "2 temporadas por decisión · 12 decisiones" },
        expres: { label: "Exprés", detail: "3 temporadas por decisión · 8 decisiones" },
      },
      seed: "Semilla",
      seedHint: "La misma semilla y las mismas decisiones dan la misma carrera.",
      randomSeed: "Otra semilla",
      start: "Empezar la carrera",
      thesis:
        "El modelo se sostiene sobre un solo número: tu OVR menos el nivel de la plantilla que te rodea. Ese número decide minutos, goles, títulos y quién te llama. Elegir club es elegir ese número.",
    },

    youth: {
      heading: "Tres clubes te quieren",
      lede: "Tienes dieciséis años y OVR 50. Ninguno de los tres te va a hacer titular por cariño: mira la distancia con la plantilla.",
      sign: "Sentarse a hablar",
    },

    contract: {
      heading: "El contrato",
      years: "Duración",
      yearsValue: "{years} temporadas",
      yearsOne: "1 temporada",
      yearsLeft: "Quedan {years}",
      expired: "Contrato vencido",
      wage: "Ficha",
      wagePer: "por temporada",
      wageAbove: "por encima de la banda",
      wageBelow: "por debajo de la banda",
      role: "Promesa de rol",
      roleNone: "Sin promesa",
      rolePromised: "{role} garantizado el primer año",
      clause: "Cláusula",
      clauseNote: "Cuanto más baja, más clubes te miran cada verano.",
      expectation: "Lo que se te va a exigir",
      expectationNote:
        "Tu ficha equivale a {role}. Cada temporada la grada compara eso con el rol que jugaste de verdad: por encima, perdona menos; por debajo, perdona casi todo.",
      breach: "Rompes {years} temporadas de contrato",
    },

    talks: {
      eyebrow: "Despacho",
      heading: "Sentados a la mesa",
      lede: "Tienes {asks} peticiones antes de firmar. Cada una lleva impresa la probabilidad de que te la concedan, y esa es la que se tira.",
      noLeverage:
        "No tienes nada con lo que pedir. Con esa distancia respecto a la plantilla, la mesa la pone el club.",
      leverage: "Mano en la negociación",
      onTheTable: "Sobre la mesa",
      opening: "Oferta inicial",
      asks: {
        wage: { label: "Pedir más ficha", detail: "Un escalón más de ficha — y de exigencia" },
        role: { label: "Pedir ser titular", detail: "Rol garantizado la primera temporada" },
        clause: { label: "Bajar la cláusula", detail: "Cláusula −45%: más ofertas cada verano" },
        short: { label: "Contrato más corto", detail: "Un año menos atado" },
      },
      granted: "Concedido",
      refused: "Denegado",
      repliesGranted: {
        wage: "«Es más de lo que teníamos previsto. Pero te queremos aquí, así que adelante.»",
        role: "«Te lo pongo por escrito. Y si no rindes, también estará por escrito.»",
        clause: "«Nos deja vendidos y lo sabes. Aun así, hecho.»",
        short: "«Nos vale. Nos volveremos a ver en esta mesa antes de lo que crees.»",
      },
      repliesRefused: {
        wage: "«Con esa cifra rompemos la escala del vestuario. La respuesta es no.»",
        role: "«Eso lo decide el entrenador el lunes por la mañana, no yo un martes de julio.»",
        clause: "«La cláusula está para que no te vayas. Ahí no vamos a tocar.»",
        short: "«Si te queremos, te queremos para un proyecto. No para pasar el rato.»",
      },
      sign: "Firmar",
      signNow: "Firmar sin discutir",
      back: "Levantarte de la mesa",
      spent: "Se acabaron las peticiones.",
    },

    signing: {
      eyebrow: "Firma",
      heading: "{club}",
      lede: "Aquí es donde una carrera cambia de sitio.",
      by: "Firmado",
      season: "Temporada {season}",
      done: "Empezar aquí",
      gained: "Lo que sacaste de la mesa",
      nothingGained: "Firmaste lo que había encima de la mesa.",
    },

    event: {
      eyebrow: "La decisión",
      injuryEyebrow: "Parte médico",
      injuryNote: "No se elige. Ocurre y sigues.",
      matchesLost: "partidos menos",
      resolve: "Decidir",
    },

    match: {
      eyebrow: "El partido",
      counter: "Ocasión {n} de {total}",
      /* Los dos modos. Ver matchmode.js: cuál te toca depende de cuánto depende de ti. */
      modeSkill: "Tu momento",
      modeWatch: "En directo",
      chancePrompt: {
        sweep: "Para el marcador dentro del hueco",
        window: "Espera. Golpea antes de que se cierre",
        bend: "Primero la potencia, luego la rosca",
      },
      chanceGate: "Toque {n} de {total}",
      chanceHint: "Pulsa en cualquier sitio para golpear",
      skip: "Adelantar",
      waiting: "El partido sigue…",
      ofChances: "Ocasión {n} de {total}",
      opponent: "El rival",
      /* Varias formas de contar cada cosa. narration.js trae un `variant` sacado de la
         semilla, así que el mismo partido se narra igual dos veces y dos partidos
         parecidos no. Ninguna línea inventa un hecho: ver la cabecera de narration.js. */
      beats: {
        kickoff: [
          "Rueda el balón.",
          "Empieza el partido.",
          "Pitido inicial. Se juega.",
          "Ya está en marcha.",
          "Arranca, y el campo no cabe en sí.",
        ],
        goalUs: [
          "¡Gol del {us}!",
          "¡La mete el {us}! Se viene abajo el estadio.",
          "Marca el {us}. Golpe encima de la mesa.",
          "¡Dentro! El {us} se pone por delante.",
          "Cae la del {us}. Justo cuando hacía falta.",
        ],
        goalThem: [
          "Marca el {them}.",
          "Gol del {them}. Silencio.",
          "La mete el {them} y hay que remar.",
          "El {them} encuentra el hueco. Mal asunto.",
          "El {them} sabe perfectamente lo que hace.",
        ],
        tight: [
          "No se abre. Se juega en el barro del centro del campo.",
          "Ni una. Dos equipos con más miedo a perder que ganas de ganar.",
          "Partido cerrado, de los que se deciden en una.",
          "Todo el mundo detrás del balón. No hay espacios.",
          "Se está jugando a no perderlo.",
        ],
        halfTime: [
          "Descanso.",
          "Al vestuario.",
          "Se acaba la primera parte.",
          "Queda una segunda parte entera.",
        ],
        pressing: [
          "El {us} echa el equipo arriba.",
          "El {us} adelanta líneas y el partido se estira.",
          "Ahora sí: el {us} vive en campo contrario.",
          "El {us} aprieta y el {them} se mete atrás.",
          "Se juega en un pañuelo delante del área del {them}.",
        ],
        chasing: [
          "El {us} necesita el partido y se va a por él.",
          "El {us} se lanza sin red. Lo que salga.",
          "No queda otra: el {us} vuelca el campo.",
          "El {us} se juega la temporada en veinte minutos.",
          "Todo el {us} arriba. Atrás no queda nadie.",
        ],
        chance: [
          "Y te cae a ti.",
          "El balón te busca a ti.",
          "Te la dejan. Es tuya.",
          "Se abre, y estás tú.",
          "La jugada acaba en tus pies.",
          "Te queda franca. Ahora.",
        ],
        scored: [
          "¡Dentro! La metes tú.",
          "¡Gol tuyo! No hay portero para eso.",
          "La clavas. Estadio en pie.",
          "¡Dentro! Y sabías que iba a entrar.",
          "La mandas al fondo. Se acabó la duda.",
        ],
        missed: [
          "No entra. Se queda a nada.",
          "La saca el portero. Increíble.",
          "Fuera. Te llevas las manos a la cabeza.",
          "Al palo. El estadio se levanta y se vuelve a sentar.",
          "No la coges bien. Se marcha alta.",
        ],
        untouched: [
          "Y el partido pasa de largo. No te llega ni una.",
          "Noventa minutos y ni un balón franco.",
          "El fútbol te esquiva. Hoy deciden otros.",
          "Ni la hueles. Hay noches así.",
        ],
        bystander: [
          "El partido se juega lejos de ti.",
          "Te mueves, pides, y el balón no aparece.",
          "Corres mucho y tocas poco.",
        ],
        fullTime: [
          "Final del partido.",
          "Pitido final.",
          "Se acabó.",
          "Y hasta aquí.",
        ],
      },
      ntFinal: "Final de {cup}",
      record: "En partidos decisivos: {scored} de {taken} · el modelo te da un {rate}%",
      versus: "Contra",
      lede: "Todo lo demás lo juega el modelo. Esto lo juegas tú.",
      choose: "Elige dónde la pones",
      read: "Te da tiempo a leerle: por ahí no va.",
      gapWas: "El hueco: {placement}",
      scored: "GOL",
      saved: "LA PARÓ",
      nailed: "Adivinó el lado y no llegó igual.",
      next: "Seguir",
      summary: "Los partidos del año",
      decides: {
        league: { yes: "La liga se gana aquí.", no: "La liga se pierde aquí." },
        cup: { yes: "La copa es vuestra.", no: "La copa se queda en el otro vestuario." },
        continental_a: {
          yes: "Campeones de Europa —o de lo que toque—.",
          no: "La final se pierde y no habrá otra igual.",
        },
        world_cup: { yes: "Campeón del mundo.", no: "No entró. La copa se decide sin tu firma." },
        continental_nt: {
          yes: "Continental para tu selección.",
          no: "No entró. El torneo sigue sin ti.",
        },
        semifinal: {
          yes: "A la final, y de tu mano.",
          no: "La eliminatoria queda cuesta arriba.",
        },
        promotion: { yes: "Ascenso.", no: "Un año más en la misma categoría." },
        survival: { yes: "Permanencia salvada.", no: "El equipo baja." },
        derby: { yes: "El clásico no da títulos. Se recuerda igual.", no: "El clásico se pierde." },
      },
    },

    season: {
      eyebrow: "Temporada",
      matches: "Partidos",
      goals: "Goles",
      assists: "Asistencias",
      role: "Rol",
      value: "Valor",
      caps: "Internacionalidades",
      titles: "Títulos",
      awards: "Premios",
      development: "Desarrollo",
      doubled: "Doble tirada: se queda la peor por no jugar",
      attended: "asistido",
      earned: "ganado",
      suspended: "Sanción cumplida: sin partidos y sin títulos.",
      promoted: "Ascenso",
      relegated: "Descenso",
      shadow: "La sombra",
      next: "Continuar",

      ficha: "La ficha",
      honours: "Palmarés del año",
      /* La noche, antes de la crónica de la mañana siguiente. Ver trophies.jsx. */
      ceremony: "Lo levantaste",
      ceremonySkip: "Pulsa para continuar",
      perMatch: "Goles por partido",
      nationalTeam: "Selección",
      nationalCaps: "{caps} partidos internacionales",
      playedWorldCup: "Disputó el Mundial",
      forcedCallup: "Convocado pese al umbral",
      careerToDate: "La carrera hasta aquí",
      newClub: "Debut en el club",
      vsLast: "respecto al año anterior",
      idolatry: "Idolatría",
      idolatryAt: "Idolatría en el {club}",

      /* El año que tuvo dentro del año que tuvo el club. Ver fortune.js. */
      form: "Estado de forma",
      formBand: {
        inspirado: "Inspirado todo el año",
        fino: "Fino",
        normal: "Su temporada de siempre",
        espeso: "Espeso",
        gris: "Nunca arrancó",
      },
      /* Por qué el ciclo de desarrollo cundió lo que cundió. */
      developmentShare: "{range} este año · ritmo {percent}%",
      growthDriver: {
        minutesLow: "Le faltan partidos.",
        minutesHigh: "Juega todo lo que hay que jugar.",
        challengeLow: "Nadie le exige: es demasiado bueno para este vestuario.",
        challengeHigh: "Le queda grande justo lo suficiente.",
        environmentLow: "El club no da para más.",
        environmentHigh: "Le entrenan bien.",
      },
      demoted: "Jugó en segunda",
      promotedTo: "Sube a primera",
    },

    market: {
      heading: "Mercado de verano",
      lede: "Quien te mira depende de tu OVR. Quien te hace jugar depende de la distancia.",
      stay: "Seguir",
      sign: "Firmar",
      current: "Tu club",
      wantsOut: "El club no cuenta contigo. No hay opción de seguir.",
      locked:
        "Tienes contrato en vigor: te quedan {years} temporadas. Este verano no puedes firmar por nadie — solo saldrías si un club paga tu cláusula.",
      /* La franja de arriba: qué viene, cuándo, y cuánto de ello estás recogiendo.
         Antes eran tres frases seguidas antes de llegar a la única decisión de la
         pantalla; ahora es una fila de celdas con el mismo idioma que el encabezado. */
      outlookHeading: "Próximo salto",
      outlookAge: "{age} años",
      outlookCycle: "Rango del ciclo",
      outlookRate: "A tu ritmo",
      outlookRiskShort: "Riesgo: doble tirada",
      outlookRisk:
        "Aviso: si terminas el ciclo en rotación baja o en el banquillo, se tira dos veces y se queda la peor.",
      /* Los dos veredictos de la carta, en el mismo sitio en todas. Una palabra cada
         uno: la carta se compara de un vistazo o no se compara. */
      growth: "Creces",
      growthBand: { thriving: "MEJORAS", neutral: "IGUAL", stalled: "TE FRENA" },
      /* Alguien ha pagado la cláusula. Ver OUR CALL #8 en contract.js. */
      clauseHeading: "Han pagado tu cláusula",
      clauseBody: "El {club} ha depositado los {fee}. El contrato queda saldado: si te vas, te vas limpio, sin la penalización por romperlo.",
      clauseAccept: "Escuchar al {club}",
      clauseRefuse: "No me muevo de aquí",
      clauseRefused: "Dijiste que no. La grada del {club} lo ha oído.",
      clauseFree: "Sin penalización por ruptura",
      exitCost: "Dejar el {club}",
      exitFree: "GRATIS",
      exitDemotes: "{from} → {to}",
      exitBetrayalShort: "Rival de liga",
      exitBetrayal: "Es tu rival de liga. La grada no lo olvida.",
      nationality: "Cambio de selección",
      nationalityLede: "Un pasaporte nuevo reescribe tu umbral de convocatoria. Solo se ofrece una vez.",
      keepNationality: "Seguir con la tuya",
    },

    retired: {
      eyebrow: "Se retira",
      seasons: "Temporadas",
      matches: "Partidos",
      goals: "Goles",
      assists: "Asistencias",
      peakOvr: "Techo de OVR",
      peakValue: "Valor máximo",
      clubs: "Clubes",
      caps: "Internacionalidades",
      cabinet: "La vitrina",
      cabinetEmpty: "Vacía.",
      earnedNote: "{earned} ganados jugando · {attended} desde el banquillo",
      comparison: "Contra la sombra",
      comparisonLede:
        "{surname} nació el mismo año que tú y pasó por el mismo modelo tomando decisiones sensatas. No estaba escrito que te ganara.",
      you: "Tú",
      them: "Él",
      again: "Otra carrera",
      curve: "La curva",
      curveLede:
        "Tu OVR temporada a temporada. Los puntos marcados son los años en los que cambiaste de club: ahí es donde una carrera se decide.",
      peak: "Techo a los {age}",
      idolatry: "La afición",
      idolatryLede: "Lo que queda en cada grada por la que pasaste. Se construye quedándose y se gasta yéndose.",
      betrayed: "traicionado",
      noIdolatry: "Ninguna grada llegó a hacerte suyo.",
    },

    common: {
      ovr: "OVR",
      squad: "Plantilla",
      delta: "Distancia",
      age: "Edad",
      club: "Club",
      league: "Liga",
      profile: "Perfil",
      cancel: "Volver",
    },

    /* La barra de estado del encabezado: las cuatro cifras sobre las que gira el juego,
       visibles en todas las pantallas. Etiquetas cortas a propósito — se leen de reojo. */
    hud: {
      delta: "Distancia",
      deal: "Contrato",
      years: "años",
      free: "libre",
      crowd: "Afición",
      secondTier: "2ª",
    },

    context: {
      heading: "Dónde estás",
      deal: "Tu contrato",
      crowd: "La grada",
      cabinet: "La vitrina",
      cabinetEmpty: "Aún vacía.",
      rival: "La sombra",
      freeAgent: "Sin contrato en vigor: este verano sales gratis.",
      noClub: "Sin club",
      titles: "títulos",
      seasonsHere: "{seasons} temporadas aquí",
      firstSeasonHere: "Primera temporada aquí",
    },

    delta: {
      legend: "Tu OVR contra el nivel de la plantilla",
      projected: "Rol previsto",
    },
  },

  en: {
    title: "Trayectoria",
    subtitle: "Twenty-four years of a career. No two the same.",

    setup: {
      heading: "Registration card",
      lede: "Fill in the card. From here you pick clubs and decisions, and take the shot in the three matches that decide each season. The model plays the rest.",
      surname: "Surname",
      surnamePlaceholder: "MOLINA",
      number: "Number",
      foot: "Foot",
      left: "Left",
      right: "Right",
      country: "Nation",
      position: "Position",
      mode: "Pace",
      modeHint: "How many seasons pass between decisions.",
      modes: {
        intensa: { label: "Intense", detail: "1 season per decision · 24 decisions" },
        normal: { label: "Normal", detail: "2 seasons per decision · 12 decisions" },
        expres: { label: "Express", detail: "3 seasons per decision · 8 decisions" },
      },
      seed: "Seed",
      seedHint: "The same seed and the same decisions give the same career.",
      randomSeed: "New seed",
      start: "Start the career",
      thesis:
        "The model rests on one number: your OVR minus the level of the squad around you. That number decides minutes, goals, trophies and who calls you up. Choosing a club is choosing that number.",
    },

    youth: {
      heading: "Three clubs want you",
      lede: "You are sixteen and rated 50. None of them will start you out of affection: look at the distance to the squad.",
      sign: "Sit down with them",
    },

    contract: {
      heading: "The contract",
      years: "Length",
      yearsValue: "{years} seasons",
      yearsOne: "1 season",
      yearsLeft: "{years} left",
      expired: "Contract expired",
      wage: "Wage",
      wagePer: "per season",
      wageAbove: "above the band",
      wageBelow: "below the band",
      role: "Role promise",
      roleNone: "No promise",
      rolePromised: "{role} guaranteed in year one",
      clause: "Buy-out",
      clauseNote: "The lower it is, the more clubs come looking each summer.",
      expectation: "What will be expected of you",
      expectationNote:
        "Your wage is {role}. Every season the crowd sets that against the role you actually played: above it they forgive less, below it they forgive almost anything.",
      breach: "You tear up {years} seasons of contract",
    },

    talks: {
      eyebrow: "The office",
      heading: "At the table",
      lede: "You get {asks} asks before you sign. Each one has the odds of being granted printed on it, and those are the odds that get rolled.",
      noLeverage:
        "You have nothing to ask with. At that distance from the squad, the club sets the table.",
      leverage: "Your hand",
      onTheTable: "On the table",
      opening: "Opening offer",
      asks: {
        wage: { label: "Ask for more", detail: "One rung up the wage — and the expectation" },
        role: { label: "Ask to start", detail: "Role guaranteed for the first season" },
        clause: { label: "Lower the buy-out", detail: "Clause −45%: more offers each summer" },
        short: { label: "A shorter deal", detail: "One year less tied down" },
      },
      granted: "Granted",
      refused: "Refused",
      repliesGranted: {
        wage: "“That is more than we had budgeted. But we want you here, so go on.”",
        role: "“I will put it in writing. And if you do not deliver, that will be in writing too.”",
        clause: "“It leaves us exposed and you know it. Even so — done.”",
        short: "“Fine by us. We will be back at this table sooner than you think.”",
      },
      repliesRefused: {
        wage: "“At that figure we break the wage structure of the whole dressing room. No.”",
        role: "“That is decided by the manager on a Monday morning, not by me on a Tuesday in July.”",
        clause: "“The buy-out is there so you do not leave. We are not touching it.”",
        short: "“If we want you, we want you for a project. Not to pass the time.”",
      },
      sign: "Sign",
      signNow: "Sign without arguing",
      back: "Get up from the table",
      spent: "No asks left.",
    },

    signing: {
      eyebrow: "Signature",
      heading: "{club}",
      lede: "This is where a career changes address.",
      by: "Signed",
      season: "Season {season}",
      done: "Start here",
      gained: "What you took off the table",
      nothingGained: "You signed what was already on the table.",
    },

    event: {
      eyebrow: "The decision",
      injuryEyebrow: "Medical report",
      injuryNote: "Not a choice. It happens and you carry on.",
      matchesLost: "matches lost",
      resolve: "Decide",
    },

    match: {
      eyebrow: "The match",
      counter: "Chance {n} of {total}",
      /* The two modes. See matchmode.js: which one you get is how much they need you. */
      modeSkill: "Your moment",
      modeWatch: "Live",
      chancePrompt: {
        sweep: "Stop the marker inside the gap",
        window: "Wait. Hit it before it closes",
        bend: "Power first, then the curl",
      },
      chanceGate: "Touch {n} of {total}",
      chanceHint: "Press anywhere to strike",
      skip: "Skip ahead",
      waiting: "The match is still going…",
      ofChances: "Chance {n} of {total}",
      opponent: "The opposition",
      /* Several ways of saying each thing. narration.js carries a seed-drawn `variant`,
         so one match reads the same way twice and two similar matches do not. No line
         invents a fact - see the header of narration.js. */
      beats: {
        kickoff: [
          "We are under way.",
          "The whistle goes.",
          "Kick-off.",
          "And they are off.",
          "It starts, and the ground is up already.",
        ],
        goalUs: [
          "{us} score!",
          "{us} find it! The place comes apart.",
          "{us} strike first. A statement.",
          "In! {us} are in front.",
          "{us} get one, and at the right time.",
        ],
        goalThem: [
          "{them} score.",
          "{them} get one. Silence.",
          "{them} find the gap and now there is work to do.",
          "A goal for {them}. This is a problem.",
          "{them} know exactly what they are doing.",
        ],
        tight: [
          "Nothing in it. The game is being fought in midfield.",
          "Not a chance between them. Two sides afraid of losing.",
          "A tight one, the kind decided by a single moment.",
          "Everybody behind the ball. No room anywhere.",
          "This is being played not to lose.",
        ],
        halfTime: [
          "Half time.",
          "In they go.",
          "The first half is done.",
          "A whole second half still to come.",
        ],
        pressing: [
          "{us} push the whole side forward.",
          "{us} step up and the game stretches.",
          "{us} are living in the other half now.",
          "{us} press and {them} drop deeper.",
          "It is all happening on the edge of the {them} box.",
        ],
        chasing: [
          "{us} need this one and they go after it.",
          "{us} throw everything at it.",
          "No choice left: {us} tip the pitch.",
          "{us} have twenty minutes to save a season.",
          "Everyone forward. Nobody left at the back.",
        ],
        chance: [
          "And it falls to you.",
          "The ball finds you.",
          "They lay it off. It is yours.",
          "It opens up, and there you are.",
          "The move ends at your feet.",
          "It sits up for you. Now.",
        ],
        scored: [
          "In! You take it.",
          "You score! No keeper stops that.",
          "You bury it. The ground is on its feet.",
          "In - and you knew it was going in.",
          "Into the back of it. No argument.",
        ],
        missed: [
          "Not this time. Inches away.",
          "The keeper gets to it. Somehow.",
          "Wide. Your hands go to your head.",
          "Off the post. The ground stands up and sits back down.",
          "You do not catch it properly. Over the bar.",
        ],
        untouched: [
          "And the game goes past you. Not one sight of it.",
          "Ninety minutes and never a clean look.",
          "The football avoids you. Tonight belongs to somebody else.",
          "Nothing. Some nights are like that.",
        ],
        bystander: [
          "It is all happening a long way from you.",
          "You move, you call for it, and it never comes.",
          "Plenty of running, hardly a touch.",
        ],
        fullTime: [
          "Full time.",
          "The final whistle.",
          "That is that.",
          "And there it ends.",
        ],
      },
      ntFinal: "{cup} final",
      record: "In deciders: {scored} of {taken} · the model rates you at {rate}%",
      versus: "Against",
      lede: "The model plays everything else. This one you play.",
      choose: "Choose where you put it",
      read: "You get long enough to read him: not that side.",
      gapWas: "The gap: {placement}",
      scored: "GOAL",
      saved: "SAVED",
      nailed: "He read it and still could not reach it.",
      next: "Continue",
      summary: "The matches that mattered",
      decides: {
        league: { yes: "The league is won here.", no: "The league is lost here." },
        cup: { yes: "The cup is yours.", no: "The cup stays in the other dressing room." },
        continental_a: {
          yes: "Continental champions.",
          no: "The final is lost, and there is never another like it.",
        },
        world_cup: { yes: "World champion.", no: "No goal. The cup is decided without you." },
        continental_nt: {
          yes: "A continental title for your nation.",
          no: "No goal. The tournament carries on without you.",
        },
        semifinal: { yes: "Into the final, and by your foot.", no: "The tie is uphill now." },
        promotion: { yes: "Promoted.", no: "Another year in the same division." },
        survival: { yes: "Survival secured.", no: "The club goes down." },
        derby: { yes: "A derby wins nothing. It is remembered anyway.", no: "The derby is lost." },
      },
    },

    season: {
      eyebrow: "Season",
      matches: "Matches",
      goals: "Goals",
      assists: "Assists",
      role: "Role",
      value: "Value",
      caps: "Caps",
      titles: "Trophies",
      awards: "Awards",
      development: "Development",
      doubled: "Double roll: the worse one stands, for not playing",
      attended: "attended",
      earned: "earned",
      suspended: "Ban served: no matches and no trophies.",
      promoted: "Promoted",
      relegated: "Relegated",
      shadow: "The shadow",
      next: "Continue",

      ficha: "The card",
      honours: "Won this year",
      /* The night itself, before the morning's write-up. See trophies.jsx. */
      ceremony: "You lifted it",
      ceremonySkip: "Press to continue",
      perMatch: "Goals per match",
      nationalTeam: "National team",
      nationalCaps: "{caps} international matches",
      playedWorldCup: "Played the World Cup",
      forcedCallup: "Called up below the threshold",
      careerToDate: "The career so far",
      newClub: "First season at the club",
      vsLast: "on last season",
      idolatry: "Idolatry",
      idolatryAt: "Idolatry at {club}",

      /* The year he had inside the year the club had. See fortune.js. */
      form: "Form",
      formBand: {
        inspirado: "On it all year",
        fino: "Sharp",
        normal: "His usual season",
        espeso: "Heavy-legged",
        gris: "Never got going",
      },
      /* Why the development cycle paid out what it paid out. */
      developmentShare: "{range} this year · rate {percent}%",
      growthDriver: {
        minutesLow: "He needs matches.",
        minutesHigh: "He plays everything there is to play.",
        challengeLow: "Nobody asks anything of him: he is too good for this dressing room.",
        challengeHigh: "It is just far enough over his head.",
        environmentLow: "The club cannot give him more.",
        environmentHigh: "They coach him well.",
      },
      demoted: "Played in the second tier",
      promotedTo: "Up to the top flight",
    },

    market: {
      heading: "Summer market",
      lede: "Who looks at you depends on your OVR. Who plays you depends on the distance.",
      stay: "Stay",
      sign: "Sign",
      current: "Your club",
      wantsOut: "The club is done with you. There is no option to stay.",
      locked:
        "Your deal is still running: {years} seasons left. You cannot sign for anybody this summer — the only way out is a club meeting your buy-out.",
      /* The strip up top: what is coming, when, and how much of it he is collecting.
         It used to be three sentences standing between the player and the only decision
         on the screen; it is now a row of cells in the header's own language. */
      outlookHeading: "Next jump",
      outlookAge: "age {age}",
      outlookCycle: "Cycle range",
      outlookRate: "At your rate",
      outlookRiskShort: "Risk: double roll",
      outlookRisk:
        "Warning: finish the cycle on the fringe or on the bench and it rolls twice, keeping the worse.",
      /* The card's two verdicts, in the same place on every card. One word each: either
         a card can be compared at a glance or it cannot be compared at all. */
      growth: "You grow",
      growthBand: { thriving: "IMPROVE", neutral: "FLAT", stalled: "STALL" },
      exitFree: "FREE",
      exitBetrayalShort: "League rival",
      /* Somebody met the buy-out. See OUR CALL #8 in contract.js. */
      clauseHeading: "Your buy-out has been paid",
      clauseBody: "{club} have deposited the {fee}. The contract is settled: if you go, you go clean, with no penalty for breaking it.",
      clauseAccept: "Hear {club} out",
      clauseRefuse: "I am not going anywhere",
      clauseRefused: "You said no, and the {club} stand heard it.",
      clauseFree: "No breach penalty",
      exitCost: "Leaving {club}",
      exitDemotes: "{from} → {to}",
      exitBetrayal: "A league rival. The stand does not forget that one.",
      nationality: "Switch nation",
      nationalityLede: "A new passport rewrites your call-up threshold. It is offered once.",
      keepNationality: "Keep your own",
    },

    retired: {
      eyebrow: "Retires",
      seasons: "Seasons",
      matches: "Matches",
      goals: "Goals",
      assists: "Assists",
      peakOvr: "Peak OVR",
      peakValue: "Peak value",
      clubs: "Clubs",
      caps: "Caps",
      cabinet: "The cabinet",
      cabinetEmpty: "Empty.",
      earnedNote: "{earned} won on the pitch · {attended} from the bench",
      comparison: "Against the shadow",
      comparisonLede:
        "{surname} was born the same year as you and went through the same model making sensible decisions. Him beating you was never written.",
      you: "You",
      them: "Him",
      again: "Another career",
      curve: "The curve",
      curveLede:
        "Your OVR season by season. The marked points are the years you changed club: that is where a career is decided.",
      peak: "Peak at {age}",
      idolatry: "The crowds",
      idolatryLede: "What is left in every stand you passed through. Built by staying, spent by leaving.",
      betrayed: "betrayed",
      noIdolatry: "No crowd ever quite made you theirs.",
    },

    common: {
      ovr: "OVR",
      squad: "Squad",
      delta: "Distance",
      age: "Age",
      club: "Club",
      league: "League",
      profile: "Profile",
      cancel: "Back",
    },

    /* The header status rail: the four numbers the game turns on, on every screen.
       Labels are short on purpose — they are read out of the corner of the eye. */
    hud: {
      delta: "Distance",
      deal: "Contract",
      years: "years",
      free: "free",
      crowd: "Crowd",
      secondTier: "2nd",
    },

    context: {
      heading: "Where you stand",
      deal: "Your contract",
      crowd: "The stand",
      cabinet: "The cabinet",
      cabinetEmpty: "Still empty.",
      rival: "The shadow",
      freeAgent: "No contract running: you leave for nothing this summer.",
      noClub: "No club",
      titles: "trophies",
      seasonsHere: "{seasons} seasons here",
      firstSeasonHere: "First season here",
    },

    delta: {
      legend: "Your OVR against the level of the squad",
      projected: "Projected role",
    },
  },
};

export const getCopy = (locale) => COPY[locale] ?? COPY.es;

export const fillTemplate = (template, values) =>
  String(template).replace(/\{(\w+)\}/g, (_match, key) => String(values[key] ?? ""));

/** Money, in the shorthand a transfer page would use. */
export function formatValue(value, locale = "es") {
  if (!value) return "—";
  const suffix = locale === "es" ? { m: " M€", k: " mil €" } : { m: "M", k: "K" };
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    const shown = millions >= 10 ? Math.round(millions) : Math.round(millions * 10) / 10;
    return locale === "es" ? `${shown}${suffix.m}` : `€${shown}${suffix.m}`;
  }
  const thousands = Math.round(value / 1000);
  return locale === "es" ? `${thousands}${suffix.k}` : `€${thousands}${suffix.k}`;
}

export const formatDelta = (delta) => (delta > 0 ? `+${delta}` : String(delta));
