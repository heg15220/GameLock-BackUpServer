import React from "react";

export const ICON_IDS = [
  "testimonial", "fisica", "temporal", "digital", "intima", "latente", "activo", "obsesivo", "cerrado",
  "impacto", "velocidad", "luz", "escudo", "sentido", "rayo", "afinidadLuz", "sombra", "materia",
  "potencia", "cuerpo", "control", "guardia", "statVelocidad", "aguante", "temple", "carga", "compostura",
  "obligacion", "quedar", "entrenar", "taller", "trabajar", "investigar", "contramedidas", "patrullar", "descansar",
  "mascara", "torso", "guantes", "botas", "cinturon", "manto", "cobre", "fibra", "ceramica", "neodimio", "optica", "nucleo",
  "impecable", "limpio", "sucio", "parcial", "fallido", "nodo", "ruta", "camara", "testigo", "reloj", "fuenteElectrica",
  "contener", "entorno", "guardar", "idioma", "dificultad", "expediente", "vinculo", "prensa", "dinero", "rango", "experiencia",
];

const KNOWN = new Set(ICON_IDS);
export const iconAsset = (nombre) => `/assets/fulgor/ui/${nombre}.svg`;

export function Icon({ nombre, tamano = 20, className = "", titulo = null }) {
  if (!KNOWN.has(nombre)) return null;
  return (
    <img
      src={iconAsset(nombre)}
      width={tamano}
      height={tamano}
      className={`fg-icon ${className}`.trim()}
      alt={titulo ?? ""}
      aria-hidden={titulo ? undefined : "true"}
      draggable="false"
    />
  );
}

export function VisibilityDots({ nivel = 0, tamano = 7, className = "", etiqueta = null }) {
  const n = Math.max(0, Math.min(3, Math.round(nivel)));
  return (
    <span className={`fg-vis ${className}`.trim()} role="img" aria-label={etiqueta ?? `${n}/3`} data-nivel={n}>
      {[0, 1, 2].map((i) => (
        <i key={i} aria-hidden="true" style={{ width: tamano, height: tamano }} data-filled={i < n ? "true" : "false"} />
      ))}
    </span>
  );
}

export default Icon;
