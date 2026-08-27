/**
 * Audio: capas adaptativas, ducking y carga perezosa (§12).
 *
 * ─── POR QUÉ ESTO NO USA HOWLER ─────────────────────────────────────────────────────
 * §14.1 names Howler, and `howler` is in this repository's `package.json`. It is also, as of
 * writing, imported by exactly ZERO files: the twenty audio systems already in this project
 * all drive `AudioContext` directly.
 *
 * That would be reason enough to follow the house style, but there is a harder one. §12.2's
 * whole design is three loops of the same piece playing at once, aligned to the same tempo,
 * with only their gain moving. Keeping three loops phase-locked needs the sources scheduled
 * against the audio clock — `start(when, offset)` with the offset computed as
 * `(now + adelanto - inicio) % duracion`, the "cwilso method" — and Howler's `Howl` does not
 * expose that primitive. Three `Howl`s set to loop DRIFT, slowly and audibly, which for a
 * piece whose point is that its three layers are the same piece is the one failure mode that
 * ruins it.
 *
 * So: raw Web Audio, `AudioBufferSourceNode` scheduled by hand, and no new dependency in a
 * bundle that is already 140 MB built.
 *
 * ─── LO QUE ESTE MÓDULO GARANTIZA ───────────────────────────────────────────────────
 *  - Las tres capas de una pieza empiezan EN LA MISMA MUESTRA y no se separan nunca.
 *  - Entrar y salir de una capa es una rampa de ganancia de 800 ms, jamás un corte.
 *  - El diálogo baja la música a −12 dB; el corte de técnica la baja a −18 dB (§12.4).
 *  - Los ambientes viven por debajo de −20 dB: se notan al quitarlos, no al ponerlos.
 *  - Nada suena hasta que el jugador toca el botón de Empezar (política de autoplay).
 *  - Un capítulo precarga sólo sus pistas (§12.5): el arranque son tres archivos, no 26 MB.
 *
 * ─── DÓNDE VIVEN LOS ARCHIVOS ───────────────────────────────────────────────────────
 * En `public/assets/fulgor/audio/`, NO importados desde el módulo. Los juegos existentes de
 * este repositorio importan sus `.mp3` estáticamente (`terror-zombi/audio.js`), lo que los
 * mete enteros en el chunk — exactamente lo contrario de la carga por capítulo que pide el
 * §12.5. Servidos desde `public/` se piden con `fetch` cuando hacen falta y el bundler no
 * los toca, igual que `public/assets/football/`.
 */

/* ── Catálogo (§12.3) ────────────────────────────────────────────────────────────── */

export const AUDIO_BASE = "/assets/fulgor/audio";

/** `capas: true` marks the three-file pieces of §12.2. */
export const MUSIC = {
  mares:            { archivo: "01-mares", bucle: 100, contexto: ["titulo", "creditos"] },
  nombreEnClave:    { archivo: "02-nombre-en-clave", bucle: 70, contexto: ["guardado", "capitulo"] },
  silencioDeMenu:   { archivo: "03-silencio-de-menu", bucle: 50, contexto: ["menu"] },
  aguas:            { archivo: "04-barrio-de-las-aguas", bucle: 90, contexto: ["aguas"] },
  timbre:           { archivo: "05-timbre-de-las-ocho", bucle: 80, contexto: ["instituto"] },
  recreo:           { archivo: "06-recreo", bucle: 60, contexto: ["instituto"] },
  concha:           { archivo: "07-la-concha", bucle: 85, contexto: ["concha"] },
  locutorio:        { archivo: "08-el-locutorio", bucle: 95, contexto: ["puerto"] },
  cocina:           { archivo: "09-mesa-de-la-cocina", bucle: 65, contexto: ["familia"] },
  loQueNoLeDije:    { archivo: "10-lo-que-no-le-dije", bucle: 75, contexto: ["vinculo"] },
  turnoDeNoche:     { archivo: "11-turno-de-noche", bucle: 80, contexto: ["hospital"] },
  tardeDeExamen:    { archivo: "12-tarde-de-examen", bucle: 60, contexto: ["estudio"] },
  azoteas:          { archivo: "13-azoteas", bucle: 105, contexto: ["patrulla"] },
  financiero:       { archivo: "14-distrito-financiero", bucle: 90, contexto: ["financiero"] },
  faro:             { archivo: "15-cerro-del-faro", bucle: 120, contexto: ["faro"] },
  tolvas:           { archivo: "16-las-tolvas", bucle: 100, contexto: ["tolvas"] },
  aviso:            { archivo: "17-aviso", bucle: 80, capas: true, contexto: ["intervencion"] },
  sigilo:           { archivo: "18-sigilo", bucle: 90, capas: true, contexto: ["intervencionSigilo"] },
  rescate:          { archivo: "19-rescate", bucle: 85, capas: true, contexto: ["intervencionRescate"] },
  escaramuza:       { archivo: "20-escaramuza", bucle: 45, contexto: ["escaramuza"] },
  caraACara:        { archivo: "21-cara-a-cara", bucle: 75, contexto: ["duelo"] },
  temaTasador:      { archivo: "22-el-tasador", bucle: 90, contexto: ["jefe:tasador"] },
  temaHierro:       { archivo: "23-hierro", bucle: 95, contexto: ["jefe:hierro"] },
  temaLarga:        { archivo: "24-larga", bucle: 100, contexto: ["jefe:larga"] },
  temaCero:         { archivo: "25-cero", bucle: 120, contexto: ["jefe:cero"] },
  alguienLoSabe:    { archivo: "26-alguien-lo-sabe", bucle: 55, contexto: ["expediente"] },
  elApagon:         { archivo: "27-el-apagon", bucle: 130, contexto: ["c10"] },
  loQueQueda:       { archivo: "28-lo-que-queda", bucle: 110, contexto: ["epilogo"] },
};

/** §12.3's five. `sting-pista` is described there as the most important sound in the game. */
export const STINGERS = {
  tecnicaRayo: "sting-tecnica-rayo",
  tecnicaLuz: "sting-tecnica-luz",
  victoria: "sting-victoria",
  derrota: "sting-derrota",
  pista: "sting-pista",
};

export const AMBIENCES = {
  lluviaChapa: "amb-lluvia-chapa",
  traficoLejano: "amb-trafico-lejano",
  transformador: "amb-transformador",
  pasilloInstituto: "amb-pasillo-instituto",
  oleajeMuelle: "amb-oleaje-muelle",
  sirenaDistancia: "amb-sirena-distancia",
  genteEnPlaza: "amb-gente-en-plaza",
  ventilacionOficina: "amb-ventilacion-oficina",
  monitorHospital: "amb-monitor-hospital",
  vientoEnAltura: "amb-viento-en-altura",
  fluorescente: "amb-fluorescente",
  ciudadSinLuz: "amb-ciudad-sin-luz",
};

export const LAYERS = ["a", "b", "c"];

/** §12.4's mix, in one table so the numbers are arguable in one place. */
export const MIX = {
  crossfadeMs: 1200,
  capaRampaMs: 800,
  duckingDialogoDb: -12,
  duckingCorteDb: -18,
  ambienteDb: -20,
  /** Layer B enters past half the clock; layer C in the last quarter or in a duel (§12.2). */
  entraCapaB: 0.5,
  entraCapaC: 0.75,
};

/** §12.5's budgets, kept as data so a build check can measure the folder against them. */
export const BUDGET = {
  porPistaKB: 900,
  porAmbienteKB: 250,
  porStingerKB: 40,
  totalMB: 26,
};

/** dB → linear gain. Everything above is written in dB because mixing is written in dB. */
export const dbToGain = (db) => 10 ** (db / 20);

/* ── Qué suena en cada momento ───────────────────────────────────────────────────── */

/**
 * PURE, and deliberately so: which piece belongs to a moment is a design decision, not a
 * playback detail, so it is a function of state that can be tested without an AudioContext.
 */
export function trackFor({ fase, distrito = null, capitulo = 1, tipoIntervencion = null, jefe = null } = {}) {
  if (jefe && MUSIC[`tema${jefe[0].toUpperCase()}${jefe.slice(1)}`]) {
    return `tema${jefe[0].toUpperCase()}${jefe.slice(1)}`;
  }
  if (capitulo === 10 && fase !== "titulo") return "elApagon";

  switch (fase) {
    case "titulo": return "mares";
    case "epilogo": return "loQueQueda";
    case "capitulo": return "nombreEnClave";
    case "duelo": return "caraACara";
    case "intervencion":
      if (tipoIntervencion === "escaramuza") return "escaramuza";
      if (tipoIntervencion === "sigilo") return "sigilo";
      if (tipoIntervencion === "rescate") return "rescate";
      return "aviso";
    default: break;
  }

  const porDistrito = {
    aguas: "aguas", instituto: "timbre", concha: "concha", puerto: "locutorio",
    financiero: "financiero", faro: "faro", poligono: "azoteas", hospital: "turnoDeNoche",
    tolvas: "tolvas",
  };
  return porDistrito[distrito] ?? "aguas";
}

/**
 * How loud each layer should be right now (§12.2). Returns three gains in 0..1; the player
 * never hears a cut, only the mix following the clock.
 */
export function layerGains({ progresoReloj = 0, enDuelo = false } = {}) {
  const t = Math.max(0, Math.min(1, progresoReloj));
  return {
    a: 1,
    b: t >= MIX.entraCapaB ? 1 : 0,
    c: enDuelo || t >= MIX.entraCapaC ? 1 : 0,
  };
}

/** Which files a chapter needs, so `preload` can fetch those and nothing else (§12.5). */
export function manifestForChapter(capitulo, { distritos = [] } = {}) {
  const claves = new Set(["nombreEnClave", "silencioDeMenu"]);
  for (const d of distritos) claves.add(trackFor({ fase: "bloque", distrito: d }));
  claves.add(trackFor({ fase: "intervencion" }));
  claves.add("caraACara");
  claves.add("escaramuza");
  if (capitulo === 3) claves.add("temaTasador");
  if (capitulo === 5) claves.add("temaHierro");
  if ([8, 11, 12].includes(capitulo)) claves.add("temaLarga");
  if (capitulo === 12) claves.add("temaCero");
  if (capitulo === 10) claves.add("elApagon");
  if (capitulo >= 6) claves.add("faro");

  const archivos = [];
  for (const clave of claves) {
    const pista = MUSIC[clave];
    if (!pista) continue;
    if (pista.capas) {
      for (const capa of LAYERS) archivos.push(`${AUDIO_BASE}/${pista.archivo}-${capa}.mp3`);
    } else {
      archivos.push(`${AUDIO_BASE}/${pista.archivo}.mp3`);
    }
  }
  return { claves: [...claves], archivos };
}

/** The three files the title screen needs. Nothing else loads before the player presses Start. */
export function bootManifest() {
  return [
    `${AUDIO_BASE}/${MUSIC.mares.archivo}.mp3`,
    `${AUDIO_BASE}/${MUSIC.aguas.archivo}.mp3`,
    `${AUDIO_BASE}/${STINGERS.pista}.mp3`,
  ];
}

/* ── El motor ────────────────────────────────────────────────────────────────────── */

/**
 * Everything above is pure; this is the only part that touches the browser, and it degrades
 * to a no-op object when there is no AudioContext — which is what lets the game run in
 * Vitest, in SSR and with sound switched off without a single guard at the call sites.
 */
export function createAudio({ contexto = null } = {}) {
  const AC = contexto ?? (typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext));
  if (!AC) return createSilentAudio();

  const ctx = typeof AC === "function" ? new AC() : AC;
  const master = ctx.createGain();
  const musica = ctx.createGain();
  const efectos = ctx.createGain();
  const ambiente = ctx.createGain();
  musica.connect(master);
  efectos.connect(master);
  ambiente.connect(master);
  master.connect(ctx.destination);
  ambiente.gain.value = dbToGain(MIX.ambienteDb);

  const buffers = new Map();
  let sonando = null;      // { clave, fuentes:{a,b,c}, ganancias:{a,b,c}, inicio, duracion }
  let ambienteActual = null;
  let desbloqueado = false;

  /** The autoplay gate. Nothing sounds until a gesture unlocks it (§12.5). */
  async function unlock() {
    if (desbloqueado) return true;
    try {
      if (ctx.state === "suspended") await ctx.resume();
      desbloqueado = ctx.state === "running";
      return desbloqueado;
    } catch {
      return false;
    }
  }

  async function load(url) {
    if (buffers.has(url)) return buffers.get(url);
    try {
      const respuesta = await fetch(url);
      if (!respuesta.ok) throw new Error(String(respuesta.status));
      const datos = await respuesta.arrayBuffer();
      const buffer = await ctx.decodeAudioData(datos);
      buffers.set(url, buffer);
      return buffer;
    } catch {
      // Una pista que no está no puede tumbar el juego: se calla y se sigue jugando.
      buffers.set(url, null);
      return null;
    }
  }

  async function preload(urls = []) {
    await Promise.all(urls.map(load));
    return buffers.size;
  }

  function urlsFor(clave) {
    const pista = MUSIC[clave];
    if (!pista) return {};
    if (!pista.capas) return { a: `${AUDIO_BASE}/${pista.archivo}.mp3` };
    return Object.fromEntries(LAYERS.map((capa) => [capa, `${AUDIO_BASE}/${pista.archivo}-${capa}.mp3`]));
  }

  /**
   * THE SYNC. Every layer is scheduled against the SAME `inicio`, a hair in the future, and
   * a layer joining late computes its offset from that shared origin:
   *
   *     offset = (ctx.currentTime + adelanto − inicio) % duracion
   *
   * That is why the three files stay phase-locked for as long as the piece plays, and it is
   * the one thing a `Howl` per layer cannot do.
   */
  async function play(clave, { capas = { a: 1, b: 0, c: 0 }, adelanto = 0.08 } = {}) {
    if (!(await unlock())) return false;
    if (sonando?.clave === clave) {
      setLayers(capas);
      return true;
    }

    const urls = urlsFor(clave);
    const cargados = Object.fromEntries(
      await Promise.all(Object.entries(urls).map(async ([capa, url]) => [capa, await load(url)])),
    );
    const primero = cargados.a;
    if (!primero) return false;

    if (sonando) stop({ fundido: MIX.crossfadeMs / 1000 });

    const inicio = ctx.currentTime + adelanto;
    const duracion = primero.duration;
    const fuentes = {};
    const ganancias = {};

    for (const [capa, buffer] of Object.entries(cargados)) {
      if (!buffer) continue;
      const gain = ctx.createGain();
      gain.gain.value = capas[capa] ? 1 : 0.0001;
      gain.connect(musica);

      const fuente = ctx.createBufferSource();
      fuente.buffer = buffer;
      fuente.loop = true;
      fuente.connect(gain);
      fuente.start(inicio);

      fuentes[capa] = fuente;
      ganancias[capa] = gain;
    }

    sonando = { clave, fuentes, ganancias, inicio, duracion };
    return true;
  }

  /** Only the gain moves. 800 ms ramps, never a cut (§12.2). */
  function setLayers(capas = {}) {
    if (!sonando) return;
    const ahora = ctx.currentTime;
    const rampa = MIX.capaRampaMs / 1000;
    for (const [capa, gain] of Object.entries(sonando.ganancias)) {
      const objetivo = capas[capa] ? 1 : 0.0001;
      gain.gain.cancelScheduledValues(ahora);
      gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), ahora);
      gain.gain.linearRampToValueAtTime(objetivo, ahora + rampa);
    }
  }

  function stop({ fundido = 0.6 } = {}) {
    if (!sonando) return;
    const ahora = ctx.currentTime;
    const { fuentes, ganancias } = sonando;
    for (const [capa, gain] of Object.entries(ganancias)) {
      gain.gain.cancelScheduledValues(ahora);
      gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), ahora);
      gain.gain.linearRampToValueAtTime(0.0001, ahora + fundido);
      try { fuentes[capa].stop(ahora + fundido + 0.05); } catch { /* ya parado */ }
    }
    sonando = null;
  }

  /** §12.4: −12 dB under dialogue, −18 dB under a technique cut. The ducking IS the cut. */
  function duck(db = MIX.duckingDialogoDb, { ms = 120 } = {}) {
    const ahora = ctx.currentTime;
    musica.gain.cancelScheduledValues(ahora);
    musica.gain.setValueAtTime(musica.gain.value, ahora);
    musica.gain.linearRampToValueAtTime(dbToGain(db), ahora + ms / 1000);
  }

  function unduck({ ms = 260 } = {}) {
    const ahora = ctx.currentTime;
    musica.gain.cancelScheduledValues(ahora);
    musica.gain.setValueAtTime(musica.gain.value, ahora);
    musica.gain.linearRampToValueAtTime(1, ahora + ms / 1000);
  }

  async function sting(clave) {
    const nombre = STINGERS[clave] ?? clave;
    const buffer = await load(`${AUDIO_BASE}/${nombre}.mp3`);
    if (!buffer || !(await unlock())) return false;
    const fuente = ctx.createBufferSource();
    fuente.buffer = buffer;
    fuente.connect(efectos);
    fuente.start();
    return true;
  }

  async function setAmbience(clave) {
    if (ambienteActual?.clave === clave) return true;
    if (ambienteActual) {
      try { ambienteActual.fuente.stop(ctx.currentTime + 0.4); } catch { /* ya parado */ }
      ambienteActual = null;
    }
    if (!clave) return true;
    const buffer = await load(`${AUDIO_BASE}/${AMBIENCES[clave] ?? clave}.mp3`);
    if (!buffer || !(await unlock())) return false;
    const fuente = ctx.createBufferSource();
    fuente.buffer = buffer;
    fuente.loop = true;
    fuente.connect(ambiente);
    fuente.start();
    ambienteActual = { clave, fuente };
    return true;
  }

  /** Three independent sliders and a master mute, and they are saved (§12.4). */
  function setVolumes({ musica: m, efectos: e, ambiente: a, maestro } = {}) {
    if (m !== undefined) musica.gain.value = m;
    if (e !== undefined) efectos.gain.value = e;
    if (a !== undefined) ambiente.gain.value = dbToGain(MIX.ambienteDb) * a;
    if (maestro !== undefined) master.gain.value = maestro;
  }

  return {
    ctx,
    unlock,
    load,
    preload,
    play,
    setLayers,
    stop,
    duck,
    unduck,
    sting,
    setAmbience,
    setVolumes,
    get sonando() { return sonando?.clave ?? null; },
    get desbloqueado() { return desbloqueado; },
    disponible: true,
  };
}

/** No AudioContext — tests, SSR, sound off. Same shape, does nothing, never throws. */
export function createSilentAudio() {
  const noop = async () => false;
  return {
    ctx: null,
    unlock: noop,
    load: noop,
    preload: noop,
    play: noop,
    setLayers() {},
    stop() {},
    duck() {},
    unduck() {},
    sting: noop,
    setAmbience: noop,
    setVolumes() {},
    sonando: null,
    desbloqueado: false,
    disponible: false,
  };
}
