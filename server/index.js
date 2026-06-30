import express from 'express';
import cors from 'cors';
import geoip from 'geoip-lite';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration
const CONFIG = {
  // Bookmaker partner info
  BOOKMAKER_NAME: process.env.BOOKMAKER_NAME || '1xBet',
  BOOKMAKER_AFFILIATE_ID: process.env.BOOKMAKER_AFFILIATE_ID || (() => { throw new Error('BOOKMAKER_AFFILIATE_ID environment variable is not set'); })(),

  // Main API backend
  MAIN_API_URL: process.env.MAIN_API_URL || 'https://appbot-production-152e.up.railway.app/api/v1',

  // Postback secret for verification
  POSTBACK_SECRET: process.env.POSTBACK_SECRET || (() => { throw new Error('POSTBACK_SECRET environment variable is not set'); })(),

  // Countries where bookmaker is blocked (ISO 3166-1 alpha-2 codes)
  BLOCKED_COUNTRIES: (process.env.BLOCKED_COUNTRIES || 'RU,BY,UA,KZ,AZ,AM,GE,MD,KG,TJ,TM,UZ').split(','),

  // Alternative/mirror domains for cloaking
  MIRROR_DOMAIN: process.env.MIRROR_DOMAIN || 'https://1xbet-mirror.com',

  // Safe landing page for blocked countries
  SAFE_LANDING: process.env.SAFE_LANDING || '/blocked',
};

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

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - IP: ${clientIp}`);
  next();
});

// ============================================
// GEO DETECTION & CLOAKING MIDDLEWARE
// ============================================

/**
 * Get geo info for IP address
 */
function getGeoInfo(ip) {
  // Handle localhost/private IPs
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
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
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
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
app.get('/api/click', (req, res) => {
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

/**
 * Postback endpoint - called by bookmaker when user makes deposit
 *
 * Standard postback parameters:
 * - click_id: The click ID we generated
 * - status: registration, deposit, first_deposit, etc.
 * - amount: Deposit amount (if applicable)
 * - currency: Currency code
 * - user_id: Bookmaker's internal user ID (optional)
 */
app.get('/api/postback', async (req, res) => {
  const {
    click_id,
    clickId, // alternative param name
    status,
    event, // Keitaro alias for status
    amount,
    payout, // Keitaro alias for amount
    currency,
    user_id,
    external_id, // our tracking links set external_id = userId
    sub_id_10,   // our tracking links also set sub_id_10 = userId
    secret
  } = req.query;

  const actualClickId = click_id || clickId;
  const actualStatus = status || event; // Support both status and event params
  const actualAmount = amount || payout; // Support both amount and payout params

  console.log(`[POSTBACK] Received: click_id=${actualClickId}, user_id=${user_id}, external_id=${external_id}, sub_id_10=${sub_id_10}, status=${actualStatus}, amount=${actualAmount}`);

  // Verify postback secret (optional but recommended)
  if (secret && secret !== CONFIG.POSTBACK_SECRET) {
    console.log('[POSTBACK] Invalid secret');
    return res.status(403).json({ error: 'Invalid secret' });
  }

  // Find the click record by click_id
  const clickRecord = actualClickId ? postbackStore.get(actualClickId) : null;

  // Determine userId: from click record, or from tracking params (external_id, sub_id_10, user_id)
  const userId = clickRecord?.userId || external_id || sub_id_10 || user_id;

  if (!userId) {
    console.log(`[POSTBACK] No userId found (click_id=${actualClickId}, user_id=${user_id}) - ignoring`);
    return res.status(200).send('OK');
  }

  console.log(`[POSTBACK] Resolved userId: ${userId} (from ${clickRecord ? 'click record' : 'user_id param'})`);

  // Update click record if exists
  if (clickRecord) {
    clickRecord.status = actualStatus;
    if (actualAmount) {
      clickRecord.deposits.push({
        amount: parseFloat(actualAmount),
        currency: currency || 'USD',
        timestamp: new Date().toISOString(),
        bookmakerId: user_id,
      });
    }
    postbackStore.set(actualClickId, clickRecord);
  } else {
    // Store a new record for direct user_id postbacks (Keitaro format)
    const recordKey = `direct_${user_id}_${Date.now()}`;
    postbackStore.set(recordKey, {
      userId: user_id,
      source: 'keitaro_direct',
      timestamp: new Date().toISOString(),
      status: actualStatus,
      deposits: actualAmount ? [{
        amount: parseFloat(actualAmount),
        currency: currency || 'USD',
        timestamp: new Date().toISOString(),
      }] : [],
    });
  }

  // Check if this is a qualifying action for Premium activation
  const qualifyingStatuses = ['deposit', 'first_deposit', 'ftd', 'qualified', 'lead', 'sale', 'confirmed'];

  if (qualifyingStatuses.includes(actualStatus?.toLowerCase())) {
    console.log(`[POSTBACK] Qualifying event (${actualStatus})! Activating Premium for user: ${userId}`);

    try {
      // Activate Premium for the user
      await activatePremium(userId, {
        clickId: actualClickId,
        depositAmount: actualAmount,
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

  // Log postback to database
  logPostback({
    user_id: userId,
    source: 'generic',
    click_id: actualClickId,
    event: actualStatus,
    amount: actualAmount,
    currency: currency || 'USD',
    premium_activated: clickRecord?.premiumActivated || false,
    raw_params: JSON.stringify(req.query),
  });

  // Respond with OK (bookmaker expects simple response)
  res.status(200).send('OK');
});

/**
 * Alternative POST endpoint for postbacks
 */
app.post('/api/postback', express.json(), async (req, res) => {
  const { click_id, clickId, status, event, amount, payout, currency, user_id, external_id, sub_id_10, secret } = req.body;

  // Reuse GET logic - support both original and Keitaro param names
  req.query = { click_id, clickId, status, event, amount, payout, currency, user_id, external_id, sub_id_10, secret };
  return app._router.handle(req, res, () => {});
});

/**
 * Log postback event to main API database for debugging
 */
async function logPostback(data) {
  try {
    await fetch(`${CONFIG.MAIN_API_URL.replace('/users', '').replace('/api/v1', '/api/v1/postbacks')}/log`, {
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

/**
 * Submit verification request (for existing bookmaker accounts)
 */
app.post('/api/verification/request', (req, res) => {
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
app.get('/api/admin/verifications', (req, res) => {
  const { secret } = req.query;

  if (secret !== CONFIG.POSTBACK_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const requests = Array.from(verificationRequests.values())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ count: requests.length, requests });
});

/**
 * Approve verification request (admin only)
 */
app.post('/api/admin/verifications/:requestId/approve', async (req, res) => {
  const { secret } = req.query;
  const { requestId } = req.params;

  if (secret !== CONFIG.POSTBACK_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

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
app.post('/api/admin/verifications/:requestId/reject', (req, res) => {
  const { secret } = req.query;
  const { requestId } = req.params;
  const { reason } = req.body;

  if (secret !== CONFIG.POSTBACK_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

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
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
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

/**
 * Proxy endpoint for making requests to bookmaker API
 * Useful for bypassing CORS and geo-blocks
 */
app.all('/api/proxy/*', async (req, res) => {
  const targetPath = req.params[0];
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
  const geoInfo = getGeoInfo(clientIp);

  console.log(`[PROXY] Request to: ${targetPath} from: ${geoInfo.country}`);

  // Determine which domain to use based on geo
  const baseDomain = geoInfo.isBlocked ? CONFIG.MIRROR_DOMAIN : `https://${CONFIG.BOOKMAKER_NAME.toLowerCase()}.com`;
  const targetUrl = `${baseDomain}/${targetPath}`;

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': req.headers['user-agent'] || 'BettingBot/1.0',
        // Forward original IP for bookmaker's geo handling
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
    res.status(502).json({ error: 'Proxy error', message: error.message });
  }
});

// ============================================
// KEITARO POSTBACK ENDPOINT
// ============================================

/**
 * Keitaro Postback endpoint
 *
 * URL format: /api/keitaro/postback?subid={subid}&status={status}&payout={payout}&sub2={sub2}
 *
 * Parameters:
 * - subid: Keitaro click ID (unique click identifier)
 * - status: Conversion status (lead, sale, rejected, hold)
 * - payout: Payout amount
 * - currency: Currency (optional)
 * - sub2: User ID (our tracking parameter)
 * - sub1, sub3-sub5: Additional tracking params (optional)
 *
 * Configure in Keitaro:
 * Postback URL: https://your-server.com/api/keitaro/postback?subid={subid}&status={status}&payout={payout}&sub2={sub2}
 */
app.get('/api/keitaro/postback', async (req, res) => {
  const { subid, status, payout, currency, sub1, sub2, sub3, sub4, sub5, sub10, external_id } = req.query;

  console.log(`[KEITARO POSTBACK] Received: subid=${subid}, status=${status}, payout=${payout}, sub2=${sub2}, sub10=${sub10}, external_id=${external_id}`);

  // userId: our tracking links set external_id and sub_id_10 (Keitaro sends as sub10)
  // sub2 kept for backwards compatibility
  const userId = sub10 || external_id || sub2;

  if (!userId) {
    console.log('[KEITARO POSTBACK] Missing sub2 (userId) - ignoring postback');
    return res.status(200).send('OK'); // Always return OK to Keitaro
  }

  // Store postback record
  const postbackRecord = {
    userId,
    keitaroSubid: subid,
    status,
    payout: payout ? parseFloat(payout) : null,
    currency: currency || 'EUR',
    campaign: sub1, // sub1 for campaign/source tracking
    sub3,
    sub4,
    sub5,
    timestamp: new Date().toISOString(),
    source: 'keitaro',
  };

  // Store with subid as key for deduplication
  const recordKey = subid || `${userId}_${status}_${Date.now()}`;
  postbackStore.set(`keitaro_${recordKey}`, postbackRecord);

  console.log(`[KEITARO POSTBACK] Stored record: keitaro_${recordKey}`);

  // Check if this is a qualifying action for Premium activation
  // Keitaro statuses: lead, sale, rejected, hold
  const qualifyingStatuses = ['lead', 'sale', 'deposit', 'ftd', 'confirmed'];

  if (qualifyingStatuses.includes(status?.toLowerCase())) {
    const payoutAmount = parseFloat(payout) || 0;

    console.log(`[KEITARO POSTBACK] Qualifying conversion (${status})! Activating Premium for user: ${userId}`);

    try {
      // Activate Premium for the user
      await activatePremium(userId, {
        source: 'keitaro',
        keitaroSubid: subid,
        status,
        payout: payoutAmount,
        currency: currency || 'EUR',
        campaign: sub1, // sub1 for campaign/source tracking
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

  // Log postback to database
  logPostback({
    user_id: userId,
    source: 'keitaro',
    click_id: subid,
    event: status,
    amount: payout,
    currency: currency || 'EUR',
    premium_activated: postbackRecord.premiumActivated || false,
    error: postbackRecord.error,
    raw_params: JSON.stringify(req.query),
  });

  // Always respond with OK to Keitaro
  res.status(200).send('OK');
});

/**
 * Keitaro Postback POST endpoint (alternative)
 */
app.post('/api/keitaro/postback', async (req, res) => {
  // Support both query params and body
  const subid = req.query.subid || req.body.subid;
  const status = req.query.status || req.body.status;
  const payout = req.query.payout || req.body.payout;
  const currency = req.query.currency || req.body.currency;
  const sub1 = req.query.sub1 || req.body.sub1;
  const sub2 = req.query.sub2 || req.body.sub2;
  const sub3 = req.query.sub3 || req.body.sub3;
  const sub4 = req.query.sub4 || req.body.sub4;
  const sub5 = req.query.sub5 || req.body.sub5;
  const sub10 = req.query.sub10 || req.body.sub10;
  const external_id = req.query.external_id || req.body.external_id;

  req.query = { subid, status, payout, currency, sub1, sub2, sub3, sub4, sub5, sub10, external_id };

  // Forward to GET handler
  return app._router.handle({ ...req, method: 'GET' }, res, () => {});
});

// ============================================
// ADMIN / DEBUG ENDPOINTS
// ============================================

/**
 * View all postback records (admin only)
 */
app.get('/api/admin/postbacks', (req, res) => {
  const { secret } = req.query;

  if (secret !== CONFIG.POSTBACK_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const records = Array.from(postbackStore.entries()).map(([clickId, data]) => ({
    clickId,
    ...data,
  }));

  res.json({ count: records.length, records });
});

/**
 * View all premium activations (admin only)
 */
app.get('/api/admin/premiums', (req, res) => {
  const { secret } = req.query;

  if (secret !== CONFIG.POSTBACK_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const records = Array.from(premiumActivations.entries()).map(([userId, data]) => ({
    userId,
    ...data,
  }));

  res.json({ count: records.length, records });
});

/**
 * Test postback manually (for testing)
 */
app.get('/api/admin/test-postback', async (req, res) => {
  const { secret, userId } = req.query;

  if (secret !== CONFIG.POSTBACK_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

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

  // Simulate deposit postback
  req.query = { click_id: clickId, status: 'first_deposit', amount: '100', currency: 'USD' };

  console.log(`[TEST] Simulating postback for user: ${userId}`);

  // Manually process
  const clickRecord = postbackStore.get(clickId);
  clickRecord.status = 'first_deposit';
  clickRecord.deposits.push({ amount: 100, currency: 'USD', timestamp: new Date().toISOString() });

  await activatePremium(userId, { clickId, depositAmount: '100', currency: 'USD' });

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
      postback: 'GET/POST /api/postback - Bookmaker postback endpoint',
      keitaroPostback: 'GET/POST /api/keitaro/postback?subid={subid}&status={status}&payout={payout}&sub10={sub_id_10}&external_id={external_id}',
      premiumCheck: 'GET /api/premium/check/:userId - Check premium status',
      bookmakerLink: 'GET /api/bookmaker/link?userId=xxx - Get bookmaker link with cloaking',
      proxy: 'ALL /api/proxy/* - Proxy requests to bookmaker',
    },
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`
  ==========================================
  Betting Bot Server running on port ${PORT}
  ==========================================

  Postback URL for bookmaker:
  https://your-domain.com/api/postback?click_id={click_id}&status={status}&amount={amount}&currency={currency}

  KEITARO Postback URL (use sub10 or external_id for userId):
  https://your-domain.com/api/keitaro/postback?subid={subid}&status={status}&payout={payout}&sub10={sub_id_10}&external_id={external_id}

  Blocked countries: ${CONFIG.BLOCKED_COUNTRIES.join(', ')}

  Admin endpoints (require secret):
  - GET /api/admin/postbacks?secret=xxx
  - GET /api/admin/premiums?secret=xxx
  - GET /api/admin/test-postback?secret=xxx&userId=xxx
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
