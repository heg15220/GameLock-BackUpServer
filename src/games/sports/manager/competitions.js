/** Manager-only extensions. Artwork stays with the existing Carrera catalogue. */
const rows = [
  ['england-league-one','League One','ENG','UEFA',3,0,'en.3'],
  ['england-league-two','League Two','ENG','UEFA',4,0,'en.4'],
  ['germany-3-liga','3. Liga','GER','UEFA',3,0,'de.3'],
  ['austria-bundesliga','Bundesliga de Austria','AUT','UEFA',1,1,'at.1'],
  ['austria-2-liga','2. Liga de Austria','AUT','UEFA',2,0,'at.2'],
  ['belgium-first-division','Primera División de Bélgica','BEL','UEFA',1,1,'be.1'],
  ['greece-super-league','Superliga de Grecia','GRE','UEFA',1,1,'gr.1'],
  ['scotland-premiership','Premiership de Escocia','SCO','UEFA',1,1,'sco.1'],
  ['switzerland-super-league','Superliga de Suiza','SUI','UEFA',1,1,'ch.1'],
  ['brasileirao-serie-b','Brasileirão Série B','BRA','CONMEBOL',2,0,'br.2','calendar'],
  ['japan-j1','J1 League','JPN','AFC',1,1,'jp.1','calendar'],
  ['china-super-league','Superliga de China','CHN','AFC',1,0,'cn.1','calendar'],
  ['australia-a-league','A-League','AUS','AFC',1,0,'au.1'],
  ['algeria-ligue-1','Ligue 1 de Argelia','ALG','CAF',1,0,'dz.1'],
  ['egypt-premier-league','Premier League de Egipto','EGY','CAF',1,0,'eg.1'],
  ['morocco-botola','Botola de Marruecos','MAR','CAF',1,0,'ma.1'],
];

export const managerCompetitionExtensions = rows.map(([id,name,country_fifa_code,confederation,tier,strength,dataset,calendar]) => ({
  id,name,country_fifa_code,confederation,tier,strength,dataset,
  seasonCalendar:calendar??'split',domesticCupId:null,logo:null,trophy:null,cupTrophy:null,
}));

export const RESERVE_PARENTS = {
  'barcelona-b':'barcelona','fc-barcelona-b':'barcelona',
  'real-madrid-castilla':'real-madrid','real-sociedad-b':'real-sociedad',
  'villarreal-b':'villarreal','sevilla-atletico':'sevilla',
  'borussia-dortmund-ii':'borussia-dortmund','vfb-stuttgart-ii':'vfb-stuttgart',
  'bayern-munchen-ii':'bayern-munchen','werder-bremen-ii':'werder-bremen',
  'austria-wien-ii':'austria-wien','young-violets-austria-wien':'austria-wien','fc-liefering':'rb-salzburg',
};
