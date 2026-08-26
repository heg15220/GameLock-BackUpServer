# FULGOR — Documento de diseño

**Un action-RPG narrativo de superhéroe con estructura de Inazuma Eleven (Nintendo DS).**

| | |
|---|---|
| **Título de trabajo** | FULGOR |
| **Género** | Action-RPG narrativo por capítulos / simulador de doble vida |
| **Referencia estructural** | *Inazuma Eleven* (Level-5, Nintendo DS, 2008) |
| **Duración objetivo** | ~8 horas de campaña para un jugador medio |
| **Plataforma** | Web (React 18 + Vite), escritorio y móvil; caja móvil real 352×515 px |
| **Idiomas** | **Dos versiones completas: español (idioma de escritura) e inglés adaptado.** Ver §12 |
| **Fecha** | 2026-08-26 |
| **Estado** | Diseño aprobado en brainstorming — pendiente de plan de implementación |

---

## 0. Resumen ejecutivo

Dani Vela tiene quince años y una vida corriente en Marés, una ciudad portuaria grande y gris. Una tarde, volviendo del instituto, encuentra una llave en el suelo con una nota: *"si has leído esto, eres el elegido"*. Va a la dirección indicada, abre el cofre y un rayo lo atraviesa. A partir de ahí tiene poder sobre el rayo, la luz y la electricidad — y dos vidas que no pueden tocarse.

**El juego no va de pegar. Va de sostener una mentira.**

La tesis de diseño es que el conflicto central de todo relato de superhéroe con identidad secreta es un problema de **gestión de información**, y que ese problema casi nunca se modela como sistema: se cuenta en cinemáticas y luego el jugador vuelve a repartir puñetazos. Aquí la identidad secreta **es** el sistema. Cada persona del reparto lleva su propio expediente sobre el héroe, cada acción del jugador deja pistas de un tipo concreto, y cada personaje sólo puede percibir ciertos tipos de pista. La pregunta que el juego hace durante ocho horas no es "¿puedo ganar este combate?" sino **"¿puedo ganar este combate sin que Nuria ate cabos?"**.

De *Inazuma Eleven* tomamos su arquitectura real, que no es "un juego de fútbol" sino **un RPG cuyo sistema de combate es un ritual único, repetible y espectacular**, alternado sin costura con exploración cenital. Allí el ritual es el partido: encuentro aleatorio de 4c4 por la calle, jefe de 11c11 en torneo, y el mismo sistema sirve para reclutar. Aquí el ritual es la **Intervención**: una emergencia con reloj en marcha, resuelta con **duelos por comandos** que congelan la acción y ofrecen un menú de técnicas.

Y de *Inazuma Eleven* tomamos también su restricción de forma. La doble pantalla de la DS —escena arriba, comandos táctiles abajo— no es nostalgia: es **la proporción exacta de un móvil en vertical**. La caja de 352×515 de este catálogo es una DS abierta. La estética es consecuencia de la pantalla, no un disfraz.

---

## 1. Análisis de la referencia: qué es realmente *Inazuma Eleven*

Antes de diseñar hay que entender qué se está copiando, porque lo copiable no es lo visible.

### 1.1 La arquitectura de dos mitades

*Inazuma Eleven* alterna sin transición entre:

- **Mitad RPG.** Vista cenital, exploración de un pueblo compacto que se abre por capítulos. Tiendas, puntos de entrenamiento repartidos por el mapa, NPC con los que hablar, objetos escondidos. El mundo es pequeño a propósito: "el mundo no es tan grande, ni siquiera al final del juego". Compacto significa **memorizable**, y memorizable significa que el jugador tiene mapa mental y por tanto agencia.
- **Mitad combate.** Partidos. Los encuentros aleatorios son minipartidos 4c4 contra chavales de otros clubes que te retan por la calle. Los jefes son partidos completos 11c11 de torneo. **El mismo sistema sirve para los dos**, sólo cambia la escala.

**Lección para nosotros:** un solo ritual de combate, dos escalas. Escaramuza corta por la calle (2-3 minutos) e intervención mayor de capítulo (10-15 minutos). Nunca dos sistemas de combate distintos.

### 1.2 El duelo por comandos disfrazado de acción

Este es el hallazgo técnico de Level-5 y el que más nos interesa. Los jugadores se mueven solos; el jugador **dibuja rutas con el stylus** para dirigirlos, o toca a un rival para que su equipo vaya hacia él. Cuando dos jugadores chocan, **el juego se congela** y aparece un menú: regatear, entrar, tirar, esquivar.

El resultado no lo decide la destreza. Lo decide una tirada contra:

- las **estadísticas** del personaje (Kick, Body, Control, Guard, Speed, Stamina, Guts),
- su **elemento** (Fuego, Bosque, Aire, Tierra) frente al del rival,
- y **cuánta gente participa** en la acción.

Es decir: es un JRPG por turnos, pero el jugador nunca lo percibe como tal porque entre turno y turno la cámara enseña fútbol en movimiento. **La destreza está en la posición y en la elección, no en los reflejos.**

**Lección para nosotros:** esto es lo que hace el molde viable en web y en móvil. No necesitamos un motor de acción en tiempo real con detección de colisiones a 60 fps y controles táctiles precisos —que es donde mueren los juegos de superhéroes amateurs—. Necesitamos un motor de decisiones con presentación cinética. Es más barato, es más profundo y es **mucho** mejor en una pantalla táctil pequeña.

### 1.3 Dos recursos, no uno

- **TP (Technique Points):** se gastan al usar técnicas especiales. Sin TP, no hay espectáculo.
- **FP (Fitness Points):** la forma física. Si baja, el jugador corre lento, falla pases y lo tumban con facilidad.

Dos barras que se agotan a ritmos distintos y que castigan de formas distintas. La gestión de TP a lo largo de un partido es la decisión estratégica de fondo: gastar pronto para ir por delante, o guardar para el minuto ochenta.

**Lección para nosotros:** dos recursos con castigos cualitativamente distintos, no dos barras de vida. Los llamaremos **Carga** y **Compostura**.

### 1.4 Hissatsu: las técnicas especiales

Divididas en cinco familias —tiro, regate, bloqueo, parada y skill—, cada una con un coste de TP y una potencia que escala con ese coste. Y cada una **con su animación de primer plano**. Ese corte de cámara de dos segundos es el 80% de la identidad del juego. Es lo que convierte una tirada de dados en un momento de anime.

**Lección para nosotros:** presupuestar desde el principio las animaciones de técnica como contenido de primera clase, no como pulido final. Cinco familias, no veinte: **Impacto, Velocidad, Luz, Escudo, Sentido**.

### 1.5 Colección y reclutamiento

Cerca de mil personajes reclutables, cien en plantilla. Se localizan por nombre, por criterio o por un "mapa de conexiones", se encuentran físicamente en el mapa y se reclutan **ganándoles un partido**.

**Lección para nosotros — y aquí divergimos deliberadamente.** No habrá plantilla ni reclutamiento. La razón es de integridad temática: la premisa dice que si se descubre su identidad, el chaval desaparece para siempre. Esa amenaza sólo pesa si está **solo**. Un equipo de superhéroes que sabe quién eres desinfla la mecánica de sospecha en el momento en que se forma. Lo que sí heredamos es el **impulso de coleccionar**: aquí se coleccionan **técnicas** (aprendidas de mentores y de villanos derrotados), **piezas de traje** y **expedientes cerrados**.

### 1.6 Presentación

Estética "de acuarela", diseños de personaje de origen anime declarado, y partidos **cortos**: "nunca se alargan más de la cuenta, terminan en cuestión de minutos". La brevedad es diseño, no limitación técnica.

**Lección para nosotros:** ninguna Intervención debe pasar de 12 minutos, y las escaramuzas de calle deben resolverse en 2-3. El juego dura 8 horas por **cantidad y densidad de contenido**, nunca por alargar encuentros.

### 1.7 Tabla de traducción

| *Inazuma Eleven* | FULGOR | Nota |
|---|---|---|
| Partido | **Intervención** | El ritual repetible único |
| Minipartido 4c4 callejero | **Escaramuza** | Encuentro aleatorio al patrullar |
| Partido de torneo 11c11 | **Intervención decisiva** | Jefe de capítulo |
| Duelo de comandos | **Duelo** | Idéntico en función |
| TP | **Carga** | Batería eléctrica del héroe |
| FP | **Compostura** | Aguante físico y nervioso |
| Hissatsu (5 tipos) | **Técnicas** (5 familias) | Impacto, Velocidad, Luz, Escudo, Sentido |
| Elementos (Fuego/Bosque/Aire/Tierra) | **Afinidades** (Rayo/Luz/Sombra/Materia) | Ciclo de ventaja |
| Reclutar 1000 jugadores | **Aprender técnicas + construir traje** | Divergencia deliberada |
| Formación del equipo | **Equipamiento del traje** | Seis ranuras con compromisos |
| Puntos de entrenamiento por el mapa | **Puntos de entrenamiento por Marés** | Se mantiene tal cual |
| Pueblo de Inazuma | **Ciudad de Marés** | Compacta a propósito: 9 distritos |
| *(no existe)* | **Expedientes** | Nuestra aportación estructural |

---

## 2. Los tres pilares

Todo lo demás cuelga de estos tres. Si uno se cae, el juego se cae.

### Pilar 1 — El secreto no es un medidor, es un reparto

No hay barra global de sospecha. **Cada personaje relevante lleva su propio expediente.** Un expediente tiene interés (cuánto está mirando), pistas acumuladas (concretas, con nombre) y un umbral. Cuando las pistas alcanzan el umbral, ese personaje —no el juego— descubre quién eres.

Y esto importa porque **el resultado depende de quién sea**. Que lo descubra tu hermana pequeña es una escena hermosa y un aliado nuevo. Que lo descubra la inspectora Sabater es el final de la partida. El reparto deja de ser decorado y pasa a ser la curva de dificultad.

### Pilar 2 — La economía del tiempo es el juego

El día se parte en tres bloques y las emergencias interrumpen. Ir a la emergencia significa faltar al cumpleaños de Nuria; faltar al cumpleaños de Nuria enfría ese vínculo; ese vínculo enfriado era la coartada que ella te daba sin saberlo. Las ocho horas no son ocho horas de combate: son ocho horas de **elegir a quién fallas**.

### Pilar 3 — Ganar rápido es delatarse

Dentro del combate, las técnicas que resuelven un duelo de un golpe son las que más te exponen. Una descarga que parte una viga se ve desde tres manzanas. Ganar limpio es más difícil, más lento y más seguro. El jugador negocia constantemente entre **eficacia y discreción**, y esa negociación es la firma del juego.

> **La paradoja del vínculo.** Subir el vínculo con un personaje te protege: te da coartadas, ayuda, recursos, técnicas. Y a la vez te expone: quien te quiere te mira más de cerca, y percibe pistas Íntimas que un desconocido jamás vería. **No hay jugada dominante.** El jugador que se aísla para estar seguro pierde los recursos y llega desnudo al capítulo 10; el jugador que se rodea de gente llega fuerte y con cuatro expedientes casi llenos. Esta es la tensión que sostiene las ocho horas.

---

## 3. Sistema I — Expedientes y pistas

El sistema central. Todo lo demás lo alimenta.

### 3.1 Estructura del expediente

```js
expediente = {
  id: "sabater",
  interes: 0..100,        // cuánto está mirando ahora mismo
  pistas: Set<pistaId>,   // permanentes salvo que las retires activamente
  umbral: 3..8,           // cuántas pistas necesita para cerrar
  sesgos: ["digital", "temporal"],  // qué tipos puede siquiera percibir
  estado: "latente" | "activo" | "obsesivo" | "cerrado",
  desenlace: "aliado" | "amenaza" | "ruina",
}
```

### 3.2 Los cinco tipos de pista

| Tipo | Qué es | Quién puede verla | Cómo se retira |
|---|---|---|---|
| **Testimonial** | Alguien te vio, con o sin máscara | Cualquiera presente | Desmentido, testigo desacreditado, coartada de terceros |
| **Física** | Un objeto: jirón del traje, guante quemado, herramienta | Quien tenga acceso al lugar | Misión de recuperación de la prueba |
| **Temporal** | Tu ausencia coincide con una aparición del héroe | Quien conozca tu agenda | Coartada retroactiva (cuesta un vínculo) |
| **Digital** | Cámara de seguridad, foto de móvil, publicación en red | Quien tenga acceso técnico | Misión de infiltración, o comprar el silencio |
| **Íntima** | Quemaduras en las manos, insomnio, olor a ozono, mentiras torpes | **Sólo vínculo ≥ 3** | Casi imposible: sólo tiempo y distancia |

**La elegancia del sistema está aquí:** una misma acción produce pistas distintas según quién esté delante. Apagar un incendio con una descarga ante una cámara municipal genera una pista Digital que va al expediente de Sabater y de Marga; hacerlo ante tu vecina genera una Testimonial que va al de Doña Pilar; volver a casa con las manos quemadas genera una Íntima que sólo tu madre y tu hermana pueden leer.

### 3.3 Generación de pistas

```
P(pista) = visibilidad(acción)
         × proximidad(testigo)
         × (1 − ocultación(traje))
         × atención(testigo)
         × contexto(hora, clima, distrito)
```

- **visibilidad(acción)** 0–3, propiedad de cada técnica y de cada resultado de duelo.
- **proximidad** 0–1 según el nodo del escenario.
- **ocultación(traje)** 0–0.85, suma de las seis piezas.
- **atención(testigo)** sube con su `interes` y con su `vínculo` contigo.
- **contexto**: de noche ×0.6, con lluvia ×0.5, en el Distrito Portuario ×0.7 (poca cámara), en el Centro ×1.4 (mucha).

Si la tirada falla por poco (dentro del 15%), no hay pista pero **el `interes` del testigo sube 5**. Los sustos importan. Un personaje puede pasar de latente a obsesivo sin tener una sola pista, y entonces empieza a mirar donde antes no miraba.

### 3.4 Interés y decaimiento

`interes` decae 2 puntos por día sin estímulo, con un suelo por personaje (Sabater nunca baja de 30: es su trabajo). Las pistas **no decaen nunca**. Se retiran una a una, con trabajo, y ese trabajo es un tipo de misión completo.

Estados: **latente** (< 20, no investiga), **activo** (20–59, hace preguntas, aparece en escenas), **obsesivo** (≥ 60, te sigue, aparece en las Intervenciones como complicación, reduce su propio umbral en 1).

### 3.5 Los tres desenlaces

Cuando un expediente se cierra, se resuelve según el tipo de personaje:

- **Aliado** (Nuria, Isma, Requena, Julia, Iria). Escena obligatoria, y a partir de ahí es un **confidente**: te da un recurso permanente (coartada automática, taller, acceso, información). Pero hereda tu problema: los confidentes pueden ser interrogados, seguidos y usados contra ti. Cada confidente añade una vía nueva por la que la verdad puede salir.
- **Amenaza** (Marga, Óscar, Ezequiel, Doña Pilar). No te delata: te **cobra**. Abre un sistema de presión con peticiones periódicas. Ignorarlas sube su `interes` hacia la ruina.
- **Ruina** (Sabater, Cero, y cualquiera en estado obsesivo si el jugador ya tiene tres expedientes cerrados). Desenmascaramiento público. **No es un game over de pantalla roja**: es un final, con su epílogo escrito, y el juego lo trata como tal. Hay autoguardado en el último bloque, y el jugador puede volver, pero el juego no le esconde que ese final existe y es legítimo.

### 3.6 Por qué esto sostiene ocho horas

Porque es el único sistema del juego que **nunca se resetea**. Las Intervenciones se ganan o se pierden y se acaban; los expedientes se acumulan capítulo tras capítulo. En la hora 1 el jugador usa la técnica más potente porque es la que tiene. En la hora 6 se lo piensa dos veces porque sabe que Sabater está a dos pistas. Es la misma acción y significa algo completamente distinto. Eso es progresión narrativa expresada como mecánica.

---

## 4. Sistema II — La Intervención

El ritual repetible. El "partido".

### 4.1 Anatomía

Toda Intervención tiene:

1. **Un reloj.** No es un cronómetro de fracaso: es un **medidor de agravamiento**. Cada turno gastado empeora la situación de forma legible y concreta: el fuego sube una planta, el ladrón llega al coche, el rehén se desmaya. El jugador siempre ve qué va a empeorar en el siguiente turno.
2. **Un escenario.** Un plano pequeño de 6 a 14 **nodos** conectados (azoteas, callejones, plantas de un edificio, muelles). Se dibuja en el panel superior.
3. **Un objetivo principal** y de 1 a 3 **objetivos opcionales** (sacar al gato, recuperar la prueba física que dejaste el capítulo pasado, evitar que la cámara te grabe).
4. **Testigos colocados en el escenario.** Visibles antes de empezar. El jugador **sabe** quién está mirando y desde dónde: la información nunca es una trampa.
5. **Un balance final** que produce: resultado, Exposición generada (pistas), daño al traje, experiencia, materiales.

### 4.2 El bucle

```
    ┌─ Fase de lectura ── el escenario, los testigos, el reloj y el objetivo
    │
    ├─ Fase de ruta ───── arrastras el dedo del nodo actual a otro nodo.
    │                     El coste en turnos depende de tu Velocidad y de la ruta.
    │                     Rutas visibles (por la calle) son rápidas y expuestas;
    │                     rutas de sombra (azoteas, alcantarillas) lentas y limpias.
    │
    ├─ ¿Hay adversario o incidente en el nodo?
    │     ├─ Sí → DUELO (§5)
    │     └─ No → acción de nodo (rescatar, desactivar, recuperar, esconderse)
    │
    ├─ El reloj avanza. La situación empeora. Vuelve a fase de ruta.
    │
    └─ Fin: objetivo cumplido, reloj agotado, o Compostura a cero.
```

El arrastre de ruta es el equivalente directo del stylus de la DS, y es el gesto táctil más natural que existe en un móvil. Es la razón de que este molde funcione aquí y no otro.

### 4.3 Escaramuzas: los encuentros aleatorios

Patrullar de noche consume un bloque y genera de 1 a 3 **Escaramuzas**: escenario de 3-4 nodos, un objetivo, dos o tres turnos. Son los minipartidos 4c4 de *Inazuma Eleven*. Sirven para tres cosas: subir nivel, conseguir materiales del traje y **subir el Rango de héroe**. Y siempre generan algo de Exposición, así que repetirlas tiene precio.

Un banco de ~40 plantillas de escaramuza, parametrizadas por distrito y capítulo, garantiza variedad sin escribir cuarenta escenarios a mano.

### 4.4 Intervenciones decisivas

Una por capítulo. 10-15 minutos. Escenario de 10-14 nodos, dos o tres fases, un antagonista con su propio bucle de comportamiento, música dedicada y consecuencias narrativas fijas. Son los partidos de torneo.

### 4.5 Resultado

| Resultado | Cuándo | Efecto |
|---|---|---|
| **Impecable** | Objetivo cumplido, 0 pistas generadas | Rango +2, materiales dobles, escena de prensa favorable |
| **Limpio** | Objetivo cumplido, ≤ 1 pista | Rango +1, materiales normales |
| **Sucio** | Objetivo cumplido, ≥ 2 pistas | Rango +1, `interes` +10 a todo testigo presente |
| **Parcial** | Objetivo principal fallado, opcionales cumplidos | Sin rango, la trama continúa con daños |
| **Fallido** | Nada cumplido | Rango −1, consecuencia narrativa concreta, **la historia sigue** |

**El juego no ofrece reintentar.** Una Intervención fallida no se repite: cambia el capítulo y la historia sigue desde ahí. (El jugador siempre puede recargar un guardado — eso es cosa suya —, pero el juego nunca se lo propone ni le pone un botón delante, porque proponerlo convertiría cada fracaso en un trámite.) Es lo que hace que el reloj importe de verdad, y por eso el juego es generoso con los recursos: no perdona los resultados, así que no puede además racanear los medios.

---

## 5. Sistema III — El Duelo

Cuando el héroe entra en un nodo ocupado, **la escena se congela** y el panel inferior se llena de comandos. Copia funcional exacta del duelo de *Inazuma Eleven*, con nuestros dos recursos y nuestras afinidades.

### 5.1 Estadísticas

Siete, en paralelo a las de la referencia:

| Stat | Qué gobierna | Equivalente IE |
|---|---|---|
| **Potencia** | Daño de las técnicas de Impacto | Kick |
| **Cuerpo** | Resistir agarres, empujar, aguantar golpes | Body |
| **Control** | Precisión: acertar sin destrozar el entorno | Control |
| **Guardia** | Reducir el daño recibido y el gasto de Compostura | Guard |
| **Velocidad** | Coste en turnos de las rutas, iniciativa en el duelo | Speed |
| **Aguante** | Carga máxima y regeneración por turno | Stamina |
| **Temple** | Compostura máxima; resistencia al miedo y al dolor | Guts |

Suben con nivel (3 puntos libres por nivel) y con los **puntos de entrenamiento** repartidos por Marés, cada uno especializado: el rompeolas sube Cuerpo, la subestación sube Aguante, la azotea del instituto sube Velocidad, la biblioteca sube Control, el faro sube Temple.

### 5.2 Los dos recursos

**Carga** (0–100). Se gasta al usar técnicas. Se regenera +8 por turno de duelo, y se rellena por completo tocando cualquier fuente eléctrica del escenario (farola, cuadro, catenaria) — un turno gastado a cambio. **Con Carga a 0 sólo quedan acciones básicas.** Sin Carga no hay espectáculo, exactamente como el TP.

**Compostura** (0–100). Aguante físico y nervioso. Baja al recibir golpes, al fallar, al ser visto y al sostener técnicas de concentración. **Los castigos son escalonados y cualitativos**, no una barra de vida:

| Compostura | Efecto |
|---|---|
| 100–70 | Normal |
| 69–40 | −15% éxito en todas las tiradas; las rutas cuestan +1 turno |
| 39–15 | Las técnicas de Luz y Sentido se bloquean (requieren concentración); la visibilidad de todo lo que haces sube +1 |
| 14–1 | Sólo acciones básicas; cada acción tiene 25% de generar una pista extra por torpeza |
| 0 | **Caes.** Fin de Intervención con resultado Fallido y una pista Física garantizada (te llevan, dejas algo) |

Que Compostura baja **suba tu visibilidad** es la unión de los pilares 1 y 3: cansarte no sólo te hace perder, te hace delatarte.

### 5.3 Afinidades

Cuatro, en ciclo cerrado: **Rayo → Materia → Sombra → Luz → Rayo**.

- **Rayo**: fuerza bruta eléctrica. Impacto, aturdimiento, sobrecarga.
- **Luz**: percepción, cegar, iluminar, revelar. Lo contrario de esconderse.
- **Sombra**: ocultación, silencio, apagar. Bajísima visibilidad.
- **Materia**: lo físico y lo mecánico. Metal, estructuras, máquinas.

Ventaja de afinidad: **×1.35 al éxito**. Desventaja: **×0.75**. Es el mismo peso que en la referencia, donde el elemento "determina en gran medida" el resultado del duelo.

Dani empieza siendo puro **Rayo**. Aprende **Luz** en el capítulo 6 con La Vigía, **Materia** en el 9 y **Sombra** —la afinidad de su antagonista— en el 11, como acto narrativo. **La adquisición de afinidades es la espina dorsal de la progresión.**

### 5.4 Resolución

```
éxito = clamp(
  0.50
  + (statRelevante(atacante) − statOpuesta(defensor)) × 0.012
  + (potenciaTécnica − resistenciaTécnica) × 0.020
  + bonoAfinidad          // +0.13 / 0 / −0.13
  + bonoPosición          // ventaja de nodo: altura, sombra, agua, cobertura
  + bonoTemple            // +0.08 si Compostura > 80
  − penalizaciónCompostura,
  0.05, 0.95
)
```

Suelo del 5% y techo del 95%: **nada es seguro y nada es imposible**, que es lo que mantiene viva la tensión durante ocho horas.

### 5.5 Menú de acciones

El panel inferior siempre ofrece, en este orden:

1. **Básicas** (coste 0 de Carga): Golpear, Esquivar, Agarrar, Retirarse.
2. **Técnicas equipadas** (máximo 6 ranuras, como las ranuras de hissatsu): con su coste de Carga, su afinidad y **su icono de visibilidad de 0 a 3 puntitos, siempre visible antes de elegir**. El jugador nunca se delata sin saber que se estaba delatando.
3. **Entorno**: lo que ese nodo concreto permite (cortar la luz, tirar el andamio, abrir la boca de riego, subir por la catenaria). Casi siempre es la opción de baja visibilidad y alto ingenio; **usar el entorno es la vía del jugador prudente**.
4. **Contener**: la acción de resolver un duelo sin ganarlo — inmovilizar, negociar, dejar escapar. Cuesta turnos y no da experiencia, pero genera cero pistas.

### 5.6 Las cinco familias de técnica

| Familia | Función | Afinidades típicas | Visibilidad |
|---|---|---|---|
| **Impacto** | Resolver un duelo por la fuerza | Rayo, Materia | Alta (2-3) |
| **Velocidad** | Moverse gratis, ganar iniciativa, huir | Rayo, Sombra | Media (1-2) |
| **Luz** | Cegar, revelar, ver a través, distraer | Luz | Variable (0-3) |
| **Escudo** | Absorber, proteger a un civil, aguantar | Materia, Rayo | Media (1-2) |
| **Sentido** | Leer al rival, adelantarse, detectar cámaras y testigos | Luz, Sombra | Nula (0) |

**Sentido es la familia del jugador experto.** No hace daño. Revela información: qué va a hacer el rival el próximo turno, dónde está la cámara que no viste, qué nodo tiene una salida oculta. En un juego cuyo pilar es la gestión de información, la familia que compra información es la más poderosa, y el diseño lo dice sin decirlo.

### 5.7 Catálogo inicial de técnicas (24 de ~40)

| Nombre | Familia | Afinidad | Carga | Vis. | Efecto |
|---|---|---|---|---|---|
| Chispazo | Impacto | Rayo | 8 | 1 | Daño bajo, fiable |
| Arco Voltaico | Impacto | Rayo | 22 | 3 | Daño alto, alcanza dos rivales |
| Puño de Tormenta | Impacto | Rayo | 30 | 3 | Resuelve el duelo si acierta |
| Yunque | Impacto | Materia | 26 | 2 | Derriba estructuras del nodo |
| Sobrecarga | Impacto | Materia | 18 | 2 | Inutiliza cualquier aparato |
| Paso Corto | Velocidad | Rayo | 6 | 0 | Muévete un nodo sin gastar turno |
| Relámpago | Velocidad | Rayo | 20 | 3 | Cruza medio escenario al instante |
| Vaho | Velocidad | Sombra | 12 | 0 | Rompe el duelo sin dejar rastro |
| Fuga | Velocidad | Sombra | 15 | 0 | Escapas y borras una pista Testimonial |
| Destello | Luz | Luz | 10 | 3 | Ciega: el rival pierde el turno |
| Espejismo | Luz | Luz | 16 | 1 | Los testigos ven a otro |
| Prisma | Luz | Luz | 24 | 2 | Divide un ataque entre tres rivales |
| Fulgor | Luz | Luz | 40 | 3 | **Técnica homónima.** Resuelve todos los duelos del nodo. Pista Digital garantizada |
| Cortina | Luz | Sombra | 14 | 0 | Apaga todas las luces del nodo |
| Pararrayos | Escudo | Rayo | 12 | 1 | Absorbe el próximo ataque y lo convierte en Carga |
| Malla | Escudo | Materia | 18 | 2 | Protege a un civil durante dos turnos |
| Aguante | Escudo | Materia | 10 | 0 | Recupera 25 de Compostura |
| Jaula | Escudo | Rayo | 20 | 2 | Inmoviliza sin dañar — la técnica de "Contener" mejorada |
| Escucha | Sentido | Sombra | 6 | 0 | Revela adversarios en nodos adyacentes |
| Lectura | Sentido | Luz | 8 | 0 | Muestra la acción del rival en el próximo turno |
| Barrido | Sentido | Luz | 10 | 0 | Marca todas las cámaras y testigos del escenario |
| Pulso | Sentido | Rayo | 12 | 0 | Muestra el plano completo, incluidas rutas ocultas |
| Anticipo | Sentido | Sombra | 16 | 0 | +25% de éxito en tu próxima acción |
| Silencio | Sentido | Sombra | 22 | 0 | Durante dos turnos, ninguna acción genera pistas |

Las 16 restantes se desbloquean con afinidades avanzadas, mentores y villanos derrotados. **Cada técnica tiene su animación de primer plano de 1.5-2.5 s** — el corte de cámara es innegociable.

---

## 6. Sistema IV — El traje

El traje no es cosmético. Es la hoja de personaje del héroe, y cada pieza es una negociación entre **poder y ocultación**.

### 6.1 Seis ranuras

| Ranura | Estadística principal | Compromiso característico |
|---|---|---|
| **Máscara** | Ocultación | Cuanto mejor oculta, peor ves (−Control) |
| **Torso** | Carga máxima | Los tejidos conductores brillan en la oscuridad (−Ocultación) |
| **Guantes** | Potencia | Los conductores buenos se calientan: queman tus manos (pistas Íntimas) |
| **Botas** | Velocidad | Las suelas rápidas son ruidosas (−Ocultación en Sigilo) |
| **Cinturón** | Utilidad (herramientas, cargas, dispositivos) | Peso: −Velocidad |
| **Manto** | Blindaje | Reduce daño pero es lo primero que se rasga: fuente n.º 1 de pistas Físicas |

### 6.2 Integridad

Cada pieza tiene **Integridad 0–100**. Los duelos la desgastan. Y aquí está la conexión con el pilar 1:

- **Integridad < 60**: la pieza es reconocible. Si un testigo te ve, la pista Testimonial gana un detalle ("llevaba el manto quemado en el hombro derecho"), y eso hace que dos pistas de distinta fuente **se refuercen entre sí**.
- **Integridad < 30**: cada duelo tiene 40% de dejar un fragmento en el escenario → **pista Física automática**, con nombre y ubicación, recuperable en una misión posterior.
- **Integridad = 0**: la pieza se destruye y sus estadísticas desaparecen hasta que la reconstruyas.

Reparar cuesta **materiales + un bloque de tiempo**, y ese bloque es un bloque que no pasas con nadie. La reparación compite directamente con los vínculos. Todo en este juego compite con los vínculos.

### 6.3 Progresión del traje

Cinco generaciones, ligadas a la historia:

1. **Improvisado** (cap. 2). Sudadera, un pañuelo, guantes de fregar. Ridículo y entrañable. Ocultación pésima. **El jugador debe sentir que necesita algo mejor.**
2. **De taller** (cap. 4). Con Yusuf, en el locutorio del puerto. Neopreno de segunda mano y cinta aislante. Funciona.
3. **Aislado** (cap. 6). Tras La Vigía: materiales de verdad, primera Carga máxima decente.
4. **Conductor** (cap. 9). Con material de Eléctrica Marés. Salto grande de poder y **caída de Ocultación**: es el momento en que el juego te tienta a ser espectacular justo cuando peor te viene.
5. **Fulgor** (cap. 11). El traje definitivo, construido con la ayuda de los confidentes que hayas ganado. **Sus estadísticas dependen literalmente de a cuánta gente hayas dejado entrar** — el pago mecánico de la paradoja del vínculo, y el momento en que el jugador entiende de qué iba el juego.

### 6.4 Materiales

Seis materiales (cobre recuperado, fibra, cerámica, imán de neodimio, óptica, núcleo) que se obtienen de escaramuzas, de comprarlos con Yusuf y de saquear los escenarios de las Intervenciones. Los objetivos opcionales de las Intervenciones son la mejor fuente: **explorar bien un escenario es cómo se mejora el traje**, y explorar cuesta turnos de reloj. Otra vez el mismo compromiso.

---

## 7. Sistema V — La vida civil

La mitad RPG. En *Inazuma Eleven* es un pueblo con tiendas y puntos de entrenamiento; aquí es una vida.

### 7.1 El calendario

Cada capítulo dura entre 6 y 12 **días**. Cada día son tres **bloques**: **Mañana**, **Tarde**, **Noche**.

- **Mañana** suele estar comprometida (instituto). Saltársela tiene coste: baja el vínculo con Requena y con tu madre, y genera pistas Temporales si el héroe apareció esa mañana.
- **Tarde** es el bloque libre principal.
- **Noche** es el bloque de patrulla, y usarlo tiene un coste de **Compostura de partida** al día siguiente (−15 si patrullas dos noches seguidas, −30 si son tres). Dormir es un recurso.

### 7.2 Acciones de bloque

| Acción | Coste | Da |
|---|---|---|
| **Clase / familia / obligación** | 1 bloque | Mantiene vínculos, evita pistas Temporales |
| **Quedar con alguien** | 1 bloque | +Vínculo, escenas de personaje, a veces técnicas |
| **Entrenar** | 1 bloque | +Stat en el punto de entrenamiento elegido |
| **Taller** | 1 bloque | Construir / reparar traje |
| **Trabajar** (repartos con Yusuf) | 1 bloque | Dinero |
| **Investigar** | 1 bloque | Avanzar tu propia investigación: quién dejó la llave |
| **Contramedidas** | 1 bloque | Retirar una pista concreta de un expediente concreto |
| **Patrullar** | 1 bloque (noche) | Escaramuzas: XP, materiales, Rango |
| **Descansar** | 1 bloque | +Compostura, −`interes` de todos |

**Las emergencias interrumpen.** En cualquier bloque puede sonar una alerta. Aceptarla convierte el bloque en una Intervención y **cancela lo que fueras a hacer**, con todas sus consecuencias. Rechazarla tiene su propio precio: la ciudad sufre, el Rango baja y a veces muere alguien con nombre.

### 7.3 Marés: nueve distritos

Compacta a propósito, como el pueblo de Inazuma. Se abre por capítulos.

| Distrito | Qué hay | Carácter |
|---|---|---|
| **Barrio de las Aguas** | Tu casa, el bloque, Doña Pilar | Hogar. Cálido, estrecho |
| **IES Miguel Servet** | Clase, azotea, laboratorio de Requena | Rutina, amistad, la vida que arriesgas |
| **La Concha** | Comercios, plaza, terrazas | Público. Cámaras por todas partes |
| **Puerto Viejo** | Locutorio de Yusuf, muelles, almacenes | Sin cámaras. Territorio de Los Cabos |
| **Distrito Financiero** | Torre de Eléctrica Marés | Vidrio, seguridad, altura |
| **Cerro del Faro** | El faro, miradores | Silencio. Aquí aparece La Vigía |
| **Polígono Norte** | La subestación, naves | Industrial. Donde todo empezó |
| **Hospital del Puerto** | Turno de tu madre | Donde llegan los que no salvaste |
| **Las Tolvas** | Ruinas de la antigua central | Prohibido. Se abre en el capítulo 10 |

---

## 8. El reparto

Veinte personajes con ficha propia —**trece de ellos con expediente**, los demás villanos y mentores que se enfrentan a Fulgor y no a Dani—, más elenco de capítulo. Cada ficha con expediente da: quién es, qué vínculo tiene con Dani, en qué órbita vive, qué tipos de pista percibe, cuántas necesita y qué pasa si lo descubre.

### 8.1 Órbita civil — el núcleo

**Dani Vela**, 15. Protagonista. Ni especialmente valiente ni especialmente listo: es **fiable**, y esa es exactamente la virtud que la doble vida destruye. Su arco es descubrir que ser fiable con todo el mundo a la vez es imposible.

**Nuria Vela**, 12. Hermana. Escribe. Se fija en todo y no dice nada hasta que está segura. — *Órbita civil · Sesgo: Íntima, Temporal · Umbral 3 · Aliado.* El expediente más fácil de llenar del juego, y a propósito: casi todas las partidas terminan con Nuria sabiéndolo. **Su escena de revelación es el corazón emocional del juego.** Como confidente, da coartada automática una vez por capítulo — y a partir de ahí el jugador carga con haber metido a una niña de doce años en esto.

**Carmen Ferrer**, madre. Enfermera de urgencias en el Hospital del Puerto. Turnos de noche. — *Órbita civil · Sesgo: Íntima, Física · Umbral 5 · Aliado.* El cruce perverso: **atiende a las personas que salvas y a las que no.** Si el jugador falla una Intervención, la escena siguiente puede ser su madre volviendo a casa deshecha por un paciente que él conoce. Ninguna barra de puntuación golpea tan fuerte.

**Tomás Vela**, padre. Técnico de mantenimiento de la red de Eléctrica Marés. — *Órbita civil + BISAGRA · Sesgo: Física, Temporal · Umbral 6 · Aliado.* Su empresa tapó el accidente del Polígono Norte. **Él firmó partes sin leerlos.** Su arco es entender que su firma está debajo de lo que le pasó a su hijo.

**Ismael "Isma" Doblas**, 15. Mejor amigo. Cómics, cámara, teorías. — *Órbita civil + BISAGRA · Sesgo: Digital, Testimonial · Umbral 4 · Aliado.* Es el que más rápido llega, porque es el único que **está buscando activamente** a un superhéroe. **Su revelación es el punto medio obligatorio de la campaña (cap. 8).** Como confidente: gestiona la parte digital, borra pistas Digitales, monta coartadas. Y es un adolescente con las manos temblando: cada vez que lo usas, hay una posibilidad de que meta la pata.

**Julia Reig**, 15. Compañera de clase. Reservada, buena en física. — *Órbita civil + BISAGRA · Sesgo: Digital, Testimonial · Umbral 5 · Aliado.* Hija de Ezequiel Reig. Vínculo romántico opcional. **Es la bisagra más cruel del juego**: cuanto más la quieres, más cerca estás de la casa del hombre que quiere cazarte.

**Óscar Nieto**, 16. El matón de clase. — *Órbita civil · Sesgo: Testimonial · Umbral 4 · Amenaza.* Subtrama de redención opcional. Su hermano está en Los Cabos. Si el jugador lo trata como un obstáculo, sigue siéndolo; si le dedica bloques, se convierte en el testigo que **desmiente** a otros testigos.

**Emiliano Requena**, 58. Profesor de física. — *Órbita civil + BISAGRA · Sesgo: Física, Íntima · Umbral 5 · Aliado.* **Él dejó la llave.** Fue investigador del proyecto Fulgor y lleva veinte años esperando a que alguien la recogiera. Su culpa es el motor de la trama de fondo. Mentor de las técnicas de Sentido.

**Doña Pilar**, 74. Portera del bloque. — *Órbita civil · Sesgo: Temporal, Testimonial · Umbral 4 · Amenaza.* Ve todas las entradas y salidas. No entiende de superhéroes, entiende de horarios, y los horarios es exactamente lo que Dani no puede sostener. **La amenaza más subestimada del juego.** Como amenaza, no chantajea: habla. Y lo que ella cuenta llega a Sabater.

**Yusuf Benali**, 41. Locutorio y taller en el Puerto Viejo. — *Órbita mixta · Sesgo: Física · Umbral 7 · Aliado.* Lo sabe casi desde el principio y no pregunta. Proveedor de materiales, taller y silencio. El adulto que no exige explicaciones — y por eso el jugador le cuenta cosas.

### 8.2 Órbita heroica

**Inspectora Elena Sabater**, 45. Unidad de Análisis. — *Órbita heroica · Sesgo: Digital, Temporal, Física · Umbral 8 · **RUINA**.* No es mala. Es buena en su trabajo, y su trabajo es identificar al enjuto que corre por las azoteas. **Es la única antagonista sistémica: no la derrotas, la gestionas.** No aparece en combate; aparece en el instituto haciendo preguntas amables. Su suelo de `interes` es 30 y sube 6 por cada Intervención de Rango. Su expediente completo es el final de la partida.

**Marga Ossorio**, 33. Redactora de *El Faro de Marés*. — *Órbita heroica · Sesgo: Testimonial, Digital · Umbral 6 · Amenaza o Aliado según trato.* La prensa es un sistema de doble filo: publicar sube tu Rango (y con él tus recursos) y sube el `interes` de toda la ciudad. **Con ella el jugador elige a qué velocidad quiere ser famoso.**

**Ezequiel Reig**, 52. Presidente de Eléctrica Marés. Padre de Julia. — *Antagonista principal · Sesgo: Digital, Física · Umbral 7 · Amenaza.* No quiere matarte: quiere **patentarte**. Financió el proyecto Fulgor, enterró el accidente y lleva veinte años buscando al que se llevó la carga.

**"El Tasador"** (Rufino Paz), 38. Ladrón de guante blanco con guantes de inducción robados a la empresa. — *Villano cap. 3 · Afinidad Materia.* El profesor de duelos: enseña al jugador que la fuerza bruta no basta.

**Aurelio "Hierro" Cid**, 44. Exboxeador, exoesqueleto de obra. — *Villano cap. 5 · Afinidad Materia.* El muro. Obliga a usar Escudo y entorno. Trágico: pelea para pagar un tratamiento.

**Larga** (identidad oculta hasta el cap. 11). — *Villano cap. 8 y 11-12 · Afinidad Sombra.* Tu contraparte exacta: tú iluminas, ella apaga. Fue "la elegida" antes que tú y el cofre le dio lo contrario. **Sabe lo que se siente y por eso sabe exactamente dónde apretar: en el capítulo 11 no te ataca, ataca tu identidad.**

**La Vigía** (Noor), 27. — *Aliada esquiva, caps. 6-7 · Afinidad Luz.* Otra elegida, superviviente de una generación anterior. Vive sin nombre, sin casa y sin nadie. **Es la advertencia hecha personaje: lo que le pasa a quien elige el secreto por encima de todo.** Enseña Luz. Nunca se une.

**Cero** (Adrián Sesé), 63. — *Antagonista final.* Diseñador del proyecto y del cofre. Cree que el poder debe pasar de mano en mano y que quien lo tiene debe renunciar a todo lo demás. **Su tesis es la mecánica del juego llevada al extremo, y desmontarla es el tema.**

**Dra. Iria Lem**, 39. Investigadora de Eléctrica Marés. — *Órbita heroica · Sesgo: Física · Umbral 6 · Aliado.* Arrepentida. La fuente interna a partir del capítulo 9.

**Los Cabos.** Banda del Puerto Viejo: **Chapa**, **Tuerca**, **el Sordo** y una docena sin nombre. Los adversarios recurrentes de las escaramuzas. Escalan con el jugador y algunos, con vínculo suficiente, dejan de pelear.

### 8.3 Elenco secundario

Unos veinticinco NPC más sin expediente pero con nombre y con una línea de diálogo que cambia por capítulo: compañeros de clase (Vera, Kike, Salma, Bruno), profesores, el frutero, la de la farmacia de guardia, el conductor del 14, los bomberos del parque de la Concha (que empiezan disparándote y acaban dejándote sitio), la pareja de patrulla de Sabater. **Es el tejido que hace que salvar Marés signifique algo**, y son baratísimos: un retrato y seis líneas por capítulo.

---

## 9. La campaña: doce capítulos

Doce capítulos de entre 30 y 45 minutos, **480 minutos en total = 8 horas**. Cada capítulo con la misma cadencia que un capítulo de *Inazuma Eleven*: **apertura civil → días libres → escalada → Intervención decisiva → epílogo**.

### Acto I — El elegido (caps. 1-4, 2 h 25)

**1. La llave** *(~30 min).* La vida antes. Un día entero de instituto, casa, Isma, Nuria, un examen de Requena. El juego enseña bloques, vínculos y diálogo, y no menciona superpoderes. Volviendo a casa, la llave y la nota. La subestación del Polígono Norte. El cofre. **El rayo.** — *Decisiva: no hay combate. Hay una huida a oscuras del edificio mientras el cuerpo no responde.* Tutorial invertido: el jugador aprende a moverse por nodos sin poder hacer nada. **Primera pista del juego: dejas la llave en el suelo del almacén.**

**2. Primeras chispas** *(~35 min).* Tres días de aprender a no romper cosas. Minijuegos de control en casa (fundir bombillas, el móvil de Nuria, la nevera). Requena nota las quemaduras. Isma enseña su carpeta de teorías. Incendio en un bajo de las Aguas. — *Decisiva: el incendio.* Traje improvisado. Salvas a dos de tres. **Tu madre recibe al tercero en urgencias esa noche.** Se abren los expedientes de Nuria, Isma y Doña Pilar.

**3. El Tasador** *(~40 min).* Marés tiene un ladrón que abre cajas fuertes sin tocarlas. Se abre el Puerto Viejo y Yusuf. Primeras escaramuzas contra Los Cabos. Primer punto de entrenamiento. — *Decisiva: El Tasador en la joyería de La Concha, con cámaras por todas partes.* Enseña afinidades (Materia vence a Rayo) y enseña **la lección de la casa**: se puede ganar y salir con tres pistas Digitales encima.

**4. Coartadas** *(~40 min).* **El capítulo bisagra del sistema.** Sabater llega a Marés y visita el instituto. Se abre el panel de Expedientes y la acción **Contramedidas**. Marga publica lo primero. Requena, sin querer, menciona un proyecto viejo. — *Decisiva: un atraco fallido con rehenes en La Concha, con Sabater en el cordón policial.* La primera Intervención que se puede ganar y perder a la vez.

### Acto II — El héroe (caps. 5-8, 2 h 45)

**5. Hierro** *(~40 min).* Un hombre con un exoesqueleto reventando cajeros. Traje de taller con Yusuf. Cumpleaños de Nuria **el mismo día** que el aviso. — *Decisiva: Hierro en las grúas del puerto.* Es el capítulo donde **el traje se rompe por primera vez** y el jugador descubre las pistas Físicas de la peor forma: dejando medio manto colgando de una grúa.

**6. El faro** *(~40 min).* Alguien te ha estado siguiendo. Cerro del Faro. **La Vigía.** Duelo-lección que no puedes ganar y que no hace falta ganar. Aprendes **Luz**. Su historia: fue elegida hace nueve años y hoy no tiene ni nombre. — *Decisiva: dos Intervenciones simultáneas en distintos distritos y sólo puedes ir a una.* La otra se resuelve sin ti y con consecuencias. **El capítulo donde el juego deja de perdonar.**

**7. El Faro de Marés** *(~40 min).* Marga te ofrece un trato: cuéntame algo y controlo la narrativa. El sistema de prensa y de Rango se abre del todo. La ciudad empieza a tomar partido: pintadas, camisetas, el niño del 4.º que se disfraza de ti. Y Sabater con el mapa lleno de chinchetas. — *Decisiva: intervención con público. Multitud grabando con el móvil.* Ganar es fácil; ganar sin salir en cuarenta vídeos, no.

**8. Lo que Isma sabía** *(~45 min).* **Punto medio.** Isma completa su expediente pase lo que pase — está guionizado, y la única variable es **cómo**: si el jugador ha cuidado el vínculo, te lo dice él; si no, se lo cuenta a otro primero. Escena larga en la azotea. Isma se convierte en confidente y en vulnerabilidad. — *Decisiva: **Larga**.* Primera derrota obligatoria: se lleva algo del laboratorio de Requena y te deja tirado en un callejón. **Y tu madre está de guardia esa noche.**

### Acto III — El nombre (caps. 9-12, 2 h 50)

**9. Eléctrica Marés** *(~45 min).* Infiltración en la torre del Distrito Financiero. Julia te deja entrar sin saber por qué. Iria Lem te pasa el expediente del proyecto. **Descubres la firma de tu padre.** Aprendes **Materia**. Traje conductor. — *Decisiva: salir de la torre con el expediente mientras el edificio se cierra.* Puro sigilo con reloj: la Intervención con más peso de Sentido y Sombra del juego.

**10. El apagón** *(~45 min).* Marés entera se queda a oscuras. Ocho horas sin luz. Semáforos, hospital sin generadores, ascensores, la gente en la calle. **Tu poder es lo único que funciona.** Estructura distinta: un solo escenario gigantesco —la ciudad— y una lista de emergencias simultáneas de las que sólo puedes atender la mitad. Se abren Las Tolvas. — *Decisiva: mantener con vida el quirófano donde opera tu madre mientras Larga corta la última línea.* **La secuencia insignia del juego.**

**11. Cero** *(~40 min).* Las Tolvas. Sesé, el cofre, las cuatro generaciones de elegidos anteriores. Aprendes **Sombra**. Larga se revela. Y la jugada de Sesé no es un combate: **es filtrar tu identidad a Sabater a cambio de que dejes el poder.** El capítulo se juega como una carrera de contramedidas: retirar pistas del expediente de Sabater antes de que se cierre, con el reloj de la campaña encima. — *Decisiva: la que decidas.* El jugador elige a quién sacrifica.

**12. El nombre** *(~40 min).* Reig activa la central. Marés otra vez en peligro y esta vez todo el mundo mirando. Traje Fulgor, construido con lo que hayan aportado tus confidentes. — *Decisiva: dos fases contra Larga y contra la central.* Y la última pregunta: **si te quitas la máscara, ganas el combate y pierdes la vida que llevas ocho horas protegiendo.** El juego te deja elegir de verdad.

### 9.1 Finales

Determinados por el estado de los expedientes, el Rango y las decisiones de los capítulos 11-12. **Siete finales**, ninguno etiquetado como "bueno" o "malo":

1. **El secreto intacto.** Nadie te descubrió salvo quien elegiste. Vuelves a clase el lunes.
2. **La Vigía.** Salvaste la ciudad y perdiste a todo el mundo. El mismo final que Noor, y el juego lo dice.
3. **A cara descubierta.** Te desenmascaras por voluntad propia. Ganas. Marés te protege — o no, según tu Rango.
4. **Desenmascarado.** Sabater cerró el expediente. Epílogo escrito, no pantalla de derrota.
5. **El relevo.** Le pasas la llave a otro, como Sesé quería, pero en tus términos.
6. **Los dos.** Sólo accesible con cuatro confidentes o más: la doble vida se sostiene porque **hay gente sosteniéndola contigo**. La refutación de la tesis de Cero y el final más difícil de alcanzar.
7. **La ciudad a oscuras.** Fallaste el capítulo 12. Marés sobrevive, tú también, nada vuelve a ser igual.

### 9.2 Presupuesto de las 8 horas

| Componente | Minutos | % |
|---|---|---|
| Escenas narrativas y diálogo | 150 | 31% |
| Intervenciones decisivas (12) | 145 | 30% |
| Vida civil: bloques, vínculos, decisiones | 95 | 20% |
| Escaramuzas y patrulla | 50 | 10% |
| Gestión: traje, técnicas, expedientes | 40 | 8% |
| **Total** | **480** | **100%** |

Un jugador completista añade 2-3 horas (escaramuzas opcionales, vínculos secundarios, retirada de pistas, finales alternativos). Uno que corra la trama baja a ~6 h. **La banda 6-11 h es la correcta** para un objetivo declarado de 8.

---

## 10. Dirección de arte

### 10.1 La doble pantalla

El layout es el argumento visual de todo el juego.

```
┌──────────────────────────────┐  ← 352 px en móvil
│                              │
│      PANEL SUPERIOR          │
│      La escena                │  ~58% de la altura
│      (canvas 2D)              │  Escenario, personajes,
│                              │  animaciones de técnica
│                              │
├──────────────────────────────┤  ← el "hinge"
│  Carga ▮▮▮▮▮▯▯  Comp ▮▮▮▮▮▮▮ │
│  ┌────────┬────────┐         │
│  │Impacto │Velocid.│         │  ~42% de la altura
│  ├────────┼────────┤         │  Comandos táctiles,
│  │  Luz   │ Escudo │         │  mapa de nodos,
│  └────────┴────────┘         │  menús
│  ⟨ Entorno ⟩  ⟨ Contener ⟩   │
└──────────────────────────────┘  ← 515 px
```

En escritorio los dos paneles se colocan lado a lado con la misma proporción interna, dentro de un marco que **evoca** una consola sin imitarla literalmente. **La bisagra es un elemento de diseño real**: una línea horizontal con un tratamiento propio que separa "lo que ves" de "lo que decides".

### 10.2 Dos paletas para dos vidas

La decisión visual más importante: **la vida civil y la vida de héroe no comparten paleta**, y la transición entre ellas es un momento.

**Vida civil — "de día", cálida y gastada:**
```
--civil-fondo:    #f4ede3   crema de papel
--civil-tinta:    #2a2622   marrón casi negro
--civil-acento:   #c8622d   naranja de ladrillo
--civil-apoyo:    #7d8a6f   verde de persiana
--civil-piel:     #e8c9a8
```

**Vida de héroe — "de noche", fría y eléctrica:**
```
--heroe-fondo:    #0d1220   azul de medianoche
--heroe-tinta:    #e8f4ff   blanco azulado
--heroe-acento:   #38e1ff   cian eléctrico   ← el color de Dani
--heroe-peligro:  #ff4d5e   rojo de alarma
--heroe-sombra:   #6b4bd6   violeta (Larga)
```

**El cian `#38e1ff` es la firma del juego y está racionado.** Sólo aparece en: el poder de Dani, la barra de Carga, y la letra del logotipo. Nunca en botones, nunca en decoración. Cuando aparece, significa que hay electricidad en pantalla.

Y el detalle que ata las dos paletas: **cuando el jugador está en vida civil pero un expediente está en estado obsesivo, entra cian en la escena civil** — un reflejo, una farola, la pantalla de un móvil. La vida de héroe manchando la normal. Es una señal de estado disfrazada de atmósfera.

### 10.3 Estilo gráfico

Herencia declarada de *Inazuma Eleven*: **acuarela y anime**. Traducido a lo que este repo puede sostener:

- **Personajes:** retratos de busto pintados con lavados de acuarela y línea de tinta desigual. Cuatro expresiones por personaje principal (neutro, tenso, roto, decidido), dos por secundario. En el canvas de escena son **siluetas planas** de dos tonos, no sprites detallados: legibles a 352 px y muchísimo más baratos de producir.
- **Escenarios:** fondos pintados por distrito (nueve fondos base × tres horas del día = 27), con los nodos superpuestos como elementos vectoriales.
- **Nodos:** círculos con anillo. El grosor del anillo indica visibilidad del nodo; el relleno, si hay adversario, civil o prueba.
- **Rutas:** se dibujan mientras arrastras, con un trazo que **cambia de color según la visibilidad de la ruta** — cálido para expuesta, azul apagado para sombra. El jugador ve el compromiso mientras lo hace, no después.
- **Técnicas:** el corte de cámara. Fondo de líneas de velocidad, la silueta del héroe a gran tamaño, el nombre de la técnica en tipografía de impacto, 1.5-2.5 s. **Es lo que la gente va a recordar.**

### 10.4 Tipografía

- **Titulares y nombres de técnica:** una grotesca condensada de mucho peso, en mayúsculas, con inclinación. Debe gritar.
- **Diálogo y cuerpo:** una humanista legible a 14 px en móvil.
- **Expedientes y documentos:** monoespaciada — los informes de Sabater deben parecer informes.

Tres familias, ni una más, todas desde Google Fonts (permitido por la CSP de artefactos) con pila de reserva completa.

### 10.5 Accesibilidad

- Nunca sólo color: la visibilidad se dice con puntos, la afinidad con icono, el estado del expediente con etiqueta.
- Contraste AA mínimo en ambas paletas.
- `prefers-reduced-motion` desactiva las líneas de velocidad y los destellos, y acorta los cortes de técnica a un fundido — **respetando el hueco temporal** para que el ritmo no cambie.
- Los cortes de técnica se pueden saltar con un toque y hay un ajuste de "animaciones cortas" en opciones. En una partida de 8 horas, ver la misma animación cuarenta veces es un problema real de diseño, no una molestia menor.

---

## 11. Banda sonora y audio

Requisito explícito: **banda sonora propia, con música libre de derechos y suficiente variedad para distintos momentos, contextos y ambientes.**

### 11.1 Restricción legal, primero

Este proyecto tiene monetización y consentimiento de cookies documentados (`docs/cookie-consent-and-monetization.md`). Eso significa **uso comercial**, y de ahí sale la regla dura:

> **Prohibidas las licencias `NC` (no comercial) y `ND` (sin derivadas).** Sólo se admiten pistas **CC0 / dominio público**, **CC-BY** (con atribución cumplida) o licencias de uso comercial explícitas.

`ND` queda fuera porque vamos a **recortar, hacer bucles y separar en capas**, y eso son obras derivadas.

Fuentes admitidas, en orden de preferencia:

| Fuente | Licencia | Uso |
|---|---|---|
| **OpenGameArt** (filtro CC0) | CC0 | Bucles de juego, stingers. Ideal: hecho para juegos |
| **Kenney.nl** | CC0 | Efectos e interfaz. Coherentes entre sí |
| **Musopen / IMSLP** | Dominio público | Cuerdas y piano para escenas emotivas |
| **Free Music Archive** (filtro CC0/CC-BY) | CC0 / CC-BY | Ambientes y temas |
| **Incompetech (Kevin MacLeod)** | CC-BY 4.0 | Enorme catálogo por estado de ánimo |
| **freesound.org** (filtro CC0) | CC0 | Ambientes reales: lluvia, tráfico, zumbido |
| **Pixabay Music** | Licencia propia, comercial permitido | Relleno; **verificar pista a pista** |

**Disciplina obligatoria:** un fichero `docs/audio-licenses.md` con una fila por pista — nombre de archivo, título original, autor, licencia, URL de origen, fecha de descarga y qué modificaciones se hicieron. Los créditos CC-BY salen además **dentro del juego**, en una pantalla de créditos accesible desde el menú. Sin esa fila, la pista no entra en el repositorio. Esto no es burocracia: es lo que hace que el juego se pueda publicar.

### 11.2 Arquitectura musical: capas adaptativas

La decisión técnica que hace que 28 pistas suenen a muchas más. Las piezas de Intervención **no son un archivo, son tres**, alineados al mismo tempo y compás:

```
capa A — base       colchón armónico, siempre sonando
capa B — pulso      percusión y bajo; entra cuando el reloj pasa del 50%
capa C — tensión    lead/cuerdas agudas; entra en el último 25% o en duelo
```

Las tres se lanzan a la vez con Howler, en bucle, y sólo se mueve su volumen (rampas de 800 ms). Resultado: la música **sigue la urgencia de la Intervención** sin un solo corte, con el coste de producción de tres bucles cortos. Es la técnica estándar de la industria y encaja perfectamente con un sistema de reloj.

Para las pistas de capas se buscan fuentes con **stems separados** (OpenGameArt suele tenerlos) o se construyen las capas a partir de una pista CC0 mediante filtrado y mezcla — de ahí que `ND` esté prohibida.

### 11.3 Listado de pistas

**28 piezas musicales + 5 stingers + 12 ambientes.** Cada una con función, carácter, duración de bucle y dónde suena.

#### Identidad y menús

| # | Pista | Carácter | Bucle | Dónde |
|---|---|---|---|---|
| 01 | **Marés** (tema principal) | Piano + cuerdas, melancólico y esperanzado. Contiene el leitmotiv de Dani | 1:40 | Título, créditos |
| 02 | **Nombre en clave** | El leitmotiv reorquestado con sintetizador y percusión | 1:10 | Pantalla de guardado, selección de capítulo |
| 03 | **Silencio de menú** | Casi ambiente: un acorde y un zumbido | 0:50 | Traje, técnicas, opciones |

#### Vida civil

| # | Pista | Carácter | Bucle | Dónde |
|---|---|---|---|---|
| 04 | **Barrio de las Aguas** | Guitarra acústica, ukelele, ligero | 1:30 | Tu casa, el bloque |
| 05 | **Timbre de las ocho** | Piano juguetón, marimba | 1:20 | IES, pasillos, clase |
| 06 | **Recreo** | Variante más rápida y alegre de la 05 | 1:00 | Escenas con Isma y Julia |
| 07 | **La Concha** | Guitarra con swing, trompeta suave | 1:25 | Comercios, plaza |
| 08 | **El locutorio** | Bajo, teclado eléctrico, aire de puerto | 1:35 | Yusuf, Puerto Viejo |
| 09 | **Mesa de la cocina** | Piano solo, tres voces | 1:05 | Escenas familiares |
| 10 | **Lo que no le dije** | Cuerdas contenidas | 1:15 | Escenas de vínculo, romance |
| 11 | **Turno de noche** | Piano y sintetizador frío | 1:20 | Hospital, escenas con Carmen |
| 12 | **Tarde de examen** | Percusión ligera, tic-tac | 1:00 | Bloques de estudio, minijuegos civiles |

#### Ciudad y patrulla

| # | Pista | Carácter | Bucle | Dónde |
|---|---|---|---|---|
| 13 | **Azoteas** | Sintetizador amplio, batería lenta | 1:45 | Desplazarse de noche |
| 14 | **Distrito Financiero** | Arpegios fríos, cristal | 1:30 | Torre, sigilo |
| 15 | **Cerro del Faro** | Cuerdas y viento, casi ambiente | 2:00 | Faro, escenas con La Vigía |
| 16 | **Las Tolvas** | Drones, metal, disonancia | 1:40 | Ruinas, capítulos 10-11 |

#### Intervención — tres capas cada una

| # | Pista | Carácter | Bucle | Dónde |
|---|---|---|---|---|
| 17 | **Aviso** (A/B/C) | Percusión urgente, sintetizador en pulsos | 1:20 | Intervenciones estándar |
| 18 | **Sigilo** (A/B/C) | Bajo palpitante, apenas melodía | 1:30 | Intervenciones de infiltración |
| 19 | **Rescate** (A/B/C) | Épica contenida, cuerdas ascendentes | 1:25 | Intervenciones con civiles en riesgo |
| 20 | **Escaramuza** | Corta, punk, entra y sale rápido | 0:45 | Encuentros de patrulla |

#### Duelo y jefes

| # | Pista | Carácter | Bucle | Dónde |
|---|---|---|---|---|
| 21 | **Cara a cara** | Riff de guitarra + electrónica, tempo alto | 1:15 | Duelos normales |
| 22 | **El Tasador** | Jazz nervioso, contrabajo | 1:30 | Jefe cap. 3 |
| 23 | **Hierro** | Metal industrial, percusión de yunque | 1:35 | Jefe cap. 5 |
| 24 | **Larga** | El leitmotiv de Dani en modo menor, invertido | 1:40 | Jefe caps. 8, 11, 12 |
| 25 | **Cero** | Orquesta y coro sintético, solemne | 2:00 | Clímax cap. 12 |

#### Narrativa

| # | Pista | Carácter | Bucle | Dónde |
|---|---|---|---|---|
| 26 | **Alguien lo sabe** | Dos notas repetidas, tensión creciente | 0:55 | Un expediente llega a obsesivo o se cierra |
| 27 | **El apagón** | Silencio con un solo pulso grave | 2:10 | Capítulo 10 entero |
| 28 | **Lo que queda** | El tema principal a piano solo, más lento | 1:50 | Epílogos y finales |

#### Stingers (2-4 s, sin bucle)

`sting-tecnica-rayo` · `sting-tecnica-luz` · `sting-victoria` · `sting-derrota` · `sting-pista` (el que suena cuando alguien acaba de ver algo que no debía — **el sonido más importante del juego**)

#### Ambientes (bucle largo, mezclados por debajo)

lluvia sobre chapa · tráfico lejano · zumbido de transformador · pasillo de instituto · oleaje en el muelle · sirena a distancia · gente en plaza · ventilación de oficina · monitor de hospital · viento en altura · fluorescente parpadeando · silencio de ciudad sin luz

### 11.4 Reglas de mezcla

- **La música baja a −12 dB durante el diálogo** y vuelve al terminar la línea.
- **Un solo crossfade** entre pistas, de 1200 ms. Nunca dos pistas completas a la vez salvo las capas de una misma pieza.
- **El corte de técnica atenúa la música a −18 dB** durante su duración y deja el stinger arriba. Ese ducking es lo que hace que el corte se sienta como un corte.
- **Ambientes siempre por debajo de −20 dB**: se notan al quitarlos, no al ponerlos.
- **Tres deslizadores independientes** (música / efectos / ambiente) y silencio maestro. Se guardan.

### 11.5 Presupuesto técnico

- Formato **OGG Vorbis** con respaldo **MP3** (Howler negocia solo).
- Objetivo **≤ 900 KB por pista** de bucle; ≤ 250 KB por ambiente; ≤ 40 KB por stinger.
- **Presupuesto total de audio: ≤ 26 MB.**
- **Carga perezosa por contexto**: al entrar en un capítulo se precargan sólo sus pistas. El arranque del juego carga tres archivos (título, civil base, un stinger). Nada de un manifiesto de 26 MB en el primer render.
- Todo el audio detrás de un gesto del usuario, por la política de autoplay de los navegadores. Botón de "Empezar" que además desbloquea el contexto de audio.

---

## 12. Bilingüismo: dos versiones completas

**Requisito explícito: el juego existe en dos versiones completas, español e inglés, y la inglesa es una adaptación, no una traducción.** Esto no es una tarea de final de proyecto: es una restricción que condiciona cómo se escribe cada línea desde la primera.

### 12.1 La regla que lo gobierna todo

> **Ninguna cadena de texto vive en un componente.** Todo el texto del juego —diálogo, nombres de técnica, informes de expediente, titulares de prensa, botones, mensajes de error, descripciones del catálogo, pistas de control— vive en `copy.js`, con la misma clave en `es` y en `en`.

Es la regla que ya sostiene `copy.js` en Trayectoria, y hay una razón dura para respetarla desde el día 1: el volumen estimado es de 35.000–45.000 palabras. **Retraducir cuarenta mil palabras al final cuesta más que escribirlas dos veces desde el principio**, y produce una versión inglesa que se nota traducida.

`copy.test.js` es el guardián: toda clave presente en `es` debe existir en `en`, y ninguna cadena puede quedarse sin par. Ese test se escribe con la primera línea de diálogo, no con la última.

### 12.2 Adaptar, no traducir

La versión inglesa se escribe con criterio propio en cada uno de estos frentes:

**Lo que NO cambia** — la identidad del juego es española y esa es su gracia:

- **Marés sigue siendo Marés**, una ciudad portuaria española. No se traslada a una ciudad americana genérica. Los distritos mantienen su nombre propio (*Puerto Viejo*, *La Concha*, *Cerro del Faro*) porque son topónimos, y los topónimos no se traducen.
- **Los nombres de los personajes no se cambian.** Dani Vela es Dani Vela en las dos versiones. Nuria, Isma, Julia, Requena, Doña Pilar. Un jugador anglófono no necesita que le llamen "Danny".
- **El instituto sigue siendo un instituto español**: los cursos, los horarios, el recreo, el conserje. Se explica con contexto, no se convierte en un *high school* americano con taquillas y equipo de fútbol.

**Lo que SÍ se adapta:**

- **Los tratamientos y registros.** *Doña Pilar* no tiene equivalente inglés; en `en` se resuelve con el nombre y un registro de habla que transmite la misma distancia respetuosa, más una nota de contexto la primera vez que aparece.
- **Los nombres de técnica.** Son nombres de hissatsu: tienen que **sonar bien gritados**, no ser exactos. *Puño de Tormenta* → **Thunderfist** (no "Storm Fist", que es correcto y no suena a nada). *Arco Voltaico* → **Arc Flash**, que además es el término técnico real. *Vaho* → **Blackout Step**. *Fulgor* → **Blaze** para la técnica, pero **el título del juego se mantiene: FULGOR**, en las dos versiones, como nombre propio. Cada técnica se aprueba por cómo suena, no por su literalidad.
- **El nombre del héroe.** Si el jugador puede nombrarlo (§16, decisión abierta n.º 2), el listado de sugerencias es distinto en cada idioma, no traducido.
- **La prensa.** *El Faro de Marés* → **The Marés Beacon**. Los titulares de Marga se reescriben con la gramática titular inglesa (sin artículos, verbo en presente), que es un género propio y no admite traducción literal.
- **Los informes de Sabater.** El español policial y el inglés policial tienen fraseología distinta. Se escriben dos veces, con la jerga real de cada uno.
- **Los juegos de palabras y el habla adolescente.** Las conversaciones de Isma y Dani son lo que más se resiente en una traducción literal. Se reescriben buscando el mismo efecto, no las mismas palabras. **Si un chiste no funciona en inglés, se cambia el chiste.**

### 12.3 Consecuencias técnicas

| Aspecto | Requisito |
|---|---|
| **Longitud de cadena** | El inglés es ~15% más corto de media, pero los nombres compuestos son más largos. **Cada cadena de interfaz se prueba en los dos idiomas dentro de la caja de 352 px.** Un botón que cabe en español y desborda en inglés es un fallo de la versión inglesa, no un detalle |
| **Interpolación** | Nunca concatenar. `"Nuria ha encontrado {n} pruebas"` con la variable dentro de la plantilla, porque el orden de las palabras cambia entre idiomas |
| **Plurales y género** | El español concuerda en género (*una pista encontrada* / *un indicio encontrado*); el inglés no. Las plantillas llevan sus propias formas por idioma, jamás una regla compartida |
| **Fechas y horas** | Formato por locale. El calendario del juego muestra *lunes 14* / *Monday 14* |
| **Tipografía** | Las tres familias elegidas deben tener juego completo de acentos y `ñ`. Se verifica antes de fijarlas, no después |
| **Metadatos de catálogo** | Título, descripción y `CONTROL_HINTS` en `es` y `en`, como exige `registry.jsx` |
| **Selector de idioma** | Se resuelve con `resolveBrowserLanguage` (el utilitario que ya usa el repositorio) y se puede cambiar **dentro del juego**, sin perder la partida. El idioma es un ajuste guardado, no una decisión de arranque |
| **Audio** | Ninguna pista lleva voz cantada con letra inteligible. Esto **simplifica el bilingüismo enormemente** y es una razón más para preferir instrumental en la selección de música (§11) |

### 12.4 Proceso de escritura

Cada capítulo se escribe en dos pasadas dentro de la misma fase de producción, nunca en fases distintas:

1. **Pasada 1 — español.** Se escribe el capítulo completo. Es el idioma en el que se piensa el juego.
2. **Pasada 2 — inglés, inmediatamente después.** Con el capítulo fresco, se adapta. Los desajustes que aparecen aquí (un chiste que no funciona, un tratamiento sin equivalente, una frase demasiado larga para un botón) se resuelven **cambiando también el español si hace falta**. Es la ventaja de escribir en paralelo: las dos versiones se mejoran mutuamente.
3. **Revisión de paridad.** `copy.test.js` verifica claves. Una lectura humana verifica que la escena inglesa produce el mismo efecto, no las mismas palabras.

**Un capítulo no está terminado hasta que lo está en los dos idiomas.** Ese es el criterio de aceptación de las Fases 3 y 4.

---

## 13. Arquitectura técnica

Se sigue la estratificación que ya funciona en `src/games/sports/trayectoria/`: **motor puro abajo, React arriba, y el balance en tablas separadas**. Ese juego demuestra que una campaña narrativa larga con motor propio y suite de tests cabe en este repositorio.

### 13.1 Capas

```
tables.js         Balance. Stats, técnicas, piezas de traje, umbrales, costes.
                  NO contiene lógica. Se toca para equilibrar.
rng.js            Aleatoriedad con semilla. Toda tirada pasa por aquí.
   ↓
suspicion.js      Expedientes y pistas. PURO.
duel.js           Resolución de duelos. PURO.
intervention.js   Reloj, nodos, rutas, objetivos, balance final. PURO.
suit.js           Piezas, integridad, materiales, construcción. PURO.
bonds.js          Vínculos, coartadas, confidentes. PURO.
calendar.js       Días, bloques, agenda, interrupciones. PURO.
progress.js       Nivel, stats, árbol de técnicas, Rango. PURO.
   ↓
story.js          Los 12 capítulos COMO DATOS: gatillos, escenas, banderas,
                  condiciones de final. Sin lógica de juego.
   ↓
game.js           La máquina de fases, como reducer:
                  CAPITULO → BLOQUE → ESCENA → INTERVENCION → DUELO
                  → BALANCE → BLOQUE → ... → EPILOGO
save.js           Serialización a localStorage, versionada con migraciones.
   ↓
audio.js          Howler. Capas adaptativas, ducking, carga perezosa.
scene.jsx         Canvas del panel superior: escenario, nodos, figuras, cortes.
board.jsx         Panel inferior: comandos, mapa, menús.
dossier.jsx       Pantalla de expedientes.
workshop.jsx      Pantalla de traje y técnicas.
icons.jsx         Set de iconos propio, trazo de 24 unidades (como trayectoria)
copy.js           Todo el texto, es/en. NADA de texto en los componentes.
index.jsx         Composición y estado de pantalla.
styles.css        Las dos paletas y el layout de doble panel.
```

**La regla que hace esto mantenible:** ningún módulo puro importa React y ningún componente contiene una regla de juego. Cada módulo puro se prueba solo, sin DOM.

### 13.2 Decisiones técnicas

**Canvas 2D, no Phaser.** Phaser está en el proyecto, pero este juego no necesita un motor: no hay física, ni scroll, ni detección de colisiones. Necesita dibujar nodos, siluetas y cortes de cámara. Canvas 2D directo (como `pitch.jsx` de trayectoria) es más ligero, más controlable y evita meter un motor de 1 MB en el paquete.

**Guardado, y no es opcional.** Un juego de 8 horas sin guardar no existe. `localStorage`, tres ranuras, autoguardado al final de cada bloque y antes de cada Intervención decisiva. El estado guardado lleva `version` y `save.js` tiene migraciones desde el primer día — un guardado de 8 horas roto por un cambio de formato es la peor forma posible de perder a un jugador.

**Todo determinista bajo semilla.** Una partida es reproducible desde su semilla y su lista de acciones. Esto es lo que hace posible probar el equilibrio con Monte Carlo, exactamente como se hizo en `bigmatch.test.js`: mil partidas simuladas para responder "¿cuántas terminan desenmascaradas?".

**Presupuesto de rendimiento:** 60 fps en el canvas durante los cortes; el resto del tiempo el canvas está mayormente estático y se redibuja por eventos. Sin bucle de render permanente cuando no hay animación — importante para la batería en móvil durante una sesión larga.

### 13.3 Suite de pruebas

Vitest, siguiendo el patrón del repositorio (un `*.test.js` junto a cada módulo):

- `suspicion.test.js` — **el más importante.** Que ninguna pista se genere para un personaje sin el sesgo correspondiente; que las pistas no decaigan; que los umbrales se respeten; que un desenlace `ruina` no pueda dispararse antes del capítulo 4.
- `duel.test.js` — el ciclo de afinidades es cerrado y simétrico; los límites 5%/95% se respetan; ninguna técnica es dominante en todas las situaciones.
- `intervention.test.js` — el reloj siempre avanza; todo escenario es conexo (no hay nodos inalcanzables); todo objetivo es alcanzable dentro del reloj **desde cualquier ruta válida**.
- `calendar.test.js` — los bloques cuadran; las interrupciones no pueden encadenarse infinitamente.
- `story.test.js` — los doce capítulos son alcanzables; ninguna bandera se lee antes de escribirse; todo final tiene condición alcanzable. **Un grafo de historia sin este test se rompe en silencio.**
- `save.test.js` — ida y vuelta de serialización; cada migración se prueba contra un guardado real de la versión anterior.
- `copy.test.js` — toda clave existe en `es` y en `en`.
- `balance.test.js` — **Monte Carlo.** 1000 partidas con políticas distintas (temerario / prudente / social / aislado). Comprueba que ninguna política gana siempre y que la banda de duración cae en 6-11 h.

### 13.4 Integración en el catálogo

Del precedente ya verificado en este repositorio, dar de alta un juego nuevo requiere **todo** esto:

1. `src/games/arcade/fulgor/` — carpeta del juego.
2. `src/games/registry.jsx` — import perezoso + entrada en `GAME_REGISTRY` + `CONTROL_HINTS` en es y en.
3. `src/data/games.js` — metadatos completos.
4. `src/data/gameCatalogDescriptions.js` — descripción de catálogo.
5. `src/assets/games/juegos-fulgor.svg` — imagen de catálogo.
6. `src/data/__order-check.test.js` — **subir el recuento de 77 a 78** (ese test lo fija explícitamente).
7. `src/mobile/mobileGameProfiles.js` — añadir a `DIRECT_TOUCH_GAME_IDS`. **Sin esto, el móvil monta un pad virtual inútil sobre un juego que se juega con el dedo.**
8. `docs/audio-licenses.md` — nuevo, con la fila de cada pista.

**Categoría e id:** la categoría del catálogo es **"Juegos"**, que es donde viven los títulos narrativos (Valle Tranquilo, Summit Ascent, Dig Hole Treasure). Esos usan prefijo `arcade-` y carpeta `src/games/arcade/`, así que por coherencia con lo que ya existe: id **`arcade-fulgor`**, carpeta `src/games/arcade/fulgor/`, categoría `"Juegos"`.

---

## 14. Producción

Seis fases. Cada una termina en algo jugable — nunca en "el motor está hecho pero no se puede jugar".

### Fase 1 — El vertical slice *(el hito que decide si el juego existe)*

Un solo capítulo, el 3 ("El Tasador"), completo de principio a fin: apertura civil, tres bloques con decisiones reales, dos escaramuzas, la Intervención decisiva con duelos, balance y epílogo. Con tres expedientes activos, cuatro técnicas, el traje improvisado, cuatro pistas de música **y el capítulo escrito en los dos idiomas** — el vertical slice también sirve para medir cuánto cuesta realmente la doble pasada de escritura (§12.4).

**Este es el hito que hay que atacar primero y el único que responde la pregunta de verdad: ¿es divertido gestionar un secreto?** Si la respuesta es no, se cambia el diseño aquí, no en el capítulo 11.

### Fase 2 — Los sistemas al completo

`suspicion`, `duel`, `intervention`, `suit`, `bonds`, `calendar`, `progress` terminados y probados. Catálogo de 40 técnicas. Cinco generaciones de traje. Veinte expedientes. Banco de 40 escaramuzas. Guardado con migraciones.

### Fase 3 — Contenido: capítulos 1-6

Acto I y mitad del II. Fondos de nueve distritos. Retratos del reparto principal. Primera pasada de música. **Criterio de aceptación: un capítulo no está terminado hasta que lo está en español y en inglés** (§12.4).

### Fase 4 — Contenido: capítulos 7-12

Acto II y III, con el mismo criterio de aceptación bilingüe. El capítulo 10 ("El apagón") es el más caro del juego y necesita su propio presupuesto: es estructuralmente distinto a todos los demás.

### Fase 5 — Audio y presentación

Banda sonora completa con capas adaptativas. Los 40 cortes de cámara de técnica. Ambientes. `audio-licenses.md` cerrado y verificado pista a pista.

### Fase 6 — Equilibrio y pulido

Monte Carlo de equilibrio. Ajuste de umbrales de expediente contra datos, no contra intuición. Paso completo de accesibilidad. Auditoría en la caja móvil real de 352×515 — **no en un emulador con `vh`**, que en esa caja miente — **y hecha en los dos idiomas**, porque una cadena inglesa más larga desborda un botón que en español cabía. La versión inglesa no se traduce aquí: aquí sólo se revisa, porque ya se escribió capítulo a capítulo en las Fases 3 y 4.

### 14.1 Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| **El sistema de expedientes no es divertido, sólo estresante** | Fatal | Es lo que la Fase 1 existe para averiguar. Palanca de rescate: bajar el ritmo de pistas y subir la eficacia de las Contramedidas, para que gestionar el secreto se sienta como jugar bien y no como que te castiguen |
| **El volumen de escritura, × 2 idiomas** (12 capítulos + 20 personajes × 12 estados, en es y en) | **Alto — el riesgo de producción número 1** | `copy.js` estructurado y bilingüe desde el día 1, `copy.test.js` desde la primera línea, y la doble pasada dentro de la misma fase (§12.4). Retraducir 40.000 palabras al final cuesta más que escribirlas dos veces y produce una versión inglesa que se nota traducida. Se mide en la Fase 1 antes de comprometer las Fases 3 y 4 |
| **Las 40 animaciones de técnica se comen la producción** | Alto | Sistema de plantillas: **cinco** plantillas de corte (una por familia) parametrizadas por color, silueta y nombre. Sólo las 8 técnicas insignia llevan animación única |
| **Deriva de duración: 4 h o 14 h en vez de 8** | Medio | Medir desde la Fase 3 con jugadores reales por capítulo, no al final |
| **Licencias de audio mal documentadas** | Medio-alto, legal | Ninguna pista entra al repositorio sin su fila en `audio-licenses.md`. Regla de puerta, no de revisión |
| **El grafo de historia se rompe en silencio** | Medio | `story.test.js` desde el primer capítulo escrito |
| **Rendimiento en móvil durante 8 h** | Medio | Sin bucle de render permanente; carga de audio por capítulo; presupuesto de 26 MB |

---

## 15. Lo que este juego NO es

Explícito, porque el alcance de un proyecto se defiende con lo que se descarta:

- **No es un mundo abierto.** Marés son nueve distritos con puntos de interés, no una ciudad transitable. *Inazuma Eleven* también es pequeño y lo es a propósito.
- **No es un juego de acción en tiempo real.** No hay combos, ni esquivas con temporización, ni barras de energía que se rellenan. Es un JRPG con presentación cinética.
- **No tiene equipo.** Un solo héroe en combate, siempre. Es la condición para que el secreto pese.
- **No tiene multijugador ni componente en línea.** Todo el estado es local.
- **No mata.** Los adversarios se contienen, no se eliminan. La familia **Escudo** y la acción **Contener** existen precisamente para dar una salida sin daño a cada duelo.
- **No tiene microtransacciones ni economía premium.** Una moneda, el dinero de los recados de Yusuf, y sirve para materiales.
- **No hay finales "buenos" y "malos".** Hay siete finales y el juego no los ordena.

---

## 16. Decisiones cerradas y abiertas

**Cerradas en el brainstorming:**

- Marco de Intervención con reloj + motor de duelo por comandos. ✔
- Héroe en solitario en combate, reparto amplio alrededor. ✔
- El secreto como expedientes por personaje, no como medidor global. ✔
- Doce capítulos, ~8 horas. ✔
- Traje como sistema con compromisos, no como cosmético. ✔
- Doble pantalla estilo DS como layout nativo. ✔
- Banda sonora propia con música libre de derechos, variada por contexto. ✔
- **Dos versiones completas, española e inglesa, la inglesa adaptada y no traducida, escritas en paralelo capítulo a capítulo.** ✔

**Abiertas — a resolver antes o durante la Fase 1:**

1. **Vínculo romántico con Julia: ¿opcional o troncal?** Recomendación: opcional, pero con la bisagra (su padre) troncal. Que la trama no dependa de un romance, pero que el romance haga la trama más dura.
2. **¿El jugador nombra al héroe?** Recomendación: sí. Marga se lo pregunta en el capítulo 7 y la ciudad adopta el nombre elegido. "FULGOR" queda como título del juego y como nombre por defecto.
3. **¿Dificultad seleccionable?** Recomendación: sí, pero **sólo mueve la generación de pistas y los umbrales**, nunca las estadísticas de combate. Que "difícil" signifique "te miran más", no "pegan más fuerte".
4. **¿Nueva partida+?** Recomendación: fuera del alcance de la primera versión.
5. **Volumen de escritura definitivo.** Estimación de 35.000–45.000 palabras en español, **y otro tanto en inglés**. Hay que confirmarlo tras escribir el capítulo 3 completo en los dos idiomas y extrapolar: es la incógnita más grande del presupuesto de producción.
6. **Nombres de técnica en inglés.** Las de §5.7 necesitan una pasada dedicada con criterio de sonoridad, no de literalidad (§12.2). Las cuatro propuestas ahí son ejemplos del criterio, no la lista final.

---

## 17. Referencias

- [Inazuma Eleven (videojuego) — Wikipedia](https://en.wikipedia.org/wiki/Inazuma_Eleven_(video_game))
- [Inazuma Eleven, análisis de la versión DS — Nintendo Life](https://www.nintendolife.com/reviews/2011/03/inazuma_eleven_ds)
- [Inazuma Eleven — Nintendo UK](https://www.nintendo.com/en-gb/Games/Nintendo-DS/Inazuma-Eleven-271144.html)
- [Hissatsu technique — Inazuma Eleven Wiki](https://inazuma-eleven.fandom.com/wiki/Hissatsu_technique)
- [Scouting System — Inazuma Eleven Wiki](https://inazuma-eleven.fandom.com/wiki/Scouting_System)
- [Guía y walkthrough de Inazuma Eleven (DS) — GameFAQs](https://gamefaqs.gamespot.com/ds/943160-inazuma-eleven/faqs/64757)
- Precedente interno: `src/games/sports/trayectoria/` — estratificación motor puro / React, equilibrio por Monte Carlo, copia bilingüe.
