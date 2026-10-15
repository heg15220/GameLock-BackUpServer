/**
 * Names for players the simulation creates: academy graduates, regens that
 * replace retirements and national-team fillers. Grouped by naming culture;
 * every generated player is labelled as such in the interface.
 */

const GROUPS = {
  hispanic: {
    first: ['Álvaro', 'Diego', 'Pablo', 'Marcos', 'Adrián', 'Hugo', 'Iván', 'Sergio', 'Mateo', 'Nicolás', 'Joaquín', 'Thiago', 'Bruno', 'Gonzalo', 'Rodrigo', 'Martín', 'Tomás', 'Santiago', 'Lucas', 'Emiliano'],
    last: ['Soler', 'Navarro', 'Molina', 'Serrano', 'Vega', 'Torres', 'Vidal', 'Mora', 'Rojas', 'Castro', 'Herrera', 'Medina', 'Ríos', 'Cabrera', 'Paredes', 'Acosta', 'Benítez', 'Aguirre', 'Correa', 'Ledesma'],
  },
  english: {
    first: ['James', 'Oliver', 'Jack', 'Harry', 'George', 'Charlie', 'Theo', 'Alfie', 'Callum', 'Kieran', 'Lewis', 'Mason', 'Ryan', 'Tyler', 'Jordan', 'Ethan', 'Noah', 'Liam', 'Connor', 'Jamie'],
    last: ['Bennett', 'Collins', 'Parker', 'Turner', 'Walker', 'Reed', 'Morgan', 'Clarke', 'Hughes', 'Ward', 'Fletcher', 'Barnes', 'Shaw', 'Gibson', 'Holmes', 'Mills', 'Robson', 'Hall', 'Cooper', 'Fraser'],
  },
  french: {
    first: ['Louis', 'Hugo', 'Lucas', 'Léo', 'Adam', 'Mathis', 'Jules', 'Noah', 'Rayan', 'Enzo', 'Théo', 'Yanis', 'Maxence', 'Kylian', 'Nathan', 'Malo', 'Baptiste', 'Axel', 'Ilan', 'Sacha'],
    last: ['Laurent', 'Moreau', 'Dubois', 'Fournier', 'Girard', 'Lambert', 'Bernard', 'Petit', 'Mercier', 'Rousseau', 'Faure', 'Blanc', 'Garnier', 'Chevalier', 'Perrin', 'Morel', 'Roux', 'Lefèvre', 'Durand', 'Bonnet'],
  },
  german: {
    first: ['Lukas', 'Leon', 'Felix', 'Jonas', 'Paul', 'Finn', 'Max', 'Tim', 'Niklas', 'Jannik', 'Moritz', 'Florian', 'Julian', 'Tobias', 'Elias', 'Luca', 'Noah', 'Ben', 'Kai', 'Nico'],
    last: ['Weber', 'Fischer', 'Schneider', 'Becker', 'Wagner', 'Hoffmann', 'Schulz', 'Bauer', 'Koch', 'Richter', 'Klein', 'Wolf', 'Neumann', 'Schwarz', 'Zimmermann', 'Krüger', 'Hartmann', 'Lange', 'Werner', 'Krause'],
  },
  italian: {
    first: ['Luca', 'Marco', 'Andrea', 'Matteo', 'Lorenzo', 'Davide', 'Simone', 'Alessio', 'Federico', 'Riccardo', 'Gabriele', 'Tommaso', 'Nicolò', 'Pietro', 'Edoardo', 'Filippo', 'Samuele', 'Giorgio', 'Leonardo', 'Mattia'],
    last: ['Rossi', 'Moretti', 'Conti', 'Ricci', 'Lombardi', 'Ferrari', 'Costa', 'Gallo', 'Bruno', 'Mancini', 'Rizzo', 'Marino', 'Greco', 'Barbieri', 'Fontana', 'Caruso', 'Santoro', 'Rinaldi', 'Leone', 'Longo'],
  },
  portuguese: {
    first: ['João', 'Tiago', 'Diogo', 'Rui', 'Miguel', 'Pedro', 'André', 'Rafael', 'Gabriel', 'Gustavo', 'Matheus', 'Felipe', 'Vinícius', 'Caio', 'Gonçalo', 'Rodrigo', 'Bernardo', 'Thiago', 'Enzo', 'Davi'],
    last: ['Pereira', 'Ferreira', 'Santos', 'Costa', 'Ribeiro', 'Teixeira', 'Sousa', 'Lopes', 'Silva', 'Oliveira', 'Almeida', 'Lima', 'Carvalho', 'Gomes', 'Martins', 'Araújo', 'Barbosa', 'Rocha', 'Moreira', 'Nunes'],
  },
  dutch: {
    first: ['Daan', 'Luuk', 'Bram', 'Finn', 'Sem', 'Lars', 'Thijs', 'Jens', 'Ruben', 'Milan', 'Stijn', 'Joris', 'Wout', 'Jesse', 'Teun', 'Niels', 'Arne', 'Senne', 'Mats', 'Robin'],
    last: ['de Vries', 'Jansen', 'Bakker', 'Visser', 'Smit', 'Bos', 'Mulder', 'Dekker', 'Peeters', 'Maes', 'Willems', 'Claes', 'de Jong', 'van Dijk', 'Meijer', 'de Boer', 'Vermeulen', 'Hendriks', 'Kok', 'Brouwer'],
  },
  arabic: {
    first: ['Youssef', 'Achraf', 'Hamza', 'Karim', 'Omar', 'Mehdi', 'Amine', 'Ayoub', 'Bilal', 'Ilyas', 'Riyad', 'Sofiane', 'Nabil', 'Zakaria', 'Mohamed', 'Ahmed', 'Mostafa', 'Ismail', 'Adel', 'Saïd'],
    last: ['El Amrani', 'Benali', 'Haddad', 'Mansour', 'Bouzid', 'Khalil', 'Saadi', 'Ziani', 'Belkacem', 'Hamdi', 'Farouk', 'Nasser', 'Tahiri', 'Rahmani', 'Abdelaziz', 'Fathy', 'Gaber', 'Selim', 'Kamal', 'Brahimi'],
  },
  westafrican: {
    first: ['Moussa', 'Ibrahima', 'Sadio', 'Cheikh', 'Kalidou', 'Victor', 'Samuel', 'Emmanuel', 'Kelechi', 'Wilfried', 'Serge', 'Yaya', 'Amadou', 'Ousmane', 'Thomas', 'Mohammed', 'Kwame', 'Joseph', 'Daniel', 'Godfrey'],
    last: ['Diallo', 'Ndiaye', 'Sarr', 'Mendy', 'Traoré', 'Koné', 'Touré', 'Cissé', 'Okafor', 'Eze', 'Adeyemi', 'Mensah', 'Boateng', 'Asante', 'Kouassi', 'Bamba', 'Sow', 'Camara', 'Fofana', 'Onyeka'],
  },
  japanese: {
    first: ['Takumi', 'Kaoru', 'Daichi', 'Ritsu', 'Wataru', 'Takefusa', 'Ko', 'Yuki', 'Hiroki', 'Kenta', 'Sota', 'Haruto', 'Ren', 'Shota', 'Yuto', 'Kaito', 'Daiki', 'Junya', 'Ayase', 'Keito'],
    last: ['Tanaka', 'Suzuki', 'Sato', 'Takahashi', 'Ito', 'Watanabe', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida', 'Yamada', 'Sasaki', 'Matsumoto', 'Inoue', 'Kimura', 'Hayashi', 'Shimizu', 'Mori', 'Endo'],
  },
  korean: {
    first: ['Min-jae', 'Heung-min', 'Kang-in', 'Hee-chan', 'Jae-sung', 'Woo-young', 'Seung-ho', 'Ji-sung', 'Dong-won', 'Hyun-woo', 'Tae-hwan', 'Young-gwon', 'Jun-ho', 'Sung-yong', 'In-beom', 'Gue-sung', 'Jin-su', 'Chang-hoon', 'Ui-jo', 'Seol'],
    last: ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim', 'Han', 'Oh', 'Seo', 'Shin', 'Kwon', 'Hwang', 'Ahn', 'Song', 'Jeon', 'Hong'],
  },
  chinese: {
    first: ['Wei', 'Lei', 'Jun', 'Hao', 'Yang', 'Peng', 'Bin', 'Chen', 'Xin', 'Long', 'Tao', 'Yi', 'Kai', 'Ming', 'Rui', 'Zhen', 'Jie', 'Feng', 'Bo', 'Yu'],
    last: ['Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Zhao', 'Huang', 'Zhou', 'Wu', 'Xu', 'Sun', 'Hu', 'Zhu', 'Gao', 'Lin', 'He', 'Guo', 'Ma', 'Luo'],
  },
  turkish: {
    first: ['Arda', 'Kerem', 'Emre', 'Hakan', 'Cengiz', 'Burak', 'Ferdi', 'Orkun', 'Barış', 'Kaan', 'Mert', 'Yusuf', 'Ozan', 'Salih', 'Abdülkerim', 'Semih', 'Uğurcan', 'Altay', 'Kenan', 'Okay'],
    last: ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Aydın', 'Öztürk', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özdemir', 'Polat', 'Erdoğan', 'Güler'],
  },
  greek: {
    first: ['Giorgos', 'Kostas', 'Dimitris', 'Nikos', 'Giannis', 'Vangelis', 'Christos', 'Thanasis', 'Panagiotis', 'Manolis', 'Anastasios', 'Fotis', 'Stelios', 'Petros', 'Andreas', 'Michalis', 'Lazaros', 'Tasos', 'Sotiris', 'Kyriakos'],
    last: ['Papadopoulos', 'Pavlidis', 'Mavropanos', 'Tsimikas', 'Bakasetas', 'Masouras', 'Vlachodimos', 'Siopis', 'Mantalos', 'Giakoumakis', 'Kourbelis', 'Karetsas', 'Retsos', 'Tzolis', 'Pelkas', 'Limnios', 'Douvikas', 'Hatzidiakos', 'Zafeiris', 'Koulierakis'],
  },
  nordic: {
    first: ['Erik', 'Lars', 'Anders', 'Magnus', 'Oskar', 'Viktor', 'Emil', 'Rasmus', 'Mikkel', 'Kasper', 'Jesper', 'Sander', 'Henrik', 'Jonas', 'Mathias', 'Isak', 'Elias', 'Andreas', 'Kristoffer', 'Martin'],
    last: ['Andersen', 'Nielsen', 'Hansen', 'Pedersen', 'Larsen', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Lindqvist', 'Berg', 'Haugen', 'Solberg', 'Dahl', 'Holm', 'Lund', 'Strand', 'Bakke', 'Nyberg', 'Ekström'],
  },
  slavic: {
    first: ['Luka', 'Marko', 'Ivan', 'Nikola', 'Filip', 'Mateusz', 'Jakub', 'Piotr', 'Dušan', 'Aleksandar', 'Tomáš', 'Ondřej', 'Andriy', 'Mykola', 'Dominik', 'Bartosz', 'Josip', 'Ante', 'Stefan', 'Milan'],
    last: ['Modrić', 'Kovačić', 'Novak', 'Horvat', 'Jović', 'Petrović', 'Nowak', 'Kowalski', 'Wiśniewski', 'Dvořák', 'Svoboda', 'Kovalenko', 'Shevchenko', 'Bondarenko', 'Marković', 'Ilić', 'Popović', 'Zieliński', 'Lewandowski', 'Kramarić'],
  },
};

const COUNTRY_GROUP = {
  ESP: 'hispanic', ARG: 'hispanic', MEX: 'hispanic', COL: 'hispanic', URU: 'hispanic', CHI: 'hispanic', PER: 'hispanic', ECU: 'hispanic', PAR: 'hispanic',
  BOL: 'hispanic', VEN: 'hispanic', CRC: 'hispanic', HON: 'hispanic', GUA: 'hispanic', SLV: 'hispanic', NCA: 'hispanic', PAN: 'hispanic', DOM: 'hispanic', CUB: 'hispanic',
  ENG: 'english', SCO: 'english', WAL: 'english', NIR: 'english', IRL: 'english', USA: 'english', CAN: 'english', AUS: 'english', NZL: 'english', JAM: 'english', RSA: 'english',
  FRA: 'french', BEL: 'french', SUI: 'german', GER: 'german', AUT: 'german', ITA: 'italian', POR: 'portuguese', BRA: 'portuguese', NED: 'dutch',
  MAR: 'arabic', ALG: 'arabic', TUN: 'arabic', EGY: 'arabic', KSA: 'arabic', QAT: 'arabic', UAE: 'arabic', IRQ: 'arabic', JOR: 'arabic', IRN: 'arabic',
  SEN: 'westafrican', NGA: 'westafrican', GHA: 'westafrican', CIV: 'westafrican', CMR: 'westafrican', MLI: 'westafrican', GUI: 'westafrican', BFA: 'westafrican', COD: 'westafrican', GAB: 'westafrican',
  JPN: 'japanese', KOR: 'korean', CHN: 'chinese', TUR: 'turkish', GRE: 'greek',
  DEN: 'nordic', SWE: 'nordic', NOR: 'nordic', FIN: 'nordic', ISL: 'nordic',
  CRO: 'slavic', SRB: 'slavic', POL: 'slavic', CZE: 'slavic', SVK: 'slavic', UKR: 'slavic', SVN: 'slavic', BIH: 'slavic', MNE: 'slavic', RUS: 'slavic', BUL: 'slavic',
};

const CONF_GROUP = { CONMEBOL: 'hispanic', CONCACAF: 'hispanic', CAF: 'westafrican', AFC: 'arabic', UEFA: 'english', OFC: 'english' };

export function generateName(random, country, conf) {
  const group = GROUPS[COUNTRY_GROUP[country] || CONF_GROUP[conf] || 'english'];
  const first = group.first[Math.floor(random() * group.first.length)];
  const last = group.last[Math.floor(random() * group.last.length)];
  return `${first} ${last}`;
}
