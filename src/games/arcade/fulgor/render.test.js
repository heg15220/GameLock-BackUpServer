/**
 * Cada pantalla, renderizada de verdad.
 *
 * Los once módulos de este juego están probados como lógica pura, y el JSX estaría probado
 * leyéndolo — que es exactamente el hueco por el que se cuelan tres tipos de fallo, todos
 * con la misma forma: código que sólo se ejecuta cuando un componente se dibuja.
 *
 *   - un `useMemo` cuya lista de dependencias lee un `const` declarado veinte líneas más
 *     abajo, que revienta en cuanto se abre esa fase;
 *   - una clave de `copy` referenciada desde el JSX que no existe en la tabla;
 *   - un componente que asume una forma de estado que el reductor nunca produce.
 *
 * `react-dom/server` no necesita DOM: ejecuta el cuerpo del componente, todos los hooks que
 * no son efectos y el árbol entero. Ahí viven los tres. No coge nada de lo que ocurre
 * después de montar —efectos, temporizadores, clics— y no lo pretende: es lo más barato que
 * habría cogido lo que de verdad se rompe.
 *
 * SE ESCRIBE CON `React.createElement` Y NO CON JSX porque `vitest.config.js` recoge
 * `src/**\/*.test.js` y un `.js` no pasa por el transformador de JSX. Es el mismo patrón que
 * `sports/trayectoria/render.test.js`, por la misma razón.
 *
 * Y HAY UNA COMPROBACIÓN QUE SÓLO SE PUEDE HACER AQUÍ: que las dos versiones del juego
 * dibujan. Una cadena inglesa que falta no la ve `copy.test.js` si el componente la pide por
 * una ruta calculada; aquí se ve, como un `undefined` en el marcado.
 */

import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { getCopy } from "./copy.js";
// El texto de las escenas ya no vive en copy.js: `copy.escenas` era un bloque muerto que
// sólo cubría c1-c3. El guion completo de los doce capítulos está en `guiones/`.
import { escenaGuion } from "./guiones/index.js";
import { Icon, ICON_IDS, VisibilityDots } from "./icons.jsx";
import { CAST, EXPRESSIONS, Portrait, PortraitDefs, Silhouette, mezclar } from "./portraits.jsx";
import {
  DuelStage,
  Epilogue,
  InterventionHeader,
  SceneText,
  Stage,
  TechniqueCut,
} from "./scene.jsx";
import {
  BalancePanel,
  DossierPanel,
  DuelMenu,
  EmergencyPanel,
  InterventionPanel,
  Meters,
  WorkshopPanel,
} from "./board.jsx";
import * as juego from "./game.js";
import { createSuit } from "./suit.js";
import { resolveDifficulty, TECHNIQUES, TOTAL_CHAPTERS } from "./tables.js";

const h = React.createElement;
const pinta = (tipo, props = {}, ...hijos) => renderToStaticMarkup(h(tipo, props, ...hijos));

const LOCALES = ["es", "en"];
const medio = resolveDifficulty("medio");

/** Un estado en un capítulo dado, con todo lo que la historia habría entregado por el camino. */
function hasta(n, over = {}) {
  let estado = juego.openChapter(juego.createGame({ semilla: "render", ...over }), 1);
  for (let c = 2; c <= n; c += 1) estado = juego.openChapter(estado, c);
  return estado;
}

function enDuelo(capitulo = 7) {
  let estado = hasta(capitulo);
  estado = { ...estado, escenario: juego.buildDecisive(estado) };
  const nodo = estado.escenario.nodos.find((x) => x.id !== estado.escenario.posicion);
  estado = {
    ...estado,
    escenario: {
      ...estado.escenario,
      nodos: estado.escenario.nodos.map((x) =>
        (x.id === nodo.id ? { ...x, adversario: { plantilla: "cabo", nivel: capitulo } } : x)),
    },
  };
  return juego.move(estado, nodo.id).state;
}

/** El fallo que este archivo existe para coger: `undefined` impreso en la pantalla. */
const sinIndefinidos = (marcado, etiqueta) => {
  expect(marcado, `${etiqueta}: imprime undefined`).not.toMatch(/undefined/);
  expect(marcado, `${etiqueta}: imprime [object Object]`).not.toMatch(/\[object Object\]/);
  expect(marcado.length, `${etiqueta}: no ha dibujado nada`).toBeGreaterThan(20);
};

describe("iconos", () => {
  it("los cincuenta y pico dibujan", () => {
    expect(ICON_IDS.length).toBeGreaterThan(50);
    for (const id of ICON_IDS) {
      expect(pinta(Icon, { nombre: id }), id).toContain(`/assets/fulgor/ui/${id}.svg`);
    }
  });

  it("un icono que no existe devuelve nada en vez de reventar", () => {
    expect(pinta(Icon, { nombre: "no-existe" })).toBe("");
  });

  it("los puntitos de visibilidad dibujan los tres, llenos y vacíos", () => {
    for (const nivel of [0, 1, 2, 3]) {
      const html = pinta(VisibilityDots, { nivel });
      expect((html.match(/<i/g) ?? []).length, `nivel ${nivel}`).toBe(3);
      expect(html).toContain(`data-nivel="${nivel}"`);
    }
  });

  it("y aguantan un nivel fuera de rango sin dibujar cuatro puntos", () => {
    expect(pinta(VisibilityDots, { nivel: 9 })).toContain('data-nivel="3"');
    expect(pinta(VisibilityDots, { nivel: -4 })).toContain('data-nivel="0"');
  });
});

describe("el rig de retratos", () => {
  it("los veintidós del reparto dibujan en las cuatro expresiones y en las dos vidas", () => {
    for (const id of Object.keys(CAST)) {
      for (const expresion of EXPRESSIONS) {
        for (const variante of ["civil", "heroe"]) {
          const html = pinta(Portrait, { id, expresion, variante });
          sinIndefinidos(html, `${id}/${expresion}/${variante}`);
          expect(html, id).toContain(`/assets/fulgor/portraits/${id}-${expresion}.svg`);
        }
      }
    }
  });

  it("son veintidós fichas, no ciento treinta dibujos", () => {
    expect(Object.keys(CAST).length).toBeGreaterThanOrEqual(20);
    expect(EXPRESSIONS).toHaveLength(4);
  });

  it("un personaje sin ficha sale con cara por defecto en vez de un hueco", () => {
    sinIndefinidos(pinta(Portrait, { id: "alguien-sin-ficha" }), "por defecto");
  });

  it("la variante de noche cambia los colores del mismo dibujo", () => {
    expect(pinta(Portrait, { id: "dani", variante: "civil" }))
      .not.toBe(pinta(Portrait, { id: "dani", variante: "heroe" }));
  });

  it("las siluetas dibujan, con brillo y sin él", () => {
    sinIndefinidos(pinta(Silhouette, { id: "dani", brillo: true }), "silueta con brillo");
    sinIndefinidos(pinta(Silhouette, { id: "larga" }), "silueta lisa");
  });

  it("los retratos externos no inyectan filtros SVG duplicados", () => {
    const html = pinta("svg", {}, h(PortraitDefs));
    expect(html).toBe("<svg></svg>");
  });

  it("mezclar interpola hacia el color de destino", () => {
    expect(mezclar("#ffffff", "#000000", 0)).toBe("#ffffff");
    expect(mezclar("#ffffff", "#000000", 1)).toBe("#000000");
    expect(mezclar("#ffffff", "#000000", 0.5)).toBe("#808080");
  });
});

describe("el panel superior, en los dos idiomas", () => {
  for (const locale of LOCALES) {
    const copy = getCopy(locale);

    it(`la cabecera de Intervención dice qué va a empeorar [${locale}]`, () => {
      const escenario = juego.buildDecisive(hasta(5));
      sinIndefinidos(pinta(InterventionHeader, { escenario, copy }), `cabecera/${locale}`);
    });

    it(`el escenario del duelo dibuja [${locale}]`, () => {
      sinIndefinidos(pinta(DuelStage, { duelo: enDuelo().duelo, copy }), `duelo/${locale}`);
    });

    it(`los cuarenta cortes de cámara dibujan [${locale}]`, () => {
      for (const id of Object.keys(TECHNIQUES)) {
        const html = pinta(TechniqueCut, { tecnicaId: id, copy });
        sinIndefinidos(html, `corte/${id}/${locale}`);
        expect(html, id).toContain(copy.tecnicas[id]);
      }
    });

    it(`los siete epílogos dibujan [${locale}]`, () => {
      for (const id of Object.keys(copy.finales)) {
        sinIndefinidos(pinta(Epilogue, { final: { id }, copy }), `epilogo/${id}/${locale}`);
      }
    });

    it(`una escena con retrato dibuja [${locale}]`, () => {
      const html = pinta(SceneText, { quien: "nuria", texto: escenaGuion("c1_casa", locale)[2].texto, expresion: "tenso", copy });
      sinIndefinidos(html, `escena/${locale}`);
      expect(html).toContain(copy.personajes.nuria);
    });
  }

  /**
   * Aquí había dos tests del plano de nodos —que dibujaba un anillo por nodo, y que un
   * escenario nulo no lo rompía—. El plano ya no existe: la Intervención se camina, y lo
   * que hay que sostener ahora es que el grafo aterriza en suelo pisable. Eso vive en
   * `world/world.test.js`, que puede afirmarlo sin montar un DOM.
   */
});

describe("el panel inferior, en los dos idiomas", () => {
  for (const locale of LOCALES) {
    const copy = getCopy(locale);

    it(`el menú de duelo trae coste, probabilidad y visibilidad antes de elegir [${locale}]`, () => {
      const estado = enDuelo();
      const html = pinta(DuelMenu, { duelo: estado.duelo, escenario: estado.escenario, copy, dif: medio });
      sinIndefinidos(html, `menuDuelo/${locale}`);
      // La promesa del §5.5: los puntitos están, uno por acción con visibilidad.
      expect(html).toContain("fg-vis");
      expect(html).toContain(copy.duelo.contener);
    });

    /**
     * Aquí se comprobaba que el menú de bloque ofrecía las nueve acciones. Ese menú ya no
     * existe: las nueve son gente y sitios de Marés. Lo que hay que sostener ahora —que
     * ninguna se ha quedado sin quien ni sin dónde— vive en `world/world.test.js`.
     */

    it(`el panel de expedientes dibuja en los tres modos [${locale}]`, () => {
      const estado = hasta(9);
      const primero = Object.keys(estado.sospecha.abiertos)[0];
      estado.sospecha.abiertos[primero].pistas = [
        { id: "p1", tipo: "digital", origen: "camaraConcha", capitulo: 4 },
      ];
      for (const modo of ["facil", "medio", "dificil"]) {
        const html = pinta(DossierPanel, { sospecha: estado.sospecha, copy, dif: resolveDifficulty(modo) });
        sinIndefinidos(html, `expedientes/${modo}/${locale}`);
      }
    });

    it(`el taller dibuja las seis ranuras [${locale}]`, () => {
      const html = pinta(WorkshopPanel, {
        traje: createSuit("conductor"),
        materiales: { cobre: 3, fibra: 2 },
        copy,
      });
      sinIndefinidos(html, `taller/${locale}`);
      for (const slot of Object.keys(copy.ranuras)) {
        expect(html, `${locale}:${slot}`).toContain(copy.ranuras[slot]);
      }
    });

    it(`el balance dibuja los cinco resultados y no ofrece reintentar [${locale}]`, () => {
      for (const grado of Object.keys(copy.resultados)) {
        const html = pinta(BalancePanel, {
          balance: { grado, rango: 1, opcionalesCumplidos: 1, opcionalesTotales: 2, turnosUsados: 6, turnosDisponibles: 12 },
          copy,
        });
        sinIndefinidos(html, `balance/${grado}/${locale}`);
        expect(html.toLowerCase(), grado).not.toMatch(/reintent|retry|volver a intentar/);
      }
    });

    it(`la emergencia ofrece las dos salidas [${locale}]`, () => {
      const html = pinta(EmergencyPanel, {
        emergencia: { id: "e1", distrito: "concha", bloque: "tarde", dia: 2 },
        copy,
      });
      sinIndefinidos(html, `emergencia/${locale}`);
      expect(html).toContain(copy.ui.aceptar);
      expect(html).toContain(copy.ui.cancelar);
    });

    it(`el panel de Intervención explica las dos rutas [${locale}]`, () => {
      const html = pinta(InterventionPanel, { escenario: juego.buildDecisive(hasta(6)), copy });
      sinIndefinidos(html, `intervencion/${locale}`);
      expect(html).toContain(copy.intervencion.rutaVisible);
      expect(html).toContain(copy.intervencion.rutaSombra);
    });

    it(`las dos barras dicen su escalón, no sólo su color [${locale}]`, () => {
      const estado = enDuelo();
      for (const compostura of [100, 55, 25, 8]) {
        const html = pinta(Meters, { heroe: { ...estado.duelo.heroe, compostura }, copy, dif: medio });
        sinIndefinidos(html, `barras/${compostura}/${locale}`);
        expect(html, `${compostura}`).toMatch(/data-escalon="[a-z]+"/);
      }
    });
  }
});

describe("el despachador de fases dibuja todas las fases", () => {
  it("ninguna fase deja el panel superior en blanco por sorpresa", () => {
    const copy = getCopy("es");
    const conDuelo = enDuelo();
    const casos = [
      { fase: juego.PHASES.INTERVENCION, escenario: conDuelo.escenario },
      { fase: juego.PHASES.DUELO, duelo: conDuelo.duelo },
      { fase: juego.PHASES.EPILOGO, final: { id: "secretoIntacto" } },
      { fase: juego.PHASES.ESCENA, escena: { quien: "isma", texto: escenaGuion("c1_pasillo", "es")[0].texto } },
    ];
    for (const caso of casos) {
      sinIndefinidos(pinta(Stage, { ...caso, copy, velocidad: 10 }), caso.fase);
    }
  });

  it("las fases civiles usan un escenario de capítulo en vez de quedar en blanco", () => {
    const html = pinta(Stage, { fase: juego.PHASES.BLOQUE, copy: getCopy("es") });
    expect(html).toContain("fg-chapter-backdrop");
    expect(html).toContain("/assets/fulgor/districts/aguas.png");
  });
});

describe("recorrido por los doce capítulos", () => {
  /**
   * The one test that would have caught a chapter opening into a screen that cannot draw —
   * a technique granted in chapter 9 with no name in `copy`, an antagonist with no portrait,
   * a district with no music. Twelve chapters times two languages, drawn.
   */
  it("cada capítulo dibuja su cabecera de Intervención en los dos idiomas", () => {
    for (let c = 1; c <= TOTAL_CHAPTERS; c += 1) {
      const escenario = juego.buildDecisive(hasta(c));
      for (const locale of LOCALES) {
        sinIndefinidos(pinta(InterventionHeader, { escenario, copy: getCopy(locale) }), `c${c}/cabecera/${locale}`);
      }
    }
  });

  it("toda técnica que el jugador puede llevar equipada tiene nombre y descripción", () => {
    const estado = hasta(TOTAL_CHAPTERS);
    for (const locale of LOCALES) {
      const copy = getCopy(locale);
      for (const id of estado.progreso.aprendidas) {
        expect(copy.tecnicas[id], `${locale}:${id}`).toBeTruthy();
        expect(copy.tecnicasAyuda[id], `${locale}:${id}`).toBeTruthy();
      }
    }
  });

  it("todo antagonista del guion tiene silueta", () => {
    for (let c = 1; c <= TOTAL_CHAPTERS; c += 1) {
      const escenario = juego.buildDecisive(hasta(c));
      const id = escenario.guion?.antagonista?.id;
      if (!id) continue;
      sinIndefinidos(pinta(Silhouette, { id }), `c${c}/${id}`);
    }
  });
});

describe("el alta en el catalogo", () => {
  /**
   * Importar `index.jsx` de verdad es lo unico que coge un import roto en la composicion —
   * el arbol de modulos entero, el CSS y el utilitario de idioma del repositorio incluidos.
   * Un `resolveBrowserLanguage` importado con la forma equivocada no lo ve ningun otro test
   * de este juego: lo ve el jugador, con la pantalla en blanco.
   */
  it("index.jsx se importa entero y exporta el componente", async () => {
    const modulo = await import("./index.jsx");
    expect(typeof modulo.default).toBe("function");
  });

  it("el registro de juegos lo tiene dado de alta", async () => {
    const registro = await import("../../registry.jsx");
    const mapa = registro.GAME_REGISTRY ?? registro.default;
    expect(mapa["arcade-fulgor"]).toBeTruthy();
  });

  it("y el segundo registro, el de GamePlayground, tambien", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(path.join(__dirname, "..", "..", "..", "components", "GamePlayground.jsx"), "utf8");
    expect(src).toMatch(/"arcade-fulgor":\s*FulgorGame/);
  });
});
