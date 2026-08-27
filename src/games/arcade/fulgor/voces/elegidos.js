/**
 * FULGOR — las voces del otro lado del cofre.
 *
 * Tres adversarios y dos elegidos, y la diferencia entre unos y otros es más fina de lo que
 * a Dani le gustaría. El Tasador tasa, Hierro paga un tratamiento, Larga apaga lo que Dani
 * enciende, la Vigía es lo que le pasa a quien gana solo, y Cero es la tesis del juego dicha
 * en voz alta por alguien que se la cree.
 *
 * Ninguno de los cinco habla como un villano de tebeo. Ésa es la regla del reparto: si una
 * frase de aquí sonaría bien gritada desde un tejado, está mal escrita.
 */

export const ELEGIDOS = {

  /* ── El Tasador · abre cajas fuertes sin tocarlas ────────────────────────────────
   * Todo lo mide en valor. Es cortés hasta cuando roba, y su lección de capítulo 3 no es
   * que la Materia venza al Rayo: es que la fuerza sin lectura es cara.
   */
  tasador: {
    es: {
      1: {
        asuntos: [
          [
            { a: "neutro", t: "Un aficionado. Y con prisa, que es lo caro." },
            { a: "decidido", t: "Yo no fuerzo cerraduras, muchacho. Les explico por qué les conviene abrirse." },
            { a: "neutro", t: "Tú haces lo contrario: entras gritando y luego pagas la reparación." },
          ],
          [
            { a: "neutro", t: "Déjame tasarte. Es gratis y no duele: es lo único que sé hacer." },
            { a: "tenso", t: "Potencia, mucha. Control, poco. Discreción, ninguna. Valor de mercado: alto y bajando." },
            { a: "neutro", t: "Lo que se ve mucho vale poco. Es la primera regla de cualquier tasación." },
          ],
          [
            { a: "decidido", t: "El metal no se rompe: se convence. Cede donde ya quería ceder." },
            { a: "neutro", t: "Tú le metes corriente y el metal se pone terco. Es de manual." },
            { a: "tenso", t: "Y mientras discutes con una puerta, las cámaras te están tasando a ti." },
          ],
        ],
        pregunta: "¿Qué le digo al Tasador?",
        opciones: [
          { id: "honesto", label: "Aceptar la tasación", texto: "Vale. Dígame qué me falta y le dejo salir por la puerta.", replica: "Lectura. Te falta lectura. Y por la puerta iba a salir igual, pero se agradece el gesto." },
          { id: "proteger", label: "Cortarle en seco", texto: "No he venido a que me den clase.", replica: "Nadie viene a eso. Y sin embargo todo el mundo la necesita. Buenas noches." },
          { id: "preguntar", label: "Preguntar para quién trabaja", texto: "¿Quién le paga a usted?", replica: "Alguien que compra objetos raros. Y últimamente pregunta mucho por objetos que andan." },
        ],
        repite: [{ a: "neutro", t: "Ya te he tasado hoy. Volver a tasar lo mismo abarata la pieza." }],
      },
      2: {
        asuntos: [
          [
            { a: "neutro", t: "Has subido de precio. Enhorabuena, es un cumplido y una advertencia." },
            { a: "tenso", t: "Cuando algo sube de precio, aparecen compradores que antes no miraban." },
            { a: "neutro", t: "Y a los compradores nuevos no les interesa que la pieza siga andando." },
          ],
          [
            { a: "decidido", t: "Hoy no vengo a llevarme nada. Vengo a devolverte una cosa." },
            { a: "neutro", t: "Un trozo de tu manto. Lo compré en el puerto por doce euros." },
            { a: "tenso", t: "Doce euros, muchacho. Ése es el precio de tu nombre en el mercado de al lado." },
          ],
          [
            { a: "neutro", t: "Los golpes buenos no se recuerdan. Ése es todo el oficio." },
            { a: "neutro", t: "Si mañana el periódico habla de ti, es que anoche trabajaste mal." },
            { a: "tenso", t: "Y llevas cuatro portadas seguidas. Cuatro." },
          ],
        ],
        pregunta: "¿Qué le digo al Tasador?",
        opciones: [
          { id: "honesto", label: "Preguntarle cómo se sale limpio", texto: "Enséñeme a salir sin que quede nada mío por ahí.", replica: "Mira tú. La primera pregunta cara que me haces. Empieza por no correr al final." },
          { id: "proteger", label: "Desconfiar del regalo", texto: "¿Y por qué me devuelve la tela?", replica: "Porque una pieza rota vale menos. Y yo prefiero que sigas siendo una pieza cara." },
          { id: "preguntar", label: "Preguntar por los compradores", texto: "¿Quiénes son los compradores nuevos?", replica: "Uno solo, con muchos nombres y un edificio de cristal. Ya sabes cuál." },
        ],
        repite: [{ a: "neutro", t: "Segunda visita el mismo día. Eso, en mi oficio, se llama nerviosismo." }],
      },
      3: {
        asuntos: [
          [
            { a: "tenso", t: "Me han ofrecido dinero por decir dónde duermes. Mucho dinero." },
            { a: "neutro", t: "Y he dicho que no, lo cual me ha sorprendido más a mí que a nadie." },
            { a: "decidido", t: "Uno se pasa la vida tasando y un día se encuentra con algo que no quiere vender." },
          ],
          [
            { a: "neutro", t: "La central de las Tolvas tiene tres puertas y sólo una está en los planos." },
            { a: "decidido", t: "La otra la abrí yo en el noventa y siete y nadie la ha vuelto a cerrar." },
            { a: "neutro", t: "Está detrás de la torre de refrigeración, a ras de suelo. De nada." },
          ],
          [
            { a: "neutro", t: "Te voy a tasar por última vez, y esta vez con el precio bueno." },
            { a: "tenso", t: "Control, alto. Lectura, alta. Discreción… sigue siendo un desastre." },
            { a: "decidido", t: "Pero ya no vale por la pieza. Vale por quién la sostiene. Eso no lo compra nadie." },
          ],
        ],
        pregunta: "¿Qué le digo al Tasador?",
        opciones: [
          { id: "honesto", label: "Darle las gracias", texto: "Gracias por la puerta. Y por no venderme.", replica: "No me las des. Lo segundo lo hice por vanidad y lo primero por aburrimiento." },
          { id: "proteger", label: "Desconfiar hasta el final", texto: "¿Y qué gana usted con esa puerta?", replica: "Nada. Es la primera vez en cuarenta años, y me está resultando incomodísimo." },
          { id: "preguntar", label: "Preguntar quién ofreció el dinero", texto: "¿Quién le ofreció ese dinero?", replica: "Una mujer que no proyecta sombra. Y eso, en mi oficio, es una descripción completa." },
        ],
        repite: [{ a: "neutro", t: "Ya está todo tasado. Insistir baja el precio, muchacho." }],
      },
    },
    en: {
      1: {
        asuntos: [
          [
            { a: "neutro", t: "An amateur. And in a hurry, which is the expensive part." },
            { a: "decidido", t: "I don't force locks, young man. I explain to them why opening is in their interest." },
            { a: "neutro", t: "You do the opposite: you come in shouting and then pay for the repairs." },
          ],
          [
            { a: "neutro", t: "Let me appraise you. It's free and it doesn't hurt. It's all I know how to do." },
            { a: "tenso", t: "Power, considerable. Control, little. Discretion, none. Market value: high and falling." },
            { a: "neutro", t: "What is seen often is worth little. First rule of any appraisal." },
          ],
          [
            { a: "decidido", t: "Metal isn't broken. It's persuaded. It gives where it already wanted to give." },
            { a: "neutro", t: "You push current into it and it turns stubborn. That's textbook." },
            { a: "tenso", t: "And while you argue with a door, the cameras are appraising you." },
          ],
        ],
        pregunta: "What do I tell the Appraiser?",
        opciones: [
          { id: "honesto", label: "Accept the appraisal", texto: "Fine. Tell me what I'm missing and I'll let you walk out.", replica: "Reading. You're missing reading. And I was walking out anyway, but the gesture is noted." },
          { id: "proteger", label: "Cut him off", texto: "I didn't come here for a lecture.", replica: "Nobody ever does. And yet everybody needs one. Good evening." },
          { id: "preguntar", label: "Ask who pays him", texto: "Who's paying you?", replica: "Somebody who buys rare objects. And lately asks a great deal about objects that walk." },
        ],
        repite: [{ a: "neutro", t: "I've appraised you today. Appraising the same piece twice cheapens it." }],
      },
      2: {
        asuntos: [
          [
            { a: "neutro", t: "Your price has gone up. Congratulations — that's a compliment and a warning." },
            { a: "tenso", t: "When something goes up in price, buyers appear who weren't looking before." },
            { a: "neutro", t: "And the new buyers aren't interested in the piece continuing to walk." },
          ],
          [
            { a: "decidido", t: "I'm not here to take anything today. I'm here to return something." },
            { a: "neutro", t: "A piece of your cloak. I bought it at the port for twelve euros." },
            { a: "tenso", t: "Twelve euros, young man. That's what your name fetches in the market next door." },
          ],
          [
            { a: "neutro", t: "Good jobs aren't remembered. That's the whole trade." },
            { a: "neutro", t: "If tomorrow's paper mentions you, last night's work was poor." },
            { a: "tenso", t: "And you've had four front pages running. Four." },
          ],
        ],
        pregunta: "What do I tell the Appraiser?",
        opciones: [
          { id: "honesto", label: "Ask how to leave clean", texto: "Teach me to leave nothing of mine behind.", replica: "Well now. Your first expensive question. Start by not running at the end." },
          { id: "proteger", label: "Distrust the gift", texto: "Why give me the cloth back?", replica: "Because a damaged piece is worth less. And I'd rather you stayed an expensive one." },
          { id: "preguntar", label: "Ask about the buyers", texto: "Who are the new buyers?", replica: "One buyer, many names, a glass building. You know the one." },
        ],
        repite: [{ a: "neutro", t: "A second visit in one day. In my trade that's called nerves." }],
      },
      3: {
        asuntos: [
          [
            { a: "tenso", t: "I've been offered money to say where you sleep. A great deal of money." },
            { a: "neutro", t: "And I declined, which surprised me more than anyone." },
            { a: "decidido", t: "You spend a life appraising and one day you meet something you don't want to sell." },
          ],
          [
            { a: "neutro", t: "The Tolvas station has three doors and only one is on the plans." },
            { a: "decidido", t: "I opened the second in ninety-seven and nobody has closed it since." },
            { a: "neutro", t: "Behind the cooling tower, at ground level. Don't mention it." },
          ],
          [
            { a: "neutro", t: "I'll appraise you one last time, and this time at the proper price." },
            { a: "tenso", t: "Control, high. Reading, high. Discretion… still a catastrophe." },
            { a: "decidido", t: "But it's no longer worth what the piece is. It's worth who's holding it. Nobody buys that." },
          ],
        ],
        pregunta: "What do I tell the Appraiser?",
        opciones: [
          { id: "honesto", label: "Thank him", texto: "Thank you. For the door, and for not selling me.", replica: "Don't. The second was vanity and the first was boredom." },
          { id: "proteger", label: "Distrust to the end", texto: "What do you get out of that door?", replica: "Nothing. First time in forty years, and I'm finding it deeply uncomfortable." },
          { id: "preguntar", label: "Ask who offered", texto: "Who offered you the money?", replica: "A woman who casts no shadow. In my trade, that's a complete description." },
        ],
        repite: [{ a: "neutro", t: "It's all appraised. Pressing lowers the price, young man." }],
      },
    },
  },

  /* ── Hierro · Aurelio Cid · exboxeador con un exoesqueleto de obra ────────────────
   * No pelea por maldad ni por dinero: pelea por un tratamiento. Habla despacio y con
   * vergüenza, y es el único adversario del juego al que Dani no puede odiar ni un minuto.
   */
  hierro: {
    es: {
      1: {
        asuntos: [
          [
            { a: "tenso", t: "Este sitio no es para chavales. Date la vuelta." },
            { a: "neutro", t: "Te lo digo una vez y no lo voy a repetir con esta voz." },
            { a: "tenso", t: "Con la otra voz sí, pero ésa no te va a gustar." },
          ],
          [
            { a: "neutro", t: "Yo peleé doce años. Doce. Y no tengo ni una foto colgada en casa." },
            { a: "tenso", t: "Porque cuando peleas por necesidad, no hay foto que quieras mirar." },
            { a: "neutro", t: "Tú todavía peleas por otra cosa. Se te nota en cómo entras." },
          ],
          [
            { a: "roto", t: "¿Sabes lo que cuesta un tratamiento de dieciocho meses? Yo sí. Al céntimo." },
            { a: "neutro", t: "Y sé cuántos cajeros son. También al céntimo." },
            { a: "tenso", t: "No te estoy pidiendo que lo entiendas. Te estoy pidiendo que te apartes." },
          ],
        ],
        pregunta: "¿Qué le digo a Hierro?",
        opciones: [
          { id: "honesto", label: "Decirle que hay otra forma", texto: "Hay otra manera de pagarlo. La busco yo si hace falta.", replica: "Ya. Eso me lo dijo un asistente social. Sigo esperando la manera." },
          { id: "proteger", label: "Plantarse sin más", texto: "No me voy a apartar.", replica: "Entonces esto se acaba mal para uno de los dos. Y hoy no me importa cuál." },
          { id: "preguntar", label: "Preguntar para quién es", texto: "El tratamiento. ¿Para quién es?", replica: "Eso no te lo voy a decir. Porque si te lo digo, ya no puedes pegarme." },
        ],
        repite: [{ a: "tenso", t: "Te he dicho que te des la vuelta. No lo digo tres veces." }],
      },
      2: {
        asuntos: [
          [
            { a: "roto", t: "El traje ese me lo hizo un ingeniero al que echaron del astillero." },
            { a: "neutro", t: "Pesa cuarenta kilos y me está partiendo las caderas. Lo sé y sigo." },
            { a: "tenso", t: "Porque quitármelo es volver a ser un señor de cincuenta sin trabajo." },
          ],
          [
            { a: "neutro", t: "Aquella noche en las grúas te dejé ir. Podía haber apretado más." },
            { a: "tenso", t: "No lo hice porque te vi la cara y te vi la edad." },
            { a: "roto", t: "Y porque mi hija tiene la tuya, más o menos. Eso también." },
          ],
          [
            { a: "neutro", t: "Golpea corto. No sabes golpear corto y por eso te agarran." },
            { a: "decidido", t: "El brazo largo es para el público. El corto es para ganar." },
            { a: "neutro", t: "Te lo enseño gratis. Considéralo la parte de mí que no está en venta." },
          ],
        ],
        pregunta: "¿Qué le digo a Hierro?",
        opciones: [
          { id: "honesto", label: "Aceptar la lección", texto: "Enséñeme. Y luego hablamos de cómo pagamos ese tratamiento.", replica: "Ponte ahí. Y no me hables de dinero mientras te enseño, que se me olvida a qué he venido." },
          { id: "proteger", label: "Mantener las distancias", texto: "No necesito que me enseñe nada.", replica: "Claro que no. Los de tu edad nunca necesitan nada. Hasta que se rompen la mano." },
          { id: "preguntar", label: "Preguntar por su hija", texto: "¿Cuántos años tiene su hija?", replica: "Catorce. Y no la veo desde marzo, que es la otra cosa que me está partiendo por dentro." },
        ],
        repite: [{ a: "neutro", t: "Ya hemos hablado hoy. Y hablar contigo me deja tonto el resto de la tarde." }],
      },
      3: {
        asuntos: [
          [
            { a: "decidido", t: "He vendido el exoesqueleto. Por piezas, a un chatarrero de Alicante." },
            { a: "neutro", t: "Da menos de lo que da un cajero. Pero da todos los meses y no lleva máscara." },
            { a: "roto", t: "Y ahora soy un señor de cincuenta sin trabajo. Tenías razón tú." },
          ],
          [
            { a: "neutro", t: "El de la torre de cristal me ofreció trabajo el mes pasado." },
            { a: "tenso", t: "Quería que le trajera a un chaval. Vivo, dijo, como si eso fuera generoso." },
            { a: "decidido", t: "Le dije que ya no llevo el traje. Y era mentira, porque entonces todavía lo llevaba." },
          ],
          [
            { a: "roto", t: "Cuando entres en esa central, no entres solo. Te lo pide un hombre que entró solo." },
            { a: "neutro", t: "Yo pensaba que pedir ayuda era el principio de perderlo todo." },
            { a: "tenso", t: "Y lo perdí todo igual, sólo que sin que nadie me viera perderlo." },
          ],
        ],
        pregunta: "¿Qué le digo a Hierro?",
        opciones: [
          { id: "honesto", label: "Pedirle que venga", texto: "Venga usted conmigo. Sin traje. Sólo hace falta alguien que aguante de pie.", replica: "…Vale. Vale. Llevaba tres años sin que nadie me pidiera nada que no fuera pegar." },
          { id: "proteger", label: "No involucrarle más", texto: "Ya ha hecho bastante. Quédese fuera.", replica: "Fuera. Bien. Pues estaré en la esquina, fuera. Por si acaso." },
          { id: "preguntar", label: "Preguntar por el tratamiento", texto: "¿Y el tratamiento?", replica: "Va. Despacio, pero va. Resulta que había una manera. Tardé dos años en preguntar." },
        ],
        repite: [{ a: "neutro", t: "Ya está dicho. Y me ha costado, así que no me lo hagas repetir." }],
      },
    },
    en: {
      1: {
        asuntos: [
          [
            { a: "tenso", t: "This place isn't for kids. Turn around." },
            { a: "neutro", t: "I'm saying it once and I won't repeat it in this voice." },
            { a: "tenso", t: "In the other voice, yes. You won't like that one." },
          ],
          [
            { a: "neutro", t: "I fought twelve years. Twelve. And there isn't one photo up in my house." },
            { a: "tenso", t: "Because when you fight out of need, there's no photo you want to look at." },
            { a: "neutro", t: "You still fight for something else. It shows in how you come in." },
          ],
          [
            { a: "roto", t: "Know what an eighteen-month course of treatment costs? I do. To the cent." },
            { a: "neutro", t: "And I know how many cash machines that is. Also to the cent." },
            { a: "tenso", t: "I'm not asking you to understand. I'm asking you to move." },
          ],
        ],
        pregunta: "What do I tell Hierro?",
        opciones: [
          { id: "honesto", label: "Offer another way", texto: "There's another way to pay for it. I'll find it myself if I have to.", replica: "Right. A social worker told me that. I'm still waiting for the way." },
          { id: "proteger", label: "Stand your ground", texto: "I'm not moving.", replica: "Then this ends badly for one of us. And today I don't much mind which." },
          { id: "preguntar", label: "Ask who it's for", texto: "The treatment. Who's it for?", replica: "I'm not telling you that. Because if I tell you, you can't hit me any more." },
        ],
        repite: [{ a: "tenso", t: "I told you to turn around. I don't say it three times." }],
      },
      2: {
        asuntos: [
          [
            { a: "roto", t: "An engineer they sacked from the shipyard built me that rig." },
            { a: "neutro", t: "It weighs forty kilos and it's destroying my hips. I know, and I keep going." },
            { a: "tenso", t: "Because taking it off means being an unemployed fifty-year-old again." },
          ],
          [
            { a: "neutro", t: "That night on the cranes I let you go. I could have pushed harder." },
            { a: "tenso", t: "I didn't because I saw your face and I saw your age." },
            { a: "roto", t: "And because my daughter is about the same. That as well." },
          ],
          [
            { a: "neutro", t: "Punch short. You can't punch short, that's why they grab you." },
            { a: "decidido", t: "The long arm is for the crowd. The short one is for winning." },
            { a: "neutro", t: "I'll teach you free. Consider it the part of me that isn't for sale." },
          ],
        ],
        pregunta: "What do I tell Hierro?",
        opciones: [
          { id: "honesto", label: "Take the lesson", texto: "Teach me. And then we'll talk about how that treatment gets paid.", replica: "Stand there. And don't talk money while I'm teaching, I forget what I came for." },
          { id: "proteger", label: "Keep your distance", texto: "I don't need you to teach me anything.", replica: "Of course not. Your lot never need anything. Until they break a hand." },
          { id: "preguntar", label: "Ask about his daughter", texto: "How old is your daughter?", replica: "Fourteen. And I haven't seen her since March, which is the other thing breaking me." },
        ],
        repite: [{ a: "neutro", t: "We've talked today. And talking to you leaves me useless all afternoon." }],
      },
      3: {
        asuntos: [
          [
            { a: "decidido", t: "I've sold the exoskeleton. For parts, to a scrap dealer in Alicante." },
            { a: "neutro", t: "Pays less than a cash machine. But it pays every month and it doesn't wear a mask." },
            { a: "roto", t: "So now I'm an unemployed fifty-year-old. You were right." },
          ],
          [
            { a: "neutro", t: "The one in the glass tower offered me work last month." },
            { a: "tenso", t: "Wanted me to bring him a boy. Alive, he said, as though that were generous." },
            { a: "decidido", t: "I told him I don't wear the rig any more. Which was a lie, because then I still did." },
          ],
          [
            { a: "roto", t: "When you go into that station, don't go alone. A man who went alone is asking." },
            { a: "neutro", t: "I used to think asking for help was the start of losing everything." },
            { a: "tenso", t: "And I lost everything anyway. Only with nobody watching me lose it." },
          ],
        ],
        pregunta: "What do I tell Hierro?",
        opciones: [
          { id: "honesto", label: "Ask him to come", texto: "Come with me. No rig. I just need somebody who stays standing.", replica: "…All right. All right. Three years since anyone asked me for anything but hitting." },
          { id: "proteger", label: "Keep him out of it", texto: "You've done enough. Stay out.", replica: "Out. Fine. Then I'll be on the corner. Outside. Just in case." },
          { id: "preguntar", label: "Ask about the treatment", texto: "And the treatment?", replica: "It's going. Slowly, but going. Turns out there was a way. Took me two years to ask." },
        ],
        repite: [{ a: "neutro", t: "It's said. And it cost me, so don't make me say it twice." }],
      },
    },
  },

  /* ── Larga · tu contraparte exacta: tú iluminas, ella apaga ──────────────────────
   * Frases cortas y sin adorno. Nunca insulta, nunca amenaza y nunca sube la voz, porque
   * todo lo que dice ya es una amenaza en cuanto se piensa dos segundos.
   */
  larga: {
    es: {
      1: {
        asuntos: [
          [
            { a: "neutro", t: "Haces mucha luz para alguien que quiere esconderse." },
            { a: "tenso", t: "Yo te veo desde tres calles. Y no soy la única que mira." },
            { a: "neutro", t: "No te estoy avisando. Te estoy midiendo." },
          ],
          [
            { a: "neutro", t: "Lo que tú enciendes, alguien lo tiene que apagar después." },
            { a: "tenso", t: "Ése es todo mi trabajo. No es más complicado que eso." },
            { a: "neutro", t: "Y hasta ahora nunca había tenido que trabajar tan seguido." },
          ],
          [
            { a: "tenso", t: "Tienes gente. Se te nota en que vuelves a los mismos sitios." },
            { a: "neutro", t: "Yo no vuelvo a ningún sitio. Es más barato." },
            { a: "neutro", t: "Un día lo entenderás. Normalmente se entiende de golpe." },
          ],
        ],
        pregunta: "¿Qué le digo a Larga?",
        opciones: [
          { id: "honesto", label: "Preguntarle quién es", texto: "¿Tú también saliste de un cofre?", replica: "Yo salí de lo que quedó después de un cofre. No es lo mismo." },
          { id: "proteger", label: "Negarle la conversación", texto: "No tengo nada que hablar contigo.", replica: "Correcto. Hablar es de los que tienen algo que perder. Sigue así." },
          { id: "preguntar", label: "Preguntar quién le paga", texto: "¿Para quién apagas luces?", replica: "Para quien las encendió. Es lo más limpio que te voy a decir en toda tu vida." },
        ],
        repite: [{ a: "neutro", t: "Dos veces. Los que insisten se hacen previsibles." }],
      },
      2: {
        asuntos: [
          [
            { a: "tenso", t: "Me llevé el cuaderno rojo. Y ya sabes de qué cuaderno hablo." },
            { a: "neutro", t: "Dentro hay cuatro nombres. Uno es el mío, aunque no lo parezca." },
            { a: "neutro", t: "Y otro va a ser el tuyo. Eso también estaba escrito antes de que llegaras." },
          ],
          [
            { a: "neutro", t: "Te dejé en ese callejón porque me lo pidieron. No porque no pudiera acabar." },
            { a: "tenso", t: "Piénsalo despacio: hay alguien que prefiere que sigas andando." },
            { a: "neutro", t: "Y eso es peor noticia que la paliza." },
          ],
          [
            { a: "neutro", t: "Tu amigo el de la cámara vuelve a casa por la calle del río." },
            { a: "tenso", t: "Tu hermana sale a las cinco y diez. Tu madre entra a las diez." },
            { a: "neutro", t: "No voy a hacer nada con eso. Sólo te enseño lo que cuesta tener gente." },
          ],
        ],
        pregunta: "¿Qué le digo a Larga?",
        opciones: [
          { id: "honesto", label: "Nombrar lo que le hace", texto: "Estás intentando dejarme solo. Y sabes por qué funciona.", replica: "Sí. Funcionó conmigo en catorce días. Contigo llevo ya cuatro meses." },
          { id: "proteger", label: "Amenazarla", texto: "Como te acerques a ellos, te encuentro.", replica: "Ya me has encontrado. El problema nunca ha sido encontrarme." },
          { id: "preguntar", label: "Preguntar por el cuarto nombre", texto: "¿Quién es el cuarto nombre del cuaderno?", replica: "Una chica que se fue a un faro y dejó de contestar. Vete a verla. En serio: vete." },
        ],
        repite: [{ a: "tenso", t: "Ya te he dicho lo de hoy. Repetirme sería enseñarte cómo pienso." }],
      },
      3: {
        asuntos: [
          [
            { a: "roto", t: "Me llamaba Sara. Y hace ocho años que no lo digo en voz alta." },
            { a: "neutro", t: "No te lo cuento para que me perdones. Te lo cuento para que sepas qué se pierde." },
            { a: "tenso", t: "Se pierde el nombre primero. Todo lo demás va detrás y va rápido." },
          ],
          [
            { a: "neutro", t: "Sesé me dijo lo mismo que te va a decir a ti, con las mismas palabras." },
            { a: "tenso", t: "Que el poder no cabe en una vida con gente dentro. Y le creí." },
            { a: "roto", t: "Tardé ocho años en darme cuenta de que él nunca lo probó." },
          ],
          [
            { a: "decidido", t: "Voy a estar en la central. En el lado de siempre, no te hagas ilusiones." },
            { a: "neutro", t: "Pero te voy a decir dónde está el corte real, y no es donde tú crees." },
            { a: "tenso", t: "Considéralo lo único bueno que voy a hacer esta década." },
          ],
        ],
        pregunta: "¿Qué le digo a Larga?",
        opciones: [
          { id: "honesto", label: "Llamarla por su nombre", texto: "Sara. Todavía puedes salir de esto.", replica: "…No lo digas otra vez. Y ahora vete, antes de que decida que sí puedo." },
          { id: "proteger", label: "No dejarse ablandar", texto: "No me interesa tu historia.", replica: "Bien. Es la respuesta correcta. Es la que me habría salvado a mí." },
          { id: "preguntar", label: "Preguntar por el corte", texto: "¿Dónde está el corte real?", replica: "Bajo la torre de refrigeración. Y si te equivocas de línea, la que se apaga eres tú." },
        ],
        repite: [{ a: "neutro", t: "Ya no queda nada por decir hoy. Mañana tampoco, probablemente." }],
      },
    },
    en: {
      1: {
        asuntos: [
          [
            { a: "neutro", t: "You make a lot of light for someone trying to hide." },
            { a: "tenso", t: "I see you from three streets away. And I'm not the only one watching." },
            { a: "neutro", t: "I'm not warning you. I'm measuring you." },
          ],
          [
            { a: "neutro", t: "What you switch on, somebody has to switch off afterwards." },
            { a: "tenso", t: "That's my whole job. It isn't more complicated than that." },
            { a: "neutro", t: "And until now I'd never had to work this often." },
          ],
          [
            { a: "tenso", t: "You have people. It shows — you go back to the same places." },
            { a: "neutro", t: "I don't go back anywhere. It's cheaper." },
            { a: "neutro", t: "One day you'll understand. It usually happens all at once." },
          ],
        ],
        pregunta: "What do I tell Larga?",
        opciones: [
          { id: "honesto", label: "Ask who she is", texto: "Did you come out of a chest too?", replica: "I came out of what was left after one. Not the same thing." },
          { id: "proteger", label: "Refuse to engage", texto: "I've nothing to say to you.", replica: "Correct. Talking is for people with something to lose. Keep it up." },
          { id: "preguntar", label: "Ask who pays her", texto: "Who do you put lights out for?", replica: "For whoever switched them on. That's the cleanest thing I'll ever say to you." },
        ],
        repite: [{ a: "neutro", t: "Twice. People who insist become predictable." }],
      },
      2: {
        asuntos: [
          [
            { a: "tenso", t: "I took the red notebook. And you know which notebook I mean." },
            { a: "neutro", t: "There are four names in it. One is mine, whatever it looks like." },
            { a: "neutro", t: "And one is going to be yours. That was written before you arrived too." },
          ],
          [
            { a: "neutro", t: "I left you in that alley because I was told to. Not because I couldn't finish." },
            { a: "tenso", t: "Think it through slowly: somebody would rather you kept walking." },
            { a: "neutro", t: "And that's worse news than the beating." },
          ],
          [
            { a: "neutro", t: "Your friend with the camera goes home along the river road." },
            { a: "tenso", t: "Your sister comes out at ten past five. Your mother starts at ten." },
            { a: "neutro", t: "I'm not going to do anything with that. I'm showing you what having people costs." },
          ],
        ],
        pregunta: "What do I tell Larga?",
        opciones: [
          { id: "honesto", label: "Name what she's doing", texto: "You're trying to leave me alone. And you know why it works.", replica: "Yes. It worked on me in fourteen days. With you it's taken four months." },
          { id: "proteger", label: "Threaten her", texto: "Go near them and I'll find you.", replica: "You've already found me. Finding me was never the problem." },
          { id: "preguntar", label: "Ask about the fourth name", texto: "Who's the fourth name in the notebook?", replica: "A girl who went to a lighthouse and stopped answering. Go and see her. I mean it: go." },
        ],
        repite: [{ a: "tenso", t: "I've said today's. Repeating myself would show you how I think." }],
      },
      3: {
        asuntos: [
          [
            { a: "roto", t: "My name was Sara. And I haven't said it out loud in eight years." },
            { a: "neutro", t: "I'm not telling you so you'll forgive me. I'm telling you so you know what goes." },
            { a: "tenso", t: "The name goes first. Everything else follows, and follows fast." },
          ],
          [
            { a: "neutro", t: "Sesé told me exactly what he'll tell you, in the same words." },
            { a: "tenso", t: "That power doesn't fit in a life with people in it. And I believed him." },
            { a: "roto", t: "It took me eight years to notice he never tried it himself." },
          ],
          [
            { a: "decidido", t: "I'll be at the station. On the usual side — don't get sentimental." },
            { a: "neutro", t: "But I'll tell you where the real cut is, and it isn't where you think." },
            { a: "tenso", t: "Consider it the one good thing I do this decade." },
          ],
        ],
        pregunta: "What do I tell Larga?",
        opciones: [
          { id: "honesto", label: "Use her name", texto: "Sara. You can still get out of this.", replica: "…Don't say it again. Now go, before I decide that I can." },
          { id: "proteger", label: "Refuse to soften", texto: "I'm not interested in your story.", replica: "Good. That's the right answer. It's the one that would have saved me." },
          { id: "preguntar", label: "Ask about the cut", texto: "Where's the real cut?", replica: "Under the cooling tower. Get the wrong line and the one that goes out is you." },
        ],
        repite: [{ a: "neutro", t: "There's nothing left to say today. Probably not tomorrow either." }],
      },
    },
  },

  /* ── La Vigía · Noor · elegida hace nueve años, hoy sin nombre ────────────────────
   * Habla poco y en frases acabadas. No enseña técnicas: enseña un futuro. Es el final
   * «La Vigía» convertido en persona y de pie delante de ti, y el juego no lo disimula.
   */
  vigia: {
    es: {
      1: {
        asuntos: [
          [
            { a: "neutro", t: "Llevo cuatro noches siguiéndote. Hoy he dejado que me vieras." },
            { a: "tenso", t: "Eso significa que ya haces suficiente ruido como para que valga la pena." },
            { a: "neutro", t: "No es un cumplido. Es un diagnóstico." },
          ],
          [
            { a: "neutro", t: "Este faro lleva doce años apagado y sigue siendo el sitio más alto de Marés." },
            { a: "neutro", t: "Desde aquí se ve todo y no llega nada. Por eso vivo aquí." },
            { a: "tenso", t: "Tú todavía tienes una casa a la que volver. Aprovéchalo." },
          ],
          [
            { a: "decidido", t: "Levanta la guardia. No, no vas a ganar. No hace falta que ganes." },
            { a: "neutro", t: "Sólo tienes que ver cómo se pelea cuando ya no queda nada que proteger." },
            { a: "tenso", t: "Es más limpio, más rápido y no sirve para nada. Míralo bien." },
          ],
        ],
        pregunta: "¿Qué le digo a la Vigía?",
        opciones: [
          { id: "honesto", label: "Preguntarle su nombre", texto: "¿Cómo te llamas?", replica: "Ya no me llamo. Me llamaba, y de eso hace nueve años y muchas horas." },
          { id: "proteger", label: "Mantener la distancia", texto: "No he venido a que me den lecciones.", replica: "Nadie viene. Todos suben por otra cosa y todos se llevan la lección igual." },
          { id: "preguntar", label: "Preguntar por qué vive aquí", texto: "¿Por qué te quedaste en un faro?", replica: "Porque un faro avisa sin acercarse. Es lo único que me quedó que sirviera para algo." },
        ],
        repite: [{ a: "neutro", t: "Baja ya. La gente que vive aquí arriba se acostumbra, y tú no debes." }],
      },
      2: {
        asuntos: [
          [
            { a: "neutro", t: "La Luz no es para pegar. Es para que el otro deje de ver dónde estás." },
            { a: "decidido", t: "Deslumbra y muévete. Nunca deslumbres y te quedes mirando el resultado." },
            { a: "neutro", t: "Todos los que aprendieron esto conmigo se quedaron mirando la primera vez." },
          ],
          [
            { a: "roto", t: "Yo tenía dos amigas y una madre. Las tres siguen vivas." },
            { a: "neutro", t: "Ninguna sabe que estoy en esta ciudad. Eso fue idea mía y me pareció generosa." },
            { a: "tenso", t: "Fue la peor decisión que he tomado, y la tomé sola en una noche." },
          ],
          [
            { a: "neutro", t: "Hoy hay dos avisos y tú sólo puedes ir a uno." },
            { a: "tenso", t: "No hay truco. No hay una ruta que llegue a los dos. Yo la busqué durante dos años." },
            { a: "decidido", t: "Elige rápido. Lo que te va a doler no es la elección: es el rato de después." },
          ],
        ],
        pregunta: "¿Qué le digo a la Vigía?",
        opciones: [
          { id: "honesto", label: "Preguntarle cómo se sobrevive", texto: "¿Cómo se aguanta el rato de después?", replica: "Con alguien al lado. Yo no tenía a nadie, así que aprendí a aguantarlo mal." },
          { id: "proteger", label: "Endurecerse", texto: "Me acostumbraré. Como tú.", replica: "Ojalá no. De verdad que ojalá no. Es lo único que te pido en todo esto." },
          { id: "preguntar", label: "Preguntar por sus amigas", texto: "¿Nunca has vuelto a llamarlas?", replica: "Marqué el número en 2019. Colgué al segundo tono. Eso también es una respuesta." },
        ],
        repite: [{ a: "tenso", t: "Ya has subido hoy. Subir dos veces al faro es empezar a vivir en él." }],
      },
      3: {
        asuntos: [
          [
            { a: "neutro", t: "Un profesor de física preguntó por mí. Después de nueve años." },
            { a: "roto", t: "Y yo llevo nueve años convencida de que nadie preguntaba." },
            { a: "tenso", t: "Fíjate qué barato era arreglarme y qué caro me ha salido no dejar que nadie lo intentara." },
          ],
          [
            { a: "decidido", t: "Voy a bajar del faro. No por ti: por mí, que es la única razón que vale." },
            { a: "neutro", t: "Y voy a decir mi nombre en voz alta delante de alguien. A ver qué pasa." },
            { a: "neutro", t: "Se llama Noor. Ya está dicho. Ha sido más fácil de lo que pensaba." },
          ],
          [
            { a: "tenso", t: "Si eliges quedarte con la máscara, no te voy a juzgar. Yo elegí eso." },
            { a: "neutro", t: "Pero elígelo mirando a tu hermana, no mirando un tejado." },
            { a: "decidido", t: "Las decisiones que se toman en los tejados salen todas iguales. Todas." },
          ],
        ],
        pregunta: "¿Qué le digo a Noor?",
        opciones: [
          { id: "honesto", label: "Decirle su nombre", texto: "Noor. Requena lleva veinte años sin dormir por ti.", replica: "…Entonces bajo hoy. No mañana. Hoy. Gracias por la prisa." },
          { id: "proteger", label: "Dejarla en el faro", texto: "No tienes que bajar si no quieres.", replica: "No tengo que. Pero si tú puedes elegir, yo también. Es tarde y sigue siendo elegir." },
          { id: "preguntar", label: "Preguntar por su máscara", texto: "¿Tú te quitarías la máscara?", replica: "Yo no la tuve nunca. Me quedé sin cara antes de tener una máscara que quitarme." },
        ],
        repite: [{ a: "neutro", t: "Ya hemos hablado. Y hoy, por primera vez, hablar me ha cansado bien." }],
      },
    },
    en: {
      1: {
        asuntos: [
          [
            { a: "neutro", t: "I've followed you four nights. Today I let you see me." },
            { a: "tenso", t: "Which means you're making enough noise to be worth it." },
            { a: "neutro", t: "That isn't a compliment. It's a diagnosis." },
          ],
          [
            { a: "neutro", t: "This lighthouse has been dark twelve years and it's still the highest point in Marés." },
            { a: "neutro", t: "From here you see everything and nothing reaches you. That's why I live here." },
            { a: "tenso", t: "You still have a house to go back to. Use it." },
          ],
          [
            { a: "decidido", t: "Guard up. No, you won't win. You don't need to win." },
            { a: "neutro", t: "You only need to see how someone fights with nothing left to protect." },
            { a: "tenso", t: "It's cleaner, it's faster and it's good for nothing. Watch closely." },
          ],
        ],
        pregunta: "What do I tell the Vigía?",
        opciones: [
          { id: "honesto", label: "Ask her name", texto: "What are you called?", replica: "I'm not called anything now. I was, and that was nine years and a lot of hours ago." },
          { id: "proteger", label: "Refuse the lesson", texto: "I didn't come up here for a lesson.", replica: "Nobody does. Everyone climbs for something else and everyone takes the lesson anyway." },
          { id: "preguntar", label: "Ask why she stays", texto: "Why did you stay in a lighthouse?", replica: "Because a lighthouse warns without coming closer. It's the only useful thing I had left." },
        ],
        repite: [{ a: "neutro", t: "Go down now. People who live up here get used to it, and you mustn't." }],
      },
      2: {
        asuntos: [
          [
            { a: "neutro", t: "Light isn't for hitting. It's for stopping them seeing where you are." },
            { a: "decidido", t: "Blind and move. Never blind and stand watching the result." },
            { a: "neutro", t: "Everyone who learned this from me stood watching the first time." },
          ],
          [
            { a: "roto", t: "I had two friends and a mother. All three are still alive." },
            { a: "neutro", t: "None of them knows I'm in this city. That was my idea and I thought it generous." },
            { a: "tenso", t: "It was the worst decision I ever made, and I made it alone in one night." },
          ],
          [
            { a: "neutro", t: "There are two calls tonight and you can only reach one." },
            { a: "tenso", t: "There's no trick. No route reaches both. I looked for one for two years." },
            { a: "decidido", t: "Choose fast. It isn't the choice that hurts. It's the hour afterwards." },
          ],
        ],
        pregunta: "What do I tell the Vigía?",
        opciones: [
          { id: "honesto", label: "Ask how she survived", texto: "How do you get through the hour afterwards?", replica: "With someone beside you. I had nobody, so I learned to get through it badly." },
          { id: "proteger", label: "Harden up", texto: "I'll get used to it. Like you did.", replica: "I hope not. I genuinely hope not. It's the only thing I'll ask of you." },
          { id: "preguntar", label: "Ask about her friends", texto: "Have you never called them?", replica: "I dialled in 2019. Hung up on the second ring. That's an answer too." },
        ],
        repite: [{ a: "tenso", t: "You've climbed once today. Climbing twice is how you start living up here." }],
      },
      3: {
        asuntos: [
          [
            { a: "neutro", t: "A physics teacher asked after me. After nine years." },
            { a: "roto", t: "And I've spent nine years certain nobody was asking." },
            { a: "tenso", t: "Look how cheap it would have been to fix me, and what it cost to let nobody try." },
          ],
          [
            { a: "decidido", t: "I'm coming down. Not for you — for me, which is the only reason that holds." },
            { a: "neutro", t: "And I'm going to say my name out loud in front of somebody. See what happens." },
            { a: "neutro", t: "It's Noor. There. That was easier than I expected." },
          ],
          [
            { a: "tenso", t: "If you choose to keep the mask, I won't judge you. I chose that." },
            { a: "neutro", t: "But choose it looking at your sister, not looking at a rooftop." },
            { a: "decidido", t: "Decisions made on rooftops all come out the same. All of them." },
          ],
        ],
        pregunta: "What do I tell Noor?",
        opciones: [
          { id: "honesto", label: "Say her name", texto: "Noor. Requena hasn't slept in twenty years because of you.", replica: "…Then I come down today. Not tomorrow. Today. Thank you for the hurry." },
          { id: "proteger", label: "Leave her the lighthouse", texto: "You don't have to come down if you don't want to.", replica: "I don't have to. But if you get to choose, so do I. It's late and it's still choosing." },
          { id: "preguntar", label: "Ask about her own mask", texto: "Would you take the mask off?", replica: "I never had one. I lost my face before I had a mask to take off." },
        ],
        repite: [{ a: "neutro", t: "We've talked. And today, for the first time, talking tired me out in a good way." }],
      },
    },
  },

  /* ── Cero · Sesé · diseñó el proyecto y el cofre ─────────────────────────────────
   * La tesis del juego dicha por alguien que se la cree entera. Nunca levanta la voz porque
   * no le hace falta: lleva cuarenta años teniendo razón sobre gente que acabó dándosela.
   */
  cero: {
    es: {
      1: {
        asuntos: [
          [
            { a: "neutro", t: "Cuatro antes que tú. Los cuatro entraron aquí con la misma cara." },
            { a: "neutro", t: "Y los cuatro me hicieron la misma pregunta en el mismo orden." },
            { a: "tenso", t: "Empezaban por «quién eres». Los que empiezan por ahí duran menos." },
          ],
          [
            { a: "decidido", t: "Yo no te di el poder. Yo puse una llave donde tarde o temprano la cogería alguien." },
            { a: "neutro", t: "Que fueras tú es estadística. Que sigas de pie, no." },
            { a: "neutro", t: "Eso último es lo único que me interesa de ti." },
          ],
          [
            { a: "neutro", t: "Mira alrededor. Cuatro camastros y cuatro cajas con cosas de cuatro chicos." },
            { a: "tenso", t: "Ninguna de esas cajas tiene una foto de familia. Ninguna." },
            { a: "neutro", t: "No es casualidad. Es el requisito." },
          ],
        ],
        pregunta: "¿Qué le digo a Cero?",
        opciones: [
          { id: "honesto", label: "Discutirle el requisito", texto: "Yo tengo una hermana. Y no pienso guardarla en una caja.", replica: "Todos dicen eso. Uno de los cuatro lo dijo llorando. Fue el que menos duró." },
          { id: "proteger", label: "No entrar al trapo", texto: "No he venido a hablar de mí.", replica: "Nadie viene a hablar de sí mismo. Y sin embargo aquí sólo se habla de eso." },
          { id: "preguntar", label: "Preguntar por los cuatro", texto: "¿Qué les pasó a los cuatro?", replica: "A tres, lo que pasa. A la cuarta la dejé irse. Ha sido mi único error de cálculo." },
        ],
        repite: [{ a: "neutro", t: "Ya has hablado hoy. Las visitas repetidas revelan más de lo que traen." }],
      },
      2: {
        asuntos: [
          [
            { a: "neutro", t: "El poder no cabe en una vida con gente dentro. No es moral: es aritmética." },
            { a: "tenso", t: "Cada persona que sabe de ti es una superficie por la que se te puede empujar." },
            { a: "neutro", t: "Tú tienes cuatro superficies. Yo tengo cero. De ahí el nombre, por cierto." },
          ],
          [
            { a: "decidido", t: "Te propongo una cosa sencilla y horrible: déjalo." },
            { a: "neutro", t: "Devuelve la llave, vuelve a clase, y yo hago que tu expediente no llegue a cerrarse." },
            { a: "tenso", t: "Puedo hacerlo. Es lo único que puedo hacer y llevo cuarenta años pudiéndolo." },
          ],
          [
            { a: "neutro", t: "Sara me creyó a los diecisiete. Yo tenía razón y ella tenía miedo." },
            { a: "roto", t: "Y las dos cosas juntas hacen a la persona más obediente que existe." },
            { a: "tenso", t: "Contigo llevo cuatro meses y no ha funcionado. Es interesante." },
          ],
        ],
        pregunta: "¿Qué le digo a Cero?",
        opciones: [
          { id: "honesto", label: "Refutarle con nombres", texto: "Isma lo sabe. Mi madre lo sabe. Y sigo de pie. Sus cuentas están mal.", replica: "Mis cuentas nunca están mal. Lo que puede estar mal es la muestra. Sigue, me interesa." },
          { id: "proteger", label: "Dejarle terminar", texto: "Dígame qué tendría que devolver exactamente.", replica: "La llave. Y el resto se cae solo. Nunca ha hecho falta quitar nada más." },
          { id: "preguntar", label: "Preguntar por Sara", texto: "¿Sara era la del cuaderno rojo?", replica: "Sara era la que mejor entendió la aritmética. Por eso hoy no la reconoce ni su madre." },
        ],
        repite: [{ a: "tenso", t: "Segunda visita. Anotado. La insistencia también es una superficie." }],
      },
      3: {
        asuntos: [
          [
            { a: "decidido", t: "Voy a hacerte una oferta y no es un combate: nunca lo ha sido." },
            { a: "neutro", t: "Le doy tu nombre a la inspectora, o no se lo doy. Depende de si dejas el poder." },
            { a: "tenso", t: "Es limpio. Es reversible. Y es la primera vez que alguien te ofrece salir entero." },
          ],
          [
            { a: "neutro", t: "No te odio. Nunca he odiado a ninguno de los cinco." },
            { a: "tenso", t: "Odiar exige tiempo, y el tiempo hay que gastarlo en cosas que se puedan medir." },
            { a: "neutro", t: "Ésa es toda la diferencia entre tú y yo, y es más pequeña de lo que te gustaría." },
          ],
          [
            { a: "roto", t: "Yo tuve un hijo. Nadie lo sabe y no consta en ningún sitio." },
            { a: "neutro", t: "Lo aparté para protegerlo. Funcionó: está vivo y no sabe cómo me llamo." },
            { a: "tenso", t: "Eso es lo que te estoy ofreciendo. Míralo bien antes de decir que no." },
          ],
        ],
        pregunta: "¿Qué le digo a Cero?",
        opciones: [
          { id: "honesto", label: "Rechazar la aritmética", texto: "Su hijo está vivo y usted está solo. No ha protegido a nadie: se ha protegido de ellos.", replica: "…Es posible. Es la primera vez en cuarenta años que alguien lo dice en esta sala." },
          { id: "proteger", label: "Pedir tiempo", texto: "Deme una noche para pensarlo.", replica: "Una noche. Los cuatro anteriores también pidieron una noche. Es un dato muy fiable." },
          { id: "preguntar", label: "Preguntar por su hijo", texto: "¿Ha vuelto a verle alguna vez?", replica: "Dos veces. Desde la acera de enfrente. Y las dos veces me pareció una decisión excelente." },
        ],
        repite: [{ a: "neutro", t: "No hay nada nuevo hoy. Vuelve cuando tengas una respuesta o una derrota." }],
      },
    },
    en: {
      1: {
        asuntos: [
          [
            { a: "neutro", t: "Four before you. All four came in wearing that same face." },
            { a: "neutro", t: "And all four asked me the same questions in the same order." },
            { a: "tenso", t: "They began with 'who are you'. The ones who begin there last the least." },
          ],
          [
            { a: "decidido", t: "I didn't give you the power. I put a key where somebody would eventually pick it up." },
            { a: "neutro", t: "That it was you is statistics. That you're still standing isn't." },
            { a: "neutro", t: "That last part is the only thing about you that interests me." },
          ],
          [
            { a: "neutro", t: "Look around. Four cots and four boxes of four children's belongings." },
            { a: "tenso", t: "Not one of those boxes has a family photograph in it. Not one." },
            { a: "neutro", t: "That isn't chance. That's the requirement." },
          ],
        ],
        pregunta: "What do I tell Cero?",
        opciones: [
          { id: "honesto", label: "Argue with the requirement", texto: "I have a sister. And I'm not putting her in a box.", replica: "They all say that. One of the four said it crying. He lasted the least." },
          { id: "proteger", label: "Refuse the bait", texto: "I didn't come here to talk about me.", replica: "Nobody comes to talk about themselves. And yet that's all anyone talks about in here." },
          { id: "preguntar", label: "Ask about the four", texto: "What happened to the four?", replica: "To three, what happens. The fourth I let go. My only miscalculation." },
        ],
        repite: [{ a: "neutro", t: "You've spoken today. Repeat visits reveal more than they bring." }],
      },
      2: {
        asuntos: [
          [
            { a: "neutro", t: "Power doesn't fit in a life with people in it. Not morality — arithmetic." },
            { a: "tenso", t: "Every person who knows about you is a surface you can be pushed by." },
            { a: "neutro", t: "You have four surfaces. I have none. Hence the name, incidentally." },
          ],
          [
            { a: "decidido", t: "I'll put something simple and appalling to you: stop." },
            { a: "neutro", t: "Return the key, go back to school, and I'll see your file never closes." },
            { a: "tenso", t: "I can do it. It's the only thing I can do and I've been able to for forty years." },
          ],
          [
            { a: "neutro", t: "Sara believed me at seventeen. I was right and she was frightened." },
            { a: "roto", t: "Those two together make the most obedient person there is." },
            { a: "tenso", t: "With you it's been four months and it hasn't worked. That's interesting." },
          ],
        ],
        pregunta: "What do I tell Cero?",
        opciones: [
          { id: "honesto", label: "Refute him with names", texto: "Isma knows. My mother knows. And I'm still standing. Your maths is wrong.", replica: "My maths is never wrong. The sample can be. Go on — this interests me." },
          { id: "proteger", label: "Let him finish", texto: "Tell me exactly what I'd have to return.", replica: "The key. The rest falls away by itself. Nothing else has ever needed taking." },
          { id: "preguntar", label: "Ask about Sara", texto: "Was Sara the one in the red notebook?", replica: "Sara understood the arithmetic best of all. That's why her own mother wouldn't know her now." },
        ],
        repite: [{ a: "tenso", t: "Second visit. Noted. Insistence is a surface too." }],
      },
      3: {
        asuntos: [
          [
            { a: "decidido", t: "I'm going to make you an offer, and it isn't a fight. It never was." },
            { a: "neutro", t: "I give the inspector your name, or I don't. It depends on whether you give up the power." },
            { a: "tenso", t: "It's clean. It's reversible. And it's the first time anyone has offered you a whole life." },
          ],
          [
            { a: "neutro", t: "I don't hate you. I never hated any of the five." },
            { a: "tenso", t: "Hatred takes time, and time should be spent on measurable things." },
            { a: "neutro", t: "That's the entire difference between us, and it's smaller than you'd like." },
          ],
          [
            { a: "roto", t: "I had a son. Nobody knows and it's on no record anywhere." },
            { a: "neutro", t: "I put him away to protect him. It worked: he's alive and doesn't know my name." },
            { a: "tenso", t: "That's what I'm offering you. Look at it properly before you say no." },
          ],
        ],
        pregunta: "What do I tell Cero?",
        opciones: [
          { id: "honesto", label: "Refuse the arithmetic", texto: "Your son is alive and you're alone. You didn't protect anyone. You protected yourself from them.", replica: "…Possibly. That's the first time in forty years anyone has said it in this room." },
          { id: "proteger", label: "Ask for time", texto: "Give me one night to think.", replica: "One night. The previous four asked for one night too. It's a very reliable data point." },
          { id: "preguntar", label: "Ask about his son", texto: "Have you ever seen him again?", replica: "Twice. From the opposite pavement. Both times it struck me as an excellent decision." },
        ],
        repite: [{ a: "neutro", t: "Nothing new today. Come back with an answer or a defeat." }],
      },
    },
  },
};
