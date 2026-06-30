#!/bin/sh
# Generate runtime config from environment variables
cat > /app/dist/config.js <<EOF
window.__APP_CONFIG__ = {
  API_URL: "${API_URL:-}",
  GEO_SERVER_URL: "${GEO_SERVER_URL:-}",
  TRACKING_API: "${TRACKING_API:-}",
  OFFER_URL: "${OFFER_URL:-}",
  OFFER_URL_GOOGLE: "${OFFER_URL_GOOGLE:-}",
  BKPROXY_URL: "${BKPROXY_URL:-}",
  VAPID_PUBLIC_KEY: "${VAPID_PUBLIC_KEY:-}",
  BOOKMAKER_NAME: "${BOOKMAKER_NAME:-}",
  BOOKMAKER_LINK: "${BOOKMAKER_LINK:-}",
  BOOKMAKER_BONUS: "${BOOKMAKER_BONUS:-}",
  BOOKMAKER_PROMO: "${BOOKMAKER_PROMO:-}",
  API_FOOTBALL_KEY: "${API_FOOTBALL_KEY:-}",
  TRAFFIC_SOURCE: "${TRAFFIC_SOURCE:-}",
};
EOF

exec serve dist -s -p ${PORT:-3000}
