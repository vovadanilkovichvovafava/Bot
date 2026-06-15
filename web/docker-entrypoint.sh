#!/bin/sh
set -e

# Defaults for internal Saturn networking (UUIDs are Saturn app container hostnames)
BACKEND_URL="${BACKEND_URL:-http://563fed01-57d2-4dc6-9148-0cddbd48c02d:8000}"
GEO_SERVER_URL="${GEO_SERVER_URL:-${SERVER_URL:-http://43782e2c-7c44-4f9c-a4a7-58424363e3ef:3001}}"
PORT="${PORT:-3000}"
export BACKEND_URL GEO_SERVER_URL PORT

# Generate runtime config — API calls go through nginx proxy on same origin
cat > /usr/share/nginx/html/config.js <<EOF
window.__APP_CONFIG__ = {
  API_URL: "/api/v1",
  GEO_SERVER_URL: "/geo",
  TRACKING_API: "/geo",
  OFFER_URL: "${OFFER_URL:-}",
  OFFER_URL_GOOGLE: "${OFFER_URL_GOOGLE:-}",
  OFFER_URL_F2: "${OFFER_URL_F2:-}",
  OFFER_URL_AR: "${OFFER_URL_AR:-}",
  OFFER_URL_PT: "${OFFER_URL_PT:-}",
  BKPROXY_URL: "/geo",
  VAPID_PUBLIC_KEY: "${VAPID_PUBLIC_KEY:-}",
  BOOKMAKER_NAME: "${BOOKMAKER_NAME:-}",
  BOOKMAKER_LINK: "${BOOKMAKER_LINK:-}",
  BOOKMAKER_BONUS: "${BOOKMAKER_BONUS:-}",
  BOOKMAKER_PROMO: "${BOOKMAKER_PROMO:-}",
  TRAFFIC_SOURCE: "${TRAFFIC_SOURCE:-mundialArgentina}",
  DEEPLINK_HOSTS: "${DEEPLINK_HOSTS:-}",
};
EOF

# Cache-bust config.js in index.html so CDN serves fresh version
CACHE_BUST=$(date +%s)
sed -i "s|/config.js|/config.js?v=${CACHE_BUST}|g" /usr/share/nginx/html/index.html

# Render nginx config from template (substitute env vars)
envsubst '${PORT} ${BACKEND_URL} ${GEO_SERVER_URL}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
