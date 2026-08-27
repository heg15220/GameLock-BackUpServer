/**
 * El guardián de la brújula.
 *
 * La brújula es la única parte del juego que le DICE al jugador qué hacer, y por eso es la
 * única que no puede equivocarse. La versión anterior era una tabla de doce filas escrita a
 * mano contra nada, y el primer minuto de partida decía esto:
 *
 *     Vuelve a casa con Isma
 *     Cruza el Barrio de las Aguas y habla con Nuria antes de que anochezca.
 *
 * El título nombraba a uno y la instrucción a otra; el contacto era Nuria, cuya acción es
 * `quedar`; y `quedar` es de tarde y de noche, así que por la mañana el juego te mandaba a
 * hacer algo que el calendario prohíbe y el personaje contestaba «ahora no».
 *
 * Nada de eso es opinable: `OFRECE`, `BLOCK_ACTION_RULES.soloEn` y `openDistricts` son datos.
 * Lo que sigue los cruza con la tabla de objetivos, y por eso este archivo existe.
 */

import { describe, expect, it } from "vitest";
import { MISSION_COUNT, OBJETIVOS, activeMission } from "./missions.js";
import { OFRECE } from "./world/encuentros.js";
import { BLOCKS, BLOCK_ACTION_RULES, TOTAL_CHAPTERS } from "./tables.js";
import { openDistricts } from "./calendar.js";
import { DISTRITOS_JUGABLES, compilar } from "./world/maps.js";
import { getCopy } from "./copy.js";

const IDIOMAS = ["es", "en"];
const capitulos = Array.from({ length: MISSION_COUNT }, (_, i) => i + 1);

describe("la brújula apunta a algo que de verdad se puede hacer", () => {
  it("hay un objetivo por capítulo y bloque, en los dos idiomas", () => {
    expect(MISSION_COUNT).toBe(TOTAL_CHAPTERS);
    for (const idioma of IDIOMAS) {
      for (const c of capitulos) {
        expect(Object.keys(OBJETIVOS[idioma][c]).sort(), `${idioma}:c${c}`).toEqual([...BLOCKS].sort());
      }
    }
  });

  /**
   * EL FALLO EXACTO QUE ROMPIÓ LA PARTIDA. Un objetivo cuyo contacto no ofrece nada en ese
   * distrito, o cuya acción no es legal en ese bloque, es un objetivo imposible.
   */
  it("el contacto está en ese distrito y su acción es legal en ese bloque", () => {
    const rotos = [];
    for (const c of capitulos) {
      for (const b of BLOCKS) {
        const m = activeMission(c, "es", null, b);
        const accion = OFRECE[m.district]?.[m.contact] ?? null;
        if (!(m.contact in (OFRECE[m.district] ?? {}))) {
          rotos.push(`c${c}/${b}: ${m.contact} no está en ${m.district}`);
          continue;
        }
        if (!accion) {
          rotos.push(`c${c}/${b}: ${m.contact} no ofrece ninguna acción en ${m.district}`);
          continue;
        }
        const soloEn = BLOCK_ACTION_RULES[accion]?.soloEn ?? [];
        if (!soloEn.includes(b)) {
          rotos.push(`c${c}/${b}: ${m.contact} ofrece "${accion}", que sólo es legal en ${soloEn.join("/")}`);
        }
      }
    }
    expect(rotos).toEqual([]);
  });

  it("el distrito ya está abierto en ese capítulo, y es uno de los construidos", () => {
    const rotos = [];
    for (const c of capitulos) {
      const abiertos = openDistricts(c).filter((d) => DISTRITOS_JUGABLES.includes(d));
      for (const b of BLOCKS) {
        const m = activeMission(c, "es", null, b);
        if (!abiertos.includes(m.district)) rotos.push(`c${c}/${b}: ${m.district} aún no está abierto`);
      }
    }
    expect(rotos).toEqual([]);
  });

  /**
   * Y la tercera forma de romper una brújula: apuntar a un sitio al que no se llega.
   * Los distritos se cruzan andando por sus salidas, y no todos lindan con todos —de las
   * Aguas a las Tolvas hay siete—, así que un destino desconectado sería igual de imposible
   * que una acción ilegal, sólo que más difícil de ver.
   */
  it("se puede llegar andando al destino desde casa", () => {
    const vecinos = Object.fromEntries(DISTRITOS_JUGABLES.map((id) => [
      id,
      [...new Set(compilar(id).disparadores.filter((d) => d.tipo === "salida").map((d) => d.destino))],
    ]));
    const alcanzable = (desde, hasta) => {
      const visto = new Set([desde]);
      const cola = [desde];
      while (cola.length) {
        const x = cola.shift();
        if (x === hasta) return true;
        for (const y of vecinos[x] ?? []) if (!visto.has(y)) { visto.add(y); cola.push(y); }
      }
      return false;
    };
    const rotos = [];
    for (const c of capitulos) {
      for (const b of BLOCKS) {
        const m = activeMission(c, "es", null, b);
        if (!alcanzable("aguas", m.district)) rotos.push(`c${c}/${b}: no se llega a ${m.district}`);
      }
    }
    expect(rotos).toEqual([]);
  });

  /**
   * LA OTRA MITAD DEL FALLO: el título decía «Vuelve a casa con Isma» y la instrucción
   * mandaba a hablar con Nuria. Dos personas distintas en dos líneas seguidas.
   *
   * La regla no es «no nombres a nadie más» —la instrucción puede y debe explicar por qué
   * vas, y eso a veces exige nombrar a un tercero: vas a ver a Julia PORQUE Sabater ha
   * pedido los partes—. La regla es que **el objetivo sea uno solo**: entre el título y la
   * instrucción se nombra al contacto, y el título, que es la orden, no nombra a otro.
   */
  const fichas = (idioma) => {
    const copy = getCopy(idioma);
    const sobra = new Set(["doña", "dra.", "dr", "el", "la", "inspectora", "inspector"]);
    return Object.fromEntries(
      Object.entries(copy.personajes).map(([id, nombre]) => [
        id,
        nombre.split(" ").filter((t) => t.length > 2 && !sobra.has(t.toLowerCase())),
      ]),
    );
  };

  it("el título y la instrucción nombran al contacto, y a nadie más como destino", () => {
    const rotos = [];
    for (const idioma of IDIOMAS) {
      const copy = getCopy(idioma);
      const nombres = fichas(idioma);
      for (const c of capitulos) {
        for (const b of BLOCKS) {
          const m = activeMission(c, idioma, null, b);
          const suyos = nombres[m.contact];
          const donde = `${idioma}:c${c}/${b}`;

          // 1. Entre las dos líneas se nombra a quien te mandan a ver.
          const ambas = `${m.title} ${m.instruction}`;
          if (!suyos.some((n) => ambas.includes(n))) {
            rotos.push(`${donde}: no nombra a ${copy.personajes[m.contact]}`);
          }

          // 2. El título es la orden: ahí no cabe otro nombre propio del reparto.
          for (const [id, tokens] of Object.entries(nombres)) {
            if (id === m.contact || id === "dani") continue;
            const intruso = tokens.find((t) => m.title.includes(t) && !suyos.includes(t));
            if (intruso) rotos.push(`${donde}: manda a ${copy.personajes[m.contact]} y el título dice "${intruso}"`);
          }
        }
      }
    }
    expect(rotos).toEqual([]);
  });

  it("ningún texto está vacío ni es un calco entre idiomas", () => {
    for (const c of capitulos) {
      for (const b of BLOCKS) {
        const es = activeMission(c, "es", null, b);
        const en = activeMission(c, "en", null, b);
        expect(es.title.trim(), `es:c${c}/${b}`).not.toBe("");
        expect(es.instruction.length, `es:c${c}/${b}`).toBeGreaterThan(24);
        expect(en.title.trim(), `en:c${c}/${b}`).not.toBe("");
        expect(en.instruction.length, `en:c${c}/${b}`).toBeGreaterThan(24);
        expect(en.title, `c${c}/${b} sin adaptar`).not.toBe(es.title);
        // El destino y la persona son los mismos en los dos idiomas: son datos, no texto.
        expect(en.district).toBe(es.district);
        expect(en.contact).toBe(es.contact);
      }
    }
  });
});

describe("la brújula responde al momento", () => {
  it("cambia con el bloque dentro del mismo capítulo", () => {
    for (const c of capitulos) {
      const titulos = BLOCKS.map((b) => activeMission(c, "es", null, b).title);
      expect(new Set(titulos).size, `c${c} repite objetivo entre bloques`).toBe(BLOCKS.length);
    }
  });

  it("un bloque desconocido cae a la mañana en vez de quedarse en blanco", () => {
    expect(activeMission(1, "es", "aguas", "siesta").title).toBe(activeMission(1, "es", "aguas", "manana").title);
    expect(activeMission(1, "es", "aguas").bloque).toBe("manana");
  });

  it("«estás aquí» sólo cuando de verdad estás en el distrito del objetivo", () => {
    const m = activeMission(1, "es", "instituto", "manana");
    expect(m.district).toBe("instituto");
    expect(m.here).toBe(true);
    expect(activeMission(1, "es", "aguas", "manana").here).toBe(false);
  });

  it("el capítulo 1 por la mañana ya no manda a hacer algo prohibido", () => {
    const m = activeMission(1, "es", "aguas", "manana");
    const accion = OFRECE[m.district][m.contact];
    expect(BLOCK_ACTION_RULES[accion].soloEn).toContain("manana");
    // Y la instrucción habla de quien te manda a ver, no de otra persona.
    expect(`${m.title} ${m.instruction}`).toContain("Requena");
  });
});
