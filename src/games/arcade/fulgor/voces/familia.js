
/* ══ LAS VOCES ═══════════════════════════════════════════════════════════════════════
 *
 * Cada entrada: `asuntos` (lo que esa persona tiene que decirte hoy, escrito entero),
 * `pregunta` (cómo se plantea Dani la respuesta ante ESA persona), `opciones` (las tres
 * salidas, escritas para ella) y `repite` (volver a hablarle el mismo día).
 *
 * Los ánimos son los cuatro que sabe pintar `world/sprites.js`: neutro, tenso, decidido, roto.
 */

export const FAMILIA = {

  /* ── Nuria Vela · doce años · tu hermana ─────────────────────────────────────────
   * Se fija en todo y no dice nada hasta estar segura. Habla corto, pica y guarda las
   * cuentas. La curva de sus tres actos: te espera → deja de esperarte → ya lo sabe.
   */
  nuria: {
    es: {
      1: {
        asuntos: [
          [
            { a: "decidido", t: "Llevas dos días llegando el último y ni te has dado cuenta." },
            { a: "neutro", t: "Te he guardado media palmera. Estaba entera hace una hora, avisado quedas." },
            { a: "neutro", t: "No te voy a preguntar dónde estabas. Sólo lo estoy apuntando." },
          ],
          [
            { a: "tenso", t: "Se me ha muerto el móvil. Otra vez. Y el de mamá no." },
            { a: "neutro", t: "Papá dice que es la instalación del bloque. Papá dice muchas cosas." },
            { a: "neutro", t: "Tú estabas apoyado en la mesa cuando pasó. Eso es un dato, no una acusación." },
          ],
          [
            { a: "decidido", t: "El sábado. Lo dijiste tú, no yo. El acuario, el sábado." },
            { a: "neutro", t: "Si no puedes, dilo ahora y me ahorro la tarde entera." },
            { a: "tenso", t: "Lo malo no es que no vengas. Es que me entero cuando ya es de noche." },
          ],
        ],
        pregunta: "¿Qué le digo a mi hermana?",
        opciones: [
          { id: "honesto", label: "Prometer poco y en serio", texto: "El sábado no puedo. El domingo sí, y esta vez va en serio.", replica: "Vale. Domingo. Lo apunto, y si fallas te lo leo en voz alta." },
          { id: "proteger", label: "Quitarle hierro", texto: "No pasa nada, Nuria. De verdad que no pasa nada.", replica: "Ya. Es que cuando no pasa nada, tú no dices que no pasa nada." },
          { id: "preguntar", label: "Preguntar qué escribe", texto: "¿Qué estás escribiendo ahí? Y no me digas que deberes.", replica: "Cosas. Cuando esté acabado te dejo leerlo. Si sigues por aquí." },
        ],
        repite: [{ a: "neutro", t: "Ya hemos hablado, pesado. Anda, vete a hacer lo tuyo." }],
      },
      2: {
        asuntos: [
          [
            { a: "tenso", t: "Doce y uno. Ya no hace falta que te acuerdes, te lo digo yo." },
            { a: "neutro", t: "Mamá hizo tarta igual. Sobró bastante." },
            { a: "neutro", t: "No la tiré. Está en la nevera con tu nombre puesto. Literalmente puesto." },
          ],
          [
            { a: "neutro", t: "El niño del cuarto se ha disfrazado de ése. El de las noticias." },
            { a: "tenso", t: "Le he dicho que el manto no es así. Y luego me he callado." },
            { a: "neutro", t: "Porque no sé de qué sé yo cómo es el manto." },
          ],
          [
            { a: "decidido", t: "Estoy escribiendo una cosa larga. Con capítulos y todo." },
            { a: "neutro", t: "Va de un hermano que se va de casa por la ventana." },
            { a: "tenso", t: "Es inventado. Obviamente." },
          ],
        ],
        pregunta: "¿Qué le digo a mi hermana?",
        opciones: [
          { id: "honesto", label: "Reconocer que se fija", texto: "Te fijas más que nadie en esta casa. Eso no lo hace cualquiera.", replica: "Ya lo sé. Lo que no sé es por qué te da miedo que me fije." },
          { id: "proteger", label: "Reírse de la historia", texto: "Un hermano que se va por la ventana. Menuda novela.", replica: "Ya. Tú ríete. Yo sigo escribiendo igual." },
          { id: "preguntar", label: "Volver al niño del cuarto", texto: "¿Y qué le dijiste al del cuarto, exactamente?", replica: "Que el manto es más corto. Y me miró raro. Como me estás mirando tú ahora." },
        ],
        repite: [{ a: "tenso", t: "Dos veces en una tarde. Algo has hecho." }],
      },
      3: {
        asuntos: [
          [
            { a: "neutro", t: "Anoche no dormí. Y no fue por el apagón." },
            { a: "tenso", t: "Fue porque te oí volver y no subiste por la escalera." },
            { a: "neutro", t: "La escalera cruje. Cruje siempre. Anoche no crujió." },
          ],
          [
            { a: "roto", t: "Si un día no vuelves, ¿me lo dirá alguien o lo tengo que averiguar yo?" },
            { a: "neutro", t: "Porque yo lo averiguaría. Eso lo sabes." },
            { a: "tenso", t: "Prefiero que me lo digas tú, aunque sea tarde." },
          ],
          [
            { a: "decidido", t: "He acabado la historia. El hermano vuelve." },
            { a: "neutro", t: "Le tuve que cambiar el final tres veces para que volviera." },
            { a: "neutro", t: "Al final lo que le hizo volver fue que había alguien esperándole despierto." },
          ],
        ],
        pregunta: "¿Qué le digo a mi hermana?",
        opciones: [
          { id: "honesto", label: "Contarle casi todo", texto: "Nuria. Hago cosas de noche que todavía no te puedo explicar.", replica: "Todavía. Vale. Me quedo con el todavía y no pregunto más." },
          { id: "proteger", label: "Sostener la mentira", texto: "Duermes mal y oyes cosas. No hay nada más.", replica: "Vale. Pues las oigo yo sola, entonces. Como siempre." },
          { id: "preguntar", label: "Preguntar qué haría ella", texto: "Si supieras algo enorme de alguien, ¿lo contarías?", replica: "No. Esperaría a que me lo contara él. Llevo bastante esperando, por cierto." },
        ],
        repite: [{ a: "neutro", t: "Sigo aquí. No hace falta que lo compruebes cada media hora." }],
      },
    },
    en: {
      1: {
        asuntos: [
          [
            { a: "decidido", t: "Two days running you've come home last and you haven't even noticed." },
            { a: "neutro", t: "I saved you half a pastry. It was a whole one an hour ago, just so you know." },
            { a: "neutro", t: "I'm not going to ask where you were. I'm just writing it down." },
          ],
          [
            { a: "tenso", t: "My phone died. Again. Mum's didn't." },
            { a: "neutro", t: "Dad says it's the wiring in the block. Dad says a lot of things." },
            { a: "neutro", t: "You were leaning on the table when it happened. That's data, not an accusation." },
          ],
          [
            { a: "decidido", t: "Saturday. You said it, not me. The aquarium, Saturday." },
            { a: "neutro", t: "If you can't, say so now and I'll save myself the afternoon." },
            { a: "tenso", t: "The bad part isn't that you don't come. It's that I find out after dark." },
          ],
        ],
        pregunta: "What do I tell my sister?",
        opciones: [
          { id: "honesto", label: "Promise less, mean it", texto: "I can't do Saturday. Sunday I can, and this time I mean it.", replica: "Fine. Sunday. I'm writing it down, and if you bail I'll read it out loud." },
          { id: "proteger", label: "Play it down", texto: "Nothing's going on, Nuria. Honestly, nothing.", replica: "Right. Except when nothing's going on you don't say nothing's going on." },
          { id: "preguntar", label: "Ask what she's writing", texto: "What are you writing in there? And don't say homework.", replica: "Stuff. When it's finished I'll let you read it. If you're still around." },
        ],
        repite: [{ a: "neutro", t: "We've talked already, pest. Go and do your thing." }],
      },
      2: {
        asuntos: [
          [
            { a: "tenso", t: "Twelve and one. You don't have to remember any more, I'll just tell you." },
            { a: "neutro", t: "Mum made a cake anyway. There was quite a lot left." },
            { a: "neutro", t: "I didn't throw it out. It's in the fridge with your name on it. Actually written on it." },
          ],
          [
            { a: "neutro", t: "The kid on the fourth floor dressed up as him. The one on the news." },
            { a: "tenso", t: "I told him the cloak isn't like that. And then I shut up." },
            { a: "neutro", t: "Because I don't know how I know what the cloak is like." },
          ],
          [
            { a: "decidido", t: "I'm writing something long. With chapters and everything." },
            { a: "neutro", t: "It's about a brother who leaves the house through the window." },
            { a: "tenso", t: "It's made up. Obviously." },
          ],
        ],
        pregunta: "What do I tell my sister?",
        opciones: [
          { id: "honesto", label: "Admit she notices", texto: "You notice more than anyone in this house. Not everyone can do that.", replica: "I know. What I don't know is why that scares you." },
          { id: "proteger", label: "Laugh off the story", texto: "A brother who climbs out the window. Some novel.", replica: "Yeah. You laugh. I'll keep writing." },
          { id: "preguntar", label: "Go back to the kid upstairs", texto: "What exactly did you tell the kid on the fourth?", replica: "That the cloak's shorter. And he looked at me funny. Like you're looking at me now." },
        ],
        repite: [{ a: "tenso", t: "Twice in one afternoon. You've done something." }],
      },
      3: {
        asuntos: [
          [
            { a: "neutro", t: "I didn't sleep last night. And it wasn't the blackout." },
            { a: "tenso", t: "It was hearing you come back without using the stairs." },
            { a: "neutro", t: "The stairs creak. They always creak. Last night they didn't." },
          ],
          [
            { a: "roto", t: "If one day you don't come back, will somebody tell me, or do I work it out myself?" },
            { a: "neutro", t: "Because I would work it out. You know that." },
            { a: "tenso", t: "I'd rather hear it from you. Even late." },
          ],
          [
            { a: "decidido", t: "I finished the story. The brother comes back." },
            { a: "neutro", t: "I had to rewrite the ending three times to get him back." },
            { a: "neutro", t: "In the end what brought him back was somebody waiting up." },
          ],
        ],
        pregunta: "What do I tell my sister?",
        opciones: [
          { id: "honesto", label: "Tell her nearly all of it", texto: "Nuria. I do things at night that I can't explain to you yet.", replica: "Yet. All right. I'll take the yet and stop asking." },
          { id: "proteger", label: "Hold the lie", texto: "You're sleeping badly and hearing things. That's all it is.", replica: "Fine. Then I'll hear them on my own. Like always." },
          { id: "preguntar", label: "Ask what she would do", texto: "If you knew something huge about someone, would you tell?", replica: "No. I'd wait for him to tell me. I've been waiting a while, by the way." },
        ],
        repite: [{ a: "neutro", t: "Still here. You don't have to check every half hour." }],
      },
    },
  },

  /* ── Carmen Ferrer · tu madre · enfermera de urgencias ────────────────────────────
   * Turnos de noche. Nunca acusa: constata. Su oficio le ha enseñado a decir las cosas
   * graves en voz baja y sin adornos, y eso es exactamente lo que da miedo de ella.
   */
  carmen: {
    es: {
      1: {
        asuntos: [
          [
            { a: "neutro", t: "Te he dejado la cena en el horno. Es la tercera noche que la dejo en el horno." },
            { a: "tenso", t: "No te estoy riñendo. Te estoy diciendo un número." },
            { a: "neutro", t: "Los números me los sé bien. Es casi todo lo que hago en un turno." },
          ],
          [
            { a: "neutro", t: "Enséñame las manos. No: las dos." },
            { a: "tenso", t: "Eso no es de una sartén. Yo veo quemaduras ocho horas al día." },
            { a: "neutro", t: "Ponte la crema y no me digas de dónde salió. Todavía." },
          ],
          [
            { a: "neutro", t: "Anoche entró un chico de tu edad con la mano así." },
            { a: "tenso", t: "Y estuve un rato mirándole la cara para asegurarme de que no eras tú." },
            { a: "neutro", t: "Eso no se le hace a nadie, Dani. Ni siquiera sin querer." },
          ],
        ],
        pregunta: "¿Qué le digo a mi madre?",
        opciones: [
          { id: "honesto", label: "Darle un trozo de verdad", texto: "Me estoy metiendo en cosas. No peligrosas. Todavía no.", replica: "«Todavía no». Vaya con el «todavía no». Ven aquí y ponte la crema." },
          { id: "proteger", label: "Mentirle limpio", texto: "Fue en el instituto. El mechero del laboratorio.", replica: "Ya. Pues dile a Requena de mi parte que revise ese mechero." },
          { id: "preguntar", label: "Preguntar por el chico", texto: "El de anoche. ¿Salió bien?", replica: "Salió. Con la mano vendada y una bronca de su padre. Eso es salir bien." },
        ],
        repite: [{ a: "neutro", t: "Dani, que entro de turno. Lo que sea, en casa." }],
      },
      2: {
        asuntos: [
          [
            { a: "tenso", t: "Ayer trajeron a dos de un bajo de las Aguas. Y a un tercero no." },
            { a: "neutro", t: "En urgencias eso no se dice así. Se dice «dos ingresos»." },
            { a: "roto", t: "Contigo lo digo como es, porque contigo no estoy de servicio." },
          ],
          [
            { a: "neutro", t: "Tu padre no pregunta. Yo sí, sólo que en voz baja." },
            { a: "tenso", t: "Y me contesto sola, que es peor." },
            { a: "neutro", t: "Un día vas a tener que interrumpirme esa conversación." },
          ],
          [
            { a: "neutro", t: "Has adelgazado. Y duermes de día, como duermo yo." },
            { a: "tenso", t: "Dos personas en esta casa con horario de turno y sólo una cobra por ello." },
            { a: "neutro", t: "Come algo caliente antes de irte. Sea a donde sea." },
          ],
        ],
        pregunta: "¿Qué le digo a mi madre?",
        opciones: [
          { id: "honesto", label: "Dejarle ver una esquina", texto: "Mamá. El tercero de las Aguas. Yo estaba allí.", replica: "Ya lo sabía. Lo sé desde esa noche. Siéntate un momento." },
          { id: "proteger", label: "Sostenerle la calma", texto: "Estoy bien. Como, duermo, apruebo. Estoy bien.", replica: "Dos de tres. Y las dos que te has inventado son las que me importan." },
          { id: "preguntar", label: "Preguntarle si tiene miedo", texto: "¿Tú tienes miedo? De verdad, no de madre.", replica: "Constantemente. Se aprende a trabajar con miedo. No a dejar de tenerlo." },
        ],
        repite: [{ a: "tenso", t: "Dani, de verdad, que me van a echar. Luego." }],
      },
      3: {
        asuntos: [
          [
            { a: "roto", t: "Ocho horas de quirófano sin generador. Ocho." },
            { a: "neutro", t: "Y alguien mantuvo la luz. No sé quién. Sí sé quién." },
            { a: "tenso", t: "No lo voy a decir en voz alta ni dentro de esta cocina." },
          ],
          [
            { a: "neutro", t: "Vino una inspectora al hospital. Muy educada." },
            { a: "tenso", t: "Me preguntó por los turnos. Y por mi hijo, de pasada, como quien no quiere." },
            { a: "neutro", t: "Le contesté como se contesta en urgencias: verdad, poca y ordenada." },
          ],
          [
            { a: "roto", t: "He lavado una cosa que no era una sudadera." },
            { a: "neutro", t: "Está doblada en tu armario, debajo de las toallas." },
            { a: "tenso", t: "No la escondas ahí nunca más. Ahí busco yo." },
          ],
        ],
        pregunta: "¿Qué le digo a mi madre?",
        opciones: [
          { id: "honesto", label: "Decirlo de una vez", texto: "Era yo. En el hospital era yo, mamá.", replica: "Lo sé desde el minuto uno. Lo que necesitaba era que lo dijeras tú." },
          { id: "proteger", label: "Callarse por ella", texto: "Cuanto menos sepas, mejor duermes. Déjamelo a mí.", replica: "Yo no duermo desde hace ocho años. No me protejas del insomnio." },
          { id: "preguntar", label: "Preguntar qué le dijo", texto: "A la inspectora. ¿Qué le contaste exactamente?", replica: "Lo que era verdad y no servía de nada. Eso se aprende, con los partes." },
        ],
        repite: [{ a: "neutro", t: "Sigo aquí, sigo cansada y sigo queriéndote. Hablamos luego." }],
      },
    },
    en: {
      1: {
        asuntos: [
          [
            { a: "neutro", t: "Your dinner's in the oven. Third night running it's been in the oven." },
            { a: "tenso", t: "I'm not telling you off. I'm telling you a number." },
            { a: "neutro", t: "I'm good with numbers. It's most of what a shift is." },
          ],
          [
            { a: "neutro", t: "Show me your hands. No — both of them." },
            { a: "tenso", t: "That's not a frying pan. I look at burns eight hours a day." },
            { a: "neutro", t: "Put the cream on and don't tell me where it came from. Yet." },
          ],
          [
            { a: "neutro", t: "A boy your age came in last night with a hand like that." },
            { a: "tenso", t: "And I spent a while looking at his face to be sure it wasn't you." },
            { a: "neutro", t: "You don't do that to someone, Dani. Not even by accident." },
          ],
        ],
        pregunta: "What do I tell my mother?",
        opciones: [
          { id: "honesto", label: "Give her a piece of it", texto: "I'm into something. Not dangerous. Not yet.", replica: "'Not yet.' Listen to him. Come here and put the cream on." },
          { id: "proteger", label: "Lie cleanly", texto: "It happened at school. The lab burner.", replica: "Right. Then tell Requena from me to get that burner looked at." },
          { id: "preguntar", label: "Ask about the boy", texto: "The one last night. Was he all right?", replica: "He walked out. Bandaged, and getting an earful from his father. That counts as all right." },
        ],
        repite: [{ a: "neutro", t: "Dani, my shift's starting. Whatever it is, at home." }],
      },
      2: {
        asuntos: [
          [
            { a: "tenso", t: "They brought in two from a ground-floor flat in Aguas. Not a third." },
            { a: "neutro", t: "In A&E you don't say it like that. You say 'two admissions'." },
            { a: "roto", t: "With you I say it properly, because with you I'm off duty." },
          ],
          [
            { a: "neutro", t: "Your father doesn't ask. I do, only quietly." },
            { a: "tenso", t: "And then I answer myself, which is worse." },
            { a: "neutro", t: "One of these days you're going to have to interrupt that conversation." },
          ],
          [
            { a: "neutro", t: "You've lost weight. And you sleep in the day, the way I do." },
            { a: "tenso", t: "Two people in this house on shift hours and only one of them gets paid." },
            { a: "neutro", t: "Eat something hot before you go. Wherever it is you go." },
          ],
        ],
        pregunta: "What do I tell my mother?",
        opciones: [
          { id: "honesto", label: "Let her see a corner", texto: "Mum. The third one, in Aguas. I was there.", replica: "I knew. I've known since that night. Sit down a minute." },
          { id: "proteger", label: "Keep her calm", texto: "I'm fine. I eat, I sleep, I'm passing. I'm fine.", replica: "Two out of three. And the two you made up are the two I care about." },
          { id: "preguntar", label: "Ask if she's afraid", texto: "Are you scared? Properly, not mum-scared.", replica: "Constantly. You learn to work afraid. You don't learn to stop." },
        ],
        repite: [{ a: "tenso", t: "Dani, seriously, they'll have my head. Later." }],
      },
      3: {
        asuntos: [
          [
            { a: "roto", t: "Eight hours of theatre with no generator. Eight." },
            { a: "neutro", t: "And somebody kept the lights on. I don't know who. I do know who." },
            { a: "tenso", t: "I'm not saying it out loud, not even in this kitchen." },
          ],
          [
            { a: "neutro", t: "An inspector came to the hospital. Very polite." },
            { a: "tenso", t: "Asked about the rotas. And about my son, in passing, like it was nothing." },
            { a: "neutro", t: "I answered the way you answer in A&E. True, brief, in order." },
          ],
          [
            { a: "roto", t: "I washed something that wasn't a hoodie." },
            { a: "neutro", t: "It's folded in your wardrobe, under the towels." },
            { a: "tenso", t: "Never hide it there again. That's where I look." },
          ],
        ],
        pregunta: "What do I tell my mother?",
        opciones: [
          { id: "honesto", label: "Say it at last", texto: "It was me. At the hospital, it was me.", replica: "I've known since the first minute. What I needed was to hear you say it." },
          { id: "proteger", label: "Stay quiet for her sake", texto: "The less you know, the better you sleep. Leave it to me.", replica: "I haven't slept in eight years. Don't protect me from insomnia." },
          { id: "preguntar", label: "Ask what she told her", texto: "The inspector. What did you actually tell her?", replica: "What was true and no use to anybody. You learn that, writing reports." },
        ],
        repite: [{ a: "neutro", t: "Still here, still tired, still love you. We'll talk later." }],
      },
    },
  },

  /* ── Tomás Vela · tu padre · técnico de mantenimiento en Eléctrica Marés ──────────
   * Habla de la red para no hablar de sí mismo. Su firma está debajo de todo esto, y él
   * todavía no lo sabe — o lo sabe, y por eso mira tanto los partes.
   */
  tomas: {
    es: {
      1: {
        asuntos: [
          [
            { a: "neutro", t: "Tres picos de tensión esta semana en el Polígono. Tres." },
            { a: "neutro", t: "Y la subestación vieja lleva descatalogada desde antes de que nacieras." },
            { a: "tenso", t: "No debería dar ni un pico. No debería dar nada." },
          ],
          [
            { a: "neutro", t: "¿Sabes por qué me gusta este trabajo? Porque la corriente no miente." },
            { a: "neutro", t: "Va por donde puede ir. Siempre. Sin excepciones." },
            { a: "neutro", t: "La gente no. La gente va por donde le conviene." },
          ],
          [
            { a: "tenso", t: "Si alguna vez te acercas a una nave del Polígono, no toques nada." },
            { a: "neutro", t: "No te lo digo de padre. Te lo digo de técnico." },
            { a: "neutro", t: "Ahí dentro hay cosas conectadas que llevan veinte años sin que nadie sepa a qué." },
          ],
        ],
        pregunta: "¿Qué le digo a mi padre?",
        opciones: [
          { id: "honesto", label: "Preguntar por la subestación", texto: "Papá, la nave de la subestación. ¿Qué había ahí dentro?", replica: "Cables. Y una puerta que cerré una vez y que no me pagaron por volver a abrir." },
          { id: "proteger", label: "Cambiar de tema", texto: "Nada. Curiosidad. ¿Comemos?", replica: "Comemos. Pero has preguntado por el Polígono, y eso lo apunto yo también." },
          { id: "preguntar", label: "Preguntar por su trabajo de antes", texto: "¿Tú siempre has hecho mantenimiento?", replica: "Siempre. Salvo un año. Y de ese año me acuerdo regular, cosas de la edad." },
        ],
        repite: [{ a: "neutro", t: "Ya me has pillado una vez hoy. Estoy de guardia, hijo." }],
      },
      2: {
        asuntos: [
          [
            { a: "tenso", t: "Me han pedido los partes de hace veinte años. Del archivo muerto." },
            { a: "neutro", t: "Nadie pide el archivo muerto porque sí." },
            { a: "neutro", t: "Los he subido y me he quedado una copia. No sabría decirte por qué." },
          ],
          [
            { a: "neutro", t: "Ése de las noticias. El que apaga transformadores sin tocarlos." },
            { a: "tenso", t: "Eso no es un chaval con un truco. Eso es una instalación andando." },
            { a: "neutro", t: "Y una instalación andando se quema sola si nadie la calibra." },
          ],
          [
            { a: "roto", t: "Tu madre y yo hablamos poco últimamente. Ya lo habrás notado." },
            { a: "neutro", t: "No es por ti. Es que ella hace preguntas y yo hago informes." },
            { a: "neutro", t: "Los informes no se contestan. Ése es todo el problema." },
          ],
        ],
        pregunta: "¿Qué le digo a mi padre?",
        opciones: [
          { id: "honesto", label: "Pedirle esa copia", texto: "La copia de los partes. ¿Me dejas mirarla?", replica: "…Sí. Que no la vea tu madre. Y no me preguntes qué hay dentro, que no lo he leído." },
          { id: "proteger", label: "Dejarle su silencio", texto: "Tú sabrás lo que haces, papá.", replica: "Ése es el problema. Hace veinte años yo también sabía lo que hacía." },
          { id: "preguntar", label: "Preguntar quién los pidió", texto: "¿Quién ha pedido el archivo muerto?", replica: "Presidencia. Directamente. Que es como no pedirlo nadie, pero al revés." },
        ],
        repite: [{ a: "neutro", t: "Estoy con la centralita. Dame una hora." }],
      },
      3: {
        asuntos: [
          [
            { a: "roto", t: "He visto mi firma en un papel que no recuerdo haber firmado." },
            { a: "neutro", t: "Y la letra es mía. Es completamente mía." },
            { a: "tenso", t: "Tenía veintitrés años y una hipoteca. Firmé lo que me pusieron delante." },
          ],
          [
            { a: "neutro", t: "El apagón no fue una avería. Las averías tienen forma de accidente." },
            { a: "tenso", t: "Aquello tenía forma de decisión." },
            { a: "neutro", t: "Alguien bajó la carga por orden. Y luego alguien borró la orden." },
          ],
          [
            { a: "neutro", t: "Si tuvieras que esconder algo de esta familia, ¿me lo esconderías a mí?" },
            { a: "roto", t: "No contestes. Ya sé la respuesta, y es la que le di yo a mi padre." },
            { a: "neutro", t: "Sólo quería oírme decirlo en voz alta una vez." },
          ],
        ],
        pregunta: "¿Qué le digo a mi padre?",
        opciones: [
          { id: "honesto", label: "Decirle que su firma importa", texto: "Papá, esa firma tuya es el principio de todo esto. Y de mí.", replica: "Me lo temía. Pues entonces esto lo arreglamos los dos, no tú solo." },
          { id: "proteger", label: "Quitarle la culpa", texto: "Firmaste un papel a los veintitrés. Eso no te hace responsable.", replica: "Sí me hace. Pero gracias por intentarlo, que es lo que hace un hijo." },
          { id: "preguntar", label: "Preguntar por la orden borrada", texto: "¿Se puede recuperar una orden borrada?", replica: "Del sistema no. Del cuaderno de un técnico viejo, quizá. Déjame mirar." },
        ],
        repite: [{ a: "neutro", t: "Hoy ya hemos hablado más que el mes pasado entero. Anda, ve." }],
      },
    },
    en: {
      1: {
        asuntos: [
          [
            { a: "neutro", t: "Three voltage spikes this week out in the Polígono. Three." },
            { a: "neutro", t: "And that old substation's been off the books since before you were born." },
            { a: "tenso", t: "It shouldn't spike. It shouldn't do anything at all." },
          ],
          [
            { a: "neutro", t: "Know why I like this job? Current doesn't lie." },
            { a: "neutro", t: "It goes where it can go. Always. No exceptions." },
            { a: "neutro", t: "People don't. People go where it suits them." },
          ],
          [
            { a: "tenso", t: "If you're ever near one of those units in the Polígono, touch nothing." },
            { a: "neutro", t: "That's not your father talking. That's the engineer." },
            { a: "neutro", t: "There are things wired up in there nobody's known the purpose of for twenty years." },
          ],
        ],
        pregunta: "What do I tell my father?",
        opciones: [
          { id: "honesto", label: "Ask about the substation", texto: "Dad — the substation building. What was in there?", replica: "Cable. And a door I locked once and never got paid to open again." },
          { id: "proteger", label: "Change the subject", texto: "Nothing. Just curious. Are we eating?", replica: "We're eating. But you asked about the Polígono, and I write things down too." },
          { id: "preguntar", label: "Ask what he did before", texto: "Have you always done maintenance?", replica: "Always. Except one year. And that year's gone hazy on me. Age, probably." },
        ],
        repite: [{ a: "neutro", t: "You've had me once today. I'm on call, son." }],
      },
      2: {
        asuntos: [
          [
            { a: "tenso", t: "They've asked me for the reports from twenty years back. The dead archive." },
            { a: "neutro", t: "Nobody asks for the dead archive for fun." },
            { a: "neutro", t: "I sent them up and kept a copy. Couldn't tell you why." },
          ],
          [
            { a: "neutro", t: "That one on the news. Drops transformers without touching them." },
            { a: "tenso", t: "That's not a kid with a trick. That's an installation out walking." },
            { a: "neutro", t: "And an installation nobody calibrates burns itself out." },
          ],
          [
            { a: "roto", t: "Your mother and I don't talk much lately. You'll have noticed." },
            { a: "neutro", t: "It isn't you. She asks questions and I file reports." },
            { a: "neutro", t: "Reports don't get answered. That's the whole of it." },
          ],
        ],
        pregunta: "What do I tell my father?",
        opciones: [
          { id: "honesto", label: "Ask for that copy", texto: "The copy of those reports. Can I look at it?", replica: "…Yes. Don't let your mother see it. And don't ask what's inside, I haven't read it." },
          { id: "proteger", label: "Leave him his silence", texto: "You know what you're doing, Dad.", replica: "That's the trouble. Twenty years ago I knew what I was doing too." },
          { id: "preguntar", label: "Ask who requested them", texto: "Who asked for the dead archive?", replica: "The president's office. Direct. Which is like nobody asking, only the other way round." },
        ],
        repite: [{ a: "neutro", t: "I'm on the switchboard. Give me an hour." }],
      },
      3: {
        asuntos: [
          [
            { a: "roto", t: "I've seen my signature on a paper I don't remember signing." },
            { a: "neutro", t: "And it's my hand. It's completely my hand." },
            { a: "tenso", t: "I was twenty-three with a mortgage. I signed what they put in front of me." },
          ],
          [
            { a: "neutro", t: "The blackout wasn't a fault. Faults look like accidents." },
            { a: "tenso", t: "That looked like a decision." },
            { a: "neutro", t: "Someone dropped the load on instruction. Then someone deleted the instruction." },
          ],
          [
            { a: "neutro", t: "If you had to hide something from this family, would you hide it from me?" },
            { a: "roto", t: "Don't answer. I know the answer — it's the one I gave my father." },
            { a: "neutro", t: "I just wanted to hear myself say it out loud once." },
          ],
        ],
        pregunta: "What do I tell my father?",
        opciones: [
          { id: "honesto", label: "Tell him his signature matters", texto: "Dad, that signature is where all of this starts. Including me.", replica: "I was afraid of that. Then we fix it between us. Not you on your own." },
          { id: "proteger", label: "Take the blame off him", texto: "You signed a form at twenty-three. That doesn't make it yours.", replica: "It does. But thanks for trying. That's what a son's for." },
          { id: "preguntar", label: "Ask about the deleted order", texto: "Can a deleted instruction be recovered?", replica: "Not from the system. From an old technician's notebook, maybe. Let me look." },
        ],
        repite: [{ a: "neutro", t: "We've talked more today than all last month. Go on." }],
      },
    },
  },
};
