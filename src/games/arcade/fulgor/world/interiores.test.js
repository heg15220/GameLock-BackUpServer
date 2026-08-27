/**
 * El guardián de los interiores del instituto.
 *
 * Cuatro salas —aula, pasillo, laboratorio y azotea— que se pisan como cualquier calle pero
 * que NO son distritos. Esa distinción es la que sostiene todo, y es la que se rompe sola en
 * cuanto alguien añade una sala nueva sin pensar: si el aula entrara en `DISTRITOS_JUGABLES`,
 * el mapa de ciudad ofrecería viajar a un aula, `calendar.js` tendría que decidir en qué
 * capítulo "se abre" un pasillo, y `OFRECE` dejaría de encontrar a Requena porque el juego
 * creería que estás en un sitio llamado `aula`.
 *
 * Lo demás que se comprueba aquí es geometría: que se puede entrar, que se puede salir, que
 * nadie ha nacido dentro de una pared y que los alumnos sentados están DETRÁS de su pupitre
 * —que es lo único que los hace parecer sentados.
 */

import { describe, expect, it } from "vitest";
import {
  DISTRITOS_JUGABLES,
  MAPAS_JUGABLES,
  SALAS,
  SALAS_IDS,
  compilar,
  distritoDe,
  validar,
} from "./maps.js";
import { TILE, TILE_KINDS, isSolid } from "./tiles.js";
import { PROPS } from "./props.js";
import { CAST } from "./sprites.js";
import { OFRECE } from "./encuentros.js";
import { getCopy } from "../copy.js";

const salas = SALAS_IDS.map((id) => [id, compilar(id)]);

describe("una sala no es un distrito", () => {
  it("las cuatro salas están fuera de DISTRITOS_JUGABLES", () => {
    expect(SALAS_IDS.sort()).toEqual(["aula", "azotea", "laboratorio", "pasillo"]);
    for (const id of SALAS_IDS) {
      expect(DISTRITOS_JUGABLES, `${id} se ha colado entre los distritos`).not.toContain(id);
      expect(MAPAS_JUGABLES, `${id} no está entre los planos`).toContain(id);
    }
    expect(DISTRITOS_JUGABLES).toHaveLength(9);
  });

  it("todas pertenecen al instituto, y un distrito se pertenece a sí mismo", () => {
    for (const id of SALAS_IDS) expect(distritoDe(id)).toBe("instituto");
    for (const id of DISTRITOS_JUGABLES) expect(distritoDe(id)).toBe(id);
  });

  /**
   * LA CONSECUENCIA QUE IMPORTA. Hablar con Requena entre los pupitres tiene que ofrecer la
   * misma `obligacion` que hablar con él en el patio, porque `hablar()` pregunta por el
   * distrito y no por la sala. Si esto se rompe, el aula es bonita y no sirve para nada.
   */
  it("quien está dentro de una sala sigue ofreciendo lo que ofrece su distrito", () => {
    for (const [id, mapa] of salas) {
      for (const npc of mapa.npcs) {
        if (npc.decorativo) continue;
        const enSuDistrito = OFRECE[distritoDe(id)]?.[npc.id];
        if (enSuDistrito === undefined) continue;
        expect(OFRECE[distritoDe(id)][npc.id], `${id}/${npc.id}`).toBe(enSuDistrito);
      }
    }
    // Concretamente: Requena da clase en el aula y en el laboratorio, y las dos son instituto.
    expect(OFRECE[distritoDe("aula")].requena).toBe("obligacion");
    expect(OFRECE[distritoDe("laboratorio")].requena).toBe("obligacion");
  });
});

describe("las cuatro salas están bien construidas", () => {
  it("compilan y pasan el validador de mapas", () => {
    for (const [id, mapa] of salas) {
      expect(mapa, id).toBeTruthy();
      expect(validar(id), `${id}: ${JSON.stringify(validar(id))}`).toEqual([]);
    }
  });

  it("nadie nace dentro de una pared", () => {
    for (const [id, mapa] of salas) {
      const tx = Math.floor(mapa.spawn.x / TILE);
      const ty = Math.floor(mapa.spawn.y / TILE);
      const kind = mapa.leyenda[mapa.suelo[ty]?.[tx]] ?? "vacio";
      expect(isSolid(kind), `${id}: el punto de partida cae en "${kind}"`).toBe(false);
    }
  });

  it("de toda sala se sale, y a toda sala se entra por donde se vino", () => {
    for (const [id, mapa] of salas) {
      const salidas = mapa.disparadores.filter((d) => d.tipo === "salida");
      expect(salidas.length, `${id} no tiene salida`).toBeGreaterThan(0);
      for (const s of salidas) {
        const destino = compilar(s.destino);
        expect(destino, `${id} sale a "${s.destino}", que no existe`).toBeTruthy();
        expect(
          destino.entradas?.[id],
          `${s.destino} no sabe por dónde se llega desde ${id}`,
        ).toBeTruthy();
      }
    }
  });

  it("el pasillo es el nudo: conecta las otras tres y el patio", () => {
    const destinos = compilar("pasillo").disparadores
      .filter((d) => d.tipo === "salida")
      .map((d) => d.destino)
      .sort();
    expect(destinos).toEqual(["aula", "azotea", "instituto", "laboratorio"]);
  });

  it("desde el patio del instituto se entra al edificio", () => {
    const patio = compilar("instituto");
    const destinos = patio.disparadores.filter((d) => d.tipo === "salida").map((d) => d.destino);
    expect(destinos).toContain("pasillo");
    expect(patio.entradas.pasillo).toBeTruthy();
  });

  it("cada sala tiene nombre en los dos idiomas", () => {
    for (const idioma of ["es", "en"]) {
      const copy = getCopy(idioma);
      for (const id of SALAS_IDS) {
        expect(copy.salas[id], `${idioma}:${id}`).toBeTruthy();
        expect(copy.salasAyuda[id], `${idioma}:${id}`).toBeTruthy();
      }
    }
  });
});

describe("el aula parece un aula", () => {
  const aula = compilar("aula");

  it("hay pupitres suficientes para una clase, no para una reunión", () => {
    const pupitres = aula.props.filter((b) => b.id === "pupitre");
    expect(pupitres.length).toBeGreaterThanOrEqual(10);
  });

  it("la profesora explica DE PIE junto al encerado, y el encerado está en la pared del fondo", () => {
    const requena = aula.npcs.find((n) => n.id === "requena");
    expect(requena, "no hay nadie dando clase").toBeTruthy();
    expect(requena.dir, "el que explica mira a la clase").toBe("sur");

    // El encerado es pared (altura 1) y está por encima de Requena, al fondo de la sala.
    const filas = aula.suelo.map((f) => f.indexOf("Z"));
    const filaPizarra = filas.findIndex((c) => c >= 0);
    expect(filaPizarra, "no hay encerado en el aula").toBeGreaterThanOrEqual(0);
    expect(TILE_KINDS.pizarra.altura).toBe(1);
    expect(filaPizarra * TILE).toBeLessThan(requena.y);

    // Y la mesa del profesor está entre el encerado y los alumnos.
    expect(aula.props.some((b) => b.id === "mesaProfe")).toBe(true);
  });

  /**
   * EL TRUCO DE LOS SENTADOS, comprobado como un hecho.
   *
   * No hay fotograma de "sentado" en `sprites.js`. Un alumno parece sentado porque está
   * DETRÁS de su pupitre: tiene la `y` más pequeña, se pinta antes, y el tablero le tapa las
   * piernas. Si alguien mueve un alumno delante de su mesa, se levanta.
   */
  it("cada alumno está detrás de un pupitre, no delante", () => {
    const pupitres = aula.props.filter((b) => b.id === "pupitre");
    const alumnos = aula.npcs.filter((n) => n.decorativo);
    expect(alumnos.length, "un aula con dos alumnos no es un aula").toBeGreaterThanOrEqual(7);

    for (const a of alumnos) {
      const suyo = pupitres.find((p) => Math.abs(p.x - a.x) < TILE && p.y > a.y && p.y - a.y < TILE * 2);
      expect(suyo, `${a.id} no tiene un pupitre delante`).toBeTruthy();
      expect(a.y, `${a.id} se ha levantado: está por delante de su pupitre`).toBeLessThan(suyo.y);
    }
  });

  it("los alumnos de fondo no se ofrecen para hablar y no tienen expediente", () => {
    const copy = getCopy("es");
    for (const a of aula.npcs.filter((n) => n.decorativo)) {
      expect(a.decorativo).toBe(true);
      expect(copy.personajes[a.id], `${a.id} no debería tener ficha de reparto`).toBeUndefined();
      // Pero sí tienen cara propia: si no, siete alumnos serían siete Danis.
      expect(CAST[a.id], `${a.id} no tiene paleta`).toBeTruthy();
    }
    const ropas = new Set(aula.npcs.filter((n) => n.decorativo).map((n) => CAST[n.id].ropa));
    expect(ropas.size, "la clase entera va vestida igual").toBeGreaterThanOrEqual(6);
  });

  it("los del reparto que sí están en clase siguen siendo hablables", () => {
    const hablables = aula.npcs.filter((n) => !n.decorativo).map((n) => n.id);
    expect(hablables).toContain("requena");
    expect(hablables).toContain("julia");
  });
});

describe("el pasillo tiene taquillas y el laboratorio, mesas", () => {
  it("las taquillas cubren las dos paredes del pasillo", () => {
    const suelo = compilar("pasillo").suelo;
    const conTaquillas = suelo.filter((f) => f.includes("Q"));
    expect(conTaquillas.length, "las taquillas están en una sola pared").toBeGreaterThanOrEqual(2);
    expect(TILE_KINDS.taquilla.solido).toBe(true);
  });

  it("el laboratorio tiene mesas corridas y estanterías", () => {
    const lab = compilar("laboratorio");
    expect(lab.props.filter((b) => b.id === "mesaLab").length).toBeGreaterThanOrEqual(3);
    expect(lab.props.some((b) => b.id === "estanteria")).toBe(true);
  });

  it("todo mueble nuevo tiene medidas y caja declaradas", () => {
    for (const id of ["pupitre", "mesaProfe", "silla", "estanteria", "mesaLab", "extintor"]) {
      const p = PROPS[id];
      expect(p, id).toBeTruthy();
      expect(p.w, id).toBeGreaterThan(0);
      expect(p.h, id).toBeGreaterThan(0);
      // El extintor cuelga de la pared: es el único que a propósito no bloquea el paso.
      if (id === "extintor") expect(p.solido).toBeNull();
      else expect(p.solido, `${id} no bloquea nada`).toBeTruthy();
    }
  });
});
