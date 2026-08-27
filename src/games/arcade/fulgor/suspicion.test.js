/**
 * The most important test in the game (§14.3).
 *
 * Everything FULGOR is about lives in `suspicion.js`, and three of its rules are the kind
 * that break silently: a clue reaching someone who cannot perceive it, a clue quietly
 * decaying, and a ruina outcome firing in the opening act. None of them throws. All of
 * them ruin the campaign for the player and none of them would show up in a screenshot.
 *
 * So they are pinned here, hard.
 */

import { describe, expect, it } from "vitest";
import { createStream } from "./rng.js";
import {
  CLUE_RULES,
  DOSSIERS,
  DOSSIER_STATE_AT,
  INTEREST_DECAY_PER_DAY,
  TOTAL_CHAPTERS,
  resolveDifficulty,
} from "./tables.js";
import {
  addClue,
  applyAction,
  applyRank,
  attentionOf,
  bumpInterest,
  canPerceive,
  closureFor,
  clueChance,
  cluesToClose,
  confidants,
  createSuspicion,
  decay,
  disclose,
  effectiveThreshold,
  isRuined,
  openDossier,
  removableClues,
  removeClue,
  resolveClosures,
  rollClue,
} from "./suspicion.js";

const clue = (tipo, id = `${tipo}-1`) => ({ id, tipo, origen: "test", capitulo: 1, dia: 1 });
const medio = resolveDifficulty("medio");

/** A campaign far enough along that every dossier is open. */
const fullState = () => createSuspicion({ capitulo: TOTAL_CHAPTERS });

describe("percepción: el sesgo es una puerta cerrada", () => {
  it("nunca deja pasar un tipo de pista que el personaje no percibe", () => {
    for (const [id, def] of Object.entries(DOSSIERS)) {
      for (const tipo of Object.keys(CLUE_RULES)) {
        const puede = canPerceive(id, tipo, 5);
        if (!def.sesgos.includes(tipo)) {
          expect(puede, `${id} no debería percibir ${tipo}`).toBe(false);
        }
      }
    }
  });

  it("bloquea Íntima por debajo de vínculo 3 aunque el sesgo esté", () => {
    // Nuria tiene sesgo íntimo; sin cercanía no lo lee igual.
    expect(canPerceive("nuria", "intima", 2)).toBe(false);
    expect(canPerceive("nuria", "intima", 3)).toBe(true);
  });

  it("addClue rechaza en silencio una pista que el expediente no puede ver", () => {
    const state = fullState();
    // Óscar sólo lee Testimonial: una cámara municipal no le dice nada.
    const after = addClue(state, "oscar", clue("digital"), { vinculo: 5 });
    expect(after.abiertos.oscar.pistas).toHaveLength(0);
    const ok = addClue(state, "oscar", clue("testimonial"), { vinculo: 0 });
    expect(ok.abiertos.oscar.pistas).toHaveLength(1);
  });

  it("no admite dos veces la misma pista", () => {
    let state = fullState();
    state = addClue(state, "nuria", clue("temporal", "t1"));
    state = addClue(state, "nuria", clue("temporal", "t1"));
    expect(state.abiertos.nuria.pistas).toHaveLength(1);
  });
});

describe("las pistas no decaen nunca", () => {
  it("sobreviven a un mes sin estímulo, y el interés no", () => {
    let state = fullState();
    state = addClue(state, "sabater", clue("digital", "d1"));
    state = bumpInterest(state, "sabater", 60);
    const antes = state.abiertos.sabater.interes;

    state = decay(state, 30, { dif: medio });

    expect(state.abiertos.sabater.pistas).toHaveLength(1);
    expect(state.abiertos.sabater.interes).toBeLessThan(antes);
  });

  it("el interés nunca baja del suelo del personaje", () => {
    let state = fullState();
    state = decay(state, 200, { dif: medio });
    for (const [id, d] of Object.entries(state.abiertos)) {
      expect(d.interes, id).toBeGreaterThanOrEqual(DOSSIERS[id].interesSuelo);
    }
    // Sabater es el caso con nombre del §3.4.
    expect(state.abiertos.sabater.interes).toBe(30);
  });

  it("decae al ritmo de la tabla en modo medio", () => {
    let state = fullState();
    state = bumpInterest(state, "nuria", 50);
    const antes = state.abiertos.nuria.interes;
    state = decay(state, 3, { dif: medio });
    expect(antes - state.abiertos.nuria.interes).toBeCloseTo(INTEREST_DECAY_PER_DAY * 3, 5);
  });
});

describe("estados y umbrales (§3.4)", () => {
  it("sube de latente a activo a obsesivo por interés", () => {
    let state = fullState();
    expect(state.abiertos.nuria.estado).toBe("latente");
    state = bumpInterest(state, "nuria", DOSSIER_STATE_AT.activo);
    expect(state.abiertos.nuria.estado).toBe("activo");
    state = bumpInterest(state, "nuria", DOSSIER_STATE_AT.obsesivo);
    expect(state.abiertos.nuria.estado).toBe("obsesivo");
  });

  it("un obsesivo se rebaja su propio umbral en uno", () => {
    let state = fullState();
    const normal = effectiveThreshold(state.abiertos.marga, medio);
    state = bumpInterest(state, "marga", 100);
    const obsesivo = effectiveThreshold(state.abiertos.marga, medio);
    expect(obsesivo).toBe(normal - 1);
  });

  it("el umbral nunca cae por debajo de uno", () => {
    const dificil = resolveDifficulty("dificil");
    let state = fullState();
    state = bumpInterest(state, "nuria", 100);
    expect(effectiveThreshold(state.abiertos.nuria, dificil)).toBeGreaterThanOrEqual(1);
  });

  it("cluesToClose llega a cero exactamente en el umbral", () => {
    let state = fullState();
    const umbral = effectiveThreshold(state.abiertos.nuria, medio);
    for (let i = 0; i < umbral; i += 1) {
      state = addClue(state, "nuria", clue("temporal", `t${i}`));
    }
    expect(cluesToClose(state.abiertos.nuria, medio)).toBe(0);
  });
});

describe("la puerta de la ruina (§3.5)", () => {
  const llenar = (state, id, tipo, n) => {
    let acc = state;
    for (let i = 0; i < n; i += 1) acc = addClue(acc, id, clue(tipo, `${id}-${i}`), { vinculo: 5 });
    return acc;
  };

  it("no se dispara antes del capítulo que fija la dificultad", () => {
    let state = fullState();
    state = llenar(state, "sabater", "digital", 12);
    for (const modo of ["facil", "medio", "dificil"]) {
      const dif = resolveDifficulty(modo);
      const antes = closureFor(state.abiertos.sabater, { capitulo: dif.ruinaDesdeCapitulo - 1, dif });
      expect(antes.desenlace, modo).toBe("retenido");
      const despues = closureFor(state.abiertos.sabater, { capitulo: dif.ruinaDesdeCapitulo, dif });
      expect(despues.desenlace, modo).toBe("ruina");
    }
  });

  it("retenido deja el expediente lleno y abierto, no lo vacía", () => {
    let state = fullState();
    state = llenar(state, "sabater", "digital", 12);
    const { state: after, eventos } = resolveClosures(state, { capitulo: 2, dif: medio });
    expect(eventos).toHaveLength(0);
    expect(after.abiertos.sabater.pistas.length).toBeGreaterThan(0);
    expect(isRuined(after)).toBe(false);
  });

  it("un obsesivo se vuelve ruina cuando ya hay tres expedientes cerrados", () => {
    let state = fullState();
    state = llenar(state, "nuria", "temporal", 8);
    state = bumpInterest(state, "nuria", 100);
    const normal = closureFor(state.abiertos.nuria, { capitulo: 10, dif: medio, cerradosPrevios: 0 });
    expect(normal.desenlace).toBe("aliado");
    const tarde = closureFor(state.abiertos.nuria, { capitulo: 10, dif: medio, cerradosPrevios: 3 });
    expect(tarde.desenlace).toBe("ruina");
  });

  it("cierra como aliado y guarda el desenlace sin la lista de pistas (§15.2)", () => {
    let state = fullState();
    state = llenar(state, "nuria", "temporal", 8);
    const { state: after, eventos } = resolveClosures(state, { capitulo: 6, dif: medio });
    expect(eventos.map((e) => e.id)).toContain("nuria");
    expect(after.abiertos.nuria).toBeUndefined();
    expect(after.cerrados.nuria).toEqual({ desenlace: "aliado", capitulo: 6 });
    expect(confidants(after).map((c) => c.id)).toContain("nuria");
  });
});

describe("la fórmula de generación (§3.3)", () => {
  it("visibilidad 0 es probabilidad 0: Sentido no puede delatarte nunca", () => {
    expect(clueChance({ visibilidad: 0, proximidad: 1, atencion: 1.2 })).toBe(0);
  });

  it("la ocultación del traje reduce, y su techo es 0.85", () => {
    // Atención a la mitad para quedarse por debajo del techo del 0.95 y poder leer la
    // proporción limpia: con el clamp arriba, la razón entre las dos cifras se pierde.
    const base = { visibilidad: 3, proximidad: 1, atencion: 0.5 };
    const desnudo = clueChance({ ...base, ocultacion: 0 });
    const tapado = clueChance({ ...base, ocultacion: 0.5 });
    const imposible = clueChance({ ...base, ocultacion: 0.99 });
    expect(tapado).toBeLessThan(desnudo);
    // El techo del 0.85 impide que un traje anule la detección por completo.
    expect(imposible).toBeCloseTo(desnudo * 0.15, 5);
    expect(imposible).toBeGreaterThan(0);
  });

  it("nunca supera el techo del 0.95: nada es seguro", () => {
    expect(clueChance({ visibilidad: 3, proximidad: 1, atencion: 1.2, distrito: "concha" })).toBe(0.95);
  });

  it("la noche y la lluvia esconden; el Centro delata", () => {
    const base = { visibilidad: 3, proximidad: 1, atencion: 1 };
    expect(clueChance({ ...base, hora: "noche" })).toBeLessThan(clueChance({ ...base, hora: "manana" }));
    expect(clueChance({ ...base, clima: "lluvia" })).toBeLessThan(clueChance({ ...base, clima: "despejado" }));
    expect(clueChance({ ...base, distrito: "concha" })).toBeGreaterThan(clueChance({ ...base, distrito: "puerto" }));
  });

  it("la dificultad mueve la generación en la dirección declarada (§10)", () => {
    const base = { visibilidad: 2, proximidad: 1, atencion: 1 };
    const facil = clueChance({ ...base, dif: resolveDifficulty("facil") });
    const med = clueChance({ ...base, dif: medio });
    const dificil = clueChance({ ...base, dif: resolveDifficulty("dificil") });
    expect(facil).toBeLessThan(med);
    expect(med).toBeLessThan(dificil);
  });

  it("la atención sube con el interés y con el vínculo — la paradoja del §2", () => {
    const frio = { id: "nuria", interes: 0, pistas: [], estado: "latente" };
    const caliente = { id: "nuria", interes: 80, pistas: [], estado: "obsesivo" };
    expect(attentionOf(frio, 0)).toBeLessThan(attentionOf(frio, 5));
    expect(attentionOf(frio, 0)).toBeLessThan(attentionOf(caliente, 0));
  });

  it("un susto no deja pista pero sube el interés", () => {
    // Una tirada justo por encima de p cae dentro de la banda del 15%.
    const next = () => 0.5;
    const out = rollClue(next, { visibilidad: 3, proximidad: 1, atencion: 1, ocultacion: 0.55 });
    expect(out.generada).toBe(false);
    expect(out.cerca).toBe(true);
  });
});

describe("una acción delante de un reparto (§3.2)", () => {
  /** La escena que el documento usa como ejemplo: una descarga delante de gente distinta. */
  const descarga = {
    id: "incendio-c2",
    origen: "descargaIncendio",
    visibilidad: 3,
    ocultacion: 0.1,
    tipos: ["digital", "testimonial", "intima"],
  };

  it("reparte tipos distintos según quién esté delante", () => {
    const next = createStream("test", "reparto");
    const state = fullState();
    const { generadas } = applyAction(
      state,
      descarga,
      [
        { id: "sabater", proximidad: 1, vinculo: 0 },
        { id: "pilar", proximidad: 1, vinculo: 1 },
        { id: "nuria", proximidad: 1, vinculo: 5 },
      ],
      { next, dif: medio, contexto: { distrito: "concha" }, capitulo: 2, dia: 3 },
    );

    for (const g of generadas) {
      expect(DOSSIERS[g.testigo].sesgos, `${g.testigo}/${g.clue.tipo}`).toContain(g.clue.tipo);
    }
    // Sabater no tiene sesgo testimonial: nunca puede llegarle por ahí.
    expect(generadas.filter((g) => g.testigo === "sabater" && g.clue.tipo === "testimonial")).toHaveLength(0);
  });

  it("una pista garantizada entra aunque la tirada falle, y sólo a quien puede verla", () => {
    const next = () => 0.999; // todas las tiradas fallan
    const state = fullState();
    const { generadas } = applyAction(
      state,
      { ...descarga, id: "fulgor-c12", pistaGarantizada: "digital" },
      [
        { id: "sabater", proximidad: 1, vinculo: 0 },
        { id: "pilar", proximidad: 1, vinculo: 1 },
      ],
      { next, dif: medio, capitulo: 12, dia: 1 },
    );
    const garantizadas = generadas.filter((g) => g.garantizada);
    expect(garantizadas).toHaveLength(1);
    expect(garantizadas[0].testigo).toBe("sabater");
  });

  it("es determinista bajo semilla", () => {
    const run = () => {
      const next = createStream("semilla-fija", "accion");
      return applyAction(fullState(), descarga, [
        { id: "sabater", proximidad: 1, vinculo: 0 },
        { id: "nuria", proximidad: 0.8, vinculo: 5 },
        { id: "isma", proximidad: 0.6, vinculo: 4 },
      ], { next, dif: medio, capitulo: 5, dia: 2 }).generadas.map((g) => g.clue.id);
    };
    expect(run()).toEqual(run());
  });
});

describe("contramedidas (§7.2)", () => {
  it("retira una pista Digital pero jamás una Íntima", () => {
    let state = fullState();
    state = addClue(state, "carmen", clue("intima", "i1"), { vinculo: 5 });
    state = addClue(state, "carmen", clue("fisica", "f1"), { vinculo: 5 });

    const retirables = removableClues(state, "carmen").map((p) => p.id);
    expect(retirables).toEqual(["f1"]);

    const fallida = removeClue(state, "carmen", "i1");
    expect(fallida.retirada).toBeNull();
    expect(fallida.state.abiertos.carmen.pistas).toHaveLength(2);

    const buena = removeClue(state, "carmen", "f1");
    expect(buena.retirada.tipo).toBe("fisica");
    expect(buena.state.abiertos.carmen.pistas).toHaveLength(1);
  });
});

describe("el rango se paga con Sabater (§8.2)", () => {
  it("subir de rango la acerca y a nadie más", () => {
    const state = fullState();
    const after = applyRank(state, 3);
    expect(after.abiertos.sabater.interes).toBeGreaterThan(state.abiertos.sabater.interes);
    expect(after.abiertos.marga.interes).toBe(state.abiertos.marga.interes);
  });
});

describe("apertura por capítulos (§8)", () => {
  it("el capítulo 1 no abre ningún expediente: la vida de antes", () => {
    expect(Object.keys(createSuspicion({ capitulo: 1 }).abiertos)).toHaveLength(0);
  });

  it("el capítulo 2 abre exactamente Nuria, Isma y Doña Pilar (§9)", () => {
    const abiertos = Object.keys(createSuspicion({ capitulo: 2 }).abiertos).sort();
    expect(abiertos).toEqual(["isma", "nuria", "pilar"]);
  });

  it("todos los expedientes están abiertos antes del último capítulo", () => {
    const abiertos = Object.keys(createSuspicion({ capitulo: TOTAL_CHAPTERS }).abiertos);
    expect(abiertos).toHaveLength(Object.keys(DOSSIERS).length);
  });

  it("openDossier no reabre uno cerrado", () => {
    let state = createSuspicion({ capitulo: 2 });
    state = { ...state, cerrados: { isma: { desenlace: "aliado", capitulo: 8 } } };
    delete state.abiertos.isma;
    expect(openDossier(state, "isma").abiertos.isma).toBeUndefined();
  });
});

describe("qué enseña el panel en cada modo (§10)", () => {
  const conPistas = () => {
    let state = fullState();
    state = addClue(state, "sabater", clue("digital", "d1"));
    return state;
  };

  it("fácil dice cuántas faltan; medio no; difícil no dice ni el estado", () => {
    const facil = disclose(conPistas(), { dif: resolveDifficulty("facil") })
      .find((d) => d.id === "sabater");
    const med = disclose(conPistas(), { dif: medio }).find((d) => d.id === "sabater");
    const dificil = disclose(conPistas(), { dif: resolveDifficulty("dificil") })
      .find((d) => d.id === "sabater");

    expect(facil.faltan).toBeGreaterThan(0);
    expect(med.faltan).toBeUndefined();
    expect(med.estado).toBeTruthy();
    expect(dificil.estado).toBeUndefined();
    expect(dificil.pistas).toBe(1);
  });
});
