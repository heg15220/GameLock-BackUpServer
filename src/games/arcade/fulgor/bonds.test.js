/**
 * La paradoja del vínculo (§2), comprobada en los dos sentidos.
 *
 * The design's central claim is that there is no dominant play, and that claim is only
 * true if the same number that buys you protection also buys the cast a better look at
 * you. The first block here checks exactly that, across `bonds.js` and `suspicion.js`
 * together — because a paradox that lives in only one file is not a paradox, it is a
 * comment.
 */

import { describe, expect, it } from "vitest";
import { createStream } from "./rng.js";
import { BOND_MAX, DOSSIERS, INTIMATE_BOND_GATE } from "./tables.js";
import { attentionOf, canPerceive, createSuspicion } from "./suspicion.js";
import {
  BOND_UNLOCKS,
  CONFIDANT_RESOURCES,
  adjustBond,
  alibiCandidates,
  bondOf,
  canDiscredit,
  createBonds,
  exposure,
  keepObligation,
  missObligation,
  missPersonalEvent,
  resourcesOf,
  rollChapter,
  setBond,
  spendTimeWith,
  unlocksAt,
  useAlibi,
  useConfidant,
} from "./bonds.js";

describe("la paradoja: el mismo número protege y expone (§2)", () => {
  it("subir el vínculo abre la coartada Y abre la pista Íntima, a la vez", () => {
    let state = setBond(createBonds(), "carmen", INTIMATE_BOND_GATE - 1);

    // Por debajo del umbral: ni te cubre ni te lee.
    expect(alibiCandidates(state, { capitulo: 3 }).some((c) => c.id === "carmen")).toBe(false);
    expect(canPerceive("carmen", "intima", bondOf(state, "carmen"))).toBe(false);

    // Cruzarlo abre las dos puertas de golpe, y ésa es toda la tesis del juego.
    state = setBond(state, "carmen", INTIMATE_BOND_GATE);
    expect(alibiCandidates(state, { capitulo: 3 }).some((c) => c.id === "carmen")).toBe(true);
    expect(canPerceive("carmen", "intima", bondOf(state, "carmen"))).toBe(true);
  });

  it("y quien te quiere te mira más: más vínculo, más atención", () => {
    const dossier = createSuspicion({ capitulo: 12 }).abiertos.nuria;
    expect(attentionOf(dossier, 5)).toBeGreaterThan(attentionOf(dossier, 0));
  });

  it("el aislamiento no es una jugada gratis: sin vínculos no hay coartadas", () => {
    let state = createBonds();
    for (const id of Object.keys(state.vinculos)) state = setBond(state, id, 0);
    expect(alibiCandidates(state, { capitulo: 6 })).toHaveLength(0);
  });
});

describe("los vínculos se mueven con los bloques (§7.2)", () => {
  it("quedar sube y faltar baja", () => {
    const base = createBonds();
    expect(bondOf(spendTimeWith(base, "julia"), "julia")).toBeGreaterThan(bondOf(base, "julia"));
    expect(bondOf(missObligation(base), "requena")).toBeLessThan(bondOf(base, "requena"));
  });

  it("faltar al cumpleaños pesa más que faltar a clase", () => {
    const base = createBonds();
    const clase = bondOf(missObligation(base, ["nuria"]), "nuria");
    const cumple = bondOf(missPersonalEvent(base, "nuria", 2), "nuria");
    expect(cumple).toBeLessThan(clase);
  });

  it("cumplir con la obligación mantiene el vínculo", () => {
    const base = createBonds();
    expect(bondOf(keepObligation(base, ["requena"]), "requena")).toBeGreaterThan(bondOf(base, "requena"));
  });

  it("nunca sale de [0, 5]", () => {
    let state = createBonds();
    for (let i = 0; i < 30; i += 1) state = adjustBond(state, "isma", 1);
    expect(bondOf(state, "isma")).toBe(BOND_MAX);
    for (let i = 0; i < 30; i += 1) state = adjustBond(state, "isma", -1);
    expect(bondOf(state, "isma")).toBe(0);
  });

  it("ajustar a alguien que no existe no rompe nada", () => {
    const base = createBonds();
    expect(adjustBond(base, "nadie", 3)).toEqual(base);
  });

  it("todo personaje con expediente arranca con el vínculo que declara la tabla", () => {
    const base = createBonds();
    for (const [id, def] of Object.entries(DOSSIERS)) {
      expect(bondOf(base, id), id).toBe(def.vinculoInicial);
    }
  });
});

describe("coartadas (§3.2)", () => {
  it("un confidente la da gratis; un amigo cualquiera la cobra en vínculo", () => {
    let state = setBond(createBonds(), "julia", 4);
    const antes = bondOf(state, "julia");
    const salida = useAlibi(state, "julia", { capitulo: 4, confidentes: [] });
    expect(salida.cubre).toBe("temporal");
    expect(bondOf(salida.state, "julia")).toBe(antes - 1);

    const gratis = useAlibi(setBond(createBonds(), "nuria", 5), "nuria", { capitulo: 4, confidentes: ["nuria"] });
    expect(bondOf(gratis.state, "nuria")).toBe(5);
  });

  it("la automática del confidente es una por capítulo", () => {
    const state = setBond(createBonds(), "nuria", 5);
    const primera = useAlibi(state, "nuria", { capitulo: 4, confidentes: ["nuria"] });
    expect(primera).not.toBeNull();
    const segunda = useAlibi(primera.state, "nuria", { capitulo: 4, confidentes: ["nuria"] });
    expect(segunda).toBeNull();
    // Y el capítulo siguiente vuelve a estar disponible.
    expect(useAlibi(rollChapter(primera.state), "nuria", { capitulo: 5, confidentes: ["nuria"] })).not.toBeNull();
  });

  it("pedirla a quien no llega al umbral no cuela", () => {
    const state = setBond(createBonds(), "oscar", 1);
    expect(useAlibi(state, "oscar", { capitulo: 4 })).toBeNull();
  });

  it("los candidatos salen ordenados por cercanía, el más cercano primero", () => {
    let state = createBonds();
    state = setBond(state, "isma", 3);
    state = setBond(state, "nuria", 5);
    state = setBond(state, "carmen", 4);

    const candidatos = alibiCandidates(state, { capitulo: 2 });
    expect(candidatos[0].id).toBe("nuria");
    expect(candidatos[1].id).toBe("carmen");
    // Y en general: la lista nunca sube de vínculo según baja.
    for (let i = 1; i < candidatos.length; i += 1) {
      expect(candidatos[i].vinculo).toBeLessThanOrEqual(candidatos[i - 1].vinculo);
    }
    // Todos los que salen cumplen el umbral y ninguno que lo cumpla se queda fuera.
    const esperados = Object.keys(state.vinculos).filter((id) => bondOf(state, id) >= 3);
    expect(candidatos.map((c) => c.id).sort()).toEqual(esperados.sort());
  });
});

describe("confidentes: recurso y vulnerabilidad a la vez (§3.5)", () => {
  it("cada uno da su recurso permanente", () => {
    const recursos = resourcesOf(["nuria", "isma", "yusuf"]).map((r) => r.recurso);
    expect(recursos).toEqual(["coartadaAutomatica", "limpiezaDigital", "taller"]);
  });

  it("Isma puede meter la pata: es un chaval con las manos temblando (§8.1)", () => {
    const next = createStream("isma", "torpe");
    let state = createBonds();
    let fallos = 0;
    for (let capitulo = 1; capitulo <= 40; capitulo += 1) {
      const salida = useConfidant(next, state, "isma", { capitulo });
      if (salida?.empeora) fallos += 1;
      if (salida) state = salida.state;
    }
    expect(fallos).toBeGreaterThan(0);
    expect(CONFIDANT_RESOURCES.isma.fallaP).toBeGreaterThan(0);
  });

  it("Nuria nunca falla: su recurso no tiene probabilidad de error", () => {
    const next = createStream("nuria");
    expect(useConfidant(next, createBonds(), "nuria", { capitulo: 3 }).empeora).toBe(false);
  });

  it("un favor se agota dentro del capítulo y vuelve en el siguiente", () => {
    const next = createStream("favores");
    let state = createBonds();
    const uno = useConfidant(next, state, "yusuf", { capitulo: 5 });
    const dos = useConfidant(next, uno.state, "yusuf", { capitulo: 5 });
    const tres = useConfidant(next, dos.state, "yusuf", { capitulo: 5 });
    expect(uno).not.toBeNull();
    expect(dos).not.toBeNull();  // Yusuf da dos por capítulo.
    expect(tres).toBeNull();
  });

  it("cuanta más gente lo sabe, más presión: la factura es superlineal", () => {
    expect(exposure([])).toBe(0);
    const uno = exposure(["nuria"]);
    const dos = exposure(["nuria", "isma"]);
    const cuatro = exposure(["nuria", "isma", "julia", "yusuf"]);
    expect(dos - uno).toBeLessThan(cuatro - dos);
  });

  it("pedirle un favor a quien no es confidente no hace nada", () => {
    expect(useConfidant(createStream("x"), createBonds(), "sabater", { capitulo: 5 })).toBeNull();
  });
});

describe("lo que desbloquea el afecto (§7.2)", () => {
  it("Requena enseña Sentido por tramos de vínculo", () => {
    let state = setBond(createBonds(), "requena", 3);
    expect(unlocksAt(state, "requena").map((u) => u.tecnica)).toEqual(["escucha"]);
    state = setBond(state, "requena", 5);
    expect(unlocksAt(state, "requena").map((u) => u.tecnica)).toEqual(["escucha", "lectura", "barrido"]);
  });

  it("Óscar sólo desmiente a otros testigos si le has dedicado bloques (§8.1)", () => {
    expect(canDiscredit(createBonds())).toBe(false);
    expect(canDiscredit(setBond(createBonds(), "oscar", 3))).toBe(true);
  });

  it("todo desbloqueo apunta a alguien que existe", () => {
    for (const id of Object.keys(BOND_UNLOCKS)) {
      expect(DOSSIERS[id], id).toBeTruthy();
    }
  });
});

describe("cambio de capítulo", () => {
  it("limpia los favores del capítulo pero conserva los vínculos", () => {
    let state = setBond(createBonds(), "nuria", 5);
    state = useAlibi(state, "nuria", { capitulo: 3, confidentes: ["nuria"] }).state;
    const siguiente = rollChapter(state);
    expect(siguiente.coartadasUsadas).toEqual({});
    expect(bondOf(siguiente, "nuria")).toBe(5);
  });
});
