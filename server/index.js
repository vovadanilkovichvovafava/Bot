import express from 'express';
import cors from 'cors';
import geoip from 'geoip-lite';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration
const CONFIG = {
  // Bookmaker partner info
  BOOKMAKER_NAME: process.env.BOOKMAKER_NAME || '1xBet',
  BOOKMAKER_AFFILIATE_ID: process.env.BOOKMAKER_AFFILIATE_ID || '',

  // Main API backend
  MAIN_API_URL: process.env.MAIN_API_URL || 'http://563fed01-57d2-4dc6-9148-0cddbd48c02d:8000/api/v1',

  // Internal secret used to authenticate server→backend calls
  POSTBACK_SECRET: process.env.POSTBACK_SECRET || '',

  // Secret required on Keitaro postbacks (falls back to POSTBACK_SECRET).
  // Configure Keitaro to append &secret=<value> (or send X-Postback-Secret header).
  KEITARO_SECRET: process.env.KEITARO_SECRET || process.env.POSTBACK_SECRET || '',

  // Separate credential for admin/debug endpoints (falls back to POSTBACK_SECRET).
  // Prefer setting this to a distinct value so leaking it does not expose the postback secret.
  ADMIN_SECRET: process.env.ADMIN_SECRET || process.env.POSTBACK_SECRET || '',

  // Countries where bookmaker is blocked (ISO 3166-1 alpha-2 codes)
  BLOCKED_COUNTRIES: (process.env.BLOCKED_COUNTRIES || 'RU,BY,UA,KZ,AZ,AM,GE,MD,KG,TJ,TM,UZ').split(','),

  // Alternative/mirror domains for cloaking
  MIRROR_DOMAIN: process.env.MIRROR_DOMAIN || 'https://1xbet-mirror.com',

  // Safe landing page for blocked countries
  SAFE_LANDING: process.env.SAFE_LANDING || '/blocked',

  // Comma-separated list of browser origins allowed via CORS. Empty = no cross-origin
  // (the frontend reaches this service same-origin through the nginx /geo proxy).
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),

  // Number of trusted reverse-proxy hops in front of this server (Cloudflare/Saturn).
  TRUST_PROXY_HOPS: Number(process.env.TRUST_PROXY_HOPS || 1),
};

// Startup validation
const requiredEnvVars = ['POSTBACK_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!CONFIG[envVar]) {
    console.error(`[STARTUP] Missing required env var: ${envVar}`);
    process.exit(1);
  }
}
if (!CONFIG.BOOKMAKER_AFFILIATE_ID) {
  console.warn('[STARTUP] BOOKMAKER_AFFILIATE_ID not set — affiliate links will be empty');
}
if (CONFIG.ADMIN_SECRET === CONFIG.POSTBACK_SECRET) {
  console.warn('[STARTUP] ADMIN_SECRET not set separately — reusing POSTBACK_SECRET for admin auth. Set a distinct ADMIN_SECRET in production.');
}

// ============================================
// SECURITY HELPERS
// ============================================

/** Constant-time string comparison that is safe against length/timing oracles. */
function secretsMatch(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string' || expected.length === 0) {
    return false;
  }
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Compare against itself to keep timing roughly constant, then fail.
    crypto.timingSafeEqual(a, a);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

/** Extract the postback/admin secret from a header or query param. */
function extractSecret(req) {
  return (
    req.headers['x-postback-secret'] ||
    req.headers['x-admin-secret'] ||
    req.query.secret ||
    ''
  );
}

/**
 * Resolve the real client IP. Behind Cloudflare, CF-Connecting-IP is authoritative
 * (Cloudflare strips any client-supplied value). Otherwise fall back to Express's
 * req.ip, which respects the configured `trust proxy` hop count. We deliberately do
 * NOT trust a raw, full X-Forwarded-For chain for security decisions.
 */
function getClientIp(req) {
  const cf = req.headers['cf-connecting-ip'];
  if (typeof cf === 'string' && cf.trim()) return cf.trim();
  return req.ip || '';
}

/** Parse a money amount defensively: finite, non-negative, capped. */
function parseAmount(value) {
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 1_000_000);
}

/** Strip secrets before persisting/forwarding raw postback params. */
function redactParams(query) {
  const clone = { ...(query || {}) };
  delete clone.secret;
  return clone;
}

/** Minimal in-memory fixed-window rate limiter (no external dependency). */
function createRateLimiter({ windowMs, max, name }) {
  const hits = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now > entry.reset) hits.delete(key);
    }
  }, windowMs);
  if (typeof timer.unref === 'function') timer.unref();

  return (req, res, next) => {
    const key = `${name}:${getClientIp(req) || 'unknown'}`;
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || now > entry.reset) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(key, entry);
    }
    entry.count++;
    if (entry.count > max) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    next();
  };
}

// In-memory storage for demo (use Redis/DB in production)
const postbackStore = new Map();
const premiumActivations = new Map();
const verificationRequests = new Map(); // Store manual verification requests

// Max entries per Map to prevent OOM
const MAX_MAP_SIZE = 10000;
const MAP_ENTRY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Periodic cleanup every 30 minutes — evict old entries
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [store, label] of [[postbackStore, 'postbackStore'], [premiumActivations, 'premiumActivations'], [verificationRequests, 'verificationRequests']]) {
    // Evict entries older than MAX_AGE
    for (const [key, val] of store) {
      const ts = val.timestamp || val.activatedAt || val.createdAt;
      if (ts && (now - new Date(ts).getTime()) > MAP_ENTRY_MAX_AGE_MS) {
        store.delete(key);
        cleaned++;
      }
    }
    // Hard cap: if still over limit, remove oldest entries
    if (store.size > MAX_MAP_SIZE) {
      const excess = store.size - MAX_MAP_SIZE;
      const keys = store.keys();
      for (let i = 0; i < excess; i++) {
        store.delete(keys.next().value);
      }
      cleaned += excess;
    }
  }
  if (cleaned > 0) {
    console.log(`[CLEANUP] Evicted ${cleaned} stale entries from in-memory stores`);
  }
}, 30 * 60 * 1000);

// Trust a bounded number of proxy hops so req.ip reflects the real client.
app.set('trust proxy', CONFIG.TRUST_PROXY_HOPS);

// Restrict CORS to an explicit allowlist. With no allowlist configured, browser
// cross-origin requests are rejected (same-origin nginx proxy still works).
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true); // non-browser / same-origin / server-to-server
    if (CONFIG.ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
}));

app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));

// Global rate limit (generous); sensitive routes get stricter limits below.
app.use(createRateLimiter({ windowMs: 60 * 1000, max: 300, name: 'global' }));
const sensitiveLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 30, name: 'sensitive' });

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - IP: ${getClientIp(req)}`);
  next();
});

// ============================================
// GEO DETECTION & CLOAKING MIDDLEWARE
// ============================================

/**
 * Get geo info for IP address
 */
function getGeoInfo(ip) {
  if (typeof ip !== 'string' || !ip) {
    return { country: 'UNKNOWN', region: '', city: '', isBlocked: false };
  }

  // Handle localhost/private IPs
  if (
    ip === '127.0.0.1' || ip === '::1' ||
    ip.startsWith('192.168.') || ip.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  ) {
    return { country: 'US', region: 'CA', city: 'Test City', isBlocked: false };
  }

  const geo = geoip.lookup(ip);
  if (!geo) {
    return { country: 'UNKNOWN', region: '', city: '', isBlocked: false };
  }

  return {
    country: geo.country,
    region: geo.region,
    city: geo.city,
    timezone: geo.timezone,
    isBlocked: CONFIG.BLOCKED_COUNTRIES.includes(geo.country),
  };
}

/**
 * Geo detection endpoint
 * Frontend calls this to determine if cloaking is needed
 */
app.get('/api/geo', (req, res) => {
  const clientIp = getClientIp(req);
  const geoInfo = getGeoInfo(clientIp);

  res.json({
    ip: clientIp,
    ...geoInfo,
    mirrorUrl: geoInfo.isBlocked ? CONFIG.MIRROR_DOMAIN : null,
    bookmakerAvailable: !geoInfo.isBlocked,
  });
});

// ============================================
// POSTBACK ENDPOINT FOR BOOKMAKER
// ============================================

/**
 * Generate unique click ID for user tracking
 * Called when user clicks affiliate link
 */
app.get('/api/click', sensitiveLimiter, (req, res) => {
  const { userId, source } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const clickId = uuidv4();
  const timestamp = new Date().toISOString();

  // Store click info for later postback matching
  postbackStore.set(clickId, {
    userId,
    source: source || 'direct',
    timestamp,
    status: 'clicked',
    deposits: [],
  });

  console.log(`[CLICK] Generated clickId: ${clickId} for user: ${userId}`);

  res.json({
    clickId,
    affiliateLink: `https://${CONFIG.BOOKMAKER_NAME.toLowerCase()}.com/?clickId=${clickId}&aff=${CONFIG.BOOKMAKER_AFFILIATE_ID}`,
  });
});

const qualifyingGenericStatuses = ['deposit', 'first_deposit', 'ftd', 'qualified', 'lead', 'sale', 'confirmed'];

/**
 * Core generic-postback processing, shared by the GET and POST routes.
 * Authentication (secret) MUST be verified before this is called.
 */
async function processGenericPostback(query) {
  const {
    click_id,
    clickId,
    status,
    event,
    amount,
    payout,
    currency,
    user_id,
    external_id,
    sub_id_10,
  } = query;

  const actualClickId = click_id || clickId;
  const actualStatus = status || event;
  const actualAmount = amount || payout;

  console.log(`[POSTBACK] Received: click_id=${actualClickId}, user_id=${user_id}, external_id=${external_id}, sub_id_10=${sub_id_10}, status=${actualStatus}, amount=${actualAmount}`);

  const clickRecord = actualClickId ? postbackStore.get(actualClickId) : null;
  const userId = clickRecord?.userId || external_id || sub_id_10 || user_id;

  if (!userId) {
    console.log(`[POSTBACK] No userId found (click_id=${actualClickId}, user_id=${user_id}) - ignoring`);
    return;
  }

  console.log(`[POSTBACK] Resolved userId: ${userId} (from ${clickRecord ? 'click record' : 'tracking param'})`);

  if (clickRecord) {
    clickRecord.status = actualStatus;
    if (actualAmount) {
      clickRecord.deposits.push({
        amount: parseAmount(actualAmount),
        currency: currency || 'USD',
        timestamp: new Date().toISOString(),
        bookmakerId: user_id,
      });
    }
    postbackStore.set(actualClickId, clickRecord);
  } else {
    const recordKey = `direct_${userId}_${Date.now()}`;
    postbackStore.set(recordKey, {
      userId,
      source: 'keitaro_direct',
      timestamp: new Date().toISOString(),
      status: actualStatus,
      deposits: actualAmount ? [{
        amount: parseAmount(actualAmount),
        currency: currency || 'USD',
        timestamp: new Date().toISOString(),
      }] : [],
    });
  }

  if (qualifyingGenericStatuses.includes(actualStatus?.toLowerCase())) {
    console.log(`[POSTBACK] Qualifying event (${actualStatus})! Activating Premium for user: ${userId}`);
    try {
      await activatePremium(userId, {
        clickId: actualClickId,
        depositAmount: parseAmount(actualAmount),
        currency: currency || 'USD',
        source: clickRecord ? 'bookmaker_postback' : 'keitaro_direct',
      });

      if (clickRecord) {
        clickRecord.premiumActivated = true;
        clickRecord.premiumActivatedAt = new Date().toISOString();
        postbackStore.set(actualClickId, clickRecord);
      }
      console.log(`[POSTBACK] Premium activated for user: ${userId}`);
    } catch (error) {
      console.error('[POSTBACK] Failed to activate Premium:', error.message);
    }
  }

  logPostback({
    user_id: userId,
    source: 'generic',
    click_id: actualClickId,
    event: actualStatus,
    amount: actualAmount != null ? parseAmount(actualAmount) : null,
    currency: currency || 'USD',
    premium_activated: clickRecord?.premiumActivated || false,
    raw_params: JSON.stringify(redactParams(query)),
  });
}

/**
 * Postback endpoint - called by bookmaker when user makes deposit
 */
app.get('/api/postback', sensitiveLimiter, async (req, res) => {
  if (!secretsMatch(extractSecret(req), CONFIG.POSTBACK_SECRET)) {
    console.log('[POSTBACK] Missing or invalid secret');
    return res.status(403).json({ error: 'Invalid secret' });
  }
  await processGenericPostback(req.query);
  res.status(200).send('OK');
});

/**
 * Alternative POST endpoint for postbacks
 */
app.post('/api/postback', sensitiveLimiter, async (req, res) => {
  if (!secretsMatch(extractSecret(req), CONFIG.POSTBACK_SECRET)) {
    console.log('[POSTBACK] Missing or invalid secret');
    return res.status(403).json({ error: 'Invalid secret' });
  }
  // Merge body params over query so either transport works.
  await processGenericPostback({ ...req.query, ...req.body });
  res.status(200).send('OK');
});

/**
 * Log postback event to main API database for debugging
 */
async function logPostback(data) {
  try {
    const baseUrl = new URL(CONFIG.MAIN_API_URL).origin;
    await fetch(`${baseUrl}/api/v1/postbacks/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': CONFIG.POSTBACK_SECRET,
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    console.error('[LOG] Failed to log postback:', err.message);
  }
}

/**
 * Activate Premium for user
 */
async function activatePremium(userId, depositInfo) {
  console.log(`[PREMIUM] Activating for user: ${userId}`, depositInfo);

  // Store activation record
  premiumActivations.set(userId, {
    activatedAt: new Date().toISOString(),
    depositInfo,
    expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days
  });

  // Call main API to update user's premium status
  try {
    const response = await fetch(`${CONFIG.MAIN_API_URL}/users/${userId}/premium`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': CONFIG.POSTBACK_SECRET,
      },
      body: JSON.stringify({
        premium: true,
        source: 'bookmaker_deposit',
        depositAmount: depositInfo.depositAmount,
        currency: depositInfo.currency,
        expiresAt: premiumActivations.get(userId).expiresAt,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`);
    }

    console.log(`[PREMIUM] Successfully activated via main API for user: ${userId}`);
  } catch (error) {
    console.error(`[PREMIUM] Failed to call main API: ${error.message}`);
    // Premium is still stored locally, will be synced later
  }

  return true;
}

/**
 * Check if user has Premium (for local verification)
 */
app.get('/api/premium/check/:userId', (req, res) => {
  const { userId } = req.params;
  const activation = premiumActivations.get(userId);

  if (!activation) {
    return res.json({ isPremium: false });
  }

  const isExpired = new Date(activation.expiresAt) < new Date();

  res.json({
    isPremium: !isExpired,
    activatedAt: activation.activatedAt,
    expiresAt: activation.expiresAt,
    source: 'bookmaker_deposit',
  });
});

// ============================================
// MANUAL VERIFICATION ENDPOINTS
// ============================================

/** Admin auth guard: validates ADMIN_SECRET via header or query, constant-time. */
function requireAdmin(req, res, next) {
  if (!secretsMatch(extractSecret(req), CONFIG.ADMIN_SECRET)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  next();
}

/**
 * Submit verification request (for existing bookmaker accounts)
 */
app.post('/api/verification/request', sensitiveLimiter, (req, res) => {
  const { userId, email, bookmakerId, bookmaker } = req.body;

  if (!userId || !bookmakerId) {
    return res.status(400).json({ error: 'userId and bookmakerId are required' });
  }

  const requestId = `ver_${Date.now()}_${userId}`;
  const request = {
    id: requestId,
    userId,
    email,
    bookmakerId,
    bookmaker: bookmaker || 'unknown',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  verificationRequests.set(requestId, request);
  console.log(`[VERIFICATION] New request: ${requestId} for user ${userId}, bookmaker ID: ${bookmakerId}`);

  res.json({ success: true, requestId });
});

/**
 * Get all verification requests (admin only)
 */
app.get('/api/admin/verifications', requireAdmin, (req, res) => {
  const requests = Array.from(verificationRequests.values())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ count: requests.length, requests });
});

/**
 * Approve verification request (admin only)
 */
app.post('/api/admin/verifications/:requestId/approve', requireAdmin, async (req, res) => {
  const { requestId } = req.params;

  const request = verificationRequests.get(requestId);
  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }

  try {
    await activatePremium(request.userId, {
      source: 'manual_verification',
      bookmakerId: request.bookmakerId,
      bookmaker: request.bookmaker,
      verificationId: requestId,
    });

    request.status = 'approved';
    request.updatedAt = new Date().toISOString();
    verificationRequests.set(requestId, request);

    console.log(`[VERIFICATION] Approved: ${requestId} for user ${request.userId}`);
    res.json({ success: true, request });
  } catch (error) {
    console.error(`[VERIFICATION] Failed to approve: ${error.message}`);
    res.status(500).json({ error: 'Failed to activate premium' });
  }
});

/**
 * Reject verification request (admin only)
 */
app.post('/api/admin/verifications/:requestId/reject', requireAdmin, (req, res) => {
  const { requestId } = req.params;
  const { reason } = req.body;

  const request = verificationRequests.get(requestId);
  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }

  request.status = 'rejected';
  request.reason = reason || 'Verification failed';
  request.updatedAt = new Date().toISOString();
  verificationRequests.set(requestId, request);

  console.log(`[VERIFICATION] Rejected: ${requestId} for user ${request.userId}`);
  res.json({ success: true, request });
});

// ============================================
// PROXY / CLOAKING ENDPOINTS
// ============================================

/**
 * Get appropriate bookmaker link based on user's geo
 */
app.get('/api/bookmaker/link', (req, res) => {
  const { userId, campaign } = req.query;
  const clientIp = getClientIp(req);
  const geoInfo = getGeoInfo(clientIp);

  // Generate click ID
  const clickId = uuidv4();

  if (userId) {
    postbackStore.set(clickId, {
      userId,
      source: campaign || 'direct',
      timestamp: new Date().toISOString(),
      status: 'clicked',
      geo: geoInfo,
      deposits: [],
    });
  }

  // If user is from blocked country, provide mirror or redirect to safe page
  if (geoInfo.isBlocked) {
    console.log(`[CLOAKING] Blocked country detected: ${geoInfo.country} - providing mirror`);

    res.json({
      success: true,
      isBlocked: true,
      country: geoInfo.country,
      link: `${CONFIG.MIRROR_DOMAIN}/?clickId=${clickId}&aff=${CONFIG.BOOKMAKER_AFFILIATE_ID}`,
      message: 'Using alternative link for your region',
    });
  } else {
    res.json({
      success: true,
      isBlocked: false,
      country: geoInfo.country,
      link: `https://${CONFIG.BOOKMAKER_NAME.toLowerCase()}.com/?clickId=${clickId}&aff=${CONFIG.BOOKMAKER_AFFILIATE_ID}`,
      clickId,
    });
  }
});

// Hosts the proxy is allowed to reach (bookmaker domain + mirror only).
function buildProxyAllowlist() {
  const hosts = new Set();
  try { hosts.add(new URL(`https://${CONFIG.BOOKMAKER_NAME.toLowerCase()}.com`).host); } catch { /* ignore */ }
  try { hosts.add(new URL(CONFIG.MIRROR_DOMAIN).host); } catch { /* ignore */ }
  return hosts;
}
const PROXY_ALLOWED_HOSTS = buildProxyAllowlist();
const PROXY_ALLOWED_METHODS = new Set(['GET', 'POST']);

/**
 * Proxy endpoint for making requests to bookmaker API
 * Useful for bypassing CORS and geo-blocks. Restricted to allowlisted hosts only.
 */
app.all('/api/proxy/*', sensitiveLimiter, async (req, res) => {
  if (!PROXY_ALLOWED_METHODS.has(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const targetPath = req.params[0] || '';
  // Reject anything that could escape the intended host or change scheme.
  if (/[\\@]|\.\.|:\/\/|[\x00-\x1f]/.test(targetPath) || targetPath.startsWith('/')) {
    return res.status(400).json({ error: 'Invalid proxy path' });
  }

  const clientIp = getClientIp(req);
  const geoInfo = getGeoInfo(clientIp);

  // Determine which domain to use based on geo
  const baseDomain = geoInfo.isBlocked ? CONFIG.MIRROR_DOMAIN : `https://${CONFIG.BOOKMAKER_NAME.toLowerCase()}.com`;

  let targetUrl;
  try {
    targetUrl = new URL(targetPath, baseDomain.endsWith('/') ? baseDomain : `${baseDomain}/`);
  } catch {
    return res.status(400).json({ error: 'Invalid proxy path' });
  }

  // Enforce scheme + host allowlist on the FINAL resolved URL (anti-SSRF).
  if (targetUrl.protocol !== 'https:' || !PROXY_ALLOWED_HOSTS.has(targetUrl.host)) {
    console.warn(`[PROXY] Blocked disallowed target: ${targetUrl.href}`);
    return res.status(400).json({ error: 'Target not allowed' });
  }

  console.log(`[PROXY] ${req.method} ${targetUrl.host}${targetUrl.pathname} from: ${geoInfo.country}`);

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': req.headers['user-agent'] || 'BettingBot/1.0',
        // Set XFF from the verified client IP — never forward an attacker-supplied chain.
        'X-Forwarded-For': clientIp,
      },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined,
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.text();

    res.status(response.status)
       .set('Content-Type', response.headers.get('content-type') || 'text/plain')
       .send(data);

  } catch (error) {
    console.error(`[PROXY] Error: ${error.message}`);
    // Do not leak internal error detail (hostnames, DNS, timeouts) to the client.
    res.status(502).json({ error: 'Proxy error' });
  }
});

// ============================================
// KEITARO POSTBACK ENDPOINT
// ============================================

const qualifyingKeitaroStatuses = ['lead', 'sale', 'deposit', 'ftd', 'confirmed'];

/**
 * Core Keitaro-postback processing, shared by the GET and POST routes.
 * Authentication (secret) MUST be verified before this is called.
 */
async function processKeitaroPostback(query) {
  const { subid, status, payout, currency, sub1, sub2, sub3, sub4, sub5, sub10, external_id } = query;

  console.log(`[KEITARO POSTBACK] Received: subid=${subid}, status=${status}, payout=${payout}, sub2=${sub2}, sub10=${sub10}, external_id=${external_id}`);

  const userId = sub10 || external_id || sub2;

  if (!userId) {
    console.log('[KEITARO POSTBACK] Missing userId (sub10/external_id/sub2) - ignoring postback');
    return;
  }

  const postbackRecord = {
    userId,
    keitaroSubid: subid,
    status,
    payout: payout ? parseAmount(payout) : null,
    currency: currency || 'EUR',
    campaign: sub1,
    sub3,
    sub4,
    sub5,
    timestamp: new Date().toISOString(),
    source: 'keitaro',
  };

  const recordKey = subid || `${userId}_${status}_${Date.now()}`;
  postbackStore.set(`keitaro_${recordKey}`, postbackRecord);

  console.log(`[KEITARO POSTBACK] Stored record: keitaro_${recordKey}`);

  if (qualifyingKeitaroStatuses.includes(status?.toLowerCase())) {
    const payoutAmount = parseAmount(payout);

    console.log(`[KEITARO POSTBACK] Qualifying conversion (${status})! Activating Premium for user: ${userId}`);

    try {
      await activatePremium(userId, {
        source: 'keitaro',
        keitaroSubid: subid,
        status,
        payout: payoutAmount,
        depositAmount: payoutAmount,
        currency: currency || 'EUR',
        campaign: sub1,
      });

      postbackRecord.premiumActivated = true;
      postbackRecord.premiumActivatedAt = new Date().toISOString();
      postbackStore.set(`keitaro_${recordKey}`, postbackRecord);

      console.log(`[KEITARO POSTBACK] Premium activated for user: ${userId}`);
    } catch (error) {
      console.error('[KEITARO POSTBACK] Failed to activate Premium:', error.message);
      postbackRecord.premiumActivated = false;
      postbackRecord.error = error.message;
      postbackStore.set(`keitaro_${recordKey}`, postbackRecord);
    }
  } else {
    console.log(`[KEITARO POSTBACK] Non-qualifying status (${status}) - no premium activation`);
  }

  logPostback({
    user_id: userId,
    source: 'keitaro',
    click_id: subid,
    event: status,
    amount: payout != null ? parseAmount(payout) : null,
    currency: currency || 'EUR',
    premium_activated: postbackRecord.premiumActivated || false,
    error: postbackRecord.error,
    raw_params: JSON.stringify(redactParams(query)),
  });
}

/**
 * Keitaro Postback endpoint (GET). Requires a valid secret (KEITARO_SECRET).
 * Configure in Keitaro by appending &secret=<value> to the postback URL.
 */
app.get('/api/keitaro/postback', sensitiveLimiter, async (req, res) => {
  if (!secretsMatch(extractSecret(req), CONFIG.KEITARO_SECRET)) {
    console.log('[KEITARO POSTBACK] Missing or invalid secret');
    return res.status(403).json({ error: 'Invalid secret' });
  }
  await processKeitaroPostback(req.query);
  res.status(200).send('OK'); // Keitaro expects a simple OK
});

/**
 * Keitaro Postback POST endpoint (alternative). Requires a valid secret.
 */
app.post('/api/keitaro/postback', sensitiveLimiter, async (req, res) => {
  if (!secretsMatch(extractSecret(req), CONFIG.KEITARO_SECRET)) {
    console.log('[KEITARO POSTBACK] Missing or invalid secret');
    return res.status(403).json({ error: 'Invalid secret' });
  }
  await processKeitaroPostback({ ...req.query, ...req.body });
  res.status(200).send('OK');
});

// ============================================
// ADMIN / DEBUG ENDPOINTS
// ============================================

/**
 * View all postback records (admin only)
 */
app.get('/api/admin/postbacks', requireAdmin, (req, res) => {
  const records = Array.from(postbackStore.entries()).map(([clickId, data]) => ({
    clickId,
    ...data,
  }));

  res.json({ count: records.length, records });
});

/**
 * View all premium activations (admin only)
 */
app.get('/api/admin/premiums', requireAdmin, (req, res) => {
  const records = Array.from(premiumActivations.entries()).map(([userId, data]) => ({
    userId,
    ...data,
  }));

  res.json({ count: records.length, records });
});

/**
 * Test postback manually (for testing)
 */
app.get('/api/admin/test-postback', requireAdmin, async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  // Create a test click
  const clickId = uuidv4();
  postbackStore.set(clickId, {
    userId,
    source: 'test',
    timestamp: new Date().toISOString(),
    status: 'clicked',
    deposits: [],
  });

  console.log(`[TEST] Simulating postback for user: ${userId}`);

  const clickRecord = postbackStore.get(clickId);
  clickRecord.status = 'first_deposit';
  clickRecord.deposits.push({ amount: 100, currency: 'USD', timestamp: new Date().toISOString() });

  await activatePremium(userId, { clickId, depositAmount: 100, currency: 'USD' });

  res.json({
    success: true,
    message: 'Test postback processed',
    clickId,
    userId,
  });
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    config: {
      bookmaker: CONFIG.BOOKMAKER_NAME,
      blockedCountries: CONFIG.BLOCKED_COUNTRIES,
    }
  });
});

// Default route
app.get('/', (req, res) => {
  res.json({
    name: 'Betting Bot Server',
    version: '1.0.0',
    endpoints: {
      geo: 'GET /api/geo - Get geo info for current IP',
      click: 'GET /api/click?userId=xxx - Generate affiliate click ID',
      postback: 'GET/POST /api/postback - Bookmaker postback endpoint (requires secret)',
      keitaroPostback: 'GET/POST /api/keitaro/postback?...&secret=xxx (requires secret)',
      premiumCheck: 'GET /api/premium/check/:userId - Check premium status',
      bookmakerLink: 'GET /api/bookmaker/link?userId=xxx - Get bookmaker link with cloaking',
      proxy: 'GET/POST /api/proxy/* - Proxy requests to bookmaker (allowlisted hosts only)',
    },
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`
  ==========================================
  Betting Bot Server running on port ${PORT}
  ==========================================

  Postback URL for bookmaker (append &secret=<POSTBACK_SECRET>):
  https://your-domain.com/api/postback?click_id={click_id}&status={status}&amount={amount}&currency={currency}&secret=<secret>

  KEITARO Postback URL (append &secret=<KEITARO_SECRET>; use sub10 or external_id for userId):
  https://your-domain.com/api/keitaro/postback?subid={subid}&status={status}&payout={payout}&sub10={sub_id_10}&external_id={external_id}&secret=<secret>

  Blocked countries: ${CONFIG.BLOCKED_COUNTRIES.join(', ')}

  Admin endpoints (require ADMIN_SECRET via X-Admin-Secret header or ?secret=):
  - GET /api/admin/postbacks
  - GET /api/admin/premiums
  - GET /api/admin/test-postback?userId=xxx
  `);
});

// Graceful shutdown handling
const shutdown = (signal) => {
  console.log(`\n[SHUTDOWN] Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    console.log('[SHUTDOWN] Server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.log('[SHUTDOWN] Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
