import {JSDOM} from 'jsdom';

const clean=value=>String(value??'').replace(/\[[^\]]*\]/g,'').replace(/\s+/g,' ').trim();
const teamHeader=/^(?:teams?|clubs?|clubes|equipos?(?: de f[uú]tbol)?|équipes?)(?:\s*\([^)]*\))?$/i;
const standingHeader=/\b(?:pts|points|puntos|pj|pld|played|pos|position)\b/i;
const participantsSection=/teams|equipos|équipes|participantes|participants|club information|stadia|stadiums|stadios|stades|locations/i;
const elimination=/top scorers|goleadores|goalscorers|semi.final|quarter.final|finals|play.off|final phase|phase finale|relégation|relegation|promoci[oó]n|repechaje|cuartos|semifinal|descenso|acumulada|aggregate|overall|combined|annual table|liguilla|triangular|hexagonal|final round|championship (?:group|round)|grupo campeonato|fase campeonato/i;
const nonParticipants=/manager|personnel|sponsor|relevos|entrenador|plantilla|transfer|traspas|foreign|extranjer|uniform|statistics|statistiques|estad[ií]stic|disciplin|fair.play|awards|tarjetas|best xi|best eleven|team of|alineaci[oó]n|\bkits?\b/i;
const locationHeader=/stadium|ground|city|location|estadio|ciudad|sede|capacity|capacidad|stade|ville|capacité/i;

/** Extract only labelled league participant/regular-standing tables, never arbitrary page links. */
export function parseWikiMembershipTables(html){
  const dom=new JSDOM(String(html).replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'')),document=dom.window.document;
  for(const node of document.querySelectorAll('sup,.sortkey,.flagicon,.mw-editsection,.navbar'))node.remove();
  const headings=[],tables=[];let namedStage=null;
  for(const element of document.querySelectorAll('h2,h3,h4,h5,table')){
    if(element.tagName.startsWith('H')){const level=Number(element.tagName.slice(1));headings[level]=clean(element.textContent);headings.length=level+1;if(/^(?:Apertura|Clausura|Invierno|Verano)(?:\s+\d+)?$/i.test(headings[level]))namedStage=headings[level];continue;}
    const rows=[...element.rows].filter(row=>row.closest('table')===element);
    let headerRow=-1,teamColumn=-1,headerText='';
    for(let index=0;index<Math.min(4,rows.length);index++){
      const cells=[...rows[index].cells];
      const column=cells.findIndex(cell=>cell.tagName==='TH'&&teamHeader.test(clean(cell.textContent)));
      if(column>=0){headerRow=index;teamColumn=column;headerText=cells.map(cell=>clean(cell.textContent)).join(' ');break;}
    }
    if(teamColumn<0)continue;
    let context=[...headings.filter(Boolean),clean(element.caption?.textContent)].filter(Boolean).join(' / ');
    const isStandings=standingHeader.test(headerText);
    // Some articles misnest a real Standings heading under Managerial changes.
    // Recover only an explicitly named standings table, never its personnel table.
    if(namedStage&&nonParticipants.test(context)&&/^(?:Standings|League table|Clasificación)$/i.test(headings.filter(Boolean).at(-1))&&isStandings&&!nonParticipants.test(headerText))context=`${namedStage} / ${headings.filter(Boolean).at(-1)}`;
    // Older Salvadoran articles put the whole tournament below this heading;
    // the explicit general standings are distinct from a relegation ranking.
    if(/^Ascenso y descenso\s*\/\s*Tabla de posiciones$/i.test(context)&&isStandings)context='Tabla de posiciones';
    const isParticipants=participantsSection.test(context)||locationHeader.test(headerText);
    if(!isStandings&&!isParticipants)continue;
    const personnelOnly=nonParticipants.test(headerText)&&!locationHeader.test(headerText);
    const staffChanges=/outgoing|replaced|vacancy|manner of departure|date of appointment|saliente|entrante|relevo/i.test(headerText);
    if(elimination.test(context)||nonParticipants.test(context)||personnelOnly||staffChanges)continue;
    const teams=[],seen=new Set();
    for(const row of rows.slice(headerRow+1)){
      const cell=row.cells[teamColumn];if(!cell||row.cells.length<teamColumn+2)continue;
      const anchors=[...cell.querySelectorAll('a[href]')].filter(anchor=>{
        const href=anchor.getAttribute('href');return /^(?:\.\/|\/wiki\/|\/w\/index\.php\?title=)/.test(href)&&!/(?:File|Image|Template|Help|Category):/.test(href)&&clean(anchor.textContent).length>1;
      });
      // Some Spanish team lists group several clubs by city in one cell.
      // Retain club identities, but not adjacent links to a club's season.
      for(const anchor of anchors.length?anchors:[null]){
        const name=clean(anchor?.textContent??cell.textContent).replace(/\s*\((?:C|R|P|O|A|Q)(?:,\s*[A-Z])*\)\s*$/,'');
        if(!name||/^\d+$|^(?:Total|TBD|Por definir)$/i.test(name))continue;
        const href=anchor?.getAttribute('href');
        const article=href?.startsWith('/w/index.php')?new URL(href,'https://en.wikipedia.org').searchParams.get('title').replace(/_/g,' '):href?decodeURIComponent(href.replace(/^(?:\.\/|\/wiki\/)/,'').split('#')[0]).replace(/_/g,' '):name;
        if(!article||seen.has(article))continue;
        // Ecuador 2010/2011 append '(details)' linking to LDU Quito's season.
        // That link is navigation, not an additional participant. Keep numeric
        // club names (e.g. 1899 Hoffenheim) and grouped clubs in the same cell.
        if(/^(?:details|detalles|détails)$/i.test(name)&&/^\d{4}(?:[–-]\d{2,4})?\s.+\sseason$/i.test(article))continue;
        seen.add(article);teams.push({name,article});
      }
    }
    if(teams.length>=4&&teams.length<=48)tables.push({context,kind:isStandings?'standings':'participants',teams});
  }
  const infobox=[...document.querySelectorAll('table.infobox tr')].map(row=>({key:clean(row.querySelector('th')?.textContent),value:clean(row.querySelector('td')?.textContent)}));
  const countRow=infobox.find(row=>/^(?:teams|number of teams|equipos|participantes)$/i.test(row.key));
  const headingCount=[...document.querySelectorAll('h2,h3')].map(heading=>/(\d{1,2})\s+(?:clubs|équipes)\s+participants/i.exec(heading.textContent)).find(Boolean);
  const expectedCount=/^\d{1,2}$/.test(countRow?.value??'')?Number(countRow.value):headingCount?Number(headingCount[1]):null;
  dom.window.close();
  return {tables,expectedCount};
}

export function selectWikiParticipants(parsed,{expectedCount=null,maxTeams=32,preferredStage=null}={}){
  const count=expectedCount??parsed.expectedCount;
  const grouped=new Map();
  for(const table of parsed.tables){
    const match=/^(.*?)(?:\s*\/\s*)?(?:Zone|Group|Zona|Grupo|Conferencia)\s+(A|B|1|2|Este|Oeste)\b.*$/i.exec(table.context)
      ??/^(.*?)(Interior|Metropolitana)\s+Zone(?:\s+Standings)?$/i.exec(table.context);
    if(!match)continue;
    const parent=match[1].replace(/\s*\/\s*$/,'');
    const key=`${table.kind}:${parent}`;
    if(!grouped.has(key))grouped.set(key,new Map());
    grouped.get(key).set(match[2].toLowerCase(),table);
  }
  const unions=[];
  for(const [key,groups]of grouped){
    const keys=[...groups.keys()].sort().join(','),tables=[...groups.values()];
    if(!['a,b','1,2','este,oeste','interior,metropolitana'].includes(keys))continue;
    const teams=tables.flatMap(table=>table.teams);
    if(new Set(teams.map(team=>team.article)).size!==teams.length)continue;
    // Only complementary, explicitly labelled groups of the same phase may
    // form a league. A lone group is never an entire participant list.
    unions.push({context:key.slice(key.indexOf(':')+1),kind:tables[0].kind,teams,groups:tables.map(table=>table.context)});
  }
  const valid=[...parsed.tables,...unions].filter(table=>table.teams.length>=8&&table.teams.length<=maxTeams&&(!count||table.teams.length===count)
    &&(table.groups||!/(?:Zone|Group|Zona|Grupo|Conferencia)\s+\S+|\S+\s+Zone\b/i.test(table.context)));
  const namedStages=valid.filter(table=>table.kind==='standings'&&/apertura|clausura|verano|invierno|transici[oó]n/i.test(table.context));
  const stage=preferredStage?namedStages.find(table=>new RegExp(preferredStage,'i').test(table.context)):null;
  // A short or out-of-date stadium table cannot override a fuller regular table.
  const candidate=stage??valid.sort((a,b)=>b.teams.length-a.teams.length||(a.kind==='participants'?-1:1))[0];
  if(!candidate)return {valid:false,reason:'no-complete-labelled-team-table',tableCounts:parsed.tables.map(table=>({context:table.context,count:table.teams.length}))};
  return {valid:true,teams:candidate.teams,tableContext:candidate.context,validation:{method:'complete-labelled-wikimedia-table',participantCount:candidate.teams.length,...(count?{expectedCount:count}:{}),...(candidate.groups?{combinedGroups:candidate.groups}:{})},stages:namedStages.map(table=>({name:table.context,teams:table.teams}))};
}
