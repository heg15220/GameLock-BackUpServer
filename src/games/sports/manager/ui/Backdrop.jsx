import React, { useEffect, useState } from 'react';
import { useManager } from './context.jsx';

/** The FC-style stage: deep teal room, slow light beams, the club colour as a glow. */
export function Backdrop({ tint }) {
  return (
    <div className="mg-backdrop" aria-hidden="true" style={tint ? { '--tint': tint } : undefined}>
      <span className="mg-backdrop__beam mg-backdrop__beam--a" />
      <span className="mg-backdrop__beam mg-backdrop__beam--b" />
      <span className="mg-backdrop__beam mg-backdrop__beam--c" />
      <span className="mg-backdrop__glow" />
      <span className="mg-backdrop__floor" />
      <span className="mg-backdrop__grain" />
    </div>
  );
}

const TIPS = {
  es: [
    'Cada temporada empieza con el mercado de verano. Ficha antes del 31 de agosto.',
    'En enero vuelve a abrirse el mercado durante un mes.',
    'Los jugadores cansados rinden menos: rota la alineación.',
    'Si presionas demasiado en una negociación, el otro club puede colgarte.',
    'Los ojeadores te dicen si un jugador sería titular en tu equipo.',
    'Si eres seleccionador, en junio puede tocar Eurocopa, Copa América o Mundial.',
  ],
  en: [
    'Every season starts with the summer window. Sign before 31 August.',
    'In January the window reopens for a month.',
    'Tired players perform worse: rotate your line-up.',
    'Push too hard in a negotiation and the other club may hang up.',
    'Scouts tell you whether a player would start for your team.',
    'If you coach a national team, June may bring a Euro, Copa América or World Cup.',
  ],
};

export function LoadingScreen({ kind }) {
  const { lang } = useManager() || { lang: 'es' };
  const [tip, setTip] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTip((n) => n + 1), 2600);
    return () => clearInterval(id);
  }, []);
  const tips = TIPS[lang] || TIPS.es;
  return (
    <div className="mg-loading" role="status" aria-live="polite">
      <div className="mg-loading__ball" aria-hidden="true">
        <svg viewBox="0 0 64 64" width="72" height="72">
          <circle cx="32" cy="32" r="29" fill="#f4f7f8" stroke="#0b1d27" strokeWidth="2" />
          <path d="M32 18l9 6.5-3.4 10.6H26.4L23 24.5z" fill="#0b1d27" />
          <path d="M32 3v15M41 24.5l13-5M37.6 35.1l8.4 11.4M26.4 35.1L18 46.5M23 24.5l-13-5" stroke="#0b1d27" strokeWidth="2" />
          <path d="M46 46.5l-4 12M18 46.5l4 12M54 19.5l7 9M10 19.5l-7 9" stroke="#0b1d27" strokeWidth="2" />
        </svg>
      </div>
      <strong>{kind === 'create' ? (lang === 'es' ? 'Preparando el mundo del fútbol…' : 'Building the football world…') : (lang === 'es' ? 'Cargando tu carrera…' : 'Loading your career…')}</strong>
      <p key={tip}>{tips[tip % tips.length]}</p>
    </div>
  );
}
