/**
 * El guardián del §13, escrito con la primera línea de diálogo y no con la última.
 *
 * Two failures render as the word "undefined" on screen and nothing louder: a key that
 * exists in one locale and not the other, and a screen reaching for a key that was renamed
 * out from under it. Neither shows up in any other test.
 *
 * And one failure that is worse because it is invisible even on screen: an English version
 * that is a word-for-word carry of the Spanish. §13.2 says the English is an adaptation, so
 * the places where the design names a specific divergence are checked as facts.
 */

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { LOCALES, countOf, fillTemplate, getCopy } from "./copy.js";
import {
  AFFINITIES,
  BLOCKS,
  BLOCK_ACTIONS,
  CLUE_TYPES,
  DIFFICULTY_MODES,
  DISTRICTS,
  DOSSIERS,
  DOSSIER_STATES,
  ENDINGS,
  INTERVENTION_RESULTS,
  MATERIALS,
  STATS,
  SUIT_GENERATION_ORDER,
  SUIT_SLOTS,
  TECHNIQUES,
  TECH_FAMILIES,
  TOTAL_CHAPTERS,
} from "./tables.js";

const keysOf = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v) ? keysOf(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );

/**
 * Pairs, not paths. Some keys legitimately contain a dot — `pistaOrigen["fragmento.manto"]`
 * mirrors the `origen` string `suit.js` actually emits — so walking a joined path back down
 * the object would look for a `fragmento` that is not there.
 */
const entriesOf = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v) ? entriesOf(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]],
  );

describe("paridad es/en", () => {
  it("tiene exactamente las mismas claves en los dos idiomas", () => {
    const es = keysOf(getCopy("es")).sort();
    const en = keysOf(getCopy("en")).sort();
    expect(en.filter((k) => !es.includes(k)), "sobran en inglés").toEqual([]);
    expect(es.filter((k) => !en.includes(k)), "faltan en inglés").toEqual([]);
  });

  it("ninguna cadena está vacía en ninguno de los dos", () => {
    for (const locale of LOCALES) {
      for (const [clave, valor] of entriesOf(getCopy(locale))) {
        expect(typeof valor, `${locale}:${clave}`).toBe("string");
        expect(valor.trim(), `${locale}:${clave} vacía`).not.toBe("");
      }
    }
  });

  it("un idioma desconocido cae al español, que es el idioma de origen", () => {
    expect(getCopy("fr")).toBe(getCopy("es"));
    expect(getCopy()).toBe(getCopy("es"));
  });
});

describe("todo lo que el modelo tiene, tiene palabras", () => {
  const cubre = (seccion, ids, etiqueta) => {
    it(`${etiqueta}, en los dos idiomas`, () => {
      for (const locale of LOCALES) {
        const copy = getCopy(locale);
        for (const id of ids) {
          expect(copy[seccion]?.[id], `${locale}: falta ${seccion}.${id}`).toBeTruthy();
        }
      }
    });
  };

  cubre("tecnicas", Object.keys(TECHNIQUES), "las cuarenta técnicas tienen nombre");
  cubre("tecnicasAyuda", Object.keys(TECHNIQUES), "las cuarenta técnicas tienen descripción");
  cubre("stats", STATS, "las siete estadísticas");
  cubre("statsAyuda", STATS, "las siete estadísticas se explican");
  cubre("afinidades", AFFINITIES, "las cuatro afinidades");
  cubre("familias", TECH_FAMILIES, "las cinco familias");
  cubre("pistas", CLUE_TYPES, "los cinco tipos de pista");
  cubre("pistasAyuda", CLUE_TYPES, "los cinco tipos de pista se explican");
  cubre("estados", DOSSIER_STATES, "los cuatro estados de expediente");
  cubre("distritos", Object.keys(DISTRICTS), "los nueve distritos");
  cubre("distritosAyuda", Object.keys(DISTRICTS), "los nueve distritos tienen carácter");
  cubre("bloques", BLOCKS, "los tres bloques del día");
  cubre("acciones", BLOCK_ACTIONS, "las nueve acciones de bloque");
  cubre("accionesAyuda", BLOCK_ACTIONS, "las nueve acciones se explican");
  cubre("ranuras", SUIT_SLOTS, "las seis ranuras del traje");
  cubre("ranurasAyuda", SUIT_SLOTS, "las seis ranuras dicen su compromiso");
  cubre("generaciones", SUIT_GENERATION_ORDER, "las cinco generaciones de traje");
  cubre("materiales", MATERIALS, "los seis materiales");
  cubre("resultados", INTERVENTION_RESULTS, "los cinco resultados de Intervención");
  cubre("dificultades", DIFFICULTY_MODES, "los tres modos de dificultad");
  cubre("finales", Object.keys(ENDINGS), "los siete finales");
  cubre("finalesTexto", Object.keys(ENDINGS), "los siete finales tienen epílogo");
  cubre("personajes", Object.keys(DOSSIERS), "todo expediente tiene nombre");
  cubre("personajesRol", Object.keys(DOSSIERS), "todo expediente tiene quién es");

  it("los doce capítulos tienen título y entradilla", () => {
    for (const locale of LOCALES) {
      const copy = getCopy(locale);
      for (let c = 1; c <= TOTAL_CHAPTERS; c += 1) {
        expect(copy.capitulos[`c${c}`], `${locale}: título c${c}`).toBeTruthy();
        expect(copy.capitulosIntro[`c${c}`], `${locale}: entradilla c${c}`).toBeTruthy();
      }
    }
  });
});

describe("el inglés es una adaptación, no una traducción (§13.2)", () => {
  it("Marés sigue siendo Marés y los topónimos no se traducen", () => {
    const en = getCopy("en");
    expect(en.distritos.puerto).toBe("Puerto Viejo");
    expect(en.distritos.concha).toBe("La Concha");
    expect(en.distritos.faro).toBe("Cerro del Faro");
    expect(en.distritos.tolvas).toBe("Las Tolvas");
    expect(en.distritos.aguas).toContain("Aguas");
  });

  it("los personajes conservan su nombre en los dos idiomas", () => {
    const es = getCopy("es");
    const en = getCopy("en");
    for (const id of ["dani", "nuria", "isma", "julia", "marga"]) {
      expect(en.personajes[id], id).toBe(es.personajes[id]);
    }
  });

  it("Doña Pilar no tiene equivalente: el inglés lo resuelve con contexto (§13.2)", () => {
    expect(getCopy("en").personajes.pilar).toBe("Doña Pilar");
    expect(getCopy("en").personajesRol.pilar).toMatch(/Doña Pilar/);
  });

  it("los nombres de técnica se aprueban por cómo suenan, no por literalidad", () => {
    const en = getCopy("en").tecnicas;
    // Los cuatro criterios que el propio documento pone como ejemplo.
    expect(en.punoTormenta).toBe("Thunderfist");
    expect(en.arcoVoltaico).toBe("Arc Flash");
    expect(en.vaho).toBe("Blackout Step");
    expect(en.fulgor).toBe("Blaze");
    // Y el título del juego se mantiene, porque es un nombre propio.
    expect(getCopy("en").meta.titulo).toBe("FULGOR");
  });

  it("los nombres de técnica difieren de los españoles salvo donde coinciden de verdad", () => {
    const es = getCopy("es").tecnicas;
    const en = getCopy("en").tecnicas;
    const iguales = Object.keys(TECHNIQUES).filter((id) => es[id] === en[id]);
    // Prisma, Aurora, Ancla/Anchor no cuentan: son cognados reales, no pereza.
    expect(iguales.length, `demasiados nombres sin adaptar: ${iguales}`).toBeLessThan(6);
  });

  it("la cabecera del periódico se adapta, no se calca", () => {
    expect(getCopy("es").prensa.cabecera).toBe("El Faro de Marés");
    expect(getCopy("en").prensa.cabecera).toBe("The Marés Beacon");
  });

  it("los titulares ingleses van en gramática de titular: sin artículo inicial", () => {
    const en = getCopy("en").prensa;
    for (const clave of ["favorable", "neutra", "negativa"]) {
      // Los marcadores van en minúscula a propósito: `{distrito}` es una clave, no una palabra.
      const soloTexto = en[clave].replace(/\{\w+\}/g, "");
      expect(soloTexto, clave).toBe(soloTexto.toUpperCase());
      expect(en[clave], clave).not.toMatch(/^(THE|A|AN)\s/);
    }
  });

  it("los tres modos se adaptan con los nombres que fija el §10.5", () => {
    const en = getCopy("en").dificultades;
    expect(en.facil).toBe("Urban Legend");
    expect(en.medio).toBe("Double Life");
    expect(en.dificil).toBe("No Mask");
  });

  it("los informes de Sabater están escritos dos veces, en jerga policial de cada idioma", () => {
    expect(getCopy("es").informe.apartadoPruebas).toBe("ELEMENTOS OBRANTES");
    expect(getCopy("en").informe.apartadoPruebas).toBe("MATERIAL HELD");
    expect(getCopy("en").informe.pieDePagina).not.toMatch(/Do not spread/i);
  });
});

describe("plantillas y recuentos (§13.3)", () => {
  it("nunca concatena: las variables van dentro de la plantilla", () => {
    expect(fillTemplate("Le faltan {n} pruebas", { n: 3 })).toBe("Le faltan 3 pruebas");
    expect(fillTemplate("{quien} lo sabe.", { quien: "Nuria" })).toBe("Nuria lo sabe.");
  });

  it("una variable que no llega se deja marcada en vez de imprimir undefined", () => {
    expect(fillTemplate("Quedan {n} turnos", {})).toBe("Quedan {n} turnos");
    expect(fillTemplate(undefined, { n: 1 })).toBe("");
  });

  it("toda línea con número tiene singular y plural, y son distintos, en los dos idiomas", () => {
    const CONTADAS = [
      ["expediente", "pistasUna", "pistas"],
      ["expediente", "faltaUna", "faltan"],
      ["intervencion", "turnoUno", "turnos"],
    ];
    for (const locale of LOCALES) {
      const copy = getCopy(locale);
      for (const [seccion, uno, muchos] of CONTADAS) {
        expect(copy[seccion]?.[uno], `${locale}: ${seccion}.${uno}`).toBeTruthy();
        expect(copy[seccion]?.[muchos], `${locale}: ${seccion}.${muchos}`).toBeTruthy();
        expect(copy[seccion][uno], `${locale}: ${seccion}.${uno} == plural`).not.toBe(copy[seccion][muchos]);
      }
    }
  });

  it("countOf coge el singular exactamente en uno, en los dos sentidos", () => {
    expect(countOf("una", "muchas", 1)).toBe("una");
    expect(countOf("una", "muchas", -1)).toBe("una");
    expect(countOf("una", "muchas", 0)).toBe("muchas");
    expect(countOf("una", "muchas", 2)).toBe("muchas");
  });

  it("nunca escribe un plural pelado detrás de un 1", () => {
    for (const locale of LOCALES) {
      const copy = getCopy(locale);
      const linea = fillTemplate(countOf(copy.intervencion.turnoUno, copy.intervencion.turnos, 1), { n: 1 });
      expect(linea, locale).not.toMatch(/\b1 (turnos|turns|pruebas|pieces)\b/);
    }
  });
});

describe("la caja de 352 px (§13.3)", () => {
  /**
   * An English string that fits in Spanish and overflows in English is a bug in the English
   * version, not a detail. Buttons are the tightest surface in the game, so their strings
   * are held to a length that survives the real mobile box.
   */
  it("ninguna etiqueta de botón pasa de 22 caracteres en ningún idioma", () => {
    const BOTONES = ["empezar", "partidaNueva", "continuar", "importarCodigo", "volver", "cerrar",
      "aceptar", "cancelar", "siguiente", "confirmar", "guardar", "opciones", "pausa", "saltar"];
    for (const locale of LOCALES) {
      const copy = getCopy(locale);
      for (const b of BOTONES) {
        expect(copy.ui[b].length, `${locale}:ui.${b} = "${copy.ui[b]}"`).toBeLessThanOrEqual(22);
      }
    }
  });

  it("los nombres de técnica caben en el botón del panel inferior", () => {
    for (const locale of LOCALES) {
      const copy = getCopy(locale);
      for (const id of Object.keys(TECHNIQUES)) {
        expect(copy.tecnicas[id].length, `${locale}:${id} = "${copy.tecnicas[id]}"`).toBeLessThanOrEqual(20);
      }
    }
  });

  it("los nombres de las nueve acciones de bloque caben en su tarjeta", () => {
    for (const locale of LOCALES) {
      const copy = getCopy(locale);
      for (const id of BLOCK_ACTIONS) {
        expect(copy.acciones[id].length, `${locale}:${id}`).toBeLessThanOrEqual(24);
      }
    }
  });
});

describe("ninguna cadena vive en un componente (§13.1)", () => {
  /**
   * The rule only holds if it is enforced. Any JSX in this folder that renders a bare
   * Spanish or English sentence has broken the bilingual contract, and it will not be found
   * by looking at the English build — it will be found by an English player.
   */
  const jsxFiles = () =>
    fs.readdirSync(__dirname).filter((f) => f.endsWith(".jsx") && !f.endsWith(".test.jsx"));

  it("ningún .jsx del juego lleva texto en castellano escrito a mano", () => {
    const ofensas = [];
    for (const file of jsxFiles()) {
      const src = fs.readFileSync(path.join(__dirname, file), "utf8");
      // Texto entre etiquetas con acento o ñ: sólo puede venir de copy.js.
      for (const m of src.matchAll(/>([^<>{}\n]*[áéíóúñÁÉÍÓÚÑ¿¡][^<>{}\n]*)</g)) {
        if (m[1].trim().length > 2) ofensas.push(`${file}: ${m[1].trim()}`);
      }
    }
    expect(ofensas).toEqual([]);
  });

  it("toda ruta copy.x.y que un componente pide existe de verdad", () => {
    const es = getCopy("es");
    const faltan = [];
    for (const file of jsxFiles()) {
      const src = fs.readFileSync(path.join(__dirname, file), "utf8");
      for (const m of src.matchAll(/\bcopy\.([a-zA-Z]+)\.([a-zA-Z]+)/g)) {
        const [, seccion, clave] = m;
        if (es[seccion]?.[clave] === undefined) faltan.push(`${file}: ${seccion}.${clave}`);
      }
    }
    expect([...new Set(faltan)]).toEqual([]);
  });
});
