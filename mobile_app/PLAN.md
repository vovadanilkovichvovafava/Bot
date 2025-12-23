# AI Betting Bot - Mobile App Plan

## Обзор проекта

Мобильное приложение на Flutter - полная копия Telegram бота для прогнозирования футбольных матчей.

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                      MOBILE APP (Flutter)                    │
├─────────────────────────────────────────────────────────────┤
│  Screens    │  Widgets   │  Providers  │  Services          │
│  - Home     │  - MatchCard│  - AuthProvider │  - ApiService │
│  - Matches  │  - BetTip   │  - MatchProvider│  - AuthService│
│  - Stats    │  - StatsCard│  - UserProvider │  - CacheService│
│  - Settings │  - LeagueTab│  - SettingsProvider             │
│  - Premium  │  - ...      │               │                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND (FastAPI)                       │
├─────────────────────────────────────────────────────────────┤
│  API Routes  │  Services (from bot)  │  Models              │
│  - /auth     │  - MatchAnalyzer      │  - User              │
│  - /matches  │  - MLEngine           │  - Prediction        │
│  - /predictions│ - FootballAPI       │  - Match             │
│  - /users    │  - ClaudeAnalysis     │  - Stats             │
│  - /stats    │                       │                      │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │PostgreSQL│   │Claude AI │   │Football  │
        │          │   │   API    │   │Data API  │
        └──────────┘   └──────────┘   └──────────┘
```

---

## Структура папок

### Mobile App (Flutter)
```
mobile_app/
├── lib/
│   ├── main.dart                 # Точка входа
│   ├── screens/                  # Экраны приложения
│   │   ├── home_screen.dart
│   │   ├── matches_screen.dart
│   │   ├── match_detail_screen.dart
│   │   ├── predictions_screen.dart
│   │   ├── stats_screen.dart
│   │   ├── settings_screen.dart
│   │   ├── premium_screen.dart
│   │   ├── favorites_screen.dart
│   │   └── auth/
│   │       ├── login_screen.dart
│   │       └── register_screen.dart
│   ├── widgets/                  # Переиспользуемые виджеты
│   │   ├── match_card.dart
│   │   ├── prediction_card.dart
│   │   ├── stats_card.dart
│   │   ├── league_selector.dart
│   │   ├── confidence_badge.dart
│   │   └── loading_shimmer.dart
│   ├── models/                   # Модели данных
│   │   ├── user.dart
│   │   ├── match.dart
│   │   ├── prediction.dart
│   │   ├── league.dart
│   │   └── stats.dart
│   ├── services/                 # API и сервисы
│   │   ├── api_service.dart
│   │   ├── auth_service.dart
│   │   ├── cache_service.dart
│   │   └── notification_service.dart
│   ├── providers/                # State management (Riverpod)
│   │   ├── auth_provider.dart
│   │   ├── matches_provider.dart
│   │   ├── predictions_provider.dart
│   │   ├── user_provider.dart
│   │   └── settings_provider.dart
│   ├── utils/                    # Утилиты
│   │   ├── constants.dart
│   │   ├── theme.dart
│   │   ├── validators.dart
│   │   └── date_formatter.dart
│   └── l10n/                     # Локализация
│       ├── app_ru.arb
│       ├── app_en.arb
│       ├── app_pt.arb
│       └── app_es.arb
├── assets/
│   ├── images/
│   └── fonts/
├── test/
├── pubspec.yaml
└── README.md
```

### Backend (FastAPI)
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                   # FastAPI app
│   ├── config.py                 # Настройки
│   ├── api/                      # API роуты
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── matches.py
│   │   ├── predictions.py
│   │   ├── users.py
│   │   ├── stats.py
│   │   └── leagues.py
│   ├── core/                     # Ядро
│   │   ├── __init__.py
│   │   ├── security.py           # JWT, auth
│   │   ├── database.py           # Async SQLAlchemy
│   │   └── dependencies.py
│   ├── models/                   # SQLAlchemy модели
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── prediction.py
│   │   ├── match.py
│   │   └── stats.py
│   ├── services/                 # Бизнес-логика (из бота)
│   │   ├── __init__.py
│   │   ├── football_api.py       # API запросы
│   │   ├── match_analyzer.py     # Анализ матчей
│   │   ├── ml_engine.py          # ML предсказания
│   │   ├── claude_service.py     # Claude AI
│   │   └── stats_service.py
│   └── utils/
│       ├── __init__.py
│       └── helpers.py
├── tests/
├── migrations/                   # Alembic
├── requirements.txt
├── Dockerfile
└── README.md
```

---

## API Endpoints

### Auth
| Method | Endpoint | Описание |
|--------|----------|----------|
| POST | `/api/v1/auth/register` | Регистрация |
| POST | `/api/v1/auth/login` | Вход |
| POST | `/api/v1/auth/refresh` | Обновление токена |
| POST | `/api/v1/auth/logout` | Выход |

### Users
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/v1/users/me` | Текущий пользователь |
| PATCH | `/api/v1/users/me` | Обновить профиль |
| GET | `/api/v1/users/me/stats` | Статистика пользователя |
| GET | `/api/v1/users/me/predictions` | История прогнозов |

### Matches
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/v1/matches` | Список матчей |
| GET | `/api/v1/matches/today` | Матчи сегодня |
| GET | `/api/v1/matches/tomorrow` | Матчи завтра |
| GET | `/api/v1/matches/{id}` | Детали матча |
| GET | `/api/v1/matches/{id}/analysis` | AI анализ матча |

### Predictions
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/v1/predictions/recommend` | Рекомендации |
| GET | `/api/v1/predictions/sure` | Уверенные ставки (75%+) |
| POST | `/api/v1/predictions/{match_id}` | Получить прогноз |

### Leagues
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/v1/leagues` | Список лиг |
| GET | `/api/v1/leagues/{code}/matches` | Матчи лиги |
| GET | `/api/v1/leagues/{code}/standings` | Таблица лиги |

### Stats
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/v1/stats/accuracy` | Точность прогнозов |
| GET | `/api/v1/stats/roi` | ROI по категориям |
| GET | `/api/v1/stats/weekly` | Недельный отчёт |

### Favorites
| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/v1/favorites/teams` | Избранные команды |
| POST | `/api/v1/favorites/teams/{name}` | Добавить команду |
| DELETE | `/api/v1/favorites/teams/{name}` | Удалить команду |
| GET | `/api/v1/favorites/leagues` | Избранные лиги |
| POST | `/api/v1/favorites/leagues/{code}` | Добавить лигу |

---

## Экраны приложения

### 1. Splash Screen
- Лого
- Проверка авторизации
- Загрузка начальных данных

### 2. Auth Screens
- **Login**: Email/пароль, кнопка регистрации
- **Register**: Email, пароль, подтверждение
- **Forgot Password**: Восстановление

### 3. Home Screen (главная)
- Топ прогнозы дня (3-5 матчей)
- Статистика точности (неделя)
- Быстрые действия: Сегодня, Завтра, Лиги
- Баннер премиума (для free юзеров)

### 4. Matches Screen
- Табы: Сегодня | Завтра | По лигам
- Список матчей с карточками
- Фильтр по лигам
- Pull-to-refresh

### 5. Match Detail Screen
- Информация о матче
- H2H история
- Форма команд
- AI прогноз с confidence
- Основная и альтернативная ставки
- Кнопка "Сохранить"

### 6. Stats Screen
- Общая точность
- ROI по типам ставок
- График по дням
- Лучшие/худшие типы ставок
- История прогнозов

### 7. Favorites Screen
- Избранные команды
- Избранные лиги
- Матчи избранных

### 8. Settings Screen
- Язык
- Часовой пояс
- Уведомления (вкл/выкл)
- Тема (светлая/тёмная)
- О приложении
- Выход

### 9. Premium Screen
- Преимущества премиума
- Тарифы
- Крипто оплата (без 1win)

---

## Переиспользование кода из бота

### Полностью переносим:
- `analyze_match_enhanced()` → `match_analyzer.py`
- `get_matches()`, `get_standings()`, `get_team_form()` → `football_api.py`
- `train_ensemble_models()`, `ml_predict()` → `ml_engine.py`
- `check_bet_result()`, `calculate_kelly()` → `utils/`
- Все SQL запросы → SQLAlchemy модели
- `TRANSLATIONS` → Flutter l10n (ARB файлы)
- `COMPETITIONS` → `constants.py`

### Не переносим:
- Telegram handlers
- 1win интеграция
- Telegram-специфичные уведомления

---

## Этапы разработки

### Этап 1: Backend MVP (3-4 дня)
- [ ] Настройка FastAPI + PostgreSQL
- [ ] Модели SQLAlchemy
- [ ] JWT авторизация
- [ ] Перенос football_api.py
- [ ] Базовые эндпоинты (matches, predictions)

### Этап 2: Flutter базовый UI (3-4 дня)
- [ ] Настройка проекта
- [ ] Auth экраны
- [ ] Home screen
- [ ] API service
- [ ] Базовая навигация

### Этап 3: Основной функционал (4-5 дней)
- [ ] Matches screen + детали
- [ ] Predictions + AI анализ
- [ ] Stats screen
- [ ] Favorites

### Этап 4: Полировка (2-3 дня)
- [ ] Локализация
- [ ] Тёмная тема
- [ ] Push уведомления
- [ ] Кеширование
- [ ] Тесты

### Этап 5: Релиз (1-2 дня)
- [ ] App Store / Play Store assets
- [ ] Деплой backend
- [ ] Тестирование

---

## Технические детали

### Flutter пакеты:
```yaml
dependencies:
  flutter_riverpod: ^2.4.0    # State management
  dio: ^5.3.0                  # HTTP client
  go_router: ^12.0.0           # Навигация
  flutter_secure_storage: ^9.0.0  # Токены
  cached_network_image: ^3.3.0    # Кеш картинок
  fl_chart: ^0.65.0            # Графики
  shimmer: ^3.0.0              # Loading эффекты
  intl: ^0.18.0                # Локализация
```

### Python пакеты (backend):
```
fastapi==0.104.0
uvicorn==0.24.0
sqlalchemy[asyncio]==2.0.23
asyncpg==0.29.0
pydantic==2.5.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
anthropic==0.39.0
aiohttp==3.9.1
scikit-learn==1.3.2
```

---

## Оценка времени

| Этап | Дни |
|------|-----|
| Backend MVP | 3-4 |
| Flutter базовый UI | 3-4 |
| Основной функционал | 4-5 |
| Полировка | 2-3 |
| Релиз | 1-2 |
| **Итого** | **13-18 дней** |

При интенсивной работе (как бот за 4 дня): **~10 дней**
