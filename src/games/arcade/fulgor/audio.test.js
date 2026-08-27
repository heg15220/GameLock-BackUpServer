/**
 * Audio (§12). Lo comprobable sin un AudioContext, que resulta ser casi todo lo que importa.
 *
 * The scheduling itself needs a browser; what does not, and what a test can hold, is the
 * catalogue's shape, the layer logic of §12.2, the mix numbers of §12.4 and the per-chapter
 * loading of §12.5 — the last one being the difference between a game that starts in three
 * files and one that starts in twenty-six megabytes.
 */

import { describe, expect, it } from "vitest";
import {
  AMBIENCES,
  AUDIO_BASE,
  BUDGET,
  LAYERS,
  MIX,
  MUSIC,
  STINGERS,
  bootManifest,
  createAudio,
  createSilentAudio,
  dbToGain,
  layerGains,
  manifestForChapter,
  trackFor,
} from "./audio.js";
import { DISTRICTS, TOTAL_CHAPTERS } from "./tables.js";

describe("el catálogo del §12.3", () => {
  it("tiene las 28 piezas, los 5 stingers y los 12 ambientes", () => {
    expect(Object.keys(MUSIC)).toHaveLength(28);
    expect(Object.keys(STINGERS)).toHaveLength(5);
    expect(Object.keys(AMBIENCES)).toHaveLength(12);
  });

  it("exactamente tres piezas van por capas, y son las de Intervención", () => {
    const conCapas = Object.entries(MUSIC).filter(([, p]) => p.capas).map(([k]) => k);
    expect(conCapas.sort()).toEqual(["aviso", "rescate", "sigilo"]);
  });

  it("toda pieza tiene archivo y una duración de bucle razonable", () => {
    for (const [id, p] of Object.entries(MUSIC)) {
      expect(p.archivo, id).toMatch(/^\d\d-[a-z-]+$/);
      expect(p.bucle, id).toBeGreaterThan(40);
      expect(p.bucle, id).toBeLessThan(140);
    }
  });

  it("ningún archivo se repite: dos piezas con el mismo nombre sonarían iguales", () => {
    const archivos = Object.values(MUSIC).map((p) => p.archivo);
    expect(new Set(archivos).size).toBe(archivos.length);
  });

  it("`sting-pista` existe: es el sonido más importante del juego (§12.3)", () => {
    expect(STINGERS.pista).toBe("sting-pista");
  });
});

describe("las capas siguen al reloj (§12.2)", () => {
  it("la base suena siempre", () => {
    for (const t of [0, 0.3, 0.6, 1]) {
      expect(layerGains({ progresoReloj: t }).a, `t=${t}`).toBe(1);
    }
  });

  it("el pulso entra pasada la mitad del reloj", () => {
    expect(layerGains({ progresoReloj: 0.49 }).b).toBe(0);
    expect(layerGains({ progresoReloj: 0.5 }).b).toBe(1);
  });

  it("la tensión entra en el último cuarto, o en cuanto hay un duelo", () => {
    expect(layerGains({ progresoReloj: 0.6 }).c).toBe(0);
    expect(layerGains({ progresoReloj: 0.8 }).c).toBe(1);
    expect(layerGains({ progresoReloj: 0.1, enDuelo: true }).c).toBe(1);
  });

  it("las capas sólo se suman: ninguna se apaga al entrar la siguiente", () => {
    const tarde = layerGains({ progresoReloj: 0.9 });
    expect(tarde).toEqual({ a: 1, b: 1, c: 1 });
  });

  it("un reloj fuera de rango no rompe la mezcla", () => {
    expect(layerGains({ progresoReloj: -3 })).toEqual({ a: 1, b: 0, c: 0 });
    expect(layerGains({ progresoReloj: 99 })).toEqual({ a: 1, b: 1, c: 1 });
  });
});

describe("qué suena en cada momento", () => {
  it("cada distrito tiene su pieza y todas existen", () => {
    for (const distrito of Object.keys(DISTRICTS)) {
      const clave = trackFor({ fase: "bloque", distrito });
      expect(MUSIC[clave], distrito).toBeTruthy();
    }
  });

  it("el jefe manda sobre el distrito", () => {
    expect(trackFor({ fase: "duelo", distrito: "concha", jefe: "tasador" })).toBe("temaTasador");
    expect(trackFor({ fase: "duelo", distrito: "puerto", jefe: "hierro" })).toBe("temaHierro");
    expect(trackFor({ fase: "duelo", distrito: "tolvas", jefe: "larga" })).toBe("temaLarga");
  });

  it("el capítulo 10 suena a apagón, esté donde esté el jugador (§9)", () => {
    for (const distrito of Object.keys(DISTRICTS)) {
      expect(trackFor({ fase: "bloque", distrito, capitulo: 10 }), distrito).toBe("elApagon");
    }
    // Salvo en el título, que es el título.
    expect(trackFor({ fase: "titulo", capitulo: 10 })).toBe("mares");
  });

  it("las tres formas de Intervención suenan distinto", () => {
    expect(trackFor({ fase: "intervencion" })).toBe("aviso");
    expect(trackFor({ fase: "intervencion", tipoIntervencion: "sigilo" })).toBe("sigilo");
    expect(trackFor({ fase: "intervencion", tipoIntervencion: "rescate" })).toBe("rescate");
    expect(trackFor({ fase: "intervencion", tipoIntervencion: "escaramuza" })).toBe("escaramuza");
  });

  it("el epílogo suena al tema principal, más lento (§12.3)", () => {
    expect(trackFor({ fase: "epilogo" })).toBe("loQueQueda");
  });

  it("un momento desconocido devuelve algo: nunca deja la escena en silencio por error", () => {
    expect(MUSIC[trackFor({ fase: "loQueSea" })]).toBeTruthy();
  });
});

describe("carga perezosa por capítulo (§12.5)", () => {
  it("el arranque son tres archivos, no un manifiesto de 26 MB", () => {
    expect(bootManifest()).toHaveLength(3);
    for (const url of bootManifest()) expect(url.startsWith(AUDIO_BASE)).toBe(true);
  });

  it("un capítulo pide sus pistas y no las de los demás", () => {
    const c3 = manifestForChapter(3, { distritos: ["aguas", "concha", "puerto"] });
    expect(c3.claves).toContain("temaTasador");
    expect(c3.claves).not.toContain("temaCero");
    expect(c3.claves).not.toContain("elApagon");
  });

  it("las piezas por capas piden sus tres archivos", () => {
    const c4 = manifestForChapter(4, { distritos: ["concha"] });
    const deAviso = c4.archivos.filter((u) => u.includes(MUSIC.aviso.archivo));
    expect(deAviso).toHaveLength(LAYERS.length);
    for (const capa of LAYERS) {
      expect(deAviso.some((u) => u.endsWith(`-${capa}.mp3`)), capa).toBe(true);
    }
  });

  it("ningún capítulo pide más de lo que cabe en el presupuesto por capítulo", () => {
    for (let c = 1; c <= TOTAL_CHAPTERS; c += 1) {
      const m = manifestForChapter(c, { distritos: Object.keys(DISTRICTS) });
      const pesoMaximoKB = m.archivos.length * BUDGET.porPistaKB;
      expect(pesoMaximoKB / 1024, `c${c}`).toBeLessThan(BUDGET.totalMB);
    }
  });

  it("todo archivo del manifiesto sale de la carpeta pública, no del bundle", () => {
    for (let c = 1; c <= TOTAL_CHAPTERS; c += 1) {
      for (const url of manifestForChapter(c, { distritos: Object.keys(DISTRICTS) }).archivos) {
        expect(url.startsWith("/assets/fulgor/audio"), url).toBe(true);
      }
    }
  });

  it("el capítulo 12 trae a Larga y a Cero", () => {
    const c12 = manifestForChapter(12, { distritos: ["poligono"] });
    expect(c12.claves).toContain("temaLarga");
    expect(c12.claves).toContain("temaCero");
  });
});

describe("las reglas de mezcla (§12.4)", () => {
  it("el diálogo baja la música a −12 dB y el corte de técnica a −18", () => {
    expect(MIX.duckingDialogoDb).toBe(-12);
    expect(MIX.duckingCorteDb).toBe(-18);
    expect(dbToGain(MIX.duckingCorteDb)).toBeLessThan(dbToGain(MIX.duckingDialogoDb));
  });

  it("los ambientes viven por debajo de −20 dB", () => {
    expect(MIX.ambienteDb).toBeLessThanOrEqual(-20);
    expect(dbToGain(MIX.ambienteDb)).toBeLessThan(0.15);
  });

  it("un solo crossfade, de 1.200 ms, y rampas de capa de 800", () => {
    expect(MIX.crossfadeMs).toBe(1200);
    expect(MIX.capaRampaMs).toBe(800);
  });

  it("0 dB es ganancia 1", () => {
    expect(dbToGain(0)).toBeCloseTo(1, 6);
    expect(dbToGain(-6)).toBeCloseTo(0.501, 2);
  });
});

describe("degradación sin AudioContext", () => {
  it("sin navegador devuelve un motor mudo con la misma forma", async () => {
    const audio = createAudio({ contexto: null });
    expect(audio.disponible).toBe(false);
    expect(await audio.play("mares")).toBe(false);
    expect(audio.sonando).toBeNull();
    // Y nada de esto lanza, que es todo lo que se le pide.
    audio.setLayers({ a: 1 });
    audio.duck();
    audio.unduck();
    audio.stop();
    audio.setVolumes({ musica: 0.5 });
  });

  it("el motor mudo expone exactamente la misma superficie que el real", () => {
    const mudo = createSilentAudio();
    for (const clave of ["unlock", "load", "preload", "play", "setLayers", "stop", "duck", "unduck", "sting", "setAmbience", "setVolumes"]) {
      expect(typeof mudo[clave], clave).toBe("function");
    }
  });
});

describe("la decisión técnica del §14.1, por escrito", () => {
  it("este módulo no importa Howler", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(path.join(__dirname, "audio.js"), "utf8");
    expect(src).not.toMatch(/from ["']howler["']/);
    expect(src).not.toMatch(/new Howl\b/);
  });

  it("y explica por qué, para que nadie lo 'arregle' más adelante", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(path.join(__dirname, "audio.js"), "utf8");
    expect(src).toMatch(/HOWLER/);
    expect(src.toLowerCase()).toMatch(/drift|deriva/);
  });
});
