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
  BOOKMAKER_AFFILIATE_ID: process.env.BOOKMAKER_AFFILIATE_ID || 'your_affiliate_id',

  // Main API backend
  MAIN_API_URL: process.env.MAIN_API_URL || 'https://appbot-production-152e.up.railway.app/api/v1',

  // Postback secret for verification
  POSTBACK_SECRET: process.env.POSTBACK_SECRET || 'your_postback_secret_key',

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
    secret
  } = req.query;

  const actualClickId = click_id || clickId;
  const actualStatus = status || event; // Support both status and event params
  const actualAmount = amount || payout; // Support both amount and payout params

  console.log(`[POSTBACK] Received: click_id=${actualClickId}, user_id=${user_id}, status=${actualStatus}, amount=${actualAmount}`);

  // Verify postback secret (optional but recommended)
  if (secret && secret !== CONFIG.POSTBACK_SECRET) {
    console.log('[POSTBACK] Invalid secret');
    return res.status(403).json({ error: 'Invalid secret' });
  }

  // Find the click record by click_id
  const clickRecord = actualClickId ? postbackStore.get(actualClickId) : null;

  // Determine userId: from click record or directly from user_id param (Keitaro sub_id_10 format)
  const userId = clickRecord?.userId || user_id;

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

  // Respond with OK (bookmaker expects simple response)
  res.status(200).send('OK');
});

/**
 * Alternative POST endpoint for postbacks
 */
app.post('/api/postback', express.json(), async (req, res) => {
  const { click_id, clickId, status, event, amount, payout, currency, user_id, secret } = req.body;

  // Reuse GET logic - support both original and Keitaro param names
  req.query = { click_id, clickId, status, event, amount, payout, currency, user_id, secret };
  return app._router.handle(req, res, () => {});
});

// ============================================
// 1WIN POSTBACK ENDPOINT
// ============================================

/**
 * 1win Postback endpoint
 *
 * URL format: /api/1win/postback?event={event}&amount={amount}&sub1={sub1}&transaction_id={transaction_id}&country={country}
 *
 * Parameters:
 * - event: Event type (registration, deposit, first_deposit, withdrawal, etc.)
 * - amount: Transaction amount
 * - sub1: User ID (our tracking parameter)
 * - transaction_id: Unique transaction ID from 1win
 * - country: User's country code
 */
app.get('/api/1win/postback', async (req, res) => {
  const { event, amount, sub1, transaction_id, country } = req.query;

  console.log(`[1WIN POSTBACK] Received: event=${event}, amount=${amount}, sub1=${sub1}, transaction_id=${transaction_id}, country=${country}`);

  // sub1 is our user ID
  const userId = sub1;

  if (!userId) {
    console.log('[1WIN POSTBACK] Missing sub1 (userId)');
    return res.status(200).send('OK'); // Always return OK to the affiliate network
  }

  // Store postback record
  const postbackRecord = {
    userId,
    event,
    amount: amount ? parseFloat(amount) : null,
    transactionId: transaction_id,
    country,
    timestamp: new Date().toISOString(),
    source: '1win',
  };

  // Store with transaction_id as key for deduplication
  const recordKey = transaction_id || `${userId}_${event}_${Date.now()}`;
  postbackStore.set(`1win_${recordKey}`, postbackRecord);

  console.log(`[1WIN POSTBACK] Stored record: ${recordKey}`);

  // Check if this is a qualifying action for Premium activation
  // 1win events: registration, first_deposit (FTD), deposit, qualified_deposit, etc.
  const qualifyingEvents = ['deposit', 'first_deposit', 'ftd', 'qualified', 'qualified_deposit'];
  const MIN_DEPOSIT_FOR_PRO = 0; // Minimum deposit disabled for testing

  if (qualifyingEvents.includes(event?.toLowerCase())) {
    const depositAmount = parseFloat(amount) || 0;

    // Check minimum deposit requirement
    if (depositAmount < MIN_DEPOSIT_FOR_PRO) {
      console.log(`[1WIN POSTBACK] Deposit $${depositAmount} below minimum $${MIN_DEPOSIT_FOR_PRO} - PRO not activated for user: ${userId}`);
      postbackRecord.premiumActivated = false;
      postbackRecord.reason = `Deposit below minimum ($${MIN_DEPOSIT_FOR_PRO} required)`;
      postbackStore.set(`1win_${recordKey}`, postbackRecord);
    } else {
      console.log(`[1WIN POSTBACK] Qualifying deposit $${depositAmount}! Activating Premium for user: ${userId}`);

      try {
        // Activate Premium for the user
        await activatePremium(userId, {
          source: '1win',
          transactionId: transaction_id,
          depositAmount: amount,
          country,
          event,
        });

        postbackRecord.premiumActivated = true;
        postbackRecord.premiumActivatedAt = new Date().toISOString();
        postbackStore.set(`1win_${recordKey}`, postbackRecord);

        console.log(`[1WIN POSTBACK] Premium activated for user: ${userId}`);
      } catch (error) {
        console.error('[1WIN POSTBACK] Failed to activate Premium:', error.message);
      }
    }
  }

  // Always respond with OK to the affiliate network
  res.status(200).send('OK');
});

/**
 * 1win Postback POST endpoint (alternative)
 */
app.post('/api/1win/postback', async (req, res) => {
  // Support both query params and body
  const event = req.query.event || req.body.event;
  const amount = req.query.amount || req.body.amount;
  const sub1 = req.query.sub1 || req.body.sub1;
  const transaction_id = req.query.transaction_id || req.body.transaction_id;
  const country = req.query.country || req.body.country;

  req.query = { event, amount, sub1, transaction_id, country };

  // Forward to GET handler
  return app._router.handle({ ...req, method: 'GET' }, res, () => {});
});

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
    bookmaker: bookmaker || '1win',
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
  const { subid, status, payout, currency, sub1, sub2, sub3, sub4, sub5 } = req.query;

  console.log(`[KEITARO POSTBACK] Received: subid=${subid}, status=${status}, payout=${payout}, sub2=${sub2}`);

  // sub2 is our user ID
  const userId = sub2;

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

  req.query = { subid, status, payout, currency, sub1, sub2, sub3, sub4, sub5 };

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
      '1winPostback': 'GET/POST /api/1win/postback?event={event}&amount={amount}&sub1={sub1}&transaction_id={transaction_id}&country={country}',
      keitaroPostback: 'GET/POST /api/keitaro/postback?subid={subid}&status={status}&payout={payout}&sub2={sub2}',
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

  1WIN Postback URL:
  https://your-domain.com/api/1win/postback?event={event}&amount={amount}&sub1={sub1}&transaction_id={transaction_id}&country={country}

  KEITARO Postback URL:
  https://your-domain.com/api/keitaro/postback?subid={subid}&status={status}&payout={payout}&sub2={sub2}

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
