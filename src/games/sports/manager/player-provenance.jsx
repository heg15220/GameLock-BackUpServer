import React from "react";
import { defenderRoles } from "./lineup-roles.js";

export function provenanceLabel(player, t) {
  if (!player.real) return t("Jugador generado", "Generated player");
  if (player.source === "wikimedia-verified-career") return t("Trayectoria documentada · Wikimedia", "Documented career · Wikimedia");
  if (player.source === "research-match-sheet") return t("Convocatoria documentada · Pappalardo et al.", "Documented match sheet · Pappalardo et al.");
  if (player.source === "openfootball-squad") return t("Archivo de temporada", "Season archive");
  if (player.source === "wikimedia-season-squad") return t("Plantilla de temporada · Wikimedia", "Season squad · Wikimedia");
  if (player.source === "wikidata-history" || player.source === "wikidata") return t("Registro de Wikidata", "Wikidata record");
  return t("Selección histórica", "Historical selection");
}

/** The source describes the starting archive, never a later simulated transfer. */
export default function PlayerProvenance({ player, world, t }) {
  const initialClub = world.clubs.find((club) => club.id === player.initialClubId);
  const date = player.membershipDate || world.coverage?.snapshotDate;
  const sourceUrl = /^https:\/\//.test(player.sourceUrl || "") ? player.sourceUrl : null;
  const identityUrl = /^https:\/\//.test(player.identitySourceUrl || "") ? player.identitySourceUrl : null;
  const roles = player.position === "DF" ? defenderRoles(player) : [];
  const roleLabels = { RB: t("lateral derecho", "right back"), LB: t("lateral izquierdo", "left back"), CB: t("central", "centre back") };
  return <details className="fm-player-provenance">
    <summary>{player.real ? t("Real · ver procedencia", "Real · view provenance") : t("Generado · ver ficha", "Generated · view profile")}</summary>
    <div>
      <strong>{player.name}</strong>
      <span>{provenanceLabel(player, t)}{initialClub ? ` · ${initialClub.name}` : ""}</span>
      <span>{t("País de representación en el juego", "Represented country in the game")}: {player.nationality}</span>
      <span>{player.birthDate ? `${t("Nacimiento", "Born")}: ${player.birthDate}` : t("Edad aproximada: solo consta el año de nacimiento.", "Approximate age: only the birth year is recorded.")}</span>
      {player.birthDateCorrection && player.birthDateCorrection.to === player.birthDate && <span>{t("Fecha de nacimiento contrastada con el club", "Birth date checked against the club")}: {(player.birthDateCorrection.sources || []).filter(url => /^https:\/\//.test(url)).map((url, i) => <React.Fragment key={url}>{i > 0 && " · "}<a href={url} target="_blank" rel="noreferrer">{t("Fuente oficial", "Official source")} {i + 1} ↗</a></React.Fragment>)}</span>}
      {player.identityCorrection && player.identityCorrection.to?.wikidataId === player.wikidataId && <span>{t("Identidad contrastada con el club", "Identity checked against the club")}: {(player.identityCorrection.sources || []).filter(url => /^https:\/\//.test(url)).map((url, i) => <React.Fragment key={url}>{i > 0 && " · "}<a href={url} target="_blank" rel="noreferrer">{t("Fuente oficial", "Official source")} {i + 1} ↗</a></React.Fragment>)}</span>}
      {roles.length > 0 && <span>{t("Posiciones naturales del modelo", "Modelled natural positions")}: {roles.map((role) => roleLabels[role]).join(", ")}</span>}
      {player.real && date && player.membershipPrecision !== 'year-interior' && <span>{t("Archivo inicial", "Starting archive")}: {date}</span>}
      {player.membershipPrecision === 'year-interior' && <span>{t("Período documentado en el club", "Documented spell at the club")}: {player.stintFrom}–{player.stintTo}. {t("Año interior del período; no acredita una fecha exacta de inscripción ni la plantilla completa.", "Interior year of the spell; does not establish an exact registration date or the complete squad.")}</span>}
      {player.membershipPrecision === "season" && !player.evidenceCutoff && <span>{t("Afiliación documentada durante la temporada; puede incluir incorporaciones posteriores al inicio.", "Membership documented during the season; may include players joining after the start.")}</span>}
      {!player.real && <span>{t("Futbolista ficticio que completa la plantilla; no representa a una persona real.", "Fictional footballer filling the squad; does not represent a real person.")}</span>}
      <span>{t("OVR, potencial, valor y salario: estimaciones de la simulación.", "Rating, potential, value and wage: simulation estimates.")}</span>
      {sourceUrl && <a href={sourceUrl} target="_blank" rel="noreferrer">{t("Consultar fuente histórica ↗", "Read historical source ↗")}</a>}
      {player.sourceLicense === 'CC-BY-SA-4.0' && <><span>{player.sourceAttribution || t('Datos adaptados de colaboradores de Wikimedia; licencia CC BY-SA 4.0.', 'Data adapted from Wikimedia contributors; CC BY-SA 4.0 licence.')}</span><a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">{t('Licencia y atribución', 'Licence and attribution')} ↗</a>{/^https:\/\//.test(player.attributionUrl || '') && <a href={player.attributionUrl} target="_blank" rel="noreferrer">{t('Historial de contribuciones', 'Contribution history')} ↗</a>}</>}
      {player.sourceLicense === "CC-BY-4.0" && <><span>{player.sourceAttribution}</span><span>{t("Última fecha admitida de observación", "Observation cutoff")}: {player.evidenceCutoff}. {t("No acredita inscripción continua ni plantilla completa.", "Does not establish continuous registration or a complete squad.")}</span><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0 ↗</a></>}
      {identityUrl && identityUrl !== sourceUrl && <a href={identityUrl} target="_blank" rel="noreferrer">{t("Consultar fuente de identidad ↗", "Read identity source ↗")}</a>}
    </div>
  </details>;
}
