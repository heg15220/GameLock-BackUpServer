// Narrow factual corrections to a specific source row. This is not a general
// preference for biographies over dated squad lists: every condition must match.
const corrections = [{
  id: 'deportivo-2024-dani-barcia-birth',
  clubId: 'deportivo-la-coruna', year: 2024,
  sourceRevision: '162190034', article: 'Daniel Barcia Rama',
  identityWiki: 'es', identityPageId: 10835156, wikidataId: 'Q116760254',
  from: '2003-01-17', to: '2003-01-19',
  sources: [
    'https://www.rcdeportivo.es/es/jugadores/depor/dani-barcia',
    'https://www.rcdeportivo.es/es/noticias/dani-barcia-renueva-por-el-depor-hasta-2028',
  ],
  source: 'https://es.wikipedia.org/w/index.php?oldid=162190034',
  biographySource: 'https://es.wikipedia.org/w/index.php?oldid=173795948',
  officialPublicationDate: '2025-02-13',
  reason: 'La tabla indica 17 de enero; el perfil oficial y la renovación publicada por el Deportivo confirman 19 de enero de 2003, coincidente con la biografía enlazada.',
}];

export function verifiedMultilingualBirthCorrection(context) {
  const correction=corrections.find(item=>
    ['clubId','year','sourceRevision','article','identityWiki','identityPageId','wikidataId'].every(key=>item[key]===context[key])
    &&item.from===context.rowBirthDate&&item.to===context.biographyBirthDate);
  return correction?{...correction,sources:[...correction.sources]}:null;
}

const sourceExclusions=[{
  id:'bolivar-2011-stale-season-heading',clubId:'bolivar',year:2011,sourceRevision:'59216527',
  source:'https://es.wikipedia.org/w/index.php?oldid=59216527',declaredSeason:'2011/12',
  sources:[
    'https://www.bolivar.com.bo/Noticias/2012-05-21/2383',
    'https://www.bolivar.com.bo/index.php/Noticias/2012-06-08/2479',
  ],
  reason:'La revisión de agosto de 2012 conserva el encabezado 2011/12, pero incluye a Carlos Lampe. El club documentó en mayo y junio de 2012 su incorporación para la siguiente temporada, que comenzaba el 15 de julio. Se excluye la fuente completa sin trasladar sus jugadores a otra temporada.',
}];

export function verifiedMultilingualSourceExclusion(context){
  const exclusion=sourceExclusions.find(item=>['clubId','year','sourceRevision'].every(key=>item[key]===context[key]));
  return exclusion?{...exclusion,sources:[...exclusion.sources]}:null;
}
