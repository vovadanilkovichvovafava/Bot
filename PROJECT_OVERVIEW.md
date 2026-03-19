# AI Betting Bot (PreScoreAI) — Полный обзор проекта

## Архитектура

```
Bot/
├── backend/          # Python FastAPI — основной API
├── web/              # React PWA — клиентское приложение
├── admin/            # React — панель администратора
├── mobile_app/       # Flutter — Android приложение
├── server/           # Node.js Express — affiliate/postback сервер
├── plan.md           # План миграции на runtime config
└── pro-access.html   # Статичная промо-страница
```

**Деплой**: Railway (PostgreSQL async, Docker-контейнеры)
**Домены**: prescoreai.com, sportscoreai.com и др.

---

## Backend API (`/backend/app/`)

### Аутентификация (`api/auth.py`)
| Эндпоинт | Метод | Описание |
|-----------|-------|----------|
| `/register` | POST | Регистрация (телефон + пароль), реферальная привязка, UTM-трекинг |
| `/login` | POST | Вход → JWT access + refresh токены |
| `/refresh` | POST | Обновление access token (дедупликация параллельных запросов) |
| `/reset-password` | POST | Сброс пароля (через внутренний секрет) |
| `/logout` | POST | Очистка cookies |
| `/check-ip` | GET | Лимит регистраций по IP (макс 5) |

### Пользователи (`api/users.py`)
| Эндпоинт | Метод | Описание |
|-----------|-------|----------|
| `/me` | GET | Профиль + проверка premium |
| `/me` | PATCH | Обновление настроек (язык, таймзона, odds, risk) |
| `/me/predictions` | GET/PUT | Синхронизация предсказаний с клиента |
| `/{user_id}/premium` | POST | Активация premium через постбэк |
| `/me/referral` | GET | Реферальный код и статистика |

### AI Предсказания (`api/predictions.py`)
| Эндпоинт | Метод | Описание |
|-----------|-------|----------|
| `/chat/limit` | GET | Дегрессивный лимит AI-чата (3→2→1 в день) |
| `/chat` | POST | AI-чат с Claude (1 запрос = 1 токен/день) |
| `/chat/history` | GET | История сессий чата |
| `/chat/reanalyze` | POST | Свежий анализ (новая сессия) |
| `/save` | POST | Сохранение прогноза в БД |
| `/saved` | GET | Список сохранённых прогнозов |
| `/stats` | GET | Статистика точности |
| `/learning-context` | GET | ML-данные для обогащения промптов |
| `/verified-recent` | GET | Недавно верифицированные прогнозы |

### ML Pipeline
| Эндпоинт | Метод | Описание |
|-----------|-------|----------|
| `/ml/{fixture_id}` | GET | ML-предсказание для матча |
| `/ml/recommend/{fixture_id}` | GET | Лучшая рекомендация от ML |
| `/ml/batch-predict` | POST | Пакетное предсказание |
| `/ml/dashboard` | GET | Статус ML-пайплайна |
| `/ml/roi/{period}` | GET | ROI по периодам (daily/weekly/monthly) |

### Матчи (`api/matches.py` + `api/football.py`)
| Эндпоинт | Метод | Описание |
|-----------|-------|----------|
| `/today`, `/tomorrow`, `/upcoming` | GET | Матчи по датам |
| `/upcoming/paginated` | GET | Пагинированный список матчей |
| `/leagues` | GET | Доступные лиги |
| `/standings/{league}` | GET | Турнирная таблица |
| `/{match_id}` | GET | Детали матча с H2H |
| `/fixtures/{id}/statistics` | GET | Статистика матча |
| `/fixtures/{id}/events` | GET | Голы, карточки, замены |
| `/fixtures/{id}/lineups` | GET | Составы команд |
| `/fixtures/{id}/enriched` | GET | Все данные матча (enriched) |
| `/fixtures/{id}/prediction` | GET | AI-предсказание |

### Остальные API
| Модуль | Описание |
|--------|----------|
| Express (`api/express.py`) | Генерация парлей-ставок (ML + AI) |
| Community Picks (`api/community_picks.py`) | Голосование за исходы |
| Match Chat (`api/match_chat.py`) | Обсуждение матчей в реальном времени |
| Support (`api/support.py`) | AI-поддержка (Claude), обнаружение инъекций |
| Analytics (`api/analytics.py`) | Fire-and-forget события, клики по баннерам |
| Admin Auth (`api/admin_auth.py`) | Отдельная JWT-аутентификация для админов |
| Admin Stats (`api/admin_stats.py`) | Дашборд: пользователи, трафик, финансы, ML |
| Postbacks (`api/postbacks.py`) | Логи аффилиатных постбэков |

---

## Backend Services

| Сервис | Файл | Назначение |
|--------|------|------------|
| **ML Predictor** | `ml_predictor.py` | Предсказания по всем рынкам (1x2, тоталы, BTTS, угловые, карточки). Кэш 6ч |
| **ML Trainer** | `ml_trainer.py` | Обучение XGBoost/LightGBM. Ежедневный/еженедельный цикл |
| **Feature Engineer** | `feature_engineer.py` | 100+ фичей: Elo, форма, H2H, травмы, погода |
| **Data Collector** | `data_collector.py` | Сбор данных каждый час |
| **Prediction Verifier** | `prediction_verifier.py` | Верификация прогнозов каждые 2 часа |
| **Match Analyzer** | `match_analyzer.py` | Анализ с Claude AI, in-memory кэш 24ч (500 матчей) |
| **ML Monitor** | `ml_monitor.py` | Мониторинг моделей, обнаружение паттернов ошибок |
| **API Football** | `api_football.py` | Клиент api-sports.io (основной) |
| **Football API** | `football_api.py` | Клиент football-data.org (fallback) |
| **Fonbet API** | `fonbet_api.py` | Интеграция с Fonbet |
| **Express Generator** | `express_generator.py` | Генерация экспресс-ставок |

---

## Backend Models

| Модель | Ключевые поля |
|--------|---------------|
| **User** | `public_id`, `phone`, `email`, `is_premium`, `premium_until`, `funnel`, `utm_*`, `referral_code`, `daily_limits`, `country`, `traffic_source` |
| **Prediction** | `match_id`, `bet_type`, `confidence`, `predicted_odds`, `ai_analysis`, `is_correct`, `verified_at` |
| **MatchFeature** | 100+ ML-фичей (Elo, форма, позиция, H2H, коэффициенты, погода, травмы) + результат |
| **EloRating** | Рейтинг команды по лиге (K=20 established, K=40 new) |
| **MLModel** | Версия модели, тип рынка, метрики точности |
| **ExpressBet** | Мульти-матч парлеи с общим коэффициентом |
| **AIChatMessage** | AI-чат с историей сессий |
| **SupportChatMessage** | Чат поддержки |
| **CommunityPick** | Голоса сообщества |
| **MatchChatMessage** | Обсуждение матчей |
| **PostbackLog** | Логи аффилиатных постбэков |
| **BannerClick** | Аналитика кликов |
| **CachedPrediction** | ML кэш (TTL 6ч) |
| **ROIAnalytics** | Метрики ROI по периодам |
| **ConfidenceCalibration** | Калибровка вероятностей |
| **FeatureErrorPattern** | Паттерны ошибок модели |
| **LearningPattern** | Обнаруженные паттерны |
| **EnsembleModel** | Ансамбль моделей с весами |
| **AdminUser / AdminInvite** | Администраторы |

---

## Web PWA (`/web/src/`)

### Страницы / Features

| Feature | Описание |
|---------|----------|
| **Auth** | Логин, регистрация, AuthContext |
| **Matches** | Главная, список матчей, фильтры по лигам, избранное, детали матча |
| **Predictions** | AI-чат с Claude, статистика точности, история прогнозов |
| **Betting** | Bet Slip Builder, промо букмекеров, ProAccess paywall |
| **Tools** | Конвертер коэффициентов, калькулятор Келли, банкролл-трекер |
| **Admin** | Дашборд, пользователи, ML-пайплайн, предсказания, чаты поддержки |

### Shared-модули

| Модуль | Описание |
|--------|----------|
| **API Client** (`shared/api/`) | Fetch-обёртка: retry (3 попытки для 500+), token refresh, дедупликация |
| **Config** (`shared/config/env.js`) | Runtime config (`window.__APP_CONFIG__`) + fallback на `VITE_*` |
| **Advertisers** (`shared/config/advertisers.js`) | Региональные конфигурации (IT, ES, FR, DE, PL...) — валюта, бонусы, тексты |
| **i18n** (`shared/i18n/`) | 13 языков: en, ru, es, pt, de, it, fr, tr, ro, pl, ar, hi, zh |
| **Services** | Geo-определение, push-уведомления, аналитика, phone utils |
| **Context** | ThemeContext, AuthContext, AdvertiserContext |
| **Components** | Layout, BottomNav, FloatingChat, SupportChat, ProAccessPopup |

---

## Admin Panel (`/admin/src/`)

| Страница | Описание |
|----------|----------|
| Dashboard | Общая статистика (пользователи, трафик, конверсии) |
| Users | Управление пользователями, поиск, фильтры |
| Finance | Финансовая аналитика (постбэки, доходы) |
| Banners | Управление баннерами |
| Traffic Sources | Источники трафика, UTM-статистика |
| Postbacks | Логи постбэков от букмекеров |

---

## Affiliate Server (`/server/index.js`)

| Функция | Описание |
|---------|----------|
| **Geo Detection** | IP-геолокация, блокировка стран (RU, BY, UA и др.) |
| **Click Tracking** | Генерация уникальных click_id для affiliate ссылок |
| **Postback Handler** | Приём событий от букмекера (deposit, registration) |
| **Premium Activation** | Активация premium при подтверждённом депозите |
| **Cloaking** | Зеркальный домен для заблокированных стран |
| **Proxy** | Проксирование запросов к букмекеру (обход CORS/гео-блоков) |
| **Verification** | Ручная верификация существующих аккаунтов букмекера |
| **Admin API** | Просмотр постбэков, премиумов, верификаций |

---

## Mobile App (`/mobile_app/lib/`)

| Модуль | Описание |
|--------|----------|
| **Screens** | Auth, Home, Matches, MatchDetail, Favorites, Premium, Settings |
| **Providers** | Riverpod-провайдеры состояния |
| **Services** | API-клиент (Dio) с JWT |
| **Models** | Match, Prediction, User |
| **i18n** | 4 языка (en, es, pt, ru) |

---

## Бизнес-логика

### Монетизация
1. **Affiliate (основной)** — пользователь регистрируется у букмекера → постбэк → premium (15 дней)
2. **Degressive paywall (funnel-1)** — 3→2→1 бесплатных AI-запросов в день → paywall
3. **Реферальная система** — 3 реферала = 3 дня premium, +1 AI-запрос за каждого реферала

### Воронки (A/B тесты)
| Funnel | Стратегия |
|--------|-----------|
| **funnel-1** (дефолт) | Дегрессивный лимит (3→2→1), paywall |
| **funnel-2** | Всё бесплатно, монетизация через рекламу/экспрессы |
| **funnel-3** | Фиксированный лимит 7/день |
| **funnel-4** | Express-first, всё бесплатно |

### Deeplink система
- **Новые пользователи** → offer page (регистрация у букмекера)
- **Старые/premium пользователи** → прямые ссылки на матчи

### Реферальная система
- Уникальный код: `PS{id:04X}{timestamp:04X}`
- За каждого реферала: +1 AI-запрос бонус
- За 3 реферала: 3 дня premium для реферера

---

## Безопасность

| Механизм | Описание |
|----------|----------|
| JWT | Access (30 дней) + Refresh (1 год) + httpOnly cookies |
| bcrypt | Хэширование паролей |
| Rate Limiting | Per-IP (5 аккаунтов), общий rate limit |
| Injection Detection | SQL injection + prompt injection в чате поддержки |
| CORS | Whitelist разрешённых доменов |
| Internal Secrets | X-Internal-Secret для server-to-server вызовов |
| Admin Auth | Отдельные JWT + система инвайтов |

---

## Текущий этап (Где мы сейчас)

### Завершено (последние PR)
- [x] PR #85: Кнопка "Train Now" в ML Pipeline админки
- [x] PR #84: Панель последних регистраций в админ-дашборде
- [x] PR #83: Debug-панель для диагностики предсказаний
- [x] PR #82: Динамическая валюта (PLN для Польши)
- [x] PR #81: Маршрутизация всех новых пользователей в funnel-1
- [x] Фикс сохранения прогнозов в БД
- [x] Фикс таймзон (datetime.utcnow → datetime.now)
- [x] i18n на 13 языков
- [x] ML-пайплайн с XGBoost (тренировка, предсказание, верификация)
- [x] Express-ставки
- [x] Community picks
- [x] Чат матча
- [x] AI-поддержка
- [x] Admin panel
- [x] Affiliate postback система
- [x] Referral система
- [x] Mobile app (Flutter)

### В процессе
- [ ] **Миграция на runtime config** — переход с `VITE_*` на `window.__APP_CONFIG__` для мульти-доменного деплоя одного Docker-образа
- [ ] **Фикс синхронизации user ID** (ветка `claude/fix-user-id-sync-OaZ0e`)

---

## Что мы хотим в итоге (Цель)

**AI-powered Multi-domain SaaS для футбольных прогнозов** с полным циклом:

1. **Пользователь** получает AI-прогнозы на основе Claude + ML, с дегрессивным лимитом → конвертируется через affiliate
2. **ML-пайплайн** непрерывно обучается на реальных данных, верифицирует прогнозы, улучшает точность
3. **Монетизация** через affiliate-модель (регистрация у букмекера = premium) + реферальная система
4. **Multi-domain** — один Docker-образ, разные домены/офферы/регионы (prescoreai.com, sportscoreai.com и др.)
5. **Multi-platform** — PWA + Android app + Admin panel
6. **Масштабируемость** — 13+ языков, региональные конфигурации (валюта, бонусы, тексты), A/B-тесты воронок
7. **Самообучение** — ML учится на своих ошибках, калибрует уверенность, отслеживает ROI

---

*Последнее обновление: 2026-03-19*
