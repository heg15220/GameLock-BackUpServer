/**
 * FULGOR — el paso de una zona a otra, y de un bloque al siguiente.
 *
 * Copia la forma de la transición de dormir de Valle Tranquilo, que es la que ya funciona
 * en este catálogo: **velo a negro → cartela → el mundo cambia DETRÁS → vuelta**.
 *
 * LO QUE HACE QUE ESTO NO SEA UN ADORNO. Un corte seco entre distritos es un fallo de
 * lectura: el jugador ve otra calle de golpe y durante medio segundo no sabe si se ha
 * movido, si ha pasado el tiempo o si el juego ha fallado. El velo compra tres cosas a la
 * vez — tapa el reencuadre de la cámara, da sitio a decir DÓNDE estás ahora, y convierte
 * un salto en un viaje. Valle Tranquilo lo usa para dormir por la misma razón.
 *
 * EL CAMBIO OCURRE CON EL TELÓN ECHADO. `alFundir` se llama en el punto negro, nunca antes:
 * si el distrito cambiara durante el fundido, se vería un fotograma del mapa nuevo con la
 * cámara del viejo.
 */

import React, { useEffect, useRef, useState } from "react";

/**
 * Los dos ritmos.
 *
 * Un cambio de zona es corto: no ha pasado nada, sólo has cruzado una calle. Un cambio de
 * bloque —o de día— es largo y tiene DOS cartelas, como el dormir de Valle Tranquilo:
 * primero lo que dejas atrás, luego lo que empieza. La diferencia de duración es lo que
 * hace que el jugador note que ha gastado algo sin que nadie se lo diga.
 */
export const RITMOS = {
  zona:   { entra: 380, negro: 520, sale: 380, segunda: null },
  bloque: { entra: 520, negro: 900, sale: 520, segunda: 900 },
};

/**
 * `paso` lleva su propio `alFundir` y su propio `sello`, y el efecto depende SÓLO del sello.
 *
 * Ésa es la parte que hay que mirar despacio. Con los callbacks en la lista de dependencias
 * —y siendo funciones nuevas en cada render, como lo son las flechas en línea— el efecto se
 * volvía a montar en cada repintado: los temporizadores se limpiaban y arrancaban otra vez,
 * el punto negro se disparaba varias veces y el telón no bajaba nunca del todo. Un sello por
 * cruce y las funciones dentro del propio `paso` cierran esa puerta.
 */
export default function Transicion({ paso, onFin }) {
  const [visible, setVisible] = useState(false);
  const [carta, setCarta] = useState(null);
  const temporizadores = useRef([]);
  const onFinRef = useRef(onFin);
  onFinRef.current = onFin;
  const pasoRef = useRef(paso);
  pasoRef.current = paso;
  const sello = paso?.sello ?? null;

  useEffect(() => {
    const limpiar = () => {
      temporizadores.current.forEach(clearTimeout);
      temporizadores.current = [];
    };
    limpiar();
    const actual = pasoRef.current;
    if (!actual) {
      setVisible(false);
      setCarta(null);
      return limpiar;
    }

    const ritmo = RITMOS[actual.ritmo] ?? RITMOS.zona;
    const espera = (ms, fn) => temporizadores.current.push(setTimeout(fn, ms));

    setCarta({ titulo: actual.titulo, subtitulo: actual.subtitulo });
    setVisible(true);

    // Punto negro: aquí, y sólo aquí, cambia el mundo.
    espera(ritmo.entra, () => actual.alFundir?.());

    let fin = ritmo.entra + ritmo.negro;
    if (ritmo.segunda && actual.segunda) {
      espera(fin, () => setCarta(actual.segunda));
      fin += ritmo.segunda;
    }

    espera(fin, () => setVisible(false));
    espera(fin + ritmo.sale, () => onFinRef.current?.());

    return limpiar;
  }, [sello]);

  if (!paso) return null;

  return (
    <div className={`fg-cruce ${visible ? "fg-cruce--on" : ""}`} aria-hidden="true">
      <div className="fg-cruce__carta">
        <span className="fg-cruce__titulo">{carta?.titulo}</span>
        {carta?.subtitulo && <span className="fg-cruce__sub">{carta.subtitulo}</span>}
      </div>
    </div>
  );
}
