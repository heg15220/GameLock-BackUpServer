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
    directiva: "Despacho", vestuario: "Vestuario", prensa: "Sala de prensa",
  },
  en: {
    sport: "Sport", tactic: "Tactics", pressure: "Pressure",
    personal: "Personal", moral: "Moral", story: "Story",
    directiva: "The office", vestuario: "Dressing room", prensa: "Press room",
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
    clasico: "El partido de la temporada",
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
    clasico: "The match of the season",
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

/**
 * The competitions themselves, by name.
 *
 * The season summary has always called a continental run "el camino continental", which is
 * the taxonomy again: nobody watches the continental, they watch the Champions League. Now
 * that the knockout rounds are played on screen the tournament has to introduce itself, so
 * it is named after the thing that is actually being won.
 */
export const TOURNAMENT_LABELS = {
  es: {
    champions: "la Champions League",
    libertadores: "la Copa Libertadores",
    euro: "la Eurocopa",
    copa_america: "la Copa América",
    world_cup: "el Mundial",
  },
  en: {
    champions: "the Champions League",
    libertadores: "the Copa Libertadores",
    euro: "the Euros",
    copa_america: "the Copa América",
    world_cup: "the World Cup",
  },
};

/** Which round of the bracket this night is. Keyed by the ids in tournaments.js. */
export const ROUND_LABELS = {
  es: {
    playoff: "Play-off",
    r32: "Dieciseisavos",
    r16: "Octavos de final",
    quarter: "Cuartos de final",
    semi: "Semifinal",
    final: "Final",
  },
  en: {
    playoff: "Play-off",
    r32: "Round of 32",
    r16: "Round of 16",
    quarter: "Quarter-final",
    semi: "Semi-final",
    final: "Final",
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
    parada_penal: "Penalti en contra",
    salida_mano_a_mano: "Se te va solo",
    tiro_lejano: "Disparo desde la frontal",
    centro_lateral: "El centro al área",
    despeje: "Despeje bajo palos",
    entrada: "La entrada",
    anticipo: "El anticipo",
    pase_gol: "El último pase",
  },
  en: {
    penal: "Penalty",
    mano_a_mano: "One on one",
    cabezazo: "Header in the box",
    falta: "Free kick",
    volea: "Volley from the edge",
    parada_penal: "Penalty against you",
    salida_mano_a_mano: "He is through on you",
    tiro_lejano: "Shot from the edge",
    centro_lateral: "The cross",
    despeje: "Clearance off the line",
    entrada: "The tackle",
    anticipo: "The interception",
    pase_gol: "The final ball",
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
    // Adonde vas tú, no adonde va el balón.
    achique: "Achicar y hacerte grande",
    "palo-corto": "Cerrar el palo corto",
    salida: "Salir a por él",
    adelantarse: "Adelantarte a la jugada",
    aguantar: "Aguantar de pie",
    cerrar: "Cerrarle la diagonal",
    // Y adonde pones el pase.
    "al-hueco": "Al hueco, entre líneas",
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
    achique: "Come out and stand tall",
    "palo-corto": "Cover the near post",
    salida: "Come and claim it",
    adelantarse: "Read it early",
    aguantar: "Stay on your feet",
    cerrar: "Close the angle",
    "al-hueco": "Into the space, between the lines",
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
      breachOne: "Rompes una temporada de contrato",
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
      /* Lo que ocupa el sitio del tipo de remate mientras el partido todavía va por el
         minuto veinte. Ver `revealShot` en index.jsx: en directo el nombre de la ocasión
         no aparece hasta que la narración llega a ella. */
      shotPending: "Aún por llegar",
      /* Las siete formas de jugar una ocasión. Cada una es un verbo distinto en la mano
         -ver la cabecera de chancegames.jsx-, así que el enunciado dice QUÉ se pide y la
         pista dice CÓMO se hace. Ninguna de las dos se puede omitir: la primera vez que te
         sale una, es lo único que tienes. */
      chancePrompt: {
        sweep: "Para el marcador dentro del hueco",
        window: "Espera. Golpea antes de que se cierre",
        bend: "Primero la potencia, luego la rosca",
        charge: "Carga el golpeo y suéltalo en la banda",
        aim: "Va en movimiento. Suéltala donde va a estar",
        dive: "Adivina el lado. Y el momento",
        feint: "Amaga primero. Luego vete",
      },
      chanceGate: "Toque {n} de {total}",
      /** El segundo tiempo del amago: ya has vendido la finta, ahora es cuándo sales. */
      chanceGo: "Ahora",
      chanceHint: {
        sweep: "Pulsa en cualquier sitio para golpear",
        window: "Pulsa en cualquier sitio para golpear",
        bend: "Pulsa en cualquier sitio para golpear",
        charge: "Mantén pulsado y suelta",
        aim: "Arrastra la mira y suelta encima",
        dive: "Arrastra hacia el lado y suelta",
        feint: "Dos toques: el amago y el disparo",
      },
      skip: "Adelantar",
      liveStats: { shots: "Tiros", saves: "Paradas", danger: "Peligro" },
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
        /* Un gol dice algo del marcador, y el marcador ya está decidido antes de buscarle
           palabras. `any` es lo que vale con cualquier resultado; lo demás va por cómo queda
           el partido después del gol. Ver `beatLines` aquí abajo y `standingOf` en
           narration.js: un empate a uno no se puede narrar como ponerse por delante. */
        goalUs: {
          any: [
            "¡Gol del {us}!",
            "¡Marca el {us}! Se viene abajo el estadio.",
            "Marca el {us}. Golpe encima de la mesa.",
            "Cae la del {us}. Justo cuando hacía falta.",
          ],
          ahead: [
            "¡Dentro! El {us} se pone por delante.",
            "La mete el {us} y manda en el marcador.",
          ],
          level: [
            "¡Dentro! El {us} empata el partido.",
            "La empata el {us}. Vuelve a estar todo por decidir.",
          ],
          behind: [
            "Marca el {us} y se mete otra vez en el partido.",
            "Acorta el {us}. Todavía hay a qué agarrarse.",
          ],
        },
        goalThem: {
          any: [
            "Marca el {them}.",
            "Gol del {them}. Silencio.",
            "El {them} encuentra el hueco.",
            "El {them} sabe perfectamente lo que hace.",
          ],
          behind: [
            "Marca el {them} y hay que remar.",
            "Gol del {them}. Toca remontar.",
          ],
          level: [
            "Empata el {them}. Se borra lo hecho.",
            "El {them} iguala y hay que volver a empezar.",
          ],
          ahead: [
            "Recorta el {them}. Se aprieta el marcador.",
            "Marca el {them}, pero el {us} sigue por delante.",
          ],
        },
        shotUs: [
          "El {us} arma el disparo desde la frontal. Se va por centímetros.",
          "Remate del {us}; el balón silba junto al poste.",
          "El {us} encuentra un metro y prueba. Fuera por poco.",
        ],
        shotThem: [
          "El {them} remata con espacio. No encuentra portería.",
          "Disparo seco del {them}, rozando el poste.",
          "El {them} amenaza desde la media luna. Se marcha alto.",
        ],
        saveUs: [
          "Parada firme del {us}. Sin rechace.",
          "Mano abajo del {us} para apagar una ocasión clarísima.",
          "El {us} responde bajo palos y sostiene el partido.",
        ],
        saveThem: [
          "El portero del {them} vuela y evita el gol.",
          "Gran parada del {them}; el {us} ya lo celebraba.",
          "Reflejos del guardameta del {them}. Sigue igual.",
        ],
        tackleUs: [
          "Entrada limpia del {us} cuando el {them} ya cargaba el tiro.",
          "El {us} cierra la puerta con una entrada medida al milímetro.",
          "Cruce providencial del {us}. Era el último obstáculo.",
        ],
        tackleThem: [
          "El {them} corta la transición con una entrada perfecta.",
          "La zaga del {them} llega justo antes del remate.",
          "Cierre del {them}. La jugada prometía mucho más.",
        ],
        keyPassUs: [
          "Pase entre líneas del {us}. La defensa se parte en dos.",
          "El {us} filtra una pelota magnífica, pero falta el último toque.",
          "Cambio de orientación del {us}; aparece todo el campo de golpe.",
        ],
        keyPassThem: [
          "El {them} encuentra un pase interior que obliga a correr hacia atrás.",
          "Pase clave del {them}. La cobertura llega al límite.",
          "El {them} cambia el juego y fabrica peligro desde la nada.",
        ],
        cornerUs: ["Córner para el {us}. Suben los centrales.", "El {us} fuerza un saque de esquina y aprieta el estadio.", "Otro córner del {us}; el área empieza a encogerse."],
        cornerThem: ["Córner para el {them}. Toca defender el área.", "El {them} carga el área en un saque de esquina.", "Saque de esquina del {them}. Todos por detrás del balón."],
        offsideUs: ["El {us} rompía solo, pero levantan la bandera.", "Fuera de juego del {us} por medio paso.", "La jugada del {us} era magnífica; la línea no perdona."],
        offsideThem: ["El {them} encuentra la espalda, invalidado por fuera de juego.", "Bandera arriba. El desmarque del {them} llegó demasiado pronto.", "El {them} se escapaba, pero arrancó antes de tiempo."],
        playerSave: ["Te estiras y la sacas con una mano enorme.", "Lees el disparo antes que nadie y bloqueas abajo.", "Reacción tuya bajo palos. El gol parecía hecho."],
        playerClaim: ["Sales entre cuerpos y te quedas el centro.", "Mandas en el área: salida alta y balón asegurado.", "Atacas el centro y no concedes segunda jugada."],
        playerLongPass: ["Tu envío largo rompe la primera presión y activa el ataque.", "Sacas rápido y conviertes una parada en transición.", "Levantas la cabeza y encuentras al extremo a cuarenta metros."],
        playerTackle: ["Mides la entrada y robas limpio en una zona crítica.", "Vas al suelo, tocas balón y levantas al estadio.", "Templas, esperas y eliges el instante exacto para meter el pie."],
        playerBlock: ["Pones el cuerpo y bloqueas un disparo que llevaba veneno.", "Te cruzas en la trayectoria. El remate muere en ti.", "Cierras el ángulo y desvías el tiro lejos del área."],
        playerInterception: ["Lees el pase, te adelantas y cortas la jugada.", "Anticipas dos pasos antes y recuperas sin hacer falta.", "Saltas de la línea en el momento justo y robas."],
        playerCarry: ["Rompes una línea conduciendo y obligas al rival a retroceder.", "Avanzas con el balón hasta atraer a dos defensores.", "Conduces treinta metros y cambias por completo el escenario."],
        playerRecovery: ["Aprietas tras pérdida y recuperas antes de que nazca la contra.", "Ganas el segundo balón y el {us} vuelve a instalarse arriba.", "Llegas primero al balón dividido y reinicias el ataque."],
        playerKeyPass: ["Ves el desmarque antes que nadie y filtras el pase.", "Tu pase deja a un compañero de cara al portero.", "Rompes dos líneas con el exterior y aparece la ocasión."],
        playerCross: ["Tu centro supera al lateral y cae en zona de remate.", "Llegas por fuera y pones un balón tenso al área.", "Cambias el ritmo y cuelgas el centro a la espalda del central."],
        playerThroughBall: ["Partes la defensa con un pase al hueco de primera.", "Escondes el pase hasta el último instante y dejas a uno solo.", "Dibujas el pase entre central y lateral con el peso exacto."],
        playerShot: ["Te fabricas el espacio y pruebas al portero desde lejos.", "Recibes entre líneas, giras y disparas sin pensarlo.", "Atacas el rechace y obligas al guardameta a intervenir."],
        playerRun: ["Atacas la espalda de la defensa y arrastras a dos contigo.", "Tu desmarque abre un pasillo que el {us} aprovecha.", "Cambias de dirección y apareces libre entre los centrales."],
        playerHoldUp: ["Aguantas de espaldas, proteges el balón y das aire al equipo.", "Fijas a los centrales y descargas de cara con criterio.", "Te llevas el contacto, conservas la pelota y permite subir al bloque."],
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
        /* Una eliminatoria no puede acabar en tablas. La tanda no vuelve a sortear nada
           -el trofeo ya está decidido, ver `settleFinal`-, solo cuenta cómo fue. */
        shootout: [
          "Noventa minutos y nada. Penaltis.",
          "Se acaba igualado. A la tanda.",
          "No ha bastado. Desde los once metros.",
        ],
        shootoutWon: [
          "Y la tanda es vuestra.",
          "La última la mete el {us}. Se acabó.",
          "Gana el {us} en los penaltis.",
        ],
        shootoutLost: [
          "La tanda se la lleva el {them}.",
          "Falla el {us} el último. Y hasta aquí.",
          "Pierde el {us} desde los once metros.",
        ],
        /* Las eliminatorias que se ven de octavos en adelante - ver LIVE_ROUNDS - no las
           decide el jugador: las mira. Estas son las dos líneas que las cierran. */
        extraTime: [
          "Se acaban los noventa. Hay prórroga.",
          "Nada que separar. Media hora más.",
          "Treinta minutos más para deshacer el empate.",
        ],
        tieWon: [
          "El {us} pasa de ronda.",
          "Y el {us} sigue vivo en el torneo.",
          "Billete para la siguiente. Es del {us}.",
        ],
        tieLost: [
          "El {us} se queda fuera.",
          "Se acaba aquí el torneo para el {us}.",
          "Pasa el {them}. Al {us} le toca mirar el resto desde casa.",
        ],
      },
      ntFinal: "Final de {cup}",
      record: "En partidos decisivos: {scored} de {taken} · el modelo te da un {rate}%",
      versus: "Contra",
      leagueContext: {
        title_race: "Pulso por el t\u00edtulo: {ours}.\u00ba contra {theirs}.\u00ba · {gap} puntos de distancia",
        continental_race: "Duelo por puestos continentales: {ours}.\u00ba contra {theirs}.\u00ba · {gap} puntos",
        survival_race: "Partido por la permanencia: {ours}.\u00ba contra {theirs}.\u00ba · {gap} puntos",
        table_neighbor: "Rivales directos en liga: {ours}.\u00ba contra {theirs}.\u00ba · {gap} puntos",
      },
      /** Cuando la final cae contra el eterno rival, la final ES el partido de la temporada. */
      alsoDerby: "Y además es el partido de la temporada.",
      lede: "Todo lo demás lo juega el modelo. Esto lo juegas tú.",
      choose: "Elige dónde la pones",
      read: "Te da tiempo a leerle: por ahí no va.",
      gapWas: "El hueco: {placement}",
      scored: "GOL",
      saved: "LA PARÓ",
      /**
       * Convertir no siempre es marcar. El trofeo se resuelve igual - ver PRODUCES - pero
       * el veredicto tiene que decir lo que de verdad pasó en el área.
       */
      verdicts: {
        goal: { won: "GOL", lost: "LA PARÓ", gap: "El hueco: {placement}" },
        stop: { won: "LA SACAS", lost: "GOL EN CONTRA", gap: "La puso: {placement}" },
        assist: { won: "ASISTENCIA", lost: "NO LLEGA", gap: "El hueco estaba: {placement}" },
      },
      /**
       * El tercer desenlace. Ni gol ni parada: el balón no pasó por él, y el partido no se
       * lo puede cobrar. Es el único que no admite ni mérito ni culpa - ver DECIDES.absent.
       */
      absent: "NO TE LLEGÓ",
      absentNote: "Ni una. El partido se resolvió sin pasar por tus botas.",
      nailed: "Adivinó el lado y no llegó igual.",
      next: "Seguir",
      summary: "Los partidos del año",
      /**
       * `none` es la noche que no le llegó ninguna. No puede afirmar un resultado: el
       * trofeo queda en DECIDES.absent, a medio camino, y se resuelve fuera de escena.
       */
      decides: {
        league: {
          yes: "Un paso enorme hacia la liga.",
          no: "La liga se complica. Aún no está perdida.",
          none: "La liga se decide sin que te llegue una.",
        },
        cup: {
          yes: "La copa es vuestra.",
          no: "La copa se queda en el otro vestuario.",
          none: "La copa se juega sin pasar por ti.",
        },
        continental_a: {
          yes: "Campeones de Europa —o de lo que toque—.",
          no: "La final se pierde y no habrá otra igual.",
          none: "La final se resuelve lejos de tus botas.",
        },
        world_cup: {
          yes: "Campeón del mundo.",
          no: "No entró. La copa se decide sin tu firma.",
          none: "El Mundial se decide sin que la toques.",
        },
        continental_nt: {
          yes: "Continental para tu selección.",
          no: "No entró. El torneo sigue sin ti.",
          none: "El torneo se decide contigo dentro y fuera del partido.",
        },
        semifinal: {
          yes: "A la final, y de tu mano.",
          no: "La eliminatoria queda cuesta arriba.",
          none: "La eliminatoria sigue su curso, y no la firmas tú.",
        },
        promotion: {
          yes: "Un pie en la categoría de arriba.",
          no: "El ascenso se pone cuesta arriba.",
          none: "El ascenso se juega sin tu nombre en él.",
        },
        survival: {
          yes: "Un paso hacia la permanencia.",
          no: "La permanencia se pone fea.",
          none: "La permanencia se pelea sin que te llegue una.",
        },
        derby: {
          yes: "El partido de la temporada no da títulos. Se recuerda igual.",
          no: "El partido de la temporada se pierde.",
          none: "El partido de la temporada se juega sin ti.",
        },
      },
    },

    /**
     * Las eliminatorias que se juegan en pantalla.
     *
     * De octavos en adelante, la Champions, la Libertadores y el Mundial dejan de ser una
     * línea en el resumen y pasan a ser una noche - ver LIVE_ROUNDS. El jugador no decide
     * nada aquí: mira. Por eso el texto no le pregunta nada, solo le cuenta dónde está su
     * equipo y qué se juega esta noche.
     */
    tournament: {
      eyebrow: "Noche de eliminatoria",
      lede: "Esto no lo juegas tú. Lo juega tu equipo, y tú lo ves.",
      /** El partido que se narra: el único, o la vuelta de la eliminatoria. */
      singleLeg: "Partido único",
      secondLeg: "Partido de vuelta",
      firstLeg: "Ida: {us}–{them}",
      aggregate: "Global: {us}–{them}",
      through: "El {club} pasa de ronda",
      out: "El {club} queda eliminado",
      champion: "Campeones de {cup}",
      /** Cuántas noches quedan en la cola de esta temporada. */
      counter: "{n} de {total}",
      next: "Seguir",
      last: "Al resumen de la temporada",
      versus: "Contra",
    },

    season: {
      eyebrow: "Temporada",
      /** Dónde acabó el club. Desde la temporada que viene, también por qué juega Europa. */
      position: "{at}º en liga",
      matches: "Partidos",
      goals: "Goles",
      assists: "Asistencias",
      role: "Rol",
      value: "Valor",
      caps: "Internacionalidades",
      titles: "Títulos",
      awards: "Premios",
      development: "Desarrollo",
      /* Dónde te deja: es el número que la carta del encabezado está mostrando mientras
         lees esta página. La nota decía cuánto creciste y nunca a cuánto. */
      developmentLands: "Te deja en {ovr} OVR",
      doubled: "Doble tirada: se queda la peor por no jugar",
      attended: "asistido",
      earned: "ganado",
      suspended: "Sanción cumplida: sin partidos y sin títulos.",
      promoted: "Ascenso",
      relegated: "Descenso",
      shadow: "La sombra",
      next: "Continuar",

      ficha: "La ficha",
      leaguePosition: "Posici\u00f3n final en liga",
      leagueRank: "{at}.\u00ba",
      honours: "Palmarés del año",
      tournamentRun: "El camino continental",
      tournamentRunWorld: "El camino en el Mundial",
      tournamentPhase: "Fase inicial: {position}º",
      tournamentChampion: "Campeón",
      tournamentExit: "Eliminado",
      /** Una eliminatoria puede acabar en tablas: el resumen tiene que decir cómo se rompió. */
      onPenalties: " (pen.)",
      continentalNext: { main: "Clasificado para la máxima continental", secondary: "Clasificado para la segunda continental", none: "Sin plaza continental" },
      /* Cabecera de la tabla de resultados. Un periódico rotula sus columnas: sin esto,
         "Al segundo palo" junto a "GOL" no dice cuál es la elección y cuál el desenlace. */
      resultsCols: { fixture: "Partido", choice: "Dónde la puso", outcome: "Desenlace" },
      /* Cuando no hubo remate no hay nada que rotular, y la columna no puede quedarse en
         blanco: una casilla vacía se lee como un dato que falta. */
      noChoice: "—",
      /* La noche, antes de la crónica de la mañana siguiente. Ver trophies.jsx. */
      ceremony: "Lo levantaste",
      ceremonyCount: "{current} de {total}",
      ceremonySkip: "Pulsa para continuar",
      /* Lo que el año le hizo a él, entre la portada y el mercado. Es el número contra el
         que se van a tasar todas las ofertas de la pantalla siguiente, así que se dice en
         alto. Bajar no es una pantalla de fracaso: hay años que te quitan algo. */
      growthHeading: "Tu progreso",
      growthFlat: "Sin cambios",
      /* La otra noche. Ver `RelegationDrop` en index.jsx: la ceremonía sube una copa y
         esto cae por debajo de una línea, que es exactamente lo que ha pasado. En segunda
         persona del plural porque bajas con ellos: no es tu descenso, es el del equipo, y
         estabas dentro. */
      relegationEyebrow: "Bajáis",
      relegationNote: "El {club} jugará una división más abajo.",
      /* Subir tenía la misma pantalla que cumplir una sanción: una línea. Es lo más
         grande que le pasa a un club en una temporada, igual que bajar. */
      promotionEyebrow: "Subís",
      promotionNote: "El {club} jugará una división más arriba.",
      perMatch: "Goles por partido",
      nationalTeam: "Selección",
      nationalCaps: "{caps} partidos internacionales",
      nationalMatches: "Partidos",
      nationalGoals: "Goles",
      nationalAssists: "Asistencias",
      nationalSaves: "Paradas",
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
      lockedOne:
        "Tienes contrato en vigor: te queda una temporada. Este verano no puedes firmar por nadie — solo saldrías si un club paga tu cláusula.",
      /* La franja de arriba: qué viene, cuándo, y cuánto de ello estás recogiendo.
         Antes eran tres frases seguidas antes de llegar a la única decisión de la
         pantalla; ahora es una fila de celdas con el mismo idioma que el encabezado. */
      outlookHeading: "Próximo salto",
      /* El tramo, no la edad de llegada: el ciclo dura dos temporadas y se nombra por la
         que lo cierra, así que "20" a los 18 años se leía como "el año que viene". */
      outlookAge: "{from}-{to} años",
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
      dossier: "Expediente final",
      careerSpan: "De los {from} a los {to} a\u00f1os",
      identity: "{position} · {country} · {foot}",
      leftFoot: "zurdo",
      rightFoot: "diestro",
      seasons: "Temporadas",
      matches: "Partidos",
      goals: "Goles",
      assists: "Asistencias",
      peakOvr: "Techo de OVR",
      peakValue: "Valor máximo",
      clubs: "Clubes",
      caps: "Internacionalidades",
      contributionRate: "Goles + asistencias / partido",
      milestones: "Las marcas de la carrera",
      milestonesLede: "Los puntos que explican el recorrido, m\u00e1s all\u00e1 del total.",
      bestLeague: "Mejor puesto en liga",
      topFour: "Temporadas en el top 4",
      leagueTitles: "Ligas",
      continentalTitles: "T\u00edtulos continentales",
      worldCups: "Mundiales",
      promotions: "Ascensos",
      relegations: "Descensos",
      peakSeason: "Temporada de techo",
      peakSeasonValue: "{ovr} OVR a los {age} · {club}",
      journey: "El viaje",
      journeyLede: "Cada etapa, con lo que jugaste, produjiste y ganaste all\u00ed.",
      stintAges: "{from}–{to} a\u00f1os",
      stintSeasons: "{count} temp.",
      stintOutput: "{matches} PJ · {goals} G · {assists} A",
      stintTitles: "{count} t\u00edtulos",
      finalScore: "Balance del duelo",
      comparisonWon: "Ganaste {won} de {total} registros",
      comparisonLost: "La sombra gan\u00f3 {lost} de {total} registros",
      comparisonDraw: "Carrera igualada: {won}–{lost}",
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
      /* Lo que una carta de decisión te presta o te quita esta temporada. Va en la carta
         porque el modelo simula el año con ello dentro: ver `currentStanding`. */
      ovrTemp: "temporal",
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
      /** Cuántas veces la ha levantado, al pulsar una copa de la vitrina. */
      wonTimes: "{n} vez",
      wonTimesPlural: "{n} veces",
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
      breachOne: "You tear up a season of contract",
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
      shotPending: "Yet to come",
      /* The seven ways a chance is played. Each is a different verb in the hand - see the
         header of chancegames.jsx - so the prompt says WHAT is being asked and the hint says
         HOW it is done. Neither can be dropped: the first time one of these comes up, it is
         all the player has. */
      chancePrompt: {
        sweep: "Stop the marker inside the gap",
        window: "Wait. Hit it before it closes",
        bend: "Power first, then the curl",
        charge: "Load the strike, let go on the band",
        aim: "It is moving. Release where it will be",
        dive: "Pick your side. And your moment",
        feint: "Sell it first. Then go",
      },
      chanceGate: "Touch {n} of {total}",
      /** The second half of a feint: the dummy is sold, now it is when you go. */
      chanceGo: "Now",
      chanceHint: {
        sweep: "Press anywhere to strike",
        window: "Press anywhere to strike",
        bend: "Press anywhere to strike",
        charge: "Hold, then release",
        aim: "Drag the crosshair and release on it",
        dive: "Drag to a side and release",
        feint: "Two touches: the dummy and the shot",
      },
      skip: "Skip ahead",
      liveStats: { shots: "Shots", saves: "Saves", danger: "Threat" },
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
        /* A goal is a claim about the scoreline, and the scoreline is settled before anyone
           goes looking for words for it. `any` holds whatever is true at any score; the rest
           is keyed on how the match stands after the goal. See `beatLines` below and
           `standingOf` in narration.js. */
        goalUs: {
          any: [
            "{us} score!",
            "{us} find it! The place comes apart.",
            "{us} strike. A statement.",
            "{us} get one, and at the right time.",
          ],
          ahead: [
            "In! {us} are in front.",
            "{us} score and take the lead.",
          ],
          level: [
            "In! {us} are level.",
            "{us} pull it back. All square again.",
          ],
          behind: [
            "{us} get one back. There is a way in.",
            "{us} score, and it is a match again.",
          ],
        },
        goalThem: {
          any: [
            "{them} score.",
            "{them} get one. Silence.",
            "{them} find the gap.",
            "{them} know exactly what they are doing.",
          ],
          behind: [
            "{them} score and now there is work to do.",
            "A goal for {them}. This is a problem.",
          ],
          level: [
            "{them} level it. Back to nothing.",
            "{them} pull it back. All square.",
          ],
          ahead: [
            "{them} get one back. It tightens.",
            "{them} score, but {us} are still in front.",
          ],
        },
        shotUs: ["{us} shoot from the edge. Inches wide.", "A fierce {us} effort whistles past the post.", "{us} find a yard and try it. Just over."],
        shotThem: ["{them} get a shot away in space. Wide.", "A low {them} drive flashes past the post.", "{them} threaten from the D. Over the bar."],
        saveUs: ["A strong save from {us}, held cleanly.", "{us} get a hand down and erase a huge chance.", "{us} answer in goal and keep the match alive."],
        saveThem: ["The {them} keeper flies across to deny it.", "A huge {them} save; {us} were ready to celebrate.", "Sharp reflexes from the {them} goalkeeper. Still level."],
        tackleUs: ["A clean {us} tackle just as {them} shape to shoot.", "{us} close the door with a perfectly timed challenge.", "A vital {us} recovery tackle. Last line."],
        tackleThem: ["{them} stop the break with a perfect challenge.", "The {them} defence arrive just before the finish.", "A {them} block. That move promised much more."],
        keyPassUs: ["{us} split the lines. The defence opens up.", "A superb {us} through ball, missing only the finish.", "{us} switch play and the whole pitch appears."],
        keyPassThem: ["{them} find an inside pass and force everyone backwards.", "A key {them} pass. The cover arrives at full stretch.", "{them} switch it and make danger from nothing."],
        cornerUs: ["Corner to {us}. The centre-backs go up.", "{us} force a corner and the ground rises.", "Another {us} corner; the box is shrinking."],
        cornerThem: ["Corner to {them}. The box has to be defended.", "{them} load the area for the corner.", "A {them} corner. Everyone behind the ball."],
        offsideUs: ["{us} were clean through, but the flag is up.", "{us} offside by half a step.", "A beautiful {us} move; the line catches it."],
        offsideThem: ["{them} get in behind, ruled offside.", "Flag up. The {them} run was a fraction early.", "{them} were away, but moved too soon."],
        playerSave: ["You stretch and claw it away with a huge hand.", "You read the strike first and smother it low.", "Your reaction save stops a goal that looked certain."],
        playerClaim: ["You come through bodies and own the cross.", "You command the box: high claim, ball secure.", "You attack the cross and allow no second ball."],
        playerLongPass: ["Your long release breaks the first press and starts the attack.", "You restart quickly and turn the save into a transition.", "You look up and find the winger forty yards away."],
        playerTackle: ["You time the challenge and win it clean in a critical area.", "You go to ground, take the ball and lift the stadium.", "You wait, hold your nerve and choose the exact moment to engage."],
        playerBlock: ["You throw your body across a vicious shot.", "You cross its path. The effort dies against you.", "You close the angle and divert the strike clear."],
        playerInterception: ["You read the pass, step in and kill the move.", "You anticipate two steps early and recover without a foul.", "You jump out of the line at the right instant and steal it."],
        playerCarry: ["You carry through one line and force them to retreat.", "You advance until two defenders have to engage.", "You travel thirty yards and change the whole picture."],
        playerRecovery: ["You counter-press and recover before the break can begin.", "You win the second ball and put {us} back on the front foot.", "You reach the loose ball first and reset the attack."],
        playerKeyPass: ["You see the run first and thread the pass.", "Your pass leaves a team-mate facing the goalkeeper.", "You break two lines with the outside of your boot."],
        playerCross: ["Your cross beats the full-back and drops into the finishing zone.", "You reach the outside and whip a hard ball across goal.", "You change pace and hang it behind the centre-back."],
        playerThroughBall: ["You split the defence first-time with a through ball.", "You hide the pass to the final instant and send one clear.", "You weight it perfectly between centre-back and full-back."],
        playerShot: ["You make the yard and test the keeper from range.", "You receive between the lines, turn and shoot at once.", "You attack the rebound and force the goalkeeper to work."],
        playerRun: ["You attack the space behind and drag two defenders with you.", "Your run opens the lane that {us} use.", "You change direction and appear free between the centre-backs."],
        playerHoldUp: ["You hold it with your back to goal and give the side air.", "You pin the centre-backs and lay it off intelligently.", "You absorb the contact, keep it and let the block advance."],
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
        /* A knockout cannot end level. The shootout re-rolls nothing - the trophy is
           already decided, see `settleFinal` - it only says how it went. */
        shootout: [
          "Ninety minutes and nothing in it. Penalties.",
          "Level at the end. To the shootout.",
          "It was not enough. From twelve yards.",
        ],
        shootoutWon: [
          "And the shootout is theirs.",
          "{us} put the last one away. That is that.",
          "{us} win it on penalties.",
        ],
        /* The ties watched from the last sixteen on - see LIVE_ROUNDS - are not the
           player's to decide. He watches them. These are the two lines that close one. */
        extraTime: [
          "Ninety minutes gone. Extra time.",
          "Nothing to separate them. Half an hour more.",
          "Another thirty minutes to break the deadlock.",
        ],
        tieWon: [
          "{us} go through.",
          "And {us} are still in this competition.",
          "The ticket to the next round belongs to {us}.",
        ],
        tieLost: [
          "{us} are out.",
          "The competition ends here for {us}.",
          "{them} go through. {us} watch the rest of it from home.",
        ],
        shootoutLost: [
          "{them} take the shootout.",
          "{us} miss the last one. And that is that.",
          "{us} lose it from twelve yards.",
        ],
      },
      ntFinal: "{cup} final",
      record: "In deciders: {scored} of {taken} · the model rates you at {rate}%",
      versus: "Against",
      leagueContext: {
        title_race: "Title race: {ours} vs {theirs} · {gap} points apart",
        continental_race: "Continental places: {ours} vs {theirs} · {gap} points apart",
        survival_race: "Survival match: {ours} vs {theirs} · {gap} points apart",
        table_neighbor: "Direct league rivals: {ours} vs {theirs} · {gap} points apart",
      },
      /** When the final falls against the old enemy, the final IS the match of the season. */
      alsoDerby: "And it is the match of the season, too.",
      lede: "The model plays everything else. This one you play.",
      choose: "Choose where you put it",
      read: "You get long enough to read him: not that side.",
      gapWas: "The gap: {placement}",
      scored: "GOAL",
      saved: "SAVED",
      /** Coming through is not always scoring. See PRODUCES. */
      verdicts: {
        goal: { won: "GOAL", lost: "SAVED", gap: "The gap: {placement}" },
        stop: { won: "YOU GET THERE", lost: "HE SCORES", gap: "He put it: {placement}" },
        assist: { won: "ASSIST", lost: "IT DOES NOT COME OFF", gap: "The space was: {placement}" },
      },
      /** The third outcome: neither goal nor save, and the only one he cannot be blamed for. */
      absent: "NEVER CAME",
      absentNote: "Not one. The match settled itself without passing through your boots.",
      nailed: "He read it and still could not reach it.",
      next: "Continue",
      summary: "The matches that mattered",
      /** `none` is the night nothing came to him: it settles at DECIDES.absent, off-stage. */
      decides: {
        league: {
          yes: "A huge step towards the league.",
          no: "The league gets harder. It is not gone.",
          none: "The league is decided without a ball reaching you.",
        },
        cup: {
          yes: "The cup is yours.",
          no: "The cup stays in the other dressing room.",
          none: "The cup is played out without passing through you.",
        },
        continental_a: {
          yes: "Continental champions.",
          no: "The final is lost, and there is never another like it.",
          none: "The final settles far from your boots.",
        },
        world_cup: {
          yes: "World champion.",
          no: "No goal. The cup is decided without you.",
          none: "The World Cup is decided without you touching it.",
        },
        continental_nt: {
          yes: "A continental title for your nation.",
          no: "No goal. The tournament carries on without you.",
          none: "The tournament is decided with you on the pitch and out of it.",
        },
        semifinal: {
          yes: "Into the final, and by your foot.",
          no: "The tie is uphill now.",
          none: "The tie runs its course, and not by your foot.",
        },
        promotion: {
          yes: "One foot in the division above.",
          no: "Going up just got harder.",
          none: "Promotion is played out without your name on it.",
        },
        survival: {
          yes: "A step towards staying up.",
          no: "Staying up just got ugly.",
          none: "Survival is fought for without a ball reaching you.",
        },
        derby: {
          yes: "The match of the season wins nothing. It is remembered anyway.",
          no: "The match of the season is lost.",
          none: "The match of the season is played out without you.",
        },
      },
    },

    /**
     * The ties that are played on screen.
     *
     * From the last sixteen on, the Champions League, the Libertadores and the World Cup
     * stop being a line in the summary and become a night - see LIVE_ROUNDS. The player
     * decides nothing here: he watches. So none of this asks him anything; it only says
     * where his side stands and what is at stake tonight.
     */
    tournament: {
      eyebrow: "Knockout night",
      lede: "This one is not yours to play. It is your side's, and you watch it.",
      /** The match being narrated: the only one, or the second leg of the tie. */
      singleLeg: "One-off tie",
      secondLeg: "Second leg",
      firstLeg: "First leg: {us}–{them}",
      aggregate: "Aggregate: {us}–{them}",
      through: "{club} go through",
      out: "{club} are out",
      champion: "Champions of {cup}",
      /** How many nights are left in this season's queue. */
      counter: "{n} of {total}",
      next: "Continue",
      last: "To the season report",
      versus: "Versus",
    },

    season: {
      eyebrow: "Season",
      /** Where the club finished. From next season, also why it is or is not in Europe. */
      position: "{at}th in the league",
      matches: "Matches",
      goals: "Goals",
      assists: "Assists",
      role: "Role",
      value: "Value",
      caps: "Caps",
      titles: "Trophies",
      awards: "Awards",
      development: "Development",
      /* Where it leaves you: the number the masthead card is showing while this page is
         being read. The note said how much he grew and never what he grew to. */
      developmentLands: "Leaves you on {ovr} OVR",
      doubled: "Double roll: the worse one stands, for not playing",
      attended: "attended",
      earned: "earned",
      suspended: "Ban served: no matches and no trophies.",
      promoted: "Promoted",
      relegated: "Relegated",
      shadow: "The shadow",
      next: "Continue",

      ficha: "The card",
      leaguePosition: "Final league position",
      leagueRank: "#{at}",
      honours: "Won this year",
      tournamentRun: "The continental run",
      tournamentRunWorld: "The World Cup run",
      tournamentPhase: "Opening phase: {position}",
      tournamentChampion: "Champions",
      tournamentExit: "Eliminated",
      /** A tie can finish level, so the summary has to say how it was broken. */
      onPenalties: " (pens)",
      continentalNext: { main: "Qualified for the main continental cup", secondary: "Qualified for the secondary continental cup", none: "No continental place" },
      resultsCols: { fixture: "Match", choice: "Where he put it", outcome: "Outcome" },
      noChoice: "—",
      /* The night itself, before the morning's write-up. See trophies.jsx. */
      ceremony: "You lifted it",
      ceremonyCount: "{current} of {total}",
      ceremonySkip: "Press to continue",
      /* What the year did to him, between the front page and the market. It is the number
         every offer on the next screen is priced against, so it gets said out loud. Down is
         not a failure screen: some years take something off you. */
      growthHeading: "Your progress",
      growthFlat: "No change",
      relegationEyebrow: "Down you go",
      relegationNote: "{club} will play a division lower.",
      /* Going up had the same screen a served suspension has: one line. It is the biggest
         thing that happens to a club in a season, exactly as going down is. */
      promotionEyebrow: "Up you go",
      promotionNote: "{club} will play a division higher.",
      perMatch: "Goals per match",
      nationalTeam: "National team",
      nationalCaps: "{caps} international matches",
      nationalMatches: "Matches",
      nationalGoals: "Goals",
      nationalAssists: "Assists",
      nationalSaves: "Saves",
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
      lockedOne:
        "Your deal is still running: one season left. You cannot sign for anybody this summer — the only way out is a club meeting your buy-out.",
      /* The strip up top: what is coming, when, and how much of it he is collecting.
         It used to be three sentences standing between the player and the only decision
         on the screen; it is now a row of cells in the header's own language. */
      outlookHeading: "Next jump",
      /* The span, not the landing age: a cycle runs two seasons and is named after the
         one it ends on, so "20" at eighteen read as next year. */
      outlookAge: "ages {from}-{to}",
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
      dossier: "Final record",
      careerSpan: "From age {from} to {to}",
      identity: "{position} · {country} · {foot}",
      leftFoot: "left-footed",
      rightFoot: "right-footed",
      seasons: "Seasons",
      matches: "Matches",
      goals: "Goals",
      assists: "Assists",
      peakOvr: "Peak OVR",
      peakValue: "Peak value",
      clubs: "Clubs",
      caps: "Caps",
      contributionRate: "Goals + assists / match",
      milestones: "Career marks",
      milestonesLede: "The points that explain the journey beyond its totals.",
      bestLeague: "Best league finish",
      topFour: "Top-four seasons",
      leagueTitles: "League titles",
      continentalTitles: "Continental titles",
      worldCups: "World Cups",
      promotions: "Promotions",
      relegations: "Relegations",
      peakSeason: "Peak season",
      peakSeasonValue: "{ovr} OVR at {age} · {club}",
      journey: "The journey",
      journeyLede: "Every spell, with what you played, produced and won there.",
      stintAges: "Ages {from}–{to}",
      stintSeasons: "{count} seasons",
      stintOutput: "{matches} apps · {goals} G · {assists} A",
      stintTitles: "{count} trophies",
      finalScore: "Head-to-head record",
      comparisonWon: "You won {won} of {total} measures",
      comparisonLost: "The shadow won {lost} of {total} measures",
      comparisonDraw: "An even career: {won}–{lost}",
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
      /* What a decision card is lending or taking from you this season. It is on the card
         because the model simulates the year with it included: see `currentStanding`. */
      ovrTemp: "temporary",
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
      /** How many times he has lifted it, when a cup on the shelf is pressed. */
      wonTimes: "{n} time",
      wonTimesPlural: "{n} times",
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

/**
 * The lines a beat is allowed to use.
 *
 * A beat id holds either a flat list - things that are true whatever the match is doing -
 * or a list split by how the night stands after it (`state` in narration.js), in which case
 * only `any` plus the branch that actually happened are on the table.
 *
 * This is the whole point: "se pone por delante" is a fact about the scoreline, and the
 * scoreline is built before the copy is chosen. A goal that only made it 1-1 must not be
 * able to reach that line. See rule 2 in the header of narration.js.
 */
export function beatLines(copy, id, state = "level") {
  const lines = copy?.match?.beats?.[id];
  if (!lines) return [];
  if (Array.isArray(lines)) return lines;
  if (typeof lines === "string") return [lines];
  return [...(lines.any ?? []), ...(lines[state] ?? [])];
}

/**
 * Singular or plural, picked by the number that is about to go into the line.
 *
 * The contract sheet had been doing this by hand since the first version - `yearsOne` next
 * to `yearsValue` - and everything written afterwards forgot, so the market told a player
 * with one year left that he had "1 temporadas". A game this careful about its numbers
 * cannot be careless about the words attached to them.
 *
 * Deliberately two whole strings rather than a suffix rule: Spanish and English agree here
 * by luck, and the next language will not.
 */
export const countOf = (one, many, n) => (Math.abs(n) === 1 ? one : many);

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
