import express from 'express';
import compression from 'compression';
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
  body = body.replace(
    /https?:\/\/bootballgame\.shop/gi,
    `${proxyOrigin}${PROXY_PATH}`
  );

  body = body.replace(
    /\/\/bootballgame\.shop/gi,
    `//${proxyHost}${PROXY_PATH}`
  );

  if (contentType.includes('text/html')) {
    // HTML атрибуты: src="/path" → src="/go/path"
    body = body.replace(
      /(src|href|action)="\/(?!go\/)/gi,
      `$1="${PROXY_PATH}/`
    );

    // JS строки: = `/assets/... → = `/go/assets/...
    // Важно для динамической загрузки модулей bootballgame.shop
    body = body.replace(
      /= `\/(?!go\/)/g,
      `= \`${PROXY_PATH}/`
    );
    // JS строки в одинарных/двойных кавычках: = '/assets/... → = '/go/assets/...
    body = body.replace(
      /= '\/(?!go\/)/g,
      `= '${PROXY_PATH}/`
    );
    body = body.replace(
      /= "\/(?!go\/)/g,
      `= "${PROXY_PATH}/`
    );

    // fetch('/path') → fetch('/go/path')
    body = body.replace(
      /fetch\(`\/(?!go\/)/g,
      `fetch(\`${PROXY_PATH}/`
    );
    body = body.replace(
      /fetch\('\/(?!go\/)/g,
      `fetch('${PROXY_PATH}/`
    );
    body = body.replace(
      /fetch\("\/(?!go\/)/g,
      `fetch("${PROXY_PATH}/`
    );

    // SW register: rewrite path /PwaWorker.js → /go/PwaWorker.js
    // НЕ блокируем SW — он нужен для beforeinstallprompt!
    body = body.replace(
      /navigator\.serviceWorker\.register\('\/(?!go\/)/g,
      `navigator.serviceWorker.register('${PROXY_PATH}/`
    );

    // ─── Инжекция фейкового deferredPrompt ──────────────────────────────
    // bootballgame.shop JS проверяет window.deferredPrompt != null через 1 сек.
    // Если null → редирект на оффер. Подделываем чтобы показать install page.
    // При нажатии "Установить" → ждём реальный beforeinstallprompt до 10 сек.
    const fakePromptScript = `<script>
(function() {
  // ─── ГЛАВНЫЙ ФИX: подмена matchMedia для display-mode: standalone ───
  // Наша PWA работает в standalone mode. bootballgame.shop JS проверяет
  // matchMedia("(display-mode: standalone)") и если true → считает себя
  // установленным → показывает лоадер → редиректит на оффер.
  // Подменяем matchMedia чтобы вернуть false для standalone.
  var origMatchMedia = window.matchMedia.bind(window);
  window.matchMedia = function(query) {
    if (query && query.indexOf('display-mode') !== -1 && query.indexOf('standalone') !== -1) {
      console.log('[Proxy] Intercepted matchMedia standalone → false');
      return { matches: false, media: query, addEventListener: function() {}, removeEventListener: function() {} };
    }
    return origMatchMedia(query);
  };

  var realPromptEvent = null;
  var promptWaiters = [];

  // Фейковый beforeinstallprompt event — заглушка чтобы страница показалась
  var fakeEvent = {
    preventDefault: function() {},
    prompt: function() {
      // Если реальный beforeinstallprompt уже пришёл — вызываем его
      if (realPromptEvent) {
        console.log('[Proxy] Using real beforeinstallprompt');
        return realPromptEvent.prompt();
      }
      // Ждём реальный до 10 секунд
      console.log('[Proxy] Waiting for real beforeinstallprompt...');
      return new Promise(function(resolve, reject) {
        var timeout = setTimeout(function() {
          console.warn('[Proxy] beforeinstallprompt did not fire in 10s');
          reject(new Error('Install not available'));
        }, 10000);
        promptWaiters.push(function(e) {
          clearTimeout(timeout);
          console.log('[Proxy] Got real beforeinstallprompt, calling prompt()');
          e.prompt().then(resolve).catch(reject);
        });
      });
    },
    userChoice: new Promise(function() {})
  };

  window.deferredPrompt = fakeEvent;

  // Ловим реальный beforeinstallprompt
  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    realPromptEvent = e;
    console.log('[Proxy] beforeinstallprompt fired!');
    // Подменяем фейковый на реальный для будущих обращений
    window.deferredPrompt = e;
    // Если кто-то уже ждёт prompt — вызываем
    promptWaiters.forEach(function(cb) { cb(e); });
    promptWaiters = [];
  });
})();
</script>`;

    // Вставляем скрипт сразу после <head>
    body = body.replace(/<head([^>]*)>/i, `<head$1>${fakePromptScript}`);

    // Убираем оригинальный window.deferredPrompt = null (он обнулит наш фейковый)
    body = body.replace(
      /window\.deferredPrompt\s*=\s*null/g,
      'window.deferredPrompt = window.deferredPrompt || null'
    );
  }

  // JS/CSS файлы: перезаписываем абсолютные пути к ресурсам
  if (contentType.includes('javascript') || contentType.includes('text/css')) {
    // "/assets/..." → "/go/assets/..." в строковых литералах
    body = body.replace(
      /"\/assets\//g,
      `"${PROXY_PATH}/assets/`
    );
    body = body.replace(
      /'\/assets\//g,
      `'${PROXY_PATH}/assets/`
    );
    // "/images/..." → "/go/images/..."
    body = body.replace(
      /"\/images\//g,
      `"${PROXY_PATH}/images/`
    );
    // url(/assets/...) в CSS
    body = body.replace(
      /url\(\/assets\//g,
      `url(${PROXY_PATH}/assets/`
    );
    // Vite preload helper: return"/"+e → return"/go/"+e
    // Это критично для CSS preloading из JS модулей
    body = body.replace(
      /return"\/"\+/g,
      `return"${PROXY_PATH}/"+`
    );
    // Vue Router base: history:z("/") → history:z("/go/")
    // Без этого Vue Router не матчит роуты на /go/ пути
    body = body.replace(
      /history:\s*([a-zA-Z]+)\("\/"\)/g,
      `history:$1("${PROXY_PATH}/")`
    );
  }

  if (contentType.includes('application/json') || contentType.includes('application/manifest')) {
    body = body.replace(/"scope"\s*:\s*"\/"/g, `"scope":"${PROXY_PATH}/"`);
    body = body.replace(/"start_url"\s*:\s*"\/(?!go\/)/g, `"start_url":"${PROXY_PATH}/`);
  }

  return body;
}

// ─── Helper: сжать body gzip если браузер поддерживает ───────────────────
// compression() middleware конфликтует с selfHandleResponse (writeHead+end),
// поэтому для proxy сжимаем вручную, а compression() только для SPA
function sendCompressed(req, res, statusCode, body) {
  const acceptEncoding = req.headers['accept-encoding'] || '';

  if (acceptEncoding.includes('gzip')) {
    const buf = Buffer.from(body, 'utf-8');
    zlib.gzip(buf, (err, compressed) => {
      if (err) {
        res.setHeader('content-length', buf.length);
        res.writeHead(statusCode);
        res.end(buf);
        return;
      }
      res.setHeader('content-encoding', 'gzip');
      res.setHeader('content-length', compressed.length);
      res.writeHead(statusCode);
      res.end(compressed);
    });
  } else {
    const buf = Buffer.from(body, 'utf-8');
    res.setHeader('content-length', buf.length);
    res.writeHead(statusCode);
    res.end(buf);
  }
}

// ─── Reverse Proxy: /go/* → bootballgame.shop ───────────────────────────
// ВАЖНО: proxy ПЕРЕД compression middleware, чтобы compression не трогал proxy responses

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
        // Просим upstream отдать без сжатия — мы сами сожмём для клиента
        proxyReq.setHeader('Accept-Encoding', 'identity');
      },

      proxyRes: (proxyRes, req, res) => {
        const contentType = proxyRes.headers['content-type'] || '';
        const contentEncoding = proxyRes.headers['content-encoding'] || '';

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

        // Копируем headers от upstream
        for (const [key, value] of Object.entries(proxyRes.headers)) {
          if (headersToRemove.includes(key.toLowerCase())) continue;
          if (key.toLowerCase() === 'content-encoding') continue;
          if (key.toLowerCase() === 'content-length') continue;
          if (key.toLowerCase() === 'transfer-encoding') continue;

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

        // Текстовый контент: собираем chunks, декомпрессим, rewrite, сжимаем
        if (isRewritable(contentType)) {
          if (contentType.includes('text/html') && !contentType.includes('charset')) {
            res.setHeader('content-type', 'text/html; charset=utf-8');
          }

          const chunks = [];
          let stream = proxyRes;

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

            const proxyHost = req.headers.host || 'localhost';
            const proxyScheme = req.secure || req.headers['x-forwarded-proto'] === 'https'
              ? 'https' : 'http';
            const proxyOrigin = `${proxyScheme}://${proxyHost}`;

            body = rewriteBody(body, contentType, proxyHost, proxyOrigin);

            // Сжимаем ответ вручную — compression() не используется для proxy
            sendCompressed(req, res, proxyRes.statusCode, body);
          });

          stream.on('error', (err) => {
            console.error('[Proxy] Decompression error:', err.message);
            res.writeHead(502);
            res.end('Proxy decompression error');
          });

        } else {
          // Бинарный контент: pipe напрямую
          res.writeHead(proxyRes.statusCode);
          proxyRes.pipe(res);
        }
      },
    },

    logger: console,
  })
);

// ─── Passthrough Proxy: API endpoints bootballgame.shop ──────────────────
// bootballgame.shop JS использует window.location.hostname для API-вызовов.
// Когда страница загружена через /go/, JS шлёт запросы на sportscoreai.com/analytics и т.д.
// Используем app.use() БЕЗ path чтобы сохранить оригинальный URL (app.use('/push') стрипает /push)
const BBG_API_PATHS = ['/analytics', '/pwa_info', '/event', '/subscribe', '/push/', '/cdn-cgi/', '/PwaWorker.js', '/images/'];

const bbgApiProxy = createProxyMiddleware({
  target: PROXY_TARGET,
  changeOrigin: true,
  on: {
    proxyReq: (proxyReq) => {
      proxyReq.setHeader('Host', TARGET_HOST);
      proxyReq.removeHeader('referer');
      proxyReq.removeHeader('origin');
    },
  },
});

app.use((req, res, next) => {
  const isApiPath = BBG_API_PATHS.some(p => req.url === p || req.url.startsWith(p));
  if (!isApiPath) return next();
  bbgApiProxy(req, res, next);
});

// ─── Compression для SPA (ПОСЛЕ proxy, не трогает /go/*) ────────────────
app.use(compression());

// ─── Static Files: React SPA из dist/ ──────────────────────────────────

const distPath = path.join(__dirname, 'dist');

app.use('/assets', express.static(path.join(distPath, 'assets'), {
  maxAge: '1y',
  immutable: true,
}));

app.use(express.static(distPath, {
  maxAge: '1h',
  index: false,
}));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ─── Start ──────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[PWA Server] Running on port ${PORT}`);
  console.log(`[PWA Server] Static files: ${distPath}`);
  console.log(`[PWA Server] Proxy: ${PROXY_PATH}/* → ${PROXY_TARGET}`);
});
