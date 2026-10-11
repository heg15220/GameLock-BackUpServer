import React from 'react';
import { formatMoney } from './recruitment-utils.js';

export const emptyClubTerms = { installments: 0, upfrontPercent: 100, sellOnPercent: 0, buybackFee: null, buybackYears: 2 };
export const emptyLoanTerms = { months: 12, fee: 0, wageShare: 100, purchaseType: 'none', purchaseFee: 0 };
export function AmountField({ label, value, onChange, min = 0, max, nullable = false, disabled = false }) {
  return <label>{label}<input aria-label={label} type="number" min={min} max={max} step="1" value={value ?? ''} disabled={disabled} required={!nullable}
    onChange={e => onChange(e.target.value === '' ? (nullable ? null : '') : Number(e.target.value))} /></label>;
}
export function ClubClauseFields({ value, onChange, t, disabled }) {
  const set = (key, next) => onChange({ ...value, [key]: next });
  return <details className="fm-clause-fields"><summary>{t('Estructura del pago y cláusulas', 'Payment structure and clauses')}</summary>
    <div className="fm-offer-fields">
      <label>{t('Pagos aplazados', 'Deferred payments')}<select disabled={disabled} value={value.installments} onChange={e => onChange({ ...value, installments: Number(e.target.value), upfrontPercent: Number(e.target.value) ? 50 : 100 })}>
        <option value="0">{t('Todo al incorporarse', 'Full payment on arrival')}</option><option value="2">{t('2 plazos', '2 instalments')}</option><option value="4">{t('4 plazos', '4 instalments')}</option>
      </select></label>
      {value.installments > 0 && <AmountField label={t('Pago inicial (%)', 'Initial payment (%)')} min={25} max={100} value={value.upfrontPercent} onChange={v => set('upfrontPercent', v)} disabled={disabled} />}
      <AmountField label={t('Porcentaje de futura venta (%)', 'Future sale percentage (%)')} max={30} value={value.sellOnPercent} onChange={v => set('sellOnPercent', v)} disabled={disabled} />
      <AmountField label={t('Precio de recompra (€)', 'Buyback price (€)')} value={value.buybackFee} nullable onChange={v => set('buybackFee', v)} disabled={disabled} />
      {value.buybackFee != null && <label>{t('Vigencia de recompra', 'Buyback term')}<select disabled={disabled} value={value.buybackYears} onChange={e => set('buybackYears', Number(e.target.value))}>{[1,2,3].map(n => <option value={n} key={n}>{n} {t(n === 1 ? 'año' : 'años', n === 1 ? 'year' : 'years')}</option>)}</select></label>}
    </div><p className="fm-note">{t('El club vendedor conserva el porcentaje y la recompra acordados. Los pagos futuros quedan comprometidos y reducen el presupuesto libre.', 'The selling club retains the agreed sell-on and buyback rights. Future payments are committed and reduce available funds.')}</p>
  </details>;
}
export function LoanTermsFields({ value, onChange, t, disabled = false }) {
  const set = (key, next) => onChange({ ...value, [key]: next });
  return <div className="fm-offer-fields">
    <label>{t('Duración de la cesión', 'Loan duration')}<select disabled={disabled} value={value.months} onChange={e => set('months', Number(e.target.value))}><option value="6">{t('6 meses', '6 months')}</option><option value="12">{t('12 meses', '12 months')}</option></select></label>
    <AmountField label={t('Tarifa de cesión (€)', 'Loan fee (€)')} value={value.fee} onChange={v => set('fee', v)} disabled={disabled} />
    <AmountField label={t('Salario a cargo del receptor (%)', 'Borrower wage share (%)')} max={100} value={value.wageShare} onChange={v => set('wageShare', v)} disabled={disabled} />
    <label>{t('Compra al finalizar', 'Purchase at loan end')}<select disabled={disabled} value={value.purchaseType} onChange={e => set('purchaseType', e.target.value)}>
      <option value="none">{t('Sin compra acordada', 'No purchase agreed')}</option><option value="option">{t('Opción de compra', 'Purchase option')}</option><option value="obligation">{t('Obligación de compra', 'Mandatory purchase')}</option>
    </select></label>
    {value.purchaseType !== 'none' && <AmountField label={t('Precio de compra acordado (€)', 'Agreed purchase price (€)')} min={1} value={value.purchaseFee} onChange={v => set('purchaseFee', v)} disabled={disabled} />}
  </div>;
}
export function LoanTermsSummary({ terms, t, lang }) {
  if (!terms) return null;
  return <><div className="fm-deal-terms"><span>{t('Duración', 'Duration')}<strong>{terms.months} {t('meses', 'months')}</strong></span><span>{t('Tarifa de cesión', 'Loan fee')}<strong>{formatMoney(terms.fee, lang)}</strong></span>
    <span>{t('Salario del receptor', 'Borrower wage share')}<strong>{terms.wageShare}%</strong></span><span>{terms.purchaseType === 'obligation' ? t('Compra obligatoria', 'Mandatory purchase') : terms.purchaseType === 'option' ? t('Opción de compra', 'Purchase option') : t('Al terminar', 'At the end')}<strong>{terms.purchaseType === 'none' ? t('Regresa a su club', 'Returns to owner') : formatMoney(terms.purchaseFee, lang)}</strong></span></div>
    {terms.purchaseType !== 'none' && terms.purchaseWage > 0 && <p className="fm-note">{t('Contrato pactado si se compra', 'Pre-agreed purchase contract')}: {terms.purchaseYears} {t('años', 'years')} · {t('Rotación', 'Rotation')} · {formatMoney(terms.purchaseWage,lang)} / {t('semana', 'week')}. {t('Sin prima adicional ni otra negociación al ejecutar la compra.', 'No additional bonus or further negotiation when the purchase is exercised.')}</p>}</>;
}
export function ArrivalField({ window, value, onChange, t }) {
  return <label>{t('Fecha de incorporación', 'Arrival timing')}<select value={!window.open && value === 'immediate' ? 'next-window' : value} onChange={e => onChange(e.target.value)}>
    {window.open && <option value="immediate">{t('Inmediata', 'Immediate')}</option>}<option value="next-window">{t('Próxima ventana', 'Next window')}</option><option value="next-season">{t('Próxima temporada', 'Next season')}</option>
  </select></label>;
}
