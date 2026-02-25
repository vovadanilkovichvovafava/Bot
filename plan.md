# План: Runtime-конфиг вместо build-time VITE_* переменных

## Проблема
Сейчас все `VITE_*` переменные вшиваются в бандл при `npm run build`. Чтобы запустить тот же фронт на другом домене с другим оффером — нужен отдельный билд. Хотим: **один билд → много доменов с разными настройками**.

## Что меняем

### Шаг 1. Создать `web/public/config.js` — заглушка для dev-режима
Файл с дефолтами, который будет работать при `npm run dev`:
```js
window.__APP_CONFIG__ = {
  API_URL: '',
  GEO_SERVER_URL: '',
  TRACKING_API: '',
  OFFER_URL: '',
  BKPROXY_URL: '',
  VAPID_PUBLIC_KEY: '',
  BOOKMAKER_NAME: '',
  BOOKMAKER_LINK: '',
  BOOKMAKER_BONUS: '',
  BOOKMAKER_PROMO: '',
  BOOKMAKER_MIN_DEPOSIT: '',
  API_FOOTBALL_KEY: '',
};
```
Пустые строки — в dev-режиме всё равно подхватятся фолбэки из `import.meta.env`.

### Шаг 2. Подключить `config.js` в `index.html`
Добавить перед `<script type="module" src="/src/main.jsx">`:
```html
<script src="/config.js"></script>
```
Этот файл загрузится синхронно до старта приложения.

### Шаг 3. Создать модуль `web/src/shared/config/env.js`
Единая точка доступа к конфигу:
```js
const rc = window.__APP_CONFIG__ || {};

export const ENV = {
  API_URL:            rc.API_URL            || import.meta.env.VITE_API_URL            || 'https://appbot-production-152e.up.railway.app/api/v1',
  GEO_SERVER_URL:     rc.GEO_SERVER_URL     || import.meta.env.VITE_GEO_SERVER_URL     || 'http://localhost:3001',
  TRACKING_API:       rc.TRACKING_API       || import.meta.env.VITE_TRACKING_API       || 'https://postbackapi-production.up.railway.app',
  OFFER_URL:          rc.OFFER_URL          || import.meta.env.VITE_OFFER_URL          || 'https://siteofficialred.com/KnSQ1M',
  BKPROXY_URL:        rc.BKPROXY_URL        || import.meta.env.VITE_BKPROXY_URL        || 'https://bkproxy-production.up.railway.app',
  VAPID_PUBLIC_KEY:   rc.VAPID_PUBLIC_KEY   || import.meta.env.VITE_VAPID_PUBLIC_KEY   || '',
  BOOKMAKER_NAME:     rc.BOOKMAKER_NAME     || import.meta.env.VITE_BOOKMAKER_NAME     || 'Partner',
  BOOKMAKER_LINK:     rc.BOOKMAKER_LINK     || import.meta.env.VITE_BOOKMAKER_LINK     || '#',
  BOOKMAKER_BONUS:    rc.BOOKMAKER_BONUS    || import.meta.env.VITE_BOOKMAKER_BONUS    || 'Welcome Bonus',
  BOOKMAKER_PROMO:    rc.BOOKMAKER_PROMO    || import.meta.env.VITE_BOOKMAKER_PROMO    || '',
  BOOKMAKER_MIN_DEPOSIT: rc.BOOKMAKER_MIN_DEPOSIT || import.meta.env.VITE_BOOKMAKER_MIN_DEPOSIT || '$10',
  API_FOOTBALL_KEY:   rc.API_FOOTBALL_KEY   || import.meta.env.VITE_API_FOOTBALL_KEY   || '',
};
```
Приоритет: `window.__APP_CONFIG__` → `import.meta.env` (dev) → дефолт.

### Шаг 4. Заменить все `import.meta.env.VITE_*` на `ENV.*`
Файлы для замены (10 файлов):

| Файл | Переменные |
|------|-----------|
| `src/shared/api/index.js` | `VITE_API_URL` |
| `src/features/admin/api.js` | `VITE_API_URL` |
| `src/shared/services/analytics.js` | `VITE_API_URL` |
| `src/features/matches/api/footballApi.js` | `VITE_API_URL`, `VITE_API_FOOTBALL_KEY` |
| `src/shared/services/geoService.js` | `VITE_GEO_SERVER_URL` |
| `src/features/tools/pages/Settings.jsx` | `VITE_GEO_SERVER_URL` |
| `src/features/betting/services/trackingService.js` | `VITE_TRACKING_API`, `VITE_OFFER_URL` |
| `src/features/betting/hooks/useBkReminderModal.js` | `VITE_TRACKING_API` |
| `src/features/betting/api/bookmakerApi.js` | `VITE_BKPROXY_URL` |
| `src/features/betting/components/BookmakerConnect.jsx` | `VITE_BOOKMAKER_NAME`, `VITE_BOOKMAKER_LINK`, `VITE_BOOKMAKER_BONUS`, `VITE_BOOKMAKER_PROMO` |
| `src/shared/services/pushNotificationService.js` | `VITE_VAPID_PUBLIC_KEY` |
| `src/shared/config/advertisers.js` | `VITE_OFFER_URL` |

В каждом файле: `import { ENV } from '@/shared/config/env'` и замена `import.meta.env.VITE_XXX` → `ENV.XXX`.

### Шаг 5. Создать `web/docker-entrypoint.sh`
Скрипт, который при старте контейнера генерирует `config.js` из env-переменных:
```sh
#!/bin/sh
cat > /app/dist/config.js <<EOF
window.__APP_CONFIG__ = {
  API_URL: "${API_URL:-}",
  GEO_SERVER_URL: "${GEO_SERVER_URL:-}",
  TRACKING_API: "${TRACKING_API:-}",
  OFFER_URL: "${OFFER_URL:-}",
  BKPROXY_URL: "${BKPROXY_URL:-}",
  VAPID_PUBLIC_KEY: "${VAPID_PUBLIC_KEY:-}",
  BOOKMAKER_NAME: "${BOOKMAKER_NAME:-}",
  BOOKMAKER_LINK: "${BOOKMAKER_LINK:-}",
  BOOKMAKER_BONUS: "${BOOKMAKER_BONUS:-}",
  BOOKMAKER_PROMO: "${BOOKMAKER_PROMO:-}",
  BOOKMAKER_MIN_DEPOSIT: "${BOOKMAKER_MIN_DEPOSIT:-}",
  API_FOOTBALL_KEY: "${API_FOOTBALL_KEY:-}",
};
EOF

exec serve dist -s -p ${PORT:-3000}
```

### Шаг 6. Обновить `web/Dockerfile`
```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
EXPOSE ${PORT:-3000}
ENTRYPOINT ["./docker-entrypoint.sh"]
```

### Шаг 7. Обновить `.env.example`
Убрать префикс `VITE_` — переменные теперь передаются контейнеру как обычные env (без VITE_), а для dev-режима `VITE_*` продолжат работать через фолбэк.

### Шаг 8. Удалить `BOOKMAKER_AFFILIATE_ID` из server
Убрать неиспользуемые переменные `BOOKMAKER_AFFILIATE_ID` и `BOOKMAKER_NAME` из `server/index.js` и `server/.env.example`, и ссылки вида `1xbet.com/?aff=...` которые нигде не используются на фронте.

---

## Результат
- **Один `docker build`** — один образ для всех доменов
- При деплое на Railway/другой хостинг — просто задаёшь env-переменные контейнера
- Dev-режим (`npm run dev`) продолжает работать как раньше через `import.meta.env`
- Тест на локалке: `docker run -e OFFER_URL=https://new-offer.com -e BOOKMAKER_NAME=Fonbet -p 3000:3000 web`
