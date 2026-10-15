import React, { useMemo, useState } from 'react';
import { Search, Star, Handshake, Inbox as InboxIcon, Tag, History, Wallet, Repeat, ChevronRight, Hourglass, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useManager } from './context.jsx';
import { Crest, Empty, OvrBadge, Portrait, SectionTitle, Tabs, Flag, Pill, Meter } from './components.jsx';
import { money, posLabel, teamInfo, teamName, shortDate } from './format.js';
import { L, negotiationLine } from './texts.js';
import { searchPlayers, transferRoom, wageRoom, interestLabel, playerInterest, unlistPlayer } from '../career/transfers.js';
import { knowledge } from '../career/scouting.js';
import { transferWindowInfo } from '../career/career.js';
import { POSITIONS } from '../career/positions.js';

function PlayerRow({ player, extra, onClick }) {
  const { career, lang } = useManager();
  const known = knowledge(career, player);
  const club = teamInfo(career, player.clubId);
  return (
    <button type="button" className="mg-row" onClick={onClick}>
      <Portrait player={player} size={36} kit={club?.color || '#2a3340'} />
      <span className="mg-row__main">
        <b>{player.name}</b>
        <small>{club ? <><Crest team={club} size={14} />{club.short || club.name}</> : lang === 'es' ? 'Libre' : 'Free agent'} · <Flag country={career.world.countries[player.nat]} size={9} /> {player.age}</small>
      </span>
      <span className="mg-pos">{posLabel(player.pos, lang)}</span>
      <OvrBadge value={player.ovr} range={known.exact ? null : known.ovr} size="sm" />
      <span className="mg-row__value">{money(player.value, lang)}</span>
      {extra}
      <ChevronRight size={16} className="mg-row__go" aria-hidden="true" />
    </button>
  );
}

export default function Transfers({ params }) {
  const { career, lang, t, setSheet } = useManager();
  const [tab, setTab] = useState(params?.tab || 'search');
  const window = transferWindowInfo(career);
  const negotiations = career.transfers.negotiations;
  const openOffers = career.transfers.offers.filter((o) => o.status === 'open');
  const tabs = [
    { id: 'search', label: t('Buscar', 'Search'), icon: Search },
    { id: 'shortlist', label: t('Seguimiento', 'Shortlist'), icon: Star, badge: career.transfers.shortlist.length || null },
    { id: 'talks', label: t('Negociaciones', 'Negotiations'), icon: Handshake, badge: negotiations.filter((n) => n.status === 'your-turn').length || null },
    { id: 'offers', label: t('Ofertas recibidas', 'Incoming offers'), icon: InboxIcon, badge: openOffers.length || null },
    { id: 'listed', label: t('En venta', 'Listed'), icon: Tag },
    { id: 'history', label: t('Historial', 'History'), icon: History },
  ];
  return (
    <div className="mg-transfers">
      <SectionTitle kicker={t('Mercado de fichajes', 'Transfer market')} title={window.open ? t('Mercado abierto', 'Window open') : t('Mercado cerrado', 'Window closed')}>
        <Pill tone={window.open ? 'good' : 'muted'} icon={Repeat}>{window.open ? t(`Cierra en ${window.daysLeft} días`, `Closes in ${window.daysLeft} days`) : t(`Abre en ${window.daysLeft} días`, `Opens in ${window.daysLeft} days`)}</Pill>
      </SectionTitle>
      <div className="mg-budget-bar">
        <div><Wallet size={16} /><span><small>{t('Para fichajes', 'Transfer budget')}</small><b>{money(transferRoom(career), lang)}</b></span></div>
        <div><span><small>{t('Margen de sueldos', 'Wage room')}</small><b className={wageRoom(career) < 0 ? 'is-bad' : ''}>{money(wageRoom(career), lang)}/{t('sem', 'wk')}</b></span></div>
        {!window.open && <p className="mg-muted">{t('Puedes negociar igual: el jugador llegará cuando abra la próxima ventana.', 'You can still negotiate: the player joins when the next window opens.')}</p>}
      </div>
      <Tabs tabs={tabs} value={tab} onChange={setTab} label={t('Fichajes', 'Transfers')} />
      {tab === 'search' && <SearchPanel onOpen={(id) => setSheet({ type: 'player', id })} />}
      {tab === 'shortlist' && (
        <div className="mg-list">
          {career.transfers.shortlist.map((id) => career.world.players[id]).filter(Boolean).map((p) => <PlayerRow key={p.id} player={p} onClick={() => setSheet({ type: 'player', id: p.id })} extra={<InterestDot player={p} />} />)}
          {!career.transfers.shortlist.length && <Empty icon={Star} title={t('No sigues a nadie', 'Your shortlist is empty')}>{t('Pulsa «Seguir» en la ficha de un jugador para tenerlo aquí.', 'Press "Shortlist" on a player profile to keep him here.')}</Empty>}
        </div>
      )}
      {tab === 'talks' && <Talks />}
      {tab === 'offers' && <Offers />}
      {tab === 'listed' && (
        <div className="mg-list">
          {Object.entries(career.transfers.listed).map(([id, entry]) => {
            const p = career.world.players[id];
            if (!p) return null;
            return <PlayerRow key={id} player={p} onClick={() => setSheet({ type: 'player', id })} extra={<Pill tone="accent">{entry.type === 'loan' ? t('Cedible', 'Loan') : t('Transferible', 'Sale')}</Pill>} />;
          })}
          {!Object.keys(career.transfers.listed).length && <Empty icon={Tag} title={t('No tienes a nadie en venta', 'Nobody listed')}>{t('Desde la ficha de un jugador tuyo puedes ponerlo en venta o cedido. Así llegan más ofertas.', 'From one of your player profiles you can list him for sale or loan. More offers will come.')}</Empty>}
        </div>
      )}
      {tab === 'history' && <HistoryPanel />}
    </div>
  );
}

function InterestDot({ player }) {
  const { career, lang } = useManager();
  const label = interestLabel(playerInterest(career, player));
  return <span className={`mg-interest-dot is-${label}`} title={L[lang].interest[label]}>{L[lang].interest[label]}</span>;
}

function SearchPanel({ onOpen }) {
  const { career, lang, t } = useManager();
  const [filters, setFilters] = useState({ text: '', line: null, pos: null, maxAge: 40, minOvr: 0, maxValue: Infinity, sort: 'ovr', freeOnly: false, league: null });
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const results = useMemo(() => searchPlayers(career, { ...filters, limit: 80 }), [career, filters, career.version]);
  const budget = transferRoom(career);
  const leagues = Object.values(career.world.leagues).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="mg-search-panel">
      <div className="mg-filters">
        <label className="mg-search"><Search size={15} /><input value={filters.text} onChange={(e) => set({ text: e.target.value })} placeholder={t('Nombre o club', 'Name or club')} /></label>
        <select value={filters.pos || filters.line || ''} onChange={(e) => { const v = e.target.value; set(['GK', 'DF', 'MF', 'FW'].includes(v) ? { line: v, pos: null } : { pos: v || null, line: null }); }} aria-label={t('Posición', 'Position')}>
          <option value="">{t('Todas las posiciones', 'All positions')}</option>
          <option value="GK">{t('Porteros', 'Goalkeepers')}</option><option value="DF">{t('Defensas', 'Defenders')}</option><option value="MF">{t('Centrocampistas', 'Midfielders')}</option><option value="FW">{t('Delanteros', 'Forwards')}</option>
          {POSITIONS.filter((p) => p !== 'GK').map((p) => <option key={p} value={p}>{posLabel(p, lang)}</option>)}
        </select>
        <select value={filters.maxAge} onChange={(e) => set({ maxAge: Number(e.target.value) })} aria-label={t('Edad máxima', 'Max age')}>
          {[40, 30, 27, 24, 21, 19].map((age) => <option key={age} value={age}>{age === 40 ? t('Cualquier edad', 'Any age') : t(`Hasta ${age} años`, `Up to ${age}`)}</option>)}
        </select>
        <select value={filters.maxValue === Infinity ? 'any' : filters.maxValue} onChange={(e) => set({ maxValue: e.target.value === 'any' ? Infinity : Number(e.target.value) })} aria-label={t('Precio máximo', 'Max price')}>
          <option value="any">{t('Cualquier precio', 'Any price')}</option>
          <option value={budget}>{t('Lo que me puedo permitir', 'What I can afford')}</option>
          {[1e6, 5e6, 15e6, 40e6].map((v) => <option key={v} value={v}>{t('Hasta', 'Up to')} {money(v, lang)}</option>)}
        </select>
        <select value={filters.league || ''} onChange={(e) => set({ league: e.target.value || null })} aria-label={t('Liga', 'League')}>
          <option value="">{t('Todas las ligas', 'All leagues')}</option>
          {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select value={filters.sort} onChange={(e) => set({ sort: e.target.value })} aria-label={t('Ordenar', 'Sort')}>
          <option value="ovr">{t('Mejor media', 'Best rating')}</option><option value="pot">{t('Más potencial', 'Most potential')}</option><option value="age">{t('Más jóvenes', 'Youngest')}</option><option value="cheap">{t('Mejor precio', 'Best value')}</option>
        </select>
        <label className="mg-check"><input type="checkbox" checked={filters.freeOnly} onChange={(e) => set({ freeOnly: e.target.checked })} />{t('Solo libres', 'Free agents')}</label>
      </div>
      <div className="mg-list">
        {results.map((p) => <PlayerRow key={p.id} player={p} onClick={() => onOpen(p.id)} />)}
        {!results.length && <Empty icon={Search} title={t('Nadie con esos filtros', 'Nobody matches')} />}
      </div>
    </div>
  );
}

const STATUS_ICON = { 'your-turn': AlertCircle, waiting: Hourglass, done: CheckCircle2, failed: XCircle, agreed: CheckCircle2 };

function Talks() {
  const { career, lang, t, setSheet } = useManager();
  const [kind, setKind] = useState('buying');
  const list = career.transfers.negotiations.filter((n) => (kind === 'buying' ? ['buy', 'free', 'precontract', 'loan-in'].includes(n.kind) : n.kind === 'renew'));
  const statusText = { 'your-turn': t('Te toca', 'Your move'), waiting: t('Esperando', 'Waiting'), done: t('Cerrado', 'Done'), failed: t('Fallido', 'Failed'), agreed: t('Acordado', 'Agreed') };
  return (
    <div className="mg-talks">
      <div className="mg-chips">
        <button type="button" className={kind === 'buying' ? 'is-active' : ''} onClick={() => setKind('buying')}>{t('Compras y cesiones', 'Buying & loans')}</button>
        <button type="button" className={kind === 'renew' ? 'is-active' : ''} onClick={() => setKind('renew')}>{t('Renovaciones', 'Renewals')}</button>
      </div>
      <div className="mg-table-wrap">
        <table className="mg-table mg-table--talks">
          <thead><tr><th>{t('Pos', 'Pos')}</th><th>{t('Club', 'Club')}</th><th>{t('Jugador', 'Player')}</th><th>{t('Media', 'OVR')}</th><th>{t('Edad', 'Age')}</th><th>{t('Valor', 'Value')}</th><th>{t('Estado', 'Status')}</th></tr></thead>
          <tbody>
            {list.map((n) => {
              const p = career.world.players[n.playerId];
              if (!p) return null;
              const Icon = STATUS_ICON[n.status] || Hourglass;
              return (
                <tr key={n.id} className="is-clickable" onClick={() => setSheet({ type: 'negotiation', id: n.id })}>
                  <td><span className="mg-pos">{posLabel(p.pos, lang)}</span></td>
                  <td><Crest team={teamInfo(career, n.clubId)} size={22} /></td>
                  <td><b>{p.name}</b><small className="mg-block mg-muted">{negotiationLine(career, n, n.log[n.log.length - 1] || { key: '' }, lang, n.log.length - 1).text.slice(0, 70)}…</small></td>
                  <td><OvrBadge value={p.ovr} size="sm" /></td>
                  <td>{p.age}</td>
                  <td>{money(p.value, lang)}</td>
                  <td><span className={`mg-status is-${n.status}`}><Icon size={15} />{statusText[n.status]}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!list.length && <Empty icon={Handshake} title={t('No hay negociaciones', 'No negotiations')}>{t('Busca un jugador y pulsa «Preguntar por su fichaje».', 'Find a player and press "Enquire to buy".')}</Empty>}
      </div>
    </div>
  );
}

function Offers() {
  const { career, lang, t, setMoments } = useManager();
  const offers = career.transfers.offers.slice(0, 30);
  const status = { open: t('Pendiente', 'Pending'), accepted: t('Aceptada', 'Accepted'), rejected: t('Rechazada', 'Rejected'), withdrawn: t('Retirada', 'Withdrawn'), expired: t('Caducada', 'Expired') };
  return (
    <div className="mg-list">
      {offers.map((o) => {
        const p = career.world.players[o.playerId];
        if (!p) return null;
        return (
          <button type="button" key={o.id} className={`mg-row ${o.status === 'open' ? 'is-highlight' : ''}`} onClick={() => o.status === 'open' && setMoments((m) => [...m, { type: 'offer', offer: o.id }])}>
            <Crest team={teamInfo(career, o.clubId)} size={32} />
            <span className="mg-row__main"><b>{teamName(career, o.clubId, lang)}</b><small>{o.loan ? t(`Cesión de ${p.name}`, `Loan for ${p.name}`) : t(`Quiere a ${p.name}`, `Wants ${p.name}`)} · {shortDate(o.date, lang)}</small></span>
            <span className="mg-row__value">{o.loan ? `${o.wageShare}% ${t('sueldo', 'wages')}` : money(o.fee, lang)}</span>
            <Pill tone={o.status === 'open' ? 'accent' : 'muted'}>{status[o.status]}</Pill>
          </button>
        );
      })}
      {!offers.length && <Empty icon={InboxIcon} title={t('No han llegado ofertas', 'No offers yet')}>{t('Pon jugadores en venta para recibir más ofertas.', 'List players to get more offers.')}</Empty>}
    </div>
  );
}

function HistoryPanel() {
  const { career, lang, t, setSheet } = useManager();
  const [scope, setScope] = useState('league');
  const league = career.world.clubs[career.clubId].leagueId;
  const log = career.transfers.log.filter((e) => scope === 'all' || e.from === career.clubId || e.to === career.clubId || (scope === 'league' && (career.world.clubs[e.from]?.leagueId === league || career.world.clubs[e.to]?.leagueId === league)));
  return (
    <div>
      <div className="mg-chips">
        {[['mine', t('Mi club', 'My club')], ['league', t('Mi liga', 'My league')], ['all', t('Todo el mundo', 'Worldwide')]].map(([id, label]) => <button type="button" key={id} className={scope === id ? 'is-active' : ''} onClick={() => setScope(id)}>{label}</button>)}
      </div>
      <div className="mg-list">
        {log.filter((e) => scope !== 'mine' || e.from === career.clubId || e.to === career.clubId).slice(0, 120).map((e, i) => {
          const p = career.world.players[e.playerId];
          return (
            <button type="button" key={`${e.playerId}-${i}`} className="mg-row mg-row--history" onClick={() => p && setSheet({ type: 'player', id: p.id })}>
              <small className="mg-row__date">{shortDate(e.date, lang)}</small>
              <span className="mg-row__main"><b>{p?.name}</b><small><Crest team={teamInfo(career, e.from)} size={14} />{teamName(career, e.from, lang, true)} → <Crest team={teamInfo(career, e.to)} size={14} />{e.to ? teamName(career, e.to, lang, true) : t('Libre', 'Released')}</small></span>
              <span className="mg-row__value">{e.kind === 'loan-in' || e.kind === 'loan-out' ? t('Cesión', 'Loan') : e.fee ? money(e.fee, lang) : t('Gratis', 'Free')}</span>
            </button>
          );
        })}
        {!log.length && <Empty icon={History} title={t('Todavía no hay traspasos', 'No transfers yet')} />}
      </div>
    </div>
  );
}

export { unlistPlayer, Meter };
