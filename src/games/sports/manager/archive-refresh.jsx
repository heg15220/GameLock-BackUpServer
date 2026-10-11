import React from "react";
import { getCareerRefreshEligibility } from "./engine.js";

export default function ArchiveRefresh({ career, currentRevision, onRefresh, onExport, t }) {
  if (!currentRevision || career.world.coverage?.archiveRevision === currentRevision) return null;
  const { eligible } = getCareerRefreshEligibility(career);
  return <section className="fm-archive-update" aria-label={t("Actualización del archivo histórico", "Historical archive update")}>
    <div><strong>{t("Hay correcciones de plantillas históricas disponibles.", "Historical squad corrections are available.")}</strong>
      <p>{eligible
        ? t("Puedes reconstruir esta carrera sin estrenar con las afiliaciones corregidas. Se actualizarán la plantilla, la fecha y el presupuesto inicial; conservarás tu club, entrenador, semilla y preferencias.", "You can rebuild this unstarted career with corrected affiliations. The squad, date and starting budget will update; your club, manager, seed and preferences will be kept.")
        : t("Esta partida conserva su archivo original y sus decisiones. Las correcciones se aplican al crear una nueva carrera; una carrera con actividad no se reconstruye.", "This save retains its original archive and decisions. Corrections apply to new careers; a career with activity cannot be rebuilt.")}</p>
    </div>
    {eligible && <div className="fm-archive-actions"><button className="fm-button fm-small" onClick={onRefresh}>{t("Actualizar plantilla inicial", "Update starting squad")}</button><button className="fm-text-button" onClick={onExport}>{t("Exportar copia", "Export backup")}</button></div>}
  </section>;
}
