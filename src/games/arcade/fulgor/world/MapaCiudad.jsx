import React, { useMemo } from "react";

export const CITY_NODES = {
  instituto: { x: 66, y: 42 },
  aguas: { x: 142, y: 86 },
  poligono: { x: 212, y: 32 },
  concha: { x: 220, y: 132 },
  puerto: { x: 310, y: 164 },
  faro: { x: 375, y: 105 },
  financiero: { x: 300, y: 62 },
  hospital: { x: 214, y: 205 },
  tolvas: { x: 105, y: 205 },
};

export const CITY_CONNECTIONS = [
  ["instituto", "aguas"], ["instituto", "concha"], ["aguas", "poligono"],
  ["aguas", "concha"], ["concha", "puerto"], ["puerto", "faro"],
  ["faro", "financiero"], ["financiero", "hospital"], ["hospital", "tolvas"],
];

export function routeBetween(from, to) {
  if (!CITY_NODES[from] || !CITY_NODES[to]) return [];
  const queue = [[from]];
  const seen = new Set([from]);
  while (queue.length) {
    const route = queue.shift();
    const last = route.at(-1);
    if (last === to) return route;
    for (const [a, b] of CITY_CONNECTIONS) {
      const next = a === last ? b : b === last ? a : null;
      if (next && !seen.has(next)) {
        seen.add(next);
        queue.push([...route, next]);
      }
    }
  }
  return [];
}

const edgeInRoute = (route, a, b) => {
  const ia = route.indexOf(a);
  const ib = route.indexOf(b);
  return ia >= 0 && ib >= 0 && Math.abs(ia - ib) === 1;
};

export default function MapaCiudad({ copy, idioma = "es", actual, abiertos = [], mision }) {
  const route = useMemo(() => routeBetween(actual, mision?.district), [actual, mision?.district]);
  const labels = idioma === "en"
    ? { title: "Marés city map", open: "Open", locked: "Locked", here: "You are here", mission: "Mission", route: "Recommended route", next: "Next: {place}", arrived: "You are in the mission district" }
    : { title: "Mapa de Marés", open: "Abierto", locked: "Bloqueado", here: "Estás aquí", mission: "Misión", route: "Ruta recomendada", next: "Siguiente: {place}", arrived: "Estás en el distrito de la misión" };
  const openSet = new Set(abiertos);
  const next = route[1] ?? null;

  return (
    <section className="fg-city-map" aria-label={labels.title}>
      <header className="fg-city-map__head">
        <div>
          <span className="fg-eyebrow">{labels.route}</span>
          <h2 className="fg-display fg-display--sm">{labels.title}</h2>
        </div>
        <p>{next
          ? labels.next.replace("{place}", copy.distritos?.[next] ?? next)
          : labels.arrived}</p>
      </header>

      <div className="fg-city-map__frame">
        <svg viewBox="0 0 440 245" role="img" aria-label={labels.title}>
          <defs>
            <filter id="fg-map-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <path className="fg-city-map__coast" d="M8 18C80 3 136 18 183 13s91-20 147 2 83 4 102 24v198H8z" />
          {CITY_CONNECTIONS.map(([a, b]) => (
            <line
              key={`${a}-${b}`}
              x1={CITY_NODES[a].x} y1={CITY_NODES[a].y}
              x2={CITY_NODES[b].x} y2={CITY_NODES[b].y}
              className={edgeInRoute(route, a, b) ? "fg-city-map__road fg-city-map__road--route" : "fg-city-map__road"}
            />
          ))}
          {Object.entries(CITY_NODES).map(([id, point]) => {
            const isCurrent = id === actual;
            const isMission = id === mision?.district;
            const isOpen = openSet.has(id);
            return (
              <g key={id} transform={`translate(${point.x} ${point.y})`} className={`fg-city-map__node ${isOpen ? "is-open" : "is-locked"} ${isCurrent ? "is-current" : ""} ${isMission ? "is-mission" : ""}`}>
                {isMission && <circle r="19" className="fg-city-map__pulse" />}
                <circle r="10" className="fg-city-map__dot" filter={isMission || isCurrent ? "url(#fg-map-glow)" : undefined} />
                <text y={point.y > 185 ? -16 : 25} textAnchor="middle">{copy.distritos?.[id] ?? id}</text>
                {isCurrent && <text className="fg-city-map__badge" y="4" textAnchor="middle">●</text>}
                {isMission && <path className="fg-city-map__mission" d="M0-16l6 6-6 6-6-6z" />}
              </g>
            );
          })}
        </svg>
      </div>

      <footer className="fg-city-map__legend">
        <span><i className="is-current" />{labels.here}</span>
        <span><i className="is-mission" />{labels.mission}</span>
        <span><i className="is-route" />{labels.route}</span>
        <span><i className="is-locked" />{labels.locked}</span>
      </footer>
    </section>
  );
}
