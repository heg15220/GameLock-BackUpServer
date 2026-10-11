/**
 * Factual affiliations checked against club/federation archives. Player ratings,
 * potential, positions and economics are original estimates for this simulation.
 * complete means the selected senior squad, not every academy registration.
 * 2013 deliberately starts after the 2 September transfer deadline.
 */
const MADRID_2013='https://datencenter.dfb.de/competitions/champions-league/seasons/2013-2014/teams/real-madrid?datacenter_name=datencenter';
const BARCELONA_2013='https://www.fcbarcelona.com/en/news/1136247/this-seasons-shirt-numbers-confirmed';
const BAYERN_2013='https://fcbayern.com/en/club/honours/german-championship/season-2013-2014';
const DEPORTIVO_2011='https://es.wikipedia.org/w/index.php?title=Real_Club_Deportivo_de_La_Coru%C3%B1a&oldid=49439402';
export const editorialRosters = {
  1992: {
    leeds: {
      asOf:'1992-09-01',complete:false,precision:'exact-snapshot',
      sourceUrl:'https://www.uefa.com/uefachampionsleague/news/01e8-0e6a0ecfee35-005da267e7f5-1000--football-in-november-1992/',
      note:'Cantona no llegó al Manchester United hasta noviembre de 1992.',
      players:'Eric Cantona|1966|FRA|FW|87|93',
    },
  },
  2009: {
    'real-madrid': {
      asOf:'2009-09-01',complete:true,precision:'exact-snapshot',
      sourceUrl:'https://static.realmadrid.com/StaticFiles/RealMadrid/img/pdf/InformeRm09_10.pdf',
      note:'Primer equipo del informe anual 2009/10, antes de la salida invernal de Van Nistelrooy.',
      players:`Iker Casillas|1981|ESP|GK|91|92
Jerzy Dudek|1973|POL|GK|75|75
Antonio Adán|1987|ESP|GK|65|78
Álvaro Arbeloa|1983|ESP|DF|80|83
Pepe|1983|POR|DF|85|89
Sergio Ramos|1986|ESP|DF|86|92
Marcelo|1988|BRA|DF|79|89
Raúl Albiol|1985|ESP|DF|81|85
Ezequiel Garay|1986|ARG|DF|76|85
Christoph Metzelder|1980|GER|DF|77|79
Fernando Gago|1986|ARG|MF|79|86
Mahamadou Diarra|1981|MLI|MF|80|82
Kaká|1982|BRA|MF|91|92
Lassana Diarra|1985|FRA|MF|82|86
Guti|1976|ESP|MF|83|83
Royston Drenthe|1987|NED|MF|74|83
Xabi Alonso|1981|ESP|MF|87|89
Rafael van der Vaart|1983|NED|MF|83|87
Esteban Granero|1987|ESP|MF|77|84
Raúl González|1977|ESP|FW|86|86
Cristiano Ronaldo|1985|POR|FW|93|96
Karim Benzema|1987|FRA|FW|84|93
Ruud van Nistelrooy|1976|NED|FW|84|84
Gonzalo Higuaín|1987|ARG|FW|84|90`,
    },
  },
  2011: {
    'deportivo-la-coruna': {
      asOf:'2011-09-01',complete:true,precision:'exact-snapshot',sourceUrl:DEPORTIVO_2011,
      sourceLicense:'CC-BY-SA-4.0',
      attributionUrl:'https://es.wikipedia.org/w/index.php?title=Real_Club_Deportivo_de_La_Coru%C3%B1a&action=history',
      playerEvidence:{
        "Daniel Aranzubia": {"birthDate":"1979-09-18","identitySourceUrl":"https://en.wikipedia.org/w/index.php?oldid=1374877801","identityPageId":6718701,"identityWiki":"en"},
        "Manuel Pablo": {"birthDate":"1976-01-25","identitySourceUrl":"https://en.wikipedia.org/w/index.php?oldid=1364100763","identityPageId":995885,"identityWiki":"en"},
        "Claudio Morel Rodríguez": {"birthDate":"1978-02-02","identitySourceUrl":"https://en.wikipedia.org/w/index.php?oldid=1372235072","identityPageId":4069493,"identityWiki":"en"},
        "Álex Bergantiños": {"birthDate":"1985-06-07","identitySourceUrl":"https://en.wikipedia.org/w/index.php?oldid=1362381432","identityPageId":24209027,"identityWiki":"en"},
        "Zé Castro": {"birthDate":"1983-01-13","identitySourceUrl":"https://en.wikipedia.org/w/index.php?oldid=1371493510","identityPageId":5492190,"identityWiki":"en"},
        "Aythami Artiles": {"birthDate":"1986-04-02","identitySourceUrl":"https://en.wikipedia.org/w/index.php?oldid=1378905289","identityPageId":14384095,"identityWiki":"en"},
        "Saúl Fernández": {"birthDate":"1985-04-09","identitySourceUrl":"https://en.wikipedia.org/w/index.php?oldid=1377051412","identityPageId":17877787,"identityWiki":"en"},
        "Lassad Nouioui": {"birthDate":"1986-03-08","identitySourceUrl":"https://en.wikipedia.org/w/index.php?oldid=1365047684","identityPageId":21693812,"identityWiki":"en"},
        "Xisco": {"birthDate":"1986-06-26","identitySourceUrl":"https://en.wikipedia.org/w/index.php?oldid=1365252145","identityPageId":16802106,"identityWiki":"en"},
        "Jesús Vázquez": {"birthDate":"1980-01-18","identitySourceUrl":"https://en.wikipedia.org/w/index.php?oldid=1361384177","identityPageId":12308048,"identityWiki":"en"},
        "Riki": {"birthDate":"1980-08-11","identitySourceUrl":"https://en.wikipedia.org/w/index.php?oldid=1361383637","identityPageId":5986533,"identityWiki":"en"},
        "Germán Lux": {"birthDate":"1982-06-07","identitySourceUrl":"https://en.wikipedia.org/w/index.php?oldid=1376298637","identityPageId":1024100,"identityWiki":"en"},
        "Pablo Álvarez": {"birthDate":"1980-05-14","identitySourceUrl":"https://en.wikipedia.org/w/index.php?oldid=1371128823","identityPageId":6579725,"identityWiki":"en"},
        "Laure": {"birthDate":"1985-03-22","identitySourceUrl":"https://en.wikipedia.org/w/index.php?oldid=1367563073","identityPageId":19448465,"identityWiki":"en"},
        "Bruno Gama": {"birthDate":"1987-11-15","identitySourceUrl":"https://en.wikipedia.org/w/index.php?oldid=1361382480","identityPageId":6583198,"identityWiki":"en"},
        "Ayoze Díaz": {"birthDate":"1982-05-25","identitySourceUrl":"https://en.wikipedia.org/w/index.php?oldid=1377872565","identityPageId":12328140,"identityWiki":"en"},
        "Andrés Guardado": {"birthDate":"1986-09-28","identitySourceUrl":"https://en.wikipedia.org/w/index.php?oldid=1378311561","identityPageId":5340861,"identityWiki":"en"},
        "Diego Colotto": {"birthDate":"1981-03-10","identitySourceUrl":"https://en.wikipedia.org/w/index.php?oldid=1376426895","identityPageId":12695571,"identityWiki":"en"},
        "Borja Fernández": {"birthDate":"1981-01-14","identitySourceUrl":"https://en.wikipedia.org/w/index.php?oldid=1376660226","identityPageId":6174728,"identityWiki":"en"},
        "Juan Carlos Valerón": {"birthDate":"1975-06-17","identitySourceUrl":"https://en.wikipedia.org/w/index.php?oldid=1361384130","identityPageId":729228,"identityWiki":"en"},
        "Diogo Salomão": {"birthDate":"1988-09-14","identitySourceUrl":"https://en.wikipedia.org/w/index.php?oldid=1369371690","identityPageId":27800234,"identityWiki":"en"},
        "Rodolfo Bodipo": {"birthDate":"1977-10-25","identitySourceUrl":"https://en.wikipedia.org/w/index.php?oldid=1376562024","identityPageId":5744960,"identityWiki":"en"},
        "David Rochela": {"birthDate":"1990-02-19","identitySourceUrl":"https://en.wikipedia.org/w/index.php?oldid=1377676132","identityPageId":29510608,"identityWiki":"en"},
        "Juan Domínguez": {"birthDate":"1990-01-08","identitySourceUrl":"https://en.wikipedia.org/w/index.php?oldid=1361382273","identityPageId":28117772,"identityWiki":"en"},
        "Diego Seoane": {"birthDate":"1988-04-26","identitySourceUrl":"https://en.wikipedia.org/w/index.php?oldid=1361383892","identityPageId":27835831,"identityWiki":"en"},
      },
      sourceAttribution:'Colaboradores de Wikipedia en español, Real Club Deportivo de La Coruña, revisión 49439402 (1 de septiembre de 2011). Datos normalizados y contrastados; valoraciones originales del juego.',
      sources:[DEPORTIVO_2011,
        'https://es.wikipedia.org/w/index.php?title=Real_Club_Deportivo_de_La_Coru%C3%B1a&action=history',
        'https://www.rcdeportivo.es/es/protagonistas-plantillas-historicas'],
      note:'Corte fechado del 1 de septiembre de 2011: 25 futbolistas, incluidos Rochela, Juan Domínguez y Seoane con ficha del filial. No pretende incluir toda la cantera; Marc Martínez y Juan Carlos no figuran en esta lista inicial. Las cesiones reales de Xisco, Borja y Salomão acreditan su presencia, pero sus condiciones contractuales iniciales no se reconstruyen. Medias y potenciales estimados.',
      players:`Daniel Aranzubia|1979-09-18|ESP|GK|79|80
Germán Lux|1982-06-07|ARG|GK|72|74
Manuel Pablo|1976-01-25|ESP|DF|75|75
Claudio Morel Rodríguez|1978-02-02|PAR|DF|73|73
Zé Castro|1983-01-13|POR|DF|76|78
Aythami Artiles|1986-04-02|ESP|DF|70|76
Laure|1985-03-22|ESP|DF|72|76
Ayoze Díaz|1982-05-25|ESP|DF|71|74
Diego Colotto|1981-03-10|ARG|DF|77|79
David Rochela|1990-02-19|ESP|DF|61|75
Diego Seoane|1988-04-26|ESP|DF|62|74
Álex Bergantiños|1985-06-07|ESP|MF|70|76
Saúl Fernández|1985-04-09|ESP|MF|68|73
Borja Fernández|1981-01-14|ESP|MF|73|74
Pablo Álvarez|1980-05-14|ESP|MF|69|71
Bruno Gama|1987-11-15|POR|MF|72|80
Andrés Guardado|1986-09-28|MEX|MF|80|84
Jesús Vázquez|1980-01-18|ESP|MF|73|74
Juan Carlos Valerón|1975-06-17|ESP|MF|81|81
Juan Domínguez|1990-01-08|ESP|MF|68|79
Lassad Nouioui|1986-03-08|TUN|FW|74|78
Xisco|1986-06-26|ESP|FW|70|77
Riki|1980-08-11|ESP|FW|76|78
Diogo Salomão|1988-09-14|POR|FW|70|80
Rodolfo Bodipo|1977-10-25|EQG|FW|66|66`,
    },
  },
  2012: {
    catania:{complete:false,precision:'season',sourceUrl:'https://www.sampdoria.it/en/player/gonzalo-ruben-bergessio/',players:'Gonzalo Bergessio|1984-07-20|ARG|FW|77|79'},
  },
  2013: {
    // An absent historical club is not invented: these rows become available
    // only when that club has a supported entry in the selected world.
    catania:{complete:false,precision:'season',sourceUrl:'https://www.sampdoria.it/en/player/gonzalo-ruben-bergessio/',players:'Gonzalo Bergessio|1984-07-20|ARG|FW|78|79'},
    vitesse:{complete:false,precision:'season',sourceUrl:'https://rfef.es/sites/default/files/pdf/revista/especial_mundial_2014.pdf',players:'Renato Ibarra|1991|ECU|FW|72|82'},
    'real-madrid': {
      asOf:'2013-09-03',complete:true,precision:'exact-snapshot',sourceUrl:MADRID_2013,
      sources:[MADRID_2013,'https://www.realmadrid.com/en-US/the-club/history/football-legends/gareth-bale/'],
      note:'23 jugadores del primer equipo después del cierre del mercado: Bale llega el 1 de septiembre; Özil y Kaká salen el 2. No incluye convocatorias posteriores de Castilla.',
      players:`Iker Casillas|1981-05-20|ESP|GK|89|90
Diego López|1981-11-03|ESP|GK|85|86
Jesús Fernández|1988-06-11|ESP|GK|66|76
Dani Carvajal|1992-01-11|ESP|DF|79|90
Álvaro Arbeloa|1983-01-17|ESP|DF|79|80
Sergio Ramos|1986-03-30|ESP|DF|89|93
Pepe|1983-02-26|POR|DF|86|88
Raphaël Varane|1993-04-25|FRA|DF|82|92
Nacho Fernández|1990-01-18|ESP|DF|73|84
Marcelo|1988-05-12|BRA|DF|85|90
Fábio Coentrão|1988-03-11|POR|DF|81|85
Luka Modrić|1985-09-09|CRO|MF|87|92
Xabi Alonso|1981-11-25|ESP|MF|88|89
Sami Khedira|1987-04-04|GER|MF|83|86
Isco|1992-04-21|ESP|MF|82|91
Ángel Di María|1988-02-14|ARG|MF|86|90
Asier Illarramendi|1990-03-08|ESP|MF|77|85
Casemiro|1992-02-23|BRA|MF|72|89
Cristiano Ronaldo|1985-02-05|POR|FW|96|97
Karim Benzema|1987-12-19|FRA|FW|87|93
Gareth Bale|1989-07-16|WAL|FW|89|93
Álvaro Morata|1992-10-23|ESP|FW|74|87
Jesé Rodríguez|1993-02-26|ESP|FW|73|87`,
    },
    barcelona: {
      asOf:'2013-09-03',complete:true,precision:'exact-snapshot',sourceUrl:BARCELONA_2013,
      note:'Los 25 dorsales del primer equipo confirmados por el club el 2 de septiembre de 2013.',
      players:`Víctor Valdés|1982|ESP|GK|87|88
José Manuel Pinto|1975|ESP|GK|74|74
Oier Olazábal|1989|ESP|GK|65|76
Dani Alves|1983|BRA|DF|87|88
Martín Montoya|1991|ESP|DF|75|83
Gerard Piqué|1987|ESP|DF|86|90
Carles Puyol|1978|ESP|DF|85|85
Javier Mascherano|1984|ARG|DF|86|88
Marc Bartra|1991|ESP|DF|75|85
Jordi Alba|1989|ESP|DF|84|89
Adriano Correia|1984|BRA|DF|79|81
Xavi Hernández|1980|ESP|MF|92|92
Andrés Iniesta|1984|ESP|MF|93|94
Sergio Busquets|1988|ESP|MF|89|92
Cesc Fàbregas|1987|ESP|MF|88|91
Alex Song|1987|CMR|MF|80|83
Sergi Roberto|1992|ESP|MF|71|84
Jonathan dos Santos|1990|MEX|MF|70|81
Lionel Messi|1987|ARG|FW|97|98
Neymar|1992|BRA|FW|85|95
Alexis Sánchez|1988|CHI|FW|85|90
Pedro Rodríguez|1987|ESP|FW|84|86
Cristian Tello|1991|ESP|FW|76|84
Isaac Cuenca|1991|ESP|FW|71|81
Ibrahim Afellay|1986|NED|FW|76|81`,
    },
    'bayern-munchen': {
      asOf:'2013-09-03',complete:true,precision:'exact-snapshot',sourceUrl:BAYERN_2013,
      sources:[BAYERN_2013,'https://datencenter.dfb.de/competitions/bundesliga/seasons/2013-2014/teams/bayern-muenchen'],
      note:'Plantilla sénior al cierre de verano; incluye Badstuber, que estaba lesionado, y Kirchhoff antes de su salida invernal. Las lesiones iniciales no se reconstruyen.',
      players:`Manuel Neuer|1986|GER|GK|91|95
Tom Starke|1981|GER|GK|75|76
Lukas Raeder|1993|GER|GK|61|77
Philipp Lahm|1983|GER|DF|90|91
Rafinha|1985|BRA|DF|79|82
Jérôme Boateng|1988|GER|DF|83|90
Dante|1983|BRA|DF|85|87
Daniel Van Buyten|1978|BEL|DF|79|79
Holger Badstuber|1989|GER|DF|80|87
David Alaba|1992|AUT|DF|83|91
Diego Contento|1990|GER|DF|72|80
Jan Kirchhoff|1990|GER|DF|72|81
Bastian Schweinsteiger|1984|GER|MF|89|91
Javi Martínez|1988|ESP|MF|86|90
Toni Kroos|1990|GER|MF|85|93
Thiago Alcântara|1991|ESP|MF|81|91
Mario Götze|1992|GER|MF|85|93
Pierre-Emile Højbjerg|1995|DEN|MF|65|84
Arjen Robben|1984|NED|FW|91|93
Franck Ribéry|1983|FRA|FW|93|94
Thomas Müller|1989|GER|FW|87|92
Mario Mandžukić|1986|CRO|FW|85|87
Claudio Pizarro|1978|PER|FW|80|80
Xherdan Shaqiri|1991|SUI|FW|78|87
Mitchell Weiser|1994|GER|FW|65|82`,
    },
    arsenal: {
      asOf:'2013-09-03',complete:false,precision:'exact-snapshot',
      sourceUrl:'https://www.uefa.com/uefachampionsleague/news/020d-0e85f8932501-1b949d602154-1000--arsenal-smash-club-record-for-madrid-s-ozil/',
      players:'Mesut Özil|1988|GER|MF|89|92',
    },
    'ac-milan': {
      asOf:'2013-09-03',complete:false,precision:'exact-snapshot',
      sourceUrl:'https://www.uefa.com/uefachampionsleague/news/020d-0e85f4dac4be-c80f8fe0760b-1000--madrid-playmaker-kaka-goes-home-to-milan/',
      players:'Kaká|1982|BRA|MF|82|84',
    },
    napoli: {
      asOf:'2013-09-03',complete:false,precision:'exact-snapshot',
      sourceUrl:'https://www.uefa.com/uefachampionsleague/news/020b-0e856e035468-1cd6c3fc5f43-1000--higuain-and-reina-check-in-at-napoli/',
      note:'Altas de verano documentadas por UEFA; es una selección de jugadores, no la plantilla completa.',
      players:`Gonzalo Higuaín|1987|ARG|FW|86|89
José Callejón|1987|ESP|FW|79|84
Raúl Albiol|1985|ESP|DF|81|84
Pepe Reina|1982|ESP|GK|83|85
Dries Mertens|1987|BEL|FW|81|87
Rafael Cabral|1990|BRA|GK|73|83`,
    },
  },
  2019: {
    'rb-salzburg': {
      asOf:'2019-09-01',complete:false,precision:'exact-snapshot',
      sourceUrl:'https://datencenter.dfb.de/competitions/oesterreichische-bundesliga/seasons/2018-19/teams/red-bull-salzburg',
      note:'Haaland pertenecía a Salzburgo entre enero y diciembre de 2019; su llegada al Dortmund fue posterior al corte.',
      players:'Erling Haaland|2000|NOR|FW|77|96',
    },
  },
  2020: {
    barcelona: {
      asOf:'2020-09-01',complete:false,precision:'exact-snapshot',
      sourceUrl:'https://www.fcbarcelona.com/en/football/first-team/noticias/1837738/acuerdo-con-el-atletico-de-madrid-para-el-traspaso-de-luis-suarez',
      note:'El acuerdo de traspaso de Luis Suárez al Atlético se anunció el 23 de septiembre, después del corte inicial.',
      players:'Luis Suárez|1987|URU|FW|88|89',
    },
  },
};

// This validates membership during a season, not a date or a complete squad.
export const editorialSeasonEvidence = {
  2012: {barcelona:{sourceUrl:'https://players.fcbarcelona.com/en/chronology/2012',precision:'season',complete:false}},
};
