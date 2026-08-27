/**
 * FULGOR — ACTO I · EL ELEGIDO (capítulos 1-4).
 *
 * Cada escena es una lista de líneas: `quien` (id del reparto, o `null` para el narrador),
 * `animo` (uno de los cuatro que pinta `world/sprites.js`) y `texto`. Nada más. Ninguna
 * regla vive aquí — quién puede jugarla y qué banderas escribe lo dice `story.js`.
 *
 * ══ POR QUÉ EXISTE ESTE ARCHIVO ════════════════════════════════════════════════════
 *
 * `story.js` tenía las doce estructuras de capítulo escritas desde el primer día, con sus
 * escenas, sus banderas y su Intervención decisiva. Y de las treinta y tres escenas, sólo
 * las de los tres primeros capítulos tenían texto: las demás llevaban `texto: null`. La
 * campaña entera —el punto medio, el apagón, las Tolvas, el nombre— existía como grafo y no
 * como historia.
 *
 * Peor: `game.js` exponía `pendingScenes()` y `playScene()`, y NADIE LOS LLAMABA. La fase
 * `ESCENA` estaba declarada, tenía su caso en el reductor y su pintor en `scene.jsx`, y no
 * se alcanzaba nunca. Doce capítulos de guion que el jugador no podía ver ni queriendo.
 *
 * ══ LA CADENCIA ════════════════════════════════════════════════════════════════════
 *
 * El §9 pide para cada capítulo el mismo compás que un capítulo de la referencia:
 * **apertura civil → días libres → escalada → Intervención decisiva → epílogo**. Las
 * escenas de apertura y de escalada se reparten por bloques (`manana`, `tarde`, `noche`) y
 * salen cuando el calendario llega a su bloque; el epílogo es una escena aparte que se juega
 * DESPUÉS del balance de la decisiva, y es la que convierte una victoria en una consecuencia.
 *
 * Sin epílogo, ganar una Intervención devolvía al jugador a un menú. Con epílogo, ganar te
 * devuelve a tu cocina a las seis de la mañana con tu madre sin decir nada.
 */

export const ACTO_I = {

  /* ══ CAPÍTULO 1 · LA LLAVE ═══════════════════════════════════════════════════════
   * La vida antes. Un día entero sin una sola mención a superpoderes: eso es el capítulo.
   * Todo lo que aquí parece relleno —un examen, una hermana, un amigo pesado— es lo que
   * el resto de la campaña va a poner en riesgo, y por eso ocupa media hora.
   */

  c1_aula: {
    es: [
      { quien: null, animo: "neutro", texto: "IES Miguel Servet. Tercera hora. Un martes de octubre como otro cualquiera." },
      { quien: "requena", animo: "neutro", texto: "Una espira de cobre. Un imán. Y entre los dos, nada: ni cable, ni contacto, ni truco." },
      { quien: "requena", animo: "decidido", texto: "Muevo el imán… y en la espira aparece corriente. ¿De dónde ha salido esa corriente?" },
      { quien: "dani", animo: "neutro", texto: "Del campo. Del cambio del campo." },
      { quien: "requena", animo: "neutro", texto: "Del CAMBIO del campo. Muy bien, Vela. Un campo quieto no hace nada." },
      { quien: null, animo: "neutro", texto: "Requena se queda mirando la espira un segundo de más. Como si le hubiera recordado algo." },
      { quien: "requena", animo: "tenso", texto: "…El viernes, examen. Hasta el tema ocho." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "IES Miguel Servet. Third period. An October Tuesday like any other." },
      { quien: "requena", animo: "neutro", texto: "A copper coil. A magnet. And between them, nothing: no wire, no contact, no trick." },
      { quien: "requena", animo: "decidido", texto: "I move the magnet — and current appears in the coil. Where did that current come from?" },
      { quien: "dani", animo: "neutro", texto: "The field. The change in the field." },
      { quien: "requena", animo: "neutro", texto: "The CHANGE in the field. Very good, Vela. A still field does nothing at all." },
      { quien: null, animo: "neutro", texto: "Requena looks at the coil a second too long. As though it had reminded him of something." },
      { quien: "requena", animo: "tenso", texto: "…Friday. Exam. Up to unit eight." },
    ],
  },

  c1_pasillo: {
    es: [
      { quien: "isma", animo: "decidido", texto: "¿Vienes luego? He encontrado una cosa. Una cosa de las buenas." },
      { quien: "dani", animo: "neutro", texto: "Isma, la última cosa de las buenas era una farola." },
      { quien: "isma", animo: "decidido", texto: "¡Una farola que se apagó sola! No me lo has rebatido nunca, sólo te has reído." },
      { quien: "isma", animo: "neutro", texto: "Esta es mejor. Tiene fecha, tiene hora y tiene un edificio que no debería tener luz." },
      { quien: "dani", animo: "neutro", texto: "Luego. Que hoy me toca recoger a Nuria." },
      { quien: "isma", animo: "neutro", texto: "Siempre te toca recoger a Nuria. Un día voy a pensar que la usas de excusa." },
      { quien: null, animo: "neutro", texto: "Se ríe. Todavía es un chiste. Dentro de siete capítulos ya no lo será." },
    ],
    en: [
      { quien: "isma", animo: "decidido", texto: "You coming later? I've found something. One of the good ones." },
      { quien: "dani", animo: "neutro", texto: "Isma, the last good one was a streetlight." },
      { quien: "isma", animo: "decidido", texto: "A streetlight that went out on its own! You've never argued it, you've only laughed." },
      { quien: "isma", animo: "neutro", texto: "This one's better. It's got a date, a time, and a building that shouldn't have power." },
      { quien: "dani", animo: "neutro", texto: "Later. I've got Nuria today." },
      { quien: "isma", animo: "neutro", texto: "You've always got Nuria. One day I'll start thinking you use her as an excuse." },
      { quien: null, animo: "neutro", texto: "He laughs. It's still a joke. Seven chapters from now it won't be." },
    ],
  },

  c1_casa: {
    es: [
      { quien: null, animo: "neutro", texto: "Barrio de las Aguas. Cuarto piso sin ascensor, que es como se mide el barrio." },
      { quien: null, animo: "neutro", texto: "Nuria está escribiendo en la mesa de la cocina y tapa el cuaderno con el brazo cuando entras. Como siempre." },
      { quien: "nuria", animo: "tenso", texto: "No he oído la puerta." },
      { quien: "dani", animo: "neutro", texto: "Porque estabas escribiendo. ¿Qué es?" },
      { quien: "nuria", animo: "neutro", texto: "Nada. Deberes." },
      { quien: "dani", animo: "neutro", texto: "Los deberes no se tapan." },
      { quien: "nuria", animo: "decidido", texto: "Los míos sí. Y mamá entra a las diez, así que la cena la haces tú." },
      { quien: null, animo: "neutro", texto: "Papá llegará sobre las nueve, dejará el mono en el lavadero y hablará de la red eléctrica. Es martes." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "Barrio de las Aguas. Fourth floor, no lift, which is how you measure the neighbourhood." },
      { quien: null, animo: "neutro", texto: "Nuria is writing at the kitchen table and covers the notebook with her arm when you come in. As always." },
      { quien: "nuria", animo: "tenso", texto: "I didn't hear the door." },
      { quien: "dani", animo: "neutro", texto: "Because you were writing. What is it?" },
      { quien: "nuria", animo: "neutro", texto: "Nothing. Homework." },
      { quien: "dani", animo: "neutro", texto: "You don't cover homework." },
      { quien: "nuria", animo: "decidido", texto: "I cover mine. And Mum starts at ten, so dinner's on you." },
      { quien: null, animo: "neutro", texto: "Dad will be back around nine, hang his overalls in the utility room and talk about the grid. It's Tuesday." },
    ],
  },

  c1_llave: {
    es: [
      { quien: null, animo: "neutro", texto: "Bajas a tirar la basura. Son las nueve y cuarto y hace el frío que hace en octubre en una ciudad de mar." },
      { quien: null, animo: "neutro", texto: "Hay una llave en el suelo, delante de tu portal." },
      { quien: null, animo: "neutro", texto: "No es de casa. Es larga, gruesa y vieja, de las de candado industrial." },
      { quien: null, animo: "tenso", texto: "Y debajo hay un papel doblado en cuatro." },
      { quien: null, animo: "tenso", texto: "«Si has leído esto, eres el elegido. Nave 7, Polígono Norte. Esta noche.»" },
      { quien: "dani", animo: "neutro", texto: "…Óscar. Esto es de Óscar." },
      { quien: null, animo: "neutro", texto: "No es de Óscar. Y en el fondo ya lo sabes, porque te la estás guardando en el bolsillo." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "You go down with the bins. Quarter past nine, and as cold as October gets in a sea town." },
      { quien: null, animo: "neutro", texto: "There's a key on the ground in front of your door." },
      { quien: null, animo: "neutro", texto: "Not a house key. Long, thick and old — the kind that opens an industrial padlock." },
      { quien: null, animo: "tenso", texto: "And underneath it, a sheet of paper folded in four." },
      { quien: null, animo: "tenso", texto: "'If you are reading this, you are the chosen one. Unit 7, Polígono Norte. Tonight.'" },
      { quien: "dani", animo: "neutro", texto: "…Óscar. This is Óscar." },
      { quien: null, animo: "neutro", texto: "It isn't Óscar. And you know it, because you're already putting it in your pocket." },
    ],
  },

  c1_subestacion: {
    es: [
      { quien: null, animo: "neutro", texto: "Polígono Norte. Once y media. La valla lleva años abierta por el mismo sitio y todo el mundo lo sabe." },
      { quien: null, animo: "neutro", texto: "La nave 7 es la última. El candado es exactamente el que abre esa llave." },
      { quien: null, animo: "tenso", texto: "Dentro huele a ozono y a polvo. Nadie ha barrido esto en veinte años y sin embargo hay una luz encendida al fondo." },
      { quien: "dani", animo: "tenso", texto: "¿Hola?" },
      { quien: null, animo: "neutro", texto: "El almacén está vacío. Cuatro camastros, cuatro cajas y un cofre metálico en el centro, del tamaño de una nevera tumbada." },
      { quien: null, animo: "tenso", texto: "El cofre está abierto antes de que decidas abrirlo." },
      { quien: "dani", animo: "tenso", texto: "Vale. Vale. Me voy. Me voy ahora mismo." },
      { quien: null, animo: "tenso", texto: "Das un paso atrás. El suelo está húmedo. La llave se te cae de la mano." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "Polígono Norte. Half eleven. The fence has been open at the same spot for years and everybody knows it." },
      { quien: null, animo: "neutro", texto: "Unit 7 is the last one. The padlock is exactly what that key opens." },
      { quien: null, animo: "tenso", texto: "Inside it smells of ozone and dust. Nobody has swept in twenty years, and yet there's a light on at the back." },
      { quien: "dani", animo: "tenso", texto: "Hello?" },
      { quien: null, animo: "neutro", texto: "The store is empty. Four cots, four boxes, and a metal chest in the middle the size of a fridge laid down." },
      { quien: null, animo: "tenso", texto: "The chest is open before you decide to open it." },
      { quien: "dani", animo: "tenso", texto: "Right. Right. I'm going. I'm going right now." },
      { quien: null, animo: "tenso", texto: "You take a step back. The floor is damp. The key falls out of your hand." },
    ],
  },

  c1_rayo: {
    es: [
      { quien: null, animo: "tenso", texto: "No duele." },
      { quien: null, animo: "tenso", texto: "Eso es lo peor: no duele." },
      { quien: null, animo: "neutro", texto: "Hay un instante blanco sin sonido, y luego el sonido llega tarde, como en las tormentas." },
      { quien: null, animo: "neutro", texto: "Estás en el suelo. Los fluorescentes de toda la nave se han encendido a la vez, y no hay ninguno conectado." },
      { quien: "dani", animo: "roto", texto: "…mamá." },
      { quien: null, animo: "tenso", texto: "Fuera, la farola de la puerta se apaga. Y la siguiente. Y la siguiente." },
      { quien: null, animo: "tenso", texto: "Tienes que salir de aquí y el cuerpo no responde." },
    ],
    en: [
      { quien: null, animo: "tenso", texto: "It doesn't hurt." },
      { quien: null, animo: "tenso", texto: "That's the worst part: it doesn't hurt." },
      { quien: null, animo: "neutro", texto: "There's a white instant with no sound, and then the sound arrives late, the way it does in storms." },
      { quien: null, animo: "neutro", texto: "You're on the floor. Every fluorescent in the unit has come on at once, and not one of them is connected." },
      { quien: "dani", animo: "roto", texto: "…mum." },
      { quien: null, animo: "tenso", texto: "Outside, the light over the door goes out. And the next one. And the next." },
      { quien: null, animo: "tenso", texto: "You have to get out of here and your body won't answer." },
    ],
  },

  c1_epilogo: {
    es: [
      { quien: null, animo: "neutro", texto: "Llegas a casa a las dos y diez. La puerta cruje y no cruje lo bastante como para despertar a nadie." },
      { quien: null, animo: "neutro", texto: "En el espejo del baño no hay nada. Ni una marca, ni una quemadura, ni una explicación." },
      { quien: "dani", animo: "tenso", texto: "Ha sido un calambre. Un calambre grande." },
      { quien: null, animo: "neutro", texto: "Abres el grifo. El agua sale caliente antes de que la caldera tenga tiempo de encenderse." },
      { quien: null, animo: "tenso", texto: "Y la llave. La llave se ha quedado en el suelo del almacén, a cuatro kilómetros de aquí, con tus huellas encima." },
      { quien: null, animo: "neutro", texto: "Nuria tose en su cuarto. Mañana hay clase. Eso, por lo menos, sigue siendo verdad." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "You get home at ten past two. The door creaks, and not enough to wake anybody." },
      { quien: null, animo: "neutro", texto: "There's nothing in the bathroom mirror. No mark, no burn, no explanation." },
      { quien: "dani", animo: "tenso", texto: "It was a shock. A big shock." },
      { quien: null, animo: "neutro", texto: "You turn on the tap. The water runs hot before the boiler has time to fire." },
      { quien: null, animo: "tenso", texto: "And the key. The key is still on that store-room floor, four kilometres away, with your prints on it." },
      { quien: null, animo: "neutro", texto: "Nuria coughs in her room. There's school tomorrow. That much, at least, is still true." },
    ],
  },

  /* ══ CAPÍTULO 2 · PRIMERAS CHISPAS ═══════════════════════════════════════════════
   * Tres días aprendiendo a no romper cosas, y un incendio que enseña la regla del juego:
   * ganar y perder son la misma noche.
   */

  c2_bombilla: {
    es: [
      { quien: null, animo: "neutro", texto: "La bombilla de tu cuarto lleva tres días fundiéndose. Tu madre ya ha comprado un paquete de seis." },
      { quien: "carmen", animo: "neutro", texto: "La instalación de este bloque es de los setenta, hijo. Es lo que hay." },
      { quien: null, animo: "tenso", texto: "No es la instalación. Es que cuando te enfadas, la bombilla lo nota antes que tú." },
      { quien: "nuria", animo: "tenso", texto: "Se me ha muerto el móvil. Otra vez. Y el tuyo no." },
      { quien: "dani", animo: "tenso", texto: "Habrá sido la batería." },
      { quien: "nuria", animo: "neutro", texto: "Es de noviembre. Y estaba al setenta por ciento hace un minuto." },
      { quien: null, animo: "tenso", texto: "Aprende a soltar los objetos despacio. Es lo primero que aprendes, y es lo que te salvará el capítulo 9." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "The bulb in your room has been blowing for three days. Your mother has already bought a pack of six." },
      { quien: "carmen", animo: "neutro", texto: "The wiring in this block is from the seventies, love. It is what it is." },
      { quien: null, animo: "tenso", texto: "It isn't the wiring. It's that when you get angry, the bulb notices before you do." },
      { quien: "nuria", animo: "tenso", texto: "My phone's died. Again. Yours hasn't." },
      { quien: "dani", animo: "tenso", texto: "Must be the battery." },
      { quien: "nuria", animo: "neutro", texto: "It's from November. And it was on seventy per cent a minute ago." },
      { quien: null, animo: "tenso", texto: "You learn to put things down slowly. It's the first thing you learn, and it's what saves you in chapter nine." },
    ],
  },

  c2_requena: {
    es: [
      { quien: "requena", animo: "tenso", texto: "Dani. Las manos." },
      { quien: "dani", animo: "tenso", texto: "¿Qué?" },
      { quien: "requena", animo: "neutro", texto: "No lo estoy preguntando. Enséñamelas." },
      { quien: null, animo: "neutro", texto: "Tienes las palmas rojas. No quemadas: rojas, como si hubieras estado sujetando algo caliente durante horas." },
      { quien: "requena", animo: "tenso", texto: "Esto no es de un mechero." },
      { quien: "dani", animo: "tenso", texto: "Es de la sartén. En casa." },
      { quien: null, animo: "neutro", texto: "Requena abre el cajón de arriba y saca unos guantes de laboratorio. Los deja sobre la mesa sin mirarte." },
      { quien: "requena", animo: "neutro", texto: "Cógelos. Y no los devuelvas." },
    ],
    en: [
      { quien: "requena", animo: "tenso", texto: "Dani. Your hands." },
      { quien: "dani", animo: "tenso", texto: "What?" },
      { quien: "requena", animo: "neutro", texto: "I'm not asking. Show me." },
      { quien: null, animo: "neutro", texto: "Your palms are red. Not burned — red, as though you'd been holding something hot for hours." },
      { quien: "requena", animo: "tenso", texto: "That isn't a lab burner." },
      { quien: "dani", animo: "tenso", texto: "It's the frying pan. At home." },
      { quien: null, animo: "neutro", texto: "Requena opens the top drawer and takes out a pair of lab gloves. He puts them on the desk without looking at you." },
      { quien: "requena", animo: "neutro", texto: "Take them. And don't bring them back." },
    ],
  },

  c2_isma: {
    es: [
      { quien: null, animo: "neutro", texto: "Isma abre la carpeta encima del pupitre. Hay recortes. Hay un mapa. Hay chinchetas de verdad." },
      { quien: "isma", animo: "decidido", texto: "Cuatro apagones en once días. Todos en un radio de kilómetro y medio." },
      { quien: "isma", animo: "neutro", texto: "Y en el centro del radio no hay ninguna subestación. Lo he mirado. No hay NADA." },
      { quien: "dani", animo: "tenso", texto: "¿Y qué hay?" },
      { quien: "isma", animo: "decidido", texto: "Casas. Tu barrio, básicamente." },
      { quien: null, animo: "tenso", texto: "El mapa de Isma tiene una chincheta a doscientos metros de tu portal y él todavía no sabe por qué." },
      { quien: "isma", animo: "neutro", texto: "¿Tú crees que estoy loco?" },
      { quien: "dani", animo: "tenso", texto: "…No." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "Isma opens the folder on the desk. Cuttings. A map. Actual pins." },
      { quien: "isma", animo: "decidido", texto: "Four outages in eleven days. All inside a mile and a half." },
      { quien: "isma", animo: "neutro", texto: "And at the centre of that circle there's no substation. I've checked. There's NOTHING." },
      { quien: "dani", animo: "tenso", texto: "So what is there?" },
      { quien: "isma", animo: "decidido", texto: "Houses. Your neighbourhood, basically." },
      { quien: null, animo: "tenso", texto: "There's a pin on Isma's map two hundred metres from your front door and he still doesn't know why." },
      { quien: "isma", animo: "neutro", texto: "Do you think I'm mad?" },
      { quien: "dani", animo: "tenso", texto: "…No." },
    ],
  },

  c2_movil: {
    es: [
      { quien: null, animo: "neutro", texto: "Tercer día. Has aprendido a abrir la nevera con el codo y a no tocar el router." },
      { quien: "nuria", animo: "decidido", texto: "Vale. Experimento." },
      { quien: "dani", animo: "tenso", texto: "¿Qué experimento?" },
      { quien: "nuria", animo: "neutro", texto: "Pon la mano encima de mi móvil. Sin tocarlo. Diez segundos." },
      { quien: "dani", animo: "tenso", texto: "Nuria." },
      { quien: "nuria", animo: "decidido", texto: "Si no pasa nada, te dejo en paz un mes entero. Palabra." },
      { quien: null, animo: "tenso", texto: "No lo haces. Y no hacerlo es exactamente la respuesta que ella estaba buscando." },
      { quien: "nuria", animo: "neutro", texto: "Vale. Pues nada. Ya está." },
      { quien: null, animo: "neutro", texto: "Se lleva el móvil a su cuarto y cierra la puerta sin dar un portazo, que es peor." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "Day three. You've learned to open the fridge with your elbow and to leave the router alone." },
      { quien: "nuria", animo: "decidido", texto: "Right. Experiment." },
      { quien: "dani", animo: "tenso", texto: "What experiment?" },
      { quien: "nuria", animo: "neutro", texto: "Put your hand over my phone. Without touching it. Ten seconds." },
      { quien: "dani", animo: "tenso", texto: "Nuria." },
      { quien: "nuria", animo: "decidido", texto: "If nothing happens, I leave you alone for a whole month. Word." },
      { quien: null, animo: "tenso", texto: "You don't do it. And not doing it is exactly the answer she was after." },
      { quien: "nuria", animo: "neutro", texto: "Fine. Nothing then. Forget it." },
      { quien: null, animo: "neutro", texto: "She takes the phone to her room and shuts the door without slamming it, which is worse." },
    ],
  },

  c2_incendio: {
    es: [
      { quien: null, animo: "tenso", texto: "Las once y veinte de la noche. El bajo del número once del barrio de las Aguas está ardiendo." },
      { quien: null, animo: "tenso", texto: "Hay tres personas dentro. Los bomberos están a nueve minutos, y nueve minutos es lo que tarda un forjado en decidirse." },
      { quien: "pilar", animo: "roto", texto: "¡El de la ventana! ¡Que hay uno en la ventana!" },
      { quien: null, animo: "neutro", texto: "Llevas una sudadera del revés, unos guantes de laboratorio y una bufanda de tu madre tapándote media cara." },
      { quien: "dani", animo: "tenso", texto: "Esto es una idea malísima." },
      { quien: null, animo: "decidido", texto: "Lo es. Y aun así echas a andar hacia el portal, porque es lo que eras antes de que te cayera un rayo." },
    ],
    en: [
      { quien: null, animo: "tenso", texto: "Twenty past eleven at night. The ground-floor flat at number eleven, Barrio de las Aguas, is on fire." },
      { quien: null, animo: "tenso", texto: "Three people inside. The fire brigade is nine minutes out, and nine minutes is how long a floor slab takes to make up its mind." },
      { quien: "pilar", animo: "roto", texto: "The window! There's one at the window!" },
      { quien: null, animo: "neutro", texto: "You're wearing a hoodie inside out, a pair of lab gloves, and your mother's scarf over half your face." },
      { quien: "dani", animo: "tenso", texto: "This is a terrible idea." },
      { quien: null, animo: "decidido", texto: "It is. And you start walking towards the door anyway, because that's what you were before the lightning." },
    ],
  },

  c2_hospital: {
    es: [
      { quien: null, animo: "neutro", texto: "Tu madre llega a casa a las seis de la mañana y no dice nada en toda la mañana." },
      { quien: null, animo: "neutro", texto: "Se sienta en la cocina con el abrigo puesto, que es lo que hace cuando la noche ha sido de las otras." },
      { quien: "carmen", animo: "roto", texto: "Dos ingresos del once. Y un tercero que no llegó a ser ingreso." },
      { quien: "dani", animo: "tenso", texto: "…¿Y los dos?" },
      { quien: "carmen", animo: "neutro", texto: "Los dos bien. Uno con humo en los pulmones y otro con la muñeca rota." },
      { quien: "carmen", animo: "tenso", texto: "Dicen que los sacó alguien. Que había alguien dentro antes que los bomberos." },
      { quien: null, animo: "tenso", texto: "No levanta la vista de la taza al decirlo. Y no es casualidad que no la levante." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "Your mother gets home at six in the morning and says nothing all morning." },
      { quien: null, animo: "neutro", texto: "She sits in the kitchen with her coat still on, which is what she does when the night was one of those." },
      { quien: "carmen", animo: "roto", texto: "Two admissions from number eleven. And a third who never became an admission." },
      { quien: "dani", animo: "tenso", texto: "…And the two?" },
      { quien: "carmen", animo: "neutro", texto: "Both fine. One with smoke in his lungs and one with a broken wrist." },
      { quien: "carmen", animo: "tenso", texto: "They say somebody got them out. That somebody was in there before the brigade." },
      { quien: null, animo: "tenso", texto: "She doesn't look up from the cup while she says it. And it isn't an accident that she doesn't." },
    ],
  },

  c2_epilogo: {
    es: [
      { quien: null, animo: "neutro", texto: "Doña Pilar friega el portal a las siete, como todos los días de los últimos cuarenta y un años." },
      { quien: "pilar", animo: "neutro", texto: "Buenos días, hijo. Menuda noche." },
      { quien: "dani", animo: "tenso", texto: "Buenos días." },
      { quien: "pilar", animo: "neutro", texto: "El del once dice que le sacó un chaval. Bajito, dice. Con una bufanda de mujer." },
      { quien: null, animo: "tenso", texto: "Sigue fregando. No te mira. Ésa es su manera de mirarte." },
      { quien: "pilar", animo: "tenso", texto: "Yo no digo nada, ¿eh? Pero una tiene ojos." },
      { quien: null, animo: "neutro", texto: "Se abren tres expedientes esta mañana y ninguno de los tres es de la policía. Son de tu hermana, de tu mejor amigo y de la portera." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "Doña Pilar mops the hall at seven, as she has every day for forty-one years." },
      { quien: "pilar", animo: "neutro", texto: "Morning, love. What a night." },
      { quien: "dani", animo: "tenso", texto: "Morning." },
      { quien: "pilar", animo: "neutro", texto: "The man from number eleven says a lad pulled him out. Short, he says. Wearing a woman's scarf." },
      { quien: null, animo: "tenso", texto: "She keeps mopping. She doesn't look at you. That is how she looks at you." },
      { quien: "pilar", animo: "tenso", texto: "I'm not saying a word, mind. But I've got eyes." },
      { quien: null, animo: "neutro", texto: "Three files open this morning and not one of them is police. They belong to your sister, your best friend and the caretaker." },
    ],
  },

  /* ══ CAPÍTULO 3 · EL TASADOR ═════════════════════════════════════════════════════
   * La primera lección de sistema: la fuerza no basta, y ganar delante de cuatro cámaras
   * es perder de una manera que todavía no sabes leer.
   */

  c3_joyeria: {
    es: [
      { quien: null, animo: "neutro", texto: "La Concha. Joyería Serrat, esquina con la plaza. Persiana subida, escaparate intacto, alarma sin saltar." },
      { quien: null, animo: "neutro", texto: "La caja fuerte está abierta y no tiene ni un arañazo." },
      { quien: "marga", animo: "neutro", texto: "Diecinueve años cubriendo sucesos y no había visto una caja abierta sin marcas." },
      { quien: "marga", animo: "tenso", texto: "Chaval, ¿tú qué haces aquí? Circula." },
      { quien: null, animo: "neutro", texto: "El Tasador no fuerza: convence al metal. Y el metal, cuando le convencen, no se queja." },
      { quien: null, animo: "tenso", texto: "En la esquina hay cuatro cámaras. Y las cuatro estaban encendidas." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "La Concha. Serrat's the jeweller's, on the corner of the plaza. Shutter up, window intact, alarm never tripped." },
      { quien: null, animo: "neutro", texto: "The safe is open and there isn't a scratch on it." },
      { quien: "marga", animo: "neutro", texto: "Nineteen years on the crime desk and I've never seen a safe opened without marks." },
      { quien: "marga", animo: "tenso", texto: "Kid, what are you doing here? Move along." },
      { quien: null, animo: "neutro", texto: "The Appraiser doesn't force. He persuades metal. And metal, once persuaded, doesn't complain." },
      { quien: null, animo: "tenso", texto: "There are four cameras on that corner. All four were running." },
    ],
  },

  c3_yusuf: {
    es: [
      { quien: null, animo: "neutro", texto: "Puerto Viejo. Un locutorio con un taller detrás, y detrás del taller un patio sin cámaras." },
      { quien: "yusuf", animo: "neutro", texto: "La sudadera del revés no es un traje. Es una sudadera del revés." },
      { quien: "dani", animo: "tenso", texto: "Yo no he dicho nada de ningún traje." },
      { quien: "yusuf", animo: "decidido", texto: "No te he preguntado nada. Y no te voy a preguntar." },
      { quien: null, animo: "neutro", texto: "Te pasa un rollo de cinta de tela, del gordo, y una bobina de hilo que huele a quemado." },
      { quien: "yusuf", animo: "neutro", texto: "Esto aguanta el roce. Y esto otro aguanta el calor. Lo demás lo pones tú." },
      { quien: "dani", animo: "neutro", texto: "¿Cuánto te debo?" },
      { quien: "yusuf", animo: "neutro", texto: "Media hora barriendo. El dinero se gasta; el favor se guarda." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "Puerto Viejo. A phone shop with a workshop behind it, and behind that a yard with no cameras." },
      { quien: "yusuf", animo: "neutro", texto: "A hoodie inside out isn't a suit. It's a hoodie inside out." },
      { quien: "dani", animo: "tenso", texto: "I never said anything about a suit." },
      { quien: "yusuf", animo: "decidido", texto: "I haven't asked you anything. And I won't." },
      { quien: null, animo: "neutro", texto: "He hands you a roll of cloth tape, the heavy kind, and a spool of thread that smells of scorching." },
      { quien: "yusuf", animo: "neutro", texto: "This takes abrasion. That takes heat. The rest is on you." },
      { quien: "dani", animo: "neutro", texto: "What do I owe you?" },
      { quien: "yusuf", animo: "neutro", texto: "Half an hour sweeping. Money gets spent; a favour gets kept." },
    ],
  },

  c3_leccion: {
    es: [
      { quien: null, animo: "neutro", texto: "La joyería otra vez, dos noches después. Y esta vez él está dentro." },
      { quien: "tasador", animo: "neutro", texto: "Buenas noches. No, no corras: si quisiera irme, ya me habría ido." },
      { quien: "dani", animo: "decidido", texto: "Suelte eso." },
      { quien: "tasador", animo: "neutro", texto: "Qué frase tan de tebeo. ¿La traías preparada?" },
      { quien: null, animo: "tenso", texto: "Le lanzas un arco. El arco llega, entra en el marco de acero de la puerta y se va a tierra sin tocarle." },
      { quien: "tasador", animo: "decidido", texto: "Materia contra Rayo, muchacho. Tú traes corriente a una habitación llena de hierro." },
      { quien: null, animo: "tenso", texto: "Aprendes en dos segundos lo que un manual no te habría explicado en veinte páginas." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "The jeweller's again, two nights later. And this time he's inside." },
      { quien: "tasador", animo: "neutro", texto: "Good evening. Don't run — if I wanted to leave I'd have left." },
      { quien: "dani", animo: "decidido", texto: "Put that down." },
      { quien: "tasador", animo: "neutro", texto: "What a comic-book line. Did you bring it with you?" },
      { quien: null, animo: "tenso", texto: "You throw an arc. It lands, finds the steel doorframe, and goes to earth without touching him." },
      { quien: "tasador", animo: "decidido", texto: "Matter against Bolt, young man. You've brought current into a room made of iron." },
      { quien: null, animo: "tenso", texto: "You learn in two seconds what a manual wouldn't have explained in twenty pages." },
    ],
  },

  c3_camaras: {
    es: [
      { quien: null, animo: "neutro", texto: "Ganaste. El Tasador se fue por la puerta, andando, y la mercancía se quedó donde estaba." },
      { quien: null, animo: "tenso", texto: "Y te grabaron ganando." },
      { quien: null, animo: "neutro", texto: "La Concha tiene cámaras en las cuatro esquinas. Comercio, banco, ayuntamiento y una particular del bar." },
      { quien: "oscar", animo: "tenso", texto: "¿Tú estabas anoche por la plaza?" },
      { quien: "dani", animo: "tenso", texto: "No." },
      { quien: "oscar", animo: "neutro", texto: "Ya. Es que había uno con tu manera de andar." },
      { quien: null, animo: "tenso", texto: "Ésta es la lección del capítulo, y no es la de las afinidades: se puede ganar un combate y salir con tres pistas Digitales encima." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "You won. The Appraiser walked out of the door on his own feet and the stock stayed where it was." },
      { quien: null, animo: "tenso", texto: "And they filmed you winning." },
      { quien: null, animo: "neutro", texto: "La Concha has cameras on all four corners. Shop, bank, council, and the bar's own." },
      { quien: "oscar", animo: "tenso", texto: "Were you on the plaza last night?" },
      { quien: "dani", animo: "tenso", texto: "No." },
      { quien: "oscar", animo: "neutro", texto: "Right. Only there was one who walked like you walk." },
      { quien: null, animo: "tenso", texto: "That's the chapter's lesson, and it isn't the one about affinities: you can win a fight and leave with three Digital clues on you." },
    ],
  },

  c3_epilogo: {
    es: [
      { quien: null, animo: "neutro", texto: "El Faro de Marés, página siete. Cuatro párrafos y ninguna foto." },
      { quien: null, animo: "neutro", texto: "«ROBO FRUSTRADO EN LA CONCHA · La policía no descarta la intervención de un tercero.»" },
      { quien: "isma", animo: "decidido", texto: "«Un tercero». ¡UN TERCERO, Dani!" },
      { quien: "dani", animo: "neutro", texto: "Es una manera de decir que no saben nada." },
      { quien: "isma", animo: "neutro", texto: "Es una manera de decir que hay alguien. Que es distinto." },
      { quien: null, animo: "tenso", texto: "Esa noche, en una comisaría de otra ciudad, alguien pide el expediente de los cuatro apagones de Marés." },
      { quien: null, animo: "neutro", texto: "Todavía no tiene nombre para ti. Dentro de un capítulo llegará en tren y sí lo tendrá." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "El Faro de Marés, page seven. Four paragraphs and no photograph." },
      { quien: null, animo: "neutro", texto: "'BURGLARY FOILED IN LA CONCHA · Police do not rule out a third party.'" },
      { quien: "isma", animo: "decidido", texto: "'A third party'. A THIRD PARTY, Dani!" },
      { quien: "dani", animo: "neutro", texto: "That's a way of saying they know nothing." },
      { quien: "isma", animo: "neutro", texto: "It's a way of saying there's somebody. Which is different." },
      { quien: null, animo: "tenso", texto: "That night, in a station in another city, somebody requests the file on the four Marés outages." },
      { quien: null, animo: "neutro", texto: "She hasn't got a name for you yet. One chapter from now she arrives by train and she will." },
    ],
  },

  /* ══ CAPÍTULO 4 · COARTADAS ══════════════════════════════════════════════════════
   * El capítulo bisagra del sistema: aquí el juego deja de ser sobre pelear y empieza a
   * ser sobre lo que queda escrito después de pelear.
   */

  c4_sabater: {
    es: [
      { quien: null, animo: "neutro", texto: "Hay una mujer en el pasillo del instituto que no es madre de nadie." },
      { quien: "sabater", animo: "neutro", texto: "Elena Sabater, Unidad de Análisis. No, no es una inspección. Es una charla." },
      { quien: "requena", animo: "tenso", texto: "Con menores no se charla sin un tutor delante." },
      { quien: "sabater", animo: "neutro", texto: "Exacto. Por eso he pedido su despacho y no una sala vacía. Gracias, profesor." },
      { quien: null, animo: "neutro", texto: "Habla con once alumnos esa mañana. Con diez, cuatro minutos. Contigo, nueve." },
      { quien: "sabater", animo: "neutro", texto: "¿Tú a qué hora sueles llegar a casa entre semana?" },
      { quien: "dani", animo: "tenso", texto: "…Sobre las nueve." },
      { quien: "sabater", animo: "tenso", texto: "Gracias. No hace falta que me contestes tan rápido, ¿eh? Nadie te está cronometrando." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "There's a woman in the school corridor who isn't anybody's mother." },
      { quien: "sabater", animo: "neutro", texto: "Elena Sabater, Analysis Unit. No, it isn't an inspection. It's a chat." },
      { quien: "requena", animo: "tenso", texto: "You don't chat to minors without a member of staff present." },
      { quien: "sabater", animo: "neutro", texto: "Precisely. That's why I asked for your office and not an empty room. Thank you, sir." },
      { quien: null, animo: "neutro", texto: "She speaks to eleven pupils that morning. Ten of them for four minutes. You, for nine." },
      { quien: "sabater", animo: "neutro", texto: "What time do you usually get home on a weekday?" },
      { quien: "dani", animo: "tenso", texto: "…Around nine." },
      { quien: "sabater", animo: "tenso", texto: "Thank you. You needn't answer that fast, you know. Nobody's timing you." },
    ],
  },

  c4_panel: {
    es: [
      { quien: null, animo: "neutro", texto: "Esa tarde, por primera vez, te sientas a hacer una lista." },
      { quien: null, animo: "neutro", texto: "No de lo que sabes hacer. De lo que sabe cada uno." },
      { quien: null, animo: "tenso", texto: "Nuria: que se te funden los aparatos. Isma: cuatro apagones y un mapa. Doña Pilar: las horas a las que vuelves." },
      { quien: null, animo: "tenso", texto: "Requena: las manos. Óscar: la manera de andar. Y ahora Sabater, que todavía no sabe nada y ya sabe más que ninguno." },
      { quien: "dani", animo: "roto", texto: "…seis." },
      { quien: null, animo: "neutro", texto: "No es un medidor. Son seis carpetas separadas, y cada una se llena de cosas distintas." },
      { quien: null, animo: "decidido", texto: "Y una carpeta se puede vaciar. Eso también lo aprendes hoy: se llama pasar una tarde tapando en vez de haciendo." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "That afternoon, for the first time, you sit down and make a list." },
      { quien: null, animo: "neutro", texto: "Not of what you can do. Of what each of them knows." },
      { quien: null, animo: "tenso", texto: "Nuria: that devices die around you. Isma: four outages and a map. Doña Pilar: the hours you come home." },
      { quien: null, animo: "tenso", texto: "Requena: the hands. Óscar: the way you walk. And now Sabater, who knows nothing and already knows more than any of them." },
      { quien: "dani", animo: "roto", texto: "…six." },
      { quien: null, animo: "neutro", texto: "It isn't a gauge. It's six separate folders, and each one fills with different things." },
      { quien: null, animo: "decidido", texto: "And a folder can be emptied. You learn that today too: it means spending an afternoon covering instead of doing." },
    ],
  },

  c4_instituto: {
    es: [
      { quien: "julia", animo: "neutro", texto: "No te pares a mi lado. Camina y hablamos." },
      { quien: "dani", animo: "tenso", texto: "¿Qué pasa?" },
      { quien: "julia", animo: "tenso", texto: "Que esa señora ha pedido los partes de faltas de tercero. Los de todo el trimestre." },
      { quien: "dani", animo: "neutro", texto: "¿Y qué?" },
      { quien: "julia", animo: "neutro", texto: "Que tú faltas a tercera hora los martes. Siempre los martes." },
      { quien: null, animo: "tenso", texto: "No lo dice como una acusación. Lo dice como quien te enseña una gotera antes de que llueva." },
      { quien: "julia", animo: "neutro", texto: "Yo también miro cosas y las ordeno. Es lo que hago. Tranquilo: lo que ordeno no lo publico." },
    ],
    en: [
      { quien: "julia", animo: "neutro", texto: "Don't stop next to me. Walk and we'll talk." },
      { quien: "dani", animo: "tenso", texto: "What is it?" },
      { quien: "julia", animo: "tenso", texto: "That woman's asked for the Year 10 absence records. The whole term." },
      { quien: "dani", animo: "neutro", texto: "So?" },
      { quien: "julia", animo: "neutro", texto: "So you miss third period on Tuesdays. Always Tuesdays." },
      { quien: null, animo: "tenso", texto: "She doesn't say it as an accusation. She says it the way you show someone a leak before it rains." },
      { quien: "julia", animo: "neutro", texto: "I watch things and sort them too. It's what I do. Relax: what I sort, I don't publish." },
    ],
  },

  c4_marga: {
    es: [
      { quien: "marga", animo: "tenso", texto: "Chaval. Tú eres el que estaba en el cordón de la joyería." },
      { quien: "dani", animo: "tenso", texto: "Había mucha gente." },
      { quien: "marga", animo: "neutro", texto: "Había once personas y las he contado a las once. Ven, que apago la grabadora." },
      { quien: null, animo: "neutro", texto: "La apaga de verdad. Eso, viniendo de ella, es una concesión enorme." },
      { quien: "marga", animo: "neutro", texto: "Mañana publico. No tengo nada, así que voy a publicar el nada con mucho cuidado." },
      { quien: "marga", animo: "tenso", texto: "Y prefiero publicar un nada cuidadoso a que lo publique mi jefe, que no tiene cuidado ninguno." },
      { quien: null, animo: "neutro", texto: "Al día siguiente, página cinco. Cuatro párrafos que no dicen nada y que la ciudad entera comenta en el autobús." },
    ],
    en: [
      { quien: "marga", animo: "tenso", texto: "Kid. You're the one who was behind the tape at the jeweller's." },
      { quien: "dani", animo: "tenso", texto: "There were a lot of people." },
      { quien: "marga", animo: "neutro", texto: "There were eleven and I counted all eleven. Come here, I'll kill the recorder." },
      { quien: null, animo: "neutro", texto: "She actually turns it off. Coming from her, that's an enormous concession." },
      { quien: "marga", animo: "neutro", texto: "I'm running it tomorrow. I've got nothing, so I'm going to run the nothing very carefully." },
      { quien: "marga", animo: "tenso", texto: "And I'd rather print a careful nothing than let my editor print it, because he's careful about nothing." },
      { quien: null, animo: "neutro", texto: "Next day, page five. Four paragraphs that say nothing, and the whole city discusses them on the bus." },
    ],
  },

  c4_epilogo: {
    es: [
      { quien: null, animo: "neutro", texto: "Dos rehenes salieron por su propio pie. Eso está en el atestado y no lo va a discutir nadie." },
      { quien: null, animo: "tenso", texto: "También está en el atestado que un agente registró «destello de origen no determinado» a las 22:41." },
      { quien: "sabater", animo: "neutro", texto: "Es la primera vez que tengo una hora exacta." },
      { quien: null, animo: "neutro", texto: "Está sola en una oficina prestada, con un mapa de Marés y una caja de chinchetas que no ha abierto todavía." },
      { quien: "sabater", animo: "decidido", texto: "Bien. Pues empecemos por el principio, que es como se empieza." },
      { quien: null, animo: "tenso", texto: "Abre la caja. La primera chincheta va en La Concha." },
      { quien: null, animo: "neutro", texto: "Ésta es la primera Intervención que se puede ganar y perder a la vez, y acabas de hacer las dos cosas." },
    ],
    en: [
      { quien: null, animo: "neutro", texto: "Two hostages walked out on their own feet. That's in the report and nobody's going to argue with it." },
      { quien: null, animo: "tenso", texto: "Also in the report: an officer logged 'flash of undetermined origin' at 22:41." },
      { quien: "sabater", animo: "neutro", texto: "That's the first exact time I've had." },
      { quien: null, animo: "neutro", texto: "She's alone in a borrowed office, with a map of Marés and a box of pins she hasn't opened yet." },
      { quien: "sabater", animo: "decidido", texto: "Right. Let's start at the beginning, which is how one starts." },
      { quien: null, animo: "tenso", texto: "She opens the box. The first pin goes into La Concha." },
      { quien: null, animo: "neutro", texto: "This is the first Intervention you can win and lose at the same time, and you've just done both." },
    ],
  },

  /* ── Aperturas de Intervención decisiva ───────────────────────────────
   * No son escenas de bloque: son el telón que se levanta justo antes de la decisiva del
   * capítulo. `story.js` las nombra en `decisiva.textoApertura` y la interfaz las juega
   * antes de dar el control.
   */

  c1_huida: {
    es: [
      { quien: null, animo: "tenso", texto: "No hay nadie a quien pegar. Ésa es la primera cosa que este juego te enseña, y te la enseña quitándotelo todo." },
      { quien: null, animo: "roto", texto: "Las piernas te llegan hasta la mitad y luego dejan de llegar." },
      { quien: null, animo: "tenso", texto: "Del cofre sale un zumbido que sube de tono, y a cada segundo hay un fluorescente más encendido." },
      { quien: "dani", animo: "roto", texto: "Vale. Un paso. Un paso y luego otro." },
      { quien: null, animo: "neutro", texto: "La puerta está a treinta metros y hay cuatro naves más antes de la valla." },
      { quien: null, animo: "decidido", texto: "Tutorial invertido: aprendes a moverte por el escenario sin poder hacer absolutamente nada dentro de él." },
    ],
    en: [
      { quien: null, animo: "tenso", texto: "There's nobody to hit. That's the first thing this game teaches you, and it teaches it by taking everything away." },
      { quien: null, animo: "roto", texto: "Your legs get you halfway and then stop getting you anywhere." },
      { quien: null, animo: "tenso", texto: "The chest is putting out a hum that keeps climbing, and every second there's one more fluorescent lit." },
      { quien: "dani", animo: "roto", texto: "Right. One step. One step and then another." },
      { quien: null, animo: "neutro", texto: "The door is thirty metres away and there are four more units before the fence." },
      { quien: null, animo: "decidido", texto: "An inverted tutorial: you learn to move through the scenario while being able to do nothing at all inside it." },
    ],
  },

  c4_atraco: {
    es: [
      { quien: null, animo: "tenso", texto: "Plaza de La Concha, las diez y media de la noche. Un atraco que ha salido mal y dos personas dentro que no pueden salir." },
      { quien: null, animo: "neutro", texto: "Hay cordón policial. Hay una periodista detrás del cordón. Y hay una inspectora dentro mirando los tejados." },
      { quien: "sabater", animo: "neutro", texto: "Si aparece, aparecerá por arriba. Los de arriba siempre creen que arriba no se mira." },
      { quien: "marga", animo: "tenso", texto: "Inspectora, ¿me confirma que hay rehenes?" },
      { quien: "sabater", animo: "neutro", texto: "Le confirmo que hay una operación en curso. Y que usted está muy cerca de ella." },
      { quien: null, animo: "decidido", texto: "Se puede sacar a los dos. Se puede sacar a los dos y salir con el expediente de Sabater el doble de lleno." },
      { quien: null, animo: "tenso", texto: "Ésta es la primera Intervención que se gana y se pierde a la vez, y el juego no te va a avisar de cuál de las dos estás haciendo." },
    ],
    en: [
      { quien: null, animo: "tenso", texto: "La Concha plaza, half past ten at night. A robbery gone wrong and two people inside who can't get out." },
      { quien: null, animo: "neutro", texto: "There's a police cordon. There's a journalist behind it. And there's an inspector inside it watching the rooftops." },
      { quien: "sabater", animo: "neutro", texto: "If he shows up, he'll come from above. They always think nobody looks up." },
      { quien: "marga", animo: "tenso", texto: "Inspector, can you confirm there are hostages?" },
      { quien: "sabater", animo: "neutro", texto: "I can confirm there's an operation in progress. And that you're very close to it." },
      { quien: null, animo: "decidido", texto: "You can get both of them out. You can get both of them out and leave with Sabater's file twice as full." },
      { quien: null, animo: "tenso", texto: "This is the first Intervention you win and lose at once, and the game won't tell you which one you're doing." },
    ],
  },

};
