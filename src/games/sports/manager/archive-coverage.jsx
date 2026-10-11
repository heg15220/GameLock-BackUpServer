import React, { useMemo, useState } from 'react';
import { getArchiveCoverage } from './archive-coverage.js';

export default function ArchiveCoverage({ year, t }) {
  const [selectedYear, setYear] = useState(Number(year) || 2012);
  const [leagueId, setLeague] = useState('laliga');
  const rows = useMemo(() => getArchiveCoverage(selectedYear), [selectedYear]);
  const selected = rows.find(r => r.id === leagueId) || rows[0];
  const confirmed = rows.filter(r => r.windows?.coverage === 'complete-regular-windows').length;
  return <div className="fm-archive-inspector" data-testid="archive-coverage">
    <h3>{t('Consultar las 51 ligas por temporada', 'Explore all 51 leagues by season')}</h3>
    <p>{t('Cobertura del archivo instalado. Las partidas guardadas conservan sus fuentes originales. Tener una lista no significa tener todos los futbolistas ni una plantilla exacta del día inicial.', 'Installed archive coverage. Saved careers retain their original sources. A list does not establish every player or an exact opening-day squad.')}</p>
    <div className="fm-archive-filters">
      <label>{t('Año del archivo', 'Archive year')}<select aria-label={t('Año del archivo', 'Archive year')} value={selectedYear} onChange={e => setYear(Number(e.target.value))}>{Array.from({ length: 36 }, (_, i) => 1990 + i).map(y => <option key={y}>{y}</option>)}</select></label>
      <label>{t('Liga del archivo', 'Archive league')}<select aria-label={t('Liga del archivo', 'Archive league')} value={selected.id} onChange={e => setLeague(e.target.value)}>{rows.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
    </div>
    <p><strong>{rows.filter(r => r.membership.available).length}/51</strong> {t('ligas con participantes documentados', 'leagues with documented participants')} · <strong>{confirmed}/51</strong> {t('con ambas ventanas documentadas', 'with both windows documented')}</p>
    <div className="fm-archive-summary" aria-live="polite">
      <strong>{selected.name} · {selected.membership.seasonLabel || selectedYear}</strong>
      <span>{t('Participantes', 'Participants')}: {selected.membership.available ? `${selected.clubs.length} ${t('clubes documentados', 'documented clubs')}` : t('Sin lista verificada; no disponible para empezar', 'No verified list; unavailable for a new career')}</span>
      <span>{t('Plantillas con una lista fuente', 'Squads with a source list')}: {selected.clubsWithLists}/{selected.clubs.length || '—'}</span>
      <span>{t('Mercados ordinarios', 'Regular transfer windows')}: {selected.windows?.documented || 0}/2 {t('con fechas completas documentadas', 'with fully documented dates')}{Boolean(selected.windows?.partialBoundaries) && ` · ${selected.windows.partialBoundaries} ${t('con solo el cierre confirmado', 'with only the closing date confirmed')}`}</span>
      {selected.windows?.regularWindows?.map(window => <span key={window.slot}>
        {window.slot === 'primary' ? t('Principal', 'Primary') : t('Secundario', 'Secondary')}: {window.start} → {window.end} · {window.precision === 'confirmed' ? t('documentado', 'documented') : window.endPrecision === 'confirmed' ? t('apertura estimada, cierre documentado', 'estimated opening, documented closing') : t('estimado', 'estimated')}
        {window.sourceUrls.map((url, i) => <React.Fragment key={url}> · <a href={url} target="_blank" rel="noreferrer">{t('Fuente', 'Source')} {i + 1} ↗</a></React.Fragment>)}
      </span>)}
      {selected.membership.source && <a href={selected.membership.source} target="_blank" rel="noreferrer">{t('Fuente de participantes', 'Participant source')} ↗</a>}
    </div>
    {selected.clubs.length > 0 && <details><summary>{t('Consultar clubes y lagunas', 'View clubs and gaps')}</summary><ul className="fm-archive-clubs">{selected.clubs.map(c => <li key={c.id}><strong>{c.name}</strong><span>{c.hasList ? `${t('Lista documentada', 'Documented list')}${c.rows ? ` · ${c.rows} ${t('registros', 'records')}` : ''}` : t('Sin lista de temporada; puede haber jugadores documentados por otras fuentes', 'No season list; other sources may document individual players')}</span>{c.source && <a href={c.source} target="_blank" rel="noreferrer">{c.license || t('Evidencia editorial', 'Editorial evidence')} ↗</a>}</li>)}</ul></details>}
    <a href="/data/football-manager/archive-coverage.json" target="_blank" rel="noreferrer">{t('Descargar cobertura de 1990 a 2025', 'Download coverage from 1990 to 2025')} ↗</a>
  </div>;
}
