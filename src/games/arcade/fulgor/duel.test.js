/**
 * §14.3's three demands of the duel, plus the ones the design makes elsewhere and would
 * notice only as a feeling of wrongness eight hours in.
 *
 *  - the affinity cycle is closed and symmetric
 *  - 5% and 95% are respected
 *  - no technique dominates every situation
 *
 * The third is the one worth writing carefully, because "no dominant option" is usually
 * asserted in a design document and never checked. Here it is checked as arithmetic,
 * using the same `utility` the design defines good play with.
 */

import { describe, expect, it } from "vitest";
import { createStream } from "./rng.js";
import {
  AFFINITIES,
  AFFINITY_BEATS,
  AFFINITY_BONUS,
  DUEL,
  TECHNIQUES,
  TECH_FAMILIES,
  resolveDifficulty,
} from "./tables.js";
import {
  actionMenu,
  affinityBonus,
  composureTier,
  describeAction,
  drawFromSource,
  maxCarga,
  maxCompostura,
  resolveAction,
  rivalIntent,
  successChance,
  tick,
  utility,
  visibilityOf,
} from "./duel.js";

const medio = resolveDifficulty("medio");

const heroe = (over = {}) => ({
  id: "dani",
  stats: { potencia: 20, cuerpo: 18, control: 16, guardia: 17, velocidad: 19, aguante: 20, temple: 18 },
  carga: 100,
  compostura: 100,
  afinidad: "rayo",
  equipadas: ["chispazo", "arcoVoltaico", "pararrayos", "pulso", "destello", "yunque"],
  ...over,
});

const rival = (over = {}) => ({
  id: "cabo",
  stats: { potencia: 16, cuerpo: 16, control: 12, guardia: 14, velocidad: 14, aguante: 14, temple: 14 },
  carga: 40,
  compostura: 100,
  afinidad: "materia",
  tecnicas: ["yunque", "sobrecarga"],
  ...over,
});

describe("el ciclo de afinidades es cerrado y simétrico (§5.3)", () => {
  it("cada afinidad vence exactamente a una y es vencida por exactamente una", () => {
    for (const a of AFFINITIES) {
      expect(AFFINITY_BEATS[a], a).toBeTruthy();
      const vencidaPor = AFFINITIES.filter((b) => AFFINITY_BEATS[b] === a);
      expect(vencidaPor, `${a} debería ser vencida por una sola`).toHaveLength(1);
    }
  });

  it("recorre las cuatro y vuelve al principio", () => {
    let actual = "rayo";
    const vistas = new Set([actual]);
    for (let i = 0; i < 3; i += 1) {
      actual = AFFINITY_BEATS[actual];
      vistas.add(actual);
    }
    expect(vistas.size).toBe(4);
    expect(AFFINITY_BEATS[actual]).toBe("rayo");
  });

  it("el bono es simétrico: lo que uno gana, el otro lo pierde", () => {
    for (const a of AFFINITIES) {
      for (const b of AFFINITIES) {
        // Suma en vez de negación: Object.is distingue -0 de 0 y aquí eso no es una diferencia.
        expect(affinityBonus(a, b) + affinityBonus(b, a)).toBe(0);
      }
    }
  });

  it("Materia vence a Rayo — la lección del capítulo 3", () => {
    expect(affinityBonus("materia", "rayo")).toBe(AFFINITY_BONUS);
    expect(affinityBonus("rayo", "materia")).toBe(-AFFINITY_BONUS);
  });

  it("misma afinidad, ni bono ni castigo", () => {
    for (const a of AFFINITIES) expect(affinityBonus(a, a)).toBe(0);
  });
});

describe("los límites del §5.4: nada es seguro y nada es imposible", () => {
  it("un desequilibrio absurdo a favor no pasa del techo", () => {
    const dios = heroe({ stats: { potencia: 99, cuerpo: 99, control: 99, guardia: 99, velocidad: 99, aguante: 99, temple: 99 } });
    const pobre = rival({ stats: { potencia: 1, cuerpo: 1, control: 1, guardia: 1, velocidad: 1, aguante: 1, temple: 1 }, afinidad: "luz" });
    const accion = describeAction("punoTormenta");
    const { p } = successChance({ accion, atacante: dios, defensor: pobre, nodo: { ventaja: "altura" }, dif: medio });
    expect(p).toBe(DUEL.techoExito);
  });

  it("un desequilibrio absurdo en contra no baja del suelo, en ningún modo", () => {
    const pobre = heroe({
      stats: { potencia: 1, cuerpo: 1, control: 1, guardia: 1, velocidad: 1, aguante: 1, temple: 1 },
      compostura: 5,
      afinidad: "rayo",
    });
    const dios = rival({ stats: { potencia: 99, cuerpo: 99, control: 99, guardia: 99, velocidad: 99, aguante: 99, temple: 99 }, afinidad: "materia" });
    for (const modo of ["facil", "medio", "dificil"]) {
      const dif = resolveDifficulty(modo);
      const { p } = successChance({
        accion: describeAction("chispazo"), atacante: pobre, defensor: dios,
        nodo: { ventaja: "descubierto" }, dif,
      });
      expect(p, modo).toBe(DUEL.sueloExito);
    }
  });

  it("Sin máscara baja el techo a 0.90 y deja el suelo intacto (§10.4)", () => {
    const dif = resolveDifficulty("dificil");
    expect(dif.techoExito).toBe(0.9);
    const dios = heroe({ stats: { potencia: 99, cuerpo: 99, control: 99, guardia: 99, velocidad: 99, aguante: 99, temple: 99 } });
    const { p } = successChance({ accion: describeAction("punoTormenta"), atacante: dios, defensor: rival({ afinidad: "luz" }), dif });
    expect(p).toBe(0.9);
    expect(DUEL.sueloExito).toBe(0.05);
  });

  it("toda combinación jugable cae dentro de [0.05, techo]", () => {
    for (const modo of ["facil", "medio", "dificil"]) {
      const dif = resolveDifficulty(modo);
      for (const id of Object.keys(TECHNIQUES)) {
        for (const af of AFFINITIES) {
          for (const compostura of [100, 60, 30, 5]) {
            const { p } = successChance({
              accion: describeAction(id),
              atacante: heroe({ compostura }),
              defensor: rival({ afinidad: af }),
              dif,
            });
            expect(p, `${modo}/${id}/${af}/${compostura}`).toBeGreaterThanOrEqual(0.05);
            expect(p, `${modo}/${id}/${af}/${compostura}`).toBeLessThanOrEqual(dif.techoExito);
          }
        }
      }
    }
  });
});

describe("ninguna técnica domina en todas las situaciones (§14.3)", () => {
  /**
   * The situation space the design actually varies over: who you are up against, how much
   * this moment cares about being seen, and how much battery is left. If one technique
   * came out on top everywhere in that space, the six equipped slots would be a false
   * choice and the whole workshop screen would be decoration.
   */
  const situaciones = [];
  for (const af of AFFINITIES) {
    for (const pesoSigilo of [0, 0.35, 0.9]) {
      for (const carga of [18, 45, 100]) {
        situaciones.push({
          atacante: heroe({ carga }),
          defensor: rival({ afinidad: af }),
          nodo: { ventaja: "ninguna" },
          dif: medio,
          pesoSigilo,
        });
      }
    }
  }

  const ids = Object.keys(TECHNIQUES);

  it("hay más de un ganador a lo largo del espacio de situaciones", () => {
    const ganadores = new Set();
    for (const ctx of situaciones) {
      let mejor = null;
      let mejorU = -Infinity;
      for (const id of ids) {
        const u = utility(describeAction(id), ctx);
        if (u > mejorU) { mejorU = u; mejor = id; }
      }
      if (mejor) ganadores.add(mejor);
    }
    expect(ganadores.size).toBeGreaterThan(1);
  });

  it("ninguna técnica es la mejor en todas las situaciones", () => {
    for (const id of ids) {
      const siempreMejor = situaciones.every((ctx) => {
        const mia = utility(describeAction(id), ctx);
        return ids.every((otra) => otra === id || utility(describeAction(otra), ctx) <= mia);
      });
      expect(siempreMejor, `${id} domina el espacio entero`).toBe(false);
    }
  });

  it("cuando el sigilo pesa, la mejor jugada nunca es de visibilidad 3", () => {
    const sigiloso = { atacante: heroe(), defensor: rival(), nodo: { ventaja: "sombra" }, dif: medio, pesoSigilo: 1.2 };
    let mejor = null;
    let mejorU = -Infinity;
    for (const id of ids) {
      const u = utility(describeAction(id), sigiloso);
      if (u > mejorU) { mejorU = u; mejor = id; }
    }
    expect(TECHNIQUES[mejor].vis).toBeLessThan(3);
  });
});

describe("Compostura: castigos escalonados, no una barra de vida (§5.2)", () => {
  it("los cinco escalones salen en orden al bajar", () => {
    const vistos = [100, 60, 30, 8, 0].map((c) => composureTier(c, medio).id);
    expect(vistos).toEqual(["normal", "tocado", "roto", "agotado", "caido"]);
  });

  it("el tercer escalón bloquea Luz y Sentido: requieren concentración", () => {
    const tier = composureTier(25, medio);
    expect(tier.bloquea).toContain("luz");
    expect(tier.bloquea).toContain("sentido");
    expect(tier.bloquea).not.toContain("impacto");
  });

  it("cansarse SUBE la visibilidad de lo que haces — la unión de los pilares 1 y 3", () => {
    const fresco = heroe({ compostura: 100 });
    const roto = heroe({ compostura: 25 });
    // Chispazo, que sale de 1: Arco Voltaico ya está en 3 y no tiene sitio para subir.
    const accion = describeAction("chispazo");
    expect(visibilityOf(accion, roto, medio)).toBe(2);
    expect(visibilityOf(accion, roto, medio)).toBeGreaterThan(visibilityOf(accion, fresco, medio));
  });

  it("pero una acción de visibilidad 0 sigue siendo invisible por agotado que estés", () => {
    expect(visibilityOf(describeAction("silencio"), heroe({ compostura: 3 }), medio)).toBe(0);
  });

  it("la visibilidad nunca pasa de 3", () => {
    expect(visibilityOf(describeAction("fulgor"), heroe({ compostura: 3 }), medio)).toBe(3);
  });

  it("los escalones se mueven con la dificultad y conservan el orden", () => {
    const facil = resolveDifficulty("facil");
    const dificil = resolveDifficulty("dificil");
    // A 62 de Compostura: en fácil aún estás entero, en difícil ya estás tocado.
    expect(composureTier(62, facil).id).toBe("normal");
    expect(composureTier(62, dificil).id).toBe("tocado");
  });
});

describe("el menú de acciones (§5.5)", () => {
  it("ofrece las básicas siempre, incluso con la Carga a cero", () => {
    const menu = actionMenu(heroe({ carga: 0 }), { dif: medio });
    const basicas = menu.filter((a) => a.fuente === "basica");
    expect(basicas).toHaveLength(4);
    expect(basicas.every((a) => a.disponible)).toBe(true);
  });

  it("marca por qué una técnica no se puede usar, en vez de esconderla", () => {
    const menu = actionMenu(heroe({ carga: 5 }), { dif: medio });
    const arco = menu.find((a) => a.id === "arcoVoltaico");
    expect(arco.disponible).toBe(false);
    expect(arco.motivo).toBe("carga");
  });

  it("con la Compostura rota, Luz y Sentido salen bloqueadas por Compostura", () => {
    const menu = actionMenu(heroe({ compostura: 20 }), { dif: medio });
    expect(menu.find((a) => a.id === "destello").motivo).toBe("compostura");
    expect(menu.find((a) => a.id === "pulso").motivo).toBe("compostura");
    expect(menu.find((a) => a.id === "chispazo").disponible).toBe(true);
  });

  it("toda entrada trae su visibilidad antes de elegir", () => {
    for (const a of actionMenu(heroe(), { dif: medio })) {
      expect(a.visibilidadReal, a.id).toBeGreaterThanOrEqual(0);
      expect(a.visibilidadReal, a.id).toBeLessThanOrEqual(3);
    }
  });

  it("Contener siempre está y nunca cuesta visibilidad", () => {
    const contener = actionMenu(heroe({ carga: 0, compostura: 4 }), { dif: medio }).find((a) => a.id === "contener");
    expect(contener.disponible).toBe(true);
    expect(contener.visibilidadReal).toBe(0);
  });

  it("el entorno del nodo aparece como opción de baja visibilidad", () => {
    const nodo = { ventaja: "ninguna", entorno: [{ id: "cortarLuz", stat: "control", poder: 18, vis: 0 }] };
    const opcion = actionMenu(heroe(), { nodo, dif: medio }).find((a) => a.id === "cortarLuz");
    expect(opcion.fuente).toBe("entorno");
    expect(opcion.carga).toBe(0);
    expect(opcion.visibilidadReal).toBe(0);
  });
});

describe("la familia Sentido no puede delatarte (§5.6)", () => {
  it("las nueve tienen visibilidad cero", () => {
    for (const [id, t] of Object.entries(TECHNIQUES)) {
      if (t.familia === "sentido") expect(t.vis, id).toBe(0);
    }
  });

  it("y no se resuelven contra el rival: compran información, no ganan nada", () => {
    const accion = describeAction("lectura");
    expect(accion.opposed).toBe(false);
    const contraDios = successChance({
      accion, atacante: heroe(),
      defensor: rival({ stats: { potencia: 99, cuerpo: 99, control: 99, guardia: 99, velocidad: 99, aguante: 99, temple: 99 } }),
      dif: medio,
    });
    const contraNadie = successChance({ accion, atacante: heroe(), defensor: null, dif: medio });
    expect(contraDios.p).toBe(contraNadie.p);
  });
});

describe("resolución de una acción", () => {
  it("es determinista bajo semilla", () => {
    const run = () => {
      const next = createStream("duelo", "fijo");
      return resolveAction(next, { accion: describeAction("chispazo"), atacante: heroe(), defensor: rival(), dif: medio }).reporte;
    };
    expect(run()).toEqual(run());
  });

  it("gasta la Carga de la técnica y nunca baja de cero", () => {
    const next = () => 0.01;
    const { heroe: after } = resolveAction(next, {
      accion: describeAction("arcoVoltaico"), atacante: heroe({ carga: 10 }), defensor: rival(), dif: medio,
    });
    expect(after.carga).toBe(0);
  });

  it("fallar también se ve: la visibilidad no depende del éxito", () => {
    const acierta = resolveAction(() => 0.01, { accion: describeAction("arcoVoltaico"), atacante: heroe(), defensor: rival(), dif: medio });
    const falla = resolveAction(() => 0.999, { accion: describeAction("arcoVoltaico"), atacante: heroe(), defensor: rival(), dif: medio });
    expect(falla.reporte.exito).toBe(false);
    expect(falla.reporte.visibilidad).toBe(acierta.reporte.visibilidad);
  });

  it("Contener cierra el duelo sin ganarlo, sin daño y sin exposición", () => {
    const { reporte } = resolveAction(() => 0.01, {
      accion: describeAction("contener"), atacante: heroe(), defensor: rival(), dif: medio,
    });
    expect(reporte.resuelto).toBe("contenido");
    expect(reporte.visibilidad).toBe(0);
  });

  it("una técnica que resuelve el duelo lo resuelve al acertar", () => {
    const { reporte } = resolveAction(() => 0.01, {
      accion: describeAction("punoTormenta"), atacante: heroe(), defensor: rival(), dif: medio,
    });
    expect(reporte.resuelto).toBe("ganado");
  });

  it("el daño se paga en Compostura del rival, nunca en vida: este juego no mata (§17)", () => {
    const { rival: after } = resolveAction(() => 0.01, {
      accion: describeAction("punoTormenta"), atacante: heroe(), defensor: rival(), dif: medio,
    });
    expect(after.compostura).toBeLessThan(100);
    expect(after.compostura).toBeGreaterThanOrEqual(0);
    expect(after).not.toHaveProperty("vida");
  });
});

describe("los dos recursos", () => {
  it("Aguante compra batería y Temple compra nervio", () => {
    const flojo = { aguante: 5, temple: 5 };
    const fuerte = { aguante: 40, temple: 40 };
    expect(maxCarga(fuerte)).toBeGreaterThan(maxCarga(flojo));
    expect(maxCompostura(fuerte)).toBeGreaterThan(maxCompostura(flojo));
  });

  it("la regeneración por turno es la que dice cada modo, y nunca pasa del techo", () => {
    const h = heroe({ carga: 0 });
    const techo = maxCarga(h.stats);
    for (const modo of ["facil", "medio", "dificil"]) {
      const dif = resolveDifficulty(modo);
      expect(tick(h, { dif }).carga, modo).toBe(dif.cargaRegen);
    }
    expect(tick({ ...h, carga: techo }, { dif: medio }).carga).toBe(techo);
  });

  it("tocar una fuente eléctrica rellena del todo", () => {
    const h = heroe({ carga: 3 });
    expect(drawFromSource(h).carga).toBe(maxCarga(h.stats));
  });
});

describe("el rival tiene un bucle legible, que es lo que Lectura promete enseñar", () => {
  it("dos consultas idénticas devuelven la misma intención", () => {
    const r = rival();
    const h = heroe();
    expect(rivalIntent(r, h, { dif: medio }).id).toBe(rivalIntent(r, h, { dif: medio }).id);
  });

  it("sin Carga para nada, recurre a un puñetazo", () => {
    expect(rivalIntent(rival({ carga: 0 }), heroe(), { dif: medio }).id).toBe("golpear");
  });

  it("con la Compostura por los suelos, se defiende", () => {
    const acorralado = rival({ compostura: 10, tecnicas: ["yunque", "malla"], carga: 60 });
    expect(rivalIntent(acorralado, heroe(), { dif: medio }).familia).toBe("escudo");
  });
});

describe("integridad del catálogo (§5.7)", () => {
  it("las cuarenta tienen familia, afinidad y visibilidad válidas", () => {
    for (const [id, t] of Object.entries(TECHNIQUES)) {
      expect(TECH_FAMILIES, id).toContain(t.familia);
      expect(AFFINITIES, id).toContain(t.afinidad);
      expect(t.vis, id).toBeGreaterThanOrEqual(0);
      expect(t.vis, id).toBeLessThanOrEqual(3);
      expect(t.carga, id).toBeGreaterThan(0);
    }
  });

  it("las cinco familias están pobladas", () => {
    for (const f of TECH_FAMILIES) {
      expect(Object.values(TECHNIQUES).filter((t) => t.familia === f).length, f).toBeGreaterThanOrEqual(5);
    }
  });

  it("lo que resuelve un duelo de un golpe es lo que más te expone (pilar 3)", () => {
    const contundentes = Object.values(TECHNIQUES).filter((t) => t.poder >= 45);
    const sutiles = Object.values(TECHNIQUES).filter((t) => t.poder > 0 && t.poder <= 20);
    const media = (xs) => xs.reduce((a, t) => a + t.vis, 0) / xs.length;
    expect(media(contundentes)).toBeGreaterThan(media(sutiles));
  });
});

describe("un duelo dura un duelo (§5.7)", () => {
  /**
   * Regresión con nombre. `FAMILY_RULES.impacto.resolves` significaba "esta familia gana por
   * la fuerza" y `describeAction` lo leía como "acierta y se acabó", así que CUALQUIER
   * técnica de Impacto terminaba el duelo de un golpe. Consecuencias: Chispazo valía lo
   * mismo que Puño de Tormenta, la promesa del §5.7 no significaba nada, y en el Monte Carlo
   * los duelos duraban una sola acción — con lo que el jugador nunca gastaba Carga, nunca
   * bajaba de Compostura y nunca se exponía lo suficiente para que le abrieran un expediente.
   */
  it("sólo las que lo declaran resuelven de un golpe", () => {
    const finiquitan = Object.keys(TECHNIQUES).filter((id) => describeAction(id).resolves);
    for (const id of finiquitan) {
      expect(["resuelveDuelo", "resuelveNodo"], id).toContain(TECHNIQUES[id].efecto);
    }
    expect(finiquitan).toContain("punoTormenta");
    expect(finiquitan).toContain("fulgor");
    expect(finiquitan).not.toContain("chispazo");
    expect(finiquitan).not.toContain("arcoVoltaico");
  });

  it("un golpe normal no acaba el duelo: lo acaba quedarse sin Compostura", () => {
    const salida = resolveAction(() => 0.01, {
      accion: describeAction("chispazo"), atacante: heroe(), defensor: rival(), dif: medio,
    });
    expect(salida.reporte.exito).toBe(true);
    expect(salida.reporte.resuelto).toBeNull();
    expect(salida.rival.compostura).toBeLessThan(100);
  });

  it("hacen falta varios aciertos seguidos para tumbar a alguien", () => {
    let atacante = heroe();
    let defensor = rival();
    let golpes = 0;
    while (defensor.compostura > 0 && golpes < 40) {
      const salida = resolveAction(() => 0.01, {
        accion: describeAction("chispazo"), atacante, defensor, dif: medio,
      });
      atacante = { ...salida.heroe, carga: 100 };
      defensor = salida.rival;
      golpes += 1;
      if (salida.reporte.resuelto) break;
    }
    expect(golpes).toBeGreaterThan(3);
  });

  it("y una técnica que sí resuelve lo hace en uno", () => {
    const salida = resolveAction(() => 0.01, {
      accion: describeAction("punoTormenta"), atacante: heroe(), defensor: rival(), dif: medio,
    });
    expect(salida.reporte.resuelto).toBe("ganado");
  });

  it("el entorno hace daño pero tampoco termina por decreto", () => {
    const nodo = { ventaja: "altura", entorno: [{ id: "tirarAndamio", stat: "cuerpo", poder: 22, vis: 1 }] };
    expect(describeAction("tirarAndamio", { nodo }).resolves).toBe(false);
    expect(describeAction("tirarAndamio", { nodo }).ofensiva).toBe(true);
  });
});
