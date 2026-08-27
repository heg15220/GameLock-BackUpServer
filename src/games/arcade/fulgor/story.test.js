/**
 * §14.3: "los doce capítulos son alcanzables; ninguna bandera se lee antes de escribirse;
 * todo final tiene condición alcanzable. Un grafo de historia sin este test se rompe en
 * silencio."
 *
 * That last sentence is the whole reason this file exists. A story graph does not throw. A
 * chapter reading a flag nobody writes simply takes the wrong branch, forever, and the bug
 * surfaces as "the writing feels off" six months and forty scenes later.
 */

import { describe, expect, it } from "vitest";
import {
  CHAPTERS,
  CHAPTER_LIST,
  ENDING_CONDITIONS,
  ENDING_ORDER,
  blankEndingSummary,
  chapter,
  flagsWrittenBy,
  grantsUpTo,
  nextChapterNumber,
  resolveEnding,
  scenesFor,
} from "./story.js";
import {
  AFFINITIES,
  AFFINITY_UNLOCK_CHAPTER,
  BLOCKS,
  CHAPTER_DAYS,
  DISTRICTS,
  DOSSIERS,
  ENDINGS,
  SUIT_GENERATIONS,
  TECHNIQUES,
  TOTAL_CHAPTERS,
} from "./tables.js";
import { getCopy } from "./copy.js";

describe("los doce capítulos son alcanzables (§14.3)", () => {
  it("están los doce, numerados del 1 al 12", () => {
    expect(CHAPTER_LIST).toHaveLength(TOTAL_CHAPTERS);
    expect(CHAPTER_LIST.map((c) => c.n)).toEqual([...Array(TOTAL_CHAPTERS)].map((_, i) => i + 1));
  });

  it("se encadenan sin huecos del 1 al 12 y ahí se acaba", () => {
    let n = 1;
    const vistos = [n];
    while (nextChapterNumber(n) !== null) {
      n = nextChapterNumber(n);
      vistos.push(n);
      expect(chapter(n), `c${n} no existe`).toBeTruthy();
    }
    expect(vistos).toHaveLength(TOTAL_CHAPTERS);
    expect(nextChapterNumber(TOTAL_CHAPTERS)).toBeNull();
  });

  it("cada uno tiene decisiva, y su distrito existe", () => {
    for (const c of CHAPTER_LIST) {
      expect(c.decisiva, `c${c.n} sin decisiva`).toBeTruthy();
      expect(DISTRICTS[c.decisiva.distrito], `c${c.n}: ${c.decisiva.distrito}`).toBeTruthy();
      expect(DISTRICTS[c.distritoFoco], `c${c.n} foco`).toBeTruthy();
    }
  });

  it("el presupuesto de minutos cae en las ocho horas del §9.2", () => {
    const total = CHAPTER_LIST.reduce((a, c) => a + c.minutos, 0);
    expect(total).toBeGreaterThanOrEqual(440);
    expect(total).toBeLessThanOrEqual(520);
  });

  it("cada capítulo tiene los días que le da la tabla del calendario", () => {
    expect(CHAPTER_DAYS).toHaveLength(TOTAL_CHAPTERS);
    for (const c of CHAPTER_LIST) expect(CHAPTER_DAYS[c.n - 1], `c${c.n}`).toBeGreaterThan(0);
  });
});

describe("ninguna bandera se lee antes de escribirse (§14.3)", () => {
  it("todo `lee` de capítulo lo satisface un capítulo anterior", () => {
    const rotas = [];
    for (const c of CHAPTER_LIST) {
      const disponibles = flagsWrittenBy(c.n - 1);
      for (const f of c.lee ?? []) {
        if (!disponibles.has(f)) rotas.push(`c${c.n} lee "${f}" y nadie lo ha escrito`);
      }
    }
    expect(rotas).toEqual([]);
  });

  it("todo `lee` de escena lo satisface su propio capítulo o uno anterior", () => {
    const rotas = [];
    for (const c of CHAPTER_LIST) {
      const disponibles = flagsWrittenBy(c.n);
      for (const e of c.escenas) {
        for (const f of e.lee ?? []) {
          if (!disponibles.has(f)) rotas.push(`c${c.n}/${e.id} lee "${f}"`);
        }
      }
    }
    expect(rotas).toEqual([]);
  });

  it("lo que un capítulo declara escribir es lo que sus escenas escriben de verdad", () => {
    for (const c of CHAPTER_LIST) {
      const deEscenas = c.escenas.flatMap((e) => e.escribe ?? []);
      for (const f of deEscenas) {
        expect(c.escribe, `c${c.n}: la escena escribe "${f}" y el capítulo no lo declara`).toContain(f);
      }
    }
  });

  it("ninguna bandera se escribe en dos capítulos distintos", () => {
    const donde = {};
    for (const c of CHAPTER_LIST) {
      for (const f of c.escribe) {
        // Las tres del capítulo 12 son una elección excluyente, no tres banderas.
        expect(donde[f], `"${f}" se escribe en c${donde[f]} y en c${c.n}`).toBeUndefined();
        donde[f] = c.n;
      }
    }
  });

  it("scenesFor no ofrece una escena cuya condición no se cumple", () => {
    // c1_subestacion pide `llaveEncontrada`.
    expect(scenesFor(1, "noche", new Set()).map((e) => e.id)).not.toContain("c1_subestacion");
    expect(scenesFor(1, "noche", new Set(["llaveEncontrada"])).map((e) => e.id)).toContain("c1_subestacion");
  });

  it("toda escena cae en un bloque que existe", () => {
    for (const c of CHAPTER_LIST) {
      for (const e of c.escenas) {
        if (e.bloque) expect(BLOCKS, `c${c.n}/${e.id}`).toContain(e.bloque);
      }
    }
  });
});

describe("lo que cada capítulo entrega (§5.3, §6.3)", () => {
  it("las afinidades llegan en el capítulo que fija la tabla", () => {
    for (const a of AFFINITIES) {
      const cap = AFFINITY_UNLOCK_CHAPTER[a];
      expect(grantsUpTo(cap - 1).afinidades, `${a} antes de tiempo`).not.toContain(a);
      expect(grantsUpTo(cap).afinidades, `${a} no llega en c${cap}`).toContain(a);
    }
  });

  it("los trajes llegan en su capítulo y en orden", () => {
    for (const [id, gen] of Object.entries(SUIT_GENERATIONS)) {
      expect(grantsUpTo(gen.capitulo).traje, `${id} en c${gen.capitulo}`).toBeTruthy();
    }
    expect(grantsUpTo(2).traje).toBe("improvisado");
    expect(grantsUpTo(4).traje).toBe("taller");
    expect(grantsUpTo(6).traje).toBe("aislado");
    expect(grantsUpTo(9).traje).toBe("conductor");
    expect(grantsUpTo(11).traje).toBe("fulgor");
  });

  it("toda técnica que un capítulo entrega existe en el catálogo", () => {
    for (const c of CHAPTER_LIST) {
      for (const t of c.otorga?.tecnicas ?? []) {
        expect(TECHNIQUES[t], `c${c.n} entrega "${t}", que no existe`).toBeTruthy();
      }
    }
  });

  it("ninguna técnica de afinidad se entrega antes que su afinidad", () => {
    for (const c of CHAPTER_LIST) {
      const tenidas = grantsUpTo(c.n).afinidades;
      for (const t of c.otorga?.tecnicas ?? []) {
        const [tipo, valor] = String(TECHNIQUES[t].unlock).split(":");
        if (tipo !== "afinidad") continue;
        expect(tenidas, `c${c.n} entrega ${t} sin tener ${valor}`).toContain(valor);
      }
    }
  });

  it("toda técnica del catálogo la entrega algún capítulo, un mentor o un villano", () => {
    const porHistoria = new Set(grantsUpTo(TOTAL_CHAPTERS).tecnicas);
    const sinCamino = Object.keys(TECHNIQUES).filter((id) => {
      if (porHistoria.has(id)) return false;
      const [tipo] = String(TECHNIQUES[id].unlock).split(":");
      return !["start", "mentor", "villano", "afinidad", "historia"].includes(tipo);
    });
    expect(sinCamino).toEqual([]);
  });

  it("todo expediente que un capítulo abre existe, y todos acaban abiertos", () => {
    const abiertos = new Set();
    for (const c of CHAPTER_LIST) {
      for (const id of c.abre?.expedientes ?? []) {
        expect(DOSSIERS[id], `c${c.n} abre "${id}"`).toBeTruthy();
        expect(abiertos.has(id), `"${id}" se abre dos veces`).toBe(false);
        abiertos.add(id);
      }
    }
    expect([...abiertos].sort()).toEqual(Object.keys(DOSSIERS).sort());
  });

  it("cada expediente se abre en el capítulo que dice su ficha", () => {
    for (const c of CHAPTER_LIST) {
      for (const id of c.abre?.expedientes ?? []) {
        expect(DOSSIERS[id].abreEnCapitulo, `${id}`).toBe(c.n);
      }
    }
  });

  it("todo distrito que un capítulo abre coincide con su tabla, y los nueve se abren", () => {
    const abiertos = new Set();
    for (const c of CHAPTER_LIST) {
      for (const id of c.abre?.distritos ?? []) {
        expect(DISTRICTS[id], `c${c.n} abre "${id}"`).toBeTruthy();
        expect(DISTRICTS[id].abreEnCapitulo, id).toBe(c.n);
        abiertos.add(id);
      }
    }
    expect([...abiertos].sort()).toEqual(Object.keys(DISTRICTS).sort());
  });
});

describe("los beats guionizados que el diseño nombra (§9)", () => {
  it("el capítulo 1 no tiene combate: es una huida a oscuras", () => {
    expect(CHAPTERS[1].decisiva.sinCombate).toBe(true);
  });

  it("y deja la primera pista del juego, que no se puede evitar", () => {
    expect(CHAPTERS[1].decisiva.pistaForzada.tipo).toBe("fisica");
    expect(CHAPTERS[1].decisiva.pistaForzada.origen).toBe("llaveAlmacen");
  });

  it("el capítulo 5 rompe el traje por el manto", () => {
    expect(CHAPTERS[5].decisiva.rompeTraje).toBe("manto");
  });

  it("el capítulo 6 pone dos Intervenciones a la vez", () => {
    expect(CHAPTERS[6].decisiva.simultanea).toBeTruthy();
    expect(CHAPTERS[6].decisiva.simultanea.distrito).not.toBe(CHAPTERS[6].decisiva.distrito);
  });

  it("el capítulo 8 cierra el expediente de Isma pase lo que pase, y pierde", () => {
    expect(CHAPTERS[8].otorga.cierraExpediente).toBe("isma");
    expect(CHAPTERS[8].decisiva.derrotaGuionizada).toBe(true);
    expect(CHAPTERS[8].escribe).toContain("ismaLoSabe");
  });

  it("y el 8 es el punto medio: cae en la mitad de la campaña", () => {
    expect(CHAPTERS[8].n).toBeGreaterThan(TOTAL_CHAPTERS / 2 - 1);
    expect(CHAPTERS[8].n).toBeLessThan(TOTAL_CHAPTERS);
  });

  it("el capítulo 11 es una carrera de contramedidas contra Sabater, no un combate", () => {
    expect(CHAPTERS[11].decisiva.carreraDeContramedidas).toBe(true);
    expect(CHAPTERS[11].decisiva.objetivoExpediente).toBe("sabater");
  });

  it("el capítulo 12 deja elegir de verdad entre tres salidas", () => {
    const eleccion = CHAPTERS[12].escenas.find((e) => e.eleccion);
    expect(eleccion.eleccion).toHaveLength(3);
    expect(eleccion.eleccion).toContain("desenmascaradoVoluntario");
    expect(eleccion.eleccion).toContain("relevoAceptado");
  });

  it("todo antagonista lleva una afinidad y unas técnicas que existen", () => {
    for (const c of CHAPTER_LIST) {
      const a = c.decisiva.antagonista;
      if (!a) continue;
      expect(AFFINITIES, `c${c.n}/${a.id}`).toContain(a.afinidad);
      for (const t of a.tecnicas) expect(TECHNIQUES[t], `c${c.n}/${a.id}: ${t}`).toBeTruthy();
    }
  });
});

describe("todo final tiene condición alcanzable (§9.1)", () => {
  it("son siete, y cada uno tiene condición y texto en los dos idiomas", () => {
    expect(ENDING_ORDER).toHaveLength(7);
    expect([...ENDING_ORDER].sort()).toEqual(Object.keys(ENDINGS).sort());
    for (const id of ENDING_ORDER) {
      expect(ENDING_CONDITIONS[id], id).toBeTypeOf("function");
      for (const locale of ["es", "en"]) {
        expect(getCopy(locale).finales[id], `${locale}:${id}`).toBeTruthy();
        expect(getCopy(locale).finalesTexto[id], `${locale}:${id}`).toBeTruthy();
      }
    }
  });

  it("se puede construir un estado que llegue a cada uno de los siete", () => {
    const estados = {
      ciudadAOscuras: blankEndingSummary({ resultadoFinal: "fallido" }),
      desenmascarado: blankEndingSummary({ sabaterCerrado: true }),
      aCaraDescubierta: blankEndingSummary({ banderas: new Set(["desenmascaradoVoluntario"]) }),
      elRelevo: blankEndingSummary({ banderas: new Set(["relevoAceptado"]) }),
      losDos: blankEndingSummary({ confidentes: 4 }),
      laVigia: blankEndingSummary({ confidentes: 0, vinculoMaximo: 1 }),
      secretoIntacto: blankEndingSummary({ confidentes: 1, vinculoMaximo: 4 }),
    };
    for (const [esperado, estado] of Object.entries(estados)) {
      expect(resolveEnding(estado), esperado).toBe(esperado);
    }
  });

  it("«Los dos» necesita cuatro confidentes: es el más difícil, como dice el §9.1", () => {
    expect(resolveEnding(blankEndingSummary({ confidentes: 3 }))).not.toBe("losDos");
    expect(resolveEnding(blankEndingSummary({ confidentes: 4 }))).toBe("losDos");
  });

  it("«La Vigía» exige haber llegado solo del todo", () => {
    expect(resolveEnding(blankEndingSummary({ confidentes: 0, vinculoMaximo: 2 }))).not.toBe("laVigia");
    expect(resolveEnding(blankEndingSummary({ confidentes: 0, vinculoMaximo: 1 }))).toBe("laVigia");
  });

  it("siempre devuelve un final: nunca deja al jugador sin epílogo", () => {
    expect(resolveEnding(blankEndingSummary())).toBeTruthy();
    expect(ENDING_ORDER).toContain(resolveEnding(blankEndingSummary({ confidentes: 2, vinculoMaximo: 5 })));
  });

  it("y ninguno se llama bueno ni malo (§17)", () => {
    for (const locale of ["es", "en"]) {
      const copy = getCopy(locale);
      for (const id of ENDING_ORDER) {
        expect(copy.finales[id].toLowerCase(), `${locale}:${id}`).not.toMatch(/bueno|malo|good|bad|best|worst|perfect/);
      }
    }
  });
});
