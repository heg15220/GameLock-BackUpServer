/**
 * §14.3: "los bloques cuadran; las interrupciones no pueden encadenarse infinitamente".
 *
 * Both of those are quiet failures. Blocks that do not add up show as a chapter that ends
 * a day early and nobody notices for six months. Unbounded interruptions show as a
 * playthrough where the player never got an afternoon — and he will conclude the civilian
 * half of the game is thin, when in fact he simply never reached it.
 */

import { describe, expect, it } from "vitest";
import { createStream } from "./rng.js";
import { BLOCKS, BLOCK_ACTIONS, CHAPTER_DAYS, PATROL_FATIGUE, TOTAL_CHAPTERS } from "./tables.js";
import {
  MAX_INTERRUPTIONS_PER_CHAPTER,
  MAX_INTERRUPTIONS_PER_DAY,
  acceptInterruption,
  advanceBlock,
  availableActions,
  blocksInChapter,
  canInterrupt,
  chapterSummary,
  createCalendar,
  currentBlock,
  fatiguePenalty,
  isChapterOver,
  nextChapter,
  openDistricts,
  refuseInterruption,
  rollInterruption,
  skipMorning,
  spendBlock,
} from "./calendar.js";

describe("los bloques cuadran (§14.3)", () => {
  it("un día son exactamente tres bloques y luego cambia el día", () => {
    let cal = createCalendar(3);
    expect(currentBlock(cal)).toBe("manana");
    cal = advanceBlock(cal);
    expect(currentBlock(cal)).toBe("tarde");
    cal = advanceBlock(cal);
    expect(currentBlock(cal)).toBe("noche");
    cal = advanceBlock(cal);
    expect(currentBlock(cal)).toBe("manana");
    expect(cal.dia).toBe(2);
  });

  it("un capítulo tiene los días de la tabla y tres bloques por día", () => {
    for (let c = 1; c <= TOTAL_CHAPTERS; c += 1) {
      expect(blocksInChapter(c), `c${c}`).toBe(CHAPTER_DAYS[c - 1] * BLOCKS.length);
    }
  });

  it("gastar todos los bloques del capítulo lo termina, ni antes ni después", () => {
    let cal = createCalendar(5);
    const total = blocksInChapter(5);
    for (let i = 0; i < total; i += 1) {
      expect(isChapterOver(cal), `bloque ${i}`).toBe(false);
      cal = advanceBlock(cal);
    }
    expect(isChapterOver(cal)).toBe(true);
  });

  it("ninguna acción consume cero bloques", () => {
    let cal = createCalendar(4);
    for (const accion of BLOCK_ACTIONS) {
      const antes = createCalendar(4);
      const salida = spendBlock(antes, accion);
      if (salida === null) continue;
      expect(salida.bloque !== antes.bloque || salida.dia !== antes.dia, accion).toBe(true);
    }
    expect(cal.bloque).toBe(0);
  });

  it("una acción ilegal en este bloque devuelve null en vez de colarse", () => {
    const manana = createCalendar(4);
    expect(currentBlock(manana)).toBe("manana");
    expect(spendBlock(manana, "patrullar")).toBeNull();
    expect(spendBlock(manana, "trabajar")).toBeNull();
    expect(spendBlock(manana, "entrenar")).not.toBeNull();
  });
});

describe("el menú del bloque (§7.2)", () => {
  it("patrullar sólo aparece disponible de noche", () => {
    let cal = createCalendar(4);
    expect(availableActions(cal).find((a) => a.id === "patrullar").disponible).toBe(false);
    cal = advanceBlock(advanceBlock(cal));
    expect(currentBlock(cal)).toBe("noche");
    expect(availableActions(cal).find((a) => a.id === "patrullar").disponible).toBe(true);
  });

  it("una acción no disponible dice por qué, en vez de desaparecer", () => {
    const cal = createCalendar(4);
    const patrulla = availableActions(cal).find((a) => a.id === "patrullar");
    expect(patrulla.motivo).toBe("bloque");
  });

  it("las nueve acciones del §7.2 están todas", () => {
    expect(availableActions(createCalendar(1)).map((a) => a.id).sort()).toEqual([...BLOCK_ACTIONS].sort());
  });
});

describe("Marés se abre por capítulos (§7.3)", () => {
  it("el capítulo 1 no tiene ni Puerto ni Tolvas", () => {
    const abiertos = openDistricts(1);
    expect(abiertos).toContain("aguas");
    expect(abiertos).not.toContain("puerto");
    expect(abiertos).not.toContain("tolvas");
  });

  it("Las Tolvas es lo último, en el capítulo 10", () => {
    expect(openDistricts(9)).not.toContain("tolvas");
    expect(openDistricts(10)).toContain("tolvas");
  });

  it("los nueve distritos están abiertos al final", () => {
    expect(openDistricts(TOTAL_CHAPTERS)).toHaveLength(9);
  });

  it("nunca se cierra un distrito ya abierto", () => {
    for (let c = 2; c <= TOTAL_CHAPTERS; c += 1) {
      for (const d of openDistricts(c - 1)) expect(openDistricts(c), `c${c}/${d}`).toContain(d);
    }
  });
});

describe("dormir es un recurso (§7.1)", () => {
  it("patrullar noches seguidas cobra Compostura al día siguiente", () => {
    let cal = createCalendar(6);
    let previo = fatiguePenalty(cal);
    for (let noche = 1; noche <= 3; noche += 1) {
      cal = advanceBlock(advanceBlock(cal)); // hasta la noche
      cal = spendBlock(cal, "patrullar");
      const ahora = fatiguePenalty(cal);
      expect(ahora, `noche ${noche}`).toBeGreaterThanOrEqual(previo);
      previo = ahora;
    }
    expect(previo).toBe(PATROL_FATIGUE[3]);
  });

  it("dormir una noche borra la deuda", () => {
    let cal = createCalendar(6);
    cal = advanceBlock(advanceBlock(cal));
    cal = spendBlock(cal, "patrullar");
    cal = advanceBlock(advanceBlock(cal));
    cal = spendBlock(cal, "patrullar");
    expect(fatiguePenalty(cal)).toBeGreaterThan(0);
    cal = advanceBlock(advanceBlock(cal));
    cal = spendBlock(cal, "descansar");
    expect(fatiguePenalty(cal)).toBe(0);
  });
});

describe("las interrupciones no se encadenan hasta el infinito (§14.3)", () => {
  it("una por día como máximo", () => {
    const next = createStream("emergencias", "dia");
    let cal = createCalendar(7);
    const emergencia = rollInterruption(next, cal, { probabilidad: 1 });
    cal = acceptInterruption(cal, emergencia);
    // Sigue siendo el mismo día: la mañana se fue en la Intervención.
    expect(cal.dia).toBe(1);
    expect(canInterrupt(cal)).toBe(false);
    expect(rollInterruption(next, cal, { probabilidad: 1 })).toBeNull();
  });

  it("y tres por capítulo, aunque la probabilidad sea 1", () => {
    const next = createStream("emergencias", "capitulo");
    let cal = createCalendar(9);
    let aceptadas = 0;
    for (let i = 0; i < 60; i += 1) {
      const e = rollInterruption(next, cal, { probabilidad: 1 });
      if (e) {
        cal = acceptInterruption(cal, e);
        aceptadas += 1;
      } else {
        cal = advanceBlock(cal);
      }
      if (isChapterOver(cal)) break;
    }
    expect(aceptadas).toBe(MAX_INTERRUPTIONS_PER_CHAPTER);
    expect(MAX_INTERRUPTIONS_PER_DAY).toBeLessThanOrEqual(MAX_INTERRUPTIONS_PER_CHAPTER);
  });

  it("el capítulo siempre deja bloques civiles libres", () => {
    const next = createStream("civil");
    let cal = createCalendar(11);
    let bloques = 0;
    while (!isChapterOver(cal) && bloques < 100) {
      const e = rollInterruption(next, cal, { probabilidad: 1 });
      cal = e ? acceptInterruption(cal, e) : advanceBlock(cal);
      bloques += 1;
    }
    const gastadosEnEmergencias = cal.interrupcionesCapitulo;
    expect(blocksInChapter(11) - gastadosEnEmergencias).toBeGreaterThan(20);
  });

  it("rechazar también gasta el cupo y cuesta rango: negarse no es gratis (§7.2)", () => {
    const next = createStream("rechazo");
    const cal = createCalendar(6);
    const e = rollInterruption(next, cal, { probabilidad: 1 });
    const salida = refuseInterruption(cal, e);
    expect(salida.rango).toBe(-1);
    expect(salida.consecuencia).toBe(e.id);
    expect(canInterrupt(salida.cal)).toBe(false);
  });

  it("la emergencia cae en un distrito ya abierto", () => {
    const next = createStream("distrito");
    for (let c = 1; c <= TOTAL_CHAPTERS; c += 1) {
      const e = rollInterruption(next, createCalendar(c), { probabilidad: 1 });
      expect(openDistricts(c), `c${c}`).toContain(e.distrito);
    }
  });

  it("el contador diario se limpia al pasar de día", () => {
    const next = createStream("dias");
    let cal = createCalendar(8);
    cal = acceptInterruption(cal, rollInterruption(next, cal, { probabilidad: 1 }));
    cal = advanceBlock(advanceBlock(cal)); // termina el día
    expect(cal.interrupcionesHoy).toBe(0);
    expect(cal.interrupcionesCapitulo).toBe(1);
  });
});

describe("faltar por la mañana (§7.1)", () => {
  it("penaliza el vínculo y abre una Temporal si el héroe salió", () => {
    const cal = createCalendar(5);
    const salida = skipMorning(cal, { heroeSalio: true });
    expect(salida.penalizaVinculo).toBe(true);
    expect(salida.pistaTemporal).toBe(true);
    expect(currentBlock(salida.cal)).toBe("tarde");
  });

  it("si el héroe no salió esa mañana, no hay pista que dar", () => {
    expect(skipMorning(createCalendar(5), { heroeSalio: false }).pistaTemporal).toBe(false);
  });

  it("no se puede faltar a una mañana que ya pasó", () => {
    expect(skipMorning(advanceBlock(createCalendar(5)))).toBeNull();
  });
});

describe("cierre de capítulo", () => {
  it("nextChapter reinicia el calendario y conserva el historial", () => {
    let cal = createCalendar(4);
    cal = spendBlock(cal, "entrenar");
    const siguiente = nextChapter(cal);
    expect(siguiente.capitulo).toBe(5);
    expect(siguiente.dia).toBe(1);
    expect(siguiente.interrupcionesCapitulo).toBe(0);
    expect(siguiente.historial.length).toBe(cal.historial.length);
  });

  it("no pasa del capítulo doce", () => {
    expect(nextChapter(createCalendar(TOTAL_CHAPTERS)).capitulo).toBe(TOTAL_CHAPTERS);
  });

  it("el resumen cuenta lo que el jugador hizo de verdad", () => {
    let cal = createCalendar(3);
    cal = spendBlock(cal, "entrenar");
    cal = spendBlock(cal, "quedar", { objetivo: "isma" });
    const resumen = chapterSummary(cal);
    expect(resumen.porAccion.entrenar).toBe(1);
    expect(resumen.porAccion.quedar).toBe(1);
    expect(resumen.bloquesTotales).toBe(blocksInChapter(3));
  });
});
