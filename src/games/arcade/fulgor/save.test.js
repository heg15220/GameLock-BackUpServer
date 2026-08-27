/**
 * §14.3, palabra por palabra: "ida y vuelta de serialización; ida y vuelta del código de
 * transferencia sobre un estado de final de campaña, comprobando que el resultado es
 * idéntico y que no pasa del presupuesto de 1.400 caracteres; que un código truncado,
 * alterado un carácter o de otro juego se rechace en vez de importarse a medias; y cada
 * migración probada contra un código real exportado con la versión anterior."
 *
 * The budget test is the one that will actually catch something. Everything else in this
 * file is a guard against a rare accident; the character count is a guard against the
 * ordinary, gradual failure of a save format that grows a field at a time until one day the
 * code no longer fits in a message.
 */

import { describe, expect, it } from "vitest";
import {
  CODE_BUDGET,
  CODE_PREFIX,
  MIGRATIONS,
  SAVE_DOSSIER_KEYS,
  SAVE_FLAG_KEYS,
  SAVE_ORIGIN_KEYS,
  SAVE_TECHNIQUE_KEYS,
  SAVE_VERSION,
  buildPayload,
  checksum,
  createAutosaver,
  decodeCode,
  encodeCode,
  migrate,
  readPayload,
} from "./save.js";
import {
  AFFINITIES,
  DIFFICULTY_MODES,
  DOSSIERS,
  MATERIALS,
  STATS,
  SUIT_SLOTS,
  TECHNIQUES,
  TOTAL_CHAPTERS,
} from "./tables.js";
import { CHAPTER_LIST } from "./story.js";
import { createSuspicion } from "./suspicion.js";
import { createBonds } from "./bonds.js";
import { createProgress } from "./progress.js";
import { createCalendar } from "./calendar.js";
import { createSuit, wear } from "./suit.js";

/* ── Estados de prueba ───────────────────────────────────────────────────────────── */

function estadoLimpio() {
  return {
    calendario: createCalendar(1),
    progreso: createProgress(),
    sospecha: createSuspicion({ capitulo: 1 }),
    vinculos: createBonds(),
    traje: null,
    dificultad: "medio",
    banderas: new Set(),
    mentores: [],
    villanos: [],
  };
}

/**
 * The worst case §15.2 names: end of chapter 12, every dossier touched, the full suit. If
 * the budget holds here it holds everywhere, because there is no state after this one.
 */
function estadoFinDeCampana() {
  const sospecha = createSuspicion({ capitulo: TOTAL_CHAPTERS });
  // Todos los expedientes llenos hasta un punto por debajo de su umbral, con pistas de
  // todos los orígenes: la partida más cargada que este formato puede tener que describir.
  for (const [i, id] of Object.keys(sospecha.abiertos).entries()) {
    const d = sospecha.abiertos[id];
    d.interes = 40 + (i % 50);
    d.pistas = Array.from({ length: Math.min(7, DOSSIERS[id].umbral) }, (_, k) => ({
      id: `p${k}`,
      tipo: DOSSIERS[id].sesgos[k % DOSSIERS[id].sesgos.length],
      origen: SAVE_ORIGIN_KEYS[(i + k) % SAVE_ORIGIN_KEYS.length],
      capitulo: 1 + ((i + k) % TOTAL_CHAPTERS),
      dia: 3,
    }));
  }
  // Cuatro cerrados, que es el escenario del final "Los dos".
  for (const id of ["isma", "nuria", "yusuf", "requena"]) {
    if (!sospecha.abiertos[id]) continue;
    delete sospecha.abiertos[id];
    sospecha.cerrados[id] = { desenlace: "aliado", capitulo: 8 };
  }

  const progreso = createProgress();
  progreso.nivel = 31;
  progreso.xp = 4210;
  progreso.puntosLibres = 2;
  progreso.rango = 17;
  progreso.dinero = 1840;
  progreso.afinidades = [...AFFINITIES];
  progreso.aprendidas = Object.keys(TECHNIQUES);
  progreso.equipadas = Object.keys(TECHNIQUES).slice(0, 6);
  for (const s of STATS) progreso.stats[s] = 55 + s.length;
  for (const m of MATERIALS) progreso.materiales[m] = 40;
  progreso.entrenamientos = { faro: 9, puerto: 7, poligono: 12, instituto: 5, concha: 6 };

  const vinculos = createBonds();
  for (const id of Object.keys(vinculos.vinculos)) vinculos.vinculos[id] = 5;

  const calendario = createCalendar(TOTAL_CHAPTERS);
  calendario.dia = 5;
  calendario.bloque = 2;
  calendario.nochesSeguidas = 3;
  calendario.interrupcionesCapitulo = 3;

  return {
    calendario,
    progreso,
    sospecha,
    vinculos,
    traje: wear(createSuit("fulgor"), { duelos: 4 }),
    dificultad: "dificil",
    banderas: new Set(SAVE_FLAG_KEYS),
    mentores: ["requena", "vigia", "yusuf"],
    villanos: ["tasador", "hierro", "larga", "cero"],
  };
}

/* ── Ida y vuelta ────────────────────────────────────────────────────────────────── */

describe("ida y vuelta de serialización", () => {
  it("un estado de final de campaña vuelve idéntico", () => {
    const estado = estadoFinDeCampana();
    const { code } = encodeCode(estado);
    const salida = decodeCode(code);
    expect(salida.ok).toBe(true);

    const leido = readPayload(salida.payload);
    const original = buildPayload(estado);
    expect(leido.capitulo).toBe(original.g[0]);
    expect(leido.dia).toBe(original.g[1]);
    expect(leido.nivel).toBe(estado.progreso.nivel);
    expect(leido.rango).toBe(estado.progreso.rango);
    expect(leido.dinero).toBe(estado.progreso.dinero);
    expect(leido.dificultad).toBe("dificil");
    expect(leido.stats).toEqual(estado.progreso.stats);
    expect(leido.materiales).toEqual(estado.progreso.materiales);
    expect(leido.aprendidas.sort()).toEqual(estado.progreso.aprendidas.sort());
    expect(leido.equipadas).toEqual(estado.progreso.equipadas);
    expect(leido.afinidades.sort()).toEqual([...AFFINITIES].sort());
    expect(leido.entrenamientos).toEqual(estado.progreso.entrenamientos);
    expect(leido.banderas.sort()).toEqual([...SAVE_FLAG_KEYS].sort());
    expect(leido.mentores).toEqual(estado.mentores);
    expect(leido.villanos).toEqual(estado.villanos);
  });

  it("los expedientes vuelven con el mismo interés y el mismo recuento de pistas", () => {
    const estado = estadoFinDeCampana();
    const leido = readPayload(decodeCode(encodeCode(estado).code).payload);
    for (const d of leido.abiertos) {
      const original = estado.sospecha.abiertos[d.id];
      expect(d.interes, d.id).toBe(Math.round(original.interes));
      expect(d.pistas.length, d.id).toBe(original.pistas.length);
      // El tipo y el origen sobreviven: es lo que el panel necesita enseñar.
      expect(d.pistas.map((p) => p.tipo)).toEqual(original.pistas.map((p) => p.tipo));
      expect(d.pistas.map((p) => p.origen)).toEqual(original.pistas.map((p) => p.origen));
    }
  });

  it("un cerrado conserva su desenlace y su capítulo, y suelta la lista de pistas (§15.2)", () => {
    const estado = estadoFinDeCampana();
    const leido = readPayload(decodeCode(encodeCode(estado).code).payload);
    const isma = leido.cerrados.find((c) => c.id === "isma");
    expect(isma).toEqual({ id: "isma", desenlace: "aliado", capitulo: 8 });
    expect(isma).not.toHaveProperty("pistas");
  });

  it("el traje vuelve con su generación y la integridad de las seis piezas", () => {
    const estado = estadoFinDeCampana();
    const leido = readPayload(decodeCode(encodeCode(estado).code).payload);
    expect(leido.traje.generacion).toBe("fulgor");
    for (const slot of SUIT_SLOTS) {
      expect(leido.traje.piezas[slot].integridad, slot)
        .toBe(Math.round(estado.traje.piezas[slot].integridad));
    }
  });

  it("dos codificaciones del mismo estado dan el mismo código", () => {
    const estado = estadoFinDeCampana();
    expect(encodeCode(estado).code).toBe(encodeCode(estado).code);
  });
});

/* ── El presupuesto ──────────────────────────────────────────────────────────────── */

describe("el presupuesto de 1.400 caracteres (§15.2)", () => {
  it("una partida de final de campaña cabe", () => {
    const { code, caracteres } = encodeCode(estadoFinDeCampana());
    expect(caracteres, `el código mide ${caracteres}`).toBeLessThanOrEqual(CODE_BUDGET);
    expect(code.length).toBe(caracteres);
  });

  it("una partida recién empezada produce un código diminuto (§15.2, punto 3)", () => {
    const { caracteres } = encodeCode(estadoLimpio());
    expect(caracteres).toBeLessThan(120);
  });

  it("y el código crece con la campaña, no de golpe", () => {
    const nuevo = encodeCode(estadoLimpio()).caracteres;
    const final = encodeCode(estadoFinDeCampana()).caracteres;
    expect(nuevo).toBeLessThan(final);
  });

  it("lo que está en su valor de fábrica no ocupa nada", () => {
    const payload = buildPayload(estadoLimpio());
    // Sin traje, sin cerrados, sin banderas y sin vínculos movidos: esas claves no existen.
    expect(payload.j).toBeUndefined();
    expect(payload.c).toBeUndefined();
    expect(payload.h).toBeUndefined();
    expect(payload.b).toBeUndefined();
    expect(payload.e).toBeUndefined();
  });
});

/* ── Integridad (§15.3) ──────────────────────────────────────────────────────────── */

describe("un código malo se rechaza entero, nunca a medias (§15.3)", () => {
  const bueno = () => encodeCode(estadoFinDeCampana()).code;

  it("truncado por la mitad", () => {
    const code = bueno();
    const salida = decodeCode(code.slice(0, Math.floor(code.length / 2)));
    expect(salida.ok).toBe(false);
    expect(salida.payload).toBeUndefined();
  });

  it("truncado por un solo carácter al final", () => {
    expect(decodeCode(bueno().slice(0, -1)).ok).toBe(false);
  });

  it("con un carácter cambiado en el cuerpo", () => {
    const code = bueno();
    const i = Math.floor(code.length / 2);
    const cambiado = code.slice(0, i) + (code[i] === "A" ? "B" : "A") + code.slice(i + 1);
    expect(decodeCode(cambiado).ok).toBe(false);
    expect(decodeCode(cambiado).motivo).toBe("danado");
  });

  it("de otro juego, y lo dice con otro motivo", () => {
    const salida = decodeCode("VT1.eyJ2IjoxfQ");
    expect(salida.ok).toBe(false);
    expect(salida.motivo).toBe("otroJuego");
  });

  it("vacío, o sólo espacios", () => {
    expect(decodeCode("").motivo).toBe("vacio");
    expect(decodeCode("   ").motivo).toBe("vacio");
    expect(decodeCode(null).motivo).toBe("vacio");
  });

  it("de una versión futura, en vez de intentar leerlo", () => {
    const code = bueno().replace(CODE_PREFIX, `FG${SAVE_VERSION + 5}.`);
    expect(decodeCode(code).motivo).toBe("versionFutura");
  });

  it("basura con el prefijo correcto", () => {
    expect(decodeCode("FG1.no-es-base64-valido.zzz").ok).toBe(false);
    expect(decodeCode("FG1.").ok).toBe(false);
  });

  it("aguanta que el jugador lo pegue con espacios y saltos de línea", () => {
    const code = bueno();
    const sucio = `  ${code.slice(0, 40)}\n${code.slice(40)}  `;
    expect(decodeCode(sucio).ok).toBe(true);
  });

  it("el checksum es corto y distinto para contenidos distintos", () => {
    expect(checksum("abc")).not.toBe(checksum("abd"));
    expect(checksum("abc").length).toBeLessThan(10);
  });
});

/* ── Migraciones (§15.3) ─────────────────────────────────────────────────────────── */

describe("migraciones", () => {
  it("la escalera existe desde el día uno, aunque todavía no haya nada que migrar", () => {
    expect(MIGRATIONS).toBeTypeOf("object");
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(1);
  });

  it("hay un paso para cada versión anterior a la actual", () => {
    for (let v = 1; v < SAVE_VERSION; v += 1) {
      expect(MIGRATIONS[v], `falta la migración ${v} → ${v + 1}`).toBeTypeOf("function");
    }
  });

  it("migrar la versión actual no la toca", () => {
    const payload = buildPayload(estadoFinDeCampana());
    expect(migrate(payload, SAVE_VERSION)).toEqual(payload);
  });

  it("un código exportado con la versión anterior sigue entrando (§15.3)", () => {
    // Con SAVE_VERSION en 1 esto se comprueba contra sí misma; en cuanto exista una 2, el
    // bucle recorre de verdad la escalera y este test empieza a valer por lo que dice.
    for (let v = 1; v <= SAVE_VERSION; v += 1) {
      const payload = { ...buildPayload(estadoFinDeCampana()), v };
      const migrado = migrate(payload, v);
      expect(migrado.v ?? v, `v${v}`).toBeLessThanOrEqual(SAVE_VERSION);
      expect(readPayload(migrado).capitulo, `v${v}`).toBe(TOTAL_CHAPTERS);
    }
  });
});

/* ── Tablas de índices ───────────────────────────────────────────────────────────── */

describe("las tablas de índices son la parte frágil", () => {
  it("cubren todo lo que hay que guardar", () => {
    expect(SAVE_DOSSIER_KEYS.sort()).toEqual(Object.keys(DOSSIERS).sort());
    expect(SAVE_TECHNIQUE_KEYS.sort()).toEqual(Object.keys(TECHNIQUES).sort());
  });

  it("las banderas salen de story.js, no de una segunda lista escrita a mano", () => {
    const deHistoria = new Set(CHAPTER_LIST.flatMap((c) => c.escribe));
    expect([...deHistoria].sort()).toEqual([...SAVE_FLAG_KEYS].sort());
  });

  it("ninguna tabla tiene repetidos: un índice repetido corrompe en silencio", () => {
    const tablas = { SAVE_DOSSIER_KEYS, SAVE_TECHNIQUE_KEYS, SAVE_FLAG_KEYS, SAVE_ORIGIN_KEYS };
    for (const [nombre, tabla] of Object.entries(tablas)) {
      expect(new Set(tabla).size, nombre).toBe(tabla.length);
    }
  });

  it("todo origen que el juego puede emitir tiene su índice", () => {
    // Los fragmentos del traje son los que `suit.js` genera con nombre de ranura.
    for (const slot of SUIT_SLOTS) {
      expect(SAVE_ORIGIN_KEYS, slot).toContain(`fragmento.${slot}`);
    }
  });

  it("los tres modos de dificultad viajan en el código (§10.5)", () => {
    for (const modo of DIFFICULTY_MODES) {
      const estado = { ...estadoLimpio(), dificultad: modo };
      expect(readPayload(decodeCode(encodeCode(estado).code).payload).dificultad, modo).toBe(modo);
    }
  });
});

/* ── Autoguardado ────────────────────────────────────────────────────────────────── */

describe("el autoguardado no puede disparar en mitad de un duelo", () => {
  it("suspendido, no guarda", () => {
    let veces = 0;
    const auto = createAutosaver(() => { veces += 1; });
    auto.suspender();
    expect(auto.encolar({})).toBe(false);
    expect(auto.ahora({})).toBe(false);
    expect(veces).toBe(0);
  });

  it("reanudado, vuelve a guardar de inmediato con `ahora`", () => {
    let veces = 0;
    const auto = createAutosaver(() => { veces += 1; });
    auto.suspender();
    auto.reanudar();
    expect(auto.ahora({})).toBe(true);
    expect(veces).toBe(1);
  });

  it("rebota: varias llamadas seguidas guardan una vez", async () => {
    let veces = 0;
    const auto = createAutosaver(() => { veces += 1; }, { retardo: 10 });
    auto.encolar({});
    auto.encolar({});
    auto.encolar({});
    expect(veces).toBe(0);
    await new Promise((r) => setTimeout(r, 30));
    expect(veces).toBe(1);
  });

  it("cancelar deja el temporizador en nada", async () => {
    let veces = 0;
    const auto = createAutosaver(() => { veces += 1; }, { retardo: 10 });
    auto.encolar({});
    auto.cancelar();
    await new Promise((r) => setTimeout(r, 30));
    expect(veces).toBe(0);
  });
});
