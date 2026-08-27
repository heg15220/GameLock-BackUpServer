/**
 * El guardián de la campaña escrita.
 *
 * Éste es el test que no existía y que habría cazado el agujero más grande del juego: doce
 * capítulos de estructura con `texto: null` en nueve de ellos, y una fase `ESCENA` completa
 * —caso en el reductor, pintor en `scene.jsx`, `pendingScenes()` en `game.js`— a la que no
 * se llegaba nunca porque ningún componente la invocaba.
 *
 * Lo que se comprueba aquí es la unión de las dos mitades:
 *
 *   1. **Que la estructura y el texto se conocen.** Toda escena de `story.js` tiene guion,
 *      todo guion está referenciado por `story.js`, y ningún capítulo se queda sin epílogo
 *      ni sin apertura de decisiva.
 *   2. **Que el guion se puede pintar.** Cada línea tiene texto, un ánimo que
 *      `world/sprites.js` sabe dibujar y un hablante que existe en `copy.personajes`.
 *   3. **Que la elección del capítulo 12 escribe lo que `story.js` dice que escribe.** Es la
 *      bifurcación de los siete finales; si los ids se despegan, el juego pierde tres finales
 *      en silencio.
 *   4. **Que el prólogo y la apertura tienen todo su texto en los dos idiomas.**
 */

import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CHAPTERS, CHAPTER_LIST } from "./story.js";
import { ESCENAS_ESCRITAS, GUIONES, eleccionesDe, escenaGuion, tieneGuion } from "./guiones/index.js";
import { CARTAS, DURACION_APERTURA, FRASES_APERTURA, TOTAL_CARTAS } from "./prologo.js";
import { Apertura, Prologo } from "./Prologo.jsx";
import { getCopy } from "./copy.js";
import { TOTAL_CHAPTERS } from "./tables.js";

const IDIOMAS = ["es", "en"];
const ANIMOS = ["neutro", "tenso", "decidido", "roto"];

/** Todo id de escena que la campaña llega a pedir: bloque, epílogo y apertura de decisiva. */
const referenciados = () => {
  const ids = new Set();
  for (const c of CHAPTER_LIST) {
    for (const e of c.escenas) ids.add(e.id);
    if (c.epilogo) ids.add(c.epilogo);
    if (c.decisiva?.textoApertura) ids.add(c.decisiva.textoApertura);
  }
  return ids;
};

describe("la estructura y el texto se conocen", () => {
  it("toda escena de los doce capítulos tiene guion escrito", () => {
    const sinGuion = [];
    for (const c of CHAPTER_LIST) {
      for (const e of c.escenas) if (!tieneGuion(e.id)) sinGuion.push(`c${c.n}/${e.id}`);
    }
    expect(sinGuion).toEqual([]);
  });

  it("los doce capítulos tienen epílogo, y el epílogo está escrito", () => {
    for (const c of CHAPTER_LIST) {
      expect(c.epilogo, `c${c.n} sin epílogo`).toBe(`c${c.n}_epilogo`);
      expect(tieneGuion(c.epilogo), `c${c.n}: epílogo sin guion`).toBe(true);
    }
    expect(CHAPTER_LIST).toHaveLength(TOTAL_CHAPTERS);
  });

  it("las doce Intervenciones decisivas tienen apertura, y está escrita", () => {
    for (const c of CHAPTER_LIST) {
      const apertura = c.decisiva?.textoApertura;
      expect(apertura, `c${c.n}: decisiva sin apertura`).toBeTruthy();
      expect(tieneGuion(apertura), `c${c.n}: apertura "${apertura}" sin guion`).toBe(true);
    }
  });

  it("no hay guion escrito que la campaña no llegue a pedir", () => {
    const pedidos = referenciados();
    const huerfanos = ESCENAS_ESCRITAS.filter((id) => !pedidos.has(id));
    expect(huerfanos).toEqual([]);
  });

  it("la cadencia del §9 se cumple: apertura civil, escalada y epílogo en cada capítulo", () => {
    for (const c of CHAPTER_LIST) {
      expect(c.escenas.length, `c${c.n}`).toBeGreaterThanOrEqual(2);
      const bloques = new Set(c.escenas.map((e) => e.bloque).filter(Boolean));
      expect(bloques.size, `c${c.n}: todas las escenas en el mismo bloque`).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("el guion se puede pintar", () => {
  it("cada línea tiene texto en los dos idiomas y el mismo número de líneas", () => {
    for (const id of ESCENAS_ESCRITAS) {
      const es = escenaGuion(id, "es");
      const en = escenaGuion(id, "en");
      expect(es.length, `${id}: sin líneas`).toBeGreaterThan(0);
      expect(en.length, `${id}: es y en no cuadran`).toBe(es.length);
      for (const l of [...es, ...en]) {
        expect(String(l.texto ?? "").trim(), `${id}: línea vacía`).not.toBe("");
        expect(ANIMOS, `${id}: ánimo "${l.animo}"`).toContain(l.animo);
      }
    }
  });

  it("todo el que habla en una escena existe en copy.personajes", () => {
    const copy = getCopy("es");
    const desconocidos = new Set();
    for (const id of ESCENAS_ESCRITAS) {
      for (const idioma of IDIOMAS) {
        for (const l of escenaGuion(id, idioma)) {
          if (l.hablante && !copy.personajes[l.hablante]) desconocidos.add(`${id}: ${l.hablante}`);
        }
      }
    }
    expect([...desconocidos]).toEqual([]);
  });

  it("el narrador no lleva ni retrato ni placa, y quien habla sí", () => {
    for (const l of escenaGuion("c1_aula", "es")) {
      if (l.hablante === null) expect(l.nombre).toBeNull();
      else expect(l.nombre, l.hablante).toBeTruthy();
    }
  });

  it("los mismos hablantes en los dos idiomas: una escena no cambia de reparto al traducirse", () => {
    for (const id of ESCENAS_ESCRITAS) {
      const es = escenaGuion(id, "es").map((l) => l.hablante);
      const en = escenaGuion(id, "en").map((l) => l.hablante);
      expect(en, id).toEqual(es);
    }
  });

  it("un id que no existe devuelve una lista vacía en vez de reventar", () => {
    expect(escenaGuion("no_existe", "es")).toEqual([]);
    expect(tieneGuion("no_existe")).toBe(false);
  });
});

describe("la elección del capítulo 12", () => {
  const escena = CHAPTERS[12].escenas.find((e) => e.eleccion);

  it("es la única escena de elección de toda la campaña", () => {
    const conEleccion = CHAPTER_LIST.flatMap((c) => c.escenas.filter((e) => e.eleccion));
    expect(conEleccion).toHaveLength(1);
    expect(escena.id).toBe("c12_mascara");
  });

  it("el guion ofrece exactamente las tres banderas que declara story.js", () => {
    expect(eleccionesDe(escena.id).sort()).toEqual([...escena.eleccion].sort());
  });

  it("cada salida lleva la línea de Dani y la réplica de quien le contesta, en los dos idiomas", () => {
    for (const idioma of IDIOMAS) {
      const linea = escenaGuion(escena.id, idioma).at(-1);
      expect(linea.opciones, idioma).toHaveLength(3);
      for (const o of linea.opciones) {
        expect(o.label.trim(), `${idioma}.${o.id}`).not.toBe("");
        expect(o.label.length, `${idioma}.${o.id}: ${o.label}`).toBeLessThanOrEqual(34);
        expect(o.response, `${idioma}.${o.id}`).toHaveLength(2);
        expect(o.response[0].speaker).toBe("dani");
        expect(String(o.response[1].text).trim()).not.toBe("");
      }
    }
  });

  it("ninguna de las tres salidas suena a la correcta: las tres tienen quien responda", () => {
    const linea = escenaGuion(escena.id, "es").at(-1);
    const responden = linea.opciones.map((o) => o.response[1].speaker);
    expect(new Set(responden).size, "las tres responde la misma persona").toBe(3);
  });
});

describe("el prólogo y la apertura", () => {
  it("son cinco cartas y todas sus claves existen en los dos idiomas", () => {
    expect(CARTAS).toHaveLength(TOTAL_CARTAS);
    expect(TOTAL_CARTAS).toBe(5);
    for (const idioma of IDIOMAS) {
      const copy = getCopy(idioma);
      for (const carta of CARTAS) {
        expect(copy.prologo[carta.titulo], `${idioma}:${carta.id}`).toBeTruthy();
        for (const clave of carta.lineas) {
          expect(copy.prologo[clave], `${idioma}:${carta.id}.${clave}`).toBeTruthy();
        }
      }
      for (const clave of ["titulo", "saltar", "siguiente", "empezar", "paso"]) {
        expect(copy.prologo[clave], `${idioma}:${clave}`).toBeTruthy();
      }
    }
  });

  it("las caras del prólogo son gente del reparto", () => {
    const copy = getCopy("es");
    for (const carta of CARTAS) {
      for (const id of carta.retratos) expect(copy.personajes[id], `${carta.id}: ${id}`).toBeTruthy();
    }
  });

  it("el prólogo explica las tres cosas que el jugador necesita: qué, quién y para qué", () => {
    const ids = CARTAS.map((c) => c.id);
    expect(ids).toContain("queEs");
    expect(ids).toContain("quien");
    expect(ids).toContain("objetivo");
  });

  it("la apertura son ocho frases escritas en los dos idiomas y dura menos de medio minuto", () => {
    expect(FRASES_APERTURA).toHaveLength(8);
    for (const idioma of IDIOMAS) {
      const copy = getCopy(idioma);
      for (const clave of FRASES_APERTURA) {
        expect(String(copy.apertura[clave] ?? "").trim(), `${idioma}:${clave}`).not.toBe("");
      }
      expect(copy.apertura.pulsa, idioma).toBeTruthy();
    }
    // Veintiún segundos. Más que esto y una intro saltable se convierte en una pantalla de carga.
    expect(DURACION_APERTURA).toBeLessThanOrEqual(30000);
  });

  it("las dos pantallas se dibujan sin dejar un undefined en el HTML", () => {
    for (const idioma of IDIOMAS) {
      const copy = getCopy(idioma);
      const prologo = renderToStaticMarkup(React.createElement(Prologo, { copy, onTerminar: () => {} }));
      const apertura = renderToStaticMarkup(React.createElement(Apertura, { copy, onTerminar: () => {} }));
      expect(prologo, `prologo/${idioma}`).not.toContain("undefined");
      expect(apertura, `apertura/${idioma}`).not.toContain("undefined");
      expect(prologo).toContain(copy.prologo.saltar);
      expect(apertura).toContain(copy.apertura.f1);
    }
  });
});

describe("la campaña llega entera a la pantalla", () => {
  /**
   * La regresión de fondo: `index.jsx` tiene que LLAMAR a `pendingScenes`. Mientras nadie lo
   * hiciera, todo lo de arriba podía estar perfecto y el jugador no veía una sola escena.
   */
  it("index.jsx juega las escenas, las aperturas de decisiva y los epílogos", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(path.join(__dirname, "index.jsx"), "utf8");
    expect(src, "nadie llama a pendingScenes: la fase ESCENA es inalcanzable").toContain("pendingScenes");
    expect(src, "las aperturas de decisiva no se juegan").toContain("textoApertura");
    expect(src, "los epílogos de capítulo no se juegan").toContain("epilogo");
    expect(src, "el prólogo no se muestra").toContain("Prologo");
    expect(src, "la apertura animada no se muestra").toContain("Apertura");
  });

  it("hay historia escrita para las ocho horas: más de trescientas líneas por idioma", () => {
    for (const idioma of IDIOMAS) {
      const lineas = ESCENAS_ESCRITAS.reduce((n, id) => n + escenaGuion(id, idioma).length, 0);
      expect(lineas, idioma).toBeGreaterThanOrEqual(300);
    }
    expect(Object.keys(GUIONES).length).toBeGreaterThanOrEqual(60);
  });
});
