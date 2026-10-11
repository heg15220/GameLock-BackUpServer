/**
 * Selected factual season snapshots. Audited cuts and the 2013 deadline exception
 * are documented in editorial-rosters.js; other selections use 1 September.
 * Names/birth years/team associations are facts; ALL ratings and potentials are
 * original game estimates, never FIFA/EA, Football Manager, Opta or market data.
 * These are selected players, not complete licensed historical squad databases.
 * Format: name | birth year | FIFA nationality | position | rating | potential.
 */
import { editorialRosters } from './editorial-rosters.js';

const selectedRosterSnapshots = {
  2012: {
    barcelona: `Lionel Messi|1987|ARG|FW|96|97
Xavi Hernández|1980|ESP|MF|93|93
Andrés Iniesta|1984|ESP|MF|93|93
Sergio Busquets|1988|ESP|MF|88|92
Víctor Valdés|1982|ESP|GK|86|87
Gerard Piqué|1987|ESP|DF|86|90
Carles Puyol|1978|ESP|DF|87|87
Dani Alves|1983|BRA|DF|87|88
Jordi Alba|1989|ESP|DF|82|88
Javier Mascherano|1984|ARG|DF|85|87
Cesc Fàbregas|1987|ESP|MF|87|90
David Villa|1981|ESP|FW|87|87
Pedro Rodríguez|1987|ESP|FW|84|86
Alexis Sánchez|1988|CHI|FW|84|89
Thiago Alcântara|1991|ESP|MF|78|90
Cristian Tello|1991|ESP|FW|74|82
Sergi Roberto|1992|ESP|MF|69|84
Marc Bartra|1991|ESP|DF|72|84
José Manuel Pinto|1975|ESP|GK|74|74
Adriano Correia|1984|BRA|DF|78|80
Alex Song|1987|CMR|MF|81|83
Martín Montoya|1991|ESP|DF|73|82`,
    'real-madrid': `Cristiano Ronaldo|1985|POR|FW|95|96
Iker Casillas|1981|ESP|GK|90|91
Sergio Ramos|1986|ESP|DF|88|92
Pepe|1983|POR|DF|86|88
Marcelo|1988|BRA|DF|83|89
Álvaro Arbeloa|1983|ESP|DF|80|81
Xabi Alonso|1981|ESP|MF|88|89
Luka Modrić|1985|CRO|MF|85|92
Mesut Özil|1988|GER|MF|88|92
Sami Khedira|1987|GER|MF|82|85
Ángel Di María|1988|ARG|FW|85|89
Karim Benzema|1987|FRA|FW|87|93
Gonzalo Higuaín|1987|ARG|FW|86|89
Raphaël Varane|1993|FRA|DF|73|90
Kaká|1982|BRA|MF|84|85
José Callejón|1987|ESP|FW|77|83
Fábio Coentrão|1988|POR|DF|80|84
Nacho Fernández|1990|ESP|DF|69|84
Antonio Adán|1987|ESP|GK|72|80
Michael Essien|1982|GHA|MF|82|83
Raúl Albiol|1985|ESP|DF|80|83
Álvaro Morata|1992|ESP|FW|68|86`,
    'bayern-munchen': `Arjen Robben|1984|NED|FW|89|92
Franck Ribéry|1983|FRA|FW|90|93
Manuel Neuer|1986|GER|GK|88|94
Philipp Lahm|1983|GER|DF|89|91
Bastian Schweinsteiger|1984|GER|MF|88|90
Thomas Müller|1989|GER|FW|84|90
Toni Kroos|1990|GER|MF|82|92
David Alaba|1992|AUT|DF|77|89
Jérôme Boateng|1988|GER|DF|80|89
Dante|1983|BRA|DF|81|85
Javi Martínez|1988|ESP|MF|84|88
Mario Mandžukić|1986|CRO|FW|81|86
Mario Gómez|1985|GER|FW|87|88
Xherdan Shaqiri|1991|SUI|FW|77|85
Luiz Gustavo|1987|BRA|MF|80|84
Claudio Pizarro|1978|PER|FW|80|81
Holger Badstuber|1989|GER|DF|81|86
Tom Starke|1981|GER|GK|73|74`,
    'borussia-dortmund': `Robert Lewandowski|1988|POL|FW|85|93
Marco Reus|1989|GER|FW|85|90
Mario Götze|1992|GER|MF|84|91
İlkay Gündoğan|1990|GER|MF|80|88
Mats Hummels|1988|GER|DF|85|90
Łukasz Piszczek|1985|POL|DF|81|85
Roman Weidenfeller|1980|GER|GK|81|84
Jakub Błaszczykowski|1985|POL|FW|80|84
Sven Bender|1989|GER|MF|80|85
Marcel Schmelzer|1988|GER|DF|78|83`,
    'atletico-madrid': `Radamel Falcao|1986|COL|FW|90|92
Thibaut Courtois|1992|BEL|GK|79|93
Diego Costa|1988|BRA|FW|77|88
Koke|1992|ESP|MF|74|88
Arda Turan|1987|TUR|MF|83|86
Diego Godín|1986|URU|DF|82|90
Filipe Luís|1985|BRA|DF|81|86
Juanfran Torres|1985|ESP|DF|79|85
Gabi Fernández|1983|ESP|MF|79|85`,
    malaga: `Isco|1992|ESP|MF|79|91
Joaquín Sánchez|1981|ESP|FW|81|83
Willy Caballero|1981|ARG|GK|78|83
Martín Demichelis|1980|ARG|DF|80|81
Javier Saviola|1981|ARG|FW|78|79`,
    'real-sociedad': `Antoine Griezmann|1991|FRA|FW|78|91
Carlos Vela|1989|MEX|FW|78|84
Asier Illarramendi|1990|ESP|MF|74|84
Iñigo Martínez|1991|ESP|DF|75|85`,
    valencia: `Roberto Soldado|1985|ESP|FW|84|85
Éver Banega|1988|ARG|MF|80|86
Sofiane Feghouli|1989|ALG|FW|78|83
Vicente Guaita|1987|ESP|GK|78|82`,
    sevilla: `Jesús Navas|1985|ESP|FW|85|87
Ivan Rakitić|1988|CRO|MF|81|88
Álvaro Negredo|1985|ESP|FW|82|84
Geoffrey Kondogbia|1993|FRA|MF|69|85`,
    'athletic-club': `Ander Herrera|1989|ESP|MF|78|86
Iker Muniain|1992|ESP|FW|79|87
Fernando Llorente|1985|ESP|FW|85|86
Óscar de Marcos|1989|ESP|DF|76|82`,
    'manchester-united': `Robin van Persie|1983|NED|FW|90|92
Wayne Rooney|1985|ENG|FW|90|92
David de Gea|1990|ESP|GK|80|92
Rio Ferdinand|1978|ENG|DF|83|84
Nemanja Vidić|1981|SRB|DF|86|87
Patrice Evra|1981|FRA|DF|82|83
Michael Carrick|1981|ENG|MF|82|85
Shinji Kagawa|1989|JPN|MF|82|87
Javier Hernández|1988|MEX|FW|80|84
Danny Welbeck|1990|ENG|FW|77|84
Antonio Valencia|1985|ECU|FW|83|85
Paul Scholes|1974|ENG|MF|80|80
Ryan Giggs|1973|WAL|MF|80|80`,
    'manchester-city': `Sergio Agüero|1988|ARG|FW|88|93
David Silva|1986|ESP|MF|88|91
Yaya Touré|1983|CIV|MF|87|91
Vincent Kompany|1986|BEL|DF|86|90
Joe Hart|1987|ENG|GK|84|88
Carlos Tévez|1984|ARG|FW|87|89
Edin Džeko|1986|BIH|FW|83|87
Mario Balotelli|1990|ITA|FW|82|89
Samir Nasri|1987|FRA|MF|84|87
Pablo Zabaleta|1985|ARG|DF|79|86`,
    chelsea: `Eden Hazard|1991|BEL|FW|84|94
Juan Mata|1988|ESP|MF|86|89
Petr Čech|1982|CZE|GK|86|90
John Terry|1980|ENG|DF|86|86
Frank Lampard|1978|ENG|MF|85|86
Fernando Torres|1984|ESP|FW|83|85
Oscar|1991|BRA|MF|77|87
Ramires|1987|BRA|MF|80|84
David Luiz|1987|BRA|DF|79|86
Ashley Cole|1980|ENG|DF|85|86
César Azpilicueta|1989|ESP|DF|76|87`,
    liverpool: `Luis Suárez|1987|URU|FW|86|95
Steven Gerrard|1980|ENG|MF|86|87
Raheem Sterling|1994|ENG|FW|68|89
Pepe Reina|1982|ESP|GK|83|86
Jordan Henderson|1990|ENG|MF|74|85
Daniel Agger|1984|DEN|DF|81|84`,
    arsenal: `Santi Cazorla|1984|ESP|MF|84|87
Olivier Giroud|1986|FRA|FW|78|86
Lukas Podolski|1985|GER|FW|83|84
Theo Walcott|1989|ENG|FW|80|84
Jack Wilshere|1992|ENG|MF|79|89
Aaron Ramsey|1990|WAL|MF|76|86
Wojciech Szczęsny|1990|POL|GK|79|88
Laurent Koscielny|1985|FRA|DF|79|86`,
    tottenham: `Gareth Bale|1989|WAL|FW|86|93
Hugo Lloris|1986|FRA|GK|85|90
Jan Vertonghen|1987|BEL|DF|81|86
Mousa Dembélé|1987|BEL|MF|80|87
Jermain Defoe|1982|ENG|FW|80|81`,
    everton: `Marouane Fellaini|1987|BEL|MF|80|84
Leighton Baines|1984|ENG|DF|82|85
Ross Barkley|1993|ENG|MF|65|85`,
    norwich: `Harry Kane|1993|ENG|FW|63|92`,
    'west-brom': `Romelu Lukaku|1993|BEL|FW|74|89`,
    'werder-bremen': `Kevin De Bruyne|1991|BEL|MF|76|94`,
    'hamburger-sv': `Son Heung-min|1992|KOR|FW|73|91`,
    'le-havre': `Riyad Mahrez|1991|ALG|FW|66|89`,
    southampton: `Luke Shaw|1995|ENG|DF|62|87
Adam Lallana|1988|ENG|MF|73|83`,
    juventus: `Gianluigi Buffon|1978|ITA|GK|88|92
Andrea Pirlo|1979|ITA|MF|88|90
Arturo Vidal|1987|CHI|MF|83|89
Claudio Marchisio|1986|ITA|MF|84|88
Giorgio Chiellini|1984|ITA|DF|86|90
Leonardo Bonucci|1987|ITA|DF|80|88
Andrea Barzagli|1981|ITA|DF|84|88
Paul Pogba|1993|FRA|MF|68|91
Sebastian Giovinco|1987|ITA|FW|80|84`,
    'ac-milan': `Stephan El Shaarawy|1992|ITA|FW|75|87
Riccardo Montolivo|1985|ITA|MF|81|84
Kevin-Prince Boateng|1987|GHA|MF|82|85
Philippe Mexès|1982|FRA|DF|79|81
Christian Abbiati|1977|ITA|GK|81|82`,
    inter: `Samir Handanović|1984|SVN|GK|83|89
Philippe Coutinho|1992|BRA|MF|74|88
Javier Zanetti|1973|ARG|DF|83|83
Wesley Sneijder|1984|NED|MF|87|89
Diego Milito|1979|ARG|FW|85|86
Esteban Cambiasso|1980|ARG|MF|83|85`,
    'as-roma': `Francesco Totti|1976|ITA|FW|85|87
Daniele De Rossi|1983|ITA|MF|85|87
Miralem Pjanić|1990|BIH|MF|78|88
Marquinhos|1994|BRA|DF|67|89
Erik Lamela|1992|ARG|FW|77|87`,
    napoli: `Edinson Cavani|1987|URU|FW|86|91
Marek Hamšík|1987|SVK|MF|84|88
Lorenzo Insigne|1991|ITA|FW|73|87`,
    fiorentina: `Stevan Jovetić|1989|MNE|FW|81|86
Juan Cuadrado|1988|COL|FW|76|86`,
    pescara: `Mattia Perin|1992|ITA|GK|70|85`,
    'paris-saint-germain': `Zlatan Ibrahimović|1981|SWE|FW|90|93
Thiago Silva|1984|BRA|DF|89|92
Ezequiel Lavezzi|1985|ARG|FW|84|86
Javier Pastore|1989|ARG|MF|82|87
Marco Verratti|1992|ITA|MF|73|90
Salvatore Sirigu|1987|ITA|GK|81|86
Maxwell|1981|BRA|DF|78|83
Blaise Matuidi|1987|FRA|MF|78|87`,
    'olympique-lyonnais': `Alexandre Lacazette|1991|FRA|FW|73|86
Samuel Umtiti|1993|FRA|DF|67|87
Clément Grenier|1991|FRA|MF|74|82`,
    montpellier: `Rémy Cabella|1990|FRA|MF|76|83`,
    lille: `Dimitri Payet|1987|FRA|MF|79|86`,
    'saint-etienne': `Pierre-Emerick Aubameyang|1989|GAB|FW|78|89
Kurt Zouma|1994|FRA|DF|67|85`,
    porto: `James Rodríguez|1991|COL|MF|80|91
João Moutinho|1986|POR|MF|83|86
Jackson Martínez|1986|COL|FW|79|85`,
    'rio-ave': `Jan Oblak|1993|SVN|GK|67|92`,
    benfica: `Nemanja Matić|1988|SRB|MF|77|88
Nicolás Gaitán|1988|ARG|FW|80|85`,
    ajax: `Christian Eriksen|1992|DEN|MF|77|90
Toby Alderweireld|1989|BEL|DF|76|87`,
    santos: `Neymar|1992|BRA|FW|85|95`,
    'atletico-mg': `Ronaldinho|1980|BRA|MF|84|85
Bernard|1992|BRA|FW|73|84`,
    'sao-paulo': `Lucas Moura|1992|BRA|FW|78|87
Casemiro|1992|BRA|MF|71|90`,
    'river-plate': `Manuel Lanzini|1993|ARG|MF|69|84`,
  },
  2025: {
    barcelona: `Lamine Yamal|2007|ESP|FW|89|97
Raphinha|1996|BRA|FW|90|92
Robert Lewandowski|1988|POL|FW|87|87
Pedri|2002|ESP|MF|89|94
Gavi|2004|ESP|MF|82|92
Frenkie de Jong|1997|NED|MF|85|88
Dani Olmo|1998|ESP|MF|84|87
Fermín López|2003|ESP|MF|80|89
Pau Cubarsí|2007|ESP|DF|83|93
Alejandro Balde|2003|ESP|DF|82|90
Jules Koundé|1998|FRA|DF|86|89
Ronald Araújo|1999|URU|DF|84|89
Marc-André ter Stegen|1992|GER|GK|85|87
Joan García|2001|ESP|GK|81|89
Ferran Torres|2000|ESP|FW|82|86
Marcus Rashford|1997|ENG|FW|81|87
Marc Casadó|2003|ESP|MF|78|86
Wojciech Szczęsny|1990|POL|GK|83|83
Eric García|2001|ESP|DF|78|84
Andreas Christensen|1996|DEN|DF|80|84
Gerard Martín|2002|ESP|DF|74|82`,
    'real-madrid': `Kylian Mbappé|1998|FRA|FW|93|96
Vinícius Júnior|2000|BRA|FW|90|95
Jude Bellingham|2003|ENG|MF|90|95
Federico Valverde|1998|URU|MF|89|92
Thibaut Courtois|1992|BEL|GK|91|92
Trent Alexander-Arnold|1998|ENG|DF|85|89
Dean Huijsen|2005|ESP|DF|80|91
Álvaro Carreras|2003|ESP|DF|79|88
Éder Militão|1998|BRA|DF|85|89
Antonio Rüdiger|1993|GER|DF|86|88
Dani Carvajal|1992|ESP|DF|83|86
Aurélien Tchouaméni|2000|FRA|MF|84|90
Eduardo Camavinga|2002|FRA|MF|83|92
Arda Güler|2005|TUR|MF|80|92
Rodrygo|2001|BRA|FW|85|91
Endrick|2006|BRA|FW|76|92
Franco Mastantuono|2007|ARG|MF|75|92
Brahim Díaz|1999|MAR|MF|80|86
Andriy Lunin|1999|UKR|GK|79|86
Ferland Mendy|1995|FRA|DF|80|83
Gonzalo García|2004|ESP|FW|75|86`,
    'manchester-city': `Erling Haaland|2000|NOR|FW|92|96
Rodri|1996|ESP|MF|91|93
Phil Foden|2000|ENG|MF|87|93
Bernardo Silva|1994|POR|MF|87|89
Rúben Dias|1997|POR|DF|87|90
Joško Gvardiol|2002|CRO|DF|85|92
Omar Marmoush|1999|EGY|FW|84|88
Tijjani Reijnders|1998|NED|MF|85|89
Rayan Cherki|2003|FRA|MF|81|91
Jérémy Doku|2002|BEL|FW|81|89
Savinho|2004|BRA|FW|80|90
Oscar Bobb|2003|NOR|FW|74|88
Rayan Aït-Nouri|2001|ALG|DF|81|87
John Stones|1994|ENG|DF|82|85
James Trafford|2002|ENG|GK|78|89
Matheus Nunes|1998|POR|MF|78|83
Nico González|2002|ESP|MF|79|86`,
    arsenal: `Bukayo Saka|2001|ENG|FW|89|94
Martin Ødegaard|1998|NOR|MF|89|92
Declan Rice|1999|ENG|MF|88|92
William Saliba|2001|FRA|DF|88|93
Gabriel Magalhães|1997|BRA|DF|87|90
David Raya|1995|ESP|GK|86|89
Viktor Gyökeres|1998|SWE|FW|87|90
Gabriel Martinelli|2001|BRA|FW|83|89
Kai Havertz|1999|GER|FW|83|87
Eberechi Eze|1998|ENG|MF|83|88
Noni Madueke|2002|ENG|FW|80|88
Myles Lewis-Skelly|2006|ENG|DF|77|91
Ethan Nwaneri|2007|ENG|MF|76|92
Martín Zubimendi|1999|ESP|MF|84|88
Jurriën Timber|2001|NED|DF|82|88
Riccardo Calafiori|2002|ITA|DF|80|88`,
    liverpool: `Mohamed Salah|1992|EGY|FW|92|93
Alexander Isak|1999|SWE|FW|88|92
Virgil van Dijk|1991|NED|DF|90|91
Alisson Becker|1992|BRA|GK|90|91
Florian Wirtz|2003|GER|MF|89|95
Alexis Mac Allister|1998|ARG|MF|86|90
Ryan Gravenberch|2002|NED|MF|85|91
Dominik Szoboszlai|2000|HUN|MF|84|90
Hugo Ekitiké|2002|FRA|FW|81|91
Cody Gakpo|1999|NED|FW|83|87
Ibrahima Konaté|1999|FRA|DF|84|89
Milos Kerkez|2003|HUN|DF|80|88
Jeremie Frimpong|2000|NED|DF|83|89
Giorgi Mamardashvili|2000|GEO|GK|83|90
Federico Chiesa|1997|ITA|FW|79|83`,
    chelsea: `Cole Palmer|2002|ENG|MF|88|94
Moisés Caicedo|2001|ECU|MF|86|92
Enzo Fernández|2001|ARG|MF|85|90
Estêvão|2007|BRA|FW|77|94
Liam Delap|2003|ENG|FW|78|88
João Pedro|2001|BRA|FW|82|90
Pedro Neto|2000|POR|FW|81|87
Reece James|1999|ENG|DF|83|89
Levi Colwill|2003|ENG|DF|80|90
Andrey Santos|2004|BRA|MF|79|89
Robert Sánchez|1997|ESP|GK|80|84`,
    'manchester-united': `Bruno Fernandes|1994|POR|MF|88|90
Bryan Mbeumo|1999|CMR|FW|84|88
Matheus Cunha|1999|BRA|FW|84|88
Benjamin Šeško|2003|SVN|FW|81|91
Amad Diallo|2002|CIV|FW|80|89
Kobbie Mainoo|2005|ENG|MF|77|90
Matthijs de Ligt|1999|NED|DF|82|88
Leny Yoro|2005|FRA|DF|77|91
Lisandro Martínez|1998|ARG|DF|82|86
Casemiro|1992|BRA|MF|79|81
André Onana|1996|CMR|GK|79|84`,
    newcastle: `Bruno Guimarães|1997|BRA|MF|86|89
Sandro Tonali|2000|ITA|MF|85|90
Anthony Gordon|2001|ENG|FW|83|89
Lewis Hall|2004|ENG|DF|79|89
Nick Pope|1992|ENG|GK|82|85`,
    'aston-villa': `Ollie Watkins|1995|ENG|FW|85|87
Emiliano Martínez|1992|ARG|GK|86|88
Morgan Rogers|2002|ENG|MF|81|90
Youri Tielemans|1997|BEL|MF|83|86`,
    tottenham: `Micky van de Ven|2001|NED|DF|82|90
Cristian Romero|1998|ARG|DF|85|88
Xavi Simons|2003|NED|MF|83|92
Mohammed Kudus|2000|GHA|FW|82|89
Lucas Bergvall|2006|SWE|MF|76|90
Archie Gray|2006|ENG|MF|75|89`,
    'bayern-munchen': `Harry Kane|1993|ENG|FW|91|93
Jamal Musiala|2003|GER|MF|90|96
Michael Olise|2001|FRA|FW|87|93
Joshua Kimmich|1995|GER|MF|89|91
Manuel Neuer|1986|GER|GK|85|86
Luis Díaz|1997|COL|FW|85|88
Alphonso Davies|2000|CAN|DF|84|91
Dayot Upamecano|1998|FRA|DF|83|88
Jonathan Tah|1996|GER|DF|85|88
Leon Goretzka|1995|GER|MF|81|85
Lennart Karl|2008|GER|MF|65|88`,
    'borussia-dortmund': `Serhou Guirassy|1996|GUI|FW|85|88
Gregor Kobel|1997|SUI|GK|87|91
Karim Adeyemi|2002|GER|FW|81|89
Jobe Bellingham|2005|ENG|MF|76|89
Julian Brandt|1996|GER|MF|83|85
Nico Schlotterbeck|1999|GER|DF|84|89`,
    'bayer-leverkusen': `Alejandro Grimaldo|1995|ESP|DF|85|87
Patrik Schick|1996|CZE|FW|84|87
Malik Tillman|2002|USA|MF|79|87`,
    'eintracht-frankfurt': `Can Uzun|2005|TUR|MF|75|88`,
    'rb-leipzig': `Yan Diomande|2006|CIV|FW|70|88`,
    'paris-saint-germain': `Ousmane Dembélé|1997|FRA|FW|91|94
Désiré Doué|2005|FRA|FW|85|95
Khvicha Kvaratskhelia|2001|GEO|FW|87|92
Vitinha|2000|POR|MF|89|94
João Neves|2004|POR|MF|86|94
Fabián Ruiz|1996|ESP|MF|86|88
Achraf Hakimi|1998|MAR|DF|89|93
Nuno Mendes|2002|POR|DF|87|93
Marquinhos|1994|BRA|DF|87|89
Willian Pacho|2001|ECU|DF|83|89
Warren Zaïre-Emery|2006|FRA|MF|81|93
Bradley Barcola|2002|FRA|FW|84|91
Lucas Chevalier|2001|FRA|GK|84|91
Gonçalo Ramos|2001|POR|FW|80|87`,
    monaco: `Paul Pogba|1993|FRA|MF|75|80
Ansu Fati|2002|ESP|FW|75|86
Takumi Minamino|1995|JPN|FW|79|82`,
    'olympique-de-marseille': `Mason Greenwood|2001|ENG|FW|82|89`,
    'olympique-lyonnais': `Malick Fofana|2005|BEL|FW|77|89`,
    inter: `Lautaro Martínez|1997|ARG|FW|89|92
Nicolò Barella|1997|ITA|MF|88|91
Alessandro Bastoni|1999|ITA|DF|88|92
Hakan Çalhanoğlu|1994|TUR|MF|86|88
Marcus Thuram|1997|FRA|FW|85|88
Yann Sommer|1988|SUI|GK|86|87
Denzel Dumfries|1996|NED|DF|82|85
Federico Dimarco|1997|ITA|DF|85|89
Francesco Pio Esposito|2005|ITA|FW|73|87`,
    juventus: `Kenan Yıldız|2005|TUR|FW|80|93
Jonathan David|2000|CAN|FW|83|88
Dušan Vlahović|2000|SRB|FW|83|89
Manuel Locatelli|1998|ITA|MF|82|86
Gleison Bremer|1997|BRA|DF|84|88
Francisco Conceição|2002|POR|FW|80|88`,
    'ac-milan': `Rafael Leão|1999|POR|FW|85|91
Christian Pulisic|1998|USA|FW|84|88
Luka Modrić|1985|CRO|MF|83|84
Mike Maignan|1995|FRA|GK|87|90
Santiago Giménez|2001|MEX|FW|80|88`,
    napoli: `Scott McTominay|1996|SCO|MF|85|88
Kevin De Bruyne|1991|BEL|MF|87|89
Romelu Lukaku|1993|BEL|FW|83|85
Stanislav Lobotka|1994|SVK|MF|84|87
Giovanni Di Lorenzo|1993|ITA|DF|83|85`,
    'as-roma': `Paulo Dybala|1993|ARG|FW|85|87
Matías Soulé|2003|ARG|FW|79|89
Evan Ferguson|2004|IRL|FW|74|87`,
    'atletico-madrid': `Julián Álvarez|2000|ARG|FW|88|94
Antoine Griezmann|1991|FRA|FW|85|87
Jan Oblak|1993|SVN|GK|89|91
Pablo Barrios|2003|ESP|MF|81|91
Álex Baena|2001|ESP|MF|84|90
Johnny Cardoso|2001|USA|MF|80|87
Giuliano Simeone|2002|ARG|FW|78|86
Robin Le Normand|1996|ESP|DF|82|86`,
    'athletic-club': `Nico Williams|2002|ESP|FW|85|92
Iñaki Williams|1994|GHA|FW|82|84
Oihan Sancet|2000|ESP|MF|83|89
Unai Simón|1997|ESP|GK|85|89
Beñat Prados|2001|ESP|MF|77|85`,
    'real-betis': `Isco|1992|ESP|MF|86|88
Antony|2000|BRA|FW|80|85
Pablo García|2006|ESP|FW|68|86`,
    'real-sociedad': `Takefusa Kubo|2001|JPN|FW|82|89
Mikel Oyarzabal|1997|ESP|FW|83|87`,
    villarreal: `Georges Mikautadze|2000|GEO|FW|80|85`,
    valencia: `Javi Guerra|2003|ESP|MF|77|88`,
    'celta-vigo': `Iago Aspas|1987|ESP|FW|82|83`,
    'inter-miami': `Lionel Messi|1987|ARG|FW|88|89
Luis Suárez|1987|URU|FW|81|82
Sergio Busquets|1988|ESP|MF|82|83
Jordi Alba|1989|ESP|DF|81|82`,
    santos: `Neymar|1992|BRA|FW|81|86`,
    flamengo: `Jorginho|1991|ITA|MF|80|82
Giorgian de Arrascaeta|1994|URU|MF|83|86`,
    palmeiras: `Vitor Roque|2005|BRA|FW|75|88`,
    'river-plate': `Sebastián Driussi|1996|ARG|FW|77|81`,
    'boca-juniors': `Edinson Cavani|1987|URU|FW|77|80`,
    benfica: `Vangelis Pavlidis|1998|GRE|FW|82|86`,
    porto: `Diogo Costa|1999|POR|GK|85|91`,
    'sporting-lisboa': `Geovany Quenda|2007|POR|FW|75|92
Francisco Trincão|1999|POR|FW|80|85`,
    psv: `Ismael Saibari|2001|MAR|MF|79|86`,
    ajax: `Mika Godts|2005|BEL|FW|74|88`,
  },
};

export const rosterSnapshots=Object.fromEntries([...new Set([...Object.keys(selectedRosterSnapshots),...Object.keys(editorialRosters)])].map(year=>[
  year,{...selectedRosterSnapshots[year],...Object.fromEntries(Object.entries(editorialRosters[year]??{}).map(([clubId,record])=>[clubId,record.players]))},
]));

// Conservative career segments for other starting seasons. Snapshot rows above
// take precedence. A missing year is never filled from a player's future club.
// name,birth,nation,pos,peakRating,potential, [from,to,clubId] (inclusive seasons).
export const careerSeeds = [
  ['Lionel Messi',1987,'ARG','FW',96,97,[[2004,2020,'barcelona'],[2021,2022,'paris-saint-germain'],[2023,2025,'inter-miami']]],
  ['Cristiano Ronaldo',1985,'POR','FW',95,96,[[2002,2002,'sporting-lisboa'],[2003,2008,'manchester-united'],[2009,2017,'real-madrid'],[2018,2020,'juventus'],[2021,2022,'manchester-united']]],
  ['Arjen Robben',1984,'NED','FW',91,92,[[2000,2001,'groningen'],[2002,2003,'psv'],[2004,2006,'chelsea'],[2007,2008,'real-madrid'],[2009,2018,'bayern-munchen'],[2020,2020,'groningen']]],
  ['Franck Ribéry',1983,'FRA','FW',92,93,[[2005,2006,'olympique-de-marseille'],[2007,2018,'bayern-munchen'],[2019,2020,'fiorentina']]],
  ['Neymar',1992,'BRA','FW',92,95,[[2009,2012,'santos'],[2013,2016,'barcelona'],[2017,2022,'paris-saint-germain'],[2025,2025,'santos']]],
  ['Luis Suárez',1987,'URU','FW',93,95,[[2007,2010,'ajax'],[2011,2013,'liverpool'],[2014,2020,'barcelona'],[2021,2021,'atletico-madrid'],[2022,2022,'club-nacional'],[2023,2023,'gremio'],[2024,2025,'inter-miami']]],
  ['Robert Lewandowski',1988,'POL','FW',93,94,[[2008,2009,'lech-poznan'],[2010,2013,'borussia-dortmund'],[2014,2021,'bayern-munchen'],[2022,2025,'barcelona']]],
  ['Karim Benzema',1987,'FRA','FW',93,94,[[2005,2008,'olympique-lyonnais'],[2009,2022,'real-madrid']]],
  ['Kylian Mbappé',1998,'FRA','FW',93,96,[[2015,2016,'monaco'],[2017,2023,'paris-saint-germain'],[2024,2025,'real-madrid']]],
  ['Erling Haaland',2000,'NOR','FW',92,96,[[2019,2019,'rb-salzburg'],[2020,2021,'borussia-dortmund'],[2022,2025,'manchester-city']]],
  ['Lamine Yamal',2007,'ESP','FW',89,97,[[2023,2025,'barcelona']]],
  ['Jude Bellingham',2003,'ENG','MF',90,95,[[2019,2019,'birmingham'],[2020,2022,'borussia-dortmund'],[2023,2025,'real-madrid']]],
  ['Vinícius Júnior',2000,'BRA','FW',91,95,[[2017,2017,'flamengo'],[2018,2025,'real-madrid']]],
  ['Luka Modrić',1985,'CRO','MF',91,93,[[2008,2011,'tottenham'],[2012,2024,'real-madrid'],[2025,2025,'ac-milan']]],
  ['Andrés Iniesta',1984,'ESP','MF',93,94,[[2002,2017,'barcelona']]],
  ['Xavi Hernández',1980,'ESP','MF',93,94,[[1998,2014,'barcelona']]],
  // Ramos joined Sevilla on 4 September 2023, after the dated initial cutoff.
  ['Sergio Ramos',1986,'ESP','DF',91,92,[[2004,2004,'sevilla'],[2005,2020,'real-madrid'],[2021,2022,'paris-saint-germain'],[2025,2025,'monterrey']]],
  ['Iker Casillas',1981,'ESP','GK',92,93,[[1999,2014,'real-madrid'],[2015,2018,'porto']]],
  ['Manuel Neuer',1986,'GER','GK',94,95,[[2006,2010,'fc-schalke-04'],[2011,2025,'bayern-munchen']]],
  ['Gianluigi Buffon',1978,'ITA','GK',94,95,[[1995,2000,'parma'],[2001,2017,'juventus'],[2018,2018,'paris-saint-germain'],[2019,2020,'juventus'],[2021,2022,'parma']]],
  ['Thierry Henry',1977,'FRA','FW',94,95,[[1994,1998,'monaco'],[1999,2006,'arsenal'],[2007,2009,'barcelona'],[2010,2014,'new-york-rb']]],
  // Querétaro was announced on 5 September 2014; no supported club at the cutoff.
  ['Ronaldinho',1980,'BRA','MF',95,96,[[1998,2000,'gremio'],[2001,2002,'paris-saint-germain'],[2003,2007,'barcelona'],[2008,2010,'ac-milan'],[2011,2011,'flamengo'],[2012,2013,'atletico-mg']]],
  ['Ronaldo Nazário',1976,'BRA','FW',96,97,[[1993,1993,'cruzeiro'],[1994,1995,'psv'],[1996,1996,'barcelona'],[1997,2001,'inter'],[2002,2006,'real-madrid'],[2007,2007,'ac-milan'],[2009,2010,'corinthians']]],
  ['Zinedine Zidane',1972,'FRA','MF',95,96,[[1996,2000,'juventus'],[2001,2005,'real-madrid']]],
  ['David Beckham',1975,'ENG','MF',89,91,[[1993,2002,'manchester-united'],[2003,2006,'real-madrid'],[2007,2012,'los-angeles-galaxy']]],
  ['Raúl González',1977,'ESP','FW',92,94,[[1994,2009,'real-madrid'],[2010,2011,'fc-schalke-04']]],
  ['Francesco Totti',1976,'ITA','FW',92,93,[[1993,2016,'as-roma']]],
  ['Paolo Maldini',1968,'ITA','DF',94,95,[[1990,2008,'ac-milan']]],
  ['Alessandro Del Piero',1974,'ITA','FW',93,94,[[1993,2011,'juventus']]],
  ['Roberto Baggio',1967,'ITA','FW',94,95,[[1990,1994,'juventus'],[1995,1996,'ac-milan'],[1997,1997,'bologna'],[1998,1999,'inter']]],
  // Sevilla 1992 and Newell's 1993 both followed the initial September cutoff.
  ['Diego Maradona',1960,'ARG','MF',97,98,[[1990,1990,'napoli'],[1995,1996,'boca-juniors']]],
  ['Romário',1966,'BRA','FW',94,95,[[1990,1992,'psv'],[1993,1994,'barcelona'],[1995,1995,'flamengo'],[1996,1996,'valencia'],[1997,1999,'flamengo'],[2000,2001,'vasco-da-gama'],[2002,2004,'fluminense']]],
  ['Hristo Stoichkov',1966,'BUL','FW',92,93,[[1990,1994,'barcelona'],[1995,1995,'parma'],[1996,1997,'barcelona']]],
  ['Dennis Bergkamp',1969,'NED','FW',92,94,[[1990,1992,'ajax'],[1993,1994,'inter'],[1995,2005,'arsenal']]],
  ['Eric Cantona',1966,'FRA','FW',91,93,[[1992,1992,'leeds'],[1993,1996,'manchester-united']]],
  ['Gabriel Batistuta',1969,'ARG','FW',93,94,[[1990,1990,'boca-juniors'],[1991,1999,'fiorentina'],[2000,2002,'as-roma']]],
];
