import React, { useMemo, useState } from 'react';
import { Wand2, Shirt, AlertTriangle, HeartPulse, Ban, RefreshCw, Check } from 'lucide-react';
import { useManager } from './context.jsx';
import { ChoiceRow, OvrBadge, Portrait, SectionTitle, Meter, Pill } from './components.jsx';
import { posLabel, teamInfo } from './format.js';
import { L } from './texts.js';
import { TACTIC_TEXT, TACTIC_GROUPS } from './tactics-texts.js';
import { FORMATIONS, FORMATION_KEYS, positionFit } from '../career/positions.js';
import { clubSquad, dynamicOvr, energyAt, isInjured, pickLineup, pickBench } from '../career/world.js';
import { refreshLineup, setFormation } from '../career/career.js';
import { CPU_LEVELS, AI_BEHAVIOURS } from '../career/cpu.js';
import { MENTALITIES, INSTRUCTIONS, PRESETS, ROLES, ROLE_LABEL, FOCUS_LABEL, ROLE_HINT, rolesFor, autoRoles, normalizeTactics, applyPreset, tacticalSummary } from '../career/tactics.js';
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

/** The keys of every team instruction a preset sets. */
const PRESET_KEYS = ['mentality', ...Object.keys(INSTRUCTIONS)];

export default function Tactics({ scope = 'club' }) {
  const { career, lang, t, act } = useManager();
  const model = useLineupModel(scope);
  const { squad, auto, lineup, bench, national } = model;
  const tactics = normalizeTactics(model.tactics);
  const T = TACTIC_TEXT[lang] || TACTIC_TEXT.es;
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('plan');
  const [hint, setHint] = useState(null);
  const kit = national ? career.world.countries[career.national.fifa]?.color || '#c9a227' : teamInfo(career, career.clubId)?.color;
  const slots = FORMATIONS[tactics.formation];
  const positions = slots.map(([pos]) => pos);
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
      if (national) { target.formation = patch.formation; target.roles = {}; c.national.autoLineup = true; }
      else setFormation(c, patch.formation);
    }
    Object.assign(target, Object.fromEntries(Object.entries(patch).filter(([k]) => k !== 'formation')));
  });
  const choose = (key, value) => { setTactic({ [key]: value }); setHint(key); };

  // Roles: the manager's choice for a position, or what the coach would pick for whoever plays there.
  const autoNow = useMemo(() => autoRoles(lineup.map((id) => byId[id]), positions, 'balanced'), [lineup.join(), tactics.formation, career.version]);
  const roleAt = (i) => {
    const key = tactics.roles[i];
    if (key && rolesFor(positions[i]).includes(key.split(':')[0])) return { key, auto: false };
    return { key: autoNow[i], auto: true };
  };
  const setRole = (i, key) => setTactic({ roles: { ...tactics.roles, [i]: key } });

  const strength = useMemo(() => {
    const ps = lineup.map((id, i) => (byId[id] ? dynamicOvr(byId[id], date, career.training) * positionFit(byId[id], slots[i][0]) : 40));
    return Math.round(ps.reduce((a, b) => a + b, 0) / 11);
  }, [lineup.join(), tactics.formation, career.version]);

  const summary = tacticalSummary({ ...tactics, roles: Object.fromEntries(positions.map((_, i) => [i, roleAt(i).key])) }, positions);
  const activePreset = Object.keys(PRESETS).find((id) => {
    const preset = applyPreset(tactics, id);
    return PRESET_KEYS.every((k) => preset[k] === tactics[k]);
  });
  const usePreset = (id) => {
    const preset = applyPreset(tactics, id);
    setTactic(Object.fromEntries(PRESET_KEYS.map((k) => [k, preset[k]])));
    setHint(null);
  };

  const row = (key) => (
    <ChoiceRow key={key} label={T.instr[key]} value={tactics[key]} onChange={(v) => choose(key, v)}
      options={INSTRUCTIONS[key].map((id) => ({ id, label: T.opt[key][String(id)] }))} />
  );
  const hintKey = hint && TACTIC_GROUPS[tab]?.includes(hint) ? hint : TACTIC_GROUPS[tab]?.[0];
  const slotRole = selected?.kind === 'slot' ? roleAt(selected.index) : null;

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
              const { key, auto: autoRole } = roleAt(i);
              return (
                <button type="button" key={i} className={`mg-slot ${selected?.kind === 'slot' && selected.index === i ? 'is-selected' : ''} is-fit-${fitTone(fit)}`}
                  style={{ left: `${x}%`, top: `${100 - y}%`, '--kit': kit }} onClick={() => onSlot(i)}
                  draggable={Boolean(p)} onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify({ slot: i }))}
                  onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const data = JSON.parse(e.dataTransfer.getData('text/plain') || '{}'); if (data.slot !== undefined) { const next = lineup.slice(); [next[i], next[data.slot]] = [next[data.slot], next[i]]; write(next, bench); } else if (data.id) placeIntoSlot(data.id, i); }}>
                  <span className="mg-slot__shirt"><Shirt size={30} aria-hidden="true" /><b>{p?.number ?? ''}</b></span>
                  <span className="mg-slot__name">{p ? lastName(p.name) : '—'}</span>
                  <span className="mg-slot__meta"><em>{posLabel(pos, lang)}</em>{p && <OvrBadge value={dynamicOvr(p, date, career.training)} size="xs" />}</span>
                  <span className={`mg-slot__role ${autoRole ? '' : 'is-set'}`}>{ROLE_LABEL[lang]?.[key.split(':')[0]]}</span>
                  {p && <span className="mg-slot__energy"><i style={{ width: `${energy}%` }} /></span>}
                  {p && (isInjured(p, date) || p.susp > 0) && <span className="mg-slot__alert">!</span>}
                </button>
              );
            })}
          </div>
          {slotRole && (
            <RolePicker slot={positions[selected.index]} player={byId[lineup[selected.index]]} current={slotRole.key} isAuto={slotRole.auto}
              onPick={(key) => setRole(selected.index, key)} T={T} />
          )}
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
            <div className="mg-seg mg-tactics__tabs" role="tablist">
              {Object.entries(T.tabs).map(([id, label]) => <button type="button" role="tab" aria-selected={tab === id} key={id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>{label}</button>)}
            </div>
            {tab === 'plan' && (
              <>
                <h4 className="mg-tactics__head">{T.presetsTitle}</h4>
                <div className="mg-presets">
                  {Object.keys(PRESETS).map((id) => (
                    <button type="button" key={id} className={activePreset === id ? 'is-active' : ''} onClick={() => usePreset(id)} title={T.presets[id][1]}>
                      <b>{activePreset === id && <Check size={13} aria-hidden="true" />}{T.presets[id][0]}</b><small>{T.presets[id][1]}</small>
                    </button>
                  ))}
                </div>
                <ChoiceRow label={t('Mentalidad', 'Mentality')} value={tactics.mentality} onChange={(v) => setTactic({ mentality: v })} options={MENTALITIES.map((id) => ({ id, label: L[lang].mentality[id] }))} />
                <TacticalSummary summary={summary} T={T} />
                <h4 className="mg-tactics__head">{T.cpuTitle}</h4>
                <ChoiceRow label={T.cpuLevelLabel} value={career.cpu?.level || 'professional'} onChange={(v) => act((c) => { c.cpu = { ...(c.cpu || {}), level: v }; })} options={CPU_LEVELS.map((id) => ({ id, label: T.cpuLevel[id] }))} />
                <ChoiceRow label={T.cpuBehaviourLabel} value={career.cpu?.behaviour || 'dynamic'} onChange={(v) => act((c) => { c.cpu = { ...(c.cpu || {}), behaviour: v }; })} options={AI_BEHAVIOURS.map((id) => ({ id, label: T.cpuBehaviour[id] }))} />
                <p className="mg-muted mg-tactics__hint">{T.cpuHelp[career.cpu?.behaviour || 'dynamic']} {T.cpuLevelHelp[career.cpu?.level || 'professional']}</p>
              </>
            )}
            {tab !== 'plan' && TACTIC_GROUPS[tab].map(row)}
            {tab !== 'plan' && hintKey && <p className="mg-muted mg-tactics__hint"><b>{T.instr[hintKey]}:</b> {T.help[hintKey][String(tactics[hintKey])]}</p>}
            <div className="mg-tactics__auto">
              <button type="button" className={`mg-btn ${auto ? 'mg-btn--primary' : 'mg-btn--ghost'} mg-btn--sm`} onClick={() => act((c) => { if (national) { c.national.autoLineup = true; } else { c.autoLineup = true; refreshLineup(c); } })}><Wand2 size={15} />{auto ? t('Once automático activado', 'Auto XI on') : t('Elegir mejor once', 'Pick best XI')}</button>
              {auto && <Pill tone="good" icon={RefreshCw}>{t('Se ajusta antes de cada partido', 'Updates before each match')}</Pill>}
              {Object.keys(tactics.roles).length > 0 && <button type="button" className="mg-btn mg-btn--ghost mg-btn--sm" onClick={() => setTactic({ roles: {} })}>{T.resetRoles}</button>}
            </div>
          </div>
          <div className="mg-panel mg-bench">
            <h4>{t('Banquillo', 'Bench')} <small>{bench.length}/{maxBench}</small></h4>
            <PlayerList ids={bench} byId={byId} selected={selected} onPick={(id) => onPlayer(id, 'bench')} kit={kit} />
            <h4>{t('Fuera de la convocatoria', 'Not in squad')}</h4>
            <PlayerList ids={reserves.map((p) => p.id)} byId={byId} selected={selected} onPick={(id) => onPlayer(id, 'reserve')} kit={kit} />
            <p className="mg-muted">{t('Toca un jugador y después una posición del campo para cambiarlos. Toca una posición para elegir su rol. También puedes arrastrarlos.', 'Tap a player and then a position on the pitch to swap them. Tap a position to choose its role. You can also drag them.')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Role and focus for one position of the shape, FC IQ style. */
function RolePicker({ slot, player, current, isAuto, onPick, T }) {
  const { lang } = useManager();
  const [id, focus] = current.split(':');
  const role = ROLES[id];
  return (
    <div className="mg-panel mg-role-picker">
      <header>
        <h4>{T.roleTitle} · {posLabel(slot, lang)}{player ? ` · ${lastName(player.name)}` : ''}</h4>
        {isAuto && <Pill tone="muted">{T.auto}</Pill>}
      </header>
      <div className="mg-role-picker__roles">
        {rolesFor(slot).map((r) => (
          <button type="button" key={r} className={r === id ? 'is-active' : ''} onClick={() => onPick(`${r}:${ROLES[r].focuses.includes(focus) ? focus : ROLES[r].focuses[0]}`)}>{ROLE_LABEL[lang][r]}</button>
        ))}
      </div>
      {role && (
        <div className="mg-role-picker__focus">
          <span>{T.focusTitle}</span>
          {role.focuses.map((f) => <button type="button" key={f} className={f === focus ? 'is-active' : ''} onClick={() => onPick(`${id}:${f}`)}>{FOCUS_LABEL[lang][f]}</button>)}
        </div>
      )}
      <p className="mg-muted">{ROLE_HINT[lang][id]}</p>
    </div>
  );
}

function TacticalSummary({ summary, T }) {
  return (
    <div className="mg-summary">
      <h4 className="mg-tactics__head">{T.summaryTitle}</h4>
      <div className="mg-summary__grid">
        {Object.entries(summary.ratings).map(([key, value]) => (
          <div key={key} className="mg-summary__row"><span>{T.summary[key]}</span><Meter value={value} compact label={T.summary[key]} /><b>{value}</b></div>
        ))}
      </div>
      {summary.notes.length > 0 && <ul className="mg-summary__notes">{summary.notes.map((n) => <li key={n.key} className={`is-${n.tone}`}>{T.notes[n.key]}</li>)}</ul>}
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
