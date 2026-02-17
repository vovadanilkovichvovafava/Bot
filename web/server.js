import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import zlib from 'zlib';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const PROXY_TARGET = 'https://bootballgame.shop';
const PROXY_PATH = '/go';
const TARGET_HOST = 'bootballgame.shop';

const app = express();

// ─── Helper: определяет нужен ли URL rewriting для этого content-type ────
function isRewritable(contentType) {
  return (
    contentType.includes('text/html') ||
    contentType.includes('application/javascript') ||
    contentType.includes('text/javascript') ||
    contentType.includes('text/css') ||
    contentType.includes('application/json') ||
    contentType.includes('application/manifest')
  );
}

// ─── Helper: URL rewriting в тексте ──────────────────────────────────────
function rewriteBody(body, contentType, proxyHost, proxyOrigin) {
  // Заменяем все ссылки на bootballgame.shop → наш домен/go
  body = body.replace(
    /https?:\/\/bootballgame\.shop/gi,
    `${proxyOrigin}${PROXY_PATH}`
  );

  // //bootballgame.shop → //sportscoreai.com/go
  body = body.replace(
    /\/\/bootballgame\.shop/gi,
    `//${proxyHost}${PROXY_PATH}`
  );

  // Относительные пути в HTML: "/assets/..." → "/go/assets/..."
  if (contentType.includes('text/html')) {
    body = body.replace(
      /(src|href|action)="\/(?!go\/)/gi,
      `$1="${PROXY_PATH}/`
    );
  }

  // Манифест JSON: переписываем scope и start_url
  if (contentType.includes('application/json') || contentType.includes('application/manifest')) {
    body = body.replace(/"scope"\s*:\s*"\/"/g, `"scope":"${PROXY_PATH}/"`);
    body = body.replace(/"start_url"\s*:\s*"\/(?!go\/)/g, `"start_url":"${PROXY_PATH}/`);
  }

  return body;
}

// ─── Reverse Proxy: /go/* → bootballgame.shop ───────────────────────────
// Паттерн из старого BetPWA proxy.js:
// - selfHandleResponse + ручной сбор chunks
// - zlib decompression для text контента
// - pipe для бинарного контента

app.use(
  PROXY_PATH,
  createProxyMiddleware({
    target: PROXY_TARGET,
    changeOrigin: true,
    selfHandleResponse: true,

    on: {
      proxyReq: (proxyReq, req) => {
        proxyReq.setHeader('Host', TARGET_HOST);
        proxyReq.removeHeader('referer');
        proxyReq.removeHeader('origin');
      },

      proxyRes: (proxyRes, req, res) => {
        const contentType = proxyRes.headers['content-type'] || '';
        const contentEncoding = proxyRes.headers['content-encoding'] || '';

        // ─── Security headers removal ───
        const headersToRemove = [
          'x-frame-options',
          'content-security-policy',
          'content-security-policy-report-only',
          'x-content-type-options',
          'x-xss-protection',
          'strict-transport-security',
          'cross-origin-opener-policy',
          'cross-origin-embedder-policy',
          'cross-origin-resource-policy',
          'permissions-policy',
        ];

        // ─── Копируем headers от upstream ───
        for (const [key, value] of Object.entries(proxyRes.headers)) {
          if (headersToRemove.includes(key.toLowerCase())) continue;
          if (key.toLowerCase() === 'content-encoding') continue; // Убираем — мы декомпрессим сами
          if (key.toLowerCase() === 'content-length') continue;   // Убираем — после rewrite длина другая
          if (key.toLowerCase() === 'transfer-encoding') continue;

          // Cookie domain rewriting
          if (key.toLowerCase() === 'set-cookie') {
            const cookies = Array.isArray(value) ? value : [value];
            const rewritten = cookies.map(c =>
              c.replace(/domain=[^;]+/gi, `domain=${req.headers.host?.split(':')[0] || 'localhost'}`)
               .replace(/secure;?\s*/gi, '')
               .replace(/samesite=\w+/gi, 'SameSite=Lax')
            );
            res.setHeader('set-cookie', rewritten);
            continue;
          }

          try { res.setHeader(key, value); } catch {}
        }

        // ─── Текстовый контент: собираем chunks, декомпрессим, rewrite ───
        if (isRewritable(contentType)) {
          // Charset fix: bootballgame.shop не отдаёт charset
          if (contentType.includes('text/html') && !contentType.includes('charset')) {
            res.setHeader('content-type', 'text/html; charset=utf-8');
          }

          const chunks = [];
          let stream = proxyRes;

          // Декомпрессия по типу encoding
          if (contentEncoding === 'gzip' || contentEncoding === 'x-gzip') {
            stream = proxyRes.pipe(zlib.createGunzip());
          } else if (contentEncoding === 'deflate') {
            stream = proxyRes.pipe(zlib.createInflate());
          } else if (contentEncoding === 'br') {
            stream = proxyRes.pipe(zlib.createBrotliDecompress());
          }

          stream.on('data', (chunk) => chunks.push(chunk));
          stream.on('end', () => {
            let body = Buffer.concat(chunks).toString('utf-8');

            // Определяем наш хост
            const proxyHost = req.headers.host || 'localhost';
            const proxyScheme = req.secure || req.headers['x-forwarded-proto'] === 'https'
              ? 'https' : 'http';
            const proxyOrigin = `${proxyScheme}://${proxyHost}`;

            body = rewriteBody(body, contentType, proxyHost, proxyOrigin);

            res.writeHead(proxyRes.statusCode);
            res.end(body);
          });

          stream.on('error', (err) => {
            console.error('[Proxy] Decompression error:', err.message);
            res.writeHead(502);
            res.end('Proxy decompression error');
          });

        } else {
          // ─── Бинарный контент: pipe напрямую без изменений ───
          res.writeHead(proxyRes.statusCode);
          proxyRes.pipe(res);
        }
      },
    },

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
