import React from 'react';
import {ArrowLeftRight,MoveHorizontal,Shield,Target} from 'lucide-react';
import {TACTICAL_DEFAULTS} from './tactical-model.js';

const PRESETS = [
  {id:'control',name:['Controlar','Keep control'],description:['Apoyos cortos y conservar tras recuperar.','Short support and retention after regaining possession.'],
    values:{mentality:'balanced',pressing:'balanced',width:'wide',passing:'short',tempo:'low',defensiveLine:'balanced',transition:'hold',ballLoss:'regroup'}},
  {id:'space',name:['Atacar espacios','Attack space'],description:['Bloque bajo y salida vertical al recuperar.','A low block with a direct transition after regaining possession.'],
    values:{mentality:'balanced',pressing:'low',width:'wide',passing:'direct',tempo:'high',defensiveLine:'low',transition:'counter',ballLoss:'regroup'}},
  {id:'press',name:['Apretar arriba','Press high'],description:['Recuperar cerca del área rival; exige piernas frescas.','Win the ball higher up; requires fresh legs.'],
    values:{mentality:'attacking',pressing:'high',width:'balanced',passing:'mixed',tempo:'high',defensiveLine:'high',transition:'counter',ballLoss:'counterpress'}},
  {id:'protect',name:['Proteger ventaja','Protect the lead'],description:['Juntar líneas y asegurar la siguiente posesión.','Compact lines and secure the next possession.'],
    values:{mentality:'defensive',pressing:'low',width:'narrow',passing:'short',tempo:'low',defensiveLine:'low',transition:'hold',ballLoss:'regroup'}},
];
const GROUPS = [
  {id:'possession',icon:MoveHorizontal,title:['Con balón','In possession'],fields:[
    {key:'width',label:['Anchura','Width'],aria:['Anchura en el partido','In-match width'],options:[['narrow','Estrecha','Narrow'],['balanced','Equilibrada','Balanced'],['wide','Amplia','Wide']]},
    {key:'passing',label:['Pases','Passing'],aria:['Pases en el partido','In-match passing'],options:[['short','Cortos','Short'],['mixed','Mixtos','Mixed'],['direct','Directos','Direct']]},
    {key:'tempo',label:['Ritmo','Tempo'],aria:['Ritmo en el partido','In-match tempo'],options:[['low','Pausado','Patient'],['balanced','Equilibrado','Balanced'],['high','Alto','High']]},
  ]},
  {id:'defending',icon:Shield,title:['Sin balón','Out of possession'],fields:[
    {key:'defensiveLine',label:['Línea defensiva','Defensive line'],aria:['Línea defensiva en el partido','In-match defensive line'],options:[['low','Baja','Low'],['balanced','Media','Mid'],['high','Alta','High']]},
  ]},
  {id:'transition',icon:ArrowLeftRight,title:['Transiciones','Transitions'],fields:[
    {key:'transition',label:['Al recuperar','When possession is won'],aria:['Al recuperar en el partido','In-match possession won'],options:[['hold','Conservar','Hold'],['balanced','Según la jugada','Read the situation'],['counter','Contraatacar','Counter']]},
    {key:'ballLoss',label:['Al perder','When possession is lost'],aria:['Al perder en el partido','In-match possession lost'],options:[['regroup','Replegar','Regroup'],['balanced','Equilibrado','Balanced'],['counterpress','Contrapresión','Counter-press']]},
  ]},
];

export function tacticalInstructionWords(event,t) {
  const changed=event.changedKeys??[];
  return GROUPS.flatMap(group=>group.fields).filter(field=>changed.includes(field.key)).map(field=>{
    const option=field.options.find(([value])=>value===event[field.key]);
    return option?`${t(...field.label)}: ${t(option[1],option[2])}`:null;
  }).filter(Boolean);
}

export default function TacticalInstructions({tactics,modelVersion,onChange,t}) {
  if (!(modelVersion >= 3)) return <p className="fm-tactical-legacy">{t('Este encuentro conserva sus reglas originales. Las nuevas instrucciones estarán disponibles desde el siguiente partido.','This match retains its original rules. The new instructions will be available from the next match.')}</p>;
  const plan={...TACTICAL_DEFAULTS,...tactics};
  const active=PRESETS.find(preset=>Object.entries(preset.values).every(([key,value])=>plan[key]===value));
  const explain=(group)=>{
    if(group==='possession')return plan.passing==='direct'
      ? t('Busca receptores por delante del balón y espacio a la espalda. Más verticalidad puede costar posesión.','Look for forward receivers and space in behind. More direct play can cost possession.')
      : plan.passing==='short'
        ? t('Acerca apoyos y ofrece una salida por detrás. Circular con paciencia necesita precisión bajo presión.','Bring support closer and keep a passing option behind. Patient circulation needs accuracy under pressure.')
        : t('Alterna apoyos y pases hacia delante según la presión y el espacio.','Mix supporting and forward passes according to pressure and space.');
    if(group==='defending')return plan.defensiveLine==='high'
      ? t('Adelanta el bloque y reduce espacio entre líneas. Un rival que supere la presión encontrará espacio detrás.','Push the block up and reduce space between the lines. Opponents who beat the press will find space behind.')
      : plan.defensiveLine==='low'
        ? t('Protege la espalda y cierra el área, concediendo terreno para la circulación rival.','Protect the space behind and the penalty area, conceding territory for opposition circulation.')
        : t('Mantén coberturas y acompaña al balón sin romper el bloque. La presión decide cuándo saltar al poseedor.','Keep cover and shift with the ball without breaking the block. Pressing determines when to close the carrier.');
    return plan.ballLoss==='counterpress'
      ? t('Los más cercanos intentan recuperar; el resto cubre. Si llegan tarde, el rival puede superarles.','The nearest players try to recover the ball; the rest cover. If they arrive late, the opponent can break through.')
      : plan.transition==='counter'
        ? t('Tras recuperar, busca un pase hacia el espacio antes de que el rival se organice.','After regaining possession, look for a pass into space before the opposition reorganises.')
        : t('Tras perder, recupera el orden. Al ganar el balón, ofrece apoyos para decidir la salida.','After losing possession, restore the shape. On winning the ball, provide support to choose the way out.');
  };
  return <div className="fm-tactical-instructions" data-testid="tactical-instructions">
    <div className="fm-tactical-plan-title"><Target size={14} aria-hidden="true"/><span>{t('Plan de juego','Game plan')}</span><small>{active?t(...active.name):t('Personalizado','Custom')}</small></div>
    <div className="fm-tactical-presets" role="group" aria-label={t('Planes de juego','Game plans')}>
      {PRESETS.map(preset=><button key={preset.id} type="button" aria-pressed={active?.id===preset.id} title={t(...preset.description)} onClick={()=>onChange(preset.values)}>{t(...preset.name)}</button>)}
    </div>
    {GROUPS.map(({id,icon:Icon,title,fields})=><fieldset key={id} className={`fm-tactical-phase fm-tactical-phase-${id}`}>
      <legend><Icon size={13} aria-hidden="true"/>{t(...title)}</legend>
      <div className="fm-tactical-fields">{fields.map(field=><label key={field.key}>{t(...field.label)}<select aria-label={t(...field.aria)} value={plan[field.key]} onChange={event=>onChange({[field.key]:event.target.value})}>{field.options.map(([value,es,en])=><option key={value} value={value}>{t(es,en)}</option>)}</select></label>)}</div>
      <p>{explain(id)}</p>
    </fieldset>)}
    {(plan.tempo==='high'||plan.ballLoss==='counterpress')&&<p className="fm-tactical-effort">{t('Ritmo alto y contrapresión aumentan el esfuerzo. Ajusta el plan si cae la condición del equipo.','High tempo and counter-pressing increase effort. Adjust the plan as the team tires.')}</p>}
  </div>;
}
