// Identity reconciliation is independent from the large roster archives.
export function linkedPlayerIdentities(row) {
  const keys=[...(row.identityKeys||[])];
  if(row.wikidataId)keys.push(`wikidata:${row.wikidataId}`);
  if(row.identityPageId)keys.push(`${row.identityWiki||'en'}.wikipedia.org:${row.identityPageId}`);
  if(row.researchPlayerId)keys.push(`wyscout:${row.researchPlayerId}`);
  if(/^https:\/\/(?:[a-z-]+\.wikipedia|www\.wikidata)\.org\/wiki\//.test(row.identitySource||''))keys.push(decodeURIComponent(row.identitySource).replaceAll('_',' ').toLowerCase());
  return [...new Set(keys)];
}
export const linkedPlayerIdentity=row=>linkedPlayerIdentities(row)[0]??null;
const exactBirth=row=>/^\d{4}-\d{2}-\d{2}$/.test(row.birthDate||'')?row.birthDate:null;
function namespaces(row){
  const values=new Map();
  for(const key of linkedPlayerIdentities(row)){
    const match=/^(wikidata|wyscout|[a-z-]+\.wikipedia\.org):(.+)$/.exec(key);if(!match)continue;
    if(!values.has(match[1]))values.set(match[1],new Set());values.get(match[1]).add(match[2]);
  }
  return values;
}
/** Distinct IDs on the same wiki/provider or distinct exact DOBs are positive
 * evidence of different people. Numeric page IDs from different wikis are not
 * comparable. A missing date is never itself evidence of sameness. */
export function identitiesCompatible(a,b){
  const ad=exactBirth(a),bd=exactBirth(b);if(ad&&bd&&ad!==bd)return false;
  const left=namespaces(a),right=namespaces(b);
  for(const [namespace,ids] of left){const others=right.get(namespace);if(others&&new Set([...ids,...others]).size>1)return false;}
  return true;
}

function interiorCareerYear(row){
  const record=row.record,year=Number(record.season);
  return record.sourceId==='wikimedia-verified-career'&&record.precision==='year-interior'&&record.scope==='individual-career'&&row.careerEvidencePrecision==='year-interior'&&Number.isInteger(year)&&Number.isInteger(row.stintFrom)&&Number.isInteger(row.stintTo)&&row.stintFrom<year&&year<row.stintTo?year:null;
}
function unresolvedSplitSeason(row,year){
  const record=row.record;
  if(record.precision!=='season'||record.evidenceCutoff||record.membershipDate||record.snapshotDate||record.membershipVerified||record.observations?.length||row.membershipVerified||row.membershipDate||row.observedDate||row.observations?.length)return false;
  const match=/^(\d{4})[\/–-](\d{2}|\d{4})$/.exec(String(record.season||''));
  if(!match||Number(match[1])!==year)return false;
  return match[2].length===2?Number(match[2])===(year+1)%100:Number(match[2])===year+1;
}
/** A validated interior calendar year is narrower than a season list that
 * might include a move in the following January. Keep dated observations and
 * calendar-year lists as conflicts; they cannot be dismissed on this basis.
 */
function resolveInteriorCareer(rows){
  const careers=rows.filter(row=>interiorCareerYear(row)!==null);
  if(!careers.length||new Set(careers.map(row=>row.clubId)).size!==1||new Set(careers.map(interiorCareerYear)).size!==1)return null;
  const chosen=careers[careers.length-1],year=interiorCareerYear(chosen);
  if(rows.some(row=>row.clubId!==chosen.clubId&&!unresolvedSplitSeason(row,year)))return null;
  return {chosen,resolution:{type:'whole-calendar-year-career',year,clubId:chosen.clubId,lessPreciseClubIds:[...new Set(rows.filter(row=>row.clubId!==chosen.clubId).map(row=>row.clubId))]}};
}

export function reconcileSeasonPlayerGroups(records,identity){
  const rows=records.flatMap(([clubId,record])=>record.players.map(row=>({...row,clubId,record})));
  const parent=rows.map((_,i)=>i),members=rows.map((_,i)=>[i]),invalid=new Set();
  rows.forEach((row,i)=>{if(!identitiesCompatible(row,row))invalid.add(i);});
  const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
  const compatible=(a,b)=>members[root(a)].every(i=>members[root(b)].every(j=>identitiesCompatible(rows[i],rows[j])));
  const join=(a,b)=>{a=root(a);b=root(b);if(a===b)return a;const bad=invalid.has(a)||invalid.has(b);parent[b]=a;members[a].push(...members[b]);members[b]=[];if(bad)invalid.add(a);return a;};
  // Shared strong identifiers precede names. Contradictory facts about one
  // strong identity quarantine the whole component rather than duplicating it.
  const owners=new Map();
  rows.forEach((row,i)=>{for(const key of linkedPlayerIdentities(row)){if(owners.has(key)){
    const other=owners.get(key),ok=compatible(i,other),combined=join(i,other);if(!ok)invalid.add(combined);
  }else owners.set(key,i);}});
  const names=new Map();
  rows.forEach((row,i)=>{for(const key of new Set([identity(row),...(row.fullName?[identity({...row,name:row.fullName})]:[])])){
    if(!names.has(key))names.set(key,[]);names.get(key).push(i);
  }});
  const ambiguous=new Set();
  for(const indices of names.values()){
    const groups=[...new Set(indices.map(root))].filter(group=>!invalid.has(group)&&!members[group].some(i=>ambiguous.has(i)));
    if(groups.length<2)continue;
    const choices=new Map(groups.map(group=>[group,groups.filter(other=>other!==group&&compatible(group,other))]));
    const safe=new Map(groups.map(group=>[group,choices.get(group).every((a,i,others)=>others.slice(i+1).every(b=>compatible(a,b)))]));
    for(const group of groups)if(!safe.get(group)&&members[group].every(i=>linkedPlayerIdentities(rows[i]).length===0))ambiguous.add(group);
    for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++){
      const a=groups[i],b=groups[j];if(safe.get(a)&&safe.get(b)&&compatible(a,b))join(a,b);
    }
  }
  const output=[];
  for(let group=0;group<rows.length;group++)if(root(group)===group&&members[group].length){
    const indices=[...members[group]].sort((a,b)=>a-b),clubs=[...new Set(indices.map(i=>rows[i].clubId))];
    // Preserve established source priority (the last original row wins), but
    // retain all source identity bridges gathered from the component.
    let chosen=rows[Math.max(...indices)];const identityKeys=[...new Set(indices.flatMap(i=>linkedPlayerIdentities(rows[i])))];
    const births=new Set(indices.map(i=>exactBirth(rows[i])).filter(Boolean));
    let reason=invalid.has(group)?births.size>1?'conflicting-birth-date':'conflicting-provider-identity':indices.some(i=>ambiguous.has(i))?'ambiguous-name-only':clubs.length>1?'multiple-clubs':null;
    const temporal=reason==='multiple-clubs'?resolveInteriorCareer(indices.map(i=>rows[i])):null;
    if(temporal){chosen=temporal.chosen;reason=null;}
    output.push({row:{...chosen,identityKeys},rows:indices.map(i=>rows[i]),clubs,reason,...(temporal?{resolution:temporal.resolution}:{})});
  }
  return output;
}

export function unambiguousSeasonPlayers(records,identity){
  return reconcileSeasonPlayerGroups(records,identity).filter(group=>!group.reason).map(group=>group.row);
}
