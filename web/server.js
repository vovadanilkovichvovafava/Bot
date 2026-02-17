import express from 'express';
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const PROXY_TARGET = 'https://bootballgame.shop';
const PROXY_PATH = '/go';

const app = express();

// ─── Reverse Proxy: /go/* → bootballgame.shop ───────────────────────────
// Проксирует контент bootballgame.shop через наш домен,
// чтобы из standalone PWA beforeinstallprompt мог сработать.

app.use(
  PROXY_PATH,
  createProxyMiddleware({
    target: PROXY_TARGET,
    changeOrigin: true,
    selfHandleResponse: true, // нужно для responseInterceptor

    pathRewrite: (reqPath) => {
      // /go/assets/index.js → /assets/index.js
      // /go/?sub_id_10=xxx → /?sub_id_10=xxx
      return reqPath; // http-proxy-middleware уже стрипает prefix при pathRewrite
    },

    on: {
      proxyReq: (proxyReq, req) => {
        // Подменяем Host на целевой домен
        proxyReq.setHeader('Host', 'bootballgame.shop');
        // Убираем referer чтобы bootballgame.shop не заблочил
        proxyReq.removeHeader('referer');
        proxyReq.removeHeader('origin');
      },

      proxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
        const contentType = proxyRes.headers['content-type'] || '';

        // Убираем security headers которые мешают
        res.removeHeader('x-frame-options');
        res.removeHeader('content-security-policy');
        res.removeHeader('x-content-type-options');

        // Только для текстового контента (HTML, JS, CSS) делаем rewriting
        if (
          contentType.includes('text/html') ||
          contentType.includes('application/javascript') ||
          contentType.includes('text/javascript') ||
          contentType.includes('text/css')
        ) {
          let body = responseBuffer.toString('utf8');

          // Определяем наш хост (sportscoreai.com или localhost:3000)
          const proxyHost = req.headers.host || 'localhost';
          const proxyScheme = req.secure || req.headers['x-forwarded-proto'] === 'https'
            ? 'https' : 'http';
          const proxyOrigin = `${proxyScheme}://${proxyHost}`;

          // Заменяем все ссылки на bootballgame.shop → наш домен/go
          // https://bootballgame.shop → https://sportscoreai.com/go
          body = body.replace(
            /https?:\/\/bootballgame\.shop/gi,
            `${proxyOrigin}${PROXY_PATH}`
          );

          // //bootballgame.shop → //sportscoreai.com/go
          body = body.replace(
            /\/\/bootballgame\.shop/gi,
            `//${proxyHost}${PROXY_PATH}`
          );

          // Относительные пути: "/assets/..." → "/go/assets/..."
          // Но только в HTML (не в JS где пути могут быть другими)
          if (contentType.includes('text/html')) {
            // src="/assets/..." → src="/go/assets/..."
            body = body.replace(
              /(src|href|action)="\/(?!go\/)/gi,
              `$1="${PROXY_PATH}/`
            );

            // Манифест: href="/manifest.webmanifest" → href="/go/manifest.webmanifest"
            // (уже покрыт правилом выше)
          }

          return body;
        }

        // Бинарный контент (картинки, шрифты) — без изменений
        return responseBuffer;
      }),
    },

    // Cookie rewriting
    cookieDomainRewrite: {
      'bootballgame.shop': '',  // пустая строка = текущий домен
      '*': '',
    },

    // Убираем secure flag с кук (для localhost тестирования)
    cookiePathRewrite: {
      '*': '/',
    },

    // Логирование ошибок
    logger: console,
  })
);

// ─── Static Files: React SPA из dist/ ──────────────────────────────────

const distPath = path.join(__dirname, 'dist');

// Статика с кешированием для assets
app.use('/assets', express.static(path.join(distPath, 'assets'), {
  maxAge: '1y',
  immutable: true,
}));

// Остальная статика (manifest.json, sw.js, иконки)
app.use(express.static(distPath, {
  maxAge: '1h',
  // НЕ отдаём index.html через static — только через fallback ниже
  index: false,
}));

// SPA fallback — все остальные GET запросы → index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ─── Start ──────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[PWA Server] Running on port ${PORT}`);
  console.log(`[PWA Server] Static files: ${distPath}`);
  console.log(`[PWA Server] Proxy: ${PROXY_PATH}/* → ${PROXY_TARGET}`);
});
