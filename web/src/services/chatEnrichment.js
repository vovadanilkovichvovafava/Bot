/**
 * Chat Enrichment Service
 * Detects match-related queries and fetches real-time data from API-Football
 * to provide Claude with actual statistics instead of guessing.
 */
import footballApi from '../api/footballApi';

// Football seasons start in August — before August, current season = lastYear
function getCurrentSeason() {
  const now = new Date();
  return now.getMonth() < 7 ? now.getFullYear() - 1 : now.getFullYear();
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

  // World Cup (ID: 1)
  'world cup': 1, 'чемпионат мира': 1, 'мундиаль': 1, 'copa del mundo': 1,
  'coupe du monde': 1, 'weltmeisterschaft': 1, 'dünya kupası': 1,
  'كأس العالم': 1, '世界杯': 1, 'ワールドカップ': 1, '월드컵': 1,

  // Euro (ID: 4)
  'euro': 4, 'european championship': 4, 'чемпионат европы': 4, 'евро': 4,
  'eurocopa': 4, 'europameisterschaft': 4, 'avrupa şampiyonası': 4,
  'كأس أوروبا': 4, '欧洲杯': 4, 'ユーロ': 4,
};

// Match query patterns — with "vs" separator (multilingual)
const MATCH_PATTERNS_VS = [
  /(.+?)\s+(?:vs\.?|versus|against|v\.?|—|contra|contre|gegen|tegen|karşı)\s+(.+)/i,
  /(?:матч|match|game|predict|analyse|analyze|прогноз|анализ|partita|partido|pronostic|pronostico|maç|mecz|jogo|مباراة|मैच|比赛)\s+(.+?)\s+(?:vs\.?|v\.?|—|contra|contre|gegen|karşı)\s+(.+)/i,
];

// Well-known team names for detection without "vs" separator
const KNOWN_TEAMS = [
  'manchester united', 'man united', 'man utd', 'манчестер юнайтед', 'ман юнайтед',
  'manchester city', 'man city', 'манчестер сити', 'ман сити',
  'arsenal', 'арсенал',
  'chelsea', 'челси',
  'liverpool', 'ливерпуль',
  'tottenham', 'tottenham hotspur', 'spurs', 'тоттенхем', 'тоттенхэм', 'тотнем',
  'newcastle', 'newcastle united', 'ньюкасл',
  'aston villa', 'астон вилла',
  'west ham', 'вест хэм', 'вест хам',
  'brighton', 'брайтон',
  'crystal palace', 'кристал пэлас',
  'everton', 'эвертон',
  'fulham', 'фулхэм', 'фулхем',
  'wolves', 'wolverhampton', 'вулверхэмптон',
  'bournemouth', 'борнмут',
  'nottingham forest', 'ноттингем',
  'brentford', 'брентфорд',
  'burnley', 'бёрнли',
  'luton', 'лутон',
  'sheffield united', 'шеффилд',
  'real madrid', 'реал мадрид', 'реал',
  'barcelona', 'барселона', 'барса',
  'atletico madrid', 'атлетико',
  'sevilla', 'севилья',
  'real sociedad', 'сосьедад',
  'villarreal', 'вильярреал',
  'athletic bilbao', 'атлетик бильбао',
  'real betis', 'бетис',
  'valencia', 'валенсия',
  'bayern munich', 'bayern', 'бавария',
  'borussia dortmund', 'dortmund', 'дортмунд', 'боруссия',
  'rb leipzig', 'лейпциг',
  'bayer leverkusen', 'leverkusen', 'леверкузен',
  'juventus', 'ювентус',
  'inter milan', 'inter', 'интер',
  'ac milan', 'milan', 'милан',
  'napoli', 'наполи',
  'roma', 'рома',
  'lazio', 'лацио',
  'atalanta', 'аталанта',
  'fiorentina', 'фиорентина',
  'psg', 'paris saint-germain', 'paris saint germain', 'пари сен-жермен', 'псж',
  'marseille', 'марсель',
  'lyon', 'лион',
  'monaco', 'монако',
  'lille', 'лилль',
  'benfica', 'бенфика',
  'porto', 'порту',
  'sporting', 'спортинг',
  'ajax', 'аякс',
  'psv', 'псв',
  'feyenoord', 'фейеноорд',
  'galatasaray', 'галатасарай',
  'fenerbahce', 'фенербахче',
  'besiktas', 'бешикташ',
  'celtic', 'селтик',
  'rangers', 'рейнджерс',
  'zenit', 'зенит',
  'spartak', 'спартак',
  'cska', 'цска',
  'dynamo', 'динамо',
  'shakhtar', 'шахтёр', 'шахтер',
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
    .replace(/^(матч|match|game|predict|прогноз|анализ|ставка|ставку|bet on)\s+/i, '')
    .replace(/\s+(какую|какой|ставку|ставка|прогноз|prediction|bet|odds|коэффициент|кеф).*$/i, '')
    .trim();
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
        const season = getCurrentSeason();
        const fixtures = await footballApi.getFixturesByTeam(teamId, season, 10);
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
    const season = getCurrentSeason();
    const fixtures = await footballApi.getFixturesByTeam(teamId, season, 5);
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
