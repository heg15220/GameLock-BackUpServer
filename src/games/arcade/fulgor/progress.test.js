/**
 * Progresión: nivel, entrenamiento, afinidades, libro de técnicas y Rango.
 *
 * The load-bearing check here is the affinity spine (§5.3): if a technique could be
 * learned before its affinity, the chapter-6 scene where La Vigía teaches Luz would be
 * handing over something the player already had, and the backbone of the progression would
 * quietly stop being a backbone.
 */

import { describe, expect, it } from "vitest";
import {
  AFFINITIES,
  AFFINITY_UNLOCK_CHAPTER,
  POINTS_PER_LEVEL,
  RANK_MAX,
  RANK_MIN,
  STARTING_TECHNIQUES,
  STATS,
  STAT_MAX,
  TECHNIQUES,
  TECHNIQUE_SLOTS,
  TOTAL_CHAPTERS,
} from "./tables.js";
import {
  adjustRank,
  affinitiesByChapter,
  createProgress,
  duelXp,
  effectiveStats,
  equip,
  gainMaterials,
  gainMoney,
  gainXp,
  hasAffinity,
  isUnlocked,
  learn,
  learnAffinity,
  learnableNow,
  loadoutIsValid,
  spendPoint,
  trainAt,
  unequip,
  xpToNext,
} from "./progress.js";

describe("nivel y puntos libres", () => {
  it("sube de nivel y da tres puntos por nivel, sin gastarlos por ti", () => {
    const subido = gainXp(createProgress(), xpToNext(1));
    expect(subido.nivel).toBe(2);
    expect(subido.puntosLibres).toBe(POINTS_PER_LEVEL);
  });

  it("un chorro grande de XP sube varios niveles de una vez", () => {
    const subido = gainXp(createProgress(), 10000);
    expect(subido.nivel).toBeGreaterThan(3);
    expect(subido.subidas.length).toBe(subido.nivel - 1);
  });

  it("gastar un punto sube la estadística y descuenta el punto", () => {
    const con = gainXp(createProgress(), xpToNext(1));
    const gastado = spendPoint(con, "potencia");
    expect(gastado.stats.potencia).toBe(con.stats.potencia + 1);
    expect(gastado.puntosLibres).toBe(con.puntosLibres - 1);
  });

  it("sin puntos no se gasta nada, y una estadística inventada tampoco", () => {
    const base = createProgress();
    expect(spendPoint(base, "potencia")).toEqual(base);
    const con = gainXp(base, xpToNext(1));
    expect(spendPoint(con, "carisma")).toEqual(con);
  });

  it("la curva de XP crece con el nivel", () => {
    expect(xpToNext(10)).toBeGreaterThan(xpToNext(2));
  });

  it("Contener no da experiencia; una decisiva da mucha más que una escaramuza", () => {
    expect(duelXp({ nivelRival: 5, contenido: true })).toBe(0);
    expect(duelXp({ nivelRival: 5, decisiva: true })).toBeGreaterThan(duelXp({ nivelRival: 5 }));
  });
});

describe("los puntos de entrenamiento de Marés (§5.1)", () => {
  it("cada punto sube la estadística que declara su distrito", () => {
    expect(trainAt(createProgress(), "poligono").ganado).toBe("aguante");
    expect(trainAt(createProgress(), "faro").ganado).toBe("temple");
    expect(trainAt(createProgress(), "instituto").ganado).toBe("velocidad");
    expect(trainAt(createProgress(), "puerto").ganado).toBe("cuerpo");
    expect(trainAt(createProgress(), "concha").ganado).toBe("control");
  });

  it("un distrito sin punto de entrenamiento devuelve null", () => {
    expect(trainAt(createProgress(), "hospital")).toBeNull();
    expect(trainAt(createProgress(), "aguas")).toBeNull();
  });

  it("rinde menos a partir de la sexta visita: no se puede moler un banco", () => {
    let prog = createProgress();
    let ganadas = 0;
    for (let i = 0; i < 20; i += 1) {
      prog = trainAt(prog, "faro");
      if (prog.ganado) ganadas += 1;
    }
    expect(ganadas).toBeLessThan(20);
    expect(ganadas).toBeGreaterThan(6);
  });

  it("nunca pasa del techo de la estadística", () => {
    let prog = createProgress();
    prog = { ...prog, stats: { ...prog.stats, temple: STAT_MAX } };
    prog = trainAt(prog, "faro");
    expect(prog.stats.temple).toBe(STAT_MAX);
  });
});

describe("las afinidades son la espina dorsal (§5.3)", () => {
  it("Dani empieza siendo Rayo puro", () => {
    const base = createProgress();
    expect(base.afinidades).toEqual(["rayo"]);
    for (const a of AFFINITIES.filter((x) => x !== "rayo")) {
      expect(hasAffinity(base, a), a).toBe(false);
    }
  });

  it("llegan en el capítulo que dice el diseño: Luz 6, Materia 9, Sombra 11", () => {
    expect(affinitiesByChapter(5)).toEqual(["rayo"]);
    expect(affinitiesByChapter(6)).toEqual(["rayo", "luz"]);
    expect(affinitiesByChapter(9)).toEqual(["rayo", "luz", "materia"]);
    expect(affinitiesByChapter(11).sort()).toEqual([...AFFINITIES].sort());
  });

  it("aprender dos veces la misma no la duplica", () => {
    const prog = learnAffinity(learnAffinity(createProgress(), "luz"), "luz");
    expect(prog.afinidades.filter((a) => a === "luz")).toHaveLength(1);
  });

  it("una afinidad inventada no entra", () => {
    const base = createProgress();
    expect(learnAffinity(base, "fuego")).toEqual(base);
  });
});

describe("el libro de técnicas", () => {
  const ctx = (over = {}) => ({ prog: createProgress(), capitulo: 1, mentores: [], villanos: [], ...over });

  it("ninguna técnica de afinidad avanzada se puede aprender antes de tenerla", () => {
    for (const [id, t] of Object.entries(TECHNIQUES)) {
      const [tipo, valor] = String(t.unlock).split(":");
      if (tipo !== "afinidad" || valor === "rayo") continue;
      // Capítulo 12, todos los mentores y villanos: y aun así, sin la afinidad, no.
      const todo = ctx({ capitulo: TOTAL_CHAPTERS, mentores: ["requena", "vigia"], villanos: ["tasador", "hierro", "larga", "cero"] });
      expect(isUnlocked(id, todo), `${id} sin ${valor}`).toBe(false);
      todo.prog = learnAffinity(todo.prog, valor);
      expect(isUnlocked(id, todo), `${id} con ${valor}`).toBe(true);
    }
  });

  it("las de mentor esperan al mentor y las de villano al villano", () => {
    const sinNadie = ctx({ capitulo: TOTAL_CHAPTERS });
    expect(isUnlocked("lectura", sinNadie)).toBe(false);
    expect(isUnlocked("lectura", { ...sinNadie, mentores: ["requena"] })).toBe(true);
    expect(isUnlocked("martillo", sinNadie)).toBe(false);
    expect(isUnlocked("martillo", { ...sinNadie, villanos: ["tasador"] })).toBe(true);
  });

  it("las de historia esperan a su capítulo", () => {
    expect(isUnlocked("punoTormenta", ctx({ capitulo: 4 }))).toBe(false);
    expect(isUnlocked("punoTormenta", ctx({ capitulo: 5 }))).toBe(true);
    expect(isUnlocked("fulgor", ctx({ capitulo: 11 }))).toBe(false);
    expect(isUnlocked("fulgor", ctx({ capitulo: 12 }))).toBe(true);
  });

  it("las iniciales están disponibles desde el minuto uno", () => {
    for (const id of STARTING_TECHNIQUES) expect(isUnlocked(id, ctx()), id).toBe(true);
  });

  it("learnableNow no ofrece lo ya aprendido", () => {
    const base = ctx();
    expect(learnableNow(base).some((id) => STARTING_TECHNIQUES.includes(id))).toBe(false);
  });

  it("las cuarenta son alcanzables al final de la campaña", () => {
    const prog = AFFINITIES.reduce((p, a) => learnAffinity(p, a), createProgress());
    const todo = { prog, capitulo: TOTAL_CHAPTERS, mentores: ["requena", "vigia"], villanos: ["tasador", "hierro", "larga", "cero"] };
    for (const id of Object.keys(TECHNIQUES)) {
      expect(isUnlocked(id, todo), `${id} inalcanzable`).toBe(true);
    }
  });
});

describe("las seis ranuras (§5.5)", () => {
  it("no se equipa una técnica que no se ha aprendido", () => {
    const base = createProgress();
    expect(equip(base, "fulgor").equipadas).toEqual(base.equipadas);
  });

  it("no caben más de seis, y la séptima se rechaza en vez de tirar una", () => {
    let prog = createProgress();
    const extra = ["destello", "yunque", "vaho", "cortina"];
    for (const id of extra) prog = learn(prog, id);
    for (const id of extra) prog = equip(prog, id);
    expect(prog.equipadas.length).toBe(TECHNIQUE_SLOTS);
    prog = learn(prog, "silencio");
    const antes = [...prog.equipadas];
    prog = equip(prog, "silencio");
    expect(prog.equipadas).toEqual(antes);
  });

  it("equipar en una ranura concreta sustituye lo que había", () => {
    let prog = learn(createProgress(), "destello");
    prog = equip(prog, "destello", 0);
    expect(prog.equipadas[0]).toBe("destello");
  });

  it("no se repite la misma técnica en dos ranuras", () => {
    let prog = learn(createProgress(), "destello");
    prog = equip(prog, "destello");
    prog = equip(prog, "destello");
    expect(prog.equipadas.filter((t) => t === "destello")).toHaveLength(1);
  });

  it("el equipamiento inicial es válido y sigue siéndolo tras quitar y poner", () => {
    let prog = createProgress();
    expect(loadoutIsValid(prog)).toBe(true);
    prog = unequip(prog, "pulso");
    prog = learn(prog, "cortina");
    prog = equip(prog, "cortina");
    expect(loadoutIsValid(prog)).toBe(true);
  });
});

describe("el Rango no es una puntuación (§4.5, §8.2)", () => {
  it("sube y baja dentro de sus límites", () => {
    let prog = createProgress();
    for (let i = 0; i < 50; i += 1) prog = adjustRank(prog, 1);
    expect(prog.rango).toBe(RANK_MAX);
    for (let i = 0; i < 50; i += 1) prog = adjustRank(prog, -1);
    expect(prog.rango).toBe(RANK_MIN);
  });

  it("y este módulo NO cobra su precio: eso es cosa de suspicion.js", async () => {
    const mod = await import("./progress.js");
    for (const clave of Object.keys(mod)) {
      expect(clave.toLowerCase()).not.toMatch(/sospech|suspicion|interes/);
    }
  });
});

describe("materiales, dinero y estadísticas efectivas", () => {
  it("los materiales entran con el factor del resultado (§4.5)", () => {
    const doble = gainMaterials(createProgress(), { cobre: 3 }, 2);
    expect(doble.materiales.cobre).toBe(6);
  });

  it("el dinero nunca es negativo", () => {
    expect(gainMoney(createProgress(), -50).dinero).toBe(0);
  });

  it("las estadísticas efectivas suman el traje y respetan el techo", () => {
    const prog = createProgress();
    const conTraje = effectiveStats(prog, { potencia: 10, guardia: 4 });
    expect(conTraje.potencia).toBe(prog.stats.potencia + 10);
    expect(conTraje.guardia).toBe(prog.stats.guardia + 4);
    expect(effectiveStats(prog, { potencia: 999 }).potencia).toBe(STAT_MAX);
  });

  it("devuelve las siete, siempre", () => {
    expect(Object.keys(effectiveStats(createProgress(), {})).sort()).toEqual([...STATS].sort());
  });
});
