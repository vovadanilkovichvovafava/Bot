/**
 * Geo Detection & Cloaking Service
 * Handles geo detection and provides appropriate bookmaker links
 */

// Server URL (change this in production)
const GEO_SERVER_URL = import.meta.env.VITE_GEO_SERVER_URL || 'http://localhost:3001';

class GeoService {
  constructor() {
    this.geoInfo = null;
    this.geoPromise = null;
  }

  /**
   * Get geo information for current user
   * Caches the result for subsequent calls
   */
  async getGeoInfo() {
    if (this.geoInfo) return this.geoInfo;

    // Prevent multiple simultaneous requests
    if (this.geoPromise) return this.geoPromise;

    this.geoPromise = (async () => {
      try {
        const response = await fetch(`${GEO_SERVER_URL}/api/geo`);
        if (!response.ok) throw new Error('Geo fetch failed');
        this.geoInfo = await response.json();
        return this.geoInfo;
      } catch (error) {
        console.error('[GeoService] Error fetching geo info:', error);
        // Default to non-blocked
        return {
          country: 'UNKNOWN',
          isBlocked: false,
          bookmakerAvailable: true,
        };
      }
    })();

    return this.geoPromise;
  }

  /**
   * Check if user is from a blocked country
   */
  async isBlocked() {
    const geo = await this.getGeoInfo();
    return geo.isBlocked;
  }

  /**
   * Get appropriate bookmaker link with tracking
   * @param {string} userId - User ID for tracking
   * @param {string} campaign - Campaign source (optional)
   */
  async getBookmakerLink(userId, campaign = 'app') {
    try {
      const params = new URLSearchParams({ userId, campaign });
      const response = await fetch(`${GEO_SERVER_URL}/api/bookmaker/link?${params}`);

      if (!response.ok) throw new Error('Failed to get bookmaker link');

      return response.json();
    } catch (error) {
      console.error('[GeoService] Error getting bookmaker link:', error);
      // Fallback link without tracking
      return {
        success: false,
        link: 'https://1xbet.com',
        isBlocked: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate click ID for user tracking
   * @param {string} userId - User ID
   * @param {string} source - Click source
   */
  async generateClickId(userId, source = 'direct') {
    try {
      const params = new URLSearchParams({ userId, source });
      const response = await fetch(`${GEO_SERVER_URL}/api/click?${params}`);

      if (!response.ok) throw new Error('Failed to generate click ID');

      return response.json();
    } catch (error) {
      console.error('[GeoService] Error generating click ID:', error);
      return null;
    }
  }

  /**
   * Check user's premium status
   * @param {string} userId - User ID
   */
  async checkPremium(userId) {
    try {
      const response = await fetch(`${GEO_SERVER_URL}/api/premium/check/${userId}`);
      if (!response.ok) throw new Error('Failed to check premium');
      return response.json();
    } catch (error) {
      console.error('[GeoService] Error checking premium:', error);
      return { isPremium: false };
    }
  }

  /**
   * Clear cached geo info
   */
  clearCache() {
    this.geoInfo = null;
    this.geoPromise = null;
  }
}

export const geoService = new GeoService();
export default geoService;
