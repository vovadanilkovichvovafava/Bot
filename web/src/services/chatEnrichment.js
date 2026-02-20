/**
 * Chat Enrichment Service
 * Detects match-related queries and fetches real-time data from API-Football
 * to provide Claude with actual statistics instead of guessing.
 */
import footballApi from '../api/footballApi';

// Get possible seasons — different leagues start at different times
// European leagues: Aug-May (2025/2026 season = 2025)
// Argentine/South American leagues: Jan-Dec (2026 season = 2026)
// Returns [currentYear, currentYear-1] to try both
function getPossibleSeasons() {
  const year = new Date().getFullYear();
  return [year, year - 1];
}

// Common team name patterns (partial matches)
const LEAGUE_KEYWORDS = {
  // Premier League (ID: 39)
  'premier league': 39, 'epl': 39, 'prem': 39, 'english premier league': 39,
  'barclays premier league': 39, 'the prem': 39, 'pl': 39,
  'премьер-лига': 39, 'премьер лига': 39, 'апл': 39, 'английская премьер-лига': 39,
  'プレミアリーグ': 39, '英超': 39, '英超联赛': 39,
  'プレミア': 39, '프리미어리그': 39,
  'прем\'єр-ліга': 39,  // UK

  // La Liga (ID: 140)
  'la liga': 140, 'laliga': 140, 'ла лига': 140, 'liga española': 140,
  'liga espanhola': 140, 'ла-лига': 140, 'испанская лига': 140,
  'liga española de fútbol': 140, 'primera división': 140,
  'リーガ': 140, '西甲': 140, '西甲联赛': 140, 'ラ・リーガ': 140,
  '라리가': 140, 'ліга іспанії': 140,

  // Bundesliga (ID: 78)
  'bundesliga': 78, 'бундеслига': 78, 'german bundesliga': 78,
  'немецкая бундеслига': 78, 'немецкая лига': 78,
  'ブンデスリーガ': 78, '德甲': 78, '德甲联赛': 78,
  '분데스리가': 78, 'бундесліга': 78,

  // Serie A (ID: 135)
  'serie a': 135, 'серия а': 135, 'серія а': 135,
  'italian serie a': 135, 'итальянская серия а': 135, 'итальянская лига': 135,
  'campionato italiano': 135, 'calcio italiano': 135,
  'セリエa': 135, '意甲': 135, '意甲联赛': 135,
  '세리에a': 135,

  // Ligue 1 (ID: 61)
  'ligue 1': 61, 'лига 1': 61, 'french ligue 1': 61,
  'французская лига': 61, 'чемпионат франции': 61,
  'championnat de france': 61, 'ligue 1 uber eats': 61,
  'リーグ・アン': 61, '法甲': 61, '法甲联赛': 61,
  '리그1': 61, 'ліга 1': 61,

  // Champions League (ID: 2)
  'champions league': 2, 'ucl': 2, 'лига чемпионов': 2, 'лч': 2,
  'ligue des champions': 2, 'liga de campeones': 2, 'şampiyonlar ligi': 2,
  'liga mistrzów': 2, 'liga dos campeões': 2, 'liga campionilor': 2,
  'دوري الأبطال': 2, 'دوري ابطال اوروبا': 2, '欧冠': 2, '欧冠联赛': 2,
  'チャンピオンズリーグ': 2, '챔피언스리그': 2,
  'ліга чемпіонів': 2, 'champions': 2,

  // Europa League (ID: 3)
  'europa league': 3, 'лига европы': 3, 'лига європи': 3, 'uel': 3,
  'лигу европы': 3, 'avrupa ligi': 3, 'liga europy': 3,
  'liga europa': 3, 'الدوري الأوروبي': 3, '欧联': 3, '欧联杯': 3,
  'ヨーロッパリーグ': 3, '유로파리그': 3,

  // Conference League (ID: 848)
  'conference league': 848, 'лига конференций': 848, 'uecl': 848,
  'konferans ligi': 848, 'liga konferencji': 848,

  // Eredivisie (ID: 88)
  'eredivisie': 88, 'эредивизи': 88, 'голландская лига': 88,
  'dutch league': 88, 'netherlands league': 88, '荷甲': 88,

  // Primeira Liga / Liga Portugal (ID: 94)
  'primeira liga': 94, 'liga portugal': 94, 'примейра лига': 94,
  'португальская лига': 94, 'portuguese league': 94, '葡超': 94,

  // Championship (ID: 40)
  'championship': 40, 'efl championship': 40, 'чемпионшип': 40,
  'english championship': 40,

  // Süper Lig (ID: 52)
  'süper lig': 52, 'super lig': 52, 'суперлига': 52, 'турецкая лига': 52,
  'turkish league': 52, 'türk ligi': 52,

  // Liga 1 Romania (ID: 283)
  'liga 1 romania': 283, 'лига 1 румыния': 283, 'romanian league': 283,

  // Saudi Pro League (ID: 307)
  'saudi league': 307, 'saudi pro league': 307, 'саудовская лига': 307,
  'roshn saudi league': 307, 'الدوري السعودي': 307,

  // MLS (ID: 253)
  'mls': 253, 'major league soccer': 253, 'млс': 253,

  // Copa Libertadores (ID: 13)
  'libertadores': 13, 'copa libertadores': 13, 'либертадорес': 13,

  // Copa Sudamericana (ID: 11)
  'sudamericana': 11, 'copa sudamericana': 11, 'судамерикана': 11,

  // Brazilian Serie A (ID: 71)
  'brasileirao': 71, 'brasileirão': 71, 'serie a brazil': 71, 'brazilian league': 71,
  'бразильская серия а': 71, 'бразильская лига': 71, 'бразилейрао': 71,
  'campeonato brasileiro': 71,

  // Argentine Primera Division (ID: 128)
  'primera division argentina': 128, 'liga argentina': 128, 'аргентинская лига': 128,
  'argentine league': 128, 'superliga argentina': 128, 'суперлига аргентины': 128,
  'liga profesional': 128,

  // Scottish Premiership (ID: 179)
  'scottish premiership': 179, 'scottish league': 179, 'шотландская лига': 179,
  'чемпионат шотландии': 179,

  // Belgian Pro League (ID: 144)
  'belgian league': 144, 'jupiler pro league': 144, 'belgian pro league': 144,
  'бельгийская лига': 144, 'чемпионат бельгии': 144,

  // Swiss Super League (ID: 207)
  'swiss super league': 207, 'швейцарская лига': 207, 'чемпионат швейцарии': 207,

  // Austrian Bundesliga (ID: 218)
  'austrian bundesliga': 218, 'австрийская лига': 218, 'чемпионат австрии': 218,

  // Greek Super League (ID: 197)
  'greek super league': 197, 'греческая лига': 197, 'чемпионат греции': 197,
  'суперлига греции': 197,

  // Czech First League (ID: 345)
  'czech league': 345, 'чешская лига': 345, 'чемпионат чехии': 345,

  // === DOMESTIC CUPS ===

  // FA Cup (ID: 45)
  'fa cup': 45, 'кубок англии': 45, 'coppa d\'inghilterra': 45, 'copa de inglaterra': 45,
  'coupe d\'angleterre': 45, 'dfb pokal england': 45,

  // EFL Cup / Carabao Cup (ID: 48)
  'carabao cup': 48, 'efl cup': 48, 'league cup': 48, 'кубок лиги': 48,

  // Copa del Rey (ID: 143)
  'copa del rey': 143, 'кубок короля': 143, 'кубок испании': 143,
  'coppa del re': 143, 'coupe du roi': 143,

  // DFB-Pokal (ID: 81)
  'dfb pokal': 81, 'dfb-pokal': 81, 'кубок германии': 81,
  'coppa di germania': 81, 'copa de alemania': 81, 'coupe d\'allemagne': 81,

  // Coppa Italia (ID: 137)
  'coppa italia': 137, 'кубок италии': 137, 'italian cup': 137,
  'copa de italia': 137, 'coupe d\'italie': 137,

  // Coupe de France (ID: 66)
  'coupe de france': 66, 'кубок франции': 66, 'french cup': 66,
  'coppa di francia': 66, 'copa de francia': 66,

  // UEFA Nations League (ID: 5)
  'nations league': 5, 'лига наций': 5, 'лига націй': 5,
  'ligue des nations': 5, 'liga de naciones': 5, 'nazioni league': 5,

  // World Cup (ID: 1)
  'world cup': 1, 'чемпионат мира': 1, 'мундиаль': 1, 'copa del mundo': 1,
  'coupe du monde': 1, 'weltmeisterschaft': 1, 'dünya kupası': 1,
  'كأس العالم': 1, '世界杯': 1, 'ワールドカップ': 1, '월드컵': 1,

  // Euro (ID: 4)
  'euro': 4, 'european championship': 4, 'чемпионат европы': 4, 'евро': 4,
  'eurocopa': 4, 'europameisterschaft': 4, 'avrupa şampiyonası': 4,
  'كأس أوروبا': 4, '欧洲杯': 4, 'ユーロ': 4,

  // Club World Cup (ID: 15)
  'club world cup': 15, 'клубный чемпионат мира': 15, 'кчм': 15,
  'mundial de clubes': 15, 'coupe du monde des clubs': 15,
  'mondiale per club': 15, 'klub-wm': 15,

  // Copa America (ID: 9)
  'copa america': 9, 'copa américa': 9, 'кубок америки': 9, 'копа америка': 9,

  // Africa Cup of Nations (ID: 6)
  'africa cup': 6, 'afcon': 6, 'кубок африки': 6, 'can': 6,
  'coupe d\'afrique': 6, 'copa de africa': 6, 'coppa d\'africa': 6,

  // AFC Asian Cup (ID: 7)
  'asian cup': 7, 'кубок азии': 7, 'afc asian cup': 7,
};

// Match query patterns — with "vs" separator (multilingual)
const MATCH_PATTERNS_VS = [
  /(.+?)\s+(?:vs\.?|versus|against|v\.?|—|contra|contre|gegen|tegen|karşı)\s+(.+)/i,
  /(?:матч|match|game|predict|analyse|analyze|прогноз|анализ|partita|partido|pronostic|pronostico|maç|mecz|jogo|مباراة|मैच|比赛)\s+(.+?)\s+(?:vs\.?|v\.?|—|contra|contre|gegen|karşı)\s+(.+)/i,
];

// Well-known team names for detection without "vs" separator
const KNOWN_TEAMS = [
  // === PREMIER LEAGUE (England) ===
  'manchester united', 'man united', 'man utd', 'манчестер юнайтед', 'ман юнайтед', 'red devils',
  'manchester city', 'man city', 'манчестер сити', 'ман сити', 'citizens',
  'arsenal', 'арсенал', 'gunners', 'канониры',
  'chelsea', 'челси', 'the blues',
  'liverpool', 'ливерпуль', 'the reds',
  'tottenham', 'tottenham hotspur', 'spurs', 'тоттенхем', 'тоттенхэм', 'тотнем',
  'newcastle', 'newcastle united', 'ньюкасл', 'magpies',
  'aston villa', 'астон вилла',
  'west ham', 'вест хэм', 'вест хам', 'hammers',
  'brighton', 'брайтон',
  'crystal palace', 'кристал пэлас', 'кристал пелас',
  'everton', 'эвертон', 'toffees',
  'fulham', 'фулхэм', 'фулхем',
  'wolves', 'wolverhampton', 'вулверхэмптон', 'вулвз',
  'bournemouth', 'борнмут',
  'nottingham forest', 'ноттингем', 'ноттингем форест',
  'brentford', 'брентфорд',
  'burnley', 'бёрнли', 'бернли',
  'luton', 'лутон',
  'sheffield united', 'шеффилд', 'шеффилд юнайтед',
  'leicester', 'leicester city', 'лестер',
  'ipswich', 'ipswich town', 'ипсвич',
  'southampton', 'саутгемптон',
  'leeds', 'leeds united', 'лидс',
  'west brom', 'west bromwich', 'вест бром',
  'sunderland', 'сандерленд',

  // === LA LIGA (Spain) ===
  'real madrid', 'реал мадрид', 'реал', 'los blancos', 'бланкос',
  'barcelona', 'барселона', 'барса', 'blaugrana', 'блауграна',
  'atletico madrid', 'атлетико', 'атлетико мадрид',
  'sevilla', 'севилья',
  'real sociedad', 'сосьедад', 'реал сосьедад',
  'villarreal', 'вильярреал', 'yellow submarine',
  'athletic bilbao', 'атлетик бильбао', 'атлетик',
  'real betis', 'бетис',
  'valencia', 'валенсия',
  'girona', 'жирона',
  'celta vigo', 'сельта', 'сельта виго',
  'getafe', 'хетафе',
  'mallorca', 'мальорка',
  'osasuna', 'осасуна',
  'las palmas', 'лас пальмас',
  'rayo vallecano', 'райо вальекано',
  'alaves', 'алавес',
  'espanyol', 'эспаньол',
  'leganes', 'леганес',
  'valladolid', 'вальядолид',
  'cadiz', 'кадис',
  'almeria', 'альмерия',

  // === BUNDESLIGA (Germany) ===
  'bayern munich', 'bayern', 'бавария', 'bayern münchen', 'die bayern',
  'borussia dortmund', 'dortmund', 'дортмунд', 'боруссия дортмунд', 'bvb',
  'rb leipzig', 'лейпциг', 'рб лейпциг',
  'bayer leverkusen', 'leverkusen', 'леверкузен',
  'eintracht frankfurt', 'frankfurt', 'франкфурт', 'айнтрахт',
  'borussia monchengladbach', 'gladbach', 'мёнхенгладбах', 'гладбах',
  'wolfsburg', 'вольфсбург',
  'freiburg', 'фрайбург',
  'hoffenheim', 'хоффенхайм',
  'union berlin', 'унион берлин',
  'werder bremen', 'bremen', 'бремен', 'вердер',
  'augsburg', 'аугсбург',
  'stuttgart', 'штутгарт',
  'mainz', 'майнц',
  'koln', 'cologne', 'кёльн', 'кельн',
  'heidenheim', 'хайденхайм',
  'darmstadt', 'дармштадт',
  'st pauli', 'санкт-паули',
  'holstein kiel', 'киль',

  // === SERIE A (Italy) ===
  'juventus', 'ювентус', 'juve', 'юве', 'la vecchia signora',
  'inter milan', 'inter', 'интер', 'nerazzurri', 'нерадзурри',
  'ac milan', 'milan', 'милан', 'rossoneri', 'россонери',
  'napoli', 'наполи',
  'roma', 'рома', 'as roma', 'ас рома',
  'lazio', 'лацио',
  'atalanta', 'аталанта',
  'fiorentina', 'фиорентина', 'viola',
  'torino', 'торино',
  'bologna', 'болонья',
  'monza', 'монца',
  'udinese', 'удинезе',
  'sassuolo', 'сассуоло',
  'empoli', 'эмполи',
  'cagliari', 'кальяри',
  'genoa', 'дженоа',
  'lecce', 'лечче',
  'verona', 'hellas verona', 'верона',
  'frosinone', 'фрозиноне',
  'salernitana', 'салернитана',
  'parma', 'парма',
  'como', 'комо',
  'venezia', 'венеция',

  // === LIGUE 1 (France) ===
  'psg', 'paris saint-germain', 'paris saint germain', 'пари сен-жермен', 'псж',
  'marseille', 'марсель', 'olympique marseille', 'om',
  'lyon', 'лион', 'olympique lyonnais', 'ol',
  'monaco', 'монако', 'as monaco',
  'lille', 'лилль',
  'nice', 'ницца',
  'lens', 'ланс',
  'rennes', 'ренн', 'ренне',
  'strasbourg', 'страсбург',
  'toulouse', 'тулуза',
  'montpellier', 'монпелье',
  'nantes', 'нант',
  'reims', 'реймс',
  'brest', 'брест',
  'le havre', 'ле авр',
  'clermont', 'клермон',
  'lorient', 'лорьян',
  'metz', 'мец',
  'auxerre', 'осер',
  'angers', 'анже',
  'saint-etienne', 'сент-этьен',

  // === PRIMEIRA LIGA (Portugal) ===
  'benfica', 'бенфика',
  'porto', 'порту', 'fc porto',
  'sporting', 'спортинг', 'sporting cp',
  'braga', 'брага',
  'vitoria guimaraes', 'витория',

  // === EREDIVISIE (Netherlands) ===
  'ajax', 'аякс',
  'psv', 'псв', 'psv eindhoven',
  'feyenoord', 'фейеноорд',
  'az alkmaar', 'аз алкмар', 'az',
  'twente', 'твенте',

  // === SÜPER LIG (Turkey) ===
  'galatasaray', 'галатасарай',
  'fenerbahce', 'фенербахче',
  'besiktas', 'бешикташ',
  'trabzonspor', 'трабзонспор',
  'basaksehir', 'башакшехир',

  // === SCOTTISH PREMIERSHIP ===
  'celtic', 'селтик',
  'rangers', 'рейнджерс',
  'aberdeen', 'абердин',
  'hearts', 'хартс',
  'hibernian', 'хиберниан',

  // === BELGIAN PRO LEAGUE ===
  'club brugge', 'брюгге',
  'anderlecht', 'андерлехт',
  'genk', 'генк',
  'standard liege', 'стандард',
  'union saint-gilloise', 'юнион сен-жилуаз',

  // === SAUDI PRO LEAGUE ===
  'al hilal', 'al-hilal', 'аль-хилаль', 'аль хилаль', 'хилаль',
  'al nassr', 'al-nassr', 'аль-наср', 'аль наср',
  'al ahli', 'al-ahli', 'аль-ахли', 'аль ахли',
  'al ittihad', 'al-ittihad', 'аль-иттихад', 'аль иттихад',
  'al shabab', 'al-shabab', 'аль-шабаб',
  'al fateh', 'al-fateh', 'аль-фатех',

  // === MLS ===
  'inter miami', 'интер майами',
  'la galaxy', 'лос-анджелес гэлакси', 'гэлакси',
  'lafc', 'los angeles fc',
  'atlanta united', 'атланта юнайтед',
  'new york red bulls', 'нью-йорк ред буллз',
  'seattle sounders', 'сиэтл',

  // === SOUTH AMERICA ===
  'boca juniors', 'бока хуниорс', 'бока',
  'river plate', 'ривер плейт', 'ривер',
  'flamengo', 'фламенго',
  'palmeiras', 'палмейрас',
  'corinthians', 'коринтианс',
  'sao paulo', 'são paulo', 'сан-паулу',
  'santos', 'сантос',
  'gremio', 'grêmio', 'гремио',
  'internacional', 'интернасионал',
  'atletico mineiro', 'атлетико минейро',
  'fluminense', 'флуминенсе',
  'botafogo', 'ботафого',
  'racing club', 'расинг',
  'independiente', 'индепендьенте',
  'san lorenzo', 'сан-лоренсо',
  'penarol', 'peñarol', 'пеньяроль',
  'nacional', 'насьональ',

  // === RUSSIA / UKRAINE / CIS ===
  'zenit', 'зенит',
  'spartak', 'спартак', 'спартак москва',
  'cska', 'цска', 'цска москва',
  'dynamo moscow', 'динамо москва',
  'lokomotiv', 'локомотив', 'локомотив москва',
  'krasnodar', 'краснодар',
  'rostov', 'ростов',
  'rubin', 'рубин', 'рубин казань',
  'akhmat', 'ахмат', 'ахмат грозный',
  'sochi', 'сочи',
  'shakhtar', 'шахтёр', 'шахтер', 'шахтар', 'шахтёр донецк',
  'dynamo kyiv', 'динамо киев', 'динамо київ',
  'vorskla', 'ворскла',
  'zorya', 'заря',

  // === OTHER EUROPEAN ===
  'olympiacos', 'олимпиакос',
  'panathinaikos', 'панатинаикос',
  'aek athens', 'аек',
  'red star belgrade', 'црвена звезда', 'red star',
  'partizan', 'партизан',
  'slavia prague', 'славия прага',
  'sparta prague', 'спарта прага',
  'red bull salzburg', 'salzburg', 'зальцбург',
  'sturm graz', 'штурм грац',
  'rapid vienna', 'рапид',
  'young boys', 'янг бойз',
  'basel', 'базель',
  'malmo', 'мальмё',
  'copenhagen', 'копенгаген',
  'midtjylland', 'мидтьюлланд',
  'dinamo zagreb', 'динамо загреб',
  'ferencvaros', 'ференцварош',
  'legia warsaw', 'легия', 'легия варшава',
  'lech poznan', 'лех познань',

  // === NATIONAL TEAMS ===
  'brazil', 'бразилия', 'brasil', 'brasile', 'brésil',
  'argentina', 'аргентина',
  'france', 'франция', 'francia', 'frankreich',
  'germany', 'германия', 'alemania', 'allemagne', 'deutschland',
  'england', 'англия', 'inghilterra', 'inglaterra', 'angleterre',
  'spain', 'испания', 'españa', 'espagne', 'spagna', 'spanien',
  'italy', 'италия', 'italia', 'italie', 'italien',
  'portugal', 'португалия',
  'netherlands', 'голландия', 'нидерланды', 'olanda', 'pays-bas',
  'belgium', 'бельгия', 'belgique', 'belgio', 'belgien',
  'croatia', 'хорватия',
  'uruguay', 'уругвай',
  'colombia', 'колумбия',
  'mexico', 'мексика',
  'usa', 'сша',
  'japan', 'япония',
  'south korea', 'южная корея',
  'turkey', 'турция', 'türkiye',
  'poland', 'польша', 'polska',
  'ukraine', 'украина', 'україна',
  'russia', 'россия',
  'switzerland', 'швейцария',
  'denmark', 'дания',
  'sweden', 'швеция',
  'norway', 'норвегия',
  'austria', 'австрия',
  'czech republic', 'чехия',
  'serbia', 'сербия',
  'scotland', 'шотландия',
  'wales', 'уэльс',
  'morocco', 'марокко',
  'senegal', 'сенегал',
  'nigeria', 'нигерия',
  'egypt', 'египет',
  'cameroon', 'камерун',
  'ghana', 'гана',
  'algeria', 'алжир',
  'tunisia', 'тунис',
  'iran', 'иран',
  'saudi arabia', 'саудовская аравия',
  'australia', 'австралия',
  'canada', 'канада',
  'chile', 'чили',
  'peru', 'перу',
  'ecuador', 'эквадор',
  'paraguay', 'парагвай',
  'venezuela', 'венесуэла',
];

const TODAY_KEYWORDS = [
  // EN
  'today', 'tonight', 'now', 'this evening', 'todays matches', "today's matches",
  "today's games", 'todays games', 'current matches', 'playing today', 'matches today',
  // RU
  'сегодня', 'вечером', 'сейчас', 'на сегодня', 'сегодняшние', 'на вечер',
  'матчи сегодня', 'игры сегодня', 'сегодняшние матчи',
  // IT
  'oggi', 'stasera', 'adesso', 'ora', 'questa sera', 'partite di oggi',
  'partite oggi', 'match di oggi',
  // ES
  'hoy', 'esta noche', 'ahora', 'esta tarde', 'partidos de hoy',
  'partidos hoy', 'juegos de hoy',
  // FR
  "aujourd'hui", 'ce soir', 'maintenant', 'cette nuit', 'matchs du jour',
  "matchs d'aujourd'hui", 'les matchs ce soir',
  // DE
  'heute', 'heute abend', 'jetzt', 'heute nacht', 'heutige spiele',
  'spiele heute', 'heutige matches',
  // PL
  'dzisiaj', 'dziś', 'teraz', 'wieczorem', 'dzisiejsze mecze',
  'mecze dzisiaj', 'mecze dziś',
  // PT
  'hoje', 'esta noite', 'agora', 'hoje à noite', 'jogos de hoje',
  'jogos hoje', 'partidas de hoje',
  // TR
  'bugün', 'bu gece', 'şimdi', 'bu akşam', 'bugünkü maçlar',
  'bugünün maçları',
  // RO
  'azi', 'astăzi', 'acum', 'diseară', 'în seara asta', 'meciuri azi',
  'meciurile de azi',
  // AR
  'اليوم', 'الليلة', 'الآن', 'مساء اليوم', 'هذا المساء', 'مباريات اليوم',
  // HI
  'आज', 'आज रात', 'अभी', 'आज शाम', 'आज के मैच',
  // ZH
  '今天', '今晚', '现在', '今日', '今天的比赛', '今日比赛',
  // JA
  '今日', '今夜', '今日の試合',
  // KO
  '오늘', '오늘 밤', '오늘 경기',
  // UK
  'сьогодні', 'зараз', 'сьогоднішні матчі', 'увечері',
];
const TOMORROW_KEYWORDS = [
  // EN
  'tomorrow', 'tomorrow night', "tomorrow's matches", 'tomorrows matches',
  "tomorrow's games", 'tomorrows games', 'matches tomorrow',
  // RU
  'завтра', 'на завтра', 'завтрашние', 'завтрашние матчи', 'матчи завтра',
  'игры завтра',
  // IT
  'domani', 'domani sera', 'partite di domani', 'partite domani',
  // ES
  'mañana', 'mañana por la noche', 'partidos de mañana', 'partidos mañana',
  // FR
  'demain', 'demain soir', 'matchs de demain', 'les matchs demain',
  // DE
  'morgen', 'morgen abend', 'spiele morgen', 'morgige spiele',
  // PL
  'jutro', 'jutro wieczorem', 'mecze jutro', 'jutrzejsze mecze',
  // PT
  'amanhã', 'amanhã à noite', 'jogos de amanhã', 'jogos amanhã',
  // TR
  'yarın', 'yarın akşam', 'yarınki maçlar', 'yarının maçları',
  // RO
  'mâine', 'mâine seară', 'meciuri mâine', 'meciurile de mâine',
  // AR
  'غداً', 'غدا', 'غدًا', 'مباريات الغد',
  // HI
  'कल', 'कल के मैच', 'कल रात',
  // ZH
  '明天', '明日', '明天的比赛', '明日比赛',
  // JA
  '明日', '明日の試合',
  // KO
  '내일', '내일 경기',
  // UK
  'завтра', 'завтрашні матчі', 'матчі завтра',
];
const BEST_BET_KEYWORDS = [
  // EN — betting terms, slang, colloquial
  'best bet', 'top pick', 'value bet', 'sure bet', 'recommended bet', 'best prediction',
  'prediction', 'predictions', 'tips', 'betting tips', 'football tips', 'soccer tips',
  'top tips', 'betting advice', 'who will win', 'who wins', 'winner prediction',
  'match prediction', 'match predictions', 'safe bet', 'good bet', 'accumulator',
  'acca', 'parlay', 'pick of the day', 'tip of the day', 'what to bet',
  'what should i bet', 'both teams to score', 'btts', 'over under',
  'handicap tip', 'correct score', 'score prediction', 'daily tips',
  'free tips', 'free predictions', 'weekend tips', 'sure win', 'banker bet',
  'nap of the day', 'best odds', 'betting picks', 'expert tips',
  'football predictions', 'soccer predictions', 'combo bet', 'multi bet',
  'suggest a bet', 'recommend a bet', 'give me a tip',

  // RU — ставки, прогнозы, сленг
  'лучшая ставка', 'лучший прогноз', 'рекомендация', 'топ ставка',
  'прогноз', 'прогнозы', 'ставки', 'советы', 'совет', 'на что ставить',
  'кто выиграет', 'кто победит', 'прогноз на матч', 'прогнозы на матчи',
  'бесплатные прогнозы', 'точный прогноз', 'верная ставка', 'надёжная ставка',
  'надежная ставка', 'ставка дня', 'экспресс', 'тотал', 'фора',
  'обе забьют', 'победитель', 'исход', 'точный счёт', 'точный счет',
  'что посоветуешь', 'что ставить', 'подскажи ставку', 'посоветуй ставку',
  'беспроигрышная ставка', 'железная ставка', 'топ прогноз', 'лучшие ставки',
  'лучшие прогнозы', 'проход', 'проходная ставка', 'кеф', 'коэффициент',
  'ставки на спорт', 'футбольные прогнозы', 'на кого ставить',

  // IT — scommesse, pronostici, gergo
  'migliori scommesse', 'miglior scommessa', 'scommesse consigliate', 'scommessa consigliata',
  'pronostico', 'pronostici', 'previsione', 'previsioni', 'consigli scommesse',
  'consiglio scommessa', 'schedina', 'schedine', 'schedina del giorno',
  'quota', 'quote', 'chi vincerà', 'chi vince', 'vincitore',
  'esito', 'risultato esatto', 'over under', 'gol', 'multigol',
  'combo', 'sistema', 'antepost', 'scommessa sicura', 'scommessa del giorno',
  'dritte scommesse', 'suggerimento', 'suggerimenti', 'consiglio',
  'cosa scommettere', 'su cosa scommettere', 'entrambe segnano',
  'puntata', 'puntate', 'bolletta', 'colpo sicuro', 'pronostico del giorno',
  'pronostici di oggi', 'pronostici calcio', 'previsioni calcio',
  'scommesse calcio', 'tips calcio',

  // ES — apuestas, pronósticos, jerga
  'mejor apuesta', 'mejores apuestas', 'apuesta recomendada', 'pronóstico',
  'pronósticos', 'predicción', 'predicciones', 'consejos', 'consejo de apuestas',
  'quién ganará', 'quién gana', 'ganador', 'cuota', 'cuotas',
  'apuesta segura', 'apuesta del día', 'combinada', 'parlay', 'handicap',
  'goles', 'resultado exacto', 'ambos marcan', 'tips', 'tipster',
  'apuesta gratis', 'apuestas gratis', 'qué apostar', 'a quién apostar',
  'recomendación', 'sugerencia', 'sistema', 'apuestas fútbol',
  'predicciones fútbol', 'pronósticos de fútbol', 'pronósticos hoy',
  'apuestas de hoy', 'pick del día', 'selección',

  // FR — paris, pronostics, argot
  'meilleur pari', 'meilleurs paris', 'pari recommandé', 'pronostic',
  'pronostics', 'prédiction', 'prédictions', 'conseils paris', 'conseil',
  'astuce', 'qui va gagner', 'qui gagne', 'gagnant', 'cote', 'cotes',
  'pari sûr', 'combiné', 'combi', 'pari du jour', 'tips',
  'pari gratuit', 'paris gratuits', 'sur quoi parier', 'quoi parier',
  'recommandation', 'suggestion', 'score exact', 'les deux marquent',
  'handicap', 'buts', 'pronostic du jour', 'pronostics foot',
  'prédictions foot', 'paris sportifs', 'pronos', 'prono',
  'analyse', 'analyses', 'paris football',

  // DE — Wetten, Tipps, Umgangssprache
  'beste wette', 'besten wetten', 'empfohlene wette', 'tipp', 'tipps',
  'vorhersage', 'vorhersagen', 'prognose', 'prognosen', 'wett-tipps',
  'wetttipps', 'wer gewinnt', 'gewinner', 'quote', 'quoten',
  'sichere wette', 'tageswette', 'kombiwette', 'systemwette', 'system',
  'tipp des tages', 'gratis tipps', 'kostenlose tipps', 'was wetten',
  'worauf wetten', 'beide treffen', 'handicap', 'über unter',
  'genaues ergebnis', 'fussball tipps', 'fußball tipps',
  'fussball vorhersagen', 'fußball vorhersagen', 'sportwetten tipps',
  'empfehlung', 'wett empfehlung',

  // PL — zakłady, typy, slang
  'najlepszy zakład', 'najlepsze zakłady', 'rekomendowany zakład', 'typowanie',
  'typy', 'typy bukmacherskie', 'prognoza', 'prognozy', 'porady',
  'kto wygra', 'kto zwycięży', 'zwycięzca', 'kurs', 'kursy',
  'pewny zakład', 'pewniaki', 'pewniak', 'zakład dnia', 'akumulator', 'AKO',
  'co obstawiać', 'na co postawić', 'co typować', 'oba strzelą',
  'handicap', 'dokładny wynik', 'wynik meczu', 'darmowe typy',
  'typy na dziś', 'typy bukmacherów', 'typy piłkarskie',
  'zakłady piłkarskie', 'kupon', 'kupon dnia',

  // PT — apostas, prognósticos, gíria
  'melhor aposta', 'melhores apostas', 'aposta recomendada', 'prognóstico',
  'prognósticos', 'previsão', 'previsões', 'dicas', 'dica de aposta',
  'quem vai ganhar', 'quem ganha', 'vencedor', 'odd', 'odds',
  'aposta segura', 'aposta do dia', 'múltipla', 'acumulador', 'tips',
  'palpite', 'palpites', 'palpite do dia', 'apostas grátis',
  'no que apostar', 'o que apostar', 'ambas marcam',
  'handicap', 'placar exato', 'resultado exato', 'dicas de apostas',
  'prognósticos futebol', 'previsões futebol', 'apostas futebol',
  'bilhete do dia',

  // TR — bahis, tahminler, argo
  'en iyi bahis', 'önerilen bahis', 'tahmin', 'tahminler',
  'maç tahmini', 'maç tahminleri', 'iddaa', 'iddaa tahminleri',
  'kupon', 'kupon önerisi', 'kim kazanır', 'kim kazanacak', 'kazanan',
  'oran', 'oranlar', 'günün bahisi', 'banko', 'banko maç', 'sistem',
  'ne bahis yapmalı', 'neye bahis', 'iki takım da gol atar',
  'handikap', 'doğru skor', 'maç skoru', 'bedava tahmin',
  'ücretsiz tahmin', 'günün kuponu', 'bahis önerisi', 'bahis tavsiyesi',
  'futbol tahminleri', 'spor bahisleri',

  // RO — pariuri, pronosticuri, argou
  'cel mai bun pariu', 'cele mai bune pariuri', 'pariu recomandat', 'pronostic',
  'pronosticuri', 'predicție', 'predicții', 'sfaturi', 'sfat',
  'cine câștigă', 'cine va câștiga', 'câștigător', 'cotă', 'cote',
  'pariu sigur', 'pariul zilei', 'bilet', 'bilet al zilei', 'biletul zilei',
  'ce să pariez', 'pe ce să pariez', 'ambele marchează',
  'scor exact', 'handicap', 'pont', 'ponturi', 'ponturi pariuri',
  'pronosticuri fotbal', 'predicții fotbal', 'pariuri fotbal',
  'pont sigur', 'ponturi zilei',

  // AR — مراهنات، توقعات
  'أفضل رهان', 'أفضل توقع', 'رهان موصى', 'توقعات', 'توقع',
  'نصائح', 'نصيحة', 'من سيفوز', 'من يفوز', 'الفائز',
  'رهان آمن', 'رهان اليوم', 'احتمالات', 'نتيجة دقيقة',
  'كلا الفريقين يسجل', 'هانديكاب', 'نصائح مراهنات',
  'توقعات كرة القدم', 'مراهنات كرة القدم', 'نصائح مجانية',
  'توقعات مجانية', 'أفضل نصيحة', 'رهان مضمون',

  // HI — सट्टेबाजी, भविष्यवाणी
  'सबसे अच्छी शर्त', 'सर्वश्रेष्ठ भविष्यवाणी', 'भविष्यवाणी',
  'टिप्स', 'सुझाव', 'कौन जीतेगा', 'कौन जीतता है', 'विजेता',
  'आज की शर्त', 'सटीक भविष्यवाणी', 'सही स्कोर',
  'फुटबॉल भविष्यवाणी', 'मैच भविष्यवाणी', 'फ्री टिप्स',
  'बेटिंग टिप्स', 'बेस्ट बेट', 'शर्त सुझाव',

  // ZH — 投注、预测
  '最佳投注', '最佳预测', '推荐投注', '预测', '足球预测',
  '投注建议', '谁会赢', '赢家', '赔率', '今日推荐',
  '稳赢', '串关', '比分预测', '正确比分', '两队都进球',
  '让球', '大小球', '免费预测', '免费贴士', '足球贴士',
  '投注技巧', '每日推荐', '必赢', '精选推荐',

  // JA — ベッティング、予想
  '予想', 'サッカー予想', '試合予想', 'おすすめベット', 'ベッティング',
  '勝者予想', 'スコア予想', '的中', 'ヒント', '賭け',

  // KO — 배팅, 예측
  '예측', '축구 예측', '경기 예측', '베팅 팁', '추천 베팅',
  '누가 이길까', '승자', '배당', '적중', '승부예측',

  // UK — ставки, прогнози
  'найкраща ставка', 'найкращий прогноз', 'прогноз', 'прогнози',
  'ставки', 'поради', 'хто виграє', 'хто переможе', 'переможець',
  'ставка дня', 'точний прогноз', 'на що ставити', 'порада',
  'безпрограшна ставка', 'експрес', 'тотал', 'фора',
  'обидві заб\'ють', 'прогнози на футбол', 'футбольні прогнози',
];

/**
 * Analyze user message and determine what football data to fetch.
 * Returns enriched context string or null if no enrichment needed.
 */
export async function enrichMessage(message) {
  const lower = message.toLowerCase().trim();

  // 1. Try to detect a specific match query (e.g. "Arsenal vs Chelsea")
  const matchQuery = detectMatchQuery(lower, message);
  if (matchQuery) {
    return await enrichMatchQuery(matchQuery.home, matchQuery.away);
  }

  // 2. Detect day keywords and league keywords
  const isToday = TODAY_KEYWORDS.some(k => lower.includes(k));
  const isTomorrow = TOMORROW_KEYWORDS.some(k => lower.includes(k));
  const isBestBet = BEST_BET_KEYWORDS.some(k => lower.includes(k));
  const dayTarget = isTomorrow ? 'tomorrow' : (isToday || isBestBet) ? 'today' : null;

  // Check for league keyword in the same message
  let detectedLeagueId = null;
  let detectedLeagueKeyword = null;
  for (const [keyword, leagueId] of Object.entries(LEAGUE_KEYWORDS)) {
    if (lower.includes(keyword)) {
      detectedLeagueId = leagueId;
      detectedLeagueKeyword = keyword;
      break;
    }
  }

  // 3. If both day and league detected → league-specific day query (most specific)
  if (dayTarget && detectedLeagueId) {
    return await enrichLeagueDayQuery(detectedLeagueId, detectedLeagueKeyword, dayTarget);
  }

  // 4. Day-only query (no specific league)
  if (dayTarget) {
    return await enrichDayOverview(dayTarget === 'tomorrow' ? 'tomorrow' : 'today');
  }

  // 5. League-only query (no specific day)
  if (detectedLeagueId) {
    return await enrichLeagueQuery(detectedLeagueId, detectedLeagueKeyword);
  }

  // 6. Detect live match queries (all supported languages)
  const LIVE_KEYWORDS = [
    // EN
    'live', 'in play', 'in-play', 'live score', 'live scores', 'live match',
    'live matches', 'live now', 'playing now', 'live games', 'live results',
    'currently playing', 'ongoing matches', 'real time',
    // RU
    'лайв', 'сейчас играют', 'в прямом эфире', 'в игре', 'идёт матч',
    'идет матч', 'текущие матчи', 'онлайн', 'прямая трансляция',
    'сейчас идут', 'лайв матчи', 'лайв счёт', 'лайв счет',
    // IT
    'in diretta', 'dal vivo', 'partite live', 'partita in corso',
    'risultati live', 'risultati in diretta', 'live score', 'in tempo reale',
    'partite in corso',
    // ES
    'en vivo', 'en directo', 'resultado en vivo', 'partido en vivo',
    'marcador en vivo', 'partidos en vivo', 'partidos en directo',
    'resultados en vivo', 'tiempo real',
    // FR
    'en direct', 'match en direct', 'score en direct', 'en cours',
    'matchs en direct', 'résultats en direct', 'en temps réel',
    // DE
    'im spiel', 'laufende spiele', 'live spiel', 'live ergebnis',
    'live spiele', 'live ergebnisse', 'gerade laufend', 'echtzeit',
    // PL
    'na żywo', 'mecze na żywo', 'wyniki na żywo', 'aktualnie grane',
    'mecze w toku', 'wyniki live', 'trwające mecze',
    // PT
    'ao vivo', 'jogo ao vivo', 'resultado ao vivo', 'em andamento',
    'jogos ao vivo', 'resultados ao vivo', 'placar ao vivo', 'tempo real',
    // TR
    'canlı', 'canlı maç', 'canlı skor', 'şu an oynanan',
    'canlı maçlar', 'canlı sonuçlar', 'anlık',
    // RO
    'în direct', 'meci live', 'scor live', 'în desfășurare',
    'meciuri live', 'rezultate live', 'meciuri în direct',
    // AR
    'مباشر', 'بث مباشر', 'نتائج مباشرة', 'مباراة حية',
    'مباريات مباشرة', 'نتيجة مباشرة',
    // HI
    'लाइव', 'लाइव मैच', 'लाइव स्कोर', 'अभी खेल रहे',
    // ZH
    '直播', '正在进行', '实时比分', '即时比分', '实时', '比赛直播',
    // JA
    'ライブ', 'リアルタイム', '試合中',
    // KO
    '라이브', '실시간', '진행중', '실시간 스코어',
    // UK
    'наживо', 'у прямому ефірі', 'зараз грають', 'лайв матчі',
  ];
  if (LIVE_KEYWORDS.some(k => lower.includes(k))) {
    return await enrichLiveMatches();
  }

  // 7. Last resort: try to find team names in the message via API search
  // This catches queries like "Defensa Y Justicia Belgrano" without "vs"
  const fallback = await fallbackTeamSearch(message);
  if (fallback) return fallback;

  return null;
}

/**
 * Detect if the message is asking about a specific match.
 * Handles both "Team A vs Team B" and "матч Команда1 Команда2" patterns.
 */
function detectMatchQuery(lower, original) {
  // 1. Try explicit "vs" / "—" patterns first
  for (const pattern of MATCH_PATTERNS_VS) {
    const match = original.match(pattern);
    if (match) {
      const home = (match[1] || '').trim();
      const away = (match[2] || '').trim();
      if (home.length > 1 && away.length > 1) {
        return { home: cleanTeamName(home), away: cleanTeamName(away) };
      }
    }
  }

  // 2. Try detecting two known team names in the message (no separator needed)
  // Sort by length descending so longer names match first ("manchester united" before "inter")
  const sortedTeams = [...KNOWN_TEAMS].sort((a, b) => b.length - a.length);
  const found = [];

  let remaining = lower;
  for (const team of sortedTeams) {
    const idx = remaining.indexOf(team);
    if (idx !== -1) {
      found.push({ team, pos: idx });
      // Remove matched team from remaining to avoid overlap
      remaining = remaining.substring(0, idx) + ' '.repeat(team.length) + remaining.substring(idx + team.length);
      if (found.length === 2) break;
    }
  }

  if (found.length === 2) {
    // Sort by position in message — first mentioned = home
    found.sort((a, b) => a.pos - b.pos);
    return { home: found[0].team, away: found[1].team };
  }

  // 3. Single team detected — return it as both (will search for upcoming fixtures)
  if (found.length === 1) {
    return { home: found[0].team, away: null };
  }

  return null;
}

/**
 * Remove noise words from team name extracted via "vs" pattern
 */
function cleanTeamName(name) {
  return name
    .replace(/^(матч|match|game|predict|прогноз|анализ|ставка|ставку|bet on|when does|when is|когда играет|когда будет|следующий матч|next match|prossima partita|próximo partido|prochain match|nächstes spiel|siguiente partido|następny mecz|próximo jogo|siguiente partido de|sonraki maç|расскажи про|tell me about|analizza|analiza|проанализируй)\s+/i, '')
    .replace(/\s+(какую|какой|ставку|ставка|прогноз|prediction|bet|odds|коэффициент|кеф|play next|play today|играет|играют|сегодня|завтра|today|tomorrow).*$/i, '')
    .trim();
}

/**
 * Last-resort fallback: extract potential team names from message and search API.
 * Handles messages like "Defensa Y Justicia Belgrano Cordoba" without "vs" separator.
 * Also handles "analyse inter milan", "what about juventus", etc.
 */
async function fallbackTeamSearch(message) {
  // Strip common noise words that aren't team names (multilingual)
  const noise = /\b(analyze|analyse|predict|prediction|prognoz|прогноз|анализ|ставка|ставку|bet|odds|match|матч|partita|partido|game|who|will|win|score|how|what|about|the|and|for|with|quale|come|chi|vince|risultato|scommessa|проанализируй|кто|выиграет|счёт|счет|when|does|play|next|играет|играют|когда|будет|следующий|ближайший|расскажи|покажи|tell|me|show|prossima|próximo|prochain|nächstes|siguiente|następny|sonraki|spiel|mecz|jogo|maç|partida|di|de|du|del|von|van|il|la|le|el|der|die|das|какой|на|что|про|por|per|pour|für|voor|hakkında|о|об|про|información|informazione|information|info)\b/gi;
  const cleaned = message.replace(noise, ' ').replace(/\s+/g, ' ').trim();

  if (cleaned.length < 3) return null;

  // Split into potential "chunks" — try to find 1-2 team names
  // Strategy: search the whole cleaned message first, then try splitting by common separators
  const chunks = [];

  // Try common separators that users might use
  const separators = [' - ', ' – ', ' — ', ' , ', '  '];
  let splitFound = false;
  for (const sep of separators) {
    if (cleaned.includes(sep)) {
      const parts = cleaned.split(sep).map(s => s.trim()).filter(s => s.length > 2);
      if (parts.length >= 2) {
        chunks.push(...parts.slice(0, 2));
        splitFound = true;
        break;
      }
    }
  }

  // If no separator found, try searching the whole string
  // The API might match "Defensa Y Justicia" from "Defensa Y Justicia Belgrano Cordoba"
  if (!splitFound) {
    chunks.push(cleaned);
  }

  // Search for teams via API
  const foundTeams = [];
  for (const chunk of chunks) {
    try {
      const results = await footballApi.searchTeams(chunk);
      if (results?.length > 0) {
        // Take the best match
        const best = results[0];
        // Avoid duplicates
        if (!foundTeams.find(t => t.id === best.id)) {
          foundTeams.push(best);
        }
      }
    } catch (_) {}
  }

  // If only one chunk (no separator), try a second search with remaining text
  if (!splitFound && foundTeams.length === 1) {
    const firstTeamName = foundTeams[0].name.toLowerCase();
    // Remove the found team name from the message to find the second team
    let remaining = cleaned.toLowerCase();
    // Remove words that match the team name
    const teamWords = firstTeamName.split(/\s+/);
    for (const w of teamWords) {
      remaining = remaining.replace(new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'), '');
    }
    remaining = remaining.replace(/\s+/g, ' ').trim();

    if (remaining.length > 2) {
      try {
        const results2 = await footballApi.searchTeams(remaining);
        if (results2?.length > 0 && results2[0].id !== foundTeams[0].id) {
          foundTeams.push(results2[0]);
        }
      } catch (_) {}
    }
  }

  if (foundTeams.length >= 2) {
    // Found two teams — search for their match
    return await enrichMatchQuery(foundTeams[0].name, foundTeams[1].name);
  } else if (foundTeams.length === 1) {
    // Found one team — show upcoming
    return await enrichSingleTeam(foundTeams[0].name);
  }

  return null;
}

/**
 * Fetch enriched data for a specific match.
 * Searches across 7 days (today + 6 days ahead) to find the fixture.
 * Also handles single team queries (away=null).
 */
async function enrichMatchQuery(homeTeam, awayTeam) {
  // If only one team detected, search for their upcoming fixtures
  if (!awayTeam) {
    return await enrichSingleTeam(homeTeam);
  }

  // Strategy 1: Search fixtures day-by-day (yesterday + today + 6 days ahead)
  let enriched = null;
  try {
    for (let i = -1; i < 7; i++) {
      const date = new Date(Date.now() + i * 86400000).toISOString().split('T')[0];
      enriched = await footballApi.getMatchEnrichedData(homeTeam, awayTeam, date);
      if (enriched) break;
    }
  } catch (e) {
    console.error('Match enrichment (day scan) failed:', e);
  }

  // Strategy 2: If not found by date scan, search by team name via API
  if (!enriched) {
    try {
      const results = await footballApi.searchTeam(homeTeam);
      if (results?.length > 0) {
        const teamId = results[0].team.id;
        // Try both seasons (European vs South American leagues)
        let fixtures = [];
        for (const season of getPossibleSeasons()) {
          fixtures = await footballApi.getFixturesByTeam(teamId, season, 10);
          if (fixtures?.length > 0) break;
        }
        if (fixtures?.length > 0) {
          // Try to find the specific opponent
          const normalize = n => (n || '').toLowerCase().replace(/[^a-zа-яё0-9]/gi, '');
          const awayNorm = normalize(awayTeam);
          const matched = fixtures.find(f => {
            const h = normalize(f.teams.home.name);
            const a = normalize(f.teams.away.name);
            return h.includes(awayNorm) || a.includes(awayNorm) || awayNorm.includes(h) || awayNorm.includes(a);
          });

          if (matched) {
            // Found the fixture — get enriched data by fixture ID
            const fixtureId = matched.fixture.id;
            const [prediction, odds, stats, injuries, lineups] = await Promise.allSettled([
              footballApi.getPrediction(fixtureId),
              footballApi.getOdds(fixtureId),
              footballApi.getFixtureStatistics(fixtureId),
              footballApi.getInjuries(fixtureId),
              footballApi.getFixtureLineups(fixtureId),
            ]);
            enriched = {
              fixture: matched,
              fixtureId,
              prediction: prediction.status === 'fulfilled' ? prediction.value : null,
              odds: odds.status === 'fulfilled' ? odds.value : [],
              stats: stats.status === 'fulfilled' ? stats.value : [],
              injuries: injuries.status === 'fulfilled' ? injuries.value : [],
              lineups: lineups.status === 'fulfilled' ? lineups.value : [],
            };
          } else {
            // Opponent not found in upcoming, show all upcoming
            return buildUpcomingContext(results[0].team.name, fixtures);
          }
        }
      }
    } catch (_) {}
  }

  if (!enriched) return null;

  // Build rich context from enriched data
  const parts = [];
  const fixture = enriched.fixture;

  parts.push(`Match: ${fixture.teams.home.name} vs ${fixture.teams.away.name}`);
  parts.push(`League: ${fixture.league.name} (${fixture.league.country})`);
  parts.push(`Date: ${new Date(fixture.fixture.date).toLocaleString()}`);
  parts.push(`Status: ${fixture.fixture.status.long}`);

  // Score if live/finished
  if (fixture.goals.home !== null) {
    parts.push(`Score: ${fixture.goals.home} - ${fixture.goals.away}`);
  }

  // Prediction data
  if (enriched.prediction) {
    const pred = enriched.prediction.predictions;
    const cmp = enriched.prediction.comparison;
    if (pred) {
      parts.push('');
      parts.push('--- API Prediction Data ---');
      if (pred.winner?.name) {
        parts.push(`Predicted winner: ${pred.winner.name} (${pred.winner.comment || ''})`);
      }
      if (pred.advice) parts.push(`Advice: ${pred.advice}`);
      if (pred.percent) {
        parts.push(`Win probability: Home ${pred.percent.home}, Draw ${pred.percent.draw}, Away ${pred.percent.away}`);
      }
    }
    if (cmp) {
      parts.push(`Form: Home ${cmp.form?.home || '?'} vs Away ${cmp.form?.away || '?'}`);
      parts.push(`Attack: Home ${cmp.att?.home || '?'} vs Away ${cmp.att?.away || '?'}`);
      parts.push(`Defense: Home ${cmp.def?.home || '?'} vs Away ${cmp.def?.away || '?'}`);
      parts.push(`Overall: Home ${cmp.total?.home || '?'} vs Away ${cmp.total?.away || '?'}`);
    }
  }

  // Odds
  if (enriched.odds?.length > 0) {
    const bookmaker = enriched.odds[0]?.bookmakers?.[0];
    if (bookmaker) {
      const market = bookmaker.bets?.find(b => b.name === 'Match Winner');
      if (market) {
        const home = market.values?.find(v => v.value === 'Home')?.odd;
        const draw = market.values?.find(v => v.value === 'Draw')?.odd;
        const away = market.values?.find(v => v.value === 'Away')?.odd;
        if (home) {
          parts.push('');
          parts.push('--- Bookmaker Odds ---');
          parts.push(`${bookmaker.name}: Home ${home}, Draw ${draw}, Away ${away}`);
        }
      }
    }
  }

  // Match statistics (if live/finished)
  if (enriched.stats?.length >= 2) {
    const homeStats = enriched.stats[0]?.statistics || [];
    const awayStats = enriched.stats[1]?.statistics || [];
    if (homeStats.length > 0) {
      parts.push('');
      parts.push('--- Match Statistics ---');
      for (let i = 0; i < homeStats.length; i++) {
        const h = homeStats[i];
        const a = awayStats[i];
        if (h && a) {
          parts.push(`${h.type}: ${h.value ?? 0} - ${a.value ?? 0}`);
        }
      }
    }
  }

  // Injuries
  if (enriched.injuries?.length > 0) {
    parts.push('');
    parts.push('--- Injuries/Suspensions ---');
    for (const inj of enriched.injuries.slice(0, 10)) {
      parts.push(`${inj.team.name}: ${inj.player.name} (${inj.player.reason || 'injured'})`);
    }
  }

  // Lineups
  if (enriched.lineups?.length >= 2) {
    parts.push('');
    parts.push('--- Lineups ---');
    for (const team of enriched.lineups) {
      parts.push(`${team.team.name} (${team.formation}): ${team.startXI?.map(p => p.player.name).join(', ')}`);
      if (team.coach?.name) parts.push(`Coach: ${team.coach.name}`);
    }
  }

  return parts.join('\n');
}

/**
 * Fetch today's/tomorrow's fixtures overview with predictions.
 */
async function enrichDayOverview(day) {
  const date = day === 'tomorrow'
    ? new Date(Date.now() + 86400000).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  try {
    const fixtures = await footballApi.getFixturesByDate(date);
    if (!fixtures?.length) return `No fixtures found for ${day} (${date}).`;

    // Group by league, limit to top leagues
    const topLeagueIds = new Set([39, 140, 78, 135, 61, 2, 3, 88, 94, 40, 71, 253]);
    const topFixtures = fixtures.filter(f => topLeagueIds.has(f.league.id));
    const useFixtures = topFixtures.length > 0 ? topFixtures : fixtures.slice(0, 30);

    const byLeague = {};
    for (const f of useFixtures) {
      const league = f.league.name;
      if (!byLeague[league]) byLeague[league] = [];
      byLeague[league].push(f);
    }

    const parts = [`Football fixtures for ${day} (${date}):`];
    parts.push(`Total: ${fixtures.length} matches (showing top leagues)`);
    parts.push('');

    for (const [league, matches] of Object.entries(byLeague)) {
      parts.push(`--- ${league} ---`);
      for (const f of matches) {
        const time = new Date(f.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const status = f.fixture.status.short;
        let line = `${time} | ${f.teams.home.name} vs ${f.teams.away.name}`;
        if (['1H', '2H', 'HT', 'ET'].includes(status)) {
          line += ` [LIVE ${f.goals.home}-${f.goals.away}, ${f.fixture.status.elapsed}']`;
        } else if (status === 'FT') {
          line += ` [FT ${f.goals.home}-${f.goals.away}]`;
        }
        parts.push(line);
      }
      parts.push('');
    }

    // Fetch predictions for a few upcoming matches
    const upcoming = useFixtures
      .filter(f => f.fixture.status.short === 'NS')
      .slice(0, 5);

    if (upcoming.length > 0) {
      const predResults = await Promise.allSettled(
        upcoming.map(f => footballApi.getPrediction(f.fixture.id))
      );

      const predsWithData = predResults
        .map((r, i) => ({ fixture: upcoming[i], pred: r.status === 'fulfilled' ? r.value : null }))
        .filter(p => p.pred?.predictions?.winner);

      if (predsWithData.length > 0) {
        parts.push('--- AI Predictions (API-Football) ---');
        for (const { fixture: f, pred } of predsWithData) {
          const p = pred.predictions;
          parts.push(`${f.teams.home.name} vs ${f.teams.away.name}: ${p.winner.name} (${p.advice || ''})`);
          if (p.percent) {
            parts.push(`  Probability: H ${p.percent.home} D ${p.percent.draw} A ${p.percent.away}`);
          }
        }
      }
    }

    return parts.join('\n');
  } catch (e) {
    console.error('Day overview enrichment failed:', e);
    return null;
  }
}

/**
 * Fetch upcoming fixtures for a single team.
 */
async function enrichSingleTeam(teamName) {
  try {
    const results = await footballApi.searchTeam(teamName);
    if (!results?.length) return null;

    const team = results[0].team;
    const teamId = team.id;
    // Try both seasons (European vs South American leagues)
    let fixtures = [];
    for (const season of getPossibleSeasons()) {
      fixtures = await footballApi.getFixturesByTeam(teamId, season, 5);
      if (fixtures?.length) break;
    }
    if (!fixtures?.length) return `No upcoming fixtures found for ${team.name}.`;

    return buildUpcomingContext(team.name, fixtures);
  } catch (e) {
    console.error('Single team enrichment failed:', e);
    return null;
  }
}

/**
 * Build context string for upcoming fixtures list.
 */
function buildUpcomingContext(teamName, fixtures) {
  const parts = [`Upcoming fixtures for ${teamName}:`];
  parts.push('');

  for (const f of fixtures) {
    const date = new Date(f.fixture.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = new Date(f.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const status = f.fixture.status.short;
    let line = `${date} ${time} | ${f.teams.home.name} vs ${f.teams.away.name} (${f.league.name})`;
    if (status === 'FT') {
      line += ` [FT ${f.goals.home}-${f.goals.away}]`;
    } else if (['1H', '2H', 'HT'].includes(status)) {
      line += ` [LIVE ${f.goals.home}-${f.goals.away}]`;
    }
    parts.push(line);
  }

  return parts.join('\n');
}

/**
 * Fetch fixtures for a specific league on a specific day (today/tomorrow).
 * Returns clear message if no matches found — preventing AI hallucination.
 */
async function enrichLeagueDayQuery(leagueId, keyword, day) {
  const date = day === 'tomorrow'
    ? new Date(Date.now() + 86400000).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  try {
    const fixtures = await footballApi.getFixturesByDate(date);
    const leagueFixtures = fixtures.filter(f => f.league.id === leagueId);

    if (leagueFixtures.length === 0) {
      // Explicit "no matches" message so the AI doesn't hallucinate
      return `IMPORTANT: There are NO ${keyword} matches scheduled for ${day} (${date}). Do NOT invent matches. Tell the user there are no ${keyword} matches ${day} and suggest checking the next matchday.`;
    }

    const context = buildLeagueContext(leagueFixtures, `${keyword} fixtures for ${day} (${date})`);

    // Fetch predictions for upcoming matches
    const upcoming = leagueFixtures.filter(f => f.fixture.status.short === 'NS').slice(0, 5);
    if (upcoming.length > 0) {
      const predResults = await Promise.allSettled(
        upcoming.map(f => footballApi.getPrediction(f.fixture.id))
      );
      const predsWithData = predResults
        .map((r, i) => ({ fixture: upcoming[i], pred: r.status === 'fulfilled' ? r.value : null }))
        .filter(p => p.pred?.predictions?.winner);

      if (predsWithData.length > 0) {
        const predParts = ['\n--- API Predictions ---'];
        for (const { fixture: f, pred } of predsWithData) {
          const p = pred.predictions;
          predParts.push(`${f.teams.home.name} vs ${f.teams.away.name}: ${p.winner.name} (${p.advice || ''})`);
          if (p.percent) {
            predParts.push(`  Probability: H ${p.percent.home} D ${p.percent.draw} A ${p.percent.away}`);
          }
        }
        return context + '\n' + predParts.join('\n');
      }
    }

    return context;
  } catch (e) {
    console.error('League day enrichment failed:', e);
    return null;
  }
}

/**
 * Fetch data for a specific league query. Searches up to 7 days to find matches.
 */
async function enrichLeagueQuery(leagueId, keyword) {
  try {
    // Search up to 7 days to find league fixtures
    for (let i = 0; i < 7; i++) {
      const date = new Date(Date.now() + i * 86400000).toISOString().split('T')[0];
      const fixtures = await footballApi.getFixturesByDate(date);
      const leagueFixtures = fixtures.filter(f => f.league.id === leagueId);

      if (leagueFixtures.length > 0) {
        const dayLabel = i === 0 ? 'today' : i === 1 ? 'tomorrow' : date;
        return buildLeagueContext(leagueFixtures, `${keyword} fixtures for ${dayLabel}`);
      }
    }

    return `No ${keyword} fixtures found in the next 7 days.`;
  } catch (e) {
    console.error('League enrichment failed:', e);
    return null;
  }
}

function buildLeagueContext(fixtures, title) {
  const parts = [`${title} (${fixtures.length} matches):`];
  parts.push('');

  for (const f of fixtures) {
    const time = new Date(f.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const status = f.fixture.status.short;
    let line = `${time} | ${f.teams.home.name} vs ${f.teams.away.name}`;
    if (['1H', '2H', 'HT', 'ET'].includes(status)) {
      line += ` [LIVE ${f.goals.home}-${f.goals.away}, ${f.fixture.status.elapsed}']`;
    } else if (status === 'FT') {
      line += ` [FT ${f.goals.home}-${f.goals.away}]`;
    }
    parts.push(line);
  }

  return parts.join('\n');
}

/**
 * Fetch live matches overview.
 */
async function enrichLiveMatches() {
  try {
    const live = await footballApi.getLiveFixtures();
    if (!live?.length) return 'No live matches right now.';

    const parts = [`Live matches right now (${live.length} total):`];
    parts.push('');

    const byLeague = {};
    for (const f of live) {
      const league = f.league.name;
      if (!byLeague[league]) byLeague[league] = [];
      byLeague[league].push(f);
    }

    for (const [league, matches] of Object.entries(byLeague)) {
      parts.push(`--- ${league} ---`);
      for (const f of matches) {
        const elapsed = f.fixture.status.elapsed;
        const statusShort = f.fixture.status.short;
        let timeStr = `${elapsed}'`;
        if (statusShort === 'HT') timeStr = 'HT';

        parts.push(`${timeStr} | ${f.teams.home.name} ${f.goals.home} - ${f.goals.away} ${f.teams.away.name}`);
      }
      parts.push('');
    }

    return parts.join('\n');
  } catch (e) {
    console.error('Live enrichment failed:', e);
    return null;
  }
}

export default { enrichMessage };
