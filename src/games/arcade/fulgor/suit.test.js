/**
 * El traje (§6): que el compromiso sea real y que la integridad hable con el §3.
 *
 * The one thing worth guarding hardest is the join: a worn suit must actually produce
 * Física clues, because that is what stops integrity from being a durability bar and makes
 * it the way the combat system files evidence against you.
 */

import { describe, expect, it } from "vitest";
import { createStream } from "./rng.js";
import {
  OCCULTATION_CAP,
  SUIT_GENERATIONS,
  SUIT_GENERATION_ORDER,
  SUIT_SLOTS,
} from "./tables.js";
import {
  availableGeneration,
  build,
  buildCost,
  canBuild,
  createSuit,
  describeSlot,
  fragmentRoll,
  generationIndex,
  integrityBand,
  intimateRisk,
  isRecognisable,
  recognisablePieces,
  repair,
  repairCost,
  suitStats,
  wear,
} from "./suit.js";

const rico = { cobre: 99, fibra: 99, ceramica: 99, neodimio: 99, optica: 99, nucleo: 99 };

describe("las cinco generaciones (§6.3)", () => {
  it("cada una llega en su capítulo y en orden", () => {
    let previo = 0;
    for (const id of SUIT_GENERATION_ORDER) {
      const cap = SUIT_GENERATIONS[id].capitulo;
      expect(cap, id).toBeGreaterThanOrEqual(previo);
      previo = cap;
    }
  });

  it("availableGeneration devuelve la mejor desbloqueada, no la siguiente", () => {
    expect(availableGeneration(2)).toBe("improvisado");
    expect(availableGeneration(5)).toBe("taller");
    expect(availableGeneration(9)).toBe("conductor");
    expect(availableGeneration(12)).toBe("fulgor");
  });

  it("el traje conductor es un salto de poder Y una caída de ocultación (§6.3)", () => {
    const aislado = suitStats(createSuit("aislado"));
    const conductor = suitStats(createSuit("conductor"));
    expect(conductor.potencia).toBeGreaterThan(aislado.potencia);
    expect(conductor.ocultacion).toBeLessThan(aislado.ocultacion);
  });

  it("el improvisado es malísimo escondiendo, que es lo que empuja al jugador", () => {
    expect(suitStats(createSuit("improvisado")).ocultacion)
      .toBeLessThan(suitStats(createSuit("taller")).ocultacion);
  });

  it("cada generación cuesta más que la anterior", () => {
    let previo = 0;
    for (const id of SUIT_GENERATION_ORDER) {
      const total = Object.values(buildCost(id)).reduce((a, b) => a + b, 0);
      expect(total, id).toBeGreaterThan(previo);
      previo = total;
    }
  });

  it("generationIndex ordena de improvisado a fulgor", () => {
    expect(generationIndex("improvisado")).toBe(0);
    expect(generationIndex("fulgor")).toBe(SUIT_GENERATION_ORDER.length - 1);
  });
});

describe("el traje Fulgor se paga con la gente que dejaste entrar (§6.3)", () => {
  it("sus estadísticas suben con cada confidente y las de otro traje no", () => {
    const solo = suitStats(createSuit("fulgor"), { confidentes: 0 });
    const acompanado = suitStats(createSuit("fulgor"), { confidentes: 4 });
    expect(acompanado.potencia).toBeGreaterThan(solo.potencia);
    expect(acompanado.guardia).toBeGreaterThan(solo.guardia);

    const conductorSolo = suitStats(createSuit("conductor"), { confidentes: 0 });
    const conductorNo = suitStats(createSuit("conductor"), { confidentes: 4 });
    expect(conductorNo.potencia).toBe(conductorSolo.potencia);
  });
});

describe("construir y reparar", () => {
  it("no se puede construir sin materiales, y no se entra en deuda", () => {
    expect(canBuild("fulgor", { cobre: 1 })).toBe(false);
    expect(build("fulgor", { cobre: 1 })).toBeNull();
  });

  it("construir descuenta exactamente el coste", () => {
    const { traje, materiales } = build("taller", rico);
    expect(traje.generacion).toBe("taller");
    for (const [m, n] of Object.entries(buildCost("taller"))) {
      expect(materiales[m], m).toBe(rico[m] - n);
    }
  });

  it("reparar cuesta materiales Y un bloque: compite con los vínculos (§6.2)", () => {
    const roto = wear(createSuit("taller"), { duelos: 12, golpesRecibidos: 8 });
    const salida = repair(roto, "manto", rico);
    expect(salida.bloques).toBe(1);
    expect(salida.traje.piezas.manto.integridad).toBe(SUIT_GENERATIONS.taller.integridadMax);
  });

  it("reparar una pieza intacta no cuesta nada", () => {
    expect(Object.keys(repairCost(createSuit("taller"), "manto"))).toHaveLength(0);
  });

  it("reparar sin materiales devuelve null en vez de reparar a medias", () => {
    const roto = wear(createSuit("conductor"), { duelos: 20 });
    expect(repair(roto, "manto", { cobre: 0 })).toBeNull();
  });
});

describe("integridad: la conexión con el pilar 1 (§6.2)", () => {
  it("por debajo de 60 la pieza es reconocible", () => {
    expect(integrityBand({ integridad: 61 }).reconocible).toBe(false);
    expect(integrityBand({ integridad: 59 }).reconocible).toBe(true);
  });

  it("por debajo de 30 empieza a dejar fragmentos", () => {
    expect(integrityBand({ integridad: 31 }).fragmentoP).toBe(0);
    expect(integrityBand({ integridad: 29 }).fragmentoP).toBeGreaterThan(0);
  });

  it("a cero, la pieza no aporta nada hasta reconstruirla", () => {
    const traje = createSuit("conductor");
    traje.piezas.torso.integridad = 0;
    const sinTorso = suitStats(traje);
    const entero = suitStats(createSuit("conductor"));
    expect(sinTorso.cargaMax).toBeLessThan(entero.cargaMax);
    expect(integrityBand({ integridad: 0 }).statFactor).toBe(0);
  });

  it("un traje desgastado deja pistas Físicas con nombre y ubicación", () => {
    const next = createStream("fragmentos", "traje");
    // Ocho duelos con el traje improvisado dejan el manto por debajo de 30 pero por
    // encima de 0: destruido no deja fragmentos, porque ya no queda pieza que dejar.
    const traje = wear(createSuit("improvisado"), { duelos: 8 });
    let vistos = [];
    for (let i = 0; i < 30 && !vistos.length; i += 1) {
      vistos = fragmentRoll(next, traje, { nodoId: "n3", capitulo: 5 });
    }
    expect(vistos.length).toBeGreaterThan(0);
    for (const f of vistos) {
      expect(f.tipo).toBe("fisica");
      expect(f.nodoId).toBe("n3");
      expect(f.origen).toMatch(/^fragmento\./);
      expect(SUIT_SLOTS).toContain(f.slot);
    }
  });

  it("un traje intacto no deja nada, por muchas tiradas que hagas", () => {
    const next = createStream("intacto");
    const traje = createSuit("conductor");
    for (let i = 0; i < 50; i += 1) {
      expect(fragmentRoll(next, traje, { nodoId: "n0", capitulo: 3 })).toHaveLength(0);
    }
  });

  it("recognisablePieces nombra las piezas que un testigo podría describir", () => {
    const traje = wear(createSuit("taller"), { duelos: 10 });
    expect(isRecognisable(traje)).toBe(true);
    expect(recognisablePieces(traje).length).toBeGreaterThan(0);
    expect(isRecognisable(createSuit("conductor"))).toBe(false);
  });
});

describe("desgaste", () => {
  it("el manto se lleva la peor parte, como dice el §6.1", () => {
    const gastado = wear(createSuit("aislado"), { duelos: 6 });
    const perdidaManto = SUIT_GENERATIONS.aislado.integridadMax - gastado.piezas.manto.integridad;
    const perdidaMascara = SUIT_GENERATIONS.aislado.integridadMax - gastado.piezas.mascara.integridad;
    expect(perdidaManto).toBeGreaterThan(perdidaMascara);
  });

  it("la Guardia paga parte del desgaste", () => {
    const flojo = wear(createSuit("aislado"), { duelos: 6, guardia: 0 });
    const duro = wear(createSuit("aislado"), { duelos: 6, guardia: 60 });
    expect(duro.piezas.manto.integridad).toBeGreaterThan(flojo.piezas.manto.integridad);
  });

  it("un golpe guionizado puede centrarse en una pieza (la grúa del capítulo 5)", () => {
    const grua = wear(createSuit("taller"), { duelos: 8, foco: "manto" });
    expect(grua.piezas.manto.integridad).toBeLessThan(grua.piezas.botas.integridad);
  });

  it("la integridad nunca baja de cero", () => {
    const destrozado = wear(createSuit("improvisado"), { duelos: 200, golpesRecibidos: 200 });
    for (const slot of SUIT_SLOTS) {
      expect(destrozado.piezas[slot].integridad, slot).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("los compromisos de las seis ranuras (§6.1)", () => {
  it("la ocultación nunca pasa del techo del 0.85", () => {
    for (const gen of SUIT_GENERATION_ORDER) {
      expect(suitStats(createSuit(gen)).ocultacion, gen).toBeLessThanOrEqual(OCCULTATION_CAP);
    }
  });

  it("los buenos guantes queman más las manos: más potencia, más riesgo Íntimo", () => {
    expect(intimateRisk(createSuit("conductor"))).toBeGreaterThan(intimateRisk(createSuit("improvisado")));
  });

  it("unos guantes destruidos ya no queman a nadie", () => {
    const traje = createSuit("conductor");
    traje.piezas.guantes.integridad = 0;
    expect(intimateRisk(traje)).toBe(0);
  });

  it("describeSlot dice qué da y qué quita cada ranura", () => {
    for (const slot of SUIT_SLOTS) {
      const d = describeSlot(createSuit("taller"), slot);
      expect(d.da, slot).toBeTruthy();
      expect(d.banda, slot).toBeTruthy();
    }
    expect(describeSlot(createSuit("taller"), "mascara").quita).toBe("control");
    expect(describeSlot(createSuit("taller"), "torso").quita).toBe("ocultacion");
    expect(describeSlot(createSuit("taller"), "cinturon").quita).toBe("velocidad");
  });
});
