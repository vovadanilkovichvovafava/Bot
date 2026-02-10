import { createContext, useContext, useState, useEffect } from 'react';
import { getAdvertiser, DEFAULT_ADVERTISER } from '../config/advertisers';

const AdvertiserContext = createContext(null);

// Free GeoIP services (fallback chain)
const GEOIP_SERVICES = [
  {
    url: 'https://ipapi.co/json/',
    getCountry: (data) => data.country_code,
  },
  {
    url: 'https://ip-api.com/json/?fields=countryCode',
    getCountry: (data) => data.countryCode,
  },
  {
    url: 'https://ipwho.is/',
    getCountry: (data) => data.country_code,
  },
];

export function AdvertiserProvider({ children }) {
  const [advertiser, setAdvertiser] = useState(() => {
    // Try to get cached advertiser first
    const cached = localStorage.getItem('advertiser');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // ignore
      }
    }
    return DEFAULT_ADVERTISER;
  });

  const [countryCode, setCountryCode] = useState(() => {
    return localStorage.getItem('countryCode') || null;
  });

  const [loading, setLoading] = useState(!countryCode);

  useEffect(() => {
    // If we already have country code, don't fetch again
    if (countryCode) {
      const adv = getAdvertiser(countryCode);
      setAdvertiser(adv);
      return;
    }

    // Detect user's country
    detectCountry();
  }, []);

  async function detectCountry() {
    setLoading(true);

    // Try each GeoIP service until one works
    for (const service of GEOIP_SERVICES) {
      try {
        const response = await fetch(service.url, { timeout: 5000 });
        if (!response.ok) continue;

        const data = await response.json();
        const code = service.getCountry(data);

        if (code) {
          setCountryCode(code);
          localStorage.setItem('countryCode', code);

          const adv = getAdvertiser(code);
          setAdvertiser(adv);
          localStorage.setItem('advertiser', JSON.stringify(adv));

          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn(`GeoIP service ${service.url} failed:`, err.message);
        continue;
      }
    }

    // All services failed, use default
    setAdvertiser(DEFAULT_ADVERTISER);
    localStorage.setItem('advertiser', JSON.stringify(DEFAULT_ADVERTISER));
    setLoading(false);
  }

  // Manual override for testing
  function setCountry(code) {
    setCountryCode(code);
    localStorage.setItem('countryCode', code);

    const adv = getAdvertiser(code);
    setAdvertiser(adv);
    localStorage.setItem('advertiser', JSON.stringify(adv));
  }

  // Track click with user ID for postback matching
  function trackClick(userId) {
    const clickId = `${userId}_${Date.now()}`;
    localStorage.setItem('lastClickId', clickId);

    // Build tracking link with user ID
    const trackingLink = advertiser.link.includes('?')
      ? `${advertiser.link}&clickid=${clickId}&uid=${userId}`
      : `${advertiser.link}?clickid=${clickId}&uid=${userId}`;

    return trackingLink;
  }

  return (
    <AdvertiserContext.Provider value={{
      advertiser,
      countryCode,
      loading,
      setCountry,
      trackClick,
    }}>
      {children}
    </AdvertiserContext.Provider>
  );
}

export function useAdvertiser() {
  const context = useContext(AdvertiserContext);
  if (!context) {
    throw new Error('useAdvertiser must be used within AdvertiserProvider');
  }
  return context;
}

export default AdvertiserContext;
