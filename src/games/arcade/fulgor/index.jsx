/**
 * FULGOR — composición y estado de pantalla.
 *
 * Este archivo NO contiene una sola regla de juego. Es la regla que hace mantenible todo lo
 * demás (§14.1): ningún módulo puro importa React y ningún componente contiene una regla.
 * Aquí sólo se decide qué pantalla se ve, se despachan acciones al reductor de `game.js` y
 * se conecta el guardado.
 *
 * TRES COSAS QUE MERECEN LEERSE DESPACIO:
 *
 *  - EL AUTOGUARDADO SE SUSPENDE DENTRO DE UN DUELO. `save.createAutosaver` trae la bandera
 *    de Valle Tranquilo por una razón concreta: guardar entre el gasto de Carga y la tirada
 *    dejaría un héroe que ha pagado y no ha tirado. Se guarda al cerrar bloque, al cerrar
 *    Intervención y antes de cada decisiva (§15.1) — nunca en medio.
 *
 *  - LA PUERTA DE ENTRADA ESTÁ EN EL ARRANQUE. "Importar código" vive junto a "Partida
 *    nueva" y "Continuar", porque el jugador que llega a un dispositivo nuevo no tiene
 *    partida que continuar (§15.4). Sin eso, el sistema de transferencia no sirve de nada.
 *
 *  - EL IDIOMA SE CAMBIA DENTRO DEL JUEGO Y NO PIERDE LA PARTIDA (§13.3). Es un ajuste
 *    guardado, no una decisión de arranque.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import "./styles.css";
import { getCopy, fillTemplate } from "./copy.js";
import { Icon } from "./icons.jsx";
import { Stage } from "./scene.jsx";
import {
  BalancePanel,
  DossierPanel,
  DuelMenu,
  EmergencyPanel,
  InterventionPanel,
  WorkshopPanel,
} from "./board.jsx";
import * as juego from "./game.js";
import * as guardado from "./save.js";
import { availableActions, currentBlock, openDistricts } from "./calendar.js";
import "./world/mundo.css";
import Mundo from "./world/Mundo.jsx";
import Controles from "./world/Controles.jsx";
import Transicion from "./world/Transicion.jsx";
import Intervencion from "./world/Intervencion.jsx";
import ControlesIntervencion from "./world/ControlesIntervencion.jsx";
import MapaCiudad from "./world/MapaCiudad.jsx";
import Dialogo from "./scene/dialogue.jsx";
import { encuentro, encuentroLugar } from "./world/encuentros.js";
import { DISTRITOS_JUGABLES, SALAS } from "./world/maps.js";
import { retratoURL } from "./world/render.js";
import { Apertura, Prologo } from "./Prologo.jsx";
import { escenaGuion, escenarioDe, tieneGuion } from "./guiones/index.js";
import { coloresDeTraje } from "./world/sprites.js";
import { effectiveStats } from "./progress.js";
import { suitStats } from "./suit.js";
import { BLOCKS, DIFFICULTY_MODES, TECHNIQUES } from "./tables.js";
import { CHAPTERS } from "./story.js";
import { activeMission } from "./missions.js";
import { adjustBond } from "./bonds.js";
import { createAudio, layerGains, trackFor } from "./audio.js";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";

const PANELES = {
  NINGUNO: null,
  MAPA: "mapa",
  EXPEDIENTES: "expedientes",
  TRAJE: "traje",
  GUARDADO: "guardado",
};

export default function FulgorGame({ locale }) {
  const [idioma, setIdioma] = useState(() => locale ?? resolveBrowserLanguage?.() ?? "es");
  const [estado, setEstado] = useState(() => juego.createGame({ semilla: String(Date.now()) }));
  const [panel, setPanel] = useState(PANELES.NINGUNO);
  const [escena, setEscena] = useState(null);
  const [corte, setCorte] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [codigoPegado, setCodigoPegado] = useState("");

  /* ── El prólogo, la apertura y el guion de la campaña ──────────────────── */
  /**
   * Las tres cosas nuevas de esta pasada, y las tres viven AQUÍ ARRIBA y no en `game.js`.
   *
   * `intro` es "prologo" → "apertura" → null, y sólo lo recorre una partida nueva: quien
   * continúa o importa un código ya vio las dos pantallas y no hay que enseñárselas otra vez.
   *
   * `guion` es la escena de historia que se está leyendo ahora mismo. El motor ya sabía
   * cuáles tocaban —`pendingScenes()` lleva escrito desde el primer día— pero NADIE LO
   * LLAMABA: la fase `ESCENA` existía, tenía caso en el reductor y pintor en `scene.jsx`, y
   * era inalcanzable. Doce capítulos de historia que el jugador no podía ver ni queriendo.
   *
   * `vistos` recuerda qué aperturas de decisiva y qué epílogos ya se han jugado. No va al
   * estado del motor porque no es una regla: es una nota de proyección, como el telón.
   */
  const [intro, setIntro] = useState(null);
  const [guion, setGuion] = useState(null);
  const vistos = useRef(new Set());

  /* ── El mundo caminable ───────────────────────────────────────────────────────── */
  /**
   * Dónde está Dani, qué tiene delante y qué telón está echado.
   *
   * NO VIVE EN EL ESTADO DEL MOTOR a propósito: `game.js` lleva el calendario, la sospecha
   * y los expedientes, y en qué esquina de la plaza está parado un sprite no es una regla
   * del juego — es algo que sólo importa mientras se mira la pantalla.
   *
   * Y vive aquí arriba, con el resto del estado de pantalla, y no más abajo junto a sus
   * manejadores: `accionBloque` nombra `distrito` en su lista de dependencias, y esa lista
   * se evalúa AL RENDERIZAR. Declarado después, el render entero moría en la zona muerta
   * temporal de `const` antes de pintar un solo píxel.
   */
  const [distrito, setDistrito] = useState("aguas");
  /**
   * EL SITIO QUE SE PISA NO ES SIEMPRE EL DISTRITO.
   *
   * `distrito` es lo que sabe el motor: qué acciones se ofrecen (`OFRECE`), dónde cae una
   * pista, qué abre el calendario. `sitio` es el plano que se está andando, y dentro del
   * instituto puede ser el aula, el pasillo, el laboratorio o la azotea.
   *
   * Mantenerlos separados es lo que permite que Requena siga ofreciendo `obligacion` cuando
   * hablas con él entre los pupitres: `hablar()` pregunta por el DISTRITO, no por la sala.
   * Fundirlos sería tener que dar de alta un aula en `calendar.js`, y un aula no es un sitio
   * al que Marés abra en el capítulo tres.
   */
  const [sitio, setSitio] = useState("aguas");
  const [desde, setDesde] = useState(null);
  const [dialogo, setDialogo] = useState(null);
  const [cruce, setCruce] = useState(null);
  const [cerca, setCerca] = useState(null);
  const [visto, setVisto] = useState([]);
  const visitasDialogo = useRef({});

  /**
   * LA ENTRADA VIVE AQUÍ, no dentro del mundo, porque la cruceta está en la pantalla de
   * ABAJO y el lienzo en la de arriba. Son dos componentes hermanos escribiendo y leyendo
   * el mismo objeto sesenta veces por segundo; pasarlo por estado de React sería pedir un
   * re-render por pulsación de flecha.
   */
  const entradaRef = useRef({ arriba: false, abajo: false, izq: false, der: false, correr: false });

  const copy = useMemo(() => getCopy(idioma), [idioma]);
  const dif = useMemo(() => juego.dif(estado), [estado.dificultad]);
  const audio = useRef(null);

  /* ── Guardado (§15.1) ─────────────────────────────────────────────────────────── */

  const autosave = useRef(null);
  if (!autosave.current) {
    autosave.current = guardado.createAutosaver((snapshot) => {
      guardado.writeSlot(0, snapshot, { ahora: Date.now() });
    });
  }

  useEffect(() => {
    // Dentro de un duelo no se guarda: el estado está a medio resolver por definición.
    if (estado.fase === juego.PHASES.DUELO) autosave.current.suspender();
    else autosave.current.reanudar();
  }, [estado.fase]);

  useEffect(() => {
    if (estado.fase === juego.PHASES.TITULO) return;
    autosave.current.encolar(estado);
  }, [estado]);

  /* ── Audio (§12) ──────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!audio.current) audio.current = createAudio();
    return () => audio.current?.stop({ fundido: 0.3 });
  }, []);

  useEffect(() => {
    const motor = audio.current;
    if (!motor?.disponible) return;
    const clave = trackFor({
      fase: estado.fase,
      distrito: estado.escenario?.distrito ?? CHAPTERS[estado.capitulo]?.distritoFoco,
      capitulo: estado.capitulo,
      tipoIntervencion: estado.escenario?.tipo,
      jefe: estado.escenario?.guion?.antagonista?.id,
    });
    const reloj = estado.escenario
      ? estado.escenario.reloj.turno / Math.max(1, estado.escenario.reloj.max)
      : 0;
    motor.play(clave, { capas: layerGains({ progresoReloj: reloj, enDuelo: estado.fase === juego.PHASES.DUELO }) });
  }, [estado.fase, estado.capitulo, estado.escenario?.distrito, estado.escenario?.reloj.turno]);

  /* ── Despacho ─────────────────────────────────────────────────────────────────── */

  const despachar = useCallback((accion) => {
    setEstado((previo) => juego.reduce(previo, accion));
  }, []);

  const nuevaPartida = useCallback((modo) => {
    const fresco = juego.reduce(null, { type: "NUEVA_PARTIDA", semilla: String(Date.now()), dificultad: modo, idioma });
    audio.current?.unlock();
    setEstado(fresco);
    setEscena(null);
    setGuion(null);
    vistos.current = new Set();
    setIntro("prologo");
  }, [idioma]);

  const continuar = useCallback(() => {
    const ranura = guardado.readSlot(0);
    if (!ranura) return;
    audio.current?.unlock();
    setIntro(null);
    setEstado(aplicarPayload(ranura.payload, idioma));
  }, [idioma]);

  const importar = useCallback((sobreEstaPartida) => {
    const salida = guardado.decodeCode(codigoPegado);
    if (!salida.ok) {
      setAviso(salida.motivo === "otroJuego" ? copy.guardado.codigoDeOtroJuego : copy.guardado.codigoDanado);
      return;
    }
    const importado = aplicarPayload(salida.payload, idioma);
    if (!sobreEstaPartida) {
      const libre = guardado.firstFreeSlot();
      if (libre !== null) guardado.writeSlot(libre, importado, { ahora: Date.now() });
    }
    audio.current?.unlock();
    setIntro(null);
    setEstado(importado);
    setPanel(PANELES.NINGUNO);
    setAviso(copy.guardado.codigoImportado);
  }, [codigoPegado, copy, idioma]);

  /* ── Acciones de juego ────────────────────────────────────────────────────────── */

  /**
   * Un cruce con telón: velo, cartela, el cambio DETRÁS, y vuelta. La misma forma que usa
   * Valle Tranquilo al dormir, que es la que este catálogo ya tiene aprendida.
   *
   * `alFundir` se ejecuta en el punto negro. Nunca antes: cambiar el mapa a mitad del
   * fundido enseñaría un fotograma del sitio nuevo con la cámara del viejo.
   */
  const cruzar = useCallback((carta, alFundir) => {
    setCruce({ ...carta, alFundir, sello: Date.now() });
  }, []);

  /**
   * Gastar un bloque.
   *
   * Se calcula FUERA de `setEstado` a propósito. La versión anterior lo hacía dentro del
   * actualizador, que es más seguro frente a llamadas encadenadas, pero desde ahí no se
   * puede comparar el calendario de antes con el de después — y esa comparación es lo que
   * decide si el paso merece telón. Aquí no hay dos acciones de bloque en el mismo tic
   * (sólo se llega desde el cierre de un diálogo), así que la lectura del cierre es buena.
   */
  const accionBloque = useCallback((accionId) => {
    const salida = juego.spendBlock(estado, accionId, {
      objetivo: accionId === "quedar" ? primerVinculo(estado) : null,
      distrito: accionId === "entrenar" ? primerEntrenamiento(estado) : null,
      expediente: accionId === "contramedidas" ? primerExpedienteConPistas(estado) : null,
    });
    if (salida.error) return;
    // Una alerta puede sonar en cualquier bloque (§7.2).
    const conEmergencia = juego.rollEmergency(salida.state);
    const siguiente = conEmergencia.emergencia ? conEmergencia.state : salida.state;

    const antes = estado.calendario;
    const despues = siguiente.calendario;
    const cambiaDia = despues.dia !== antes.dia;

    // El telón sólo sale si de verdad ha pasado algo con el reloj. Un bloque que no avanza
    // —una acción ilegal, una emergencia que lo devuelve— no merece parar la pantalla.
    if (despues.bloque === antes.bloque && !cambiaDia) {
      setEstado(siguiente);
      return;
    }

    cruzar(
      {
        ritmo: "bloque",
        titulo: copy.acciones?.[accionId]?.nombre ?? copy.acciones?.[accionId] ?? "…",
        subtitulo: cambiaDia
          ? (copy.ui?.seHaceDeNoche ?? null)
          : `${copy.bloques?.[BLOCKS[antes.bloque]] ?? ""}`,
        segunda: {
          titulo: cambiaDia
            ? `${copy.ui?.dia ?? "Día"} ${despues.dia}`
            : copy.bloques?.[BLOCKS[despues.bloque]] ?? "",
          subtitulo: cambiaDia
            ? `${copy.bloques?.[BLOCKS[despues.bloque]] ?? ""} · ${copy.distritos?.[distrito] ?? ""}`
            : copy.distritos?.[distrito] ?? "",
        },
      },
      () => setEstado(siguiente),
    );
  }, [copy, cruzar, distrito, estado]);

  /* ── El mundo caminable: el bloque ya no es un menú ──────────────────────────── */

  const bloqueActual = useMemo(() => currentBlock(estado.calendario), [estado.calendario]);
  /**
   * La brújula depende del BLOQUE, no sólo del capítulo.
   *
   * Por la mañana en Marés sólo son legales `obligacion` y `entrenar`, así que un objetivo
   * fijo por capítulo acababa señalando a gente que contesta «ahora no». Con el bloque
   * dentro, la brújula siempre apunta a algo que se puede hacer ahora mismo.
   */
  const mision = useMemo(
    () => activeMission(estado.capitulo, idioma, distrito, bloqueActual),
    [bloqueActual, distrito, estado.capitulo, idioma],
  );

  /**
   * La punta del Pilar 1: de los trece expedientes abiertos, el que más te está mirando.
   *
   * No es un medidor global de sospecha —el diseño lo prohíbe expresamente— sino un nombre
   * concreto, que es justo lo contrario: te dice QUIÉN, no cuánto.
   */
  const masInteresado = useMemo(() => {
    const abiertos = Object.values(estado.sospecha?.abiertos ?? {});
    if (!abiertos.length) return null;
    const punta = abiertos.reduce((a, b) => (b.interes > a.interes ? b : a));
    if (!punta || punta.interes <= 0) return null;
    return { id: punta.id, nombre: copy.personajes?.[punta.id] ?? punta.id, interes: punta.interes };
  }, [copy, estado.sospecha]);

  /** Los distritos que el capítulo abre Y que además están construidos (fase 3 los completa). */
  const distritosAbiertos = useMemo(
    () => openDistricts(estado.capitulo).filter((d) => DISTRITOS_JUGABLES.includes(d)),
    [estado.capitulo],
  );

  // Si un capítulo cierra el distrito en el que estabas, se vuelve a casa en vez de dejar
  // al jugador en un mapa que el motor ya no considera abierto.
  useEffect(() => {
    if (!distritosAbiertos.includes(distrito)) {
      const casa = distritosAbiertos[0] ?? "aguas";
      setDistrito(casa);
      setSitio(casa);
      setDesde(null);
    }
  }, [distrito, distritosAbiertos]);

  const hablar = useCallback((npcId) => {
    // La legalidad la decide `calendar.js`, que ya tiene la tabla `soloEn`. Preguntárselo
    // aquí otra vez sería tener la misma regla en dos sitios.
    const menu = availableActions(estado.calendario, { distritosAbiertos });
    const legalDe = (accion) => menu.find((m) => m.id === accion)?.disponible ?? false;

    const clave = `${estado.capitulo}:${estado.calendario.dia}:${npcId}`;
    const visita = visitasDialogo.current[clave] ?? 0;
    const contexto = { capitulo: estado.capitulo, dia: estado.calendario.dia, bloque: bloqueActual, visita };
    const previo = encuentro(npcId, distrito, { legal: true, idioma, ...contexto });
    const legal = previo.accion ? legalDe(previo.accion) : true;
    const final = encuentro(npcId, distrito, { legal, idioma, ...contexto });
    visitasDialogo.current[clave] = visita + 1;
    setDialogo(final);
  }, [bloqueActual, distrito, distritosAbiertos, estado.calendario, estado.capitulo, idioma]);

  const elegirDialogo = useCallback((decision) => {
    const npcId = dialogo?.npcId;
    if (!npcId) return;
    setEstado((previo) => {
      const flag = `dialogo:${previo.capitulo}:${npcId}:${decision}`;
      if (previo.banderas.has(flag)) return previo;
      const banderas = new Set(previo.banderas);
      banderas.add(flag);
      const delta = decision === "honesto" ? 1 : decision === "proteger" ? -1 : 0;
      return { ...previo, banderas, vinculos: delta ? adjustBond(previo.vinculos, npcId, delta) : previo.vinculos };
    });
  }, [dialogo]);

  /** Hablar con un sitio: el portal para dormir, el muelle para salir de ronda. */
  const usarLugar = useCallback((lugar) => {
    const menu = availableActions(estado.calendario, { distritosAbiertos });
    const legal = menu.find((m) => m.id === lugar.accion)?.disponible ?? false;
    setDialogo(encuentroLugar(lugar.id, lugar.accion, { legal, idioma }));
  }, [distritosAbiertos, estado.calendario, idioma]);

  const cerrarDialogo = useCallback(() => {
    const accion = dialogo?.accion ?? null;
    setDialogo(null);
    // El bloque se gasta AL TERMINAR de hablar, nunca al empezar: si se gastara al abrir la
    // caja, salir a mitad de conversación te habría costado media tarde.
    if (accion) accionBloque(accion);
  }, [accionBloque, dialogo]);

  /**
   * Cruzar una puerta. Puede llevar a otro distrito o a otra sala del mismo edificio, y las
   * dos cosas entran por aquí porque para el jugador son el mismo gesto: pisar y pasar.
   *
   * La diferencia está en qué se mueve. Una sala mueve `sitio` y deja `distrito` quieto —el
   * aula sigue siendo el instituto—; un distrito mueve los dos.
   */
  const salirDistrito = useCallback((destino) => {
    const esSala = Boolean(SALAS[destino]);
    if (!esSala && !distritosAbiertos.includes(destino)) return;
    // Entrar en un aula desde un distrito que el capítulo no ha abierto no debería pasar,
    // pero si pasara, la sala hereda el permiso de su edificio y no al revés.
    if (esSala && !distritosAbiertos.includes(SALAS[destino])) return;

    cruzar(
      {
        ritmo: "zona",
        titulo: copy.salas?.[destino] ?? copy.distritos?.[destino] ?? destino,
        subtitulo: copy.salasAyuda?.[destino] ?? copy.distritosAyuda?.[destino] ?? null,
      },
      () => {
        setDesde(sitio);
        setSitio(destino);
        if (!esSala) setDistrito(destino);
        else setDistrito(SALAS[destino]);
      },
    );
  }, [copy, cruzar, distritosAbiertos, sitio]);

  const accionDuelo = useCallback((accionId) => {
    if (TECHNIQUES[accionId]) {
      setCorte(accionId);
      audio.current?.duck(-18);
      setTimeout(() => {
        setCorte(null);
        audio.current?.unduck();
      }, 1600);
    }
    setEstado((previo) => {
      const salida = juego.duelAction(previo, accionId);
      if (salida.error) return previo;
      if (salida.exposicion?.generadas.length) audio.current?.sting("pista");
      return salida.state;
    });
  }, []);

  const mover = useCallback((destino) => {
    setEstado((previo) => juego.move(previo, destino).state);
  }, []);



  /**
   * ABRIR UNA ESCENA DE HISTORIA.
   *
   * Una sola función para los tres casos, porque los tres son lo mismo: unas líneas escritas,
   * la caja de diálogo, y algo que ocurre al cerrarla. Lo único que cambia es el al cerrar.
   */
  const abrirGuion = useCallback((escenaId, alCerrar) => {
    if (!tieneGuion(escenaId)) {
      alCerrar?.(null);
      return false;
    }
    const abrir = () => setGuion({ id: escenaId, lineas: escenaGuion(escenaId, idioma), alCerrar });

    /**
     * LA ESCENA SE LLEVA AL JUGADOR A DONDE PASA.
     *
     * Una escena que empieza «IES Miguel Servet. Tercera hora» no se puede leer de pie en la
     * plaza de las Aguas. Si la escena tiene sala declarada y no estamos en ella, baja el
     * telón, se cambia el mapa detrás, y la escena arranca ya dentro del aula.
     */
    const sala = escenarioDe(escenaId);
    if (sala && sala !== sitio) {
      cruzar(
        {
          ritmo: "zona",
          titulo: copy.salas?.[sala] ?? copy.distritos?.[sala] ?? sala,
          subtitulo: copy.salasAyuda?.[sala] ?? null,
        },
        () => {
          setDesde(null);
          setSitio(sala);
          if (SALAS[sala]) setDistrito(SALAS[sala]);
          abrir();
        },
      );
      return true;
    }

    abrir();
    return true;
  }, [copy, cruzar, idioma, sitio]);

  /**
   * Las escenas del bloque. `pendingScenes` ya filtra por bloque del calendario y por
   * banderas leídas, así que aquí sólo hay que no pisarlas con otra cosa que esté abierta.
   */
  useEffect(() => {
    if (intro || guion || dialogo || cruce) return;
    if (estado.fase !== juego.PHASES.BLOQUE) return;
    const pendientes = juego.pendingScenes(estado).filter((e) => tieneGuion(e.id));
    if (!pendientes.length) return;
    const escena = pendientes[0];
    abrirGuion(escena.id, (eleccion) => {
      despachar({ type: "ESCENA", id: escena.id, eleccion });
    });
  }, [abrirGuion, cruce, despachar, dialogo, estado, guion, intro]);

  /**
   * La apertura de la Intervención decisiva: el telón que se levanta antes de dar el mando.
   * Una vez por escenario, que es lo que guarda `vistos`.
   */
  useEffect(() => {
    if (intro || guion) return;
    if (estado.fase !== juego.PHASES.INTERVENCION) return;
    const apertura = estado.escenario?.guion?.textoApertura;
    if (!apertura || vistos.current.has(apertura)) return;
    vistos.current.add(apertura);
    abrirGuion(apertura, null);
  }, [abrirGuion, estado.escenario, estado.fase, guion, intro]);

  /**
   * EL EPÍLOGO DEL CAPÍTULO, que es la pieza que le faltaba a la cadencia del §9.
   *
   * Sin él, ganar una Intervención decisiva devolvía al jugador a un panel de balance con
   * números. Con él, ganar te devuelve a tu cocina a las seis de la mañana con tu madre sin
   * decir nada, que es de lo que va el juego.
   */
  useEffect(() => {
    if (intro || guion) return;
    if (estado.fase !== juego.PHASES.BALANCE) return;
    const epilogo = CHAPTERS[estado.capitulo]?.epilogo;
    if (!epilogo || vistos.current.has(epilogo)) return;
    vistos.current.add(epilogo);
    abrirGuion(epilogo, null);
  }, [abrirGuion, estado.capitulo, estado.fase, guion, intro]);

  const cerrarGuion = useCallback((eleccion = null) => {
    const alCerrar = guion?.alCerrar;
    setGuion(null);
    alCerrar?.(eleccion);
  }, [guion]);

  /**
   * Una escena de elección —sólo hay una en toda la campaña, la del capítulo 12— no gasta
   * la decisión al elegir: la guarda y la manda cuando se cierra la caja, para que el jugador
   * llegue a leer la réplica de quien le contesta.
   */
  const eleccionGuion = useRef(null);
  /* ── Pantallas ────────────────────────────────────────────────────────────────── */

  /**
   * El traje del taller, traducido a los colores con los que se pinta el sprite.
   *
   * Es el puente que hace que las seis ranuras de `suit.js` dejen de ser una hoja de cálculo:
   * lo que montas es lo que camina por el Polígono Norte de madrugada.
   */
  const trajeVisible = useMemo(() => coloresDeTraje(estado.traje), [estado.traje]);

  const stats = useMemo(
    () => effectiveStats(estado.progreso, suitStats(estado.traje ?? undefined)),
    [estado.progreso, estado.traje],
  );

  const hayObsesivo = useMemo(
    () => Object.values(estado.sospecha.abiertos).some((d) => d.estado === "obsesivo"),
    [estado.sospecha],
  );

  const vida = [juego.PHASES.INTERVENCION, juego.PHASES.DUELO, juego.PHASES.EPILOGO].includes(estado.fase)
    ? "heroe"
    : "civil";

  const buildRuntimePayload = useCallback((snapshot) => ({
    coordinateSystem: "Node graph; scenario positions are logical node ids, not pixels.",
    mode: snapshot.fase,
    chapter: snapshot.capitulo,
    life: [juego.PHASES.INTERVENCION, juego.PHASES.DUELO].includes(snapshot.fase) ? "hero" : "civil",
    panel,
    district: snapshot.escenario?.distrito ?? CHAPTERS[snapshot.capitulo]?.distritoFoco ?? null,
    hero: snapshot.duelo?.heroe ? {
      charge: snapshot.duelo.heroe.carga,
      composure: snapshot.duelo.heroe.compostura,
    } : null,
    scenario: snapshot.escenario ? {
      position: snapshot.escenario.posicion,
      turn: snapshot.escenario.reloj.turno,
      maxTurns: snapshot.escenario.reloj.max,
      nodes: snapshot.escenario.nodos.map((node) => ({
        id: node.id,
        adversary: Boolean(node.adversario),
        civilian: Boolean(node.civil),
        evidence: Boolean(node.prueba),
      })),
    } : null,
    rank: snapshot.progreso?.rango ?? 0,
    mission: activeMission(snapshot.capitulo, idioma, distrito, currentBlock(snapshot.calendario)),
  }), [distrito, idioma, panel]);

  useGameRuntimeBridge(estado, buildRuntimePayload, () => undefined);

  if (estado.fase === juego.PHASES.TITULO) {
    return (
      <div className="fg-shell" data-vida="civil">
        <TitleScreen
          copy={copy}
          idioma={idioma}
          onIdioma={setIdioma}
          onNueva={nuevaPartida}
          onContinuar={continuar}
          onImportar={() => setPanel(PANELES.GUARDADO)}
          hayGuardado={!!guardado.readSlot(0)}
        />
        {panel === PANELES.GUARDADO && (
          <SaveModal
            estado={estado}
            copy={copy}
            codigo={codigoPegado}
            onCodigo={setCodigoPegado}
            onImportar={importar}
            onCerrar={() => setPanel(PANELES.NINGUNO)}
            aviso={aviso}
            soloImportar
          />
        )}
      </div>
    );
  }

  return (
    <div className="fg-shell" data-vida={vida} data-obsesivo={hayObsesivo ? "true" : "false"}>
      <div className="fg-stage">
        {/* EL BLOQUE ES UN SITIO, NO UNA LISTA. En la fase de bloque, la pantalla de arriba
            deja de ser un panel y pasa a ser Marés: se anda, se habla, se sale por el borde.
            Las demás fases —intervención, duelo, epílogo— siguen usando `Stage`. */}
        {estado.fase === juego.PHASES.BLOQUE ? (
          <>
            <Mundo
              distrito={sitio}
              desde={desde}
              bloque={bloqueActual}
              congelado={Boolean(dialogo) || Boolean(cruce) || Boolean(guion) || Boolean(intro)}
              entradaRef={entradaRef}
              onCerca={setCerca}
              onHablar={hablar}
              onLugar={usarLugar}
              onSalir={salirDistrito}
            />
            {dialogo && (
              <Dialogo
                lineas={dialogo.lineas}
                retrato={(i, linea) => (linea?.hablante
                  ? retratoURL(linea.hablante, linea.animo)
                  : null)}
                onCerrar={cerrarDialogo}
                onDecision={elegirDialogo}
              />
            )}
          </>
        ) : estado.fase === juego.PHASES.INTERVENCION ? (
          /**
           * LA INTERVENCIÓN TAMBIÉN SE CAMINA.
           *
           * Aquí `Stage` pintaba `NodeMap`: el grafo de `intervention.js` dibujado tal cual
           * —círculos unidos por líneas de puntos sobre una foto del distrito— con la
           * visibilidad de cada sitio expresada como el grosor del anillo. Era el diagrama
           * interno del juego puesto delante del jugador.
           *
           * Ahora es el mismo distrito que se pisa de día, de noche y con el reloj en
           * marcha. Las reglas no se han movido: `escenario.js` aterriza el grafo sobre la
           * rejilla del mapa y andar hasta un sitio llama a `mover()`, que es exactamente
           * lo que hacía arrastrar el dedo entre dos círculos.
           */
          <Intervencion
            escenario={estado.escenario}
            traje={trajeVisible}
            congelado={Boolean(cruce) || Boolean(guion) || Boolean(intro)}
            entradaRef={entradaRef}
            onLlegar={mover}
            onVisto={setVisto}
          />
        ) : (
        <Stage
          fase={estado.fase}
          escenario={estado.escenario}
          duelo={estado.duelo}
          final={estado.final}
          escena={escena}
          copy={copy}
          velocidad={stats.velocidad}
          onMover={mover}
          corte={corte}
          onSaltarCorte={() => setCorte(null)}
          variante={vida}
          capitulo={estado.capitulo}
          distrito={CHAPTERS[estado.capitulo]?.distritoFoco}
        />
        )}

        {/* LA HISTORIA, POR ENCIMA DE LO QUE HAYA DEBAJO. La misma caja que usa el mundo
            caminable: sin hablante no pinta retrato ni placa, y por eso la voz del narrador
            y la de Requena caben en el mismo componente sin una línea de código extra. */}
        {guion && (
          <Dialogo
            lineas={guion.lineas}
            retrato={(i, linea) => (linea?.hablante ? retratoURL(linea.hablante, linea.animo) : null)}
            onDecision={(id) => { eleccionGuion.current = id; }}
            onCerrar={() => {
              const elegida = eleccionGuion.current;
              eleccionGuion.current = null;
              cerrarGuion(elegida);
            }}
          />
        )}
      </div>

      {/* El prólogo y la apertura tapan la pantalla ENTERA, bisagra incluida: no son una
          escena ni un panel, son el paso previo a que exista un juego debajo. */}
      {intro === "prologo" && <Prologo copy={copy} onTerminar={() => setIntro("apertura")} />}
      {intro === "apertura" && <Apertura copy={copy} onTerminar={() => setIntro(null)} />}

      <div className="fg-hinge" aria-hidden="true" />

      {/**
        * LA PANTALLA DE ABAJO EN EXPLORACIÓN NO OFRECE, CONTROLA.
        *
        * Aquí vivía `BlockMenu` con sus nueve botones —clase/familia, quedar, entrenar,
        * taller, trabajar…— y cada uno gastaba una tarde. Eso hacía de una historia un
        * formulario: nueve opciones planas, siempre presentes, sin sitio ni cara.
        *
        * Ahora esas nueve cosas son gente y lugares de Marés, y abajo quedan la brújula
        * narrativa, las dos barras y el mando. Los tres atajos que siguen siendo botones
        * —expedientes, traje, guardado— son CONSULTA: no gastan bloque, así que no
        * contradicen nada.
        */}
      <div className="fg-board">
        {estado.fase === juego.PHASES.INTERVENCION && panel === PANELES.NINGUNO ? (
          <ControlesIntervencion
            escenario={estado.escenario}
            copy={copy}
            entradaRef={entradaRef}
            visto={visto}
            onRetirarse={() => despachar({ type: "CERRAR_INTERVENCION" })}
          />
        ) : estado.fase === juego.PHASES.BLOQUE && panel === PANELES.NINGUNO ? (
          <Controles
            copy={copy}
            capitulo={estado.capitulo}
            tituloCapitulo={copy.capitulos?.[`c${estado.capitulo}`]}
            distrito={distrito}
            distritoFoco={CHAPTERS[estado.capitulo]?.distritoFoco}
            dia={estado.calendario.dia}
            dias={estado.calendario.diasDelCapitulo}
            bloque={bloqueActual}
            rango={estado.progreso.rango}
            dinero={estado.progreso.dinero}
            masInteresado={masInteresado}
            mision={mision}
            entradaRef={entradaRef}
            puedeAccion={Boolean(cerca)}
            etiquetaAccion={cerca?.tipo === "npc"
              ? (copy.ui?.hablar ?? "Hablar")
              : (copy.ui?.entrar ?? "Entrar")}
            onAccion={() => entradaRef.current.accionar?.()}
            onPanel={(id) => setPanel(id ?? PANELES.NINGUNO)}
            panel={panel}
          />
        ) : (
          <>
            <TopBar estado={estado} copy={copy} onPanel={setPanel} panel={panel} />

            {panel === PANELES.EXPEDIENTES ? (
              <DossierPanel sospecha={estado.sospecha} copy={copy} dif={dif} />
            ) : panel === PANELES.MAPA ? (
              <MapaCiudad
                copy={copy}
                idioma={idioma}
                actual={distrito}
                abiertos={distritosAbiertos}
                mision={mision}
              />
            ) : panel === PANELES.TRAJE ? (
              <WorkshopPanel traje={estado.traje} materiales={estado.progreso.materiales} copy={copy} />
            ) : (
              <BoardForPhase
                estado={estado}
                copy={copy}
                dif={dif}
                onAccionBloque={accionBloque}
                onAccionDuelo={accionDuelo}
                despachar={despachar}
              />
            )}
          </>
        )}

        {aviso && <p className="fg-tiny" role="status">{aviso}</p>}
      </div>

      {/* El telón se lleva su propio `alFundir` dentro de `paso`: pasarlo como prop suelta
          lo convertía en una función nueva por render y reiniciaba la transición. */}
      <Transicion paso={cruce} onFin={() => setCruce(null)} />

      {panel === PANELES.GUARDADO && (
        <SaveModal
          estado={estado}
          copy={copy}
          codigo={codigoPegado}
          onCodigo={setCodigoPegado}
          onImportar={importar}
          onCerrar={() => setPanel(PANELES.NINGUNO)}
          aviso={aviso}
        />
      )}
    </div>
  );
}

/* ── Pantalla de título ──────────────────────────────────────────────────────────── */

/**
 * `Empezar` is also the audio unlock (§12.5): browsers refuse to sound anything before a
 * gesture, so the button that starts the game is the button that opens the context. That is
 * why there is no separate "enable sound" control anywhere — it would be a second gate for
 * something that already has one.
 */
function TitleScreen({ copy, idioma, onIdioma, onNueva, onContinuar, onImportar, hayGuardado }) {
  const [modo, setModo] = useState("medio");
  return (
    <div className="fg-scene" style={{ height: "100%", justifyContent: "center", gap: 14 }}>
      <h1 className="fg-display fg-display--xl fg-logo">
        FU<em>L</em>GOR
      </h1>
      <p className="fg-tiny fg-muted">{copy.meta.lema}</p>

      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="fg-tiny fg-muted">{copy.ui.dificultad}</legend>
        <div className="fg-commands">
          {DIFFICULTY_MODES.map((m) => (
            <button
              key={m}
              type="button"
              className="fg-command"
              aria-pressed={modo === m}
              style={modo === m ? { borderColor: "var(--fg-acento)" } : undefined}
              onClick={() => setModo(m)}
            >
              <span className="fg-command__nombre">{copy.dificultades[m]}</span>
              <span className="fg-tiny fg-muted">{copy.dificultadesAyuda[m]}</span>
            </button>
          ))}
        </div>
        <p className="fg-tiny fg-muted">{copy.dificultadNota}</p>
      </fieldset>

      <button type="button" className="fg-btn fg-btn--primary" onClick={() => onNueva(modo)}>
        {copy.ui.partidaNueva}
      </button>
      <button type="button" className="fg-btn" onClick={onContinuar} disabled={!hayGuardado}>
        {copy.ui.continuar}
      </button>
      {/* La tercera puerta: quien llega a un dispositivo nuevo no tiene nada que continuar. */}
      <button type="button" className="fg-btn fg-btn--ghost" onClick={onImportar}>
        {copy.ui.importarCodigo}
      </button>

      <button
        type="button"
        className="fg-btn fg-btn--ghost fg-tiny"
        onClick={() => onIdioma(idioma === "es" ? "en" : "es")}
      >
        <Icon nombre="idioma" tamano={14} /> {idioma === "es" ? "English" : "Espanol"}
      </button>
    </div>
  );
}

/* ── Barra superior del panel ────────────────────────────────────────────────────── */

function TopBar({ estado, copy, onPanel, panel }) {
  return (
    <div className="fg-tiny" style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <strong className="fg-display fg-display--sm">
        {fillTemplate(copy.capituloN, { n: estado.capitulo })}
      </strong>
      <span className="fg-muted">{copy.capitulos[`c${estado.capitulo}`]}</span>
      <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
        <IconTab nombre="ruta" activo={panel === PANELES.MAPA} etiqueta={copy.ui?.mapa ?? "Mapa"}
          onClick={() => onPanel(panel === PANELES.MAPA ? null : PANELES.MAPA)} />
        <IconTab nombre="expediente" activo={panel === PANELES.EXPEDIENTES} etiqueta={copy.ui.expedientes}
          onClick={() => onPanel(panel === PANELES.EXPEDIENTES ? null : PANELES.EXPEDIENTES)} />
        <IconTab nombre="manto" activo={panel === PANELES.TRAJE} etiqueta={copy.ui.traje}
          onClick={() => onPanel(panel === PANELES.TRAJE ? null : PANELES.TRAJE)} />
        <IconTab nombre="guardar" activo={panel === PANELES.GUARDADO} etiqueta={copy.guardado.titulo}
          onClick={() => onPanel(PANELES.GUARDADO)} />
      </span>
    </div>
  );
}

function IconTab({ nombre, activo, etiqueta, onClick }) {
  return (
    <button
      type="button"
      className="fg-btn fg-btn--ghost"
      style={{ minHeight: 30, padding: "4px 7px", borderColor: activo ? "var(--fg-acento)" : undefined }}
      onClick={onClick}
      aria-pressed={activo}
      aria-label={etiqueta}
    >
      <Icon nombre={nombre} tamano={15} />
    </button>
  );
}

/* ── El panel según la fase ──────────────────────────────────────────────────────── */

function BoardForPhase({ estado, copy, dif, onAccionBloque, onAccionDuelo, despachar }) {
  switch (estado.fase) {
    case juego.PHASES.CAPITULO:
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="fg-display fg-display--lg">{copy.capitulos[`c${estado.capitulo}`]}</h2>
          <p className="fg-tiny">{copy.capitulosIntro[`c${estado.capitulo}`]}</p>
          <button type="button" className="fg-btn fg-btn--primary" onClick={() => despachar({ type: "ENTRAR_BLOQUE" })}>
            {copy.ui.siguiente}
          </button>
        </div>
      );

    /**
     * LA FASE DE BLOQUE YA NO PASA POR AQUÍ.
     *
     * Aquí estaba `BlockMenu`: nueve botones —clase/familia, quedar, entrenar, taller,
     * trabajar, investigar, contramedidas, patrullar, descansar— y cada pulsación gastaba
     * una tarde. Eso convertía una historia en un formulario. Las nueve cosas se han ido a
     * Marés: siete son personas con las que se habla y dos son sitios a los que se va. La
     * mitad de abajo la pinta ahora `<Controles>`, que informa y manda pero no ofrece.
     */
    case juego.PHASES.BLOQUE:
      return null;

    case juego.PHASES.EMERGENCIA:
      return (
        <EmergencyPanel
          emergencia={estado.emergencia}
          copy={copy}
          onAceptar={() => despachar({ type: "EMERGENCIA_ACEPTAR" })}
          onRechazar={() => despachar({ type: "EMERGENCIA_RECHAZAR" })}
        />
      );

    case juego.PHASES.INTERVENCION:
      return (
        <InterventionPanel
          escenario={estado.escenario}
          copy={copy}
          onSalir={() => despachar({ type: "CERRAR_INTERVENCION" })}
        />
      );

    case juego.PHASES.DUELO:
      return (
        <DuelMenu
          duelo={estado.duelo}
          escenario={estado.escenario}
          copy={copy}
          dif={dif}
          onAccion={onAccionDuelo}
        />
      );

    case juego.PHASES.BALANCE:
      return (
        <BalancePanel
          balance={estado.balance}
          copy={copy}
          onContinuar={() => despachar({ type: "SIGUIENTE_CAPITULO" })}
        />
      );

    case juego.PHASES.EPILOGO:
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p className="fg-tiny fg-muted">{copy.meta.autoria}</p>
          <button type="button" className="fg-btn" onClick={() => despachar({ type: "NUEVA_PARTIDA" })}>
            {copy.ui.partidaNueva}
          </button>
        </div>
      );

    default:
      return null;
  }
}

/* ── Guardado y transferencia (§15.4) ────────────────────────────────────────────── */

/**
 * Un solo modal, accesible desde el menú en cualquier momento. Arriba EXPORTAR con el
 * recuento de caracteres —para que el jugador vea que lo ha copiado entero— y abajo
 * IMPORTAR con sus dos rutas por separado, porque importar nunca sobrescribe sin preguntar.
 *
 * El botón de copiar tiene camino de reserva a mano: `navigator.clipboard` falla en bastantes
 * navegadores móviles, que es exactamente el sitio donde este modal más se usa.
 */
function SaveModal({ estado, copy, codigo, onCodigo, onImportar, onCerrar, aviso, soloImportar = false }) {
  const exportado = useMemo(
    () => (soloImportar ? null : guardado.encodeCode(estado)),
    [estado, soloImportar],
  );
  const [copiado, setCopiado] = useState(null);
  const areaRef = useRef(null);

  const copiar = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(exportado.code);
      setCopiado(copy.guardado.copiado);
    } catch {
      areaRef.current?.select?.();
      setCopiado(copy.guardado.copiarFallo);
    }
  }, [exportado, copy]);

  return (
    <div className="fg-modal" role="dialog" aria-modal="true" aria-label={copy.guardado.titulo}>
      <div className="fg-modal__caja">
        <h2 className="fg-display fg-display--sm">{copy.guardado.titulo}</h2>

        {exportado && (
          <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <h3 className="fg-tiny fg-muted">{copy.guardado.exportar}</h3>
            <p className="fg-tiny">{copy.guardado.exportarAyuda}</p>
            <textarea ref={areaRef} className="fg-code" readOnly value={exportado.code} />
            <span className="fg-tiny fg-muted">
              {fillTemplate(copy.guardado.caracteres, { n: exportado.caracteres })}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" className="fg-btn" style={{ flex: 1 }} onClick={copiar}>
                {copy.guardado.copiar}
              </button>
              <button
                type="button"
                className="fg-btn"
                style={{ flex: 1 }}
                onClick={() => guardado.writeSlot(0, estado, { ahora: Date.now() })}
              >
                {copy.guardado.guardarAhora}
              </button>
            </div>
            {copiado && <span className="fg-tiny" role="status">{copiado}</span>}
          </section>
        )}

        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h3 className="fg-tiny fg-muted">{copy.guardado.importar}</h3>
          <p className="fg-tiny">{copy.guardado.importarAyuda}</p>
          <textarea
            className="fg-code"
            value={codigo}
            onChange={(e) => onCodigo(e.target.value)}
            spellCheck="false"
            autoCapitalize="none"
            autoCorrect="off"
          />
          <button type="button" className="fg-btn" onClick={() => onImportar(false)} disabled={!codigo.trim()}>
            {copy.guardado.importarEnLibre}
          </button>
          {!soloImportar && (
            <button
              type="button"
              className="fg-btn fg-btn--ghost"
              disabled={!codigo.trim()}
              onClick={() => {
                // Importar nunca sobrescribe sin preguntar (§15.3).
                if (window.confirm(copy.guardado.importarConfirmar)) onImportar(true);
              }}
            >
              {copy.guardado.importarSobre}
            </button>
          )}
          {aviso && <span className="fg-tiny" role="status">{aviso}</span>}
        </section>

        <button type="button" className="fg-btn fg-btn--ghost" onClick={onCerrar}>
          {copy.ui.cerrar}
        </button>
      </div>
    </div>
  );
}

/* ── Utilidades ──────────────────────────────────────────────────────────────────── */

/**
 * §15.2's first technique made literal: reset to a clean state, THEN lay the snapshot on
 * top. That is why the code only has to carry what deviated from a new game.
 */
function aplicarPayload(payload, idioma) {
  const leido = guardado.readPayload(payload);
  let base = juego.openChapter(
    juego.createGame({ semilla: "importada", dificultad: leido.dificultad, idioma }),
    leido.capitulo,
  );

  base = {
    ...base,
    calendario: { ...base.calendario, dia: leido.dia, bloque: leido.bloque, nochesSeguidas: leido.nochesSeguidas, interrupcionesCapitulo: leido.interrupcionesCapitulo },
    progreso: {
      ...base.progreso,
      nivel: leido.nivel,
      xp: leido.xp,
      puntosLibres: leido.puntosLibres,
      rango: leido.rango,
      dinero: leido.dinero,
      stats: leido.stats,
      materiales: leido.materiales,
      entrenamientos: leido.entrenamientos,
      afinidades: leido.afinidades,
      aprendidas: leido.aprendidas,
      equipadas: leido.equipadas,
    },
    banderas: new Set(leido.banderas),
    mentores: leido.mentores,
    villanos: leido.villanos,
    traje: leido.traje ?? base.traje,
    fase: juego.PHASES.BLOQUE,
  };

  for (const d of leido.abiertos) {
    if (!base.sospecha.abiertos[d.id]) continue;
    base.sospecha.abiertos[d.id] = { ...base.sospecha.abiertos[d.id], interes: d.interes, pistas: d.pistas };
  }
  for (const c of leido.cerrados) {
    delete base.sospecha.abiertos[c.id];
    base.sospecha.cerrados[c.id] = { desenlace: c.desenlace, capitulo: c.capitulo };
  }
  for (const [id, v] of leido.vinculos) base.vinculos.vinculos[id] = v;

  return base;
}

const primerVinculo = (estado) => Object.keys(estado.vinculos.vinculos)[0] ?? null;

const primerEntrenamiento = (estado) =>
  openDistricts(estado.capitulo).find((d) => ["poligono", "faro", "puerto", "concha", "instituto"].includes(d)) ?? "instituto";

const primerExpedienteConPistas = (estado) =>
  Object.values(estado.sospecha.abiertos).find((d) => d.pistas.length > 0)?.id ?? null;
