/**
 * El guardián del guion hablado.
 *
 * La versión anterior de `dialogueBank.js` se probaba por su ARITMÉTICA: 216 combinaciones
 * por voz, doscientas variantes distintas para Nuria. Los dos números eran ciertos y los dos
 * eran irrelevantes, porque salían de multiplicar seis aperturas compartidas por seis
 * cierres compartidos. Un test verde encima de un diálogo que en pantalla decía, con la voz
 * de una portera de setenta años, «Marés está rara hoy, ¿no te parece?».
 *
 * Así que aquí no se cuenta nada que se pueda multiplicar. Se comprueban cuatro hechos sobre
 * el texto, y los cuatro son los que se rompen cuando alguien vuelve a tener la tentación de
 * generar diálogo en vez de escribirlo:
 *
 *   1. **Nadie comparte una frase con nadie.** Es la regla entera del archivo.
 *   2. **Todo el mundo tiene los tres actos escritos**, con asuntos, pregunta, tres opciones
 *      y línea de repetición, en los dos idiomas.
 *   3. **El acto cambia lo que dice la gente.** Si Nuria dijera lo mismo en el capítulo 2 y
 *      en el 11, la curva de los tres actos sería decorativa.
 *   4. **Las respuestas de Dani son suyas para cada persona.** «Decir una parte de la verdad»
 *      repetida veintiuna veces era el síntoma más visible del generador.
 */

import { describe, expect, it } from "vitest";
import {
  ACTOS,
  DIALOGUE_CHARACTERS,
  DIALOGUE_WRITTEN_TOTAL,
  VOCES,
  actoDe,
  buildConversation,
  writtenConversations,
} from "./dialogueBank.js";
import { getCopy } from "./copy.js";
import { encuentro, OFRECE } from "./world/encuentros.js";
import { DOSSIERS, TOTAL_CHAPTERS } from "./tables.js";

const IDIOMAS = ["es", "en"];
const ANIMOS = ["neutro", "tenso", "decidido", "roto"];
const ACTO_IDS = [1, 2, 3];

/** Toda línea que dice un personaje, con su dueño, para poder buscar duplicados. */
const todasLasLineas = () => {
  const out = [];
  for (const id of DIALOGUE_CHARACTERS) {
    for (const idioma of IDIOMAS) {
      for (const acto of ACTO_IDS) {
        const a = VOCES[id][idioma][acto];
        for (const asunto of a.asuntos) for (const l of asunto) out.push({ id, idioma, texto: l.t });
        for (const r of a.repite) out.push({ id, idioma, texto: r.t });
        for (const o of a.opciones) {
          out.push({ id, idioma, texto: o.texto });
          out.push({ id, idioma, texto: o.replica });
        }
      }
    }
  }
  return out;
};

describe("ninguna frase es de dos personas a la vez", () => {
  it("no hay una sola línea repetida entre dos voces", () => {
    const dueno = new Map();
    const compartidas = [];
    for (const { id, idioma, texto } of todasLasLineas()) {
      const clave = `${idioma}:${texto.trim().toLowerCase()}`;
      if (dueno.has(clave) && dueno.get(clave) !== id) {
        compartidas.push(`«${texto.slice(0, 48)}…» → ${dueno.get(clave)} y ${id}`);
      }
      dueno.set(clave, id);
    }
    expect(compartidas).toEqual([]);
  });

  it("tampoco hay una etiqueta de respuesta compartida entre dos personas", () => {
    const dueno = new Map();
    const compartidas = [];
    for (const id of DIALOGUE_CHARACTERS) {
      for (const idioma of IDIOMAS) {
        for (const acto of ACTO_IDS) {
          for (const o of VOCES[id][idioma][acto].opciones) {
            const clave = `${idioma}:${o.label.trim().toLowerCase()}`;
            if (dueno.has(clave) && dueno.get(clave) !== id) {
              compartidas.push(`«${o.label}» → ${dueno.get(clave)} y ${id}`);
            }
            dueno.set(clave, id);
          }
        }
      }
    }
    expect(compartidas).toEqual([]);
  });
});

describe("el reparto está escrito entero", () => {
  it("son veintiuna voces y todas tienen los tres actos en los dos idiomas", () => {
    expect(DIALOGUE_CHARACTERS.length).toBe(21);
    for (const id of DIALOGUE_CHARACTERS) {
      for (const idioma of IDIOMAS) {
        expect(Object.keys(VOCES[id][idioma]).map(Number).sort(), `${id}.${idioma}`).toEqual(ACTO_IDS);
      }
    }
  });

  it("cada acto trae asuntos, pregunta, tres opciones completas y línea de repetición", () => {
    for (const id of DIALOGUE_CHARACTERS) {
      for (const idioma of IDIOMAS) {
        for (const acto of ACTO_IDS) {
          const a = VOCES[id][idioma][acto];
          const donde = `${id}.${idioma}.${acto}`;
          expect(a.asuntos.length, donde).toBeGreaterThanOrEqual(3);
          for (const asunto of a.asuntos) {
            expect(asunto.length, donde).toBeGreaterThanOrEqual(3);
            for (const l of asunto) {
              expect(l.t.trim(), donde).not.toBe("");
              expect(ANIMOS, `${donde}: ánimo ${l.a}`).toContain(l.a);
            }
          }
          expect(a.pregunta.trim(), donde).not.toBe("");
          expect(a.opciones.map((o) => o.id).sort(), donde).toEqual(["honesto", "preguntar", "proteger"]);
          for (const o of a.opciones) {
            for (const campo of ["label", "texto", "replica"]) {
              expect(String(o[campo] ?? "").trim(), `${donde}.${o.id}.${campo}`).not.toBe("");
            }
            // El botón de respuesta vive en la caja de diálogo, que a 352 px no perdona.
            expect(o.label.length, `${donde}.${o.id}: ${o.label}`).toBeLessThanOrEqual(34);
          }
          expect(a.repite.length, donde).toBeGreaterThanOrEqual(1);
          for (const r of a.repite) expect(r.t.trim(), donde).not.toBe("");
        }
      }
    }
  });

  it("el total escrito no es una promesa combinatoria sino un recuento", () => {
    expect(DIALOGUE_WRITTEN_TOTAL).toBe(
      DIALOGUE_CHARACTERS.reduce((n, id) => n + writtenConversations(id), 0),
    );
    // Veintiuna voces × tres actos × al menos tres asuntos.
    expect(DIALOGUE_WRITTEN_TOTAL).toBeGreaterThanOrEqual(189);
  });

  it("todo el que habla tiene nombre en copy.js, en los dos idiomas", () => {
    for (const idioma of IDIOMAS) {
      const copy = getCopy(idioma);
      for (const id of DIALOGUE_CHARACTERS) {
        expect(copy.personajes[id], `${idioma}:${id}`).toBeTruthy();
      }
    }
  });
});

describe("los tres actos son tres momentos distintos", () => {
  it("nadie repite un asunto de un acto en otro", () => {
    for (const id of DIALOGUE_CHARACTERS) {
      const vistas = new Map();
      for (const acto of ACTO_IDS) {
        for (const asunto of VOCES[id].es[acto].asuntos) {
          for (const l of asunto) {
            const clave = l.t.trim().toLowerCase();
            expect(vistas.get(clave), `${id}: «${l.t.slice(0, 40)}…»`).toBeUndefined();
            vistas.set(clave, acto);
          }
        }
      }
    }
  });

  it("la misma persona en el capítulo 2 y en el 11 no dice lo mismo", () => {
    for (const id of DIALOGUE_CHARACTERS) {
      const pronto = buildConversation(id, { chapter: 2, day: 1, block: "tarde" });
      const tarde = buildConversation(id, { chapter: 11, day: 1, block: "tarde" });
      expect(pronto[0].texto, id).not.toBe(tarde[0].texto);
    }
  });

  it("actoDe reparte los doce capítulos en los tres actos del §9", () => {
    for (let c = 1; c <= TOTAL_CHAPTERS; c += 1) {
      expect(ACTOS[actoDe(c)], `capítulo ${c}`).toContain(c);
    }
  });
});

describe("las respuestas de Dani son distintas para cada persona", () => {
  it("no le contesta igual a su madre que a la inspectora", () => {
    const aMadre = buildConversation("carmen", { chapter: 3, day: 1, block: "tarde" }).at(-1);
    const aPolicia = buildConversation("sabater", { chapter: 3, day: 1, block: "tarde" }).at(-1);
    const textos = (linea) => linea.opciones.map((o) => o.response[0].text).sort();
    expect(textos(aMadre)).not.toEqual(textos(aPolicia));
    expect(aMadre.texto).not.toBe(aPolicia.texto);
  });

  it("cada opción lleva la línea de Dani y la réplica de quien escucha", () => {
    for (const id of DIALOGUE_CHARACTERS) {
      const linea = buildConversation(id, { chapter: 7, day: 2, block: "tarde" }).at(-1);
      expect(linea.hablante, id).toBe("dani");
      expect(linea.opciones, id).toHaveLength(3);
      for (const o of linea.opciones) {
        expect(o.response, `${id}.${o.id}`).toHaveLength(2);
        expect(o.response[0].speaker).toBe("dani");
        expect(o.response[1].speaker).toBe(id);
        expect(o.response[1].name).toBe(getCopy("es").personajes[id]);
      }
    }
  });
});

describe("la selección es determinista y la repetición no repite", () => {
  it("dos llamadas con el mismo contexto devuelven la misma conversación", () => {
    const ctx = { chapter: 5, day: 2, block: "noche" };
    for (const id of DIALOGUE_CHARACTERS) {
      const a = buildConversation(id, ctx).map((l) => l.texto).join("|");
      const b = buildConversation(id, ctx).map((l) => l.texto).join("|");
      expect(a, id).toBe(b);
    }
  });

  it("volver el mismo día devuelve la línea de repetición y no la escena entera", () => {
    for (const id of DIALOGUE_CHARACTERS) {
      const primera = buildConversation(id, { chapter: 4, day: 1, block: "tarde", visit: 0 });
      const segunda = buildConversation(id, { chapter: 4, day: 1, block: "tarde", visit: 1 });
      expect(segunda, id).toHaveLength(1);
      expect(segunda[0].texto, id).not.toBe(primera[0].texto);
      expect(segunda[0].opciones, id).toBeUndefined();
    }
  });

  it("quien no es del reparto no inventa nada", () => {
    expect(buildConversation("fantasma", {})).toBeNull();
  });
});

describe("el saludo del mundo ya no lo pisa la conversación", () => {
  /**
   * La regresión concreta: `encuentro()` construía las líneas de `SALUDOS` y luego las
   * descartaba con un `??` que nunca llegaba a su derecha. Este test la habría cazado.
   */
  it("hablar con alguien devuelve su saludo Y su conversación del acto", () => {
    const r = encuentro("nuria", "aguas", { legal: true, idioma: "es", capitulo: 1, dia: 1, bloque: "tarde" });
    const saludos = Object.values(r.lineas).map((l) => l.texto);
    expect(saludos.length).toBeGreaterThan(3);
    expect(saludos[0]).toMatch(/Has venido|Pensaba que hoy/);
    // Y detrás va la conversación escrita, que acaba en la pregunta de Dani.
    expect(r.lineas.at(-1).hablante).toBe("dani");
  });

  it("fuera de su bloque, la persona lo dice con su voz y no se gasta la acción", () => {
    const r = encuentro("pilar", "aguas", { legal: false, idioma: "es", capitulo: 1, dia: 1, bloque: "noche" });
    expect(r.accion).toBeNull();
    expect(r.lineas).toHaveLength(1);
    expect(r.lineas[0].texto).toContain("conversaciones");
  });

  it("todo el que ofrece una acción en algún distrito sabe decir que ahora no toca", () => {
    const sinNegativa = [];
    for (const [distrito, gente] of Object.entries(OFRECE)) {
      for (const [id, accion] of Object.entries(gente)) {
        if (!accion) continue;
        const r = encuentro(id, distrito, { legal: false, idioma: "es", capitulo: 1, dia: 1, bloque: "noche" });
        if (r.accion !== null || r.lineas.length !== 1) sinNegativa.push(`${distrito}:${id}`);
      }
    }
    expect(sinNegativa).toEqual([]);
  });

  it("todo el que tiene expediente abierto puede hablar", () => {
    for (const id of Object.keys(DOSSIERS)) {
      if (id === "dani") continue;
      expect(DIALOGUE_CHARACTERS, `${id} tiene expediente y no tiene voz`).toContain(id);
    }
  });
});
