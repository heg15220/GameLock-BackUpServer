/**
 * FULGOR — las voces de la ciudad que decide qué eres.
 *
 * Los cuatro adultos con poder real sobre el expediente: la que investiga, la que publica,
 * el que quiere comprarlo y la que se arrepintió de haberlo diseñado. Ninguno de los cuatro
 * es un villano de tebeo y ninguno grita nunca: aquí el peligro se mide en cuánta razón
 * tiene el que habla.
 */

export const CIUDAD = {

  /* ── Inspectora Elena Sabater · Unidad de Análisis · no es mala, es buena ────────
   * Registro policial civil: nada de amenazas, todo de procedimiento. Da miedo porque cada
   * frase suya es razonable, y porque siempre te está dando una oportunidad de mentirle mejor.
   */
  sabater: {
    es: {
      1: {
        asuntos: [
          [
            { a: "neutro", t: "Buenas tardes. No te asustes, esto no es una diligencia." },
            { a: "neutro", t: "Estoy hablando con chicos de tu instituto. Con muchos, no sólo contigo." },
            { a: "tenso", t: "Aunque contigo llevo dos conversaciones y con los demás, una." },
          ],
          [
            { a: "neutro", t: "Yo no busco a un culpable. Busco un patrón, que es distinto y más lento." },
            { a: "neutro", t: "Un culpable tiene cara. Un patrón tiene horarios." },
            { a: "tenso", t: "Y los horarios son la única cosa que a la gente se le olvida cambiar." },
          ],
          [
            { a: "neutro", t: "¿Te importa si te hago una pregunta tonta? Son las que mejor funcionan." },
            { a: "neutro", t: "¿Tú a qué hora sueles llegar a casa entre semana?" },
            { a: "tenso", t: "No hace falta que me contestes. Fíjate en cuánto has tardado en no contestarme." },
          ],
        ],
        pregunta: "¿Qué le digo a la inspectora?",
        opciones: [
          { id: "honesto", label: "Contestar con una verdad inútil", texto: "Sobre las nueve. A veces más tarde, según el día.", replica: "Perfecto. Eso es una respuesta útil y verdadera. Es raro tenerlas juntas." },
          { id: "proteger", label: "Cortar la conversación", texto: "Tengo que irme. Mi madre me espera.", replica: "Claro. Tu madre trabaja de noche, así que te espera poco. Ve con cuidado." },
          { id: "preguntar", label: "Preguntarle qué busca", texto: "¿Y qué patrón ha encontrado hasta ahora?", replica: "Uno bueno. Y acabas de hacerme la pregunta que hacen los que están dentro del patrón." },
        ],
        repite: [{ a: "neutro", t: "Ya hemos hablado hoy. Insistir yo sería acoso y insistir tú sería un dato." }],
      },
      2: {
        asuntos: [
          [
            { a: "neutro", t: "Tengo dieciséis incidentes y un mapa. El mapa es lo interesante." },
            { a: "tenso", t: "Porque nadie va a dieciséis sitios distintos. La gente va a los suyos." },
            { a: "neutro", t: "Y los dieciséis caben dentro de la vida diaria de una persona de quince años." },
          ],
          [
            { a: "neutro", t: "Voy a decirte una cosa y quiero que la oigas bien, sin miedo." },
            { a: "neutro", t: "Si un día quien sea quisiera dejar de hacer esto, hay maneras." },
            { a: "tenso", t: "Malas, todas. Pero las hay. Y algunas dejan a la familia fuera." },
          ],
          [
            { a: "tenso", t: "Ayer se me fue por dos minutos. Dos." },
            { a: "neutro", t: "Y no me molesta perder. Me molesta lo cerca que estuve de no perder." },
            { a: "neutro", t: "Duermo bien igual. Ésa es la parte que la gente no entiende de mi trabajo." },
          ],
        ],
        pregunta: "¿Qué le digo a la inspectora?",
        opciones: [
          { id: "honesto", label: "Preguntar por esas maneras", texto: "Esas maneras que dice. ¿De verdad dejan a la familia fuera?", replica: "Algunas. Y acabas de hacer una pregunta muy concreta, muchacho. Gracias." },
          { id: "proteger", label: "Fingir desinterés", texto: "No sé por qué me cuenta esto a mí.", replica: "Porque estabas escuchando. La gente que no tiene nada que ver deja de escuchar antes." },
          { id: "preguntar", label: "Preguntar por el mapa", texto: "¿Y el mapa a quién señala?", replica: "Todavía a nadie. Señala a un radio de novecientos metros. Vivo de estrechar radios." },
        ],
        repite: [{ a: "neutro", t: "Dos veces en un día. Lo apunto, pero no lo uso. Todavía." }],
      },
      3: {
        asuntos: [
          [
            { a: "tenso", t: "El expediente está casi cerrado. Lo sabes tú y lo sé yo." },
            { a: "neutro", t: "Y ninguno de los dos ha dicho de qué expediente estamos hablando." },
            { a: "neutro", t: "Fíjate qué conversación tan educada estamos teniendo." },
          ],
          [
            { a: "neutro", t: "La noche del apagón yo estaba en la calle, como todo el mundo." },
            { a: "roto", t: "Y vi a alguien sostener un quirófano con las manos ocho horas." },
            { a: "tenso", t: "Eso no cambia mi trabajo. Cambia cómo duermo después de hacerlo." },
          ],
          [
            { a: "neutro", t: "Te voy a dar una cosa que no debería darte: una fecha." },
            { a: "tenso", t: "El viernes elevo el informe. A partir del viernes ya no lo llevo yo." },
            { a: "neutro", t: "Y quien lo lleve después no habrá visto lo del quirófano." },
          ],
        ],
        pregunta: "¿Qué le digo a la inspectora?",
        opciones: [
          { id: "honesto", label: "Preguntar por qué le avisa", texto: "¿Por qué me está dando esa fecha?", replica: "Porque hago bien mi trabajo y ésta es la parte del trabajo que no está en el manual." },
          { id: "proteger", label: "Fingir hasta el final", texto: "Sigo sin saber de qué me habla.", replica: "Perfecto. Sigue sin saberlo hasta el viernes. Después, ya da igual." },
          { id: "preguntar", label: "Pedirle un consejo", texto: "Si estuviera en mi sitio, ¿qué haría?", replica: "Elegir a una persona y contárselo entero. Sola no se sostiene ninguna vida doble." },
        ],
        repite: [{ a: "neutro", t: "Ya está todo dicho. Y lo dicho hoy no consta en ningún sitio." }],
      },
    },
    en: {
      1: {
        asuntos: [
          [
            { a: "neutro", t: "Good afternoon. Don't be alarmed, this isn't a formal interview." },
            { a: "neutro", t: "I'm speaking to pupils from your school. A lot of them, not only you." },
            { a: "tenso", t: "Although with you this is the second conversation, and with the others it's the first." },
          ],
          [
            { a: "neutro", t: "I'm not looking for a culprit. I'm looking for a pattern, which is slower." },
            { a: "neutro", t: "A culprit has a face. A pattern has a timetable." },
            { a: "tenso", t: "And a timetable is the one thing people forget to change." },
          ],
          [
            { a: "neutro", t: "Do you mind a silly question? They work best." },
            { a: "neutro", t: "What time do you usually get home on a weekday?" },
            { a: "tenso", t: "You needn't answer. Just notice how long it took you not to." },
          ],
        ],
        pregunta: "What do I tell the inspector?",
        opciones: [
          { id: "honesto", label: "Answer with a useless truth", texto: "Around nine. Later some days, it depends.", replica: "Good. That's useful and true. It's rare to get both at once." },
          { id: "proteger", label: "End the conversation", texto: "I have to go. My mother's expecting me.", replica: "Of course. Your mother works nights, so she isn't expecting you long. Mind how you go." },
          { id: "preguntar", label: "Ask what she's looking for", texto: "What pattern have you found so far?", replica: "A good one. And you've just asked me the question people inside the pattern ask." },
        ],
        repite: [{ a: "neutro", t: "We've spoken today. My insisting would be harassment; yours would be data." }],
      },
      2: {
        asuntos: [
          [
            { a: "neutro", t: "I have sixteen incidents and a map. The map is the interesting part." },
            { a: "tenso", t: "Because nobody goes to sixteen different places. People go to their own." },
            { a: "neutro", t: "And all sixteen fit inside the daily life of a fifteen-year-old." },
          ],
          [
            { a: "neutro", t: "I'm going to say something and I want you to hear it without panicking." },
            { a: "neutro", t: "If whoever it is ever wanted to stop doing this, there are ways." },
            { a: "tenso", t: "Bad ones, all of them. But they exist. And some leave the family out of it." },
          ],
          [
            { a: "tenso", t: "Yesterday he got away from me by two minutes. Two." },
            { a: "neutro", t: "I don't mind losing. I mind how close I came to not losing." },
            { a: "neutro", t: "I sleep fine either way. That's the part people don't understand about the job." },
          ],
        ],
        pregunta: "What do I tell the inspector?",
        opciones: [
          { id: "honesto", label: "Ask about those ways", texto: "Those ways you mentioned. Do they really leave the family out?", replica: "Some do. And you've just asked a very specific question, young man. Thank you." },
          { id: "proteger", label: "Feign disinterest", texto: "I don't know why you're telling me this.", replica: "Because you were listening. People with nothing to do with it stop listening sooner." },
          { id: "preguntar", label: "Ask about the map", texto: "Who does the map point at?", replica: "Nobody yet. It points at a nine-hundred-metre radius. Narrowing radii is my living." },
        ],
        repite: [{ a: "neutro", t: "Twice in one day. I'll note it. I won't use it. Yet." }],
      },
      3: {
        asuntos: [
          [
            { a: "tenso", t: "The file is nearly closed. You know it and I know it." },
            { a: "neutro", t: "And neither of us has said which file we're discussing." },
            { a: "neutro", t: "What a beautifully polite conversation this is." },
          ],
          [
            { a: "neutro", t: "The night of the blackout I was out on the street, like everyone." },
            { a: "roto", t: "And I watched somebody hold an operating theatre up with his hands for eight hours." },
            { a: "tenso", t: "That doesn't change my job. It changes how I sleep afterwards." },
          ],
          [
            { a: "neutro", t: "I'm going to give you something I shouldn't: a date." },
            { a: "tenso", t: "Friday I file the report. After Friday it isn't mine." },
            { a: "neutro", t: "And whoever gets it next didn't see the operating theatre." },
          ],
        ],
        pregunta: "What do I tell the inspector?",
        opciones: [
          { id: "honesto", label: "Ask why she's warning him", texto: "Why are you giving me that date?", replica: "Because I'm good at my job, and this is the part of the job that isn't in the manual." },
          { id: "proteger", label: "Keep the mask on", texto: "I still don't know what you're talking about.", replica: "Perfect. Go on not knowing until Friday. After that it won't matter." },
          { id: "preguntar", label: "Ask her for advice", texto: "If you were me, what would you do?", replica: "Pick one person and tell them everything. No double life holds up alone." },
        ],
        repite: [{ a: "neutro", t: "It's all been said. And what was said today is on no record anywhere." }],
      },
    },
  },

  /* ── Marga Ossorio · El Faro de Marés · publicar te sube el Rango y te sube el cerco ─
   * Habla en titulares y en plazos. No es cínica por gusto: es cínica porque cierra a las
   * once y porque sabe que la versión que no escriba ella la va a escribir alguien peor.
   */
  marga: {
    es: {
      1: {
        asuntos: [
          [
            { a: "tenso", t: "Chaval. ¿Tú estabas en la plaza el martes por la noche?" },
            { a: "neutro", t: "Es que tengo quince testigos y ninguno se pone de acuerdo en la hora." },
            { a: "neutro", t: "Quince versiones distintas es la firma de algo que pasó de verdad." },
          ],
          [
            { a: "neutro", t: "Yo llevo dieciocho años escribiendo lo que pasa en esta ciudad." },
            { a: "tenso", t: "Y en dieciocho años nunca había tenido que preguntarle la hora a quince personas." },
            { a: "neutro", t: "Así que o mienten todos, o hay algo que no mide el tiempo como nosotros." },
          ],
          [
            { a: "neutro", t: "No te pido tu nombre. Te pido un detalle. Un detalle no compromete a nadie." },
            { a: "tenso", t: "Un detalle es lo que separa una crónica de un rumor." },
            { a: "neutro", t: "Y los rumores hacen más daño, chaval. Ésa es la parte que nadie se cree." },
          ],
        ],
        pregunta: "¿Qué le digo a la periodista?",
        opciones: [
          { id: "honesto", label: "Darle un detalle pequeño", texto: "Había olor a ozono. Como después de una tormenta.", replica: "Ozono. Anda. Eso no me lo ha dicho ninguno de los quince. Gracias, chaval." },
          { id: "proteger", label: "No darle nada", texto: "Yo no estaba en la plaza. Lo siento.", replica: "Vale. Pues eso también lo apunto: uno que no estaba y que sabe de qué martes hablo." },
          { id: "preguntar", label: "Preguntar qué va a escribir", texto: "¿Y qué va a publicar mañana?", replica: "Lo que tenga a las once. Si a las once no tengo nada bueno, publico lo mediocre. Es un oficio, no una misa." },
        ],
        repite: [{ a: "neutro", t: "Ya te he sacado lo que ibas a darme. Circula, anda." }],
      },
      2: {
        asuntos: [
          [
            { a: "decidido", t: "Te propongo un trato, y te lo propongo bien: yo controlo el relato." },
            { a: "neutro", t: "Tú me das una cosa que nadie tenga. Yo escribo la versión que te conviene." },
            { a: "tenso", t: "Y si no aceptas, escribo igual. Sólo que peor y sin ti dentro." },
          ],
          [
            { a: "neutro", t: "Le he puesto nombre. Y sí, lo he hecho a propósito." },
            { a: "tenso", t: "Un nombre protege más que un anonimato, aunque no lo parezca." },
            { a: "neutro", t: "A lo que no tiene nombre le puede pasar cualquier cosa y no lo cuenta nadie." },
          ],
          [
            { a: "tenso", t: "Mi jefe quiere fotos. Y a mí las fotos me dan pánico." },
            { a: "neutro", t: "Un texto lo escribo yo. Una foto la usa cualquiera para lo que quiera." },
            { a: "neutro", t: "Así que llevo tres semanas retrasando una foto. Por si te sirve de algo." },
          ],
        ],
        pregunta: "¿Qué le digo a la periodista?",
        opciones: [
          { id: "honesto", label: "Aceptar el trato", texto: "Trato. Pero yo elijo qué le doy y usted publica lo que le doy.", replica: "Eso no es un trato, es un dictado. …Vale. Acepto el dictado. Empieza." },
          { id: "proteger", label: "Rechazarlo", texto: "No hay trato. Escriba lo que quiera.", replica: "Escribiré lo que pueda, que es peor. Y algún día vendrás a pedirme que rectifique." },
          { id: "preguntar", label: "Preguntar por el nombre", texto: "¿Por qué ese nombre y no otro?", replica: "Porque lo dijo un testigo llorando. Y lo que se dice llorando se queda. Es todo el secreto." },
        ],
        repite: [{ a: "tenso", t: "Estoy a cierre. A cierre no se conversa, se teclea." }],
      },
      3: {
        asuntos: [
          [
            { a: "roto", t: "He tenido que elegir entre una exclusiva y una persona. Y he elegido mal dos veces." },
            { a: "neutro", t: "La tercera vez elegí bien y me costó la portada." },
            { a: "tenso", t: "Así que ahora escribo en la página once y duermo. Es un cambio razonable." },
          ],
          [
            { a: "decidido", t: "Tengo la carta de un profesor de física. Tres folios y veinte años." },
            { a: "neutro", t: "La publico el día que tú me digas, ni antes ni después." },
            { a: "tenso", t: "Y ese día se le acaba la ciudad a mucha gente. Elige bien el día." },
          ],
          [
            { a: "neutro", t: "Si te desenmascaras, hay dos titulares posibles y sólo uno te salva." },
            { a: "tenso", t: "«Un chaval de quince años» o «un menor sin control». Es la misma noticia." },
            { a: "neutro", t: "Y quién la escriba primero decide cuál de las dos es verdad. Eso hago yo." },
          ],
        ],
        pregunta: "¿Qué le digo a la periodista?",
        opciones: [
          { id: "honesto", label: "Confiarle el día", texto: "Cuando llegue el momento, se lo digo yo. Y usted publica esa misma noche.", replica: "Hecho. Y voy a escribirlo bien, chaval. Por una vez voy a escribir algo bien." },
          { id: "proteger", label: "Retirar la carta", texto: "No publique esa carta. Nunca.", replica: "Vale. La quemo delante de ti si quieres. Pero se está quemando un hombre que quería arder." },
          { id: "preguntar", label: "Preguntar por las dos veces", texto: "Las dos veces que eligió mal. ¿Qué pasó?", replica: "Una se mudó de ciudad y otro no llegó a mudarse. No hay más versión que ésa." },
        ],
        repite: [{ a: "neutro", t: "Ya te he dado lo que tenía. Vete antes de que me arrepienta." }],
      },
    },
    en: {
      1: {
        asuntos: [
          [
            { a: "tenso", t: "Kid. Were you on the plaza Tuesday night?" },
            { a: "neutro", t: "Because I've got fifteen witnesses and not one agrees on the time." },
            { a: "neutro", t: "Fifteen different versions is the signature of something that actually happened." },
          ],
          [
            { a: "neutro", t: "Eighteen years I've been writing what happens in this city." },
            { a: "tenso", t: "And in eighteen years I've never had to ask fifteen people what time it was." },
            { a: "neutro", t: "So either they're all lying, or something out there doesn't keep time like we do." },
          ],
          [
            { a: "neutro", t: "I'm not asking your name. I'm asking for a detail. A detail compromises nobody." },
            { a: "tenso", t: "A detail is what separates a report from a rumour." },
            { a: "neutro", t: "And rumours do more damage, kid. That's the bit nobody believes." },
          ],
        ],
        pregunta: "What do I tell the journalist?",
        opciones: [
          { id: "honesto", label: "Give her one small detail", texto: "There was a smell of ozone. Like after a storm.", replica: "Ozone. Well now. None of the fifteen gave me that. Thanks, kid." },
          { id: "proteger", label: "Give her nothing", texto: "I wasn't on the plaza. Sorry.", replica: "Fine. I'll note that too: one who wasn't there and knows which Tuesday I mean." },
          { id: "preguntar", label: "Ask what she'll print", texto: "What are you running tomorrow?", replica: "Whatever I've got by eleven. If eleven comes and it's thin, I print thin. It's a trade, not a mass." },
        ],
        repite: [{ a: "neutro", t: "I've had what you were going to give me. Move along." }],
      },
      2: {
        asuntos: [
          [
            { a: "decidido", t: "I'm offering you a deal, and offering it straight: I control the story." },
            { a: "neutro", t: "You give me something nobody else has. I write the version that suits you." },
            { a: "tenso", t: "And if you say no, I write anyway. Only worse, and without you in it." },
          ],
          [
            { a: "neutro", t: "I gave him a name. And yes, I did it on purpose." },
            { a: "tenso", t: "A name protects better than anonymity, whatever it looks like." },
            { a: "neutro", t: "Anything can happen to a thing with no name, and nobody reports it." },
          ],
          [
            { a: "tenso", t: "My editor wants photographs. Photographs terrify me." },
            { a: "neutro", t: "I write the text. A photograph is used by anyone for anything." },
            { a: "neutro", t: "So I've been stalling a photograph for three weeks. In case that's worth something to you." },
          ],
        ],
        pregunta: "What do I tell the journalist?",
        opciones: [
          { id: "honesto", label: "Take the deal", texto: "Deal. But I choose what I give you, and you print what I give.", replica: "That's not a deal, that's dictation. …Fine. I accept the dictation. Start talking." },
          { id: "proteger", label: "Turn it down", texto: "No deal. Write what you like.", replica: "I'll write what I can, which is worse. And one day you'll come asking me to correct it." },
          { id: "preguntar", label: "Ask about the name", texto: "Why that name and not another?", replica: "Because a witness said it in tears. What's said in tears sticks. That's the whole secret." },
        ],
        repite: [{ a: "tenso", t: "I'm on deadline. On deadline you don't converse, you type." }],
      },
      3: {
        asuntos: [
          [
            { a: "roto", t: "I've had to choose between an exclusive and a person. Twice I chose wrong." },
            { a: "neutro", t: "The third time I chose right and it cost me the front page." },
            { a: "tenso", t: "So now I write on page eleven and I sleep. Reasonable trade." },
          ],
          [
            { a: "decidido", t: "I've got a letter from a physics teacher. Three pages and twenty years." },
            { a: "neutro", t: "I run it the day you say. Not before, not after." },
            { a: "tenso", t: "And that day the city ends for a lot of people. Choose the day carefully." },
          ],
          [
            { a: "neutro", t: "If you unmask, there are two possible headlines and only one saves you." },
            { a: "tenso", t: "'A fifteen-year-old boy' or 'an uncontrolled minor'. Same story." },
            { a: "neutro", t: "Whoever writes it first decides which one is true. That's my job." },
          ],
        ],
        pregunta: "What do I tell the journalist?",
        opciones: [
          { id: "honesto", label: "Trust her with the day", texto: "When the moment comes I'll tell you. And you run it that same night.", replica: "Done. And I'm going to write it well, kid. For once I'm going to write something well." },
          { id: "proteger", label: "Pull the letter", texto: "Don't print that letter. Ever.", replica: "Fine. I'll burn it in front of you. But you're burning a man who wanted to burn." },
          { id: "preguntar", label: "Ask about the two times", texto: "The two times you chose wrong. What happened?", replica: "One moved city and one never got to move. There's no other version." },
        ],
        repite: [{ a: "neutro", t: "I've given you what I had. Go, before I change my mind." }],
      },
    },
  },

  /* ── Ezequiel Reig · presidente de Eléctrica Marés · no quiere matarte, quiere patentarte ─
   * El vocabulario entero es de propiedad y de cuidado. Nunca amenaza: ofrece. Y lo que
   * ofrece siempre es exactamente lo que a Dani le falta, que es de lo que va el personaje.
   */
  ezequiel: {
    es: {
      1: {
        asuntos: [
          [
            { a: "neutro", t: "Tú eres compañero de mi hija, ¿verdad? Julia me habla de la clase." },
            { a: "decidido", t: "Poco, la verdad. Pero cuando habla, habla bien de alguien y suele ser el mismo." },
            { a: "neutro", t: "Encantado, en cualquier caso. Esta ciudad es más pequeña de lo que parece." },
          ],
          [
            { a: "neutro", t: "Mi abuelo levantó la primera línea de Marés con ochenta hombres y ninguna licencia." },
            { a: "decidido", t: "Yo he heredado la línea. La ciudad viene incluida, aunque nadie lo firmara." },
            { a: "neutro", t: "No lo digo con soberbia. Lo digo como quien enseña una escritura." },
          ],
          [
            { a: "tenso", t: "Hay una cosa en el Polígono Norte que lleva veinte años sin inventariar." },
            { a: "neutro", t: "Y yo tengo un problema con las cosas que son mías y no están inventariadas." },
            { a: "neutro", t: "Es casi un defecto de carácter. Mi mujer opinaba lo mismo." },
          ],
        ],
        pregunta: "¿Qué le digo a Reig?",
        opciones: [
          { id: "honesto", label: "Mirarle a la cara", texto: "No todo lo que está en Marés es suyo, señor Reig.", replica: "Qué frase tan buena. Anótala, en veinte años la vas a necesitar en una junta." },
          { id: "proteger", label: "Ser educado y vacío", texto: "Encantado. Julia es muy buena en física.", replica: "Lo es. Y muy buena guardando cosas, que se hereda antes que la física." },
          { id: "preguntar", label: "Preguntar qué hay en el Polígono", texto: "¿Qué es eso que no está inventariado?", replica: "Un activo. Y ahora mismo, mirándote, me parece un activo mucho más interesante." },
        ],
        repite: [{ a: "neutro", t: "Ya nos hemos presentado. Y yo me presento una sola vez." }],
      },
      2: {
        asuntos: [
          [
            { a: "decidido", t: "Te voy a hablar como si fueras un adulto, porque llevas un mes portándote como uno." },
            { a: "neutro", t: "Lo que tú tienes no es un don. Es un prototipo con un chico dentro." },
            { a: "neutro", t: "Y los prototipos, sin mantenimiento, fallan. Siempre. Pregúntale a tu padre." },
          ],
          [
            { a: "neutro", t: "Imagina que dejas de esconderte. Sin policía, sin prensa, sin miedo." },
            { a: "decidido", t: "Contrato, seguro médico, laboratorio propio y tu apellido en la puerta." },
            { a: "tenso", t: "Y una cláusula. Siempre hay una cláusula, no te voy a insultar fingiendo que no." },
          ],
          [
            { a: "neutro", t: "Tu madre trabaja en el Hospital del Puerto. Turno de noche, dos guardias por semana." },
            { a: "neutro", t: "No es una amenaza. Es que sé quién trabaja en mis hospitales." },
            { a: "tenso", t: "Y es un hospital que sostengo yo, aunque en la fachada ponga otra cosa." },
          ],
        ],
        pregunta: "¿Qué le digo a Reig?",
        opciones: [
          { id: "honesto", label: "Nombrar la amenaza", texto: "Acaba de nombrar a mi madre. Diga lo que diga, eso es lo que ha hecho.", replica: "Es verdad. Y me alegro de que lo veas: prefiero negociar con alguien que ve." },
          { id: "proteger", label: "Escuchar la oferta", texto: "Dígame la cláusula.", replica: "Cesión de resultados. Todo lo que salga de ti, sale mío. Es lo normal, hijo." },
          { id: "preguntar", label: "Preguntar por mi padre", texto: "¿Qué tiene que ver mi padre con esto?", replica: "Que firmó. Hace veinte años y por muy poco dinero. Los Vela tenéis firma fácil." },
        ],
        repite: [{ a: "neutro", t: "Mi oferta sigue en pie y mi agenda no. Buenas tardes." }],
      },
      3: {
        asuntos: [
          [
            { a: "tenso", t: "He reactivado la central. Sí, la de las Tolvas. Está en mi derecho." },
            { a: "neutro", t: "Marés lleva cuarenta años consumiendo más de lo que produce." },
            { a: "decidido", t: "Alguien tiene que encender algo. Y sólo hay una persona con la llave." },
          ],
          [
            { a: "roto", t: "Mi hija ha dejado de hablarme. Directamente." },
            { a: "neutro", t: "Y ha dejado de hablarme por ti, lo cual me parece razonable y me duele igual." },
            { a: "tenso", t: "No te pido nada. Te informo de que ahora tengo menos que perder." },
          ],
          [
            { a: "decidido", t: "Última oferta, y ésta no lleva cláusula: quítate la máscara conmigo delante." },
            { a: "neutro", t: "Yo te pongo abogados, prensa y una historia que la ciudad se pueda tragar." },
            { a: "tenso", t: "Y a cambio, dentro de diez años, el nombre de mi familia estará en tu biografía." },
          ],
        ],
        pregunta: "¿Qué le digo a Reig?",
        opciones: [
          { id: "honesto", label: "Rechazarlo entero", texto: "Mi biografía no está en venta. Y su central se apaga esta noche.", replica: "Qué pena. De verdad que qué pena. Eras el mejor activo que ha tenido esta ciudad." },
          { id: "proteger", label: "Ganar tiempo", texto: "Deme hasta el viernes.", replica: "Hasta el viernes. Y no porque me lo pidas: porque el viernes ya no vas a poder elegir." },
          { id: "preguntar", label: "Preguntar por Julia", texto: "¿Ha probado a llamarla usted?", replica: "…No. No se me había ocurrido que eso fuera una opción disponible. Vete, anda." },
        ],
        repite: [{ a: "neutro", t: "Hemos hablado. Y yo, contigo, ya he hablado bastante." }],
      },
    },
    en: {
      1: {
        asuntos: [
          [
            { a: "neutro", t: "You're in my daughter's class, aren't you? Julia mentions the year group." },
            { a: "decidido", t: "Rarely, I'll admit. But when she speaks well of someone it tends to be the same boy." },
            { a: "neutro", t: "A pleasure, in any case. This city is smaller than it looks." },
          ],
          [
            { a: "neutro", t: "My grandfather put up the first line in Marés with eighty men and no permit." },
            { a: "decidido", t: "I inherited the line. The city came with it, though nobody signed for that." },
            { a: "neutro", t: "I don't say it arrogantly. I say it the way one shows a deed." },
          ],
          [
            { a: "tenso", t: "There's something in the Polígono Norte that's gone twenty years uninventoried." },
            { a: "neutro", t: "And I have a problem with things that are mine and unaccounted for." },
            { a: "neutro", t: "It's nearly a character flaw. My wife held the same view." },
          ],
        ],
        pregunta: "What do I tell Reig?",
        opciones: [
          { id: "honesto", label: "Meet his eye", texto: "Not everything in Marés is yours, Mr Reig.", replica: "What an excellent line. Write it down — in twenty years you'll need it in a boardroom." },
          { id: "proteger", label: "Be polite and empty", texto: "Nice to meet you. Julia's very good at physics.", replica: "She is. And very good at keeping things, which is inherited sooner than physics." },
          { id: "preguntar", label: "Ask what's in the Polígono", texto: "What is it that's uninventoried?", replica: "An asset. And right now, looking at you, a far more interesting asset." },
        ],
        repite: [{ a: "neutro", t: "We've been introduced. And I introduce myself only once." }],
      },
      2: {
        asuntos: [
          [
            { a: "decidido", t: "I'll speak to you as an adult, since you've spent a month behaving like one." },
            { a: "neutro", t: "What you have isn't a gift. It's a prototype with a boy inside it." },
            { a: "neutro", t: "And prototypes without maintenance fail. Always. Ask your father." },
          ],
          [
            { a: "neutro", t: "Imagine you stopped hiding. No police, no press, no fear." },
            { a: "decidido", t: "Contract, medical cover, your own laboratory and your surname on the door." },
            { a: "tenso", t: "And a clause. There's always a clause — I won't insult you by pretending otherwise." },
          ],
          [
            { a: "neutro", t: "Your mother works at the Hospital del Puerto. Nights, two on-calls a week." },
            { a: "neutro", t: "That isn't a threat. I simply know who works in my hospitals." },
            { a: "tenso", t: "And that one I keep standing, whatever the sign on the front says." },
          ],
        ],
        pregunta: "What do I tell Reig?",
        opciones: [
          { id: "honesto", label: "Name the threat", texto: "You just named my mother. Whatever you call it, that's what you did.", replica: "True. And I'm glad you saw it. I'd rather negotiate with someone who sees." },
          { id: "proteger", label: "Hear the offer out", texto: "Tell me the clause.", replica: "Assignment of results. Whatever comes out of you comes out mine. It's standard, son." },
          { id: "preguntar", label: "Ask about my father", texto: "What has my father got to do with this?", replica: "He signed. Twenty years ago, for very little money. You Velas sign easily." },
        ],
        repite: [{ a: "neutro", t: "My offer stands. My diary doesn't. Good afternoon." }],
      },
      3: {
        asuntos: [
          [
            { a: "tenso", t: "I've restarted the station. Yes, the one at Las Tolvas. I'm within my rights." },
            { a: "neutro", t: "Marés has consumed more than it produces for forty years." },
            { a: "decidido", t: "Somebody has to switch something on. And only one person holds the key." },
          ],
          [
            { a: "roto", t: "My daughter has stopped speaking to me. Entirely." },
            { a: "neutro", t: "And she stopped because of you, which strikes me as reasonable and hurts the same." },
            { a: "tenso", t: "I'm not asking you for anything. I'm informing you I have less to lose." },
          ],
          [
            { a: "decidido", t: "Final offer, and no clause on this one: take the mask off with me standing there." },
            { a: "neutro", t: "I give you lawyers, press, and a story the city can swallow." },
            { a: "tenso", t: "And in ten years my family's name is in your biography." },
          ],
        ],
        pregunta: "What do I tell Reig?",
        opciones: [
          { id: "honesto", label: "Refuse all of it", texto: "My biography isn't for sale. And your station goes dark tonight.", replica: "What a shame. Genuinely, what a shame. You were the best asset this city ever had." },
          { id: "proteger", label: "Buy time", texto: "Give me until Friday.", replica: "Until Friday. And not because you asked: because by Friday you won't get to choose." },
          { id: "preguntar", label: "Ask about Julia", texto: "Have you tried calling her yourself?", replica: "…No. It hadn't occurred to me that was an available option. Off you go." },
        ],
        repite: [{ a: "neutro", t: "We've spoken. And with you, I've spoken quite enough." }],
      },
    },
  },

  /* ── Dra. Iria Lem · investigadora arrepentida · tu fuente dentro de la empresa ───
   * Habla en condicionales y en unidades. Su arrepentimiento no es dramático: es
   * administrativo, que es como se arrepiente de verdad la gente que firmó papeles.
   */
  iria: {
    es: {
      1: {
        asuntos: [
          [
            { a: "neutro", t: "No debería estar hablando contigo en un sitio con cámaras. Camina y no me mires." },
            { a: "tenso", t: "Yo trabajé en el proyecto. No en la parte bonita: en la de después." },
            { a: "neutro", t: "La parte de después es la que mide qué le pasa al sujeto. Ahí estaba yo." },
          ],
          [
            { a: "neutro", t: "¿Cuánto duermes? Contéstame en horas, no en «bien» o «mal»." },
            { a: "tenso", t: "Menos de cinco es el primer indicador. Siempre es el primero." },
            { a: "neutro", t: "El segundo son las manos. Del tercero prefiero no hablar hoy." },
          ],
          [
            { a: "roto", t: "Firmé una autorización para un ensayo con cuatro menores." },
            { a: "neutro", t: "Y me convencí de que era un ensayo porque en el papel ponía «ensayo»." },
            { a: "tenso", t: "Se puede firmar cualquier cosa si el formulario está bien maquetado." },
          ],
        ],
        pregunta: "¿Qué le digo a la doctora?",
        opciones: [
          { id: "honesto", label: "Contestarle en horas", texto: "Cuatro. Cuatro y media los días buenos.", replica: "Gracias por el número. Toma esto: es magnesio y no es un milagro, pero suma." },
          { id: "proteger", label: "No darle datos", texto: "Duermo bien. No necesito nada.", replica: "Contéstame así otra vez y dejo de venir. No me hagas eso, que me ha costado venir." },
          { id: "preguntar", label: "Preguntar por el tercer indicador", texto: "¿Cuál es el tercero?", replica: "La memoria. Empiezas a perder tardes enteras. Por eso te digo lo de las horas." },
        ],
        repite: [{ a: "tenso", t: "Dos veces el mismo día es un patrón. No hagas patrones conmigo." }],
      },
      2: {
        asuntos: [
          [
            { a: "neutro", t: "Los cuatro anteriores no fallaron por el poder. Fallaron por el aislamiento." },
            { a: "tenso", t: "Tres se quedaron solos y el cuarto también, sólo que tardó más." },
            { a: "neutro", t: "El dato clínico es ése: el que tiene a alguien, aguanta. No hay más medicina." },
          ],
          [
            { a: "neutro", t: "He sacado un expediente del archivo de la planta doce." },
            { a: "tenso", t: "Está en papel. Lo digital deja rastro y el papel sólo deja huellas, que se limpian." },
            { a: "neutro", t: "Dentro hay una firma que vas a reconocer. Prepárate para eso." },
          ],
          [
            { a: "roto", t: "Me pagaron una casa con ese proyecto. Vivo en ella. Todos los días." },
            { a: "neutro", t: "No la he vendido porque venderla sería fingir que no la compré." },
            { a: "tenso", t: "Ésa es toda mi penitencia. Ya ves qué barata." },
          ],
        ],
        pregunta: "¿Qué le digo a la doctora?",
        opciones: [
          { id: "honesto", label: "Contarle a quién tiene", texto: "No estoy solo. Hay tres personas que lo saben y siguen aquí.", replica: "Tres. Entonces tienes más posibilidades que los cuatro anteriores juntos. Sigue." },
          { id: "proteger", label: "Mentir sobre el aislamiento", texto: "Estoy solo y prefiero seguir así. Es más limpio.", replica: "Es más limpio y es cómo murieron dos de ellos. Piénsalo, por favor." },
          { id: "preguntar", label: "Preguntar por la firma", texto: "¿De quién es la firma?", replica: "De un técnico de mantenimiento de veintitrés años. Lo siento. De verdad que lo siento." },
        ],
        repite: [{ a: "neutro", t: "Ya te he dado lo de hoy. Lo de mañana lo tengo que robar todavía." }],
      },
      3: {
        asuntos: [
          [
            { a: "decidido", t: "He dimitido. Esta mañana, por escrito y con copia registrada." },
            { a: "neutro", t: "Ahora ya no soy una fuente interna. Soy una testigo, que vale menos y duele menos." },
            { a: "tenso", t: "Y tengo hasta el viernes para sacar lo que quede antes de que me retiren la tarjeta." },
          ],
          [
            { a: "neutro", t: "Si la central arranca, la carga pasa por un cuerpo. Ése es el diseño." },
            { a: "tenso", t: "No es un accidente del sistema: es el sistema. Lo escribimos así." },
            { a: "roto", t: "Yo revisé ese cálculo y lo di por bueno. Con estas dos manos." },
          ],
          [
            { a: "neutro", t: "Vas a tener que elegir entre parar la central y salir entero." },
            { a: "tenso", t: "No hay una tercera opción y llevo un mes buscándola." },
            { a: "decidido", t: "Pero si eliges parar, yo estaré en la sala de control. No te vas a quedar solo ahí dentro." },
          ],
        ],
        pregunta: "¿Qué le digo a la doctora?",
        opciones: [
          { id: "honesto", label: "Aceptar que esté dentro", texto: "Venga conmigo. Necesito a alguien que sepa qué está mirando.", replica: "Voy. Y por primera vez en veinte años voy a estar en el lado correcto de esa sala." },
          { id: "proteger", label: "Dejarla fuera", texto: "Quédese fuera. Ya ha pagado bastante.", replica: "No he pagado nada. He vivido en una casa. Déjame pagar algo, por una vez." },
          { id: "preguntar", label: "Preguntar por la tercera opción", texto: "¿Qué ha descartado ya?", replica: "Todo lo que no te incluye a ti dentro del circuito. Créeme: he hecho los números tres veces." },
        ],
        repite: [{ a: "tenso", t: "No insistas hoy. Cada minuto contigo es un minuto que alguien puede contar." }],
      },
    },
    en: {
      1: {
        asuntos: [
          [
            { a: "neutro", t: "I shouldn't be talking to you anywhere with cameras. Keep walking, don't look at me." },
            { a: "tenso", t: "I worked on the project. Not the glamorous part — the afterwards." },
            { a: "neutro", t: "The afterwards is where you measure what happens to the subject. That was me." },
          ],
          [
            { a: "neutro", t: "How much do you sleep? Answer in hours, not in 'fine' or 'badly'." },
            { a: "tenso", t: "Under five is the first indicator. It's always the first." },
            { a: "neutro", t: "The second is the hands. The third I'd rather not discuss today." },
          ],
          [
            { a: "roto", t: "I signed an authorisation for a trial involving four minors." },
            { a: "neutro", t: "And I convinced myself it was a trial because the form said 'trial'." },
            { a: "tenso", t: "You can sign anything if the paperwork is well laid out." },
          ],
        ],
        pregunta: "What do I tell the doctor?",
        opciones: [
          { id: "honesto", label: "Answer in hours", texto: "Four. Four and a half on a good day.", replica: "Thank you for the number. Take this. Magnesium, not a miracle, but it adds up." },
          { id: "proteger", label: "Refuse the numbers", texto: "I sleep fine. I don't need anything.", replica: "Answer me like that again and I stop coming. Don't — it cost me a lot to come." },
          { id: "preguntar", label: "Ask about the third", texto: "What's the third indicator?", replica: "Memory. You start losing whole afternoons. That's why I ask about hours." },
        ],
        repite: [{ a: "tenso", t: "Twice in one day is a pattern. Don't make patterns with me." }],
      },
      2: {
        asuntos: [
          [
            { a: "neutro", t: "The four before you didn't fail because of the power. They failed from isolation." },
            { a: "tenso", t: "Three ended up alone and so did the fourth, she just took longer." },
            { a: "neutro", t: "That's the clinical finding: the one who has somebody holds. There's no other medicine." },
          ],
          [
            { a: "neutro", t: "I've taken a file out of the twelfth-floor archive." },
            { a: "tenso", t: "It's paper. Digital leaves a trail; paper only leaves fingerprints, and those wipe." },
            { a: "neutro", t: "There's a signature inside you'll recognise. Prepare yourself for that." },
          ],
          [
            { a: "roto", t: "They paid me a house out of that project. I live in it. Every day." },
            { a: "neutro", t: "I haven't sold it because selling it would be pretending I never bought it." },
            { a: "tenso", t: "That's my entire penance. Cheap, isn't it." },
          ],
        ],
        pregunta: "What do I tell the doctor?",
        opciones: [
          { id: "honesto", label: "Tell her who he has", texto: "I'm not alone. Three people know and they're still here.", replica: "Three. Then your odds beat all four of them combined. Keep going." },
          { id: "proteger", label: "Lie about the isolation", texto: "I'm alone and I'd rather stay that way. It's cleaner.", replica: "It's cleaner and it's how two of them died. Think about it. Please." },
          { id: "preguntar", label: "Ask about the signature", texto: "Whose signature?", replica: "A twenty-three-year-old maintenance technician's. I'm sorry. I really am sorry." },
        ],
        repite: [{ a: "neutro", t: "You've had today's. Tomorrow's I still have to steal." }],
      },
      3: {
        asuntos: [
          [
            { a: "decidido", t: "I've resigned. This morning, in writing, with a registered copy." },
            { a: "neutro", t: "So I'm not an inside source now. I'm a witness — worth less and hurts less." },
            { a: "tenso", t: "And I have until Friday to get out whatever's left before they pull my card." },
          ],
          [
            { a: "neutro", t: "If the station starts, the load passes through a body. That's the design." },
            { a: "tenso", t: "It isn't a flaw in the system. It is the system. We wrote it that way." },
            { a: "roto", t: "I checked that calculation and signed it off. With these two hands." },
          ],
          [
            { a: "neutro", t: "You're going to have to choose between stopping the station and coming out whole." },
            { a: "tenso", t: "There's no third option and I've spent a month looking for one." },
            { a: "decidido", t: "But if you choose to stop it, I'll be in the control room. You won't be alone in there." },
          ],
        ],
        pregunta: "What do I tell the doctor?",
        opciones: [
          { id: "honesto", label: "Let her come", texto: "Come with me. I need someone who knows what they're looking at.", replica: "I'm coming. And for the first time in twenty years I'll be on the right side of that room." },
          { id: "proteger", label: "Keep her out", texto: "Stay out of it. You've paid enough.", replica: "I've paid nothing. I've lived in a house. Let me pay something, for once." },
          { id: "preguntar", label: "Ask about the third option", texto: "What have you already ruled out?", replica: "Everything that doesn't put you inside the circuit. Believe me — I've run the numbers three times." },
        ],
        repite: [{ a: "tenso", t: "Don't press today. Every minute with you is a minute somebody can count." }],
      },
    },
  },
};
