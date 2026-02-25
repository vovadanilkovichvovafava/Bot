# Fonbet API — Полная инструкция для разработчика

> Дата: 23 февраля 2026
> Все файлы уже в монорепо, backend подключён, frontend клиент написан.

---

## 1. Что это и зачем

Мы добавили **прямой доступ к данным Fonbet** — реальные коэффициенты, live-счета, deeplinks на конкретные матчи. Это нужно для:

- **Кнопки "Ставить на Fonbet"** с deeplink прямо на матч (сейчас ведём на `/promo` → общая ссылка)
- **Показ реальных odds Fonbet** рядом с нашими AI predictions
- **Live-счета** прямо в приложении
- **Schedina del Giorno** — авто-генерация экспресса из реальных коэффициентов
- **AI Chat** может отвечать с реальными odds: "Milan vs Inter: 1X2 = 2.15 / 3.40 / 3.25"
- **Value Finder** — сравнение наших odds (API-Football) vs Fonbet odds

---

## 2. Архитектура — как это работает

```
┌───────────────────────────────────────────────────────────────────┐
│  Юзер (Италия / Польша / Германия — любое гео)                  │
│  Открывает PWA → фронт дёргает НАШ backend                      │
└───────────────┬───────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────────┐
│  Наш Backend (FastAPI на Railway)                                │
│  https://pwa-production-20b5.up.railway.app/api/v1/fonbet/*      │
│                                                                   │
│  Кеш: 2 мин (pre-match), 30 сек (live)                          │
│  Если кеш свежий → отдаёт мгновенно                             │
│  Если кеш протух → идёт к iframe-proxy ↓                        │
└───────────────┬───────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────────┐
│  iframe-proxy-poc (Node.js на Railway, уже задеплоен)            │
│  https://iframe-proxy-poc-production.up.railway.app              │
│                                                                   │
│  Проксирует запросы к Fonbet через итальянский IP                │
│  Использует NodeMaven residential proxy (gate.nodemaven.com)     │
└───────────────┬───────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────────┐
│  Fonbet API (внутренний, без авторизации для чтения линии)       │
│  line11.fm41d5-resources.com/events/list                         │
│                                                                   │
│  Geo-blocked: пропускает только итальянские IP                   │
│  Один GET → ~8.2 MB JSON → 8800 событий + odds + live           │
└───────────────────────────────────────────────────────────────────┘
```

**Ключевое:**
- Фронтенд **НЕ ходит к Fonbet напрямую** — всё через наш backend
- Гео-блок решается на уровне прокси — юзерам в Польше/Германии пофиг
- Один запрос к Fonbet возвращает ВСЕ матчи (8800 штук), бэкенд фильтрует нужное

---

## 3. Файлы в репозитории

| Файл | Строк | Описание |
|------|-------|----------|
| `backend/app/services/fonbet_api.py` | ~500 | Сервис: запрос к Fonbet, парсинг, кеш, matching по командам, deeplinks |
| `backend/app/api/fonbet.py` | ~120 | FastAPI роуты (7 endpoints) |
| `backend/app/main.py` | — | Роут подключён: `app.include_router(fonbet.router, prefix="/api/v1/fonbet")` |
| `web/src/services/fonbetApi.js` | ~220 | Frontend клиент: запросы к нашему backend + форматирование + schedina |

**Зависимости:** `httpx`, `aiohttp` — уже в `requirements.txt`. Новых зависимостей нет.

---

## 4. API Endpoints (наш backend)

Базовый URL: `https://pwa-production-20b5.up.railway.app/api/v1/fonbet`

---

### 4.1 `GET /football?lang=en`

Все футбольные матчи (~3000) с коэффициентами и deeplinks.

**Response:**
```json
{
  "events": [
    {
      "id": 62510832,
      "team1": "Augsburg",
      "team2": "Köln",
      "sport_id": 11916,
      "tournament_name": "Bundesliga",
      "tournament_code": "BL1",
      "start_timestamp": 1772220600,
      "is_live": false,
      "live_info": null,
      "odds": {
        "1": 2.3,
        "X": 3.4,
        "2": 3.05,
        "1X": 1.75,
        "12": 1.25,
        "X2": 1.60,
        "over_2.5": 1.75,
        "under_2.5": 2.07,
        "btts_yes": 1.32,
        "btts_no": 3.25,
        "handicap_1": 2.70,
        "handicap_2": 1.40,
        "over_1.5": 1.15,
        "under_1.5": 5.50
      },
      "deeplink": "https://fonbet001.com/sports/football/11916/62510832",
      "total_markets": 727
    }
  ],
  "total": 3034,
  "live_count": 132
}
```

---

### 4.2 `GET /live?lang=en`

Только live матчи + текущий счёт + минута + периоды.

**Response:**
```json
{
  "events": [
    {
      "id": 62613600,
      "team1": "Napoli",
      "team2": "Juventus",
      "sport_id": 11960,
      "tournament_name": "Serie A",
      "is_live": true,
      "live_info": {
        "timer": "67:23",
        "timer_seconds": 4043,
        "score_home": 2,
        "score_away": 1,
        "period": "2nd half",
        "periods": [
          {"name": "1st half", "home": 1, "away": 1},
          {"name": "2nd half", "home": 1, "away": 0}
        ]
      },
      "odds": {
        "1": 1.35,
        "X": 5.50,
        "2": 8.00,
        "over_2.5": 1.10,
        "under_2.5": 6.50
      },
      "deeplink": "https://fonbet001.com/sports/football/11960/62613600",
      "total_markets": 45
    }
  ],
  "total": 132,
  "live_count": 132
}
```

---

### 4.3 `GET /top-leagues?lang=en`

Только матчи из: Serie A, Premier League, Bundesliga, La Liga, Ligue 1, Champions League, Europa League, Ekstraklasa.

Формат ответа такой же как `/football`.

---

### 4.4 `GET /serie-a`

Только Serie A (основной рынок, 78% юзеров — итальянцы).

---

### 4.5 `GET /event/{event_id}?lang=en`

Детали одного события со всеми рынками.

---

### 4.6 `POST /find-match`

Найти матч Fonbet по названиям команд. **Это ключевой endpoint для связи API-Football ↔ Fonbet** (подробнее в секции 6).

**Request:**
```json
{
  "home_team": "AC Milan",
  "away_team": "Inter",
  "match_date": "2026-03-01"
}
```

**Response (200):** Fonbet event с odds + deeplink
**Response (404):** Матч не найден

---

### 4.7 `GET /deeplink/{tournament_id}/{event_id}`

Генерация deeplink без запроса к Fonbet (мгновенно).

**Response:**
```json
{
  "deeplink": "https://fonbet001.com/sports/football/11960/62510832",
  "proxy_url": "https://iframe-proxy-poc-production.up.railway.app/fonbet/sports/football/11960/62510832"
}
```

- `deeplink` — прямая ссылка на Fonbet (юзер уйдёт из приложения)
- `proxy_url` — через наш прокси (можно показать в iframe/webview)

---

### 4.8 `GET /cache-stats`

Статистика серверного кеша (для дебага).

---

## 5. Raw Fonbet API — для проверки

Если нужно проверить сырые данные Fonbet напрямую (минуя наш backend):

```bash
# Через наш прокси (работает с любого гео):
curl "https://iframe-proxy-poc-production.up.railway.app/fline2/events/list?lang=en&version=0&scopeMarket=3100"

# Ответ: 200 OK, ~8.2 MB JSON
# Содержит: events[], customFactors[], liveEventInfos[], sports[], tournamentInfos[]
```

**Что внутри JSON (проверено 23.02.2026):**

| Поле | Кол-во | Описание |
|------|--------|----------|
| `events` | ~8800 | Все события всех видов спорта |
| `customFactors` | ~8700 | Коэффициенты (вложенная структура!) |
| `liveEventInfos` | ~130 | Live: счёт, таймер, периоды |
| `sports` | ~660 | Дерево турниров |

**Структура одного события:**
```json
{
  "id": 62510832,        // ← ID для deeplink
  "team1": "Augsburg",
  "team2": "Köln",
  "sportId": 11916,      // ← ID турнира (НЕ вида спорта!)
  "rootKind": 1,         // ← 1=football, 2=hockey, 3=basketball
  "level": 1,            // ← 1=матч, 0=турнирный узел
  "place": "line",       // ← "line"=pre-match, "live"=live
  "startTime": 1772220600
}
```

**Структура коэффициентов (ВАЖНО — вложенные!):**
```json
{
  "e": 62510832,         // ← eventId
  "countAll": 727,       // ← общее кол-во рынков
  "factors": [
    {"f": 921, "v": 2.30},              // Home Win
    {"f": 922, "v": 3.40},              // Draw
    {"f": 923, "v": 3.05},              // Away Win
    {"f": 930, "v": 1.75, "pt": "2.5"}, // Over 2.5
    {"f": 931, "v": 2.07, "pt": "2.5"}, // Under 2.5
    {"f": 1571, "v": 1.32},             // BTTS Yes
    {"f": 1572, "v": 3.25}              // BTTS No
  ]
}
```

**Маппинг Factor ID → Рынок:**

| Factor ID | Рынок | Исход |
|-----------|-------|-------|
| 921 | 1X2 | Home Win (1) |
| 922 | 1X2 | Draw (X) |
| 923 | 1X2 | Away Win (2) |
| 924, 925, 926 | Double Chance | 1X, 12, X2 |
| 927, 928 | Handicap | Home, Away (поле `pt` = параметр) |
| 930, 931 | Total | Over, Under (поле `pt` = "2.5", "1.5", "3.5"...) |
| 1571, 1572 | BTTS | Yes, No |
| 937, 938, 939 | 1X2 HT | 1st half Home/Draw/Away |
| 940, 941 | Total HT | 1st half Over/Under |

---

## 6. Связь с API-Football — ГЛАВНОЕ ДЛЯ ИНТЕГРАЦИИ

Сейчас приложение получает матчи из **API-Football** (`/api/v1/football/*`). Fonbet — это **второй источник данных**. Вот как их связать:

### 6.1 Сценарий: Показать кнопку "Ставить на Fonbet" на странице матча

**Сейчас** (MatchDetail.jsx):
- Юзер открывает `/match/{fixtureId}` (это ID из API-Football)
- Видит AI analysis, odds из API-Football, кнопки "1/X/2"
- Кнопки ведут на `/promo?banner=match_odds_home` → общая ссылка на бука

**Как должно быть:**
- Юзер открывает `/match/{fixtureId}`
- Берём team1, team2, дату из API-Football fixture
- Вызываем `POST /api/v1/fonbet/find-match` с этими данными
- Получаем Fonbet event → **deeplink на конкретный матч на Fonbet**
- Кнопка "Ставить на Fonbet" ведёт на `https://fonbet001.com/sports/football/11960/62510832`

**Код (frontend):**
```javascript
import fonbetApi from '@/services/fonbetApi';

// В MatchDetail.jsx после загрузки fixture из API-Football:
const fixture = await footballApi.getFixture(fixtureId);

// Ищем этот же матч на Fonbet:
const fonbetMatch = await fonbetApi.findMatch(
  fixture.teams.home.name,   // "AC Milan"
  fixture.teams.away.name,   // "Inter"
  fixture.fixture.date        // "2026-03-01T20:45:00+00:00"
);

if (fonbetMatch) {
  // Есть deeplink! Показываем кнопку:
  // fonbetMatch.deeplink = "https://fonbet001.com/sports/football/11960/62510832"
  // fonbetMatch.odds = { "1": 2.15, "X": 3.40, "2": 3.25, ... }
}
```

### 6.2 Сценарий: Показать РЕАЛЬНЫЕ odds Fonbet рядом с AI prediction

**Сейчас:**
- AI prediction говорит "Home Win, confidence 72%"
- Odds берутся из API-Football (не всегда есть, обновляются редко)

**Как должно быть:**
- AI prediction: "Home Win, confidence 72%"
- **Рядом:** реальные odds Fonbet: `1 = 2.15` (обновляются каждые 2 мин)
- Кнопка "Поставить 2.15 на Home Win" → deeplink на матч

**Код:**
```javascript
// fonbetMatch из предыдущего примера
const formatted = fonbetApi.formatOdds(fonbetMatch.odds);
// formatted = {
//   main: [{label: "1", value: 2.15}, {label: "X", value: 3.40}, {label: "2", value: 3.25}],
//   totals: [{label: "O2.5", value: 1.85}, {label: "U2.5", value: 1.95}],
//   btts: [{label: "Yes", value: 1.72}, {label: "No", value: 2.10}]
// }
```

### 6.3 Сценарий: Показать odds кнопки 1/X/2 на Matches page

**Сейчас:** FixtureCard в Matches.jsx показывает только команды и время.

**Как добавить odds:**
```javascript
// В Matches.jsx при загрузке:
const fonbetData = await fonbetApi.getTopLeaguesEvents('en');

// Создаём map для быстрого поиска:
const fonbetMap = {};
fonbetData.events.forEach(ev => {
  // Ключ: нормализованные имена команд
  const key = `${ev.team1.toLowerCase()}_${ev.team2.toLowerCase()}`;
  fonbetMap[key] = ev;
});

// В FixtureCard:
// Ищем matching по team1+team2
// Если нашли → показываем odds.1 / odds.X / odds.2 рядом с матчем
```

### 6.4 Сценарий: AI Chat отвечает с реальными odds

**Сейчас:** chatEnrichment.js обогащает промпт данными из API-Football.

**Как добавить Fonbet odds:**
```javascript
// В chatEnrichment.js, в функции enrichMessage():
// Если юзер спрашивает про конкретный матч:
const fonbetMatch = await fonbetApi.findMatch(homeTeam, awayTeam);
if (fonbetMatch) {
  enrichedContext += `\nFonbet odds: 1=${fonbetMatch.odds['1']}, X=${fonbetMatch.odds['X']}, 2=${fonbetMatch.odds['2']}`;
  enrichedContext += `\nBTTS: Yes=${fonbetMatch.odds['btts_yes']}, No=${fonbetMatch.odds['btts_no']}`;
  enrichedContext += `\nDeeplink: ${fonbetMatch.deeplink}`;
}
// Claude увидит реальные odds и сможет рекомендовать с deeplink
```

### 6.5 Сценарий: Schedina del Giorno (экспресс дня)

**Новая фича — авто-генерация экспресса:**
```javascript
// Вызвать один метод:
const schedina = await fonbetApi.getDailySchedina('it');

// Ответ:
// {
//   selections: [
//     { team1: "Napoli", team2: "Lecce", selection: "1", selectionOdds: 1.35, deeplink: "..." },
//     { team1: "Milan", team2: "Monza", selection: "1", selectionOdds: 1.50, deeplink: "..." },
//     { team1: "Real Madrid", team2: "Getafe", selection: "1", selectionOdds: 1.40, deeplink: "..." },
//     ... (до 7 матчей)
//   ],
//   accumulatorOdds: 8.56,  // общий коэффициент экспресса
//   count: 5
// }
```

Логика отбора: топ-лиги, сегодня/завтра, odds 1.30-3.50 (не слишком рискованные).

### 6.6 Сценарий: Value Finder (сравнение odds)

На странице ValueFinder.jsx:
```javascript
// Берём odds из API-Football:
const apiOdds = await footballApi.getOdds(fixtureId);

// Берём odds из Fonbet:
const fonbetMatch = await fonbetApi.findMatch(homeTeam, awayTeam);

// Сравниваем:
// Если API-Football даёт Home Win = 2.30, а Fonbet = 2.50
// → Fonbet переплачивает, это value bet!
// Показываем: "Fonbet даёт 2.50 на Home Win (у других 2.30) — value!"
```

---

## 7. Маппинг турниров: Fonbet sportId ↔ API-Football league_id

| Fonbet sportId | API-Football league_id | Лига | Код |
|---------------|----------------------|------|-----|
| 11960 | 135 | Serie A | SA |
| 11918 | 39 | Premier League | PL |
| 11916 | 78 | Bundesliga | BL1 |
| 11906 | 140 | La Liga | PD |
| 11962 | 61 | Ligue 1 | FL1 |
| 11914 | 2 | Champions League | CL |
| 11915 | 3 | Europa League | EL |
| 12028 | 106 | Ekstraklasa | EKS |
| 12112 | 136 | Serie B | SB |
| 11919 | 40 | Championship | ELC |

---

## 8. Deeplink формат

```
https://fonbet001.com/sports/football/{tournamentId}/{eventId}
```

**Примеры:**
```
Serie A матч:       https://fonbet001.com/sports/football/11960/62510832
Bundesliga матч:    https://fonbet001.com/sports/football/11916/62510833
Champions League:   https://fonbet001.com/sports/football/11914/62510834
```

**Что происходит по клику:**
- Юзер переходит на сайт Fonbet
- Открывается **конкретный матч** с раскрытыми рынками
- Юзер может сразу поставить (если авторизован на Fonbet)

**Альтернатива через наш прокси (для iframe/webview):**
```
https://iframe-proxy-poc-production.up.railway.app/fonbet/sports/football/{tournamentId}/{eventId}
```

---

## 9. Frontend клиент — fonbetApi.js

Файл: `web/src/services/fonbetApi.js`

**Полный список методов:**

| Метод | Параметры | Возвращает | Кеш |
|-------|-----------|------------|-----|
| `getFootballEvents(lang)` | `lang`: en/it/de/pl | `{events, total, live_count}` | 2 мин |
| `getTopLeaguesEvents(lang)` | `lang` | `{events, total}` | 2 мин |
| `getSerieAEvents()` | — | `{events, total}` | 2 мин |
| `getEventDetail(eventId, lang)` | `eventId`, `lang` | event object | нет |
| `findMatch(home, away, date)` | team names, ISO date | event или null | нет |
| `generateDeeplink(tournamentId, eventId)` | IDs | URL string | — (локально) |
| `generateProxyDeeplink(tournamentId, eventId)` | IDs | URL string | — (локально) |
| `formatOdds(odds)` | odds object | `{main, totals, btts}` | — |
| `getDailySchedina(lang)` | `lang` | `{selections, accumulatorOdds, count}` | нет |
| `clearCache()` | — | void | — |

**Импорт:**
```javascript
import fonbetApi from '../services/fonbetApi';
// или
import { FonbetApi } from '../services/fonbetApi';
```

---

## 10. Формат odds в ответе

Наш backend конвертирует Fonbet Factor IDs в читаемый формат:

```json
{
  "1": 2.30,           // Home Win (factor 921)
  "X": 3.40,           // Draw (factor 922)
  "2": 3.05,           // Away Win (factor 923)
  "1X": 1.75,          // Home or Draw (factor 924)
  "12": 1.25,          // Home or Away (factor 925)
  "X2": 1.60,          // Draw or Away (factor 926)
  "over_2.5": 1.75,    // Over 2.5 goals (factor 930, pt="2.5")
  "under_2.5": 2.07,   // Under 2.5 goals (factor 931, pt="2.5")
  "over_1.5": 1.15,    // Over 1.5 goals
  "under_1.5": 5.50,   // Under 1.5 goals
  "btts_yes": 1.32,    // Both Teams To Score (factor 1571)
  "btts_no": 3.25,     // No BTTS (factor 1572)
  "handicap_1": 2.70,  // Handicap Home (factor 927)
  "handicap_2": 1.40,  // Handicap Away (factor 928)
  "ht_1": 3.50,        // 1st Half Home Win (factor 937)
  "ht_X": 2.10,        // 1st Half Draw (factor 938)
  "ht_2": 3.80         // 1st Half Away Win (factor 939)
}
```

**Для UI используй `formatOdds()`:**
```javascript
const formatted = fonbetApi.formatOdds(event.odds);

// formatted.main = [
//   {label: "1", value: 2.30},
//   {label: "X", value: 3.40},
//   {label: "2", value: 3.05}
// ]

// formatted.totals = [
//   {label: "O2.5", value: 1.75},
//   {label: "U2.5", value: 2.07}
// ]

// formatted.btts = [
//   {label: "Yes", value: 1.32},
//   {label: "No", value: 3.25}
// ]
```

---

## 11. Что где менять в существующем коде

### MatchDetail.jsx — Добавить deeplink + real odds
```
Сейчас:  onClick={() => navigate('/promo?banner=match_odds_home')}
Надо:    onClick={() => window.open(fonbetMatch.deeplink)}
```

### Matches.jsx — Показать odds 1/X/2 на карточках матчей
- Загрузить `fonbetApi.getTopLeaguesEvents()` при маунте
- Матчить по team1+team2 с fixtures из API-Football
- Показать кнопки с коэффициентами на FixtureCard

### AIChat.jsx — Обогатить контекст реальными odds
- В chatEnrichment.js добавить вызов `fonbetApi.findMatch()`
- Claude получит реальные odds и deeplink → ответит с ними

### ValueFinder.jsx — Сравнить odds
- Рядом с каждым fixture показать odds из Fonbet
- Выделить value bets (где Fonbet даёт больше чем API-Football)

### BookmakerPromo.jsx — Заменить общую ссылку на deeplink
- Если есть конкретный матч → deeplink на него
- Если нет → оставить как есть (общая партнёрская ссылка)

### LiveMatchDetail.jsx — Показать live-счёт из Fonbet
- Загрузить `fonbetApi.getFootballEvents()` → найти live match
- Показать timer, score, odds в реальном времени

---

## 12. ENV переменные

### Backend (в Railway уже настроено или дефолт в коде):

| Переменная | Значение | Нужно добавить? |
|-----------|----------|----------------|
| `FONBET_PROXY_URL` | `https://iframe-proxy-poc-production.up.railway.app` | Нет, дефолт в коде |
| `NODEMAVEN_USER` | `igorseglov60_gmail_com-country-it-ipv4-true` | Нет, дефолт в коде |
| `NODEMAVEN_PASS` | `i2x07zuhsl` | Нет, дефолт в коде |
| `NODEMAVEN_GATE` | `gate.nodemaven.com:8080` | Нет, дефолт в коде |

**Новых зависимостей НЕТ** — `httpx` и `aiohttp` уже в requirements.txt.

---

## 13. Кеширование

### Backend (Python, в памяти):

| Данные | TTL | Когда обновляется |
|--------|-----|-------------------|
| events_list (сырой ответ Fonbet 8MB) | 120 сек | Каждые 2 мин при запросе |
| football_events (парсенный) | 120 сек | Вместе с events_list |
| live_football | 30 сек | Каждые 30 сек при запросе live |
| event_detail | 60 сек | При запросе конкретного матча |
| top_leagues / serie_a | 120 сек | Вместе с events_list |

### Frontend (JS, Map):
| Данные | TTL |
|--------|-----|
| Все ответы fonbetApi | 120 сек (client-side) |
| Max entries | 50 (потом удаляет старые) |

---

## 14. Проверка что всё работает

```bash
# 1. Проверить что iframe-proxy жив:
curl -s -o /dev/null -w "%{http_code}" "https://iframe-proxy-poc-production.up.railway.app/fline2/events/list?lang=en&version=0&scopeMarket=3100"
# Ожидаемый ответ: 200

# 2. После деплоя backend — проверить наш API:
curl "https://pwa-production-20b5.up.railway.app/api/v1/fonbet/football?lang=en" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Events: {d[\"total\"]}, Live: {d[\"live_count\"]}')"
# Ожидаемый ответ: Events: ~3000, Live: ~100-200

# 3. Проверить find-match:
curl -X POST "https://pwa-production-20b5.up.railway.app/api/v1/fonbet/find-match" \
  -H "Content-Type: application/json" \
  -d '{"home_team": "AC Milan", "away_team": "Inter"}'
# Ожидаемый ответ: JSON с deeplink и odds (или 404 если матча нет в линии)

# 4. Проверить deeplink:
curl "https://pwa-production-20b5.up.railway.app/api/v1/fonbet/deeplink/11960/62510832"
# Ожидаемый ответ: {"deeplink": "https://fonbet001.com/sports/football/11960/62510832", "proxy_url": "..."}
```

---

## 15. Troubleshooting

| Проблема | Причина | Решение |
|----------|---------|---------|
| 502 от iframe-proxy | Прокси спит (Railway cold start) | Подождать 10-15 сек, повторить |
| Пустой ответ (events: []) | NodeMaven IP сменился или заблокирован | Проверить логи iframe-proxy |
| Первый запрос ~8 сек | Нормально — 8 MB JSON через прокси | Второй запрос из кеша — мгновенно |
| find-match возвращает null | Нет такого матча в линии Fonbet | Матч ещё не выставлен или уже закончился |
| Odds = {} (пустые) | Fonbet убрал рынки (матч скоро/идёт) | Нормально для некоторых матчей |
| live_info = null | Матч не live | Нормально для pre-match |

---

## 16. Что НЕ делает Fonbet API

- ❌ **Не размещает ставки** — только читает линию (odds + events)
- ❌ **Не авторизует юзера** — для ставок юзер должен сам зайти на Fonbet
- ❌ **Не работает без прокси** — Fonbet блокирует не-итальянские IP
- ❌ **Не даёт исторические данные** — только текущая линия

---

## Итого: минимальный план для разработчика

1. ✅ Backend код уже в репо и подключён в main.py
2. ✅ Frontend клиент fonbetApi.js уже в репо
3. **Задеплоить backend** → проверить `/api/v1/fonbet/football`
4. **В MatchDetail.jsx**: вызвать `fonbetApi.findMatch()` → показать deeplink кнопку
5. **В Matches.jsx**: загрузить `fonbetApi.getTopLeaguesEvents()` → показать odds на карточках
6. **Заменить** `navigate('/promo?banner=...')` на `window.open(deeplink)` где есть Fonbet матч
