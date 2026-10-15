import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { hash01 } from '../career/util.js';
import { ratingTone, posLabel } from './format.js';
import { useManager } from './context.jsx';

/* ── Crests and flags ── */

export function Crest({ team, size = 40, className = '' }) {
  const [broken, setBroken] = useState(false);
  const src = team?.crest;
  useEffect(() => setBroken(false), [src]);
  if (src && !broken) {
    return <img className={`mg-crest ${team?.nation ? 'is-flag' : ''} ${className}`} src={src} width={size} height={size} alt="" loading="lazy" onError={() => setBroken(true)} style={{ width: size, height: team?.nation ? size * 0.72 : size }} />;
  }
  const color = team?.color || '#2a3c4c';
  return (
    <span className={`mg-crest mg-crest--mono ${className}`} style={{ width: size, height: size, '--c': color, fontSize: size * 0.3 }} aria-hidden="true">
      {(team?.abbr || team?.name || '?').slice(0, 3).toUpperCase()}
    </span>
  );
}

export function Flag({ country, size = 18 }) {
  const [broken, setBroken] = useState(false);
  if (!country?.flag || broken) return <span className="mg-flag mg-flag--mono" style={{ width: size * 1.4, height: size }}>{country?.fifa || ''}</span>;
  return <img className="mg-flag" src={country.flag} alt="" width={size * 1.4} height={size} style={{ width: size * 1.4, height: size }} onError={() => setBroken(true)} loading="lazy" />;
}

/* ── Generated player portraits: stylised, deterministic, never a real face ── */

const SKIN_BY_REGION = {
  CAF: ['#5b3a29', '#6e4630', '#7c5038', '#4a2f22'], CONMEBOL: ['#c58c62', '#a8714c', '#e0b08a', '#8a5a3c', '#f0c8a4'],
  CONCACAF: ['#b67c55', '#8a5a3c', '#d9a57e', '#6e4630'], AFC: ['#f1cfaa', '#e5b98f', '#c99a72', '#f6d9bb'],
  UEFA: ['#f3d2b8', '#e9c0a0', '#d6a47e', '#f7dcc6', '#b98563'],
};
const HAIR = ['#1b1410', '#2b1d14', '#3c2a1c', '#5a3d25', '#8a6a3a', '#c9a35a', '#d8c08c', '#121212'];

export function Portrait({ player, size = 56, kit = '#2a3c4c', className = '' }) {
  const { career } = useManager() || {};
  const id = player?.id || 'x';
  const conf = career?.world?.countries?.[player?.nat]?.confederation || 'UEFA';
  const skins = SKIN_BY_REGION[conf] || SKIN_BY_REGION.UEFA;
  const r = (k) => hash01(id, k);
  const skin = skins[Math.floor(r('skin') * skins.length)];
  const hairColor = HAIR[Math.floor(r('hair') * (conf === 'UEFA' ? HAIR.length : 4))];
  const style = Math.floor(r('style') * 6);
  const beard = r('beard') < 0.35;
  const old = (player?.age || 25) >= 32;
  const shade = 'rgba(0,0,0,.18)';
  return (
    <svg className={`mg-portrait ${className}`} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={`kit-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={kit} /><stop offset="1" stopColor={kit} stopOpacity=".72" /></linearGradient>
      </defs>
      <path d="M8 64c2-12 10-17 24-17s22 5 24 17z" fill={`url(#kit-${id})`} />
      <path d="M26 47l6 7 6-7" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="1.6" />
      <rect x="27" y="38" width="10" height="10" rx="4" fill={skin} />
      <ellipse cx="32" cy="27" rx="12.5" ry="14.5" fill={skin} />
      <ellipse cx="19.6" cy="28" rx="2.2" ry="3.2" fill={skin} /><ellipse cx="44.4" cy="28" rx="2.2" ry="3.2" fill={skin} />
      {style === 0 && <path d="M19.5 24c0-9 5.5-13.5 12.5-13.5S44.5 15 44.5 24c-2-4-5-6.5-12.5-6.5S21.5 20 19.5 24z" fill={hairColor} />}
      {style === 1 && <path d="M19 26c-1-11 6-16 13-16s14 5 13 16c-1-6-5-8-6-8-3 2-11 2-14 0-1 0-5 2-6 8z" fill={hairColor} />}
      {style === 2 && <path d="M20 21c2-7 7-10 12-10s10 3 12 10c-4-2-8-3-12-3s-8 1-12 3z" fill={hairColor} />}
      {style === 3 && <><path d="M18.5 27c-1.5-12 6-17.5 13.5-17.5S47 15 45.5 27c-1-5-3-8-4-9-2 3-17 3-19 0-1 1-3 4-4 9z" fill={hairColor} /><path d="M18.5 27c0 5 1 9 2 11l-2-1c-1-3-1-7 0-10z" fill={hairColor} /><path d="M45.5 27c0 5-1 9-2 11l2-1c1-3 1-7 0-10z" fill={hairColor} /></>}
      {style === 4 && <path d="M20 22c1-8 6-11.5 12-11.5S43 14 44 22c-1.5-2-3-3-4-3.2C36 21 28 21 24 18.8 23 19 21.5 20 20 22z" fill={hairColor} opacity=".55" />}
      {style === 5 && <path d="M19 25c0-10 5-15 13-15s13 5 13 15c-1-2-2-3-3-4l-1 3-2-4-2 3-2-4-2 3-2-3-2 4-2-3-1 4c-1-2-2-2-3 0z" fill={hairColor} />}
      {old && <path d="M23 18c3-2 15-2 18 0" stroke="#cfcfcf" strokeWidth="1.2" fill="none" opacity=".6" />}
      <ellipse cx="27" cy="28" rx="1.5" ry="1.7" fill="#1c1c1c" /><ellipse cx="37" cy="28" rx="1.5" ry="1.7" fill="#1c1c1c" />
      <path d="M24.5 24.5c1.5-1 3.5-1 4.5-.2M35 24.3c1-.8 3-.8 4.5.2" stroke={hairColor} strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M32 29v5.5l-1.6.6" stroke={shade} strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d="M28 37c2.5 1.6 5.5 1.6 8 0" stroke="#7a3c32" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      {beard && <path d="M20.5 31c1 8 6 11.5 11.5 11.5S42.5 39 43.5 31c-1.5 3-4 5-6 5.6-1.6-1.3-3.6-1.6-5.5-1.6s-3.9.3-5.5 1.6c-2-.6-4.5-2.6-6-5.6z" fill={hairColor} opacity=".82" />}
    </svg>
  );
}

/* ── Ratings and cards ── */

export function OvrBadge({ value, size = 'md', delta = 0, range = null }) {
  const tone = ratingTone(value);
  return (
    <span className={`mg-ovr mg-ovr--${tone} mg-ovr--${size}`}>
      {range && range[0] !== range[1] ? `${range[0]}-${range[1]}` : value}
      {delta !== 0 && <i className={delta > 0 ? 'is-up' : 'is-down'}>{delta > 0 ? '▲' : '▼'}</i>}
    </span>
  );
}

export function PlayerCard({ player, lang, kit, dynamic, onClick, compact = false, highlight = false, known = null }) {
  const { career } = useManager();
  const tone = ratingTone(player.ovr);
  const country = career.world.countries[player.nat];
  const attrs = player.pos === 'GK'
    ? [['DIV', 'div'], ['HAN', 'han'], ['KIC', 'kic'], ['REF', 'ref'], ['VEL', 'spd'], ['POS', 'gkp']]
    : [[lang === 'es' ? 'RIT' : 'PAC', 'pac'], [lang === 'es' ? 'TIR' : 'SHO', 'sho'], [lang === 'es' ? 'PAS' : 'PAS', 'pas'], [lang === 'es' ? 'REG' : 'DRI', 'dri'], [lang === 'es' ? 'DEF' : 'DEF', 'def'], [lang === 'es' ? 'FIS' : 'PHY', 'phy']];
  const shownOvr = known && !known.exact ? `${known.ovr[0]}-${known.ovr[1]}` : dynamic ?? player.ovr;
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} className={`mg-card mg-card--${tone} ${compact ? 'is-compact' : ''} ${highlight ? 'is-highlight' : ''}`} onClick={onClick}>
      <span className="mg-card__shine" aria-hidden="true" />
      <span className="mg-card__top">
        <b className="mg-card__ovr">{shownOvr}</b>
        <span className="mg-card__pos">{posLabel(player.pos, lang)}</span>
        {country && <Flag country={country} size={11} />}
      </span>
      <Portrait player={player} size={compact ? 58 : 76} kit={kit} className="mg-card__face" />
      <span className="mg-card__name">{lastName(player.name)}</span>
      {!compact && (
        <span className="mg-card__attrs">
          {attrs.map(([label, key]) => <span key={key}><b>{known && !known.exact ? '··' : player.attrs?.[key] ?? '–'}</b>{label}</span>)}
        </span>
      )}
    </Tag>
  );
}

export const lastName = (name = '') => {
  const parts = name.split(' ');
  if (parts.length <= 1) return name;
  const particles = ['de', 'da', 'van', 'von', 'del', 'di', 'dos', 'el', 'le', 'la', 'ben'];
  const index = parts.findIndex((part, i) => i > 0 && particles.includes(part.toLowerCase()));
  return index > 0 ? parts.slice(index).join(' ') : parts.slice(1).join(' ');
};

/* ── Small pieces ── */

export function Meter({ value, max = 100, tone = 'auto', label, compact = false }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const auto = pct >= 75 ? 'good' : pct >= 50 ? 'ok' : pct >= 30 ? 'warn' : 'bad';
  return (
    <span className={`mg-meter mg-meter--${tone === 'auto' ? auto : tone} ${compact ? 'is-compact' : ''}`} role="meter" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      <i style={{ width: `${pct}%` }} />
    </span>
  );
}

export function FormGuide({ results = [] }) {
  return <span className="mg-form">{results.slice(-5).map((r, i) => <i key={i} className={`is-${r}`}>{r}</i>)}</span>;
}

export function Pill({ children, tone = 'default', icon: Icon }) {
  return <span className={`mg-pill mg-pill--${tone}`}>{Icon && <Icon size={13} aria-hidden="true" />}{children}</span>;
}

export function SectionTitle({ kicker, title, children }) {
  return (
    <div className="mg-section-title">
      <div>
        {kicker && <span className="mg-kicker">{kicker}</span>}
        <h2>{title}</h2>
      </div>
      {children && <div className="mg-section-title__aside">{children}</div>}
    </div>
  );
}

export function Tabs({ tabs, value, onChange, label }) {
  const ref = useRef(null);
  useEffect(() => {
    const active = ref.current?.querySelector('[aria-selected="true"]');
    active?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }, [value]);
  return (
    <div className="mg-tabs" role="tablist" aria-label={label} ref={ref}>
      {tabs.map((tab) => (
        <button key={tab.id} type="button" role="tab" aria-selected={tab.id === value} className={tab.id === value ? 'is-active' : ''} onClick={() => onChange(tab.id)}>
          {tab.icon && <tab.icon size={15} aria-hidden="true" />}
          <span>{tab.label}</span>
          {tab.badge ? <b className="mg-badge">{tab.badge}</b> : null}
        </button>
      ))}
    </div>
  );
}

/** Modal sheet: centered on desktop, bottom sheet on phones. Portaled into the game root. */
export function Sheet({ open, onClose, title, children, wide = false, className = '', footer = null }) {
  const { rootEl } = useManager() || {};
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose?.(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);
  if (!open) return null;
  const body = (
    <div className="mg-sheet-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
      <div className={`mg-sheet ${wide ? 'is-wide' : ''} ${className}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="mg-sheet__head">
          <h3>{title}</h3>
          {onClose && <button type="button" className="mg-icon-btn" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>}
        </header>
        <div className="mg-sheet__body">{children}</div>
        {footer && <footer className="mg-sheet__foot">{footer}</footer>}
      </div>
    </div>
  );
  return rootEl ? createPortal(body, rootEl) : body;
}

export function Empty({ icon: Icon, title, children }) {
  return (
    <div className="mg-empty">
      {Icon && <Icon size={28} aria-hidden="true" />}
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}

/** Value stepper with arrows, like FC's offer rows. */
export function Stepper({ label, value, display, onChange, step, min = 0, max = Infinity, hint }) {
  const change = (direction) => onChange(Math.max(min, Math.min(max, value + direction * (typeof step === 'function' ? step(value, direction) : step))));
  return (
    <div className="mg-stepper">
      <span className="mg-stepper__label">{label}{hint && <small>{hint}</small>}</span>
      <div className="mg-stepper__control">
        <button type="button" onClick={() => change(-1)} disabled={value <= min} aria-label={`${label} −`}>‹</button>
        <b>{display ?? value}</b>
        <button type="button" onClick={() => change(1)} disabled={value >= max} aria-label={`${label} +`}>›</button>
      </div>
    </div>
  );
}

export function ChoiceRow({ label, value, options, onChange }) {
  const index = Math.max(0, options.findIndex((o) => o.id === value));
  const go = (d) => onChange(options[(index + d + options.length) % options.length].id);
  return (
    <div className="mg-stepper">
      <span className="mg-stepper__label">{label}</span>
      <div className="mg-stepper__control">
        <button type="button" onClick={() => go(-1)} aria-label={`${label} −`}>‹</button>
        <b>{options[index]?.label}</b>
        <button type="button" onClick={() => go(1)} aria-label={`${label} +`}>›</button>
      </div>
    </div>
  );
}

export function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = performance.now();
    const origin = from.current;
    let frame;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(origin + (target - origin) * eased);
      if (t < 1) frame = requestAnimationFrame(tick); else from.current = target;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}
