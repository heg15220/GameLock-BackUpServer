import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { activeMission, MISSION_COUNT } from "./missions.js";
import MapaCiudad, { CITY_CONNECTIONS, routeBetween } from "./world/MapaCiudad.jsx";

describe("reestructuración narrativa de Fulgor", () => {
  it("cada capítulo tiene una misión con verbo, destino y contacto", () => {
    expect(MISSION_COUNT).toBe(12);
    for (let chapter = 1; chapter <= MISSION_COUNT; chapter += 1) {
      const mission = activeMission(chapter, "es", "aguas");
      expect(mission.title.length).toBeGreaterThan(8);
      expect(mission.instruction.length).toBeGreaterThan(24);
      expect(mission.district).toBeTruthy();
      expect(mission.contact).toBeTruthy();
    }
  });

  /**
   * LAS DOS PRUEBAS DE DIÁLOGO SE HAN IDO A `dialogue.test.js`, y con ellas el generador
   * que medían. Contaban 216 combinaciones por voz y 200 variantes para Nuria, y los dos
   * números eran ciertos: salían de multiplicar seis aperturas compartidas por seis cierres
   * compartidos por veintiún personajes. Lo que no medían era si alguna de esas frases
   * sonaba a la persona que la decía. Ahora el guion está escrito a mano, voz por voz y acto
   * por acto, y lo que se prueba es eso: que nadie comparte una frase con nadie.
   */

  it("el mapa conecta los nueve escenarios y marca la ruta hasta la misión", () => {
    expect(CITY_CONNECTIONS.length).toBeGreaterThanOrEqual(9);
    expect(routeBetween("aguas", "tolvas")).toEqual([
      "aguas", "concha", "puerto", "faro", "financiero", "hospital", "tolvas",
    ]);
    const html = renderToStaticMarkup(React.createElement(MapaCiudad, {
      copy: { distritos: Object.fromEntries(["instituto", "aguas", "poligono", "concha", "puerto", "faro", "financiero", "hospital", "tolvas"].map((id) => [id, id])) },
      actual: "aguas",
      abiertos: ["aguas", "concha", "puerto"],
      mision: { district: "tolvas" },
    }));
    expect(html).toContain("fg-city-map__road--route");
    expect(html).toContain("is-current");
    expect(html).toContain("is-mission");
  });
});
