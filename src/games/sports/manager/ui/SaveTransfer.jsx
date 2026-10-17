import React, { useRef, useState } from 'react';
import { Copy, Download, KeyRound } from 'lucide-react';
import { Sheet } from './components.jsx';
import { useManager } from './context.jsx';
import { downloadExport } from '../career/save.js';

async function copyText(text, field) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch { field?.focus(); field?.select(); return false; }
}

export default function SaveTransfer({ transfer, onClose }) {
  const { t } = useManager();
  const [copied, setCopied] = useState(null);
  const [manual, setManual] = useState(false);
  const [showLong, setShowLong] = useState(false);
  const codeRef = useRef(null);
  const shortRef = useRef(null);
  const cloud = transfer?.cloud;
  const copy = async (which) => {
    const ok = await copyText(which === 'short' ? cloud.code : transfer.code, which === 'short' ? shortRef.current : codeRef.current);
    if (ok) setCopied(which); else setManual(true);
  };
  const longOpen = showLong || cloud?.state === 'failed';
  return (
    <Sheet open onClose={onClose} title={t('Guardar y llevar tu carrera', 'Save and take your career')}>
      <div className="mg-save-transfer">
        {!transfer?.code ? <p role="status">{t('Preparando el guardado…', 'Preparing save…')}</p> : <>
          <p>{t('Partida guardada en este dispositivo. Para seguir en otro, abre Modo mánager → Importar partida y escribe tu código.', 'Career saved on this device. To continue on another one, open Manager mode → Import save and type your code.')}</p>
          <label htmlFor="mg-cloud-code"><KeyRound size={14} aria-hidden="true" /> {t('Tu código de partida', 'Your career code')}</label>
          {cloud?.state === 'saved' ? <>
            <input id="mg-cloud-code" ref={shortRef} className="mg-input mg-input--code" readOnly value={cloud.code} onFocus={e => e.target.select()} />
            <div className="mg-save-transfer__actions">
              <button type="button" className="mg-btn mg-btn--primary" onClick={() => copy('short')}><Copy size={16} />{copied === 'short' ? t('Copiado', 'Copied') : t('Copiar código', 'Copy code')}</button>
            </div>
            <p className="mg-muted">{t('Es la llave de esta carrera: cada vez que guardes se actualiza con tus últimos avances, en cualquier dispositivo. No lo compartas si no quieres que otra persona continúe tu partida. Caduca tras un año sin abrirla.', 'It is the key to this career: every save updates it with your latest progress, on any device. Do not share it unless you want someone else to continue your career. It expires after a year without being opened.')}</p>
          </> : cloud?.state === 'failed'
            ? <p role="status">{t('No se ha podido conectar con el servidor. Usa el código largo o el archivo de abajo; funcionan sin conexión.', 'Could not reach the server. Use the long code or the file below; they work offline.')}</p>
            : <p role="status">{t('Subiendo la partida…', 'Uploading the career…')}</p>}
          <p className="mg-muted">{transfer.date} · {(transfer.blob.size / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })} KB</p>
          {!longOpen && <button type="button" className="mg-link" onClick={() => setShowLong(true)}>{t('Sin conexión: código largo o archivo', 'Offline: long code or file')}</button>}
          {longOpen && <>
            <label htmlFor="mg-export-code">{t('Código largo (contiene la partida completa)', 'Long code (contains the whole career)')}</label>
            <textarea id="mg-export-code" ref={codeRef} readOnly value={transfer.code} rows={4} spellCheck={false} onFocus={e => e.target.select()} />
            <div className="mg-save-transfer__actions">
              <button type="button" className="mg-btn" onClick={() => copy('long')}><Copy size={16} />{copied === 'long' ? t('Copiado', 'Copied') : t('Copiar código largo', 'Copy long code')}</button>
              <button type="button" className="mg-btn" onClick={() => downloadExport(transfer)}><Download size={16} />{t('Descargar archivo', 'Download file')}</button>
            </div>
          </>}
          {manual && <p role="status">{t('El navegador no ha permitido copiar automáticamente. El código está seleccionado: usa Copiar en tu dispositivo.', 'The browser could not copy automatically. The code is selected: use Copy on your device.')}</p>}
        </>}
      </div>
    </Sheet>
  );
}
