const STORAGE_KEY = 'pva_referral';

/**
 * Generate a unique referral code based on user ID
 */
export function generateReferralCode(userId) {
  if (!userId) return null;
  // Simple base36 encoding of user ID with prefix
  const code = `PVA${userId.toString(36).toUpperCase()}${Date.now().toString(36).slice(-4).toUpperCase()}`;
  return code;
}

/**
 * Get or create referral data for current user
 */
export function getReferralData(userId) {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (!data.code && userId) {
      data.code = generateReferralCode(userId);
      data.referrals = [];
      data.createdAt = new Date().toISOString();
      saveReferralData(data);
    }
    return data;
  } catch {
    return { code: null, referrals: [], createdAt: null };
  }
}

/**
 * Save referral data
 */
function saveReferralData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Get referral link
 */
export function getReferralLink(code) {
  const baseUrl = window.location.origin;
  return `${baseUrl}/register?ref=${code}`;
}

/**
 * Check if user was referred
 */
export function getReferredBy() {
  const urlParams = new URLSearchParams(window.location.search);
  const ref = urlParams.get('ref');
  if (ref) {
    // Store the referral code for later use (during registration)
    sessionStorage.setItem('referral_code', ref);
  }
  return ref || sessionStorage.getItem('referral_code');
}

/**
 * Add a referral (when someone registers with your code)
 */
export function addReferral(referralInfo) {
  const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  if (!data.referrals) data.referrals = [];
  data.referrals.push({
    ...referralInfo,
    date: new Date().toISOString(),
  });
  saveReferralData(data);
  return data;
}

/**
 * Get referral stats
 */
export function getReferralStats(userId) {
  const data = getReferralData(userId);
  const referrals = data.referrals || [];

  // Calculate bonus based on referrals
  const totalReferrals = referrals.length;
  const activeReferrals = referrals.filter(r => r.isActive).length;
  const premiumReferrals = referrals.filter(r => r.isPremium).length;

  // Rewards: 1 free AI request per referral, bonus for premium referrals
  const freeRequests = totalReferrals + (premiumReferrals * 5);

  return {
    code: data.code,
    totalReferrals,
    activeReferrals,
    premiumReferrals,
    freeRequests,
    referrals,
  };
}

/**
 * Copy referral link to clipboard
 */
export async function copyReferralLink(code) {
  const link = getReferralLink(code);
  try {
    await navigator.clipboard.writeText(link);
    return { success: true, link };
  } catch {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = link;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return { success: true, link };
    } catch {
      document.body.removeChild(textarea);
      return { success: false, link };
    }
  }
}

export default {
  generateReferralCode,
  getReferralData,
  getReferralLink,
  getReferredBy,
  addReferral,
  getReferralStats,
  copyReferralLink,
};
