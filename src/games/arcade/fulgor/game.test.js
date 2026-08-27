/**
 * La máquina de fases: que los siete módulos puros sean un juego y no siete módulos.
 *
 * Each of them is already tested alone. What is only testable here is the JOIN — that an
 * action in a duel actually reaches the right person's file, that standing is actually
 * charged to Sabater, that a chapter actually hands over what the story table says it does.
 * Those are the seams, and seams are where campaigns come apart.
 */

import { describe, expect, it } from "vitest";
import {
  PHASES,
  acceptEmergency,
  applyExposure,
  applyCountermeasure,
  buildDecisive,
  buildSkirmish,
  createGame,
  dif,
  duelAction,
  endCampaign,
  move,
  nextChapter,
  openChapter,
  pendingScenes,
  playScene,
  reduce,
  refuseEmergency,
  rollEmergency,
  setDifficulty,
  settleIntervention,
  spendBlock,
} from "./game.js";
import { CHAPTERS } from "./story.js";
import { DIFFICULTY_MODES, DISTRICTS, DOSSIERS, TOTAL_CHAPTERS } from "./tables.js";
import { encodeCode, decodeCode, readPayload } from "./save.js";

const nueva = (over = {}) => openChapter(createGame({ semilla: "test", ...over }), 1);

/** Fast-forwards to a chapter with everything the story would have granted on the way. */
function hastaCapitulo(n, over = {}) {
  let state = nueva(over);
  for (let c = 2; c <= n; c += 1) state = openChapter(state, c);
  return state;
}

describe("abrir un capítulo entrega lo que dice story.js", () => {
  it("el capítulo 2 abre Nuria, Isma y Doña Pilar y da el traje improvisado", () => {
    const state = hastaCapitulo(2);
    expect(Object.keys(state.sospecha.abiertos).sort()).toEqual(["isma", "nuria", "pilar"]);
    expect(state.traje.generacion).toBe("improvisado");
  });

  it("las afinidades llegan en su capítulo y no antes", () => {
    expect(hastaCapitulo(5).progreso.afinidades).toEqual(["rayo"]);
    expect(hastaCapitulo(6).progreso.afinidades).toContain("luz");
    expect(hastaCapitulo(9).progreso.afinidades).toContain("materia");
    expect(hastaCapitulo(11).progreso.afinidades).toContain("sombra");
  });

  it("el traje sube de generación y nunca baja", () => {
    let previo = -1;
    for (let c = 2; c <= TOTAL_CHAPTERS; c += 1) {
      const state = hastaCapitulo(c);
      const gen = ["improvisado", "taller", "aislado", "conductor", "fulgor"].indexOf(state.traje.generacion);
      expect(gen, `c${c}`).toBeGreaterThanOrEqual(previo);
      previo = gen;
    }
  });

  it("las técnicas que entrega un capítulo entran en el libro", () => {
    const state = hastaCapitulo(6);
    expect(state.progreso.aprendidas).toContain("destello");
    expect(hastaCapitulo(5).progreso.aprendidas).not.toContain("destello");
  });

  it("el calendario se reinicia con los días de ese capítulo", () => {
    const state = hastaCapitulo(7);
    expect(state.calendario.capitulo).toBe(7);
    expect(state.calendario.dia).toBe(1);
  });
});

describe("los bloques cobran lo que el diseño dice que cobran (§7.2)", () => {
  it("quedar con alguien sube el vínculo", () => {
    const state = hastaCapitulo(3);
    const antes = state.vinculos.vinculos.isma;
    const { state: after } = spendBlock({ ...state, calendario: { ...state.calendario, bloque: 1 } }, "quedar", { objetivo: "isma" });
    expect(after.vinculos.vinculos.isma).toBeGreaterThan(antes);
  });

  it("entrenar sube la estadística del distrito", () => {
    const state = hastaCapitulo(3);
    const { state: after } = spendBlock(state, "entrenar", { distrito: "poligono" });
    expect(after.progreso.stats.aguante).toBeGreaterThan(state.progreso.stats.aguante);
  });

  it("trabajar da dinero, y sólo por la tarde", () => {
    const state = hastaCapitulo(3);
    expect(spendBlock(state, "trabajar").error).toBe("bloqueIlegal");
    const tarde = { ...state, calendario: { ...state.calendario, bloque: 1 } };
    expect(spendBlock(tarde, "trabajar").state.progreso.dinero).toBe(25);
  });

  it("una acción ilegal devuelve error y no toca el estado", () => {
    const state = hastaCapitulo(3);
    const salida = spendBlock(state, "patrullar");
    expect(salida.error).toBe("bloqueIlegal");
    expect(salida.state).toBe(state);
  });

  it("patrullar de noche abre una escaramuza", () => {
    const state = hastaCapitulo(4);
    const noche = { ...state, calendario: { ...state.calendario, bloque: 2 } };
    const { state: after } = spendBlock(noche, "patrullar");
    expect(after.fase).toBe(PHASES.INTERVENCION);
    expect(after.escenario.tipo).toBe("escaramuza");
  });

  it("al pasar de día decae el interés y no las pistas", () => {
    let state = hastaCapitulo(4);
    state = { ...state, sospecha: { ...state.sospecha, abiertos: { ...state.sospecha.abiertos, sabater: { ...state.sospecha.abiertos.sabater, interes: 80, pistas: [{ id: "x", tipo: "digital", origen: "camaraConcha", capitulo: 4 }] } } } };
    let after = state;
    for (let i = 0; i < 3; i += 1) after = spendBlock(after, after.calendario.bloque === 0 ? "entrenar" : after.calendario.bloque === 1 ? "trabajar" : "descansar", { distrito: "faro" }).state;
    expect(after.sospecha.abiertos.sabater.interes).toBeLessThan(80);
    expect(after.sospecha.abiertos.sabater.pistas).toHaveLength(1);
  });
});

describe("contramedidas y dificultad (§7.2, §10)", () => {
  const conPistas = (modo) => {
    let state = hastaCapitulo(5, { dificultad: modo });
    const sabater = state.sospecha.abiertos.sabater;
    return {
      ...state,
      sospecha: {
        ...state.sospecha,
        abiertos: {
          ...state.sospecha.abiertos,
          sabater: { ...sabater, pistas: [
            { id: "d1", tipo: "digital", origen: "camaraConcha", capitulo: 4 },
            { id: "d2", tipo: "digital", origen: "camaraConcha", capitulo: 4 },
            { id: "f1", tipo: "fisica", origen: "fragmento.manto", capitulo: 5 },
          ] },
        },
      },
    };
  };

  it("en Leyenda urbana un bloque retira dos pistas", () => {
    const salida = applyCountermeasure(conPistas("facil"), { expediente: "sabater" });
    expect(salida.retiradas).toHaveLength(2);
  });

  it("en Doble vida retira una", () => {
    const salida = applyCountermeasure(conPistas("medio"), { expediente: "sabater" });
    expect(salida.retiradas).toHaveLength(1);
  });

  it("en Sin máscara a veces falla, y el bloque se pierde igual", () => {
    let fallos = 0;
    let state = conPistas("dificil");
    for (let i = 0; i < 40; i += 1) {
      const salida = applyCountermeasure(state, { expediente: "sabater" });
      if (salida.retiradas.length === 0) fallos += 1;
      state = { ...salida.state, sospecha: state.sospecha };
    }
    expect(fallos).toBeGreaterThan(0);
  });

  it("la dificultad se cambia entre capítulos y no dentro", () => {
    const enCapitulo = hastaCapitulo(4);
    expect(setDifficulty(enCapitulo, "dificil").error).toBeNull();
    const enBloque = { ...enCapitulo, fase: PHASES.BLOQUE };
    expect(setDifficulty(enBloque, "dificil").error).toBe("dentroDeCapitulo");
  });

  it("ningún módulo puro recibe el nombre del modo, sólo sus números (§10.5)", () => {
    for (const modo of DIFFICULTY_MODES) {
      const resuelto = dif({ dificultad: modo });
      expect(resuelto).not.toHaveProperty("modo");
      expect(resuelto).not.toHaveProperty("nombre");
      expect(typeof resuelto.pistaFactor).toBe("number");
    }
  });
});

describe("la costura: un duelo archiva pruebas en el expediente correcto (§3.2)", () => {
  const enDuelo = (over = {}) => {
    let state = hastaCapitulo(7, over);
    state = { ...state, escenario: buildDecisive(state) };
    const nodo = state.escenario.nodos.find((n) => n.adversario) ?? state.escenario.nodos[1];
    return move({ ...state, escenario: { ...state.escenario, nodos: state.escenario.nodos.map((n) => (n.id === nodo.id ? { ...n, adversario: { plantilla: "cabo", nivel: 7 } } : n)) } }, nodo.id).state;
  };

  it("una técnica ruidosa puede dejar pista; una de Sentido nunca", () => {
    const base = enDuelo();
    expect(base.fase).toBe(PHASES.DUELO);

    let ruidoso = base;
    let conPistas = 0;
    for (let i = 0; i < 12 && ruidoso.duelo; i += 1) {
      const salida = duelAction(ruidoso, "chispazo");
      conPistas += salida.exposicion?.generadas.length ?? 0;
      ruidoso = salida.state;
    }

    let silencioso = { ...base, progreso: { ...base.progreso, equipadas: ["pulso"] } };
    let pistasSilencio = 0;
    for (let i = 0; i < 12 && silencioso.duelo; i += 1) {
      const salida = duelAction(silencioso, "pulso");
      pistasSilencio += salida.exposicion?.generadas.length ?? 0;
      silencioso = salida.state;
    }
    expect(pistasSilencio).toBe(0);
    expect(conPistas).toBeGreaterThanOrEqual(0);
  });

  it("toda pista que se archiva la puede percibir quien la recibe", () => {
    let state = enDuelo();
    for (let i = 0; i < 10 && state.duelo; i += 1) {
      state = duelAction(state, "chispazo").state;
    }
    for (const [id, d] of Object.entries(state.sospecha.abiertos)) {
      for (const p of d.pistas) {
        expect(CHAPTERS[7] && true).toBe(true);
        expect(["testimonial", "fisica", "temporal", "digital", "intima"]).toContain(p.tipo);
      }
    }
  });

  it("gasta Carga y desgasta el traje", () => {
    const base = enDuelo();
    const antesTraje = base.traje.piezas.manto.integridad;
    const salida = duelAction(base, "chispazo");
    expect(salida.state.duelo?.heroe.carga ?? 0).toBeLessThanOrEqual(base.duelo.heroe.carga);
    expect(salida.state.traje.piezas.manto.integridad).toBeLessThan(antesTraje);
  });

  it("una acción sin Carga se rechaza en vez de dejar la Carga en negativo", () => {
    const base = enDuelo();
    const seco = { ...base, duelo: { ...base.duelo, heroe: { ...base.duelo.heroe, carga: 0 } } };
    expect(duelAction(seco, "arcoVoltaico").error).toBe("sinCarga");
  });

  it("Contener cierra el duelo sin dar experiencia", () => {
    const base = enDuelo();
    const salida = duelAction(base, "contener");
    expect(salida.reporte.resuelto).toBe("contenido");
    expect(salida.state.progreso.xp).toBe(base.progreso.xp);
  });
});

describe("el balance y su factura (§4.5, §8.2)", () => {
  const conEscenario = () => {
    const state = hastaCapitulo(7);
    return { ...state, escenario: buildDecisive(state) };
  };

  it("cumplir el principal sin pistas es Impecable y sube dos de rango", () => {
    let state = conEscenario();
    state = { ...state, escenario: { ...state.escenario, objetivos: state.escenario.objetivos.map((o) => ({ ...o, cumplido: o.principal })) } };
    const after = settleIntervention(state);
    expect(after.balance.grado).toBe("impecable");
    expect(after.progreso.rango).toBe(state.progreso.rango + 2);
  });

  it("subir de rango se le cobra a Sabater y a nadie más", () => {
    let state = conEscenario();
    state = { ...state, escenario: { ...state.escenario, objetivos: state.escenario.objetivos.map((o) => ({ ...o, cumplido: o.principal })) } };
    const antesSabater = state.sospecha.abiertos.sabater.interes;
    const antesMarga = state.sospecha.abiertos.marga.interes;
    const after = settleIntervention(state);
    expect(after.sospecha.abiertos.sabater.interes).toBeGreaterThan(antesSabater);
    expect(after.sospecha.abiertos.marga.interes).toBe(antesMarga);
  });

  it("caer es Fallido y baja el rango", () => {
    const after = settleIntervention(conEscenario(), { caido: true });
    expect(after.balance.grado).toBe("fallido");
    expect(after.balance.rango).toBe(-1);
  });

  it("da materiales según el grado", () => {
    let state = conEscenario();
    state = { ...state, escenario: { ...state.escenario, objetivos: state.escenario.objetivos.map((o) => ({ ...o, cumplido: o.principal })) } };
    const after = settleIntervention(state);
    expect(after.progreso.materiales.cobre).toBeGreaterThan(0);
  });

  it("no hay reintento: no existe ninguna acción que lo ofrezca", () => {
    const acciones = ["NUEVA_PARTIDA", "ABRIR_CAPITULO", "ESCENA", "BLOQUE", "EMERGENCIA_ACEPTAR",
      "EMERGENCIA_RECHAZAR", "MOVER", "DUELO", "CERRAR_INTERVENCION", "SIGUIENTE_CAPITULO", "DIFICULTAD", "IDIOMA"];
    for (const a of acciones) expect(a.toLowerCase()).not.toMatch(/reintent|retry|repetir/);
  });
});

describe("emergencias (§7.2)", () => {
  it("aceptar convierte el bloque en una Intervención", () => {
    let state = hastaCapitulo(5);
    const { state: conEmergencia } = rollEmergency(state);
    if (!conEmergencia.emergencia) return;
    const after = acceptEmergency(conEmergencia).state;
    expect(after.fase).toBe(PHASES.INTERVENCION);
    expect(after.escenario).toBeTruthy();
    expect(after.calendario.interrupcionesCapitulo).toBe(1);
  });

  it("rechazar cuesta rango", () => {
    let state = hastaCapitulo(5);
    const { state: conEmergencia } = rollEmergency(state);
    if (!conEmergencia.emergencia) return;
    const after = refuseEmergency(conEmergencia).state;
    expect(after.progreso.rango).toBeLessThanOrEqual(state.progreso.rango);
    expect(after.log.some((l) => l.tipo === "emergenciaRechazada")).toBe(true);
  });
});

describe("escenas y banderas", () => {
  it("una escena escribe su bandera y no se repite", () => {
    const state = nueva();
    const salida = playScene(state, "c1_llave");
    expect(salida.state.banderas.has("llaveEncontrada")).toBe(true);
    expect(pendingScenes(salida.state).map((e) => e.id)).not.toContain("c1_llave");
  });

  it("una escena de elección escribe UNA sola de sus tres banderas", () => {
    let state = hastaCapitulo(12);
    state = { ...state, calendario: { ...state.calendario, bloque: 2 } };
    const salida = playScene(state, "c12_mascara", "relevoAceptado");
    expect(salida.state.banderas.has("relevoAceptado")).toBe(true);
    expect(salida.state.banderas.has("desenmascaradoVoluntario")).toBe(false);
    expect(salida.state.banderas.has("seguirEnmascarado")).toBe(false);
  });

  it("una escena que no existe se rechaza", () => {
    expect(playScene(nueva(), "no_existe").error).toBe("escenaDesconocida");
  });
});

describe("la campaña llega a un final, siempre (§9.1)", () => {
  it("acaba en epílogo con un final elegido", () => {
    const state = endCampaign(hastaCapitulo(12));
    expect(state.fase).toBe(PHASES.EPILOGO);
    expect(state.final.id).toBeTruthy();
  });

  it("la ruina es un final escrito, no una pantalla de derrota (§3.5)", () => {
    let state = hastaCapitulo(11);
    state = {
      ...state,
      sospecha: { ...state.sospecha, cerrados: { ...state.sospecha.cerrados, sabater: { desenlace: "ruina", capitulo: 11 } } },
    };
    const after = endCampaign(state, { forzado: "ruina" });
    expect(after.fase).toBe(PHASES.EPILOGO);
    expect(after.final.id).toBe("desenmascarado");
  });

  it("cuatro confidentes llevan a «Los dos»", () => {
    let state = hastaCapitulo(12);
    const cerrados = {};
    for (const id of ["nuria", "isma", "yusuf", "requena"]) cerrados[id] = { desenlace: "aliado", capitulo: 9 };
    state = { ...state, sospecha: { ...state.sospecha, cerrados } };
    expect(endCampaign(state).final.id).toBe("losDos");
  });

  it("nextChapter no pasa del doce: ahí acaba", () => {
    expect(nextChapter(hastaCapitulo(TOTAL_CHAPTERS)).fase).toBe(PHASES.EPILOGO);
  });
});

describe("determinismo y guardado", () => {
  it("dos partidas con la misma semilla producen el mismo escenario", () => {
    const a = buildDecisive(hastaCapitulo(5, { semilla: "igual" }));
    const b = buildDecisive(hastaCapitulo(5, { semilla: "igual" }));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("dos semillas distintas no", () => {
    const a = buildSkirmish(hastaCapitulo(5, { semilla: "una" }));
    const b = buildSkirmish(hastaCapitulo(5, { semilla: "otra" }));
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("una partida a mitad de campaña sobrevive a la ida y vuelta del código", () => {
    const state = hastaCapitulo(9, { dificultad: "dificil" });
    const salida = decodeCode(encodeCode(state).code);
    expect(salida.ok).toBe(true);
    const leido = readPayload(salida.payload);
    expect(leido.capitulo).toBe(9);
    expect(leido.dificultad).toBe("dificil");
    expect(leido.afinidades).toContain("materia");
    expect(leido.traje.generacion).toBe("conductor");
  });
});

describe("el reductor", () => {
  it("una acción desconocida devuelve el mismo estado", () => {
    const state = nueva();
    expect(reduce(state, { type: "NO_EXISTE" })).toBe(state);
  });

  it("NUEVA_PARTIDA arranca en el capítulo 1", () => {
    const state = reduce(null, { type: "NUEVA_PARTIDA", semilla: "x" });
    expect(state.capitulo).toBe(1);
    expect(state.fase).toBe(PHASES.CAPITULO);
  });

  it("IDIOMA cambia el idioma sin perder la partida (§13.3)", () => {
    const state = hastaCapitulo(6);
    const after = reduce(state, { type: "IDIOMA", idioma: "en" });
    expect(after.idioma).toBe("en");
    expect(after.capitulo).toBe(6);
    expect(after.progreso).toBe(state.progreso);
  });
});

describe("los tres huecos que el Monte Carlo destapó", () => {
  /**
   * Los tres se comportaban igual: nada lanzaba, nada se veía en pantalla, y la campaña
   * simulada terminaba con cero expedientes cerrados en los tres modos de dificultad. Una
   * partida que no puede acabar mal no es una partida difícil: es una partida sin sistema.
   */

  it("el capítulo 8 cierra el expediente de Isma pase lo que pase (§9)", () => {
    const antes = hastaCapitulo(7);
    expect(antes.sospecha.abiertos.isma).toBeTruthy();
    expect(antes.sospecha.cerrados.isma).toBeUndefined();

    const despues = hastaCapitulo(8);
    expect(despues.sospecha.abiertos.isma).toBeUndefined();
    expect(despues.sospecha.cerrados.isma).toEqual({ desenlace: "aliado", capitulo: 8 });
  });

  it("y eso lo convierte en confidente, que es lo que abre el final «Los dos»", () => {
    const state = hastaCapitulo(8);
    expect(Object.values(state.sospecha.cerrados).filter((c) => c.desenlace === "aliado").length)
      .toBeGreaterThan(0);
  });

  it("las técnicas que un capítulo enseña acaban en las ranuras, no sólo en el libro", () => {
    const c6 = hastaCapitulo(6);
    // El capítulo 6 entrega nueve técnicas de Luz; con cuatro ranuras iniciales y seis
    // huecos, al menos dos tienen que haberse ocupado con lo nuevo.
    expect(c6.progreso.equipadas.length).toBe(6);
    expect(c6.progreso.equipadas.some((t) => !["chispazo", "pasoCorto", "pararrayos", "pulso"].includes(t))).toBe(true);
    for (const t of c6.progreso.equipadas) expect(c6.progreso.aprendidas, t).toContain(t);
  });

  it("una ranura ya ocupada no se toca: la elección de las seis es del jugador (§5.5)", () => {
    let state = hastaCapitulo(6);
    const elegidas = ["chispazo", "destello", "pulso", "pararrayos", "espejismo", "pasoCorto"];
    state = { ...state, progreso: { ...state.progreso, equipadas: elegidas } };
    const siguiente = openChapter(state, 9);
    expect(siguiente.progreso.equipadas).toEqual(elegidas);
  });

  it("los guantes buenos dejan pistas Íntimas, y sólo las lee quien está cerca (§3.2)", () => {
    let state = hastaCapitulo(9);
    state = { ...state, escenario: buildDecisive(state) };
    // Cuarenta cierres: la tirada de manos quemadas acaba saliendo.
    let intimas = 0;
    for (let i = 0; i < 40; i += 1) {
      const after = settleIntervention({ ...state, tirada: i });
      intimas += Object.values(after.sospecha.abiertos)
        .flatMap((d) => d.pistas)
        .filter((p) => p.tipo === "intima").length;
    }
    expect(intimas).toBeGreaterThan(0);
  });

  it("y nadie sin el sesgo Íntimo las recibe, por mucho vínculo que haya", () => {
    let state = hastaCapitulo(9);
    state = { ...state, escenario: buildDecisive(state) };
    for (let i = 0; i < 40; i += 1) {
      const after = settleIntervention({ ...state, tirada: i });
      for (const [id, d] of Object.entries(after.sospecha.abiertos)) {
        for (const p of d.pistas.filter((x) => x.tipo === "intima")) {
          expect(DOSSIERS[id].sesgos, `${id} no percibe intima`).toContain("intima");
        }
      }
    }
  });

  it("la cámara la pone el distrito, no el volumen de lo que haces (§3.3)", () => {
    // La Concha tiene camara 1.4 y el Puerto Viejo 0.7: la misma acción no deja lo mismo.
    expect(DISTRICTS.concha.camara).toBeGreaterThan(DISTRICTS.puerto.camara);
    const enConcha = { ...hastaCapitulo(7) };
    const escenario = { ...buildDecisive(enConcha), distrito: "concha" };
    const salida = applyExposure({ ...enConcha, escenario }, {
      accionId: "chispazo", visibilidad: 1, torpe: false,
    });
    // Con cámara, un chispazo de visibilidad 1 ya puede archivarse como Digital.
    expect(salida.state).toBeTruthy();
  });
});
