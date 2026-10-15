/**
 * Real positions of well-known players (main position first, then the ones
 * they also played). The archive only says GK/DF/MF/FW; for everyone not
 * listed here the position comes from the shirt number when the archive has
 * one, and from a weighted draw otherwise.
 *
 * Format: Name|MAIN|ALT,ALT|foot (L when left-footed)
 */
const TABLE = `
Romário|ST|CAM
Roberto Baggio|CAM|ST
Hristo Stoichkov|LW|ST|L
Eric Cantona|ST|CAM
Paolo Maldini|LB|CB|L
Gabriel Batistuta|ST|
Dennis Bergkamp|CAM|ST
Tony Adams|CB|
David Seaman|GK|
Ian Wright|ST|
Nigel Winterburn|LB||L
Paul Merson|CAM|LM
Lee Dixon|RB|
Steve Bould|CB|
Andy Linighan|CB|
Dennis Wise|CM|RM
Graeme Le Saux|LB|LM|L
John Barnes|LM|CM
Jan Mølby|CM|CDM
Ian Rush|ST|
Mark Wright|CB|
Steve Nicol|RB|CB
Stig Inge Bjørnebye|LB||L
Zinedine Zidane|CAM|CM
Diego Maradona|CAM|ST|L
Alessandro Del Piero|ST|LW,CAM
Ronaldo Nazário|ST|
Thierry Henry|ST|LW
Francesco Totti|CAM|ST
David Beckham|RM|CM
Raúl González|ST|CAM
Gianluigi Buffon|GK|
David Platt|CM|CAM
Ray Parlour|RM|CM
Martin Keown|CB|
Dan Petrescu|RWB|RM
Frank Leboeuf|CB|
Gianluca Vialli|ST|
Roberto Di Matteo|CM|CDM
Gianfranco Zola|CAM|ST
Steve McManaman|LM|RM,CAM
Stan Collymore|ST|
Jamie Redknapp|CM|
Robbie Fowler|ST||L
Patrik Berger|LM|CAM|L
Peter Schmeichel|GK|
Denis Irwin|LB|RB
Gary Pallister|CB|
Andy Cole|ST|
Ryan Giggs|LM|LW,CM|L
Karel Poborský|RM|
Ronaldinho|LW|CAM
Xavi Hernández|CM|CDM
Iker Casillas|GK|
Patrick Vieira|CDM|CM
Freddie Ljungberg|LM|RM
Nwankwo Kanu|ST|CAM
Sylvinho|LB||L
Marcel Desailly|CB|CDM
Celestine Babayaro|LB||L
Jimmy Floyd Hasselbaink|ST|
Mario Melchiot|RB|
Eiður Guðjohnsen|ST|CAM
Carlo Cudicini|GK|
Christian Panucci|RB|CB
Sami Hyypiä|CB|
Stéphane Henchoz|CB|
Markus Babbel|RB|CB
Vladimír Šmicer|CAM|RM
Emile Heskey|ST|
Danny Murphy|CM|
Dietmar Hamann|CDM|
Jamie Carragher|CB|RB
Cristiano Ronaldo|LW|ST,RW
Andrés Iniesta|CM|LW,CAM
Lionel Messi|RW|CAM,ST|L
Arjen Robben|RW||L
John Arne Riise|LB|LM|L
Jerzy Dudek|GK|
Harry Kewell|LM|LW|L
Steven Gerrard|CM|CAM,CDM
Robert Pires|LM|CAM
Milan Baroš|ST|
Ashley Cole|LB||L
Sol Campbell|CB|
Jens Lehmann|GK|
Kolo Touré|CB|RB
Steve Finnan|RB|
Lauren|RB|
Edu|CM|CDM|L
Gilberto Silva|CDM|
Claude Makélélé|CDM|
Ricardo Carvalho|CB|
Frank Lampard|CM|CAM
Joe Cole|CAM|LM
Damien Duff|LW|RW|L
William Gallas|CB|LB
Didier Drogba|ST|
Wayne Bridge|LB||L
Paulo Ferreira|RB|
John Terry|CB|
Franck Ribéry|LW|
Luka Modrić|CM|CAM,CDM
Luis Suárez|ST|
Karim Benzema|ST|
Manuel Neuer|GK|
Robert Lewandowski|ST|
Sergio Ramos|CB|RB
Xabi Alonso|CDM|CM
Fernando Torres|ST|
Javier Mascherano|CDM|CB
Dirk Kuyt|RW|ST
Pepe Reina|GK|
Álvaro Arbeloa|RB|LB
Daniel Agger|CB||L
Bacary Sagna|RB|
Gaël Clichy|LB||L
Emmanuel Adebayor|ST|
Robin van Persie|ST|CAM|L
Andrey Arshavin|LW|CAM
Tomáš Rosický|CAM|CM
Branislav Ivanović|RB|CB
Michael Essien|CM|CDM
Michael Ballack|CM|CAM
Florent Malouda|LM|LW
José Bosingwa|RB|
Deco|CAM|CM
Nicolas Anelka|ST|
Pablo Zabaleta|RB|
Radamel Falcao|ST|
Wayne Rooney|ST|CAM
Zlatan Ibrahimović|ST|
Philipp Lahm|RB|LB,CDM
Thiago Silva|CB|
Sergio Busquets|CDM|
Mesut Özil|CAM|RW|L
Bastian Schweinsteiger|CM|CDM
Sergio Agüero|ST|
David Silva|CAM|CM,LW|L
Andrea Pirlo|CM|CDM
Carles Puyol|CB|RB
Dani Alves|RB|RWB
Cesc Fàbregas|CM|CAM
David Villa|ST|LW
Mario Gómez|ST|
Yaya Touré|CM|CDM
Carlos Tévez|ST|CAM
Wesley Sneijder|CAM|
Víctor Valdés|GK|
Gerard Piqué|CB|
Pepe|CB|
Gonzalo Higuaín|ST|
Nemanja Vidić|CB|
Vincent Kompany|CB|
Juan Mata|CAM|RW|L
Petr Čech|GK|
Gareth Bale|RW|LW,ST|L
Giorgio Chiellini|CB|LB|L
Edinson Cavani|ST|
Ángel Di María|RW|LW,CAM|L
Marco Reus|LW|CAM,ST
Mats Hummels|CB|
Jesús Navas|RW|RB
Fernando Llorente|ST|
Hugo Lloris|GK|
Diego Milito|ST|
Daniele De Rossi|CDM|CM
Neymar|LW|CAM
Pedro Rodríguez|RW|LW
Alexis Sánchez|LW|ST
Kaká|CAM|
Thomas Müller|CAM|ST,RW
Javi Martínez|CDM|CB
Javi Martinez|CDM|CB
Mario Götze|CAM|LW
Roberto Soldado|ST|
Joe Hart|GK|
Jordi Alba|LB||L
Ivan Rakitić|CM|
Arda Turan|LW|CAM
Rafinha Alcântara|CM|RW
Claudio Bravo|GK|
Marc Bartra|CB|
Sergi Roberto|RB|CM
Adriano Correia|LB|LM|L
Aleix Vidal|RB|RM
Thomas Vermaelen|CB||L
Jérémy Mathieu|CB|LB|L
Marc-André ter Stegen|GK|
Keylor Navas|GK|
Raphaël Varane|CB|
Nacho Fernández|CB|LB,RB
Toni Kroos|CM|CDM
James Rodríguez|CAM|RW|L
Marcelo|LB||L
Kiko Casilla|GK|
Casemiro|CDM|
Dani Carvajal|RB|
Lucas Vázquez|RW|RB
Jesé Rodríguez|LW|ST
Isco|CAM|CM,LW
Munir El Haddadi|RW|ST|L
Medhi Benatia|CB|
Rafinha|RB|LB
Jerome Boateng|CB|RB
Jérôme Boateng|CB|RB
Juan Bernat|LB||L
David Alaba|LB|CB,CM|L
Holger Badstuber|CB||L
Thiago Alcântara|CM|CDM
Douglas Costa|LW|RW|L
Arturo Vidal|CM|CDM
İlkay Gündoğan|CM|CAM
Danilo|RB|LB,CB
Kyle Walker|RB|
John Stones|CB|CDM
Raheem Sterling|LW|RW
Aymeric Laporte|CB||L
Eliaquim Mangala|CB||L
Kevin De Bruyne|CAM|CM
Fabian Delph|CM|LB|L
Leroy Sané|LW|RW|L
Bernardo Silva|RW|CAM,CM|L
Benjamin Mendy|LB||L
Riyad Mahrez|RW||L
Nicolás Otamendi|CB|
Ederson|GK|
Oleksandr Zinchenko|LB|CM|L
Fernandinho|CDM|CB
Gabriel Jesus|ST|LW
Presnel Kimpembe|CB||L
Thilo Kehrer|CB|RB
Marquinhos|CB|CDM
Marco Verratti|CM|CDM
Thomas Meunier|RB|
Eric Maxim Choupo-Moting|ST|
Layvin Kurzawa|LB||L
Julian Draxler|LW|CAM
Adrien Rabiot|CM|CDM|L
Niklas Süle|CB|
Leon Goretzka|CM|CDM
Serge Gnabry|RW|LW
Corentin Tolisso|CM|CDM
Kingsley Coman|LW|RW
Joshua Kimmich|CDM|RB
Nélson Semedo|RB|
Philippe Coutinho|CAM|LW
Arthur Melo|CM|
Kylian Mbappé|ST|LW
Erling Haaland|ST||L
Erling Håland|ST||L
Vinícius Júnior|LW|
Perr Schuurs|CB|
Edson Álvarez|CDM|CB
Davy Klaassen|CAM|CM
Noussair Mazraoui|RB|LB
Daley Blind|CB|LB,CDM|L
Lisandro Martínez|CB|LB|L
Sébastien Haller|ST|
Steven Berghuis|RW||L
André Onana|GK|
Nicolás Tagliafico|LB||L
David Neres|RW|LW|L
Dayot Upamecano|CB|
Benjamin Pavard|RB|CB
Lucas Hernandez|CB|LB|L
Marc Roca|CDM|
Denzel Dumfries|RWB|RB
Stefan de Vrij|CB|
Federico Dimarco|LWB|LB|L
Matteo Darmian|RB|LB,RWB
Milan Škriniar|CB|
Ivan Perišić|LWB|LW,LM
Hakan Çalhanoğlu|CDM|CAM,CM
Nicolò Barella|CM|CAM
Lautaro Martínez|ST|
Joaquín Correa|ST|LW
Rúben Dias|CB|
Nathan Aké|CB|LB|L
Jack Grealish|LW|CAM
Rodri Hernández|CDM|CM
Rodri|CDM|CM
Manuel Akanji|CB|RB
Mateo Kovačić|CM|CDM
Julián Álvarez|ST|CAM
Alex Meret|GK|
Mário Rui|LB||L
Victor Osimhen|ST|
Amir Rrahmani|CB|
Mathías Olivera|LB||L
Giovanni Simeone|ST|
Piotr Zieliński|CM|CAM
Matteo Politano|RW||L
Giovanni Di Lorenzo|RB|CB
Eljif Elmas|CM|LW
João Cancelo|RB|LB
Ronald Araújo|CB|RB
Íñigo Martínez|CB||L
Andreas Christensen|CB|CDM
Jules Koundé|RB|CB
Oriol Romeu|CDM|
Frenkie de Jong|CM|CDM
Ferrán Torres|LW|ST,RW
Raphinha|RW|LW|L
Joško Gvardiol|CB|LB|L
Jérémy Doku|LW|RW
Jude Bellingham|CAM|CM
Achraf Hakimi|RB|RWB
Manuel Ugarte|CDM|
Fabián Ruiz|CM|CDM|L
Ousmane Dembélé|RW|LW
Marco Asensio|RW|CAM|L
Danilo Pereira|CDM|CB
Mohamed Salah|RW||L
Thibaut Courtois|GK|
Harry Kane|ST|
Virgil van Dijk|CB|
Alisson Becker|GK|
Jamal Musiala|CAM|LW
Lamine Yamal|RW||L
Pedri|CM|CAM
Federico Valverde|CM|RM
Bukayo Saka|RW|LW|L
Martin Ødegaard|CAM||L
Florian Wirtz|CAM|LW
Vitinha|CM|CDM
Jan Oblak|GK|
Declan Rice|CDM|CM
William Saliba|CB|
Alexander Isak|ST|
Cole Palmer|CAM|RW|L
Bruno Fernandes|CAM|CM
Alessandro Bastoni|CB||L
Phil Foden|CAM|LW,RW|L
Gabriel Magalhães|CB||L
Viktor Gyökeres|ST|
Michael Olise|RW||L
Gregor Kobel|GK|
Khvicha Kvaratskhelia|LW|
Nuno Mendes|LB||L
Mike Maignan|GK|
Antonio Rüdiger|CB|
David Raya|GK|
Alexis Mac Allister|CM|CDM,CAM
Moisés Caicedo|CDM|CM
Bruno Guimarães|CM|CDM
Emiliano Martínez|GK|
João Neves|CM|CDM
Yann Sommer|GK|
Trent Alexander-Arnold|RB|CM
Éder Militão|CB|RB
Rodrygo|RW|LW,ST
Tijjani Reijnders|CM|CAM
Ryan Gravenberch|CDM|CM
Enzo Fernández|CM|CDM
Sandro Tonali|CDM|CM
Ollie Watkins|ST|
Cristian Romero|CB|
Aurélien Tchouaméni|CDM|CB
Eduardo Camavinga|CM|LB,CDM|L
Ferland Mendy|LB||L
Brahim Díaz|CAM|RW
Arda Güler|CAM|RW|L
Dani Olmo|CAM|LW
Gavi|CM|CAM
Pau Cubarsí|CB|
Alejandro Balde|LB||L
Marc Casadó|CDM|
Fermín López|CAM|CM
Ferran Torres|LW|ST
Antoine Griezmann|ST|CAM|L
Koke|CM|CDM
Rodrigo De Paul|CM|RM
Marcos Llorente|RM|CM,RB
José María Giménez|CB|
Robin Le Normand|CB|
Nico Williams|LW|
Iñaki Williams|RW|ST
Mikel Oyarzabal|LW|ST|L
Martín Zubimendi|CDM|
Mikel Merino|CM|CDM|L
Takefusa Kubo|RW||L
Unai Simón|GK|
Álex Remiro|GK|
Dani Parejo|CM|
Gerard Moreno|ST|RW|L
Isco Alarcón|CAM|CM
Joaquín|RW|RM
Jesús Navas González|RW|RB
Iago Aspas|ST|CAM|L
Álvaro Morata|ST|
Pau Torres|CB||L
Mohammed Kudus|RW|CAM|L
Son Heung-min|LW|ST
James Maddison|CAM|CM
Dejan Kulusevski|RW|CAM|L
Pedro Porro|RB|RWB
Destiny Udogie|LB||L
Micky van de Ven|CB||L
Guglielmo Vicario|GK|
Andrew Robertson|LB||L
Ibrahima Konaté|CB|
Luis Díaz|LW|
Darwin Núñez|ST|
Cody Gakpo|LW|ST
Diogo Jota|LW|ST
Dominik Szoboszlai|CM|CAM
Kai Havertz|ST|CAM|L
Gabriel Martinelli|LW|
Ben White|RB|CB
Thomas Partey|CDM|CM
Leandro Trossard|LW|CAM
Jurriën Timber|RB|CB,LB
Riccardo Calafiori|CB|LB|L
Martin Zubimendi|CDM|
Marcus Rashford|LW|ST
Rasmus Højlund|ST|
Alejandro Garnacho|LW|RW
Kobbie Mainoo|CM|CDM
Diogo Dalot|RB|LB
Luke Shaw|LB||L
Harry Maguire|CB|
Raphaël Guerreiro|LB|CM|L
Nicolas Jackson|ST|
Noni Madueke|RW||L
Reece James|RB|CM
Levi Colwill|CB|LB|L
Marc Cucurella|LB||L
Christopher Nkunku|CAM|ST,LW
Pedro Neto|RW|LW|L
Joao Pedro|ST|CAM
João Pedro|ST|CAM
Anthony Gordon|LW|
Kieran Trippier|RB||
Sven Botman|CB||L
Jarrod Bowen|RW|ST|L
Lucas Paquetá|CAM|CM|L
Eberechi Eze|CAM|LW
Bryan Mbeumo|RW|ST|L
Morgan Gibbs-White|CAM|
Chris Wood|ST|
Murillo|CB||L
Ola Aina|RB|LB
Harry Wilson|RW||L
Antoine Semenyo|RW|ST
Leny Yoro|CB|
Lucas Digne|LB||L
Matty Cash|RB|
Youri Tielemans|CM|CAM
Ezri Konsa|CB|RB
Leroy Sane|LW|RW|L
Kim Min-jae|CB|
Joshua Zirkzee|ST|CAM
Alphonso Davies|LB|LM|L
Konrad Laimer|CM|RB
Aleksandar Pavlović|CDM|
Xavi Simons|CAM|LW
Benjamin Šeško|ST|
Lois Openda|ST|
Granit Xhaka|CM|CDM|L
Jonathan Tah|CB|
Edmond Tapsoba|CB|
Jeremie Frimpong|RWB|RB
Alejandro Grimaldo|LWB|LB|L
Victor Boniface|ST|
Patrik Schick|ST||L
Piero Hincapié|CB|LB|L
Exequiel Palacios|CM|
Julian Brandt|CAM|LW
Karim Adeyemi|LW|ST
Nico Schlotterbeck|CB||L
Serhou Guirassy|ST|
Emre Can|CDM|CB
Ousmane Dembele|RW|LW
Bradley Barcola|LW|
Désiré Doué|RW|CAM
Gianluigi Donnarumma|GK|
Warren Zaïre-Emery|CM|RB
Willian Pacho|CB||L
Gonçalo Ramos|ST|
Randal Kolo Muani|ST|
Lucas Chevalier|GK|
Rafael Leão|LW|
Christian Pulisic|RW|LW
Theo Hernández|LB||L
Fikayo Tomori|CB|
Luka Jović|ST|
Dusan Vlahović|ST||L
Dušan Vlahović|ST||L
Kenan Yıldız|LW|CAM
Gleison Bremer|CB|
Federico Chiesa|RW|LW
Manuel Locatelli|CDM|CM
Teun Koopmeiners|CM|CAM|L
Marcus Thuram|ST|LW
Paulo Dybala|CAM|ST,RW|L
Lorenzo Pellegrini|CAM|CM
Artem Dovbyk|ST||L
Ademola Lookman|LW|ST
Charles De Ketelaere|CAM|ST|L
Mateo Retegui|ST|
Ciro Immobile|ST|
Sergej Milinković-Savić|CM|CAM
Mattia Zaccagni|LW|
Scott McTominay|CM|CAM
Romelu Lukaku|ST||L
Stanislav Lobotka|CDM|
Viktor Gyokeres|ST|
Pedro Gonçalves|CAM|LW
Gonçalo Inácio|CB||L
Morten Hjulmand|CDM|
Vangelis Pavlidis|ST|
Álvaro Carreras|LB||L
Ángel Di Maria|RW|LW|L
Alan Varela|CDM|
Samu Omorodion|ST|
Galeno|LW|
Orkun Kökçü|CM|CAM
Edin Džeko|ST|
Mauro Icardi|ST|
Dries Mertens|ST|LW
Hakim Ziyech|RW|CAM|L
Luis Suarez|ST|
Gabriel Barbosa|ST|LW|L
Pedro Guilherme|ST|
Arrascaeta|CAM|LW
Giorgian de Arrascaeta|CAM|LW
Bruno Henrique|LW|ST
Hulk|ST|RW|L
Gustavo Scarpa|CAM|LM|L
Raphael Veiga|CAM|CM|L
Endrick|ST|
Estêvão|RW||L
Germán Cano|ST|
Paulinho|CM|CAM
Marcos Rojo|CB|LB|L
Miguel Borja|ST|
Enzo Pérez|CDM|CM
Franco Armani|GK|
Luis Muriel|ST|LW
Ángel Correa|ST|RW
Carlos Vela|RW|ST|L
Hirving Lozano|LW|RW
Raúl Jiménez|ST|
Guillermo Ochoa|GK|
Christian Benteke|ST|
Josef Martínez|ST|
Lorenzo Insigne|LW|CAM
Riqui Puig|CM|CAM
Patrick Kluivert|ST|
Marc Overmars|LW|RW
Edgar Davids|CM|CDM|L
Clarence Seedorf|CM|CAM
Frank de Boer|CB|LB|L
Ronald de Boer|RM|CAM
Jaap Stam|CB|
Edwin van der Sar|GK|
Ruud van Nistelrooy|ST|
Pavel Nedvěd|LM|CAM,CM|L
Filippo Inzaghi|ST|
Andriy Shevchenko|ST|
Fabio Cannavaro|CB|
Alessandro Nesta|CB|
Gennaro Gattuso|CDM|CM
Rui Costa|CAM|
Luís Figo|RW|RM
Rivaldo|LW|CAM|L
Roberto Carlos|LB||L
Cafu|RB|RWB
Fernando Hierro|CB|CDM
Michael Owen|ST|
Paul Scholes|CM|CAM
Roy Keane|CDM|CM
Gary Neville|RB|
Rio Ferdinand|CB|
Ole Gunnar Solskjær|ST|
Teddy Sheringham|ST|CAM
Dwight Yorke|ST|
Juan Sebastián Verón|CM|CAM
Hernán Crespo|ST|
Pablo Aimar|CAM|
Juan Román Riquelme|CAM|
Esteban Cambiasso|CDM|CM|L
Javier Zanetti|RB|CDM,CM
Walter Samuel|CB|
Lúcio|CB|
Maicon|RB|
Samuel Eto'o|ST|LW
Adriano|ST||L
Michael Laudrup|CAM|
Brian Laudrup|LW|RW
Jürgen Klinsmann|ST|
Lothar Matthäus|CDM|CB
Oliver Kahn|GK|
Giovane Élber|ST|
Bixente Lizarazu|LB||L
Hasan Salihamidžić|RM|RB
Stefan Effenberg|CM|
Mehmet Scholl|CAM|LM|L
Miroslav Klose|ST|
Lukas Podolski|LW|ST|L
Kevin Kurányi|ST|
Torsten Frings|CDM|CM
Per Mertesacker|CB|
Christoph Metzelder|CB||L
Marcel Schmelzer|LB||L
Łukasz Piszczek|RB|
Neven Subotić|CB|
Ilkay Gündogan|CM|CAM
Jakub Błaszczykowski|RW|RM
Shinji Kagawa|CAM|LW
Pierre-Emerick Aubameyang|ST|LW
Henrikh Mkhitaryan|CAM|RW
Jadon Sancho|RW|LW
Thorgan Hazard|LW|RW
Eden Hazard|LW|CAM
Axel Witsel|CDM|CM
Jan Vertonghen|CB|LB|L
Toby Alderweireld|CB|RB
Kalidou Koulibaly|CB||L
Marek Hamšík|CM|CAM
Gonzalo Higuain|ST|
José Callejón|RW|
Raúl Albiol|CB|
Mesut Ozil|CAM|RW|L
Sami Khedira|CM|CDM
Asier Illarramendi|CDM|
Iker Muniain|LW|CAM|L
Aritz Aduriz|ST|
Santi Cazorla|CM|CAM
Raúl García|CAM|ST
Diego Costa|ST|
Diego Godín|CB|
Filipe Luís|LB||L
Gabi|CDM|CM
Miranda|CB||L
Juanfran|RB|
Tiago|CM|CDM
Saúl Ñíguez|CM|CDM|L
Yannick Carrasco|LW||L
Kevin Gameiro|ST|
Joaquín Sánchez|RW|RM
Rubén Castro|ST|
Jorge Molina|ST|
Borja Iglesias|ST|
Carlos Soler|CM|RW
José Luis Gayà|LB||L
Dani Parejo Muñoz|CM|
Rodrigo Moreno|ST|LW
Gaizka Mendieta|CM|RM
David Albelda|CDM|
Santiago Cañizares|GK|
Roberto Ayala|CB|
Vicente Rodríguez|LW|LM|L
Rubén Baraja|CM|CDM
Fernando Morientes|ST|
Guti|CAM|CM|L
Claude Makelele|CDM|
Míchel Salgado|RB|
Iván Helguera|CB|CDM
Fernando Redondo|CDM|CM|L
Davor Šuker|ST||L
Predrag Mijatović|ST|LW
Christian Karembeu|CDM|RM
Bodo Illgner|GK|
Manolo Sanchís|CB|
Rafael Alkorta|CB|
Luis Enrique|CM|RW,ST
Pep Guardiola|CDM|CM
Ronald Koeman|CB|CDM
Andoni Zubizarreta|GK|
Txiki Begiristain|LW|
José Mari Bakero|CAM|ST
Michael Reiziger|RB|
Phillip Cocu|CDM|CM,LB|L
Boudewijn Zenden|LM|LW|L
Sonny Anderson|ST|
Samuel Eto’o|ST|LW
Ludovic Giuly|RW|
Rafael Márquez|CB|CDM
Gianluca Zambrotta|RB|LB
Eric Abidal|LB|CB|L
Yaya Toure|CM|CDM
Bojan Krkić|ST|RW
Seydou Keita|CM|CDM|L
Maxwell|LB||L
Zlatan Ibrahimovic|ST|
Jeffrey Bruma|CB|
`;

export const KNOWN_POSITIONS = new Map();
for (const line of TABLE.trim().split('\n')) {
  const [name, main, alt = '', foot = ''] = line.split('|');
  if (!name || !main) continue;
  KNOWN_POSITIONS.set(name.trim(), { pos: main.trim(), alt: alt.split(',').map((x) => x.trim()).filter(Boolean), foot: foot.trim() === 'L' ? 'L' : null });
}

/** Traditional shirt numbers as a hint for the detailed position. */
const NUMBER_HINT = {
  DF: { 2: 'RB', 3: 'LB', 4: 'CB', 5: 'CB', 6: 'CB', 12: 'LB', 15: 'CB', 22: 'RB', 23: 'LB' },
  MF: { 4: 'CDM', 5: 'CDM', 6: 'CDM', 7: 'RM', 8: 'CM', 10: 'CAM', 11: 'LM', 14: 'CM', 16: 'CDM', 18: 'CM', 20: 'CAM', 21: 'CM', 22: 'CM' },
  FW: { 7: 'RW', 9: 'ST', 10: 'ST', 11: 'LW', 17: 'RW', 19: 'ST', 21: 'LW', 27: 'RW' },
};

export function positionFromNumber(line, number) {
  return NUMBER_HINT[line]?.[number] || null;
}
