/**
 * §14.3's demands of the Intervention, and the one that matters most is the third.
 *
 *  - the clock always moves forward
 *  - every scenario is connected: no unreachable node
 *  - every objective is reachable inside the clock, from any valid route
 *
 * The third is checked across a few hundred generated scenarios rather than one, because
 * a generator that is right nine times out of ten ships a campaign where roughly one
 * intervention in ten cannot be won — and the player will read that as his own fault.
 */

import { describe, expect, it } from "vitest";
import { createStream } from "./rng.js";
import { ROUTE_COST, SCENARIO_SIZE, resolveDifficulty } from "./tables.js";
import {
  ARCHETYPES,
  DISTRICT_ARCHETYPES,
  adjacency,
  advance,
  cheapestRoute,
  completeObjective,
  createScenario,
  exposureAt,
  hopDistances,
  isConnected,
  minimumTurns,
  moveTo,
  nextEscalation,
  routeVisibility,
  settle,
  teleport,
  timeUp,
} from "./intervention.js";

const medio = resolveDifficulty("medio");
const DISTRITOS = Object.keys(DISTRICT_ARCHETYPES);

/** A broad sweep of the generator: every district, every kind, many seeds. */
function* everyScenario({ semillas = 12 } = {}) {
  for (const distrito of DISTRITOS) {
    for (const tipo of ["escaramuza", "estandar", "decisiva"]) {
      for (let s = 0; s < semillas; s += 1) {
        const next = createStream("gen", distrito, tipo, String(s));
        yield {
          etiqueta: `${distrito}/${tipo}/${s}`,
          scenario: createScenario(next, { tipo, distrito, capitulo: 5, dif: medio }),
        };
      }
    }
  }
}

describe("todo escenario es conexo (§14.3)", () => {
  it("ningún nodo queda aislado, en ningún distrito ni arquetipo", () => {
    for (const { etiqueta, scenario } of everyScenario()) {
      expect(isConnected(scenario), etiqueta).toBe(true);
    }
  });

  it("y se llega a cada nodo desde la entrada", () => {
    for (const { etiqueta, scenario } of everyScenario({ semillas: 6 })) {
      const dist = hopDistances(scenario, scenario.entrada);
      for (const n of scenario.nodos) {
        expect(dist[n.id], `${etiqueta}/${n.id}`).toBeDefined();
      }
    }
  });

  it("cada arquetipo produce el tamaño que su tipo declara", () => {
    for (const { etiqueta, scenario } of everyScenario({ semillas: 4 })) {
      const [min, max] = SCENARIO_SIZE[scenario.tipo].nodos;
      expect(scenario.nodos.length, etiqueta).toBeGreaterThanOrEqual(min);
      expect(scenario.nodos.length, etiqueta).toBeLessThanOrEqual(max);
    }
  });

  it("todo arquetipo declarado por un distrito existe", () => {
    for (const [distrito, lista] of Object.entries(DISTRICT_ARCHETYPES)) {
      for (const a of lista) expect(ARCHETYPES[a], `${distrito}:${a}`).toBeTruthy();
    }
  });
});

describe("todo objetivo es alcanzable dentro del reloj (§14.3)", () => {
  it("el objetivo principal cabe en el reloj incluso con Velocidad cero", () => {
    for (const { etiqueta, scenario } of everyScenario()) {
      const principal = scenario.objetivos.find((o) => o.principal);
      const ruta = cheapestRoute(scenario, scenario.entrada, principal.nodo, { velocidad: 0 });
      expect(ruta, `${etiqueta}: sin ruta al principal`).not.toBeNull();
      expect(ruta.turnos, `${etiqueta}: ${ruta.turnos} turnos con reloj de ${scenario.reloj.max}`)
        .toBeLessThan(scenario.reloj.max);
    }
  });

  it("todos los objetivos, no sólo el principal, tienen ruta", () => {
    for (const { etiqueta, scenario } of everyScenario({ semillas: 6 })) {
      for (const obj of scenario.objetivos) {
        expect(cheapestRoute(scenario, scenario.entrada, obj.nodo, { velocidad: 0 }), `${etiqueta}/${obj.id}`)
          .not.toBeNull();
      }
    }
  });

  it("el reloj nunca se fija por debajo del paseo mínimo", () => {
    for (const { etiqueta, scenario } of everyScenario({ semillas: 6 })) {
      expect(scenario.reloj.max, etiqueta).toBeGreaterThan(minimumTurns(scenario));
    }
  });

  it("sigue siendo alcanzable en Sin máscara, que recorta un turno (§10.4)", () => {
    const dificil = resolveDifficulty("dificil");
    for (const distrito of DISTRITOS) {
      for (let s = 0; s < 8; s += 1) {
        const next = createStream("dif", distrito, String(s));
        const scenario = createScenario(next, { tipo: "decisiva", distrito, capitulo: 11, dif: dificil });
        const principal = scenario.objetivos.find((o) => o.principal);
        const ruta = cheapestRoute(scenario, scenario.entrada, principal.nodo, { velocidad: 0 });
        expect(ruta.turnos, `${distrito}/${s}`).toBeLessThan(scenario.reloj.max);
      }
    }
  });
});

describe("las rutas: el compromiso del §4.2", () => {
  const scenario = () => createScenario(createStream("rutas", "fijo"), { tipo: "decisiva", distrito: "puerto", capitulo: 6, dif: medio });

  it("la calle es rápida y expuesta; la sombra es lenta y limpia", () => {
    expect(ROUTE_COST.visible.turnos).toBeLessThan(ROUTE_COST.sombra.turnos);
    expect(ROUTE_COST.visible.visibilidad).toBeGreaterThan(ROUTE_COST.sombra.visibilidad);
  });

  it("mucha Velocidad borra el sobrecoste de ir por las sombras", () => {
    const s = scenario();
    const objetivo = s.objetivos.find((o) => o.principal).nodo;
    const lento = cheapestRoute(s, s.entrada, objetivo, { velocidad: 0 });
    const rapido = cheapestRoute(s, s.entrada, objetivo, { velocidad: 40 });
    expect(rapido.turnos).toBeLessThanOrEqual(lento.turnos);
  });

  it("la visibilidad de una ruta es la de su tramo peor: una calle deshace cuatro azoteas", () => {
    const s = scenario();
    const mixta = s.aristas.find((e) => e.via === "visible");
    if (!mixta) return;
    expect(routeVisibility(s, [mixta.a, mixta.b])).toBe(ROUTE_COST.visible.visibilidad);
  });

  it("pedir sólo sombra puede no tener ruta, y eso se dice devolviendo null", () => {
    const s = scenario();
    const objetivo = s.objetivos.find((o) => o.principal).nodo;
    const soloSombra = cheapestRoute(s, s.entrada, objetivo, { velocidad: 0, via: "sombra" });
    expect(soloSombra === null || soloSombra.turnos > 0).toBe(true);
  });

  it("moverse gasta reloj; teletransportarse no", () => {
    const s = scenario();
    const destino = s.nodos[s.nodos.length - 1].id;
    const movido = moveTo(s, destino, { velocidad: 10, dif: medio });
    expect(movido.scenario.reloj.turno).toBeGreaterThan(0);
    expect(teleport(s, destino).reloj.turno).toBe(0);
    expect(teleport(s, destino).posicion).toBe(destino);
  });

  it("moverse al nodo en el que ya estás no es un movimiento", () => {
    const s = scenario();
    expect(moveTo(s, s.posicion, { dif: medio })).toBeNull();
  });
});

describe("el reloj es un medidor de agravamiento, no un cronómetro (§4.1)", () => {
  it("siempre avanza, nunca retrocede", () => {
    let s = createScenario(createStream("reloj"), { tipo: "decisiva", distrito: "concha", capitulo: 7, dif: medio });
    let previo = s.reloj.turno;
    for (let i = 0; i < 20; i += 1) {
      s = advance(s, 1);
      expect(s.reloj.turno).toBeGreaterThan(previo);
      previo = s.reloj.turno;
    }
  });

  it("avanzar cero turnos sigue avanzando uno: no hay acción gratis por descuido", () => {
    const s = createScenario(createStream("reloj2"), { tipo: "estandar", distrito: "aguas", capitulo: 3, dif: medio });
    expect(advance(s, 0).reloj.turno).toBe(1);
  });

  it("el jugador siempre puede leer qué va a empeorar en el siguiente paso", () => {
    for (const { etiqueta, scenario } of everyScenario({ semillas: 4 })) {
      if (scenario.reloj.agravamientos.length === 0) continue;
      expect(nextEscalation(scenario), etiqueta).not.toBeNull();
      expect(nextEscalation(scenario).turno, etiqueta).toBeGreaterThan(scenario.reloj.turno);
    }
  });

  it("los agravamientos quedan anotados al pasarles por encima", () => {
    let s = createScenario(createStream("agrav"), { tipo: "decisiva", distrito: "poligono", capitulo: 8, dif: medio });
    const primero = nextEscalation(s);
    s = advance(s, primero.turno);
    expect(s.log.some((l) => l.agravamiento === primero.id)).toBe(true);
    expect(nextEscalation(s)?.turno ?? Infinity).toBeGreaterThan(primero.turno);
  });

  it("timeUp sólo es cierto al agotar el reloj", () => {
    let s = createScenario(createStream("fin"), { tipo: "escaramuza", distrito: "puerto", capitulo: 3, dif: medio });
    expect(timeUp(s)).toBe(false);
    s = advance(s, s.reloj.max);
    expect(timeUp(s)).toBe(true);
  });
});

describe("los testigos están a la vista antes de empezar (§4.1)", () => {
  it("todos vienen con nodo asignado y ninguno es secreto", () => {
    const next = createStream("testigos");
    const s = createScenario(next, {
      tipo: "decisiva", distrito: "concha", capitulo: 7, dif: medio,
      testigos: [{ id: "sabater" }, { id: "marga" }, { id: "pilar" }],
    });
    expect(s.testigos).toHaveLength(3);
    for (const t of s.testigos) {
      expect(t.nodo).toBeTruthy();
      expect(s.nodos.some((n) => n.id === t.nodo)).toBe(true);
      expect(t).not.toHaveProperty("oculto");
    }
  });

  it("la proximidad cae con la distancia, y el nodo del testigo es el máximo", () => {
    const next = createStream("prox");
    const s = createScenario(next, {
      tipo: "decisiva", distrito: "faro", capitulo: 6, dif: medio,
      testigos: [{ id: "sabater", nodo: "n0" }],
    });
    const cerca = exposureAt(s, "n0", 3).proximidades.sabater;
    const lejos = exposureAt(s, s.nodos[s.nodos.length - 1].id, 3).proximidades.sabater;
    expect(cerca).toBeGreaterThanOrEqual(lejos);
  });

  it("el distrito viaja con la exposición: la misma técnica no expone igual en dos sitios", () => {
    const enConcha = createScenario(createStream("c"), { tipo: "estandar", distrito: "concha", capitulo: 5, dif: medio });
    const enPuerto = createScenario(createStream("c"), { tipo: "estandar", distrito: "puerto", capitulo: 5, dif: medio });
    expect(exposureAt(enConcha, enConcha.entrada, 2).distrito).toBe("concha");
    expect(exposureAt(enPuerto, enPuerto.entrada, 2).distrito).toBe("puerto");
  });
});

describe("el balance final (§4.5)", () => {
  const base = () => {
    const s = createScenario(createStream("balance"), { tipo: "decisiva", distrito: "concha", capitulo: 7, dif: medio });
    return s;
  };

  it("objetivo cumplido y cero pistas es Impecable", () => {
    const s = completeObjective(base(), "principal");
    expect(settle(s, { pistasGeneradas: 0, dif: medio }).grado).toBe("impecable");
  });

  it("una pista lo baja a Limpio y dos a Sucio", () => {
    const s = completeObjective(base(), "principal");
    expect(settle(s, { pistasGeneradas: 1, dif: medio }).grado).toBe("limpio");
    expect(settle(s, { pistasGeneradas: 2, dif: medio }).grado).toBe("sucio");
  });

  it("Sucio sube el interés de todo testigo presente", () => {
    const next = createStream("sucio");
    let s = createScenario(next, {
      tipo: "decisiva", distrito: "concha", capitulo: 7, dif: medio,
      testigos: [{ id: "sabater" }, { id: "marga" }],
    });
    s = completeObjective(s, "principal");
    const r = settle(s, { pistasGeneradas: 4, dif: medio });
    expect(r.interesTestigos).toBeGreaterThan(0);
    expect(r.testigosPresentes).toEqual(["sabater", "marga"]);
  });

  it("fallar el principal con opcionales hechos es Parcial", () => {
    let s = base();
    const opcional = s.objetivos.find((o) => !o.principal);
    if (!opcional) return;
    s = completeObjective(s, opcional.id);
    expect(settle(s, { pistasGeneradas: 0, dif: medio }).grado).toBe("parcial");
  });

  it("no cumplir nada es Fallido, y Fallido baja el rango", () => {
    const r = settle(base(), { pistasGeneradas: 0, dif: medio });
    expect(r.grado).toBe("fallido");
    expect(r.rango).toBe(-1);
  });

  it("caer es Fallido pase lo que pase con los objetivos", () => {
    const s = completeObjective(base(), "principal");
    expect(settle(s, { pistasGeneradas: 0, caido: true, dif: medio }).grado).toBe("fallido");
  });

  it("Leyenda urbana convierte todo Fallido en Parcial (§10.2)", () => {
    const facil = resolveDifficulty("facil");
    expect(settle(base(), { pistasGeneradas: 0, dif: facil }).grado).toBe("parcial");
    expect(settle(base(), { pistasGeneradas: 0, caido: true, dif: facil }).grado).toBe("parcial");
  });

  it("no ofrece reintentar: el módulo no expone tal cosa (§4.5)", async () => {
    const mod = await import("./intervention.js");
    for (const clave of Object.keys(mod)) {
      expect(clave.toLowerCase()).not.toMatch(/retry|reintent|restart/);
    }
  });
});

describe("el escenario cuelga de sus datos, no de casos particulares", () => {
  it("cada nodo lleva su ventaja, su entorno y su visibilidad", () => {
    for (const { etiqueta, scenario } of everyScenario({ semillas: 3 })) {
      for (const n of scenario.nodos) {
        expect(n.ventaja, `${etiqueta}/${n.id}`).toBeTruthy();
        expect(Array.isArray(n.entorno), `${etiqueta}/${n.id}`).toBe(true);
        expect(n.visibilidad, `${etiqueta}/${n.id}`).toBeGreaterThan(0);
      }
    }
  });

  it("la adyacencia es simétrica", () => {
    for (const { etiqueta, scenario } of everyScenario({ semillas: 3 })) {
      const vecinos = adjacency(scenario);
      for (const [a, lista] of Object.entries(vecinos)) {
        for (const b of lista) expect(vecinos[b], `${etiqueta}/${a}-${b}`).toContain(a);
      }
    }
  });

  it("es determinista bajo semilla", () => {
    const build = () => createScenario(createStream("misma", "semilla"), { tipo: "decisiva", distrito: "tolvas", capitulo: 11, dif: medio });
    expect(JSON.stringify(build())).toBe(JSON.stringify(build()));
  });
});
