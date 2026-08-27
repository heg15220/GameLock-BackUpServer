/**
 * FULGOR — ACTO II · EL HÉROE (capítulos 5-8).
 *
 * El acto donde el juego deja de perdonar. En el I todo lo que hacías tenía arreglo; aquí
 * empieza a haber noches con dos sitios y un solo Dani, trajes que se rompen y se quedan
 * colgando de una grúa, y un amigo que completa su expediente pase lo que pase.
 *
 * El capítulo 8 es el punto medio y la única derrota guionizada de la campaña. Está escrito
 * para que se lea como una derrota y no como un castigo: no pierdes por jugar mal, pierdes
 * porque alguien ha decidido que sigas andando, y eso es peor noticia que la paliza.
 */

export const ACTO_II = {

  /* ══ CAPÍTULO 5 · HIERRO ═════════════════════════════════════════════════════════ */

  c5_taller: {
    es: [
      { quien: null, animo: "neutro", texto: "Polígono Norte, subestación vieja. Chapa ha montado un banco de trabajo debajo del único fluorescente que aguanta." },
      { quien: "chapa", animo: "neutro", texto: "A ver. Esto que traes es un chubasquero con complejo de armadura." },
      { quien: "dani", animo: "tenso", texto: "Ha aguantado dos meses." },
      { quien: "chapa", animo: "tenso", texto: "Ha aguantado dos meses porque nadie te ha agarrado en serio. Eso se acaba esta semana." },
      { quien: null, animo: "neutro", texto: "Corta, mide, cose. Tarda una hora y cuarto y en toda la hora y cuarto no te pregunta nada." },
      { quien: "chapa", animo: "decidido", texto: "Seis piezas: manto, guantes, botas, máscara, forro y cinturón. Lo que rompas, lo apuntas. Lo que apuntes, lo arreglo." },
      { quien: "chapa", animo: "neutro", texto: "Y lo que no apuntes se te romperá otra vez en el peor momento posible. Es una ley física, como las tuyas." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "Polígono Norte, the old substation. Chapa has set a workbench up under the one fluorescent that still holds." },
      { quien: "chapa", animo: "neutro", texto: "Let's see. What you've brought me is a raincoat with delusions of armour." },
      { quien: "dani", animo: "tenso", texto: "It's lasted two months." },
      { quien: "chapa", animo: "tenso", texto: "It's lasted two months because nobody's grabbed you properly. That ends this week." },
      { quien: null, animo: "neutro", texto: "He cuts, measures, sews. It takes an hour and a quarter and in all that time he asks you nothing." },
      { quien: "chapa", animo: "decidido", texto: "Six pieces: cloak, gloves, boots, mask, lining, belt. What you break, you write down. What you write down, I fix." },
      { quien: "chapa", animo: "neutro", texto: "And what you don't write down breaks again at the worst possible moment. It's a law of physics, like yours." },
    ],
  },

  c5_cumple: {
    es: [
      { quien: null, animo: "neutro", texto: "Trece de marzo. Nuria cumple trece y lleva desde enero recordándolo con la frecuencia de un despertador." },
      { quien: "carmen", animo: "decidido", texto: "A las ocho, en casa. Los dos. Y digo los dos porque tu padre también tiene la costumbre de trabajar." },
      { quien: "nuria", animo: "decidido", texto: "He pedido tarta de la de siempre. Y he dicho que la corte yo, así que no lleguéis tarde." },
      { quien: "dani", animo: "neutro", texto: "A las ocho." },
      { quien: "nuria", animo: "neutro", texto: "A las ocho. Lo estoy apuntando, ¿eh? Tengo una libreta y todo." },
      { quien: null, animo: "neutro", texto: "La tiene. Lleva dos meses apuntando en ella y no es un diario." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "The thirteenth of March. Nuria turns thirteen and she's been reminding everyone since January with the regularity of an alarm clock." },
      { quien: "carmen", animo: "decidido", texto: "Eight o'clock, at home. Both of you. And I say both because your father also has a habit of working." },
      { quien: "nuria", animo: "decidido", texto: "I've asked for the usual cake. And I said I'm cutting it, so don't be late." },
      { quien: "dani", animo: "neutro", texto: "Eight o'clock." },
      { quien: "nuria", animo: "neutro", texto: "Eight. I'm writing it down, mind. I've got a notebook and everything." },
      { quien: null, animo: "neutro", texto: "She has. She's been writing in it for two months and it isn't a diary." },
    ],
  },

  c5_aviso: {
    es: [
      { quien: null, animo: "tenso", texto: "Las siete y cuarenta. Estás en el portal con la tarta en una bolsa." },
      { quien: null, animo: "tenso", texto: "En el móvil, la emisora de la grúa del puerto: un hombre con un armazón de obra ha reventado el cajero del muelle y va por el segundo." },
      { quien: "isma", animo: "tenso", texto: "Dani. Dani, ¿estás viendo esto?" },
      { quien: null, animo: "neutro", texto: "Arriba hay una mesa puesta para cuatro y una niña de trece años con un cuchillo de tarta en la mano." },
      { quien: null, animo: "roto", texto: "Abajo hay un puerto." },
      { quien: null, animo: "tenso", texto: "El juego no te va a decir cuál es la respuesta correcta. Éste es el capítulo en que aprendes que no hay." },
    ],
    en: [
      { quien: null, animo: "tenso", texto: "Seven forty. You're in the doorway with the cake in a bag." },
      { quien: null, animo: "tenso", texto: "On your phone, the port crane frequency: a man in a construction rig has taken out the cash machine on the quay and is starting on the second." },
      { quien: "isma", animo: "tenso", texto: "Dani. Dani, are you seeing this?" },
      { quien: null, animo: "neutro", texto: "Upstairs there's a table laid for four and a thirteen-year-old holding a cake knife." },
      { quien: null, animo: "roto", texto: "Downstairs there's a port." },
      { quien: null, animo: "tenso", texto: "The game isn't going to tell you which answer is right. This is the chapter where you learn there isn't one." },
    ],
  },

  c5_gruas: {
    es: [
      { quien: null, animo: "neutro", texto: "Muelle cuatro. Las grúas son de los sesenta y suenan como suena el metal viejo cuando alguien lo obliga." },
      { quien: "hierro", animo: "tenso", texto: "Este sitio no es para chavales. Date la vuelta." },
      { quien: "dani", animo: "decidido", texto: "Suelte el cajero." },
      { quien: "hierro", animo: "neutro", texto: "El cajero son dos mil doscientos. Me faltan catorce mil." },
      { quien: "dani", animo: "tenso", texto: "¿Catorce mil para qué?" },
      { quien: "hierro", animo: "roto", texto: "Eso no te lo voy a decir. Porque si te lo digo, ya no puedes pegarme." },
      { quien: null, animo: "tenso", texto: "El armazón pesa cuarenta kilos y él lleva puesto un año. Se le nota en cómo apoya el pie derecho." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "Quay four. The cranes are from the sixties and they sound the way old metal sounds when somebody makes it move." },
      { quien: "hierro", animo: "tenso", texto: "This place isn't for kids. Turn around." },
      { quien: "dani", animo: "decidido", texto: "Step away from the machine." },
      { quien: "hierro", animo: "neutro", texto: "That machine is two thousand two hundred. I'm fourteen thousand short." },
      { quien: "dani", animo: "tenso", texto: "Fourteen thousand for what?" },
      { quien: "hierro", animo: "roto", texto: "I'm not telling you that. Because if I tell you, you can't hit me any more." },
      { quien: null, animo: "tenso", texto: "The rig weighs forty kilos and he's had it on a year. You can see it in how he plants his right foot." },
    ],
  },

  c5_epilogo: {
    es: [
      { quien: null, animo: "neutro", texto: "Vuelves a las once y cuarto. La tarta está cortada y hay un plato con tu nombre escrito en un pósit." },
      { quien: "nuria", animo: "neutro", texto: "Está en la nevera. No la he tirado." },
      { quien: "dani", animo: "roto", texto: "Nuria—" },
      { quien: "nuria", animo: "tenso", texto: "No pasa nada. En serio. Que no pasa nada." },
      { quien: null, animo: "roto", texto: "Cierra la puerta de su cuarto sin dar un portazo. Ya sabes lo que significa eso." },
      { quien: null, animo: "tenso", texto: "A las dos de la mañana, en el muelle cuatro, medio manto negro sigue colgando del brazo de la grúa." },
      { quien: null, animo: "tenso", texto: "Yusuf lo verá a las seis y llegará antes que el de seguridad. Pero eso no lo sabes todavía." },
      { quien: null, animo: "neutro", texto: "Ésta es la primera pista Física del juego, y no la deja el enemigo: la deja tu traje." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "You get back at quarter past eleven. The cake is cut and there's a plate with your name on a sticky note." },
      { quien: "nuria", animo: "neutro", texto: "It's in the fridge. I didn't throw it out." },
      { quien: "dani", animo: "roto", texto: "Nuria—" },
      { quien: "nuria", animo: "tenso", texto: "It's fine. Honestly. It's fine." },
      { quien: null, animo: "roto", texto: "She shuts her bedroom door without slamming it. You know what that means by now." },
      { quien: null, animo: "tenso", texto: "At two in the morning, on quay four, half a black cloak is still hanging from the crane arm." },
      { quien: null, animo: "tenso", texto: "Yusuf will see it at six and get there before security does. But you don't know that yet." },
      { quien: null, animo: "neutro", texto: "This is the game's first Physical clue, and the enemy didn't leave it. Your suit did." },
    ],
  },

  /* ══ CAPÍTULO 6 · EL FARO ════════════════════════════════════════════════════════ */

  c6_seguido: {
    es: [
      { quien: null, animo: "tenso", texto: "Llevas cuatro noches con la misma sensación y las cuatro te has dicho que era el cansancio." },
      { quien: null, animo: "neutro", texto: "La quinta, al girar en la calle del río, hay alguien parado bajo la farola apagada." },
      { quien: null, animo: "tenso", texto: "No corre. No se esconde. Espera a que la mires y entonces echa a andar hacia el Cerro del Faro." },
      { quien: "dani", animo: "tenso", texto: "…vale." },
      { quien: null, animo: "neutro", texto: "Ciento doce escalones. Los cuentas porque no puedes hacer otra cosa mientras subes." },
    ],
    en: [
      { quien: null, animo: "tenso", texto: "Four nights with the same feeling and four times you've told yourself it was tiredness." },
      { quien: null, animo: "neutro", texto: "The fifth, turning into the river road, there's somebody standing under the dead streetlight." },
      { quien: null, animo: "tenso", texto: "She doesn't run. She doesn't hide. She waits until you look at her and then walks off towards Cerro del Faro." },
      { quien: "dani", animo: "tenso", texto: "…all right." },
      { quien: null, animo: "neutro", texto: "A hundred and twelve steps. You count them because there's nothing else to do while you climb." },
    ],
  },

  c6_vigia: {
    es: [
      { quien: null, animo: "neutro", texto: "El faro lleva doce años apagado y sigue siendo el punto más alto de Marés." },
      { quien: "vigia", animo: "neutro", texto: "Has subido los ciento doce. Nadie los sube por casualidad." },
      { quien: "dani", animo: "tenso", texto: "¿Quién eres?" },
      { quien: "vigia", animo: "neutro", texto: "Ésa es la pregunta que hacen los que empiezan. La contestaré, pero no hoy." },
      { quien: "vigia", animo: "decidido", texto: "Levanta la guardia. No vas a ganar y no hace falta que ganes." },
      { quien: null, animo: "tenso", texto: "Dura once segundos. En los once no te toca ni una vez: te ciega, se mueve y aparece detrás." },
      { quien: "vigia", animo: "neutro", texto: "La Luz no es para pegar. Es para que el otro deje de saber dónde estás." },
      { quien: "vigia", animo: "tenso", texto: "Me eligieron hace nueve años. Hoy no tengo ni nombre. Mira bien, que estás viendo un final posible." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "The lighthouse has been dark twelve years and it's still the highest point in Marés." },
      { quien: "vigia", animo: "neutro", texto: "You climbed all hundred and twelve. Nobody does that by accident." },
      { quien: "dani", animo: "tenso", texto: "Who are you?" },
      { quien: "vigia", animo: "neutro", texto: "That's the question beginners ask. I'll answer it, but not today." },
      { quien: "vigia", animo: "decidido", texto: "Guard up. You won't win and you don't need to." },
      { quien: null, animo: "tenso", texto: "It lasts eleven seconds. In those eleven she doesn't touch you once: she blinds you, moves, and is behind you." },
      { quien: "vigia", animo: "neutro", texto: "Light isn't for hitting. It's for stopping them knowing where you are." },
      { quien: "vigia", animo: "tenso", texto: "They chose me nine years ago. Today I haven't even got a name. Look properly — you're looking at one of your endings." },
    ],
  },

  c6_dos: {
    es: [
      { quien: null, animo: "tenso", texto: "Las diez y cincuenta. Dos avisos en la misma emisora, con doce segundos de diferencia." },
      { quien: null, animo: "tenso", texto: "La Concha: tres encapuchados y una persiana arrancada." },
      { quien: null, animo: "tenso", texto: "Barrio de las Aguas: escape de gas en un cuarto piso con la escalera bloqueada." },
      { quien: "dani", animo: "roto", texto: "Están a veinte minutos el uno del otro." },
      { quien: "vigia", animo: "neutro", texto: "Veintidós. Los he cronometrado los dos años que me tocaron a mí." },
      { quien: "dani", animo: "tenso", texto: "Tiene que haber una ruta." },
      { quien: "vigia", animo: "tenso", texto: "No la hay. Y buscarla es la manera más rápida de no llegar a ninguno de los dos." },
      { quien: "vigia", animo: "decidido", texto: "Elige rápido. Lo que te va a doler no es la elección: es el rato de después." },
    ],
    en: [
      { quien: null, animo: "tenso", texto: "Ten fifty. Two calls on the same frequency, twelve seconds apart." },
      { quien: null, animo: "tenso", texto: "La Concha: three hooded men and a shutter torn off." },
      { quien: null, animo: "tenso", texto: "Barrio de las Aguas: gas leak on a fourth floor with the stairwell blocked." },
      { quien: "dani", animo: "roto", texto: "They're twenty minutes apart." },
      { quien: "vigia", animo: "neutro", texto: "Twenty-two. I timed it, both years I had." },
      { quien: "dani", animo: "tenso", texto: "There has to be a route." },
      { quien: "vigia", animo: "tenso", texto: "There isn't. And looking for one is the fastest way to reach neither." },
      { quien: "vigia", animo: "decidido", texto: "Choose fast. It isn't the choice that hurts. It's the hour afterwards." },
    ],
  },

  c6_epilogo: {
    es: [
      { quien: null, animo: "neutro", texto: "El otro aviso se resolvió sin ti. Eso es lo que dice el parte y es literalmente cierto." },
      { quien: null, animo: "neutro", texto: "Los bomberos llegaron en catorce minutos. Sacaron a los tres del cuarto. Uno con una intoxicación leve." },
      { quien: "carmen", animo: "neutro", texto: "Leve significa que se va a casa el mismo día." },
      { quien: "carmen", animo: "roto", texto: "También significa que ha pasado catorce minutos creyendo que se moría." },
      { quien: null, animo: "tenso", texto: "No te lo dice a ti. Se lo dice a la taza, a las seis de la mañana, con el abrigo puesto." },
      { quien: null, animo: "neutro", texto: "Y arriba, en el Cerro del Faro, hay una mujer sin nombre que se pasó dos años haciendo exactamente esta cuenta." },
      { quien: null, animo: "tenso", texto: "Éste es el capítulo donde el juego deja de perdonar. No hay una versión de esta noche en la que llegues a los dos sitios." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "The other call was resolved without you. That's what the report says and it's literally true." },
      { quien: null, animo: "neutro", texto: "The brigade got there in fourteen minutes. Brought all three down from the fourth floor. One mild poisoning." },
      { quien: "carmen", animo: "neutro", texto: "Mild means he goes home the same day." },
      { quien: "carmen", animo: "roto", texto: "It also means he spent fourteen minutes believing he was dying." },
      { quien: null, animo: "tenso", texto: "She isn't saying it to you. She's saying it to the cup, at six in the morning, with her coat still on." },
      { quien: null, animo: "neutro", texto: "And up on Cerro del Faro there's a woman with no name who spent two years doing exactly this arithmetic." },
      { quien: null, animo: "tenso", texto: "This is the chapter where the game stops forgiving. There is no version of tonight where you reach both." },
    ],
  },

  /* ══ CAPÍTULO 7 · EL FARO DE MARÉS ═══════════════════════════════════════════════ */

  c7_trato: {
    es: [
      { quien: "marga", animo: "decidido", texto: "Te propongo un trato, y te lo propongo bien: yo controlo el relato." },
      { quien: "dani", animo: "tenso", texto: "Yo no soy quien usted cree." },
      { quien: "marga", animo: "neutro", texto: "Perfecto. Entonces esto es una conversación entre una periodista y un chaval cualquiera. Sigue escuchando." },
      { quien: "marga", animo: "neutro", texto: "Sin mí, la primera versión la escribe mi jefe. Y mi jefe escribe «menor descontrolado» porque vende más." },
      { quien: "marga", animo: "tenso", texto: "Conmigo se escribe otra cosa. No mejor: otra." },
      { quien: "dani", animo: "neutro", texto: "¿Y usted qué saca?" },
      { quien: "marga", animo: "neutro", texto: "Una exclusiva y dormir por las noches. Llevo dieciocho años eligiendo entre las dos." },
    ],
    en: [
      { quien: "marga", animo: "decidido", texto: "I'm offering you a deal, and offering it straight: I control the story." },
      { quien: "dani", animo: "tenso", texto: "I'm not who you think I am." },
      { quien: "marga", animo: "neutro", texto: "Perfect. Then this is a conversation between a journalist and some kid. Keep listening." },
      { quien: "marga", animo: "neutro", texto: "Without me, my editor writes the first version. And my editor writes 'uncontrolled minor' because it sells." },
      { quien: "marga", animo: "tenso", texto: "With me it gets written differently. Not better: differently." },
      { quien: "dani", animo: "neutro", texto: "And what do you get?" },
      { quien: "marga", animo: "neutro", texto: "An exclusive and a night's sleep. I've spent eighteen years choosing between the two." },
    ],
  },

  c7_nombre: {
    es: [
      { quien: null, animo: "neutro", texto: "El Faro de Marés, edición del jueves. Portada, por primera vez." },
      { quien: null, animo: "decidido", texto: "«FULGOR»." },
      { quien: "marga", animo: "neutro", texto: "No me lo inventé yo. Lo dijo una señora del once, llorando, y lo que se dice llorando se queda." },
      { quien: "isma", animo: "decidido", texto: "¡TIENE NOMBRE! Tío, ¿tú entiendes lo que significa que tenga nombre?" },
      { quien: "dani", animo: "tenso", texto: "Que ya no es un rumor." },
      { quien: "isma", animo: "neutro", texto: "Que ya es una persona. Y las personas tienen dirección." },
      { quien: null, animo: "tenso", texto: "El Rango sube. Y con el Rango sube todo lo demás, que es lo que nadie te avisó." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "El Faro de Marés, Thursday edition. Front page, for the first time." },
      { quien: null, animo: "decidido", texto: "'FULGOR'." },
      { quien: "marga", animo: "neutro", texto: "I didn't invent it. A woman from number eleven said it in tears, and what's said in tears sticks." },
      { quien: "isma", animo: "decidido", texto: "HE'S GOT A NAME! Mate, do you understand what a name means?" },
      { quien: "dani", animo: "tenso", texto: "That he isn't a rumour." },
      { quien: "isma", animo: "neutro", texto: "That he's a person. And people have addresses." },
      { quien: null, animo: "tenso", texto: "Standing goes up. And everything else goes up with it, which is the part nobody warned you about." },
    ],
  },

  c7_ciudad: {
    es: [
      { quien: null, animo: "neutro", texto: "En dos semanas, Marés decide qué piensa. Y no lo decide de una sola manera." },
      { quien: null, animo: "neutro", texto: "En el muro del Puerto Viejo hay una pintada de un rayo hecha con plantilla. Alguien la ha repetido cuatro veces por la misma calle." },
      { quien: "pilar", animo: "neutro", texto: "El niño del cuarto se ha hecho un manto con una sábana. Su madre está entre orgullosa y desesperada." },
      { quien: "oscar", animo: "tenso", texto: "A mí me parece un flipado. Un flipado con suerte." },
      { quien: "julia", animo: "neutro", texto: "En mi casa se cena viendo las noticias. Anoche salías tú y mi padre dejó el tenedor en el plato." },
      { quien: null, animo: "tenso", texto: "Y en una oficina prestada, un mapa de Marés ha pasado de una chincheta a nueve." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "In two weeks Marés makes up its mind. And it doesn't make it up one way." },
      { quien: null, animo: "neutro", texto: "On a wall in Puerto Viejo there's a stencilled lightning bolt. Somebody's repeated it four times down the same street." },
      { quien: "pilar", animo: "neutro", texto: "The boy on the fourth has made a cloak out of a bedsheet. His mother is somewhere between proud and desperate." },
      { quien: "oscar", animo: "tenso", texto: "I reckon he's a show-off. A lucky show-off." },
      { quien: "julia", animo: "neutro", texto: "We eat in front of the news at my house. You were on it last night and my father put his fork down." },
      { quien: null, animo: "tenso", texto: "And in a borrowed office, a map of Marés has gone from one pin to nine." },
    ],
  },

  c7_chinchetas: {
    es: [
      { quien: null, animo: "neutro", texto: "Comisaría de Marés, tercera planta, una oficina que era un archivo hasta hace un mes." },
      { quien: "sabater", animo: "neutro", texto: "Nueve chinchetas. Nueve incidentes con hora." },
      { quien: null, animo: "neutro", texto: "Traza una circunferencia con un vaso. Le sale de novecientos metros de radio." },
      { quien: "sabater", animo: "decidido", texto: "Nadie va a nueve sitios distintos por azar. La gente va a los suyos." },
      { quien: "sabater", animo: "neutro", texto: "Instituto. Un bloque de las Aguas. Un locutorio del puerto. Un hospital." },
      { quien: "sabater", animo: "tenso", texto: "Esto no es un radio de operaciones. Esto es la vida de alguien." },
      { quien: null, animo: "tenso", texto: "Se queda mirando el mapa un rato largo y no apunta nada. Ése es su método: no escribe hasta estar segura." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "Marés station, third floor, an office that was a records room a month ago." },
      { quien: "sabater", animo: "neutro", texto: "Nine pins. Nine incidents with times." },
      { quien: null, animo: "neutro", texto: "She draws a circle round them with a glass. It comes out at nine hundred metres." },
      { quien: "sabater", animo: "decidido", texto: "Nobody goes to nine different places by chance. People go to their own." },
      { quien: "sabater", animo: "neutro", texto: "A school. A block in Aguas. A phone shop at the port. A hospital." },
      { quien: "sabater", animo: "tenso", texto: "This isn't an operating radius. This is somebody's life." },
      { quien: null, animo: "tenso", texto: "She looks at the map for a long time and writes nothing down. That's her method: she doesn't write until she's sure." },
    ],
  },

  c7_epilogo: {
    es: [
      { quien: null, animo: "neutro", texto: "Cuarenta y un vídeos esa noche. Los cuenta Isma, uno por uno, hasta las tres de la mañana." },
      { quien: "isma", animo: "tenso", texto: "En treinta y ocho no se te ve la cara. En dos tampoco." },
      { quien: "dani", animo: "tenso", texto: "¿Y en el que falta?" },
      { quien: "isma", animo: "roto", texto: "En el que falta se te ve la mano izquierda. Con la cicatriz." },
      { quien: null, animo: "tenso", texto: "La cicatriz que te hiciste a los nueve años con la puerta del garaje y que sale en catorce fotos del móvil de tu madre." },
      { quien: "isma", animo: "decidido", texto: "Voy a hacer que ese vídeo se pierda. No me preguntes cómo." },
      { quien: null, animo: "neutro", texto: "Y ahí, sin ceremonia y sin que nadie lo diga en voz alta, Isma deja de ser un testigo y se convierte en otra cosa." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "Forty-one videos that night. Isma counts them, one by one, until three in the morning." },
      { quien: "isma", animo: "tenso", texto: "In thirty-eight you can't see your face. In two you can't either." },
      { quien: "dani", animo: "tenso", texto: "And the one that's left?" },
      { quien: "isma", animo: "roto", texto: "In the one that's left you can see your left hand. With the scar." },
      { quien: null, animo: "tenso", texto: "The scar you got at nine on the garage door, which appears in fourteen photographs on your mother's phone." },
      { quien: "isma", animo: "decidido", texto: "I'm going to make that video disappear. Don't ask me how." },
      { quien: null, animo: "neutro", texto: "And there, with no ceremony and nobody saying it out loud, Isma stops being a witness and becomes something else." },
    ],
  },

  /* ══ CAPÍTULO 8 · LO QUE ISMA SABÍA ══════════════════════════════════════════════
   * Punto medio. El expediente de Isma se cierra pase lo que pase: está guionizado y la
   * única variable es CÓMO. Y la Intervención es la única derrota obligatoria del juego.
   */

  c8_carpeta: {
    es: [
      { quien: null, animo: "neutro", texto: "La carpeta de Isma ya no cabe en la mochila. Ahora es una caja de zapatos y vive debajo de su cama." },
      { quien: null, animo: "neutro", texto: "Dentro hay diecinueve incidentes, un mapa con hilo rojo y una hoja aparte que no está en el mapa." },
      { quien: null, animo: "tenso", texto: "La hoja aparte se titula «coincidencias que no me gustan»." },
      { quien: "isma", animo: "roto", texto: "Llevo tres semanas intentando que esta hoja se equivoque." },
      { quien: "isma", animo: "neutro", texto: "He probado con otros seis compañeros. Con seis me falla. Contigo no me falla ni una." },
      { quien: "dani", animo: "tenso", texto: "Isma…" },
      { quien: "isma", animo: "tenso", texto: "No. Hoy no. Hoy todavía no quiero saberlo." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "Isma's folder doesn't fit in his bag any more. It's a shoebox now and it lives under his bed." },
      { quien: null, animo: "neutro", texto: "Inside: nineteen incidents, a map with red thread, and a separate sheet that isn't on the map." },
      { quien: null, animo: "tenso", texto: "The separate sheet is headed 'coincidences I don't like'." },
      { quien: "isma", animo: "roto", texto: "Three weeks I've been trying to make this sheet wrong." },
      { quien: "isma", animo: "neutro", texto: "I've tried it on six other people in our year. With six it fails. With you it doesn't fail once." },
      { quien: "dani", animo: "tenso", texto: "Isma…" },
      { quien: "isma", animo: "tenso", texto: "No. Not today. Today I still don't want to know." },
    ],
  },

  c8_azotea: {
    es: [
      { quien: null, animo: "neutro", texto: "La azotea del instituto. Se sube por la escalera de incendios y lo sabe medio tercero." },
      { quien: "isma", animo: "neutro", texto: "Vale. Ya quiero saberlo." },
      { quien: null, animo: "neutro", texto: "Deja la hoja boca arriba entre los dos y no la señala. No hace falta." },
      { quien: "isma", animo: "tenso", texto: "El martes de la joyería faltaste a tercera. El día del incendio bajaste a por el pan y tardaste cuarenta minutos." },
      { quien: "isma", animo: "roto", texto: "Y el día de las grúas te fuiste del cumpleaños de tu hermana. Del CUMPLEAÑOS de tu hermana, Dani." },
      { quien: "dani", animo: "roto", texto: "…sí." },
      { quien: "isma", animo: "roto", texto: "¿Sí a qué?" },
      { quien: "dani", animo: "decidido", texto: "Sí a todo." },
      { quien: null, animo: "neutro", texto: "Isma no dice nada durante once segundos. Es lo más callado que ha estado en once años." },
      { quien: "isma", animo: "tenso", texto: "Vale. Vale, vale, vale. …¿Y ahora qué hago yo con esto?" },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "The school roof. You get up by the fire escape and half the year knows it." },
      { quien: "isma", animo: "neutro", texto: "Right. Now I want to know." },
      { quien: null, animo: "neutro", texto: "He lays the sheet face up between you and doesn't point at it. He doesn't have to." },
      { quien: "isma", animo: "tenso", texto: "The Tuesday of the jeweller's you missed third period. The day of the fire you went out for bread and took forty minutes." },
      { quien: "isma", animo: "roto", texto: "And the day of the cranes you left your sister's birthday. Her BIRTHDAY, Dani." },
      { quien: "dani", animo: "roto", texto: "…yes." },
      { quien: "isma", animo: "roto", texto: "Yes to what?" },
      { quien: "dani", animo: "decidido", texto: "Yes to all of it." },
      { quien: null, animo: "neutro", texto: "Isma says nothing for eleven seconds. It's the quietest he's been in eleven years." },
      { quien: "isma", animo: "tenso", texto: "Right. Right, right, right. …So what do I do with this now?" },
    ],
  },

  c8_larga: {
    es: [
      { quien: null, animo: "neutro", texto: "El laboratorio de Requena, a las dos y diez de la madrugada. La puerta está abierta y no está forzada." },
      { quien: null, animo: "tenso", texto: "Hay alguien de pie entre las mesas, y a su alrededor no hay sombras: hay ausencia de luz, que no es lo mismo." },
      { quien: "larga", animo: "neutro", texto: "Has tardado. Llevo aquí desde que apagaron la última farola." },
      { quien: "dani", animo: "decidido", texto: "Suelta eso." },
      { quien: "larga", animo: "neutro", texto: "Un cuaderno de tapas rojas. Ni siquiera sabes lo que hay dentro." },
      { quien: "larga", animo: "tenso", texto: "Haces mucha luz para alguien que quiere esconderse. Yo te veo desde tres calles." },
      { quien: null, animo: "tenso", texto: "Lo que viene ahora no lo vas a ganar, y no es por cómo juegues." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "Requena's lab, ten past two in the morning. The door is open and it hasn't been forced." },
      { quien: null, animo: "tenso", texto: "Somebody is standing between the benches, and around her there aren't shadows: there's absence of light, which isn't the same." },
      { quien: "larga", animo: "neutro", texto: "You took your time. I've been here since the last streetlight went." },
      { quien: "dani", animo: "decidido", texto: "Put that down." },
      { quien: "larga", animo: "neutro", texto: "A notebook with red covers. You don't even know what's in it." },
      { quien: "larga", animo: "tenso", texto: "You make a lot of light for someone trying to hide. I see you from three streets away." },
      { quien: null, animo: "tenso", texto: "What comes next you aren't going to win, and it isn't about how you play." },
    ],
  },

  c8_epilogo: {
    es: [
      { quien: null, animo: "roto", texto: "Callejón de la calle del río. Las tres y cuarto. Llevas veinte minutos sin poder levantarte del todo." },
      { quien: null, animo: "neutro", texto: "No te ha rematado. Podía y no lo ha hecho, y eso te va a durar más que las costillas." },
      { quien: "larga", animo: "neutro", texto: "Te dejo porque me lo han pedido. No porque no pudiera acabar." },
      { quien: "larga", animo: "tenso", texto: "Piénsalo despacio: hay alguien que prefiere que sigas andando." },
      { quien: null, animo: "tenso", texto: "Esa noche tu madre está de guardia. Entras por urgencias porque no hay otra puerta abierta a las cuatro." },
      { quien: "carmen", animo: "roto", texto: "…Dani." },
      { quien: null, animo: "roto", texto: "No pregunta. Te cose la ceja, te mira la pupila con la linternita y no pregunta nada." },
      { quien: "carmen", animo: "tenso", texto: "Cuando puedas hablar, hablas. Yo estoy aquí hasta las ocho." },
    ],
    en: [
      { quien: null, animo: "roto", texto: "An alley off the river road. Quarter past three. Twenty minutes and you still can't get fully up." },
      { quien: null, animo: "neutro", texto: "She didn't finish it. She could have and didn't, and that will last you longer than the ribs." },
      { quien: "larga", animo: "neutro", texto: "I'm leaving you because I was told to. Not because I couldn't finish." },
      { quien: "larga", animo: "tenso", texto: "Think it through slowly: somebody would rather you kept walking." },
      { quien: null, animo: "tenso", texto: "Your mother is on shift that night. You come in through A&E because no other door is open at four." },
      { quien: "carmen", animo: "roto", texto: "…Dani." },
      { quien: null, animo: "roto", texto: "She doesn't ask. She stitches your eyebrow, checks your pupils with the little torch, and asks nothing." },
      { quien: "carmen", animo: "tenso", texto: "When you can talk, you'll talk. I'm here until eight." },
    ],
  },

  /* ── Apertura de Intervención decisiva ────────────────────────────── */

  c7_publico: {
    es: [
      { quien: null, animo: "neutro", texto: "Plaza de La Concha, sábado, ocho y media. Es la hora a la que la plaza está más llena en toda la semana." },
      { quien: null, animo: "tenso", texto: "Y por eso lo han hecho a esta hora." },
      { quien: "isma", animo: "tenso", texto: "Dani, hay doscientas personas. Doscientas, y todas con un móvil." },
      { quien: null, animo: "neutro", texto: "Ganar aquí es fácil: tres tipos y una furgoneta." },
      { quien: null, animo: "tenso", texto: "Ganar aquí sin salir en cuarenta vídeos es otra cosa completamente distinta." },
      { quien: "vigia", animo: "neutro", texto: "Recuerda: deslumbra y muévete. Nunca deslumbres y te quedes a mirar el resultado." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "La Concha plaza, Saturday, half past eight. The busiest hour of the week." },
      { quien: null, animo: "tenso", texto: "Which is why they've done it at this hour." },
      { quien: "isma", animo: "tenso", texto: "Dani, there are two hundred people. Two hundred, all holding phones." },
      { quien: null, animo: "neutro", texto: "Winning here is easy: three men and a van." },
      { quien: null, animo: "tenso", texto: "Winning here without ending up in forty videos is something else entirely." },
      { quien: "vigia", animo: "neutro", texto: "Remember: blind and move. Never blind and stand watching the result." },
    ],
  },

};
