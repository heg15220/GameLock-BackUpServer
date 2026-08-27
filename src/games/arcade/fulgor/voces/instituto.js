/**
 * FULGOR — las voces del IES Miguel Servet.
 *
 * La vida que Dani arriesga tiene cuatro caras y ninguna de las cuatro habla como las otras
 * tres. Isma va deprisa y no se guarda nada; Julia elige cada palabra y se guarda casi todo;
 * Óscar empuja porque es lo único que le enseñaron; Requena da clase incluso cuando está
 * confesando. Si una frase de aquí se le pudiera poner a otro, estaría mal escrita.
 */

export const INSTITUTO = {

  /* ── Isma Doblas · tu mejor amigo · cámara y carpeta de teorías ───────────────────
   * Rápido, entusiasta, incapaz de guardarse un hallazgo diez segundos. Su tragedia es que
   * es bueno en esto: la carpeta se completa sola, y el capítulo 8 lo sabe.
   */
  isma: {
    es: {
      1: {
        asuntos: [
          [
            { a: "decidido", t: "Vale, escúchame, que esto es gordo. Cámara del ayuntamiento, calle Tolvas, 03:14." },
            { a: "neutro", t: "No se ve una cara. Se ve un destello y una farola que se apaga sola." },
            { a: "decidido", t: "¡Que se apaga SOLA, tío! ¿Tú sabes lo que es eso?" },
          ],
          [
            { a: "neutro", t: "He hecho un mapa. Con chinchetas. Sí, con chinchetas de verdad." },
            { a: "neutro", t: "Mi madre cree que es un trabajo de sociales." },
            { a: "decidido", t: "Es un trabajo, pero de los que le cambian el nombre a una ciudad." },
          ],
          [
            { a: "tenso", t: "Oye. Te fuiste a mitad de recreo y volviste oliendo a quemado." },
            { a: "neutro", t: "No te estoy vacilando. Lo apunté sin pensar y ahora me da cosa." },
            { a: "neutro", t: "Si me dices que lo borre, lo borro. Tú dilo." },
          ],
        ],
        pregunta: "¿Qué le digo a Isma?",
        opciones: [
          { id: "honesto", label: "Pedirle que no lo borre", texto: "No lo borres. Pero no se lo enseñes a nadie. A nadie, Isma.", replica: "…Vale. Vale, vale, vale. Guardo la carpeta. Y esta noche no duermo." },
          { id: "proteger", label: "Ridiculizar la teoría", texto: "Una farola fundida y un tío que huele a chamusquina. Menudo caso.", replica: "Ya. Es que tú dices eso justo cuando acierto. Lo tengo comprobado." },
          { id: "preguntar", label: "Preguntar por las cámaras", texto: "¿De dónde sacas tú las cámaras del ayuntamiento?", replica: "Del primo de Óscar. Que no es de fiar, pero tiene contraseñas." },
        ],
        repite: [{ a: "decidido", t: "Te acabo de contar lo mejor que tengo. Deja que respire, hombre." }],
      },
      2: {
        asuntos: [
          [
            { a: "decidido", t: "Ya tiene nombre. El Faro le ha puesto nombre y la gente lo repite." },
            { a: "neutro", t: "Y cuando algo tiene nombre deja de ser un rumor: se convierte en persona." },
            { a: "tenso", t: "Y las personas tienen dirección, tío. Eso es lo que me quita el sueño." },
          ],
          [
            { a: "neutro", t: "Tengo tres coincidencias que no pueden ser coincidencia." },
            { a: "tenso", t: "Y las tres te ponen a ti a menos de dos calles." },
            { a: "roto", t: "Llevo una semana buscando la manera de que la carpeta se equivoque." },
          ],
          [
            { a: "decidido", t: "Te he grabado. Sin querer. En la azotea, hace nueve días." },
            { a: "neutro", t: "Se ve fatal. Se ve lo justo." },
            { a: "tenso", t: "No lo he subido a ningún sitio y no lo voy a subir. Pero existe." },
          ],
        ],
        pregunta: "¿Qué le digo a Isma?",
        opciones: [
          { id: "honesto", label: "Dejar de negarlo", texto: "Isma. Deja de buscar la manera de que la carpeta se equivoque.", replica: "…Ah. Vale. Pues ya está. Llevaba meses queriendo tener razón y ahora me tiembla todo." },
          { id: "proteger", label: "Negarlo una vez más", texto: "Es una azotea y un tío con capucha. Hay mil.", replica: "Hay mil. Pero yo sólo he grabado a uno, y andaba como andas tú." },
          { id: "preguntar", label: "Preguntar quién más lo ha visto", texto: "¿Quién más ha visto ese archivo?", replica: "Nadie. Está en una tarjeta, y la tarjeta dentro de un cómic que no abre ni Dios." },
        ],
        repite: [{ a: "neutro", t: "Ya te lo he soltado todo, y era mucho. Dame un rato." }],
      },
      3: {
        asuntos: [
          [
            { a: "decidido", t: "Ya no soy el que hace preguntas. Ahora soy el que las tapa." },
            { a: "neutro", t: "He metido tres pistas falsas en el foro. Buenas, además." },
            { a: "neutro", t: "Resulta que se me da mejor esconder que encontrar. Vaya descubrimiento." },
          ],
          [
            { a: "tenso", t: "La inspectora me ha parado en el pasillo. Por el nombre." },
            { a: "neutro", t: "Sabe cómo me llamo, Dani. Se ha estudiado quién es tu amigo." },
            { a: "decidido", t: "No le di nada. Pero tardé dos segundos de más en contestar." },
          ],
          [
            { a: "roto", t: "Si esto sale mal, quiero que sepas que yo elegí quedarme." },
            { a: "neutro", t: "No me arrastraste. Me pediste que no lo borrara y yo dije vale." },
            { a: "decidido", t: "Ese vale lo dije yo. Que conste en acta." },
          ],
        ],
        pregunta: "¿Qué le digo a Isma?",
        opciones: [
          { id: "honesto", label: "Reconocer lo que le cuesta", texto: "Estás pagando por algo que no elegiste tú. Y lo sabes.", replica: "Sí lo elegí. Lo elijo cada mañana, que es peor y está mejor." },
          { id: "proteger", label: "Sacarlo de en medio", texto: "Apártate un tiempo. Por ti. Yo sigo solo.", replica: "Ni de coña. Tú solo duras dos capítulos, y lo digo con conocimiento de causa." },
          { id: "preguntar", label: "Preguntar qué le preguntó ella", texto: "¿Qué te preguntó exactamente?", replica: "Si tú faltas a clase. Le dije que sí, porque ya lo sabía. Se dan cosas verdaderas e inútiles." },
        ],
        repite: [{ a: "neutro", t: "Estoy en modo tapadera, no en modo charla. Luego." }],
      },
    },
    en: {
      1: {
        asuntos: [
          [
            { a: "decidido", t: "Right, listen, this one's big. Council camera, Tolvas street, 03:14." },
            { a: "neutro", t: "You can't see a face. You see a flash and a streetlight going out on its own." },
            { a: "decidido", t: "On its OWN, mate. Do you know what that means?" },
          ],
          [
            { a: "neutro", t: "I've made a map. With pins. Yes, actual pins." },
            { a: "neutro", t: "My mum thinks it's a geography project." },
            { a: "decidido", t: "It is a project. The kind that changes what a city gets called." },
          ],
          [
            { a: "tenso", t: "Here. You went off halfway through break and came back smelling of burning." },
            { a: "neutro", t: "I'm not winding you up. I wrote it down without thinking and now it bothers me." },
            { a: "neutro", t: "If you tell me to delete it, I delete it. Just say so." },
          ],
        ],
        pregunta: "What do I tell Isma?",
        opciones: [
          { id: "honesto", label: "Ask him not to delete it", texto: "Don't delete it. But don't show it to anyone. Anyone, Isma.", replica: "…Okay. Okay okay okay. Folder stays shut. And I'm not sleeping tonight." },
          { id: "proteger", label: "Mock the theory", texto: "A blown streetlight and a bloke who smells of smoke. Some case.", replica: "Yeah. You say that exactly when I'm right. I've checked." },
          { id: "preguntar", label: "Ask about the cameras", texto: "Where are you getting council cameras from?", replica: "Óscar's cousin. Not trustworthy, but he's got passwords." },
        ],
        repite: [{ a: "decidido", t: "I've just given you my best material. Let me breathe." }],
      },
      2: {
        asuntos: [
          [
            { a: "decidido", t: "He's got a name now. The paper gave him one and people are using it." },
            { a: "neutro", t: "And once a thing has a name it stops being a rumour. It becomes a person." },
            { a: "tenso", t: "And people have addresses, mate. That's the bit that keeps me up." },
          ],
          [
            { a: "neutro", t: "I've got three coincidences that can't be coincidences." },
            { a: "tenso", t: "And all three put you within two streets." },
            { a: "roto", t: "I've spent a week trying to find a way for the folder to be wrong." },
          ],
          [
            { a: "decidido", t: "I filmed you. By accident. On the roof, nine days ago." },
            { a: "neutro", t: "It looks terrible. It looks like just enough." },
            { a: "tenso", t: "I haven't uploaded it anywhere and I won't. But it exists." },
          ],
        ],
        pregunta: "What do I tell Isma?",
        opciones: [
          { id: "honesto", label: "Stop denying it", texto: "Isma. Stop looking for a way for the folder to be wrong.", replica: "…Oh. Right. Well then. I've wanted to be right for months and now I'm shaking." },
          { id: "proteger", label: "Deny it once more", texto: "It's a roof and a bloke in a hood. There are a thousand.", replica: "There are a thousand. I've only filmed one, and he walked like you walk." },
          { id: "preguntar", label: "Ask who else has seen it", texto: "Who else has that file?", replica: "Nobody. It's on a card, and the card's inside a comic no living soul would open." },
        ],
        repite: [{ a: "neutro", t: "I've dumped the lot on you already, and it was a lot. Give me a minute." }],
      },
      3: {
        asuntos: [
          [
            { a: "decidido", t: "I'm not the one asking questions any more. I'm the one burying them." },
            { a: "neutro", t: "Planted three false leads on the forum. Good ones, as well." },
            { a: "neutro", t: "Turns out I'm better at hiding than finding. What a discovery." },
          ],
          [
            { a: "tenso", t: "The inspector stopped me in the corridor. By name." },
            { a: "neutro", t: "She knows my name, Dani. She's done her homework on who your friend is." },
            { a: "decidido", t: "I gave her nothing. But I took two seconds too long to answer." },
          ],
          [
            { a: "roto", t: "If this goes wrong, I want it on record that I chose to stay." },
            { a: "neutro", t: "You didn't drag me. You asked me not to delete it and I said fine." },
            { a: "decidido", t: "That fine was mine. Let the minutes show it." },
          ],
        ],
        pregunta: "What do I tell Isma?",
        opciones: [
          { id: "honesto", label: "Name what it costs him", texto: "You're paying for something you didn't choose. You know that.", replica: "I did choose it. I choose it every morning, which is worse and also better." },
          { id: "proteger", label: "Push him out of it", texto: "Step back for a while. For you. I'll carry it.", replica: "Not a chance. On your own you last two chapters, and I say that with evidence." },
          { id: "preguntar", label: "Ask what she asked him", texto: "What did she actually ask you?", replica: "Whether you skip class. I said yes, because she knew. True and useless — you learn to hand those over." },
        ],
        repite: [{ a: "neutro", t: "I'm in cover-up mode, not chat mode. Later." }],
      },
    },
  },

  /* ── Julia Reig · de tu clase · reservada, buena en física ────────────────────────
   * Hija de Ezequiel Reig y nadie en el instituto se lo perdona. Elige las palabras de una
   * en una. No te ayuda por afecto: te ayuda porque ha hecho una cuenta y le sale.
   */
  julia: {
    es: {
      1: {
        asuntos: [
          [
            { a: "neutro", t: "Te has dejado la libreta abierta por el tema seis. No lo tienes." },
            { a: "neutro", t: "Te paso mis apuntes. No es un favor, es que corriges tú los míos de literatura." },
            { a: "tenso", t: "Y no le digas a nadie que hemos hablado. Por ti, no por mí." },
          ],
          [
            { a: "neutro", t: "La inducción no es magia. Es que el campo cambia y la materia protesta." },
            { a: "neutro", t: "Requena lo explica con imanes porque con imanes nadie hace preguntas." },
            { a: "tenso", t: "Yo hice una pregunta el año pasado y me llevó aparte. Nunca más." },
          ],
          [
            { a: "tenso", t: "Sé lo que estás pensando cuando digo mi apellido. Lo piensa todo el mundo." },
            { a: "neutro", t: "No elegí el apellido y no me voy a disculpar por él dos veces al día." },
            { a: "neutro", t: "Con eso ya sabes de mí lo mismo que sabe la clase. Enhorabuena." },
          ],
        ],
        pregunta: "¿Qué le digo a Julia?",
        opciones: [
          { id: "honesto", label: "Decirle que no es su padre", texto: "A mí tu apellido me da igual. Lo digo en serio.", replica: "Nadie dice eso en serio. Tú a lo mejor sí. Lo comprobaremos." },
          { id: "proteger", label: "Quedarse en los apuntes", texto: "Vale. Los apuntes. Gracias.", replica: "De nada. Y bien: acabas de hacer justo lo que hace todo el mundo." },
          { id: "preguntar", label: "Preguntar por esa pregunta", texto: "¿Qué le preguntaste a Requena el año pasado?", replica: "Que dónde estaba dando clase en 2005. Se le cayó la tiza. Fin de la anécdota." },
        ],
        repite: [{ a: "neutro", t: "Ya te he dicho lo que tenía que decirte. No lo estires." }],
      },
      2: {
        asuntos: [
          [
            { a: "neutro", t: "Tengo el registro del metro de esa noche. Pesa dos gigas." },
            { a: "tenso", t: "No preguntes cómo lo he sacado y yo no pregunto para qué lo quieres." },
            { a: "neutro", t: "Es un trato bueno. Los tratos buenos son los que nadie explica." },
          ],
          [
            { a: "neutro", t: "En mi casa se cena viendo las noticias. Hoy salías tú." },
            { a: "tenso", t: "Mi padre dejó el tenedor en el plato y no volvió a cogerlo." },
            { a: "neutro", t: "Le he visto hacer eso dos veces en mi vida. Las dos por dinero." },
          ],
          [
            { a: "tenso", t: "Tú faltas a tercera hora los martes. Siempre los martes." },
            { a: "neutro", t: "Lo sé porque yo también miro cosas y las ordeno. Es lo que hago." },
            { a: "neutro", t: "Tranquilo: lo que ordeno no lo publico. Es la diferencia entre yo y Marga." },
          ],
        ],
        pregunta: "¿Qué le digo a Julia?",
        opciones: [
          { id: "honesto", label: "Reconocer el martes", texto: "Los martes tengo una cosa que no puedo contarte. Es verdad y es todo.", replica: "Gracias. Verdad, poca y sin adornos. Se agradece más de lo que crees." },
          { id: "proteger", label: "Inventar una excusa", texto: "Los martes voy al fisio. Cosa de la rodilla.", replica: "Tienes las dos rodillas bien y corres como una liebre. Pero vale." },
          { id: "preguntar", label: "Preguntar por su padre", texto: "¿Por qué dejó tu padre el tenedor?", replica: "Porque cuando algo le sale gratis se le nota. Y contigo le salió gratis." },
        ],
        repite: [{ a: "tenso", t: "Otra vez no. Dos conversaciones seguidas conmigo llaman la atención." }],
      },
      3: {
        asuntos: [
          [
            { a: "tenso", t: "Mi tarjeta abre las plantas nueve a catorce. Caduca el viernes." },
            { a: "neutro", t: "No te estoy diciendo que la uses. Te estoy diciendo cuándo caduca." },
            { a: "neutro", t: "Si alguien pregunta, la perdí en el gimnasio. Y la perdí en el gimnasio." },
          ],
          [
            { a: "roto", t: "Mi padre habla de ti como habla de una patente." },
            { a: "neutro", t: "Con cariño. Ése es el problema: con cariño." },
            { a: "tenso", t: "Yo crecí siendo una cosa que se quiere así. Sé cómo suena desde dentro." },
          ],
          [
            { a: "decidido", t: "Cuando esto acabe me voy de Marés. Ya está decidido." },
            { a: "neutro", t: "No huyo. Es que este apellido aquí no cabe conmigo dentro." },
            { a: "neutro", t: "Te lo cuento porque eres la única persona a la que no le doy pena al decirlo." },
          ],
        ],
        pregunta: "¿Qué le digo a Julia?",
        opciones: [
          { id: "honesto", label: "Decirle lo que va a costarle", texto: "Julia, si uso esa tarjeta, tu padre lo va a saber. Y va a saber de quién era.", replica: "Lo sé. Lo he pensado tres noches. Sigue caducando el viernes." },
          { id: "proteger", label: "No aceptar la tarjeta", texto: "No me la des. No quiero que pagues tú esto.", replica: "Ya estoy pagando. Llevo pagando desde que aprendí a decir mi apellido entero." },
          { id: "preguntar", label: "Preguntar qué quiere a cambio", texto: "¿Y tú qué sacas de esto?", replica: "Que dentro de veinte años pueda decir que hice algo. Es barato y me lo puedo permitir." },
        ],
        repite: [{ a: "neutro", t: "Ya está dicho. Cuanto menos nos vean juntos, mejor te va a ir." }],
      },
    },
    en: {
      1: {
        asuntos: [
          [
            { a: "neutro", t: "You left your notebook open on unit six. You haven't got it." },
            { a: "neutro", t: "Take my notes. Not a favour — you're marking my literature essays in return." },
            { a: "tenso", t: "And don't tell anyone we spoke. For your sake, not mine." },
          ],
          [
            { a: "neutro", t: "Induction isn't magic. The field changes and the matter objects." },
            { a: "neutro", t: "Requena explains it with magnets because nobody asks questions about magnets." },
            { a: "tenso", t: "I asked a question last year and he took me aside. Never again." },
          ],
          [
            { a: "tenso", t: "I know what you think when I say my surname. Everyone thinks it." },
            { a: "neutro", t: "I didn't choose it and I'm not apologising for it twice a day." },
            { a: "neutro", t: "So now you know exactly as much about me as the class does. Congratulations." },
          ],
        ],
        pregunta: "What do I tell Julia?",
        opciones: [
          { id: "honesto", label: "Tell her she isn't her father", texto: "Your surname means nothing to me. I mean that.", replica: "Nobody means that. You might. We'll find out." },
          { id: "proteger", label: "Stick to the notes", texto: "Right. The notes. Thanks.", replica: "You're welcome. And there it is — you did exactly what everyone does." },
          { id: "preguntar", label: "Ask about that question", texto: "What did you ask Requena last year?", replica: "Where he was teaching in 2005. He dropped the chalk. End of anecdote." },
        ],
        repite: [{ a: "neutro", t: "I've said what I had to say. Don't stretch it." }],
      },
      2: {
        asuntos: [
          [
            { a: "neutro", t: "I've got the metro logs for that night. Two gigabytes of them." },
            { a: "tenso", t: "Don't ask how I got them and I won't ask what you want them for." },
            { a: "neutro", t: "It's a good deal. Good deals are the ones nobody explains." },
          ],
          [
            { a: "neutro", t: "We eat dinner in front of the news at my house. You were on it tonight." },
            { a: "tenso", t: "My father put his fork down and didn't pick it up again." },
            { a: "neutro", t: "I've seen him do that twice in my life. Both times over money." },
          ],
          [
            { a: "tenso", t: "You miss third period on Tuesdays. Always Tuesdays." },
            { a: "neutro", t: "I know because I watch things and sort them. It's what I do." },
            { a: "neutro", t: "Relax: what I sort, I don't publish. That's the difference between me and Marga." },
          ],
        ],
        pregunta: "What do I tell Julia?",
        opciones: [
          { id: "honesto", label: "Own the Tuesday", texto: "Tuesdays I've got something I can't tell you about. That's true and that's all of it.", replica: "Thank you. True, brief, unadorned. That's worth more than you think." },
          { id: "proteger", label: "Invent an excuse", texto: "Physio on Tuesdays. Knee thing.", replica: "Both your knees are fine and you run like a hare. But all right." },
          { id: "preguntar", label: "Ask about her father", texto: "Why did your father put the fork down?", replica: "Because you can tell when something's come to him free. And you came to him free." },
        ],
        repite: [{ a: "tenso", t: "Not again. Two conversations in a row with me gets noticed." }],
      },
      3: {
        asuntos: [
          [
            { a: "tenso", t: "My card opens floors nine to fourteen. It expires Friday." },
            { a: "neutro", t: "I'm not telling you to use it. I'm telling you when it expires." },
            { a: "neutro", t: "If anyone asks, I lost it at the gym. And I did lose it at the gym." },
          ],
          [
            { a: "roto", t: "My father talks about you the way he talks about a patent." },
            { a: "neutro", t: "Fondly. That's the problem: fondly." },
            { a: "tenso", t: "I grew up as a thing loved that way. I know how it sounds from the inside." },
          ],
          [
            { a: "decidido", t: "When this is over I'm leaving Marés. It's decided." },
            { a: "neutro", t: "I'm not running. This surname just doesn't fit here with me inside it." },
            { a: "neutro", t: "I'm telling you because you're the only person who doesn't pity me for saying it." },
          ],
        ],
        pregunta: "What do I tell Julia?",
        opciones: [
          { id: "honesto", label: "Say what it will cost her", texto: "Julia, if I use that card your father will know. And he'll know whose it was.", replica: "I know. I've thought about it for three nights. It still expires Friday." },
          { id: "proteger", label: "Refuse the card", texto: "Don't give it to me. I don't want you paying for this.", replica: "I'm already paying. I've been paying since I learned to say my full name." },
          { id: "preguntar", label: "Ask what she gets", texto: "What do you get out of this?", replica: "That in twenty years I can say I did something. It's cheap and I can afford it." },
        ],
        repite: [{ a: "neutro", t: "It's said. The less we're seen together, the better for you." }],
      },
    },
  },

  /* ── Óscar Nieto · el matón de clase · su hermano está en Los Cabos ───────────────
   * Empuja porque es lo único que le enseñaron en casa. Sus tres actos son la única
   * redención completa del reparto: amenaza, se agrieta, y acaba cubriéndote sin cobrar.
   */
  oscar: {
    es: {
      1: {
        asuntos: [
          [
            { a: "tenso", t: "Vaya. El que desaparece a mitad de clase." },
            { a: "neutro", t: "Un día de éstos te sigo, Vela. Por curiosidad, no por nada." },
            { a: "tenso", t: "Y como sea algo bueno, me lo vas a compartir." },
          ],
          [
            { a: "tenso", t: "¿Tú de qué vas últimamente? Que llegas y no miras a nadie." },
            { a: "neutro", t: "Antes por lo menos te reías de las cosas. Ahora ni eso." },
            { a: "tenso", t: "No me importa. Lo digo porque se nota, no porque me importe." },
          ],
          [
            { a: "neutro", t: "Mi hermano dice que en el Puerto hay movimiento raro." },
            { a: "tenso", t: "Y cuando mi hermano dice raro es que alguien va a acabar en el hospital." },
            { a: "neutro", t: "No vayas por ahí. Ya está. Ya lo he dicho. Olvídalo." },
          ],
        ],
        pregunta: "¿Qué le digo a Óscar?",
        opciones: [
          { id: "honesto", label: "Aguantarle la mirada", texto: "Sígueme si quieres. No vas a ver nada que entiendas.", replica: "Uy. Mira éste. Vale, Vela. Vale. Me lo apunto." },
          { id: "proteger", label: "Dejarlo pasar", texto: "No voy a ninguna parte, Óscar. Déjalo.", replica: "Ya. Pues nada. Sigue no yendo a ninguna parte." },
          { id: "preguntar", label: "Preguntar por su hermano", texto: "¿Tu hermano está metido en eso del Puerto?", replica: "Mi hermano está metido en todo. Ése es el chiste de mi casa." },
        ],
        repite: [{ a: "tenso", t: "¿Qué pasa, que ahora te caigo bien? Aparta." }],
      },
      2: {
        asuntos: [
          [
            { a: "tenso", t: "Al de las noticias le va a pasar algo. Eso lo sabe todo el mundo." },
            { a: "neutro", t: "Y luego la gente va a decir que se lo veía venir. Como siempre." },
            { a: "tenso", t: "A mí eso me revienta. Que se lo vea venir todo el mundo y no lo pare nadie." },
          ],
          [
            { a: "roto", t: "A mi hermano le han partido dos costillas en el muelle." },
            { a: "neutro", t: "No se lo he dicho a nadie. Te lo digo a ti porque no se lo vas a contar a nadie." },
            { a: "tenso", t: "Y si lo cuentas, te parto a ti. Pero no lo vas a contar." },
          ],
          [
            { a: "neutro", t: "Te vi salir del instituto por la valla del campo el jueves." },
            { a: "tenso", t: "Y no se lo dije al de guardia. Fíjate qué majo soy de repente." },
            { a: "neutro", t: "No me des las gracias. Que no lo hice por ti, lo hice por no hablar con el de guardia." },
          ],
        ],
        pregunta: "¿Qué le digo a Óscar?",
        opciones: [
          { id: "honesto", label: "Ofrecerle ayuda de verdad", texto: "Lo de tu hermano. Si necesitas algo, dilo. Va en serio.", replica: "…Vale. No necesito nada. Pero vale. Eso ha estado bien, Vela." },
          { id: "proteger", label: "No meterse", texto: "Eso es cosa tuya, Óscar. Yo no me meto.", replica: "Claro que no. Nadie se mete. Anda, tira." },
          { id: "preguntar", label: "Preguntar quién fue", texto: "¿Quién le partió las costillas?", replica: "Gente que cobra por hacerlo. No pongas esa cara, que ya sé la cara que estás poniendo." },
        ],
        repite: [{ a: "neutro", t: "Ya hemos hablado y ya ha sido demasiado. Vete." }],
      },
      3: {
        asuntos: [
          [
            { a: "neutro", t: "La inspectora vino a preguntar por ti. A mí, imagínate." },
            { a: "decidido", t: "Le dije que eres un pringado que se pasa el día en la biblioteca." },
            { a: "neutro", t: "Se lo creyó, además. Porque nadie miente sobre alguien a quien odia." },
          ],
          [
            { a: "roto", t: "Mi hermano se ha ido de Marés. Sin decir adiós, como se van los de mi casa." },
            { a: "neutro", t: "Y yo me he quedado aquí siendo el hermano del que se fue." },
            { a: "tenso", t: "Así que ahora tengo que ser otra cosa. Y no tengo ni idea de cuál." },
          ],
          [
            { a: "decidido", t: "Sé lo que eres. Lo sé desde el apagón, cuando la calle estaba negra y tú no." },
            { a: "neutro", t: "No te preocupes. No se lo he dicho ni a mi almohada." },
            { a: "tenso", t: "Sólo quiero que sepas que hay alguien más que lo sabe y que está de tu lado. Ya está." },
          ],
        ],
        pregunta: "¿Qué le digo a Óscar?",
        opciones: [
          { id: "honesto", label: "Darle las gracias en serio", texto: "Óscar. Gracias. Y perdón por todos los años en que te tuve por lo que parecías.", replica: "Buah. No, no, no. Nada de esto. Pero vale. Vale." },
          { id: "proteger", label: "Negarlo hasta el final", texto: "Estabas a oscuras, Óscar. A oscuras se ve lo que uno quiere.", replica: "Ya. Pues déjame verlo. Me viene bien tener razón en algo." },
          { id: "preguntar", label: "Preguntarle qué quiere ser", texto: "¿Y qué quieres ser, si no eres el hermano de tu hermano?", replica: "No sé. Alguien que ayude, quizá. Suena fatal dicho así. Ni lo repitas." },
        ],
        repite: [{ a: "neutro", t: "Ya te he dicho lo importante. No me hagas repetirlo, que me da vergüenza." }],
      },
    },
    en: {
      1: {
        asuntos: [
          [
            { a: "tenso", t: "Well. If it isn't the one who vanishes halfway through class." },
            { a: "neutro", t: "One of these days I'm following you, Vela. Curiosity, that's all." },
            { a: "tenso", t: "And if it's anything good, you're sharing." },
          ],
          [
            { a: "tenso", t: "What's your problem lately? You turn up and look at nobody." },
            { a: "neutro", t: "You used to at least laugh at things. Not even that now." },
            { a: "tenso", t: "Don't care. Saying it because it shows, not because I care." },
          ],
          [
            { a: "neutro", t: "My brother says there's weird movement down the Puerto." },
            { a: "tenso", t: "And when my brother says weird, someone ends up in hospital." },
            { a: "neutro", t: "Don't go down there. There. I've said it. Forget it." },
          ],
        ],
        pregunta: "What do I tell Óscar?",
        opciones: [
          { id: "honesto", label: "Hold his stare", texto: "Follow me if you like. You won't see anything you'd understand.", replica: "Ooh. Get him. All right, Vela. All right. Noted." },
          { id: "proteger", label: "Let it go", texto: "I'm not going anywhere, Óscar. Drop it.", replica: "Right. Fine. Carry on not going anywhere." },
          { id: "preguntar", label: "Ask about his brother", texto: "Is your brother in on that Puerto business?", replica: "My brother's in on everything. That's the joke in my house." },
        ],
        repite: [{ a: "tenso", t: "What, you like me now? Move." }],
      },
      2: {
        asuntos: [
          [
            { a: "tenso", t: "Something's going to happen to that one on the news. Everybody knows it." },
            { a: "neutro", t: "And afterwards people will say you could see it coming. Like always." },
            { a: "tenso", t: "That's what does my head in. Everybody sees it coming and nobody stops it." },
          ],
          [
            { a: "roto", t: "They broke two of my brother's ribs down at the quay." },
            { a: "neutro", t: "I haven't told anyone. I'm telling you because you won't tell anyone." },
            { a: "tenso", t: "And if you do, I'll break yours. But you won't." },
          ],
          [
            { a: "neutro", t: "Saw you go over the pitch fence on Thursday." },
            { a: "tenso", t: "And I didn't tell the duty teacher. Look how lovely I've gone." },
            { a: "neutro", t: "Don't thank me. I didn't do it for you, I did it to avoid talking to him." },
          ],
        ],
        pregunta: "What do I tell Óscar?",
        opciones: [
          { id: "honesto", label: "Actually offer help", texto: "Your brother. If you need anything, say so. I mean it.", replica: "…Right. I don't need anything. But right. That was decent, Vela." },
          { id: "proteger", label: "Stay out of it", texto: "That's your business, Óscar. I'm not getting into it.", replica: "Course not. Nobody gets into it. Go on, off you go." },
          { id: "preguntar", label: "Ask who did it", texto: "Who broke his ribs?", replica: "People who get paid for it. Don't pull that face — I know the face you're pulling." },
        ],
        repite: [{ a: "neutro", t: "We've talked and it was already too much. Go." }],
      },
      3: {
        asuntos: [
          [
            { a: "neutro", t: "The inspector came asking about you. Me, of all people." },
            { a: "decidido", t: "Told her you're a loser who lives in the library." },
            { a: "neutro", t: "She believed it, too. Nobody lies about someone they hate." },
          ],
          [
            { a: "roto", t: "My brother's left Marés. No goodbye, the way people leave in my house." },
            { a: "neutro", t: "And I'm still here being the brother of the one who left." },
            { a: "tenso", t: "So now I've got to be something else. And I've no idea what." },
          ],
          [
            { a: "decidido", t: "I know what you are. Since the blackout, when the street was black and you weren't." },
            { a: "neutro", t: "Don't worry. I haven't said it to my own pillow." },
            { a: "tenso", t: "Just so you know there's one more person who knows and he's on your side. That's it." },
          ],
        ],
        pregunta: "What do I tell Óscar?",
        opciones: [
          { id: "honesto", label: "Thank him properly", texto: "Óscar. Thank you. And sorry for all the years I took you for what you looked like.", replica: "Ugh. No. No, no. None of that. But all right. All right." },
          { id: "proteger", label: "Deny it to the end", texto: "It was dark, Óscar. In the dark you see what you want.", replica: "Yeah. Let me see it, then. It'd be nice to be right about something." },
          { id: "preguntar", label: "Ask what he wants to be", texto: "So what do you want to be, if not your brother's brother?", replica: "Dunno. Someone who helps, maybe. Sounds awful out loud. Don't repeat it." },
        ],
        repite: [{ a: "neutro", t: "I've said the important bit. Don't make me say it twice, it's embarrassing." }],
      },
    },
  },

  /* ── Emiliano Requena · profesor de física · cincuenta y ocho años y una culpa de veinte ─
   * Da clase incluso cuando confiesa: no sabe hablar de otra manera. Estuvo en el proyecto y
   * lleva dos décadas explicando inducción con imanes para que nadie levante la mano.
   */
  requena: {
    es: {
      1: {
        asuntos: [
          [
            { a: "neutro", t: "Llegas tarde. Otra vez. Siéntate." },
            { a: "decidido", t: "Hoy toca inducción. Presta atención: te va a servir más de lo que crees." },
            { a: "neutro", t: "Y no lo digo por el examen. Lo digo por cómo te miras las manos desde el lunes." },
          ],
          [
            { a: "tenso", t: "Dani. Las manos." },
            { a: "neutro", t: "No te lo estoy preguntando. Te lo estoy diciendo, que es distinto." },
            { a: "neutro", t: "Guantes de laboratorio en el cajón de arriba. Cógelos y no los devuelvas." },
          ],
          [
            { a: "neutro", t: "El examen del viernes entra hasta el tema ocho. Ocho, no siete." },
            { a: "neutro", t: "Y sí, va a caer el problema del transformador. Lo aviso todos los años." },
            { a: "tenso", t: "Todos los años, y todos los años alguien lo deja en blanco. No seas ése." },
          ],
        ],
        pregunta: "¿Qué le digo a Requena?",
        opciones: [
          { id: "honesto", label: "Aceptar los guantes", texto: "Gracias. Por los guantes y por no preguntar.", replica: "No he preguntado porque conozco la respuesta. Y me quita el sueño desde el martes." },
          { id: "proteger", label: "Restarle importancia", texto: "No es nada. Un descuido en casa.", replica: "Un descuido. En casa. Muy bien. Coge los guantes igualmente." },
          { id: "preguntar", label: "Preguntar por qué se lo toma así", texto: "¿Por qué le importa tanto lo de mis manos?", replica: "Porque una vez no me importó lo de las manos de otro. Estudia el tema ocho, Vela." },
        ],
        repite: [{ a: "neutro", t: "La clase ha terminado, Vela. Y yo también, por hoy." }],
      },
      2: {
        asuntos: [
          [
            { a: "tenso", t: "Alguien ha entrado en el laboratorio. No se llevó nada de valor." },
            { a: "neutro", t: "Se llevó un cuaderno con las tapas rojas y veinte años de mala conciencia." },
            { a: "roto", t: "Y no puedo denunciarlo, porque tendría que explicar qué había dentro." },
          ],
          [
            { a: "neutro", t: "Estuve dos años en un proyecto de Eléctrica Marés. Antes de dar clase." },
            { a: "tenso", t: "Ahí es donde aprendí que un físico también puede ser un cobarde con muy buena letra." },
            { a: "neutro", t: "No preguntes más hoy. Mañana quizá. Hoy no." },
          ],
          [
            { a: "neutro", t: "Sabes por qué explico la inducción con imanes, ¿verdad?" },
            { a: "tenso", t: "Porque con imanes nadie pregunta qué pasa si el conductor es una persona." },
            { a: "roto", t: "Llevo veinte años dando la misma clase para no oír esa pregunta." },
          ],
        ],
        pregunta: "¿Qué le digo a Requena?",
        opciones: [
          { id: "honesto", label: "Hacerle la pregunta", texto: "¿Y qué pasa si el conductor es una persona?", replica: "Que la persona aguanta. Un tiempo. Y luego se le nota en las manos. Siéntate, anda." },
          { id: "proteger", label: "Dejarle su cobardía", texto: "No tiene que contarme nada, profesor.", replica: "Ya lo sé. Ése ha sido siempre el problema: que nunca he tenido que." },
          { id: "preguntar", label: "Preguntar por el cuaderno", texto: "¿Qué había en el cuaderno rojo?", replica: "Nombres. Cuatro. Y un quinto sin escribir, que llevo desde el martes intentando no escribir." },
        ],
        repite: [{ a: "tenso", t: "Hoy no, Vela. Hoy ya he hablado más de la cuenta." }],
      },
      3: {
        asuntos: [
          [
            { a: "roto", t: "Los cuatro nombres del cuaderno eran cuatro chicos. Como tú." },
            { a: "neutro", t: "De tres sé lo que pasó. Del cuarto no, y es la que peor duerme conmigo." },
            { a: "tenso", t: "Se llamaba Noor. Tenía dieciséis años y una letra preciosa." },
          ],
          [
            { a: "neutro", t: "He escrito una carta contando lo que hicimos. Tres folios." },
            { a: "tenso", t: "Está en el cajón. Se publica el día que tú digas y no antes." },
            { a: "neutro", t: "Es lo único que te puedo dar, y llega con veinte años de retraso." },
          ],
          [
            { a: "decidido", t: "Deja de venir a verme, Dani. Lo digo por ti." },
            { a: "neutro", t: "Un profesor que aparece en tu expediente tres veces deja de ser un profesor." },
            { a: "roto", t: "Y yo prefiero seguir siendo el que te aprobó física que el que te delató." },
          ],
        ],
        pregunta: "¿Qué le digo a Requena?",
        opciones: [
          { id: "honesto", label: "Decirle que Noor está viva", texto: "Noor está viva. La he visto. Está en el Cerro del Faro.", replica: "…Repítelo. No. No lo repitas. Déjame quedarme con la primera vez." },
          { id: "proteger", label: "Callarse lo de la Vigía", texto: "De la cuarta no sé nada, profesor.", replica: "Claro que no. Nadie sabe nada. Es asombroso lo poco que sabe todo el mundo." },
          { id: "preguntar", label: "Preguntar por la carta", texto: "Si publico esa carta, ¿qué le pasa a usted?", replica: "Lo que tenía que haberme pasado hace veinte años. Publícala cuando te haga falta." },
        ],
        repite: [{ a: "neutro", t: "Vete a casa, Vela. Yo me quedo con los ejercicios y con lo mío." }],
      },
    },
    en: {
      1: {
        asuntos: [
          [
            { a: "neutro", t: "You're late. Again. Sit down." },
            { a: "decidido", t: "Induction today. Pay attention — it'll serve you better than you think." },
            { a: "neutro", t: "And not for the exam. For the way you've been looking at your hands since Monday." },
          ],
          [
            { a: "tenso", t: "Dani. Your hands." },
            { a: "neutro", t: "I'm not asking. I'm telling you, which is a different thing." },
            { a: "neutro", t: "Lab gloves, top drawer. Take them and don't bring them back." },
          ],
          [
            { a: "neutro", t: "Friday's exam covers up to unit eight. Eight, not seven." },
            { a: "neutro", t: "And yes, the transformer problem is on it. I warn them every year." },
            { a: "tenso", t: "Every year, and every year somebody leaves it blank. Don't be him." },
          ],
        ],
        pregunta: "What do I tell Requena?",
        opciones: [
          { id: "honesto", label: "Take the gloves", texto: "Thank you. For the gloves and for not asking.", replica: "I didn't ask because I know the answer. It's kept me up since Tuesday." },
          { id: "proteger", label: "Wave it away", texto: "It's nothing. Careless, at home.", replica: "Careless. At home. Very good. Take the gloves anyway." },
          { id: "preguntar", label: "Ask why he cares", texto: "Why does it matter so much to you, my hands?", replica: "Because once it didn't matter to me, somebody else's. Study unit eight, Vela." },
        ],
        repite: [{ a: "neutro", t: "Class is over, Vela. So am I, for today." }],
      },
      2: {
        asuntos: [
          [
            { a: "tenso", t: "Someone got into the lab. They took nothing of value." },
            { a: "neutro", t: "They took a red-covered notebook and twenty years of bad conscience." },
            { a: "roto", t: "And I can't report it, because I'd have to explain what was in it." },
          ],
          [
            { a: "neutro", t: "I spent two years on a project at Eléctrica Marés. Before teaching." },
            { a: "tenso", t: "That's where I learned a physicist can also be a coward with excellent handwriting." },
            { a: "neutro", t: "Don't ask any more today. Tomorrow, perhaps. Not today." },
          ],
          [
            { a: "neutro", t: "You know why I teach induction with magnets, don't you?" },
            { a: "tenso", t: "Because with magnets nobody asks what happens if the conductor is a person." },
            { a: "roto", t: "Twenty years of the same lesson so I don't have to hear that question." },
          ],
        ],
        pregunta: "What do I tell Requena?",
        opciones: [
          { id: "honesto", label: "Ask the question", texto: "So what happens if the conductor is a person?", replica: "The person holds. For a while. And then it shows in the hands. Sit down, go on." },
          { id: "proteger", label: "Leave him his cowardice", texto: "You don't have to tell me anything, sir.", replica: "I know. That's always been the problem. I've never had to." },
          { id: "preguntar", label: "Ask about the notebook", texto: "What was in the red notebook?", replica: "Names. Four. And a fifth I haven't written, and have spent since Tuesday not writing." },
        ],
        repite: [{ a: "tenso", t: "Not today, Vela. I've already said more than I should." }],
      },
      3: {
        asuntos: [
          [
            { a: "roto", t: "The four names in that notebook were four children. Like you." },
            { a: "neutro", t: "Three of them I know what became of. The fourth I don't, and she's the one who keeps me awake." },
            { a: "tenso", t: "Her name was Noor. Sixteen years old and beautiful handwriting." },
          ],
          [
            { a: "neutro", t: "I've written a letter setting out what we did. Three pages." },
            { a: "tenso", t: "It's in the drawer. It gets published the day you say and not before." },
            { a: "neutro", t: "It's all I can give you, and it's twenty years late." },
          ],
          [
            { a: "decidido", t: "Stop coming to see me, Dani. For your sake." },
            { a: "neutro", t: "A teacher who turns up in your file three times stops being a teacher." },
            { a: "roto", t: "And I'd rather stay the man who passed you in physics than the one who gave you up." },
          ],
        ],
        pregunta: "What do I tell Requena?",
        opciones: [
          { id: "honesto", label: "Tell him Noor is alive", texto: "Noor is alive. I've seen her. She's up on Cerro del Faro.", replica: "…Say it again. No. Don't. Let me keep the first time." },
          { id: "proteger", label: "Keep the Vigía to yourself", texto: "I don't know anything about the fourth one, sir.", replica: "Of course not. Nobody knows anything. It's astonishing how little everybody knows." },
          { id: "preguntar", label: "Ask about the letter", texto: "If I publish that letter, what happens to you?", replica: "What should have happened twenty years ago. Publish it when you need it." },
        ],
        repite: [{ a: "neutro", t: "Go home, Vela. I'll stay with the marking and with my own business." }],
      },
    },
  },
};
