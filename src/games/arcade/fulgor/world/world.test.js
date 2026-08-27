/**
 * FULGOR — el mundo, comprobado sin pintar un píxel.
 *
 * Todo lo que se afirma aquí se afirma sobre módulos puros. No hay canvas, no hay DOM y no
 * hay React: `sim.js`, `maps.js` y las tablas de `tiles.js` y `props.js` se diseñaron
 * separando los datos del horno justamente para que este archivo pudiera existir.
 *
 * Lo que se comprueba no son detalles de implementación, son las PROMESAS del mundo: que no
 * hay agujeros en los mapas, que nadie nace dentro de un muro, que las puertas llevan y
 * traen, que se resbala por las paredes en vez de engancharse, que no se corre más en
 * diagonal, y que quien está delante de ti es a quien le hablas.
 */

import { describe, expect, it } from "vitest";

import { TILE, TILE_KINDS, isSolid, paintTile, variantAt } from "./tiles.js";
import { PROPS, PROP_IDS, cajaSolida, paintProp } from "./props.js";
import { ANCHO, ALTO, DISTRITOS_JUGABLES, LEYENDA, compilar, validar } from "./maps.js";
import {
  HITBOX, VELOCIDAD, createWorld, dirDe, disparadorBajo, interlocutor,
  libre, mover, seguirCamara, step, tamanoMapa,
} from "./sim.js";
import { ordenarPorProfundidad } from "./render.js";
import { encuentro, encuentroLugar, ofertasDe } from "./encuentros.js";
import {
  SEPARACION, TOLERANCIA_SOMBRA, alcanzables, anclar, conosDeVision, nodoBajoLosPies,
  puntosDeInteres, radioSegunTamano, vistoPor,
} from "./escenario.js";
import { CAST, SPRITE_H, SPRITE_W, WALK_CYCLE, paintCharacter, paintPortrait, sheetSource } from "./sprites.js";

/* ── Los mapas ───────────────────────────────────────────────────────────────────── */

describe("los distritos de Marés", () => {
  it.each(DISTRITOS_JUGABLES)("%s es una rejilla íntegra", (id) => {
    expect(validar(id)).toEqual([]);
  });

  it.each(DISTRITOS_JUGABLES)("%s mide exactamente %s×%s", (id) => {
    const mapa = compilar(id);
    expect(mapa.suelo).toHaveLength(ALTO);
    for (const fila of mapa.suelo) expect(fila).toHaveLength(ANCHO);
  });

  /**
   * La comprobación que evita el fallo más caro de todos: un personaje colocado dentro de un
   * muro o encima de un coche no se puede mover, y el jugador lo lee como que el juego se ha
   * roto. Pasó de verdad con Ismael, que nacía dentro del maletero de un coche aparcado.
   */
  it.each(DISTRITOS_JUGABLES)("en %s nadie nace dentro de algo sólido", (id) => {
    const mapa = compilar(id);
    expect(libre(mapa, mapa.spawn.x, mapa.spawn.y)).toBe(true);
    for (const npc of mapa.npcs) {
      expect(libre(mapa, npc.x, npc.y), `${npc.id} está atrapado`).toBe(true);
    }
    for (const [origen, punto] of Object.entries(mapa.entradas)) {
      expect(libre(mapa, punto.x, punto.y), `la entrada desde ${origen} está tapiada`).toBe(true);
    }
  });

  /** Los puntos de una rutina de paseo tienen que ser alcanzables o el NPC empuja una pared. */
  it.each(DISTRITOS_JUGABLES)("en %s las rutas de paseo pisan suelo libre", (id) => {
    for (const npc of compilar(id).npcs) {
      for (const p of npc.rutina?.puntos ?? []) {
        expect(libre(compilar(id), p.x, p.y), `${npc.id} pasea contra algo`).toBe(true);
      }
    }
  });

  it("toda salida construida tiene su entrada de vuelta", () => {
    for (const id of DISTRITOS_JUGABLES) {
      const mapa = compilar(id);
      for (const salida of mapa.disparadores) {
        if (!DISTRITOS_JUGABLES.includes(salida.destino)) continue;
        expect(compilar(salida.destino).entradas[id], `${id} → ${salida.destino}`).toBeTruthy();
      }
    }
  });

  it("cada carácter de la leyenda es un tipo de tile real", () => {
    for (const kind of Object.values(LEYENDA)) expect(TILE_KINDS[kind]).toBeTruthy();
  });
});

/* ── Colisión ────────────────────────────────────────────────────────────────────── */

/** Un mapa mínimo de laboratorio: una sala de 5×5 con las paredes cerradas. */
function salaDePruebas(filas = [
  "#####",
  "#...#",
  "#...#",
  "#...#",
  "#####",
]) {
  return {
    id: "prueba",
    suelo: filas,
    leyenda: { "#": "muro", ".": "asfalto", "~": "agua" },
    props: [],
    bultos: [],
    npcs: [],
    disparadores: [],
    entradas: {},
    spawn: { x: TILE * 2.5, y: TILE * 2.5, dir: "sur" },
  };
}

describe("colisión", () => {
  it("la caja de choque son los pies, no el cuerpo entero", () => {
    // Ancha de 10 y alta de 7 sobre un sprite de 16×24: si chocara el cuerpo, no cabría por
    // ningún hueco de un tile.
    expect(HITBOX.w).toBeLessThan(SPRITE_W);
    expect(HITBOX.h).toBeLessThan(SPRITE_H / 2);
  });

  it("un muro detiene el avance", () => {
    const mapa = salaDePruebas();
    const actor = { x: TILE * 2.5, y: TILE * 2.5 };
    mover(mapa, actor, 0, -100);
    // Se queda pegado bajo la fila 1, nunca dentro de la fila 0.
    expect(actor.y).toBeGreaterThan(TILE);
    expect(libre(mapa, actor.x, actor.y)).toBe(true);
  });

  /**
   * La promesa del deslizamiento. Entrar en diagonal contra una pared horizontal tiene que
   * seguir moviendo en X: resolver los dos ejes a la vez clavaría al personaje en la esquina,
   * que es la sensación de "juego barato" que este archivo existe para impedir.
   */
  it("se resbala por la pared en vez de engancharse", () => {
    const mapa = salaDePruebas();
    const actor = { x: TILE * 1.6, y: TILE * 1.9 };
    const antesX = actor.x;
    mover(mapa, actor, 6, -30); // hacia la derecha y contra el muro de arriba
    expect(actor.x).toBeGreaterThan(antesX);
  });

  it("los bultos bloquean aunque el tile de debajo sea libre", () => {
    const mapa = salaDePruebas();
    mapa.bultos = [{ x: TILE * 2, y: TILE * 2, w: TILE, h: TILE }];
    expect(libre(mapa, TILE * 2.5, TILE * 2.9)).toBe(false);
    expect(libre(mapa, TILE * 3.6, TILE * 2.9)).toBe(true);
  });

  it("el agua es sólida: no se cruza la dársena andando", () => {
    expect(isSolid("agua")).toBe(true);
  });

  /** Si puedes cruzar a tu hermana, tu hermana no está ahí. */
  it("la gente ocupa sitio: no se atraviesa a un NPC", () => {
    const mapa = salaDePruebas(["........", "........", "........", "........", "........", "........"]);
    const gente = [{ id: "nuria", x: TILE * 2.5, y: TILE * 3.5 }];
    expect(libre(mapa, TILE * 2.5, TILE * 3.5, { gente })).toBe(false);
    expect(libre(mapa, TILE * 2.5, TILE * 3.5)).toBe(true); // sin pasar gente, sigue libre
  });

  it("pero se puede pasar por al lado de alguien en una acera estrecha", () => {
    const mapa = salaDePruebas(["........", "........", "........", "........", "........", "........"]);
    const gente = [{ id: "pilar", x: TILE * 2.5, y: TILE * 3.5 }];
    expect(libre(mapa, TILE * 2.5 + HITBOX.w * 0.7, TILE * 3.5, { gente })).toBe(true);
  });

  it("el héroe se para ante un NPC y no lo atropella", () => {
    const mapa = salaDePruebas(["........", "........", "........", "........", "........", "........"]);
    let estado = createWorld(mapa);
    estado.npcs = [{ id: "nuria", x: estado.heroe.x, y: estado.heroe.y + 20, rutina: null }];
    for (let i = 0; i < 60; i += 1) estado = step(estado, { entrada: { abajo: true }, dt: 1 / 60 });
    expect(estado.heroe.y).toBeLessThan(estado.npcs[0].y);
  });
});

/* ── Movimiento ──────────────────────────────────────────────────────────────────── */

describe("andar", () => {
  it("no se corre más rápido en diagonal", () => {
    const mapa = salaDePruebas(["........", "........", "........", "........", "........", "........"]);
    const recto = step(createWorld(mapa), { entrada: { der: true }, dt: 1 });
    const diagonal = step(createWorld(mapa), { entrada: { der: true, abajo: true }, dt: 1 });

    const dRecto = Math.hypot(recto.heroe.x - mapa.spawn.x, recto.heroe.y - mapa.spawn.y);
    const dDiag = Math.hypot(diagonal.heroe.x - mapa.spawn.x, diagonal.heroe.y - mapa.spawn.y);
    expect(dDiag).toBeCloseTo(dRecto, 1);
    expect(dRecto).toBeCloseTo(VELOCIDAD, 0);
  });

  it("el ciclo de andar avanza con la distancia, no con el reloj", () => {
    const mapa = salaDePruebas();
    // Pegado al muro DE VERDAD: los pies ocupan `y - HITBOX.h .. y`, así que el tope de
    // arriba está en la primera fila libre más el alto de la caja. Colocado ahí, empujar
    // hacia el muro no recorre ni un píxel, y el paso no puede progresar: si progresara, el
    // personaje movería las piernas quieto — patinando.
    let estado = createWorld(mapa, { spawn: { x: TILE * 2.5, y: TILE + HITBOX.h } });
    const y0 = estado.heroe.y;
    for (let i = 0; i < 30; i += 1) estado = step(estado, { entrada: { arriba: true }, dt: 1 / 60 });
    expect(estado.heroe.y).toBe(y0);
    expect(estado.heroe.paso).toBe(0);
  });

  it("el paso SÍ progresa cuando de verdad se recorre distancia", () => {
    const mapa = salaDePruebas(["........", "........", "........", "........", "........", "........"]);
    let estado = createWorld(mapa);
    for (let i = 0; i < 30; i += 1) estado = step(estado, { entrada: { der: true }, dt: 1 / 60 });
    expect(estado.heroe.paso).toBeGreaterThan(1);
  });

  it("congelado, el héroe no se mueve aunque la tecla esté pulsada", () => {
    const mapa = salaDePruebas();
    const antes = createWorld(mapa);
    const despues = step(antes, { entrada: { der: true }, dt: 1, congelado: true });
    expect(despues.heroe.x).toBe(antes.heroe.x);
    expect(despues.heroe.andando).toBe(false);
  });

  it("el eje dominante manda y el empate no hace temblar la cabeza", () => {
    expect(dirDe(1, 0)).toBe("este");
    expect(dirDe(0, 1)).toBe("sur");
    expect(dirDe(0, -1)).toBe("norte");
    expect(dirDe(-1, 0)).toBe("oeste");
    // En diagonal perfecta gana siempre el horizontal, de forma estable.
    expect(dirDe(1, 1)).toBe("este");
    expect(dirDe(1, 1)).toBe(dirDe(1, 1));
    // Quieto, se conserva la dirección previa.
    expect(dirDe(0, 0, "norte")).toBe("norte");
  });
});

/* ── Hablar ──────────────────────────────────────────────────────────────────────── */

describe("con quién se puede hablar", () => {
  const conNpc = (dx, dy, dir) => {
    const mapa = salaDePruebas(["........", "........", "........", "........", "........", "........"]);
    const estado = createWorld(mapa);
    estado.heroe.dir = dir;
    estado.npcs = [{ id: "nuria", x: estado.heroe.x + dx, y: estado.heroe.y + dy }];
    return estado;
  };

  it("responde quien está delante", () => {
    expect(interlocutor(conNpc(0, 14, "sur"))?.id).toBe("nuria");
    expect(interlocutor(conNpc(14, 0, "este"))?.id).toBe("nuria");
  });

  /**
   * El filtro que impide el peor fallo de una plaza con cinco personas: mirar a alguien y
   * que te conteste el que tienes detrás porque estaba un píxel más cerca.
   */
  it("no responde quien está a la espalda", () => {
    expect(interlocutor(conNpc(0, -14, "sur"))).toBeNull();
    expect(interlocutor(conNpc(-14, 0, "este"))).toBeNull();
  });

  it("no responde quien está lejos", () => {
    expect(interlocutor(conNpc(0, 90, "sur"))).toBeNull();
  });
});

/* ── Disparadores y cámara ───────────────────────────────────────────────────────── */

describe("salidas y cámara", () => {
  /**
   * Las dos acciones del día que no tienen interlocutor viven en el mapa como sitios. Si
   * alguna se perdiera, el jugador se quedaría sin poder dormir ni salir de ronda, y como
   * ya no hay menú de bloque no tendría por dónde hacerlo: éste es el test que sostiene
   * que quitar los nueve botones no dejó nada colgando.
   */
  it("dormir y patrullar tienen sitio en el mundo", () => {
    const lugares = compilar("aguas").disparadores.filter((d) => d.tipo === "lugar");
    expect(lugares.map((l) => l.accion).sort()).toEqual(["descansar", "patrullar"]);
    for (const l of lugares) {
      expect(libre(compilar("aguas"), l.x + l.w / 2, l.y + l.h / 2), `${l.id} es inalcanzable`).toBe(true);
    }
  });

  it("las nueve acciones del día tienen quien o dónde", () => {
    // Siete personas repartidas por los cuatro distritos construidos, más los dos sitios.
    const dePersonas = new Set(
      DISTRITOS_JUGABLES.flatMap((d) => ofertasDe(d).map((o) => o.accion)),
    );
    const deLugares = new Set(
      DISTRITOS_JUGABLES.flatMap((d) => compilar(d).disparadores.filter((t) => t.tipo === "lugar").map((t) => t.accion)),
    );
    const cubiertas = new Set([...dePersonas, ...deLugares]);
    for (const accion of [
      "obligacion", "quedar", "entrenar", "taller", "trabajar",
      "investigar", "contramedidas", "patrullar", "descansar",
    ]) {
      expect(cubiertas.has(accion), `nadie ni nada ofrece "${accion}"`).toBe(true);
    }
  });

  it("un sitio habla sin retrato: no hay nadie ahí", () => {
    const { lineas, accion } = encuentroLugar("portal", "descansar", { legal: true, idioma: "es" });
    expect(lineas.length).toBeGreaterThan(0);
    expect(lineas[0].hablante).toBeNull();
    expect(accion).toBe("descansar");
  });

  it("fuera de su bloque, el sitio lo dice y NO gasta la acción", () => {
    const { lineas, accion } = encuentroLugar("muelle", "patrullar", { legal: false, idioma: "es" });
    expect(lineas.length).toBeGreaterThan(0);
    expect(accion).toBeNull();
  });

  it("una persona fuera de su bloque tampoco gasta el bloque", () => {
    expect(encuentro("chapa", "poligono", { legal: true }).accion).toBe("taller");
    expect(encuentro("chapa", "poligono", { legal: false }).accion).toBeNull();
    // Pero sigue hablando: el "ahora no" tiene voz propia, no es un botón gris.
    expect(encuentro("chapa", "poligono", { legal: false }).lineas.length).toBeGreaterThan(0);
  });

  it("el disparador se detecta al pisarlo", () => {
    const mapa = salaDePruebas();
    mapa.disparadores = [{ tipo: "salida", destino: "concha", x: 0, y: 0, w: TILE, h: TILE * 5 }];
    expect(disparadorBajo(mapa, { x: 8, y: 20 })?.destino).toBe("concha");
    expect(disparadorBajo(mapa, { x: 60, y: 20 })).toBeNull();
  });

  it("la cámara no se asoma fuera del mapa", () => {
    const mapa = compilar("aguas");
    const { w, h } = tamanoMapa(mapa);
    const vista = { w: 176, h: 144 };
    for (const esquina of [{ x: 0, y: 0 }, { x: w, y: h }, { x: w, y: 0 }, { x: 0, y: h }]) {
      const cam = seguirCamara({ x: 0, y: 0 }, esquina, mapa, vista);
      expect(cam.x).toBeGreaterThanOrEqual(0);
      expect(cam.y).toBeGreaterThanOrEqual(0);
      expect(cam.x).toBeLessThanOrEqual(w - vista.w);
      expect(cam.y).toBeLessThanOrEqual(h - vista.h);
    }
  });

  /**
   * La caja muerta se mide desde el CENTRO de la cámara, así que hay que partir de una
   * cámara centrada en el héroe. Partir de {0,0} lo deja pegado al borde de la caja, y
   * desde el borde cualquier paso empuja — que es justo lo que la caja tiene que hacer.
   */
  it("la caja muerta deja moverse sin arrastrar la cámara", () => {
    const mapa = compilar("aguas");
    const vista = { w: 176, h: 144 };
    const heroe = { x: 250, y: 250 };
    const centrada = { x: heroe.x - vista.w / 2, y: heroe.y - 8 - vista.h / 2 };

    // Dentro de la caja: la cámara no se inmuta.
    const quieta = seguirCamara(centrada, { x: heroe.x + 20, y: heroe.y }, mapa, vista);
    expect(quieta.x).toBe(centrada.x);

    // Pasado el borde de la caja: empuja exactamente lo que sobra.
    const empujada = seguirCamara(centrada, { x: heroe.x + 40, y: heroe.y }, mapa, vista);
    expect(empujada.x).toBeGreaterThan(centrada.x);
  });
});

/* ── La Intervención, aterrizada ─────────────────────────────────────────────────── */

/**
 * Lo que sustituye a los tests del plano de nodos.
 *
 * Ya no hay grafo que dibujar, así que no hay "un anillo por nodo" que contar. Lo que hay
 * que sostener es más importante: que el grafo cae en suelo que se puede pisar, que la
 * distancia no miente, y que el cono de visión dibuja exactamente lo que el motor cobra.
 */
describe("el grafo aterriza sobre el plano", () => {
  const escenarioFalso = (nNodos = 8) => {
    const nodos = Array.from({ length: nNodos }, (_, i) => ({
      id: `n${i}`, indice: i, visibilidad: i % 3 === 0 ? 0.4 : 1.2,
      adversario: null, civil: false, prueba: null,
    }));
    // Una cadena: n0 — n1 — n2 … El nodo i está a i saltos de la entrada.
    const aristas = nodos.slice(1).map((n, i) => ({
      a: `n${i}`, b: n.id, via: i % 2 === 0 ? "visible" : "sombra",
    }));
    return {
      tipo: "estandar", distrito: "aguas", nodos, aristas,
      entrada: "n0", posicion: "n0",
      testigos: [{ id: "sabater", nodo: "n2" }],
      objetivos: [{ id: "principal", principal: true, tipo: "neutralizar", nodo: `n${nNodos - 1}`, cumplido: false }],
      reloj: { turno: 0, max: 9, agravamientos: [] }, log: [],
    };
  };

  it.each(DISTRITOS_JUGABLES)("en %s los sitios derivados son pisables y alcanzables", (id) => {
    const mapa = compilar(id);
    const puntos = puntosDeInteres(mapa, 14);
    expect(puntos.length).toBeGreaterThanOrEqual(8);
    const vivos = alcanzables(mapa, Math.round(mapa.spawn.x / TILE), Math.round(mapa.spawn.y / TILE));
    const ancho = mapa.suelo[0].length;
    for (const p of puntos) {
      expect(libre(mapa, p.x, p.y), `sitio en (${p.tx},${p.ty}) no es pisable`).toBe(true);
      expect(vivos.has(p.ty * ancho + p.tx), `sitio en (${p.tx},${p.ty}) es una isla`).toBe(true);
    }
  });

  it("los sitios no se amontonan: guardan la separación mínima", () => {
    const puntos = puntosDeInteres(compilar("concha"), 14);
    for (let i = 0; i < puntos.length; i += 1) {
      for (let j = i + 1; j < puntos.length; j += 1) {
        const d = Math.hypot(puntos[i].tx - puntos[j].tx, puntos[i].ty - puntos[j].ty);
        expect(d).toBeGreaterThanOrEqual(SEPARACION - 0.001);
      }
    }
  });

  it("es determinista: el mismo distrito da siempre los mismos sitios", () => {
    const a = puntosDeInteres(compilar("puerto") ?? compilar("aguas"), 10);
    const b = puntosDeInteres(compilar("puerto") ?? compilar("aguas"), 10);
    expect(a.map((p) => `${p.tx},${p.ty}`)).toEqual(b.map((p) => `${p.tx},${p.ty}`));
  });

  it("todo nodo del escenario recibe una posición pisable", () => {
    const mapa = compilar("aguas");
    const esc = escenarioFalso(8);
    const pos = anclar(esc, mapa);
    for (const nodo of esc.nodos) {
      expect(pos[nodo.id], `${nodo.id} sin sitio`).toBeTruthy();
      expect(libre(mapa, pos[nodo.id].x, pos[nodo.id].y)).toBe(true);
    }
  });

  /**
   * La correspondencia que sostiene el reloj: si el objetivo principal está lejos en el
   * grafo —y `placeObjectives` lo pone ahí a propósito— también tiene que estar lejos a pie.
   * Sin esto, el juego cobraría seis turnos por un paseo de dos pasos.
   */
  it("lo que está lejos en el grafo está lejos A PIE", () => {
    const mapa = compilar("aguas");
    const esc = escenarioFalso(8);
    const pos = anclar(esc, mapa);

    // A PIE, no en línea recta. La otra orilla de la dársena está a diez metros en recto y
    // a media ciudad andando; medir en recto haría fallar a este test justamente cuando el
    // módulo está haciendo lo correcto.
    expect(pos[esc.objetivos[0].nodo].pasos).toBeGreaterThan(pos.n3.pasos);
    // Y la cadena es monótona salvo por el margen que el desempate de sombra se concede:
    // dos pasos, declarados en `TOLERANCIA_SOMBRA`, no un número inventado en este test.
    for (let i = 1; i < 8; i += 1) {
      expect(pos[`n${i}`].pasos, `n${i} se adelantó a n${i - 1} más de lo tolerado`)
        .toBeGreaterThanOrEqual(pos[`n${i - 1}`].pasos - TOLERANCIA_SOMBRA);
    }
  });

  /**
   * Una escaramuza es una esquina, no un barrio. Con el distrito entero disponible, sus tres
   * nodos quedaban a medio minuto de caminata el uno del otro y dos minutos de pelea se
   * convertían en un trayecto con nada en medio.
   */
  it("una escaramuza ocupa una esquina y una decisiva se come el distrito", () => {
    const mapa = compilar("aguas");
    const alcance = (n) => {
      const p = puntosDeInteres(mapa, n, { radio: radioSegunTamano(n) });
      return Math.max(...p.map((x) => x.pasos));
    };
    expect(alcance(4)).toBeLessThanOrEqual(radioSegunTamano(4));
    expect(alcance(14)).toBeGreaterThan(alcance(4));
  });

  it("un escenario con más nodos que sitios no deja a nadie sin coordenada", () => {
    const mapa = compilar("aguas");
    const esc = escenarioFalso(14);
    const pos = anclar(esc, mapa);
    expect(Object.keys(pos)).toHaveLength(14);
  });

  /**
   * La promesa del §7 del rediseño: el cono NO es una regla nueva, es el dibujo de la que ya
   * hay. Se abre hacia los vecinos por arista VISIBLE y hacia ningún otro sitio. Si esto se
   * rompiera, un jugador podría esquivar un cono y aun así pagar visibilidad, y ahí se cae
   * la credibilidad de la pantalla entera.
   */
  it("el cono sólo mira hacia donde el motor dice que se ve", () => {
    const mapa = compilar("aguas");
    const esc = escenarioFalso(8);
    const pos = anclar(esc, mapa);
    const conos = conosDeVision(esc, pos);
    expect(conos).toHaveLength(1);

    const cono = conos[0];
    // El testigo está en n2, con aristas n1—n2 (sombra, i=1) y n2—n3 (visible, i=2).
    const haciaVisible = pos.n3;
    const haciaSombra = pos.n1;
    const anguloA = Math.atan2(haciaVisible.y - cono.y, haciaVisible.x - cono.x);
    expect(cono.arcos.some((a) => Math.abs(a.angulo - anguloA) < 0.01)).toBe(true);
    const anguloB = Math.atan2(haciaSombra.y - cono.y, haciaSombra.x - cono.x);
    expect(cono.arcos.some((a) => Math.abs(a.angulo - anguloB) < 0.01)).toBe(false);
  });

  it("estar dentro del cono se detecta, y fuera no", () => {
    const cono = { id: "t", x: 100, y: 100, apertura: Math.PI / 4, arcos: [{ angulo: 0, alcance: 50 }] };
    expect(vistoPor([cono], 130, 100)).toEqual(["t"]);   // delante y cerca
    expect(vistoPor([cono], 70, 100)).toEqual([]);        // detrás
    expect(vistoPor([cono], 200, 100)).toEqual([]);       // delante pero lejos
  });

  it("pisar un sitio se detecta por los pies", () => {
    const mapa = compilar("aguas");
    const esc = escenarioFalso(6);
    const pos = anclar(esc, mapa);
    const encima = { x: pos.n4.x, y: pos.n4.y };
    expect(nodoBajoLosPies(esc, pos, encima)).toBe("n4");
    expect(nodoBajoLosPies(esc, pos, { x: pos.n4.x + 200, y: pos.n4.y + 200 })).toBeNull();
  });
});

/* ── Profundidad ─────────────────────────────────────────────────────────────────── */

describe("profundidad", () => {
  it("quien está más abajo se pinta después", () => {
    const props = [{ id: "farola", y: 100 }, { id: "banco", y: 300 }];
    const actores = [{ id: "dani", y: 200 }];
    const orden = ordenarPorProfundidad(props, actores).map((o) => o.dato.id);
    expect(orden).toEqual(["farola", "dani", "banco"]);
  });

  it("el héroe pasa por detrás de la farola cuando está por encima de ella", () => {
    const props = [{ id: "farola", y: 200 }];
    const arriba = ordenarPorProfundidad(props, [{ id: "dani", y: 180 }]).map((o) => o.dato.id);
    const abajo = ordenarPorProfundidad(props, [{ id: "dani", y: 220 }]).map((o) => o.dato.id);
    expect(arriba).toEqual(["dani", "farola"]);   // detrás: se pinta antes
    expect(abajo).toEqual(["farola", "dani"]);    // delante: se pinta después
  });

  it("la fusión conserva todo lo que entra", () => {
    const props = [{ id: "a", y: 1 }, { id: "b", y: 5 }, { id: "c", y: 9 }];
    const actores = [{ id: "x", y: 0 }, { id: "y", y: 7 }];
    expect(ordenarPorProfundidad(props, actores)).toHaveLength(5);
  });
});

/* ── El arte, como datos ─────────────────────────────────────────────────────────── */

describe("el arte es determinista", () => {
  it("el mismo tile da siempre los mismos píxeles", () => {
    const a = paintTile("adoquin", 2).data;
    const b = paintTile("adoquin", 2).data;
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it("la variante de una celda es estable", () => {
    expect(variantAt(7, 11)).toBe(variantAt(7, 11));
    expect(variantAt(7, 11)).not.toBe(variantAt(7, 12) === variantAt(7, 11) ? -1 : variantAt(7, 11) + 100);
  });

  it("todo tipo de tile sabe pintarse y ninguno sale transparente", () => {
    for (const kind of Object.keys(TILE_KINDS)) {
      const { data } = paintTile(kind, 0);
      const opacos = data.filter((_, i) => i % 4 === 3 && data[i] > 0).length;
      expect(opacos, `${kind} sale vacío`).toBeGreaterThan(0);
    }
  });

  it("todo bulto se pinta dentro de su caja declarada", () => {
    for (const id of PROP_IDS) {
      const { w, h, data } = paintProp(id, 0);
      expect(w).toBe(PROPS[id].w);
      expect(h).toBe(PROPS[id].h);
      expect(data).toHaveLength(w * h * 4);
    }
  });

  it("la caja sólida de un bulto se ancla a sus pies", () => {
    const caja = cajaSolida("contenedor", 100, 200);
    expect(caja.y + caja.h).toBe(200);
    expect(caja.x + caja.w / 2).toBe(100);
  });

  it("los bultos sin caja sólida se pueden atravesar", () => {
    expect(cajaSolida("porteria", 0, 0)).toBeNull();
  });
});

describe("los personajes", () => {
  it("todo el reparto se pinta en las tres direcciones", () => {
    for (const id of Object.keys(CAST)) {
      for (const dir of ["sur", "norte", "este", "oeste"]) {
        const p = paintCharacter(id, dir, 0);
        expect(p.w).toBe(SPRITE_W);
        expect(p.h).toBe(SPRITE_H);
        const opacos = Array.from(p.data).filter((_, i) => i % 4 === 3 && p.data[i] > 0).length;
        expect(opacos, `${id} ${dir} sale vacío`).toBeGreaterThan(40);
      }
    }
  });

  /** El oeste es el este reflejado: si no lo fuera, la mitad del reparto miraría mal. */
  it("el oeste es el espejo del este", () => {
    const este = paintCharacter("dani", "este", 1);
    const oeste = paintCharacter("dani", "oeste", 1);
    for (let y = 0; y < SPRITE_H; y += 1) {
      for (let x = 0; x < SPRITE_W; x += 1) {
        expect(oeste.alphaAt(x, y)).toBe(este.alphaAt(SPRITE_W - 1 - x, y));
      }
    }
  });

  it("el ciclo de andar vuelve al reposo cada dos pasos", () => {
    expect(WALK_CYCLE[0]).toBe(0);
    expect(WALK_CYCLE[2]).toBe(0);
    expect(new Set(WALK_CYCLE).size).toBe(3);
  });

  it("sheetSource marca el espejo sólo para el oeste", () => {
    expect(sheetSource("oeste", 0).espejo).toBe(true);
    expect(sheetSource("este", 0).espejo).toBe(false);
    expect(sheetSource("sur", 0).sy).toBe(0);
  });

  /**
   * La promesa de `sprites.js`: el traje que se monta es el que se ve. Si el sprite con
   * traje fuera idéntico al de calle, todo el sistema de seis ranuras seguiría siendo una
   * hoja de cálculo, que es exactamente lo que este rediseño vino a arreglar.
   */
  it("el traje cambia el sprite", () => {
    const calle = paintCharacter("dani", "sur", 0);
    const traje = paintCharacter("dani", "sur", 0, {
      traje: { mascara: "#1d2733", torso: "#1f2b3d", guantes: "#38e1ff", botas: "#243247", cinturon: "#c8a44a", manto: "#132033" },
    });
    expect(Array.from(traje.data)).not.toEqual(Array.from(calle.data));
  });

  it("los cuatro ánimos dan cuatro retratos distintos", () => {
    const vistos = new Set();
    for (const animo of ["neutro", "tenso", "decidido", "roto"]) {
      vistos.add(Array.from(paintPortrait("dani", animo).data).join(","));
    }
    expect(vistos.size).toBe(4);
  });
});
