import React from "react";

export const CAST = Object.fromEntries([
  "dani", "nuria", "carmen", "tomas", "isma", "julia", "oscar", "requena", "pilar", "yusuf", "sabater",
  "marga", "ezequiel", "iria", "tasador", "hierro", "larga", "vigia", "cero", "chapa", "tuerca", "sordo",
].map((id) => [id, { id }]));

export const EXPRESSIONS = ["neutro", "tenso", "roto", "decidido"];
export const DEFAULT_ROW = { id: "dani" };
export const rowFor = (id) => CAST[id] ?? DEFAULT_ROW;
export const portraitAsset = (id, expresion = "neutro") => {
  const safeId = CAST[id] ? id : "dani";
  const safeExpression = EXPRESSIONS.includes(expresion) ? expresion : "neutro";
  return `/assets/fulgor/portraits/${safeId}-${safeExpression}.svg`;
};
export const silhouetteAsset = (id) => `/assets/fulgor/silhouettes/${CAST[id] ? id : "dani"}.svg`;

export function PortraitDefs() { return null; }

export function Portrait({ id, expresion = "neutro", tamano = 96, variante = "civil", className = "", titulo = null }) {
  return (
    <img
      src={portraitAsset(id, expresion)}
      width={tamano}
      height={tamano * 1.2}
      className={`fg-portrait fg-portrait--${variante} ${className}`.trim()}
      alt={titulo ?? ""}
      aria-hidden={titulo ? undefined : "true"}
      draggable="false"
    />
  );
}

export function Silhouette({ id, altura = 64, variante = "heroe", className = "", brillo = false }) {
  return (
    <img
      src={silhouetteAsset(id)}
      height={altura}
      width={altura * 0.5}
      className={`fg-silhouette fg-silhouette--${variante} ${brillo ? "fg-silhouette--glow" : ""} ${className}`.trim()}
      alt=""
      aria-hidden="true"
      draggable="false"
    />
  );
}

export function mezclar(hex, hacia, cantidad) {
  const leer = (value) => {
    const clean = String(value).replace("#", "");
    const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) || 0);
  };
  const a = leer(hex);
  const b = leer(hacia);
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * cantidad).toString(16).padStart(2, "0")).join("")}`;
}
