/**
 * FULGOR — las voces del barrio y del muelle.
 *
 * La portera, el del locutorio y los tres de Los Cabos. Ninguno de los cinco tiene poderes y
 * ninguno de los cinco necesita que se los expliques: viven en la parte de Marés donde la
 * gente lleva toda la vida sabiendo cosas y no diciéndolas. Es exactamente el mismo oficio
 * que el de Dani, sólo que ellos lo aprendieron sin que les cayera un rayo.
 */

export const BARRIO = {

  /* ── Doña Pilar · la portera · no entiende de superhéroes, entiende de horarios ───
   * El expediente más peligroso del acto I y nadie se lo espera. No mira cámaras: mira el
   * portal, y el portal lo ve todo. Habla en tercera persona de sí misma cuando se pone digna.
   */
  pilar: {
    es: {
      1: {
        asuntos: [
          [
            { a: "neutro", t: "Anoche hubo un ruido en el portal. Un chisporroteo, como de cables." },
            { a: "tenso", t: "Yo no digo nada. Pero una tiene ojos, hijo." },
            { a: "neutro", t: "Y a la una menos cuarto una está despierta, que es cuando pasan las cosas." },
          ],
          [
            { a: "neutro", t: "Dile a tu madre que el recibo de la luz del bloque ha subido un veinte por ciento." },
            { a: "tenso", t: "Un veinte. Y aquí no ha entrado nadie nuevo ni se ha comprado nadie una estufa." },
            { a: "neutro", t: "Algo se está bebiendo la luz de este edificio. Y no es la escalera." },
          ],
          [
            { a: "neutro", t: "Fregar el portal a las siete tiene una ventaja: se ve quién vuelve y quién no ha ido." },
            { a: "neutro", t: "Llevo cuarenta y un años fregando este portal, hijo." },
            { a: "tenso", t: "Cuarenta y uno. Aquí no se me escapa ni una bombilla." },
          ],
        ],
        pregunta: "¿Qué le digo a Doña Pilar?",
        opciones: [
          { id: "honesto", label: "Reconocer la hora", texto: "Ayer llegué tarde, sí. Y no fue la única vez.", replica: "Ya lo sé. Lo que me gusta es que lo digas tú. Sube, anda, que hace frío." },
          { id: "proteger", label: "Culpar a la instalación", texto: "Es el cuadro de luces, Doña Pilar. Lleva años fatal.", replica: "El cuadro. Ya. Pues el cuadro tiene tus horarios, mira qué casualidad." },
          { id: "preguntar", label: "Preguntar qué oyó exactamente", texto: "El ruido de anoche. ¿A qué hora fue?", replica: "A la una menos cuarto. Y a las dos otro más flojo. Los apunto, ¿sabes? En la libreta del gas." },
        ],
        repite: [{ a: "neutro", t: "Hijo, que ya te he dado la charla. Que tengo que fregar." }],
      },
      2: {
        asuntos: [
          [
            { a: "tenso", t: "Ha venido una señora preguntando por los vecinos. Muy amable, muy peinada." },
            { a: "neutro", t: "Le he dicho lo que se le dice a la gente amable: la hora y el tiempo." },
            { a: "neutro", t: "Que en este portal la información se paga en confianza, y ella no tenía." },
          ],
          [
            { a: "neutro", t: "Al niño del cuarto le han hecho un manto con una sábana. Le queda fatal." },
            { a: "tenso", t: "Y su madre llorando, porque el crío se ha tirado del sofá diciendo que salvaba a alguien." },
            { a: "neutro", t: "Eso es lo que hacen los héroes, hijo: que los niños se tiren de los sofás." },
          ],
          [
            { a: "roto", t: "Mi marido trabajó en la central vieja. En la de las Tolvas." },
            { a: "neutro", t: "Volvía con un dolor de cabeza que no se le quitaba con nada." },
            { a: "tenso", t: "Y la empresa dijo que era el turno. Siempre es el turno." },
          ],
        ],
        pregunta: "¿Qué le digo a Doña Pilar?",
        opciones: [
          { id: "honesto", label: "Agradecerle el silencio", texto: "Gracias por no contarle nada a esa señora.", replica: "No he hecho nada por ti. He hecho lo de siempre. Pero de nada, hijo." },
          { id: "proteger", label: "Hacerse el tonto", texto: "¿Y qué quería, la señora?", replica: "Lo que quieren todas las señoras peinadas: un nombre. Y aquí no se dan nombres." },
          { id: "preguntar", label: "Preguntar por su marido", texto: "¿Qué le pasó a su marido en las Tolvas?", replica: "Lo que le pasa a los que están cerca de esas cosas sin que nadie les avise. Ten cuidado tú." },
        ],
        repite: [{ a: "neutro", t: "Que ya hemos hablado, hijo, que no soy la radio." }],
      },
      3: {
        asuntos: [
          [
            { a: "tenso", t: "La noche del apagón fui la única de este bloque que no tuvo miedo." },
            { a: "neutro", t: "Porque en la escalera había una luz que subía y bajaba, y yo la conozco." },
            { a: "neutro", t: "No digo de qué la conozco. Digo que la conozco." },
          ],
          [
            { a: "neutro", t: "Le he dicho a tu madre que aquí abajo tiene una vecina para lo que sea." },
            { a: "tenso", t: "Y le he dicho «para lo que sea» con la voz que se dice de verdad." },
            { a: "roto", t: "Ella se puso a llorar en el descansillo. Y yo hice como que no lo veía." },
          ],
          [
            { a: "decidido", t: "Si viene alguien con una placa preguntando por el quinto, aquí no vive nadie." },
            { a: "neutro", t: "El quinto está vacío desde el noventa y ocho. Consta en el libro." },
            { a: "tenso", t: "Y el libro lo llevo yo, hijo. Que es lo que quería que supieras." },
          ],
        ],
        pregunta: "¿Qué le digo a Doña Pilar?",
        opciones: [
          { id: "honesto", label: "Dejarle decirlo", texto: "Doña Pilar. Sabe usted perfectamente de qué conoce esa luz.", replica: "Pues claro que lo sé. Y me la voy a llevar a la tumba, que para eso es mía." },
          { id: "proteger", label: "Fingir que no entiende", texto: "No sé de qué luz me habla.", replica: "Anda, sube. Y abrígate, que el manto ése no abriga nada." },
          { id: "preguntar", label: "Preguntar por qué le protege", texto: "¿Por qué hace esto por mí?", replica: "Porque a mi marido no lo protegió nadie. Y una aprende tarde, pero aprende." },
        ],
        repite: [{ a: "neutro", t: "Hijo, que tengo el portal a medias. Luego bajas y seguimos." }],
      },
    },
    en: {
      1: {
        asuntos: [
          [
            { a: "neutro", t: "There was a noise in the stairwell last night. A crackle, like wiring." },
            { a: "tenso", t: "I'm not saying a word. But I've got eyes, love." },
            { a: "neutro", t: "And at quarter to one I'm awake, which is when things happen." },
          ],
          [
            { a: "neutro", t: "Tell your mother the block's electricity bill has gone up twenty per cent." },
            { a: "tenso", t: "Twenty. And nobody new has moved in and nobody's bought a heater." },
            { a: "neutro", t: "Something's drinking this building's power. And it isn't the stairwell." },
          ],
          [
            { a: "neutro", t: "Mopping at seven has one advantage: you see who comes back and who never went." },
            { a: "neutro", t: "I've been mopping this hall forty-one years, love." },
            { a: "tenso", t: "Forty-one. Not a light bulb gets past me." },
          ],
        ],
        pregunta: "What do I tell Doña Pilar?",
        opciones: [
          { id: "honesto", label: "Own the hour", texto: "I did get in late. And it wasn't the only time.", replica: "I know. What I like is you saying it. Go on up, it's cold." },
          { id: "proteger", label: "Blame the wiring", texto: "It's the fuse box, Doña Pilar. It's been dreadful for years.", replica: "The fuse box. Right. And the fuse box keeps your hours. What a coincidence." },
          { id: "preguntar", label: "Ask exactly what she heard", texto: "The noise last night. What time was it?", replica: "Quarter to one. And a fainter one at two. I write them down, you know. In the gas book." },
        ],
        repite: [{ a: "neutro", t: "Love, you've had your talking-to. I've got mopping to do." }],
      },
      2: {
        asuntos: [
          [
            { a: "tenso", t: "A woman came round asking about the residents. Very pleasant, very neat hair." },
            { a: "neutro", t: "I told her what you tell pleasant people: the time and the weather." },
            { a: "neutro", t: "In this hall information is paid for in trust, and she hadn't any." },
          ],
          [
            { a: "neutro", t: "The boy on the fourth's got a cloak made out of a bedsheet. It looks terrible." },
            { a: "tenso", t: "And his mother in tears, because he threw himself off the sofa saving somebody." },
            { a: "neutro", t: "That's what heroes are for, love. Making children jump off sofas." },
          ],
          [
            { a: "roto", t: "My husband worked at the old power station. Out at Las Tolvas." },
            { a: "neutro", t: "He'd come home with a headache nothing would shift." },
            { a: "tenso", t: "And the company said it was the shifts. It's always the shifts." },
          ],
        ],
        pregunta: "What do I tell Doña Pilar?",
        opciones: [
          { id: "honesto", label: "Thank her for the silence", texto: "Thank you for telling that woman nothing.", replica: "I didn't do it for you. I did what I always do. But you're welcome, love." },
          { id: "proteger", label: "Play dumb", texto: "What did she want, this woman?", replica: "What all neat-haired women want: a name. And we don't hand out names here." },
          { id: "preguntar", label: "Ask about her husband", texto: "What happened to your husband at Las Tolvas?", replica: "What happens to people who stand near those things with nobody warning them. You be careful." },
        ],
        repite: [{ a: "neutro", t: "We've talked, love. I'm not the radio." }],
      },
      3: {
        asuntos: [
          [
            { a: "tenso", t: "The night of the blackout I was the only one in this block who wasn't frightened." },
            { a: "neutro", t: "Because there was a light going up and down the stairs, and I know that light." },
            { a: "neutro", t: "I'm not saying how I know it. I'm saying I know it." },
          ],
          [
            { a: "neutro", t: "I told your mother she's got a neighbour downstairs for whatever she needs." },
            { a: "tenso", t: "And I said 'whatever she needs' in the voice you use when you mean it." },
            { a: "roto", t: "She cried on the landing. And I pretended not to see." },
          ],
          [
            { a: "decidido", t: "If anyone with a badge comes asking about the fifth floor, nobody lives there." },
            { a: "neutro", t: "The fifth's been empty since ninety-eight. It's in the book." },
            { a: "tenso", t: "And I keep the book, love. That's what I wanted you to know." },
          ],
        ],
        pregunta: "What do I tell Doña Pilar?",
        opciones: [
          { id: "honesto", label: "Let her say it", texto: "Doña Pilar. You know exactly how you know that light.", replica: "Of course I do. And I'm taking it to my grave, because it's mine." },
          { id: "proteger", label: "Pretend not to follow", texto: "I don't know what light you mean.", replica: "Go on up. And wrap up warm — that cloak of yours is no use at all." },
          { id: "preguntar", label: "Ask why she protects him", texto: "Why are you doing this for me?", replica: "Because nobody protected my husband. You learn late, but you learn." },
        ],
        repite: [{ a: "neutro", t: "Love, the hall's half done. Come back down later and we'll carry on." }],
      },
    },
  },

  /* ── Yusuf Benali · locutorio y taller en el Puerto Viejo · no pregunta ───────────
   * Su virtud entera es una: no pregunta. Y la ejerce con tanta disciplina que acaba siendo
   * la forma más limpia de cariño del juego. Habla en imperativos cortos y frases de tarifa.
   */
  yusuf: {
    es: {
      1: {
        asuntos: [
          [
            { a: "decidido", t: "Si vienes a currar, hay descarga hasta las nueve. Pago en mano." },
            { a: "neutro", t: "Y no preguntes de dónde sale el cobre." },
            { a: "neutro", t: "Yo no pregunto de dónde salen tus horarios. Vamos empatados." },
          ],
          [
            { a: "neutro", t: "Esa chaqueta se te está descosiendo por el hombro. Trae." },
            { a: "neutro", t: "Hilo del gordo, que aguanta. Dos euros o media hora barriendo, tú eliges." },
            { a: "decidido", t: "Media hora barriendo. Buen chico. El dinero se gasta, el favor se guarda." },
          ],
          [
            { a: "tenso", t: "Los del muelle han cambiado el turno de noche. Hay tres nuevos." },
            { a: "neutro", t: "No te lo digo por nada. Te lo digo porque tú andas de noche." },
            { a: "neutro", t: "Y no, no te he preguntado por qué andas de noche. Ni lo voy a hacer." },
          ],
        ],
        pregunta: "¿Qué le digo a Yusuf?",
        opciones: [
          { id: "honesto", label: "Reconocer lo que hace por él", texto: "Sabes perfectamente lo que hago de noche, ¿verdad?", replica: "Sé lo que necesito saber para pasarte la cinta aislante. Ni un dato más." },
          { id: "proteger", label: "Aceptar el trabajo y callar", texto: "Media hora barriendo. Trato hecho.", replica: "Trato hecho. La escoba está donde siempre. Y la puerta también." },
          { id: "preguntar", label: "Preguntar por los tres nuevos", texto: "Los tres del turno de noche. ¿De quién son?", replica: "De nadie que te convenga. Llevan botas caras para descargar cajas baratas." },
        ],
        repite: [{ a: "neutro", t: "Ya hemos hablado. Aquí se habla una vez y se trabaja tres." }],
      },
      2: {
        asuntos: [
          [
            { a: "tenso", t: "Ha aparecido un trozo de tela en la grúa cuatro. Negro, con hilo raro." },
            { a: "neutro", t: "Lo he cogido yo antes que el de seguridad. Está en el cajón de las bridas." },
            { a: "neutro", t: "Cógelo cuando quieras. Y quema lo que sobre, que la tela habla." },
          ],
          [
            { a: "decidido", t: "Aquí atrás hay una mesa, una lámpara y ninguna cámara." },
            { a: "neutro", t: "Si un día llegas roto, entras por el patio y no llamas." },
            { a: "neutro", t: "Yo estaré durmiendo. Casualmente muy profundo." },
          ],
          [
            { a: "neutro", t: "Mi hermano vino a Marés con dieciséis y una bolsa. Como tú, pero sin rayo." },
            { a: "tenso", t: "Le ayudó gente que no le preguntó nada. Por eso yo no pregunto nada." },
            { a: "neutro", t: "No es bondad. Es contabilidad. Estoy devolviendo algo." },
          ],
        ],
        pregunta: "¿Qué le digo a Yusuf?",
        opciones: [
          { id: "honesto", label: "Avisarle del riesgo", texto: "Yusuf, si me ayudas y esto sale mal, te salpica a ti.", replica: "Lo he calculado. Sale a mi favor. Y ahora coge la tela y vete." },
          { id: "proteger", label: "Rechazar el taller", texto: "No hace falta. No quiero que te metas en esto.", replica: "Ya me he metido. El día que te di la cinta aislante ya me había metido." },
          { id: "preguntar", label: "Preguntar cómo acabó", texto: "¿Qué fue de tu hermano?", replica: "Tiene un taller en Alicante y tres crías. Eso es lo que pasa cuando alguien no pregunta." },
        ],
        repite: [{ a: "neutro", t: "Hoy ya te he dado conversación y herramientas. Es mucho para un martes." }],
      },
      3: {
        asuntos: [
          [
            { a: "tenso", t: "Ha venido la inspectora. Con una foto del trozo de tela." },
            { a: "neutro", t: "Le he dicho que en el puerto hay tela negra por todas partes. Que es verdad." },
            { a: "decidido", t: "No me ha creído. Pero no me ha creído sin poder demostrarlo, que es lo que cuenta." },
          ],
          [
            { a: "neutro", t: "Te he hecho un forro nuevo. Con la fibra de los trajes de soldar." },
            { a: "decidido", t: "No es bonito. Es que lo bonito se ve desde lejos y tú no quieres que te vean." },
            { a: "neutro", t: "Pruébatelo ahí atrás. Y no me des las gracias, que me pone nervioso." },
          ],
          [
            { a: "roto", t: "Cuando esto acabe, ¿tú vas a poder ser un chaval otra vez?" },
            { a: "neutro", t: "Es la primera pregunta que te hago en todo el año. Y es la única que me importa." },
            { a: "tenso", t: "Contéstala o no la contestes. Pero piénsala." },
          ],
        ],
        pregunta: "¿Qué le digo a Yusuf?",
        opciones: [
          { id: "honesto", label: "Contestar la única pregunta", texto: "No lo sé, Yusuf. Y llevo desde el verano intentando no pensarlo.", replica: "Buena respuesta. Las malas son las rápidas. Ponte el forro, anda." },
          { id: "proteger", label: "Prometerle que sí", texto: "Claro que sí. Cuando acabe vuelvo a clase y ya está.", replica: "Ya. Pues cuando eso pase, ven a decírmelo. Te invito a té y me río de mí." },
          { id: "preguntar", label: "Preguntar por la foto", texto: "La foto que te enseñó. ¿Se veía el hilo?", replica: "Se veía. Y el hilo es mío. Así que ahora somos dos en la foto, chaval." },
        ],
        repite: [{ a: "neutro", t: "Vete a hacer lo tuyo. Aquí ya está todo dicho y casi todo cosido." }],
      },
    },
    en: {
      1: {
        asuntos: [
          [
            { a: "decidido", t: "Here to work? Unloading till nine. Cash in hand." },
            { a: "neutro", t: "And don't ask where the copper came from." },
            { a: "neutro", t: "I don't ask where your hours come from. That makes us even." },
          ],
          [
            { a: "neutro", t: "That jacket's coming apart at the shoulder. Give it here." },
            { a: "neutro", t: "Heavy thread, it'll hold. Two euros or half an hour sweeping. Your call." },
            { a: "decidido", t: "Half an hour sweeping. Good lad. Money gets spent; a favour gets kept." },
          ],
          [
            { a: "tenso", t: "They've changed the night shift on the quay. Three new faces." },
            { a: "neutro", t: "I'm not saying it for any reason. I'm saying it because you're out at night." },
            { a: "neutro", t: "And no, I haven't asked why you're out at night. And I won't." },
          ],
        ],
        pregunta: "What do I tell Yusuf?",
        opciones: [
          { id: "honesto", label: "Name what he's doing", texto: "You know exactly what I do at night, don't you?", replica: "I know what I need to know to hand you the tape. Not one fact more." },
          { id: "proteger", label: "Take the work and shut up", texto: "Half an hour sweeping. Deal.", replica: "Deal. Broom's where it always is. So's the door." },
          { id: "preguntar", label: "Ask about the three new ones", texto: "The three on nights. Whose are they?", replica: "Nobody's you want. Expensive boots for unloading cheap crates." },
        ],
        repite: [{ a: "neutro", t: "We've talked. Here you talk once and work three times." }],
      },
      2: {
        asuntos: [
          [
            { a: "tenso", t: "A scrap of cloth turned up on crane four. Black, odd thread." },
            { a: "neutro", t: "I got to it before security did. It's in the cable-tie drawer." },
            { a: "neutro", t: "Take it whenever. And burn what's left over — cloth talks." },
          ],
          [
            { a: "decidido", t: "There's a bench back there, a lamp, and no cameras." },
            { a: "neutro", t: "If you turn up broken one night, come through the yard and don't knock." },
            { a: "neutro", t: "I'll be asleep. Very deeply asleep, as it happens." },
          ],
          [
            { a: "neutro", t: "My brother came to Marés at sixteen with a bag. Like you, minus the lightning." },
            { a: "tenso", t: "People helped him without asking anything. So I don't ask anything." },
            { a: "neutro", t: "It isn't kindness. It's bookkeeping. I'm paying something back." },
          ],
        ],
        pregunta: "What do I tell Yusuf?",
        opciones: [
          { id: "honesto", label: "Tell him the risk is his too", texto: "Yusuf, if you help me and this goes wrong, it lands on you.", replica: "I've done the sums. It comes out in my favour. Now take the cloth and go." },
          { id: "proteger", label: "Refuse the workshop", texto: "You don't need to. I don't want you in this.", replica: "I'm already in it. I was in it the day I handed you the tape." },
          { id: "preguntar", label: "Ask how his brother ended up", texto: "What became of your brother?", replica: "Workshop in Alicante and three girls. That's what happens when somebody doesn't ask." },
        ],
        repite: [{ a: "neutro", t: "You've had conversation and tools today. That's a lot for a Tuesday." }],
      },
      3: {
        asuntos: [
          [
            { a: "tenso", t: "The inspector came. With a photograph of that scrap of cloth." },
            { a: "neutro", t: "I told her the port's full of black cloth. Which is true." },
            { a: "decidido", t: "She didn't believe me. But she didn't believe me without proof, which is what counts." },
          ],
          [
            { a: "neutro", t: "I've made you a new lining. Out of welding-suit fibre." },
            { a: "decidido", t: "It isn't handsome. Handsome shows up at a distance, and you don't want showing up." },
            { a: "neutro", t: "Try it on out the back. And don't thank me, it makes me twitchy." },
          ],
          [
            { a: "roto", t: "When this is over, will you be able to be a kid again?" },
            { a: "neutro", t: "It's the first question I've asked you all year. And the only one I care about." },
            { a: "tenso", t: "Answer it or don't. But think about it." },
          ],
        ],
        pregunta: "What do I tell Yusuf?",
        opciones: [
          { id: "honesto", label: "Answer the only question", texto: "I don't know, Yusuf. And I've spent since the summer trying not to think about it.", replica: "Good answer. The bad ones are the quick ones. Put the lining on." },
          { id: "proteger", label: "Promise him yes", texto: "Of course I will. When it's over I go back to class and that's that.", replica: "Right. Well, when that happens, come and tell me. Tea's on me and I'll laugh at myself." },
          { id: "preguntar", label: "Ask what she showed him", texto: "The photo she showed you. Could you see the thread?", replica: "You could. And the thread's mine. So there are two of us in that photo now, lad." },
        ],
        repite: [{ a: "neutro", t: "Go and do your thing. It's all said here and nearly all stitched." }],
      },
    },
  },

  /* ── Chapa · Los Cabos · el taller ───────────────────────────────────────────────
   * Manos antes que boca. Mide todo en tiempo de trabajo y en material, y por eso es el
   * único personaje que habla del traje como lo que es: una prenda que alguien tiene que coser.
   */
  chapa: {
    es: {
      1: {
        asuntos: [
          [
            { a: "neutro", t: "Trae. La costura del guante está pidiendo fibra, no cinta aislante." },
            { a: "decidido", t: "Media hora y te lo dejo como nuevo. Tú mientras, barre." },
            { a: "neutro", t: "Y no barras de cualquier manera, que luego se me clava la viruta." },
          ],
          [
            { a: "neutro", t: "Esto que te has hecho tú es un chubasquero con complejo de armadura." },
            { a: "tenso", t: "Y aguanta un golpe. Uno. El segundo te lo comes en la piel." },
            { a: "neutro", t: "No te lo digo para picarte. Te lo digo para que no vuelvas peor." },
          ],
          [
            { a: "decidido", t: "Regla del taller: lo que se rompe, se apunta. Lo que se apunta, se arregla." },
            { a: "neutro", t: "Lo que no se apunta se rompe otra vez en el peor momento posible." },
            { a: "neutro", t: "Llevo doce años aquí y esa regla no ha fallado ni una vez." },
          ],
        ],
        pregunta: "¿Qué le digo a Chapa?",
        opciones: [
          { id: "honesto", label: "Pedirle que lo haga bien", texto: "Hazlo bien. Aunque tarde. Lo voy a necesitar bien.", replica: "Ahora hablamos el mismo idioma. Siéntate, esto son dos horas." },
          { id: "proteger", label: "Meterle prisa", texto: "Con que aguante esta noche me vale.", replica: "Esta noche. Siempre esta noche. Vale, chaval, pero luego no me llores." },
          { id: "preguntar", label: "Preguntar por el material", texto: "¿De dónde sacas tú esta fibra?", replica: "De los trajes de soldar del astillero. Que ya no suelda nadie y algo hay que hacer con ellos." },
        ],
        repite: [{ a: "neutro", t: "Estoy con lo tuyo. Si me hablas, tardo más." }],
      },
      2: {
        asuntos: [
          [
            { a: "tenso", t: "Media capa colgando de una grúa. ¿Tú sabes lo que es eso para mí?" },
            { a: "neutro", t: "Es mi puntada en manos de quien la quiera mirar con lupa." },
            { a: "decidido", t: "A partir de hoy coso con hilo del que se funde solo si tira alguien. Ya está inventado." },
          ],
          [
            { a: "neutro", t: "Te he metido refuerzo en el hombro derecho. Caes siempre por ahí." },
            { a: "neutro", t: "Sí, lo sé por el desgaste. La tela dice más de ti que tu cara." },
            { a: "tenso", t: "Y dice que llevas tres meses sin dormir bien. Eso también está en la tela." },
          ],
          [
            { a: "decidido", t: "Se puede ir más ligero, pero entonces todo lo que te llegue te llega entero." },
            { a: "neutro", t: "Se puede ir más blindado, pero entonces te oyen desde la esquina." },
            { a: "neutro", t: "No hay traje bueno. Hay traje elegido. Elige tú, que yo sólo coso." },
          ],
        ],
        pregunta: "¿Qué le digo a Chapa?",
        opciones: [
          { id: "honesto", label: "Elegir silencio", texto: "Ligero. Prefiero que no me oigan a que no me duela.", replica: "Ésa es la respuesta de alguien que ha aprendido a base de hostias. Toma, tuyo." },
          { id: "proteger", label: "Elegir blindaje", texto: "Blindado. Prefiero llegar entero a llegar callado.", replica: "También vale. Pero luego no me digas que te vieron, porque te van a ver." },
          { id: "preguntar", label: "Preguntar por el hilo nuevo", texto: "El hilo que se funde. ¿Cuántas veces aguanta?", replica: "Una. Es un truco de una vez. Como casi todos los buenos." },
        ],
        repite: [{ a: "neutro", t: "Que estoy cosiendo, hombre. Vuelve cuando tenga las manos libres." }],
      },
      3: {
        asuntos: [
          [
            { a: "decidido", t: "Esto ya no es un remiendo. Esto es un traje, y lo hemos hecho entre varios." },
            { a: "neutro", t: "La fibra la puso Yusuf. El forro, el de la tienda de buceo. El corte, yo." },
            { a: "neutro", t: "Tú sólo lo llevas puesto. Que no es poco, ojo." },
          ],
          [
            { a: "tenso", t: "Los Cabos se están partiendo. La mitad quiere venderte y la otra mitad no." },
            { a: "neutro", t: "Yo estoy en la mitad que no. Por si te lo estabas preguntando." },
            { a: "decidido", t: "Y estoy en esa mitad porque tú me pediste que lo hiciera bien aunque tardara." },
          ],
          [
            { a: "neutro", t: "Cuando acabes con todo esto, el traje déjamelo." },
            { a: "roto", t: "No para venderlo. Para colgarlo ahí, encima del banco." },
            { a: "neutro", t: "Que un taller sin nada colgado es un almacén, y yo no trabajo en un almacén." },
          ],
        ],
        pregunta: "¿Qué le digo a Chapa?",
        opciones: [
          { id: "honesto", label: "Prometerle el traje", texto: "Cuando acabe es tuyo. Con los agujeros y todo.", replica: "Con los agujeros sobre todo. Los agujeros son la parte que cuenta la historia." },
          { id: "proteger", label: "No prometer nada", texto: "Ya veremos si queda traje que colgar.", replica: "Ya. Pues entonces lo coso más fuerte, no vaya a ser." },
          { id: "preguntar", label: "Preguntar por la otra mitad", texto: "La mitad que quiere venderme. ¿Quién manda ahí?", replica: "Uno nuevo. No da la cara y paga en efectivo. Y huele a Financiero, chaval." },
        ],
        repite: [{ a: "neutro", t: "Ya está todo dicho y todo cosido. Vete a que te den." }],
      },
    },
    en: {
      1: {
        asuntos: [
          [
            { a: "neutro", t: "Give it here. That glove seam wants fibre, not insulating tape." },
            { a: "decidido", t: "Half an hour and it's good as new. You sweep up meanwhile." },
            { a: "neutro", t: "And sweep properly, or I'll be picking swarf out of my knees." },
          ],
          [
            { a: "neutro", t: "What you've built yourself is a raincoat with delusions of armour." },
            { a: "tenso", t: "It'll take one hit. One. The second one lands on skin." },
            { a: "neutro", t: "Not saying it to wind you up. Saying it so you don't come back worse." },
          ],
          [
            { a: "decidido", t: "Workshop rule: what breaks gets written down. What's written down gets fixed." },
            { a: "neutro", t: "What doesn't get written down breaks again at the worst possible moment." },
            { a: "neutro", t: "Twelve years I've been here and that rule has never once failed." },
          ],
        ],
        pregunta: "What do I tell Chapa?",
        opciones: [
          { id: "honesto", label: "Ask him to do it right", texto: "Do it properly. Even if it takes longer. I'm going to need it right.", replica: "Now we're speaking the same language. Sit down, this is two hours." },
          { id: "proteger", label: "Rush him", texto: "As long as it holds tonight, that'll do.", replica: "Tonight. Always tonight. Fine, lad. Just don't come crying afterwards." },
          { id: "preguntar", label: "Ask about the material", texto: "Where do you get this fibre?", replica: "Welding suits from the yard. Nobody welds there any more and they had to go somewhere." },
        ],
        repite: [{ a: "neutro", t: "I'm working on yours. Talk to me and it takes longer." }],
      },
      2: {
        asuntos: [
          [
            { a: "tenso", t: "Half a cloak hanging off a crane. Do you know what that is, to me?" },
            { a: "neutro", t: "It's my stitching in the hands of anyone who fancies a magnifying glass." },
            { a: "decidido", t: "From today I sew with thread that melts if somebody pulls. It's been invented for years." },
          ],
          [
            { a: "neutro", t: "I've put reinforcement in the right shoulder. You always fall that side." },
            { a: "neutro", t: "Yes, I can tell from the wear. Cloth says more about you than your face does." },
            { a: "tenso", t: "And it says you haven't slept properly in three months. That's in there too." },
          ],
          [
            { a: "decidido", t: "You can go lighter, but then whatever reaches you reaches you whole." },
            { a: "neutro", t: "You can go heavier, but then they hear you from the corner." },
            { a: "neutro", t: "There's no good suit. There's a chosen suit. You choose — I only sew." },
          ],
        ],
        pregunta: "What do I tell Chapa?",
        opciones: [
          { id: "honesto", label: "Choose silence", texto: "Lighter. I'd rather not be heard than not be hurt.", replica: "That's the answer of a lad who's learned the hard way. Here. Yours." },
          { id: "proteger", label: "Choose armour", texto: "Heavier. I'd rather arrive whole than arrive quiet.", replica: "Also fine. Just don't tell me later that they saw you, because they will." },
          { id: "preguntar", label: "Ask about the new thread", texto: "The melting thread. How many times does it hold?", replica: "Once. It's a one-time trick. Like most of the good ones." },
        ],
        repite: [{ a: "neutro", t: "I'm sewing, mate. Come back when my hands are free." }],
      },
      3: {
        asuntos: [
          [
            { a: "decidido", t: "This isn't a patch job any more. This is a suit, and several of us made it." },
            { a: "neutro", t: "Yusuf supplied the fibre. Lining came from the dive shop. The cut's mine." },
            { a: "neutro", t: "You only wear it. Which isn't nothing, mind." },
          ],
          [
            { a: "tenso", t: "Los Cabos are splitting. Half want to sell you and half don't." },
            { a: "neutro", t: "I'm in the half that don't. In case you were wondering." },
            { a: "decidido", t: "And I'm in that half because you asked me to do it right even if it took longer." },
          ],
          [
            { a: "neutro", t: "When you're done with all this, leave me the suit." },
            { a: "roto", t: "Not to sell. To hang up there, over the bench." },
            { a: "neutro", t: "A workshop with nothing hanging in it is a warehouse, and I don't work in a warehouse." },
          ],
        ],
        pregunta: "What do I tell Chapa?",
        opciones: [
          { id: "honesto", label: "Promise him the suit", texto: "When it's over it's yours. Holes and all.", replica: "Holes especially. The holes are the part that tells the story." },
          { id: "proteger", label: "Promise nothing", texto: "We'll see if there's a suit left to hang.", replica: "Right. Then I'll sew it stronger, just in case." },
          { id: "preguntar", label: "Ask about the other half", texto: "The half that wants to sell me. Who's running that?", replica: "Someone new. Won't show his face and pays cash. And he smells of the Financiero, lad." },
        ],
        repite: [{ a: "neutro", t: "It's all said and all sewn. Go and get yourself hit." }],
      },
    },
  },

  /* ── Tuerca · Los Cabos · el campo, las vueltas y la bronca ──────────────────────
   * El entrenador que nunca fue entrenador. Grita porque es la forma de cariño que conoce, y
   * su vocabulario entero es de banquillo: vueltas, guardia, aire, no te caigas.
   */
  tuerca: {
    es: {
      1: {
        asuntos: [
          [
            { a: "decidido", t: "¡Vela! Cinco vueltas al campo y te dejo el balón nuevo." },
            { a: "neutro", t: "Y no me hagas la del otro día, que te fuiste sin decir nada." },
            { a: "tenso", t: "Que aquí se avisa. Aunque te vayas, se avisa." },
          ],
          [
            { a: "neutro", t: "Tú corres bien pero respiras fatal. Eso se arregla y no lo arregla nadie." },
            { a: "decidido", t: "Cuatro tiempos por zancada. Cuatro. Cuéntalos hasta que te aburras." },
            { a: "neutro", t: "El día que no tengas que contarlos, ese día ya no te canso yo." },
          ],
          [
            { a: "tenso", t: "Vienes con la guardia baja. Y no hablo de boxeo, hablo de andar por la calle." },
            { a: "neutro", t: "Tú entras a los sitios mirando el suelo. Eso se ve desde el otro lado del campo." },
            { a: "decidido", t: "Barbilla arriba, hombros sueltos. Es gratis y te ahorra dos peleas al mes." },
          ],
        ],
        pregunta: "¿Qué le digo a Tuerca?",
        opciones: [
          { id: "honesto", label: "Pedirle que le exija más", texto: "Ponme más. En serio. Necesito aguantar más de lo que aguanto.", replica: "¡Ahí está! Diez vueltas. Y luego más. Me has alegrado la tarde, chaval." },
          { id: "proteger", label: "Escaquearse", texto: "Hoy vengo reventado. Otro día.", replica: "Otro día. Anda, tira. Pero el balón nuevo se queda conmigo." },
          { id: "preguntar", label: "Preguntar por lo de la guardia", texto: "¿Tan mal entro a los sitios?", replica: "Fatal. Entras pidiendo perdón. Y a quien pide perdón se lo dan a probar." },
        ],
        repite: [{ a: "decidido", t: "¡Que ya has hecho lo tuyo! Ve a estirar y no me des la lata." }],
      },
      2: {
        asuntos: [
          [
            { a: "tenso", t: "Vienes con una cojera que no tenías el jueves. Y no me la vas a contar." },
            { a: "neutro", t: "Vale. Pues entrenamos la pierna buena y disimulamos la mala." },
            { a: "decidido", t: "Que disimular también se entrena. Y a ti te va a hacer falta." },
          ],
          [
            { a: "neutro", t: "Yo boxeé de chaval. Mal, pero boxeé." },
            { a: "tenso", t: "Y lo dejé porque me daba más miedo la vuelta a casa que el tío de enfrente." },
            { a: "neutro", t: "Te lo cuento porque tú vienes con esa misma cara desde hace un mes." },
          ],
          [
            { a: "decidido", t: "Hoy toca caerse. En serio: toca aprender a caerse." },
            { a: "neutro", t: "El que sabe caerse se levanta. El que no sabe se queda ahí pensando." },
            { a: "tenso", t: "Y pensando en el suelo es como se queda la gente en el suelo." },
          ],
        ],
        pregunta: "¿Qué le digo a Tuerca?",
        opciones: [
          { id: "honesto", label: "Reconocer la cojera", texto: "Es la rodilla. Y sí, me la hice haciendo algo que no te puedo contar.", replica: "Perfecto. Media verdad y a trabajar. Al suelo, que hoy toca levantarse." },
          { id: "proteger", label: "Quitarle importancia", texto: "No es nada. Me di con la moto de mi primo.", replica: "Tu primo no tiene moto. Pero venga, al suelo igual." },
          { id: "preguntar", label: "Preguntar por su vuelta a casa", texto: "¿Qué había en tu vuelta a casa?", replica: "Un señor que también boxeaba. Ya está, no preguntes más y dame veinte." },
        ],
        repite: [{ a: "neutro", t: "Se entrena una vez al día. Dos es fardar y tres es lesionarse." }],
      },
      3: {
        asuntos: [
          [
            { a: "decidido", t: "Ya no te puedo enseñar nada. Y eso es lo mejor que le puedo decir a alguien." },
            { a: "neutro", t: "Lo último que te queda por aprender no se aprende en un campo." },
            { a: "tenso", t: "Se aprende decidiendo a quién dejas de proteger. Y eso yo no te lo entreno." },
          ],
          [
            { a: "neutro", t: "El del apagón mantuvo el hospital. Eso lo sabe hasta el panadero." },
            { a: "decidido", t: "Y respiraba a cuatro tiempos por zancada. Eso lo sé yo." },
            { a: "neutro", t: "No voy a decir más. Sólo que se me ha puesto un nudo raro contándolo." },
          ],
          [
            { a: "tenso", t: "Si un día vienes y no puedes ni con las vueltas, ven igual." },
            { a: "neutro", t: "El campo está abierto y yo estoy siempre aquí. Es lo único que tengo, chaval." },
            { a: "decidido", t: "Y compartirlo es lo único que sé hacer." },
          ],
        ],
        pregunta: "¿Qué le digo a Tuerca?",
        opciones: [
          { id: "honesto", label: "Dejarle saberlo", texto: "Cuatro tiempos por zancada. Me lo enseñaste tú.", replica: "…Ya. Ya lo sabía. Anda, ven aquí. Y luego diez vueltas, que no se me olvida." },
          { id: "proteger", label: "No confirmarlo", texto: "Mucha gente respira a cuatro tiempos.", replica: "Muchísima. Todos menos los que no se lo enseñé yo. Pero vale." },
          { id: "preguntar", label: "Preguntar qué haría él", texto: "¿A quién dejarías de proteger tú?", replica: "A nadie. Por eso doy vueltas en un campo y no salvo ciudades. Tú vales para más." },
        ],
        repite: [{ a: "decidido", t: "¡Fuera del campo! Que si te quedas te pongo a correr otra vez." }],
      },
    },
    en: {
      1: {
        asuntos: [
          [
            { a: "decidido", t: "Vela! Five laps of the pitch and the new ball's yours." },
            { a: "neutro", t: "And don't pull the other day's trick — you left without a word." },
            { a: "tenso", t: "Here you tell people. Even when you're leaving, you tell people." },
          ],
          [
            { a: "neutro", t: "You run well and you breathe terribly. That's fixable and nobody fixes it." },
            { a: "decidido", t: "Four beats a stride. Four. Count them until you're bored." },
            { a: "neutro", t: "The day you don't have to count, that's the day I stop tiring you out." },
          ],
          [
            { a: "tenso", t: "You come in with your guard down. Not boxing — I mean walking down a street." },
            { a: "neutro", t: "You go into places looking at the floor. You can see it from across the pitch." },
            { a: "decidido", t: "Chin up, shoulders loose. It's free and it saves you two fights a month." },
          ],
        ],
        pregunta: "What do I tell Tuerca?",
        opciones: [
          { id: "honesto", label: "Ask him for more", texto: "Push me harder. Seriously. I need to last longer than I last.", replica: "There he is! Ten laps. And then more. You've made my afternoon, lad." },
          { id: "proteger", label: "Duck out", texto: "I'm wrecked today. Another time.", replica: "Another time. Off you go. New ball stays with me, though." },
          { id: "preguntar", label: "Ask about the guard thing", texto: "Is it that obvious, how I walk in?", replica: "Dreadful. You come in apologising. And people give apologisers something to be sorry for." },
        ],
        repite: [{ a: "decidido", t: "You've done your bit! Go and stretch and stop pestering me." }],
      },
      2: {
        asuntos: [
          [
            { a: "tenso", t: "You've got a limp you didn't have Thursday. And you're not going to tell me." },
            { a: "neutro", t: "Fine. Then we train the good leg and disguise the bad one." },
            { a: "decidido", t: "Disguising is trainable too. And you're going to need it." },
          ],
          [
            { a: "neutro", t: "I boxed as a lad. Badly, but I boxed." },
            { a: "tenso", t: "And I packed it in because the walk home scared me more than the bloke opposite." },
            { a: "neutro", t: "I'm telling you because you've had that same face for a month." },
          ],
          [
            { a: "decidido", t: "Today we practise falling. Seriously: today you learn to fall." },
            { a: "neutro", t: "A man who knows how to fall gets up. One who doesn't lies there thinking." },
            { a: "tenso", t: "And thinking on the floor is how people stay on the floor." },
          ],
        ],
        pregunta: "What do I tell Tuerca?",
        opciones: [
          { id: "honesto", label: "Own the limp", texto: "It's the knee. And yes, I did it doing something I can't tell you about.", replica: "Perfect. Half a truth and back to work. On the floor — today we practise getting up." },
          { id: "proteger", label: "Wave it off", texto: "It's nothing. Came off my cousin's bike.", replica: "Your cousin hasn't got a bike. Go on, floor anyway." },
          { id: "preguntar", label: "Ask about the walk home", texto: "What was waiting on your walk home?", replica: "A man who also boxed. That's it, no more questions, give me twenty." },
        ],
        repite: [{ a: "neutro", t: "You train once a day. Twice is showing off and three times is an injury." }],
      },
      3: {
        asuntos: [
          [
            { a: "decidido", t: "I've got nothing left to teach you. And that's the best thing I can say about anyone." },
            { a: "neutro", t: "The last thing you've got to learn isn't learned on a pitch." },
            { a: "tenso", t: "It's learned deciding who you stop protecting. I can't coach that." },
          ],
          [
            { a: "neutro", t: "The one in the blackout kept the hospital lit. Even the baker knows that." },
            { a: "decidido", t: "And he was breathing four beats a stride. That bit I know." },
            { a: "neutro", t: "I'll say no more. Only that I've gone odd in the throat telling it." },
          ],
          [
            { a: "tenso", t: "If one day you turn up and can't even manage the laps, turn up anyway." },
            { a: "neutro", t: "The pitch is open and I'm always here. It's all I've got, lad." },
            { a: "decidido", t: "And sharing it is the only thing I know how to do." },
          ],
        ],
        pregunta: "What do I tell Tuerca?",
        opciones: [
          { id: "honesto", label: "Let him know", texto: "Four beats a stride. You taught me that.", replica: "…Yeah. I knew. Come here. And then ten laps, I haven't forgotten." },
          { id: "proteger", label: "Don't confirm it", texto: "Plenty of people breathe on four.", replica: "Loads. All of them except the ones I didn't teach. But fine." },
          { id: "preguntar", label: "Ask what he'd do", texto: "Who would you stop protecting?", replica: "Nobody. That's why I run laps on a pitch and don't save cities. You're worth more." },
        ],
        repite: [{ a: "decidido", t: "Off my pitch! Stay there and I'll have you running again." }],
      },
    },
  },

  /* ── El Sordo · Los Cabos · el que te levanta del suelo ──────────────────────────
   * Frases de cuatro palabras. Es el que enseña la lección menos heroica del juego: que se
   * puede ganar sin que se entere nadie, y que eso es lo difícil.
   */
  sordo: {
    es: {
      1: {
        asuntos: [
          [
            { a: "tenso", t: "Otra vez tú. ¿Vienes a que te levante del suelo?" },
            { a: "decidido", t: "Venga. Guardia arriba. Y esta vez aguanta." },
            { a: "neutro", t: "Tres segundos. Has aguantado tres. Ayer fueron dos." },
          ],
          [
            { a: "neutro", t: "Haces mucho ruido al pegar. Demasiado." },
            { a: "tenso", t: "El que hace ruido avisa. Y avisar es regalar." },
            { a: "neutro", t: "Pega callado. Se gana igual y se cobra menos." },
          ],
          [
            { a: "tenso", t: "No me mires la cara. Mírame los pies." },
            { a: "neutro", t: "La cara miente. Los pies no saben mentir." },
            { a: "decidido", t: "Otra vez. Y ahora dime hacia dónde iba antes de ir." },
          ],
        ],
        pregunta: "¿Qué le digo al Sordo?",
        opciones: [
          { id: "honesto", label: "Pedir otra ronda", texto: "Otra. Y esta vez llego a cinco.", replica: "Cinco no. Cuatro. Pero has dicho cinco, y eso ya es medio combate." },
          { id: "proteger", label: "Dejarlo aquí", texto: "Por hoy vale. Estoy molido.", replica: "Molido. Vale. Mañana el que te pegue no va a preguntar si estás molido." },
          { id: "preguntar", label: "Preguntar por lo del ruido", texto: "¿Tanto ruido hago?", replica: "Se te oye desde la puerta. Y a la puerta va todo el mundo cuando se oye algo." },
        ],
        repite: [{ a: "tenso", t: "Ya te he dado lo tuyo. Vete a que se te baje." }],
      },
      2: {
        asuntos: [
          [
            { a: "neutro", t: "Has cambiado. Pegas con menos brazo y más cadera." },
            { a: "tenso", t: "Eso no se aprende aquí. Eso se aprende cobrando fuera." },
            { a: "neutro", t: "No te pregunto dónde. Sólo que estás cobrando bien." },
          ],
          [
            { a: "decidido", t: "Hoy no pegas. Hoy te enseño a acabar sin que se note." },
            { a: "neutro", t: "Se llama salir limpio. Y vale más que cualquier hostia." },
            { a: "tenso", t: "El que sale limpio vuelve mañana. El que sale con ruido sale una vez." },
          ],
          [
            { a: "neutro", t: "Yo llevo veinte años ganando peleas que nadie ha visto." },
            { a: "decidido", t: "Por eso sigo aquí y los que salían en el periódico no." },
            { a: "neutro", t: "Piénsalo. Que tú últimamente sales mucho en el periódico." },
          ],
        ],
        pregunta: "¿Qué le digo al Sordo?",
        opciones: [
          { id: "honesto", label: "Admitir que le ven", texto: "Salgo demasiado. Ya lo sé. Enséñame a no salir.", replica: "Bien. Ésa es la primera cosa lista que dices. Guardia baja, esta vez." },
          { id: "proteger", label: "Defender el ruido", texto: "A veces hace falta que te vean.", replica: "A veces. Casi nunca. Y quien decide cuándo no eres tú, es el que mira." },
          { id: "preguntar", label: "Preguntar por sus peleas", texto: "¿Y cómo se gana una pelea que nadie ve?", replica: "Acabándola antes de que empiece. Casi siempre hablando. Eso no te lo esperabas." },
        ],
        repite: [{ a: "neutro", t: "Suficiente. Más de una vez al día es vicio." }],
      },
      3: {
        asuntos: [
          [
            { a: "tenso", t: "Ha venido gente preguntando por quién entrena aquí." },
            { a: "neutro", t: "Les he dicho que aquí entrena todo el barrio. Que es verdad." },
            { a: "decidido", t: "Y les he dado la lista. La de hace tres años. También es verdad." },
          ],
          [
            { a: "neutro", t: "Ya no te levanto del suelo. Llevas un mes sin caerte." },
            { a: "tenso", t: "Eso, o has aprendido a caerte donde no te veo." },
            { a: "neutro", t: "Las dos cosas me valen. Pero la segunda me preocupa." },
          ],
          [
            { a: "decidido", t: "Cuando llegue tu último combate, no lo ganes por fuerte." },
            { a: "neutro", t: "Gánalo por listo. Los fuertes están todos en el cementerio del puerto." },
            { a: "tenso", t: "Y yo no pienso ir a verte ahí. Aviso desde ya." },
          ],
        ],
        pregunta: "¿Qué le digo al Sordo?",
        opciones: [
          { id: "honesto", label: "Darle las gracias por la lista", texto: "La lista de hace tres años. Gracias.", replica: "No hay de qué. Papel viejo y verdad vieja. Sale gratis y salva gente." },
          { id: "proteger", label: "No darse por aludido", texto: "No sé por qué me cuentas eso.", replica: "Yo tampoco. Guardia arriba y calla." },
          { id: "preguntar", label: "Preguntar por el último combate", texto: "¿Y si el listo pierde?", replica: "El listo no pierde. El listo elige qué pierde. No es lo mismo, chaval." },
        ],
        repite: [{ a: "tenso", t: "Fuera. Que tengo gente esperando y tú ya has cobrado." }],
      },
    },
    en: {
      1: {
        asuntos: [
          [
            { a: "tenso", t: "You again. Here to get picked up off the floor?" },
            { a: "decidido", t: "Come on then. Guard up. And stay on your feet this time." },
            { a: "neutro", t: "Three seconds. You lasted three. Yesterday it was two." },
          ],
          [
            { a: "neutro", t: "You make a lot of noise when you hit. Too much." },
            { a: "tenso", t: "Noise is a warning. And a warning is a gift." },
            { a: "neutro", t: "Hit quietly. You win the same and you pay less." },
          ],
          [
            { a: "tenso", t: "Don't watch my face. Watch my feet." },
            { a: "neutro", t: "Faces lie. Feet don't know how." },
            { a: "decidido", t: "Again. And this time tell me where I was going before I went." },
          ],
        ],
        pregunta: "What do I tell El Sordo?",
        opciones: [
          { id: "honesto", label: "Ask for another round", texto: "Again. And this time I make five.", replica: "Not five. Four. But you said five, and that's half a fight already." },
          { id: "proteger", label: "Call it a day", texto: "That'll do for today. I'm finished.", replica: "Finished. Right. Tomorrow whoever hits you won't ask if you're finished." },
          { id: "preguntar", label: "Ask about the noise", texto: "Am I really that loud?", replica: "They hear you from the door. And everyone goes to the door when they hear something." },
        ],
        repite: [{ a: "tenso", t: "You've had yours. Go and let it wear off." }],
      },
      2: {
        asuntos: [
          [
            { a: "neutro", t: "You've changed. Less arm, more hip." },
            { a: "tenso", t: "You don't learn that here. You learn that getting hit somewhere else." },
            { a: "neutro", t: "I'm not asking where. Only that you're getting hit properly." },
          ],
          [
            { a: "decidido", t: "No hitting today. Today I teach you to finish without it showing." },
            { a: "neutro", t: "It's called walking out clean. Worth more than any punch." },
            { a: "tenso", t: "The one who walks out clean comes back tomorrow. The loud one goes out once." },
          ],
          [
            { a: "neutro", t: "Twenty years I've been winning fights nobody saw." },
            { a: "decidido", t: "That's why I'm still here and the ones in the paper aren't." },
            { a: "neutro", t: "Think about it. You've been in the paper a lot lately." },
          ],
        ],
        pregunta: "What do I tell El Sordo?",
        opciones: [
          { id: "honesto", label: "Admit they see him", texto: "I show up too much. I know. Teach me not to.", replica: "Good. First clever thing you've said. Guard down, this time." },
          { id: "proteger", label: "Defend the noise", texto: "Sometimes you need to be seen.", replica: "Sometimes. Almost never. And who decides when isn't you — it's whoever's watching." },
          { id: "preguntar", label: "Ask about his fights", texto: "How do you win a fight nobody sees?", replica: "You end it before it starts. Usually by talking. Didn't expect that one." },
        ],
        repite: [{ a: "neutro", t: "Enough. More than once a day is a habit." }],
      },
      3: {
        asuntos: [
          [
            { a: "tenso", t: "People came asking who trains here." },
            { a: "neutro", t: "Told them the whole neighbourhood trains here. Which is true." },
            { a: "decidido", t: "And I gave them the list. The one from three years ago. Also true." },
          ],
          [
            { a: "neutro", t: "I don't pick you up any more. You haven't gone down in a month." },
            { a: "tenso", t: "That, or you've learned to fall where I can't see." },
            { a: "neutro", t: "Either works for me. The second one worries me." },
          ],
          [
            { a: "decidido", t: "When your last fight comes, don't win it by being strong." },
            { a: "neutro", t: "Win it by being clever. The strong ones are all in the port cemetery." },
            { a: "tenso", t: "And I'm not coming to see you there. Fair warning." },
          ],
        ],
        pregunta: "What do I tell El Sordo?",
        opciones: [
          { id: "honesto", label: "Thank him for the list", texto: "The three-year-old list. Thank you.", replica: "Nothing to it. Old paper and old truth. Costs nothing and saves people." },
          { id: "proteger", label: "Take no notice", texto: "I don't know why you're telling me that.", replica: "Neither do I. Guard up and shut it." },
          { id: "preguntar", label: "Ask about the last fight", texto: "And if the clever one loses?", replica: "The clever one doesn't lose. The clever one chooses what he loses. Not the same, lad." },
        ],
        repite: [{ a: "tenso", t: "Out. I've got people waiting and you've had your money's worth." }],
      },
    },
  },
};
