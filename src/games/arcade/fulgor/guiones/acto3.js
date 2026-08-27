/**
 * FULGOR — ACTO III · EL NOMBRE (capítulos 9-12).
 *
 * El acto de las consecuencias. Ya no se descubre nada sobre el poder: se descubre de dónde
 * salió, quién lo firmó y cuánto cuesta seguir llevándolo. El capítulo 10 es la secuencia
 * insignia y el 12 es la única escena de la campaña con una elección de verdad.
 *
 * LA ESCENA DE ELECCIÓN. `c12_mascara` lleva `opciones`, y cada opción escribe UNA de las
 * tres banderas excluyentes que `story.js` declara para ella. No es un diálogo con vínculo:
 * es la bifurcación de los siete finales, y por eso las tres salidas están escritas con el
 * mismo cuidado y ninguna suena a la correcta.
 */

export const ACTO_III = {

  /* ══ CAPÍTULO 9 · ELÉCTRICA MARÉS ════════════════════════════════════════════════ */

  c9_julia: {
    es: [
      { quien: null, animo: "neutro", texto: "Distrito Financiero. La torre tiene veintiuna plantas y catorce de ellas necesitan tarjeta." },
      { quien: "julia", animo: "tenso", texto: "Mi tarjeta abre de la nueve a la catorce. Caduca el viernes." },
      { quien: "dani", animo: "tenso", texto: "Julia, si la uso, tu padre va a saber de quién era." },
      { quien: "julia", animo: "neutro", texto: "Lo sé. Lo he pensado tres noches enteras y sigue caducando el viernes." },
      { quien: null, animo: "neutro", texto: "La deja sobre el banco entre los dos y no te la da en la mano. Ésa es la diferencia que le permite dormir." },
      { quien: "julia", animo: "tenso", texto: "Si alguien pregunta, la perdí en el gimnasio. Y la perdí en el gimnasio." },
      { quien: "dani", animo: "neutro", texto: "¿Por qué haces esto?" },
      { quien: "julia", animo: "neutro", texto: "Para poder decir dentro de veinte años que hice algo. Es barato y me lo puedo permitir." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "Distrito Financiero. The tower is twenty-one floors and fourteen of them need a card." },
      { quien: "julia", animo: "tenso", texto: "My card opens nine to fourteen. It expires Friday." },
      { quien: "dani", animo: "tenso", texto: "Julia, if I use it your father will know whose it was." },
      { quien: "julia", animo: "neutro", texto: "I know. I've thought about it for three whole nights and it still expires Friday." },
      { quien: null, animo: "neutro", texto: "She leaves it on the bench between you rather than handing it over. That's the difference that lets her sleep." },
      { quien: "julia", animo: "tenso", texto: "If anyone asks, I lost it at the gym. And I did lose it at the gym." },
      { quien: "dani", animo: "neutro", texto: "Why are you doing this?" },
      { quien: "julia", animo: "neutro", texto: "So that in twenty years I can say I did something. It's cheap and I can afford it." },
    ],
  },

  c9_iria: {
    es: [
      { quien: null, animo: "neutro", texto: "Planta doce, escalera de servicio. Aquí no hay cámara porque nadie previó que alguien bajara andando." },
      { quien: "iria", animo: "tenso", texto: "Seis minutos. Después me echan en falta y esto se convierte en otra cosa." },
      { quien: "iria", animo: "neutro", texto: "Proyecto Fulgor. Dos mil cuatro. Dieciséis meses de ensayo y cuatro sujetos, todos menores." },
      { quien: "dani", animo: "tenso", texto: "¿Sujetos?" },
      { quien: "iria", animo: "roto", texto: "Chicos. Se dice sujetos porque así se puede firmar el formulario sin que te tiemble la mano." },
      { quien: "iria", animo: "neutro", texto: "Yo medía qué les pasaba después. Ésa era mi parte y la hice bien, que es lo peor que puedo decir de mí." },
      { quien: "iria", animo: "tenso", texto: "Los cuatro fallaron por lo mismo, y no fue el poder: fue quedarse solos." },
      { quien: null, animo: "neutro", texto: "Te pone un sobre de papel en la mano. Papel, no archivo: lo digital deja rastro." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "Twelfth floor, service stairs. No camera here because nobody imagined anyone walking down." },
      { quien: "iria", animo: "tenso", texto: "Six minutes. After that I'm missed and this becomes something else." },
      { quien: "iria", animo: "neutro", texto: "Project Fulgor. Two thousand and four. Sixteen months of trial and four subjects, all minors." },
      { quien: "dani", animo: "tenso", texto: "Subjects?" },
      { quien: "iria", animo: "roto", texto: "Children. You say subjects so you can sign the form without your hand shaking." },
      { quien: "iria", animo: "neutro", texto: "I measured what happened to them afterwards. That was my part and I did it well, which is the worst thing I can say about myself." },
      { quien: "iria", animo: "tenso", texto: "All four failed for the same reason, and it wasn't the power. It was ending up alone." },
      { quien: null, animo: "neutro", texto: "She puts a paper envelope in your hand. Paper, not a file: digital leaves a trail." },
    ],
  },

  c9_firma: {
    es: [
      { quien: null, animo: "neutro", texto: "Lees el expediente en la escalera de incendios, a las dos de la mañana, con la linterna del móvil tapada con la mano." },
      { quien: null, animo: "neutro", texto: "Autorización de acceso a instalación en desuso. Nave 7, Polígono Norte. Marzo de 2004." },
      { quien: null, animo: "neutro", texto: "Firmado por el técnico de mantenimiento asignado." },
      { quien: null, animo: "roto", texto: "Tomás Vela." },
      { quien: "dani", animo: "roto", texto: "…no." },
      { quien: null, animo: "tenso", texto: "La letra es la de las notas de la nevera. La misma T, el mismo bucle de la V." },
      { quien: null, animo: "neutro", texto: "Tenía veintitrés años. Tenía una hipoteca. Y firmó lo que le pusieron delante, que es lo que hace la gente." },
      { quien: null, animo: "tenso", texto: "La llave que apareció delante de tu portal no apareció. Alguien sabía exactamente en qué portal dejarla." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "You read the file on the fire escape at two in the morning, with your phone torch cupped in your hand." },
      { quien: null, animo: "neutro", texto: "Authorisation of access to disused installation. Unit 7, Polígono Norte. March 2004." },
      { quien: null, animo: "neutro", texto: "Signed by the assigned maintenance technician." },
      { quien: null, animo: "roto", texto: "Tomás Vela." },
      { quien: "dani", animo: "roto", texto: "…no." },
      { quien: null, animo: "tenso", texto: "It's the handwriting from the notes on the fridge. Same T, same loop on the V." },
      { quien: null, animo: "neutro", texto: "He was twenty-three. He had a mortgage. And he signed what they put in front of him, which is what people do." },
      { quien: null, animo: "tenso", texto: "The key didn't just appear outside your door. Somebody knew exactly which door to leave it at." },
    ],
  },

  c9_torre: {
    es: [
      { quien: null, animo: "tenso", texto: "Planta veintiuna. Has entrado con una tarjeta que caduca el viernes y tienes hasta las cuatro y media." },
      { quien: null, animo: "neutro", texto: "A las cuatro y media entra el turno de limpieza y el edificio deja de estar vacío." },
      { quien: "ezequiel", animo: "neutro", texto: "Sé que estás aquí. No hace falta que contestes." },
      { quien: null, animo: "tenso", texto: "La voz sale de la megafonía de planta. Está hablando a un edificio entero por si acaso." },
      { quien: "ezequiel", animo: "decidido", texto: "No te estoy persiguiendo. Te estoy esperando, que es más barato y funciona mejor." },
      { quien: "ezequiel", animo: "neutro", texto: "Ahí abajo hay un contrato con tu nombre. Y arriba una salida. Elige tú, que para eso tienes quince años." },
      { quien: null, animo: "tenso", texto: "Detrás de ti, una a una, se van cerrando las puertas cortafuegos de la planta." },
    ],
    en: [
      { quien: null, animo: "tenso", texto: "Twenty-first floor. You came in on a card that expires Friday and you have until half four." },
      { quien: null, animo: "neutro", texto: "At half four the cleaning shift starts and the building stops being empty." },
      { quien: "ezequiel", animo: "neutro", texto: "I know you're here. You needn't answer." },
      { quien: null, animo: "tenso", texto: "The voice comes from the floor's PA. He's addressing an entire building just in case." },
      { quien: "ezequiel", animo: "decidido", texto: "I'm not chasing you. I'm waiting for you, which is cheaper and works better." },
      { quien: "ezequiel", animo: "neutro", texto: "Downstairs there's a contract with your name on it. Upstairs there's a way out. You choose — that's what being fifteen is for." },
      { quien: null, animo: "tenso", texto: "Behind you, one by one, the fire doors on the floor begin to close." },
    ],
  },

  c9_epilogo: {
    es: [
      { quien: null, animo: "neutro", texto: "Cocina de casa. Las seis y veinte de la mañana. Tu padre está sirviéndose café con el mono ya puesto." },
      { quien: "dani", animo: "roto", texto: "Papá. En 2004, ¿tú firmaste un acceso a la nave 7 del Polígono?" },
      { quien: null, animo: "neutro", texto: "No se le cae la taza. Es peor: la deja despacio en la encimera y se queda mirándola." },
      { quien: "tomas", animo: "roto", texto: "…Sí." },
      { quien: "tomas", animo: "neutro", texto: "Me lo pidió un jefe de área. Me dijo que era un almacén. Y era un almacén, Dani. Yo lo vi vacío." },
      { quien: "dani", animo: "tenso", texto: "¿Y no volviste a entrar?" },
      { quien: "tomas", animo: "roto", texto: "No volví a entrar en veinte años. Ni ahí ni a preguntar." },
      { quien: null, animo: "tenso", texto: "Se sienta. Es la primera vez en toda la campaña que le ves sentarse antes de un turno." },
      { quien: "tomas", animo: "neutro", texto: "Enséñame el papel." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "The kitchen at home. Twenty past six in the morning. Your father is pouring coffee with his overalls already on." },
      { quien: "dani", animo: "roto", texto: "Dad. In 2004, did you sign an access authorisation for Unit 7 in the Polígono?" },
      { quien: null, animo: "neutro", texto: "He doesn't drop the cup. Worse: he sets it down slowly on the worktop and looks at it." },
      { quien: "tomas", animo: "roto", texto: "…Yes." },
      { quien: "tomas", animo: "neutro", texto: "An area manager asked me. He said it was a store. And it was a store, Dani. I saw it empty." },
      { quien: "dani", animo: "tenso", texto: "And you never went back in?" },
      { quien: "tomas", animo: "roto", texto: "I never went back in twenty years. Not in there, and not asking." },
      { quien: null, animo: "tenso", texto: "He sits down. It's the first time in the whole campaign you've seen him sit before a shift." },
      { quien: "tomas", animo: "neutro", texto: "Show me the paper." },
    ],
  },

  /* ══ CAPÍTULO 10 · EL APAGÓN ═════════════════════════════════════════════════════
   * La secuencia insignia. Un solo escenario —la ciudad— y una lista de emergencias
   * simultáneas de las que sólo se puede atender la mitad.
   */

  c10_aviso: {
    es: [
      { quien: null, animo: "neutro", texto: "Las nueve y cuarenta y uno de la noche. Un martes. Marés está cenando." },
      { quien: null, animo: "tenso", texto: "Y Marés se apaga." },
      { quien: null, animo: "neutro", texto: "No parpadea. No baja. Se apaga de golpe, de un extremo al otro, como quien cierra un libro." },
      { quien: "nuria", animo: "tenso", texto: "¿Dani?" },
      { quien: "dani", animo: "neutro", texto: "Estoy aquí. Estoy aquí, no te muevas." },
      { quien: null, animo: "neutro", texto: "Por la ventana, los ocho bloques de enfrente son ocho rectángulos negros. Y detrás, la ciudad entera igual." },
      { quien: null, animo: "tenso", texto: "Sólo hay una cosa encendida en todo el barrio, y está de pie en tu cocina." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "Nine forty-one at night. A Tuesday. Marés is having dinner." },
      { quien: null, animo: "tenso", texto: "And Marés goes out." },
      { quien: null, animo: "neutro", texto: "It doesn't flicker. It doesn't dip. It goes out at once, end to end, like somebody closing a book." },
      { quien: "nuria", animo: "tenso", texto: "Dani?" },
      { quien: "dani", animo: "neutro", texto: "I'm here. I'm here, don't move." },
      { quien: null, animo: "neutro", texto: "Through the window, the eight blocks opposite are eight black rectangles. And behind them, the whole city the same." },
      { quien: null, animo: "tenso", texto: "There's exactly one thing lit in the entire neighbourhood, and it's standing in your kitchen." },
    ],
  },

  c10_apagon: {
    es: [
      { quien: null, animo: "neutro", texto: "Ocho horas. Eso es lo que va a durar, aunque esta noche nadie lo sepa todavía." },
      { quien: "tomas", animo: "tenso", texto: "Esto no es una avería. Las averías empiezan por un sitio." },
      { quien: "tomas", animo: "neutro", texto: "Esto ha caído a la vez en las cuatro subestaciones. A la vez, Dani. Eso no lo hace un fallo." },
      { quien: "dani", animo: "tenso", texto: "¿Qué lo hace?" },
      { quien: "tomas", animo: "roto", texto: "Una orden." },
      { quien: null, animo: "tenso", texto: "En la radio de pilas: semáforos muertos en cuatro cruces, dos ascensores con gente dentro, un hospital sin generadores." },
      { quien: "carmen", animo: "roto", texto: "Estoy en quirófano. Nos quedan cuarenta minutos de batería y la operación son tres horas." },
      { quien: null, animo: "decidido", texto: "Tu poder es lo único que funciona en esta ciudad. Ahora mismo, literalmente lo único." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "Eight hours. That's how long it will last, though nobody knows that tonight." },
      { quien: "tomas", animo: "tenso", texto: "This isn't a fault. Faults start somewhere." },
      { quien: "tomas", animo: "neutro", texto: "This dropped at all four substations at once. At once, Dani. A failure doesn't do that." },
      { quien: "dani", animo: "tenso", texto: "What does?" },
      { quien: "tomas", animo: "roto", texto: "An instruction." },
      { quien: null, animo: "tenso", texto: "On the battery radio: dead lights at four junctions, two lifts with people inside, a hospital with no generators." },
      { quien: "carmen", animo: "roto", texto: "I'm in theatre. We've forty minutes of battery and the operation is three hours." },
      { quien: null, animo: "decidido", texto: "Your power is the only thing working in this city. Right now, literally the only thing." },
    ],
  },

  c10_calle: {
    es: [
      { quien: null, animo: "neutro", texto: "A las once de la noche, Marés hace algo que no estaba previsto: sale a la calle." },
      { quien: null, animo: "neutro", texto: "La gente baja con velas, con linternas, con los móviles al treinta por ciento. Nadie se queda en casa a oscuras." },
      { quien: "pilar", animo: "decidido", texto: "¡El portal se queda abierto! ¡Que pase el que necesite un sitio!" },
      { quien: "oscar", animo: "neutro", texto: "Estoy en el cruce de la avenida parando coches con una linterna. Alguien tenía que hacerlo." },
      { quien: "isma", animo: "decidido", texto: "Tengo la emisora, tengo batería y tengo un mapa. Dime a dónde vas y te canto lo siguiente." },
      { quien: null, animo: "tenso", texto: "Seis emergencias en el papel de Isma. A tres se puede llegar. A tres no." },
      { quien: "isma", animo: "tenso", texto: "Dani. El quirófano de tu madre está en las seis." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "At eleven at night, Marés does something nobody planned: it comes outside." },
      { quien: null, animo: "neutro", texto: "People come down with candles, with torches, with phones on thirty per cent. Nobody stays in the dark indoors." },
      { quien: "pilar", animo: "decidido", texto: "The door stays open! Anyone who needs somewhere, come in!" },
      { quien: "oscar", animo: "neutro", texto: "I'm on the avenue junction stopping cars with a torch. Somebody had to." },
      { quien: "isma", animo: "decidido", texto: "I've got the scanner, I've got battery and I've got a map. Tell me where you're going and I'll call the next one." },
      { quien: null, animo: "tenso", texto: "Six emergencies on Isma's sheet. Three are reachable. Three aren't." },
      { quien: "isma", animo: "tenso", texto: "Dani. Your mother's theatre is one of the six." },
    ],
  },

  c10_quirofano: {
    es: [
      { quien: null, animo: "neutro", texto: "Hospital del Puerto, planta tercera. El cuadro general está en un cuarto de dos metros por dos." },
      { quien: null, animo: "tenso", texto: "Metes la mano en la barra de cobre y la corriente sale de ti hacia el edificio, no al revés." },
      { quien: null, animo: "neutro", texto: "Los monitores del quirófano vuelven. Alguien dentro dice «ya está» con una voz muy normal." },
      { quien: "carmen", animo: "decidido", texto: "Pinza. Sigue, sigue, que tenemos luz." },
      { quien: null, animo: "tenso", texto: "Tres horas. Hay que aguantar tres horas de pie con la mano dentro de un cuadro eléctrico." },
      { quien: "larga", animo: "neutro", texto: "Y yo tengo que cortar la última línea de este distrito. Es lo que me han mandado hacer." },
      { quien: null, animo: "roto", texto: "Está al final del pasillo. No corre. Nunca corre." },
      { quien: "larga", animo: "tenso", texto: "Puedes soltar y venir a pararme. O quedarte ahí. No hay una tercera cosa." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "Hospital del Puerto, third floor. The main board is in a room two metres by two." },
      { quien: null, animo: "tenso", texto: "You put your hand on the copper bar and the current runs out of you into the building, not the other way." },
      { quien: null, animo: "neutro", texto: "The theatre monitors come back. Somebody inside says 'there we go' in a completely ordinary voice." },
      { quien: "carmen", animo: "decidido", texto: "Clamp. Keep going, keep going, we've got light." },
      { quien: null, animo: "tenso", texto: "Three hours. You have to hold three hours standing with your hand inside a distribution board." },
      { quien: "larga", animo: "neutro", texto: "And I have to cut the last line in this district. That's what I was sent to do." },
      { quien: null, animo: "roto", texto: "She's at the end of the corridor. She doesn't run. She never runs." },
      { quien: "larga", animo: "tenso", texto: "You can let go and come and stop me. Or stay there. There's no third thing." },
    ],
  },

  c10_epilogo: {
    es: [
      { quien: null, animo: "neutro", texto: "La luz vuelve a las cinco y cuarenta y ocho de la mañana, sola, como si nunca se hubiera ido." },
      { quien: null, animo: "neutro", texto: "En la ciudad hay ciento veinte personas en la calle aplaudiendo a nada en concreto." },
      { quien: "carmen", animo: "roto", texto: "Ocho horas de quirófano sin generador. Ocho." },
      { quien: "carmen", animo: "neutro", texto: "Y alguien mantuvo la luz. No sé quién." },
      { quien: null, animo: "tenso", texto: "Deja la frase ahí, en mitad de la cocina, sin acabarla. Y luego la acaba." },
      { quien: "carmen", animo: "tenso", texto: "Sí sé quién." },
      { quien: null, animo: "neutro", texto: "En la comisaría, Sabater tiene la chincheta número dieciséis en la mano y no la clava." },
      { quien: "sabater", animo: "roto", texto: "…Un hospital entero. Ocho horas." },
      { quien: null, animo: "tenso", texto: "La clava. Porque es buena en su trabajo, y ésa es exactamente la tragedia del personaje." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "The power comes back at five forty-eight in the morning, on its own, as if it had never gone." },
      { quien: null, animo: "neutro", texto: "There are a hundred and twenty people out in the street applauding nothing in particular." },
      { quien: "carmen", animo: "roto", texto: "Eight hours of theatre with no generator. Eight." },
      { quien: "carmen", animo: "neutro", texto: "And somebody kept the lights on. I don't know who." },
      { quien: null, animo: "tenso", texto: "She leaves the sentence there, in the middle of the kitchen, unfinished. And then she finishes it." },
      { quien: "carmen", animo: "tenso", texto: "I do know who." },
      { quien: null, animo: "neutro", texto: "At the station, Sabater has pin number sixteen in her hand and doesn't push it in." },
      { quien: "sabater", animo: "roto", texto: "…An entire hospital. Eight hours." },
      { quien: null, animo: "tenso", texto: "She pushes it in. Because she's good at her job, and that is exactly this character's tragedy." },
    ],
  },

  /* ══ CAPÍTULO 11 · CERO ══════════════════════════════════════════════════════════ */

  c11_cofre: {
    es: [
      { quien: null, animo: "neutro", texto: "Las Tolvas. La central vieja lleva cerrada desde antes de que nacieras y la valla lleva abierta casi lo mismo." },
      { quien: null, animo: "neutro", texto: "Dentro hay un cofre igual que el de la nave 7. Idéntico. El mismo modelo, la misma bisagra rota." },
      { quien: "cero", animo: "neutro", texto: "Adelante. La puerta lleva cuarenta años sin cerrarse por dentro." },
      { quien: null, animo: "neutro", texto: "Es un hombre mayor con un jersey gris. Podría ser el abuelo de cualquiera de tu clase." },
      { quien: "cero", animo: "neutro", texto: "Cuatro antes que tú. Los cuatro entraron aquí con la misma cara que tienes ahora." },
      { quien: "dani", animo: "tenso", texto: "¿Quién es usted?" },
      { quien: "cero", animo: "tenso", texto: "Empiezas por ahí. Los que empiezan por ahí duran menos, pero contestaré igual." },
      { quien: "cero", animo: "neutro", texto: "Me llamaban Sesé. Diseñé el proyecto, diseñé el cofre y decidí dónde se dejaban las llaves." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "Las Tolvas. The old station has been shut since before you were born and the fence has been open nearly as long." },
      { quien: null, animo: "neutro", texto: "Inside there's a chest identical to the one in Unit 7. Identical. Same model, same broken hinge." },
      { quien: "cero", animo: "neutro", texto: "Come in. That door hasn't locked from the inside in forty years." },
      { quien: null, animo: "neutro", texto: "He's an older man in a grey jumper. He could be anyone's grandfather." },
      { quien: "cero", animo: "neutro", texto: "Four before you. All four came in with the face you're wearing now." },
      { quien: "dani", animo: "tenso", texto: "Who are you?" },
      { quien: "cero", animo: "tenso", texto: "You start there. The ones who start there last the least, but I'll answer anyway." },
      { quien: "cero", animo: "neutro", texto: "They called me Sesé. I designed the project, I designed the chest, and I decided where the keys were left." },
    ],
  },

  c11_cuatro: {
    es: [
      { quien: null, animo: "neutro", texto: "Cuatro camastros. Cuatro cajas de cartón con el nombre escrito en el lateral con rotulador." },
      { quien: "cero", animo: "neutro", texto: "Mira dentro. Ninguna de las cuatro tiene una foto de familia. Ninguna." },
      { quien: "cero", animo: "tenso", texto: "No es casualidad. Es el requisito." },
      { quien: "dani", animo: "decidido", texto: "Yo tengo una hermana." },
      { quien: "cero", animo: "neutro", texto: "Todos dijeron eso. Uno lo dijo llorando y fue el que menos duró." },
      { quien: "cero", animo: "decidido", texto: "El poder no cabe en una vida con gente dentro. No es moral: es aritmética." },
      { quien: "cero", animo: "neutro", texto: "Cada persona que sabe de ti es una superficie por la que se te puede empujar." },
      { quien: null, animo: "tenso", texto: "En la cuarta caja hay una libreta de espiral con la letra más bonita que has visto en tu vida. Pone «Noor»." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "Four cots. Four cardboard boxes with names written on the side in marker pen." },
      { quien: "cero", animo: "neutro", texto: "Look inside. Not one of the four has a family photograph. Not one." },
      { quien: "cero", animo: "tenso", texto: "That isn't chance. That's the requirement." },
      { quien: "dani", animo: "decidido", texto: "I have a sister." },
      { quien: "cero", animo: "neutro", texto: "They all said that. One said it crying, and he lasted the least." },
      { quien: "cero", animo: "decidido", texto: "Power doesn't fit in a life with people in it. Not morality: arithmetic." },
      { quien: "cero", animo: "neutro", texto: "Every person who knows about you is a surface you can be pushed by." },
      { quien: null, animo: "tenso", texto: "In the fourth box there's a spiral notebook with the most beautiful handwriting you've ever seen. It says 'Noor'." },
    ],
  },

  c11_larga: {
    es: [
      { quien: null, animo: "neutro", texto: "Sale de detrás del cofre, y por primera vez lo hace con luz encima." },
      { quien: "larga", animo: "neutro", texto: "Segunda caja. La del rotulador medio borrado." },
      { quien: null, animo: "tenso", texto: "En el lateral, debajo del borrón, todavía se lee: «Sara»." },
      { quien: "larga", animo: "roto", texto: "Me llamaba Sara. Y hace ocho años que no lo digo en voz alta." },
      { quien: "dani", animo: "tenso", texto: "Trabajas para él." },
      { quien: "larga", animo: "neutro", texto: "Trabajo para el que encendió las luces. Es lo más limpio que te voy a decir en toda tu vida." },
      { quien: "larga", animo: "tenso", texto: "Y te dejé vivo en aquel callejón porque él me lo pidió. Ya sabes lo que significa eso." },
      { quien: "cero", animo: "neutro", texto: "Significa que quiero que elijas tú. Llevo cuarenta años esperando a que uno elija." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "She steps out from behind the chest, and for the first time she does it with light on her." },
      { quien: "larga", animo: "neutro", texto: "Second box. The one with the marker half rubbed off." },
      { quien: null, animo: "tenso", texto: "On the side, under the smudge, you can still read: 'Sara'." },
      { quien: "larga", animo: "roto", texto: "My name was Sara. And I haven't said it out loud in eight years." },
      { quien: "dani", animo: "tenso", texto: "You work for him." },
      { quien: "larga", animo: "neutro", texto: "I work for whoever switched the lights on. That's the cleanest thing I'll ever say to you." },
      { quien: "larga", animo: "tenso", texto: "And I left you alive in that alley because he asked me to. You know what that means." },
      { quien: "cero", animo: "neutro", texto: "It means I want you to choose. I've waited forty years for one of them to choose." },
    ],
  },

  c11_chantaje: {
    es: [
      { quien: "cero", animo: "decidido", texto: "No va a haber combate. Nunca lo ha habido, y eso es lo que ninguno entendió a tiempo." },
      { quien: null, animo: "neutro", texto: "Saca un teléfono viejo, de los de tapa, y lo deja abierto sobre el cofre." },
      { quien: "cero", animo: "neutro", texto: "Tengo el número directo de la inspectora Sabater y tengo tu nombre completo." },
      { quien: "cero", animo: "tenso", texto: "Se lo doy, o no se lo doy. Depende de si dejas el poder esta noche." },
      { quien: "dani", animo: "roto", texto: "¿Y si lo dejo?" },
      { quien: "cero", animo: "neutro", texto: "Devuelves la llave, vuelves a clase el lunes y su expediente no se cierra nunca." },
      { quien: "cero", animo: "neutro", texto: "Es limpio. Es reversible. Y es la primera vez que alguien te ofrece salir entero." },
      { quien: null, animo: "tenso", texto: "El reloj de la campaña empieza a correr aquí. Cada pista que le quites al expediente de Sabater es una hora que ganas." },
    ],
    en: [
      { quien: "cero", animo: "decidido", texto: "There won't be a fight. There never has been, and that's what none of them understood in time." },
      { quien: null, animo: "neutro", texto: "He takes out an old flip phone and leaves it open on top of the chest." },
      { quien: "cero", animo: "neutro", texto: "I have Inspector Sabater's direct number and I have your full name." },
      { quien: "cero", animo: "tenso", texto: "I give it to her, or I don't. It depends on whether you give up the power tonight." },
      { quien: "dani", animo: "roto", texto: "And if I do?" },
      { quien: "cero", animo: "neutro", texto: "You return the key, you go back to school on Monday, and her file never closes." },
      { quien: "cero", animo: "neutro", texto: "It's clean. It's reversible. And it's the first time anyone has offered you a whole life." },
      { quien: null, animo: "tenso", texto: "The campaign clock starts here. Every clue you pull from Sabater's file is an hour you buy." },
    ],
  },

  c11_epilogo: {
    es: [
      { quien: null, animo: "neutro", texto: "Vuelves andando desde las Tolvas. Son once kilómetros y los haces enteros porque necesitas los once." },
      { quien: null, animo: "tenso", texto: "En el bolsillo llevas una libreta de espiral que no es tuya y una decisión que tampoco lo parece." },
      { quien: "vigia", animo: "neutro", texto: "Ha bajado del faro. Está sentada en el bordillo de tu calle, con las manos entre las rodillas." },
      { quien: "vigia", animo: "tenso", texto: "Sesé me dijo lo mismo a los diecisiete. Con las mismas palabras y en la misma sala." },
      { quien: "dani", animo: "roto", texto: "¿Y tú qué hiciste?" },
      { quien: "vigia", animo: "roto", texto: "Le creí. Tardé ocho años en darme cuenta de que él nunca lo probó." },
      { quien: "vigia", animo: "decidido", texto: "Me llamo Noor. Ya está dicho. Ha sido más fácil de lo que pensaba." },
      { quien: null, animo: "neutro", texto: "Y arriba, en tu cuarto, hay una luz encendida a las cuatro de la mañana. Nuria está esperando despierta." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "You walk back from Las Tolvas. It's eleven kilometres and you do all of them because you need all eleven." },
      { quien: null, animo: "tenso", texto: "In your pocket there's a spiral notebook that isn't yours and a decision that doesn't feel like yours either." },
      { quien: "vigia", animo: "neutro", texto: "She's come down from the lighthouse. She's sitting on the kerb of your street, hands between her knees." },
      { quien: "vigia", animo: "tenso", texto: "Sesé said the same to me at seventeen. Same words, same room." },
      { quien: "dani", animo: "roto", texto: "And what did you do?" },
      { quien: "vigia", animo: "roto", texto: "I believed him. It took me eight years to notice he never tried it himself." },
      { quien: "vigia", animo: "decidido", texto: "My name is Noor. There. That was easier than I expected." },
      { quien: null, animo: "neutro", texto: "And upstairs, in your room, a light is on at four in the morning. Nuria has waited up." },
    ],
  },

  /* ══ CAPÍTULO 12 · EL NOMBRE ═════════════════════════════════════════════════════ */

  c12_central: {
    es: [
      { quien: null, animo: "tenso", texto: "A las siete y diez de la mañana, la central de las Tolvas arranca por primera vez en cuarenta años." },
      { quien: "tomas", animo: "roto", texto: "Está tirando de las cuatro subestaciones a la vez. Va a reventar la red antes de mediodía." },
      { quien: "ezequiel", animo: "decidido", texto: "Marés consume más de lo que produce desde hace cuarenta años. Alguien tenía que encender algo." },
      { quien: "iria", animo: "tenso", texto: "El diseño no está roto. El diseño es ése: la carga pasa por un cuerpo." },
      { quien: "dani", animo: "tenso", texto: "¿Por un cuerpo?" },
      { quien: "iria", animo: "roto", texto: "Por el tuyo. Sólo hay una persona en esta ciudad capaz de cerrar ese circuito, y él lo sabe." },
      { quien: null, animo: "neutro", texto: "Y esta vez está todo el mundo mirando. La plaza de La Concha lleva desde las ocho llena de gente con el móvil en alto." },
    ],
    en: [
      { quien: null, animo: "tenso", texto: "At ten past seven in the morning, the Tolvas station starts up for the first time in forty years." },
      { quien: "tomas", animo: "roto", texto: "It's pulling from all four substations at once. It'll take the grid out before midday." },
      { quien: "ezequiel", animo: "decidido", texto: "Marés has consumed more than it produces for forty years. Somebody had to switch something on." },
      { quien: "iria", animo: "tenso", texto: "The design isn't broken. The design is this: the load passes through a body." },
      { quien: "dani", animo: "tenso", texto: "Through a body?" },
      { quien: "iria", animo: "roto", texto: "Through yours. There's one person in this city who can close that circuit, and he knows it." },
      { quien: null, animo: "neutro", texto: "And this time everyone is watching. La Concha has been full since eight, phones held up." },
    ],
  },

  c12_reparto: {
    es: [
      { quien: null, animo: "neutro", texto: "El traje no lo has hecho tú. Ésa es la parte que el capítulo 1 no habría podido imaginarse." },
      { quien: "chapa", animo: "decidido", texto: "Corte y costura. Y le he metido el hilo que se funde solo, que sólo aguanta una vez." },
      { quien: "yusuf", animo: "neutro", texto: "El forro es de trajes de soldar. No es bonito. Lo bonito se ve desde lejos." },
      { quien: "iria", animo: "tenso", texto: "Yo te he calculado el aislamiento. Tres veces, porque la primera me salió que morías." },
      { quien: "julia", animo: "neutro", texto: "Y yo te he sacado los planos de la sala de control. En papel. Ya sabéis por qué en papel." },
      { quien: "isma", animo: "decidido", texto: "Yo llevo la emisora. Como en el apagón. Se me da bien y no pienso discutirlo." },
      { quien: null, animo: "decidido", texto: "Cero decía que cada persona que sabe de ti es una superficie por la que te pueden empujar." },
      { quien: null, animo: "neutro", texto: "Estás de pie en un taller con cinco personas que saben, y ninguna te está empujando." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "You didn't make the suit. That's the part chapter one could never have imagined." },
      { quien: "chapa", animo: "decidido", texto: "Cut and stitch. And I've put in the thread that melts, which only holds once." },
      { quien: "yusuf", animo: "neutro", texto: "The lining's welding-suit fibre. It isn't handsome. Handsome shows up at a distance." },
      { quien: "iria", animo: "tenso", texto: "I calculated your insulation. Three times, because the first answer had you dying." },
      { quien: "julia", animo: "neutro", texto: "And I got you the control room plans. On paper. You all know why on paper." },
      { quien: "isma", animo: "decidido", texto: "I'm on the scanner. Like the blackout. I'm good at it and I'm not discussing it." },
      { quien: null, animo: "decidido", texto: "Cero said every person who knows about you is a surface you can be pushed by." },
      { quien: null, animo: "neutro", texto: "You're standing in a workshop with five people who know, and not one of them is pushing." },
    ],
  },

  c12_mascara: {
    es: [
      { quien: null, animo: "tenso", texto: "Sala de control. La central está a un noventa por ciento y la plaza entera te está mirando por una cámara de móvil." },
      { quien: "sabater", animo: "neutro", texto: "Estoy en el cordón. Y tengo el informe encima, sin elevar, desde hace cuatro días." },
      { quien: "marga", animo: "tenso", texto: "Yo cierro a las once. Lo que me des antes de las once lo escribo yo. Después lo escribe otro." },
      { quien: "nuria", animo: "roto", texto: "Estoy en la plaza. Con mamá. Te estamos viendo." },
      { quien: null, animo: "tenso", texto: "Para cerrar el circuito hay que quitarse el guante. Y para quitarse el guante hay que quitarse la máscara." },
      { quien: null, animo: "neutro", texto: "Ésta es la última pregunta del juego y no tiene respuesta correcta." },
      {
        quien: "dani",
        animo: "tenso",
        texto: "¿Y ahora qué hago?",
        opciones: [
          {
            id: "desenmascaradoVoluntario",
            label: "Quitártela tú",
            dice: "Vale. Que lo vean.",
            quienResponde: "marga",
            responde: "Entonces lo escribo bien, chaval. Por una vez voy a escribir algo bien.",
          },
          {
            id: "relevoAceptado",
            label: "Pasarle la llave a otro",
            dice: "Noor. Ven aquí. Esto lo cerramos entre las dos manos.",
            quienResponde: "vigia",
            responde: "…Nueve años esperando a que alguien me pidiera algo. Vale. Vamos.",
          },
          {
            id: "seguirEnmascarado",
            label: "Cerrar con la máscara puesta",
            dice: "No. Lo hago con la máscara puesta o no lo hago.",
            quienResponde: "sabater",
            responde: "Lo suponía. Y por eso el informe sigue encima de mi mesa sin elevar.",
          },
        ],
      },
    ],
    en: [
      { quien: null, animo: "tenso", texto: "Control room. The station is at ninety per cent and the whole plaza is watching you through a phone camera." },
      { quien: "sabater", animo: "neutro", texto: "I'm at the cordon. And I've had the report on my desk, unfiled, for four days." },
      { quien: "marga", animo: "tenso", texto: "I close at eleven. What you give me before eleven, I write. After that, someone else does." },
      { quien: "nuria", animo: "roto", texto: "I'm in the plaza. With Mum. We're watching you." },
      { quien: null, animo: "tenso", texto: "To close the circuit you have to take the glove off. And to take the glove off you have to take the mask off." },
      { quien: null, animo: "neutro", texto: "This is the game's last question and it has no right answer." },
      {
        quien: "dani",
        animo: "tenso",
        texto: "So what do I do?",
        opciones: [
          {
            id: "desenmascaradoVoluntario",
            label: "Take it off yourself",
            dice: "All right. Let them see.",
            quienResponde: "marga",
            responde: "Then I write it properly, kid. For once I'm going to write something properly.",
          },
          {
            id: "relevoAceptado",
            label: "Pass the key on",
            dice: "Noor. Get over here. We close this with two pairs of hands.",
            quienResponde: "vigia",
            responde: "…Nine years waiting for somebody to ask me for something. All right. Let's go.",
          },
          {
            id: "seguirEnmascarado",
            label: "Close it masked",
            dice: "No. I do it with the mask on or I don't do it.",
            quienResponde: "sabater",
            responde: "I thought as much. Which is why the report is still on my desk, unfiled.",
          },
        ],
      },
    ],
  },

  c12_epilogo: {
    es: [
      { quien: null, animo: "neutro", texto: "La central se para a las once y cuarenta y tres. No explota, no arde: se para, con un zumbido que baja de tono durante veinte segundos." },
      { quien: null, animo: "neutro", texto: "Y luego Marés hace la cosa más rara de las ocho horas de campaña: se queda en silencio." },
      { quien: null, animo: "tenso", texto: "Ciento veinte personas en una plaza sin decir nada, con los móviles bajados." },
      { quien: "nuria", animo: "roto", texto: "Dani." },
      { quien: null, animo: "neutro", texto: "Es la primera que echa a andar. Siempre iba a ser la primera." },
      { quien: null, animo: "neutro", texto: "Lo que pase a partir de aquí depende de trece expedientes, de un Rango y de las cosas que decidiste en las Tolvas." },
      { quien: null, animo: "decidido", texto: "Ninguno de los siete finales está etiquetado como bueno o malo. Ése fue el trato desde el capítulo 1." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "The station stops at eleven forty-three. It doesn't explode, it doesn't burn: it stops, with a hum that falls in pitch for twenty seconds." },
      { quien: null, animo: "neutro", texto: "And then Marés does the strangest thing in eight hours of campaign: it goes quiet." },
      { quien: null, animo: "tenso", texto: "A hundred and twenty people in a plaza saying nothing, phones lowered." },
      { quien: "nuria", animo: "roto", texto: "Dani." },
      { quien: null, animo: "neutro", texto: "She's the first to start walking. She was always going to be the first." },
      { quien: null, animo: "neutro", texto: "What happens from here depends on thirteen files, on a standing, and on what you decided at Las Tolvas." },
      { quien: null, animo: "decidido", texto: "None of the seven endings is labelled good or bad. That was the deal from chapter one." },
    ],
  },

  /* ── Aperturas de Intervención decisiva ──────────────────────────── */

  c11_carrera: {
    es: [
      { quien: null, animo: "tenso", texto: "No es un combate. Es un reloj." },
      { quien: "cero", animo: "neutro", texto: "Yo no voy a llamar todavía. Soy un hombre paciente y me interesa mucho ver qué haces." },
      { quien: null, animo: "neutro", texto: "El expediente de Sabater tiene las pistas que tiene, y cada una se puede retirar si sabes dónde está." },
      { quien: "isma", animo: "decidido", texto: "Dime cuáles y yo me encargo. Se me da mejor esconder que encontrar, ya lo hemos hablado." },
      { quien: "julia", animo: "neutro", texto: "Los partes de faltas los puedo tocar yo. Una hora, y que nadie me vea entrar." },
      { quien: "yusuf", animo: "tenso", texto: "El trozo de tela con mi hilo lo quemo esta noche. Eso son dos, no una." },
      { quien: null, animo: "decidido", texto: "Cero decía que cada confidente es una superficie por la que te empujan. Aquí van a ser cuatro pares de manos vaciando una carpeta." },
    ],
    en: [
      { quien: null, animo: "tenso", texto: "It isn't a fight. It's a clock." },
      { quien: "cero", animo: "neutro", texto: "I shan't call just yet. I'm a patient man and I'm very interested in what you do." },
      { quien: null, animo: "neutro", texto: "Sabater's file holds the clues it holds, and each one can be pulled if you know where it is." },
      { quien: "isma", animo: "decidido", texto: "Tell me which and I'll handle it. I'm better at hiding than finding, we've established that." },
      { quien: "julia", animo: "neutro", texto: "I can get at the absence records. One hour, and nobody sees me go in." },
      { quien: "yusuf", animo: "tenso", texto: "The scrap with my thread in it burns tonight. That's two, not one." },
      { quien: null, animo: "decidido", texto: "Cero said every confidant is a surface you get pushed by. Here it's four pairs of hands emptying a folder." },
    ],
  },

  c12_fases: {
    es: [
      { quien: null, animo: "tenso", texto: "Dos cosas a la vez, y las dos en la misma sala." },
      { quien: null, animo: "neutro", texto: "La central subiendo hacia el cien por cien. Y Larga entre tú y el cuadro de corte." },
      { quien: "larga", animo: "neutro", texto: "Bajo la torre de refrigeración. Ahí está el corte real, y no donde pone en tu plano." },
      { quien: "dani", animo: "tenso", texto: "¿Por qué me lo dices?" },
      { quien: "larga", animo: "tenso", texto: "Porque sigo aquí de pie delante de ti. Las dos cosas son verdad a la vez." },
      { quien: "larga", animo: "roto", texto: "Considéralo lo único bueno que voy a hacer esta década." },
      { quien: null, animo: "decidido", texto: "Primera fase: ella. Segunda fase: cuarenta años de central." },
    ],
    en: [
      { quien: null, animo: "tenso", texto: "Two things at once, and both in the same room." },
      { quien: null, animo: "neutro", texto: "The station climbing towards a hundred per cent. And Larga between you and the isolator." },
      { quien: "larga", animo: "neutro", texto: "Under the cooling tower. That's where the real cut is, not where your plan says." },
      { quien: "dani", animo: "tenso", texto: "Why tell me?" },
      { quien: "larga", animo: "tenso", texto: "Because I'm still standing here in front of you. Both things are true at once." },
      { quien: "larga", animo: "roto", texto: "Consider it the one good thing I do this decade." },
      { quien: null, animo: "decidido", texto: "First phase: her. Second phase: forty years of power station." },
    ],
  },

};
