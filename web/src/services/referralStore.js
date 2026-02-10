import api from '../api';

/**
 * Get referral link from code
 */
export function getReferralLink(code) {
  const baseUrl = window.location.origin;
  return `${baseUrl}/register?ref=${code}`;
}

/**
 * Check if user was referred (from URL or session)
 */
export function getReferredBy() {
  const urlParams = new URLSearchParams(window.location.search);
  const ref = urlParams.get('ref');
  if (ref) {
    // Store the referral code for later use (during registration)
    try {
      sessionStorage.setItem('referral_code', ref);
    } catch {}
  }
  try {
    return ref || sessionStorage.getItem('referral_code');
  } catch {
    return ref || null;
  }
}

/**
 * Clear stored referral code after registration
 */
export function clearReferralCode() {
  try {
    sessionStorage.removeItem('referral_code');
  } catch {}
}

/**
 * Get referral stats from backend
 */
export async function getReferralStats() {
  try {
    const data = await api.getReferralStats();
    return {
      code: data.code,
      totalReferrals: data.total_referrals,
      activeReferrals: data.active_referrals,
      freeRequests: data.bonus_requests,
    };
  } catch (error) {
    console.error('Failed to get referral stats:', error);
    return null;
  }
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
  getReferralLink,
  getReferredBy,
  clearReferralCode,
  getReferralStats,
  copyReferralLink,
};
