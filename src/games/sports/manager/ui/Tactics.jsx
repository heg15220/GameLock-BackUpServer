import React, { useMemo, useState } from 'react';
import { Wand2, Shirt, AlertTriangle, HeartPulse, Ban, RefreshCw } from 'lucide-react';
import { useManager } from './context.jsx';
import { ChoiceRow, OvrBadge, Portrait, SectionTitle, Meter, Pill } from './components.jsx';
import { posLabel, teamInfo } from './format.js';
import { L } from './texts.js';
import { FORMATIONS, FORMATION_KEYS, positionFit } from '../career/positions.js';
import { clubSquad, dynamicOvr, energyAt, isInjured, pickLineup, pickBench } from '../career/world.js';
import { refreshLineup, setFormation } from '../career/career.js';
import { MENTALITIES } from '../career/match.js';
import { lastName } from './components.jsx';

function fitTone(fit) { return fit >= 0.99 ? 'good' : fit >= 0.9 ? 'ok' : fit >= 0.75 ? 'warn' : 'bad'; }

export function useLineupModel(scope) {
  const { career } = useManager();
  const national = scope === 'national';
  const squad = national ? career.national.squad.map((id) => career.world.players[id]).filter(Boolean) : clubSquad(career.world, career.clubId);
  const tactics = national ? career.national.tactics : career.tactics;
  const auto = national ? career.national.autoLineup : career.autoLineup;
  let lineup = national ? career.national.lineup : career.lineup;
  let bench = national ? career.national.bench || [] : career.bench;
  if (auto || !lineup || lineup.length !== 11) {
    lineup = pickLineup(squad, tactics.formation, career.date, career.training).map((p) => p?.id || null);
    bench = pickBench(squad, lineup.filter(Boolean), career.date, national ? 12 : career.year >= 2020 ? 9 : 7, career.training);
  }
  return { squad, tactics, auto, lineup, bench, national };
}

export default function Tactics({ scope = 'club' }) {
  const { career, lang, t, act } = useManager();
  const model = useLineupModel(scope);
  const { squad, tactics, auto, lineup, bench, national } = model;
  const [selected, setSelected] = useState(null);
  const kit = national ? career.world.countries[career.national.fifa]?.color || '#c9a227' : teamInfo(career, career.clubId)?.color;
  const slots = FORMATIONS[tactics.formation];
  const byId = Object.fromEntries(squad.map((p) => [p.id, p]));
  const reserves = squad.filter((p) => !lineup.includes(p.id) && !bench.includes(p.id));
  const date = career.date;
  const maxBench = national ? 12 : career.year >= 2020 ? 9 : 7;

  const write = (nextLineup, nextBench) => act((c) => {
    if (national) { c.national.lineup = nextLineup; c.national.bench = nextBench; c.national.autoLineup = false; }
    else { c.lineup = nextLineup; c.bench = nextBench; c.autoLineup = false; }
  });

  const placeIntoSlot = (playerId, index) => {
    const nextLineup = lineup.slice();
    let nextBench = bench.slice();
    const from = nextLineup.indexOf(playerId);
    const displaced = nextLineup[index];
    if (from >= 0) { nextLineup[from] = displaced; nextLineup[index] = playerId; }
    else {
      nextLineup[index] = playerId;
      const benchIndex = nextBench.indexOf(playerId);
      if (benchIndex >= 0) nextBench[benchIndex] = displaced; else if (displaced) nextBench = [...nextBench, displaced].slice(0, maxBench);
      nextBench = nextBench.filter(Boolean);
    }
    write(nextLineup, nextBench);
  };

  const onSlot = (index) => {
    if (selected?.kind === 'player') { placeIntoSlot(selected.id, index); setSelected(null); return; }
    if (selected?.kind === 'slot' && selected.index !== index) {
      const next = lineup.slice();
      [next[index], next[selected.index]] = [next[selected.index], next[index]];
      write(next, bench);
      setSelected(null);
      return;
    }
    setSelected(selected?.kind === 'slot' && selected.index === index ? null : { kind: 'slot', index });
  };

  const onPlayer = (id, where) => {
    if (selected?.kind === 'slot') { placeIntoSlot(id, selected.index); setSelected(null); return; }
    if (selected?.kind === 'player' && selected.id !== id) {
      // Swap between bench and reserves.
      const a = selected.id;
      let nextBench = bench.slice();
      const ia = nextBench.indexOf(a);
      const ib = nextBench.indexOf(id);
      if (ia >= 0 && ib < 0) nextBench[ia] = id; else if (ib >= 0 && ia < 0) nextBench[ib] = a;
      write(lineup, nextBench);
      setSelected(null);
      return;
    }
    if (where === 'reserve' && bench.length < maxBench && selected?.id === id) {
      write(lineup, [...bench, id]);
      setSelected(null);
      return;
    }
    setSelected(selected?.id === id ? null : { kind: 'player', id });
  };

  const warnings = lineup.map((id, i) => {
    const p = byId[id];
    if (!p) return { i, type: 'empty' };
    if (isInjured(p, date)) return { i, type: 'injured', p };
    if (p.susp > 0) return { i, type: 'suspended', p };
    if (positionFit(p, slots[i][0]) < 0.8) return { i, type: 'position', p };
    if (energyAt(p, date, career.training) < 65) return { i, type: 'tired', p };
    return null;
  }).filter(Boolean);

  const setTactic = (patch) => act((c) => {
    const target = national ? c.national.tactics : c.tactics;
    if (patch.formation) {
      if (national) { target.formation = patch.formation; c.national.autoLineup = true; }
      else setFormation(c, patch.formation);
    }
    Object.assign(target, Object.fromEntries(Object.entries(patch).filter(([k]) => k !== 'formation')));
  });

  const strength = useMemo(() => {
    const ps = lineup.map((id, i) => (byId[id] ? dynamicOvr(byId[id], date, career.training) * positionFit(byId[id], slots[i][0]) : 40));
    return Math.round(ps.reduce((a, b) => a + b, 0) / 11);
  }, [lineup.join(), tactics.formation, career.version]);

  return (
    <div className="mg-tactics">
      <SectionTitle kicker={national ? t('Selección', 'National team') : t('Táctica', 'Tactics')} title={t('Alineación y pizarra', 'Line-up & board')}>
        <span className="mg-team-ovr"><small>{t('Nivel del once', 'XI level')}</small><b>{strength}</b></span>
      </SectionTitle>
      <div className="mg-tactics__layout">
        <div className="mg-pitch-wrap">
          <div className="mg-pitch" role="group" aria-label={t('Campo', 'Pitch')}>
            <svg className="mg-pitch__lines" viewBox="0 0 68 105" preserveAspectRatio="none" aria-hidden="true">
              <rect x="1" y="1" width="66" height="103" /><line x1="1" y1="52.5" x2="67" y2="52.5" /><circle cx="34" cy="52.5" r="9.15" />
              <rect x="13.85" y="1" width="40.3" height="16.5" /><rect x="24.85" y="1" width="18.3" height="5.5" />
              <rect x="13.85" y="87.5" width="40.3" height="16.5" /><rect x="24.85" y="98.5" width="18.3" height="5.5" />
            </svg>
            {slots.map(([pos, x, y], i) => {
              const p = byId[lineup[i]];
              const fit = p ? positionFit(p, pos) : 0;
              const energy = p ? energyAt(p, date, career.training) : 0;
              return (
                <button type="button" key={i} className={`mg-slot ${selected?.kind === 'slot' && selected.index === i ? 'is-selected' : ''} is-fit-${fitTone(fit)}`}
                  style={{ left: `${x}%`, top: `${100 - y}%`, '--kit': kit }} onClick={() => onSlot(i)}
                  draggable={Boolean(p)} onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify({ slot: i }))}
                  onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const data = JSON.parse(e.dataTransfer.getData('text/plain') || '{}'); if (data.slot !== undefined) { const next = lineup.slice(); [next[i], next[data.slot]] = [next[data.slot], next[i]]; write(next, bench); } else if (data.id) placeIntoSlot(data.id, i); }}>
                  <span className="mg-slot__shirt"><Shirt size={30} aria-hidden="true" /><b>{p?.number ?? ''}</b></span>
                  <span className="mg-slot__name">{p ? lastName(p.name) : '—'}</span>
                  <span className="mg-slot__meta"><em>{posLabel(pos, lang)}</em>{p && <OvrBadge value={dynamicOvr(p, date, career.training)} size="xs" />}</span>
                  {p && <span className="mg-slot__energy"><i style={{ width: `${energy}%` }} /></span>}
                  {p && (isInjured(p, date) || p.susp > 0) && <span className="mg-slot__alert">!</span>}
                </button>
              );
            })}
          </div>
          {warnings.length > 0 && (
            <ul className="mg-warnings">
              {warnings.map((w) => (
                <li key={w.i} className={`is-${w.type}`}>
                  {w.type === 'injured' ? <HeartPulse size={14} /> : w.type === 'suspended' ? <Ban size={14} /> : <AlertTriangle size={14} />}
                  {w.type === 'empty' ? t('Hay un hueco en la alineación', 'There is an empty slot') : w.type === 'injured' ? t(`${w.p.name} está lesionado`, `${w.p.name} is injured`) : w.type === 'suspended' ? t(`${w.p.name} está sancionado`, `${w.p.name} is suspended`) : w.type === 'position' ? t(`${w.p.name} juega fuera de su sitio`, `${w.p.name} is out of position`) : t(`${w.p.name} está cansado`, `${w.p.name} is tired`)}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mg-tactics__side">
          <div className="mg-panel mg-tactics__controls">
            <div className="mg-formations">
              {FORMATION_KEYS.map((f) => <button type="button" key={f} className={tactics.formation === f ? 'is-active' : ''} onClick={() => setTactic({ formation: f })}>{f}</button>)}
            </div>
            <ChoiceRow label={t('Mentalidad', 'Mentality')} value={tactics.mentality} onChange={(v) => setTactic({ mentality: v })} options={MENTALITIES.map((id) => ({ id, label: L[lang].mentality[id] }))} />
            <ChoiceRow label={t('Presión', 'Pressing')} value={tactics.pressing} onChange={(v) => setTactic({ pressing: v })} options={['low', 'medium', 'high'].map((id) => ({ id, label: L[lang].pressing[id] }))} />
            <ChoiceRow label={t('Ritmo', 'Tempo')} value={tactics.tempo} onChange={(v) => setTactic({ tempo: v })} options={['slow', 'normal', 'fast'].map((id) => ({ id, label: L[lang].tempo[id] }))} />
            <p className="mg-muted">{tactics.pressing === 'high' ? t('Presionar arriba roba más balones, pero cansa más.', 'A high press wins the ball more often, but tires players.') : tactics.tempo === 'fast' ? t('Jugar rápido genera más ocasiones y más pérdidas.', 'Fast tempo creates more chances and more turnovers.') : t('Equilibrio entre atacar y defender.', 'A balance between attack and defence.')}</p>
            <div className="mg-tactics__auto">
              <button type="button" className={`mg-btn ${auto ? 'mg-btn--primary' : 'mg-btn--ghost'} mg-btn--sm`} onClick={() => act((c) => { if (national) { c.national.autoLineup = true; } else { c.autoLineup = true; refreshLineup(c); } })}><Wand2 size={15} />{auto ? t('Once automático activado', 'Auto XI on') : t('Elegir mejor once', 'Pick best XI')}</button>
              {auto && <Pill tone="good" icon={RefreshCw}>{t('Se ajusta antes de cada partido', 'Updates before each match')}</Pill>}
            </div>
          </div>
          <div className="mg-panel mg-bench">
            <h4>{t('Banquillo', 'Bench')} <small>{bench.length}/{maxBench}</small></h4>
            <PlayerList ids={bench} byId={byId} selected={selected} onPick={(id) => onPlayer(id, 'bench')} kit={kit} />
            <h4>{t('Fuera de la convocatoria', 'Not in squad')}</h4>
            <PlayerList ids={reserves.map((p) => p.id)} byId={byId} selected={selected} onPick={(id) => onPlayer(id, 'reserve')} kit={kit} />
            <p className="mg-muted">{t('Toca un jugador y después una posición del campo para cambiarlos. También puedes arrastrarlos.', 'Tap a player and then a position on the pitch to swap them. You can also drag them.')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerList({ ids, byId, selected, onPick, kit }) {
  const { career, lang } = useManager();
  return (
    <ul className="mg-pick-list">
      {ids.map((id) => {
        const p = byId[id];
        if (!p) return null;
        const energy = energyAt(p, career.date, career.training);
        return (
          <li key={id}>
            <button type="button" className={selected?.id === id ? 'is-selected' : ''} onClick={() => onPick(id)} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify({ id }))}>
              <Portrait player={p} size={28} kit={kit} />
              <span className="mg-pos">{posLabel(p.pos, lang)}</span>
              <span className="mg-pick-list__name">{p.name}</span>
              {isInjured(p, career.date) ? <HeartPulse size={14} className="is-bad" /> : p.susp > 0 ? <Ban size={14} className="is-warn" /> : <Meter value={energy} compact label="energy" />}
              <OvrBadge value={dynamicOvr(p, career.date, career.training)} size="xs" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
