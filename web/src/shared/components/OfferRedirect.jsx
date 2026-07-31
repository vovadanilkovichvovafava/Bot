import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthContext';
import { useAdvertiser } from '../context/AdvertiserContext';
import { getTrackingLink } from '../../features/betting/services/trackingService';
import { track } from '../services/analytics';
import FootballSpinner from './FootballSpinner';

/**
 * Stands in for the old /promo and /pro-access pages.
 *
 * Vlad on 31.07, with a screenshot of the promo page still showing up:
 * "все еще попадается такое игрокам… я бы просто страницы промо и pro-access
 * [убрал]". Roughly forty buttons across the app navigated to those two
 * routes, so unpicking them one by one was how a few got missed the first
 * time. Intercepting at the router covers every path at once, including any
 * added later.
 *
 * The visitor goes straight to the bookmaker instead of reading a page.
 * The `banner` query param that each button already passed is kept, so deposit
 * attribution in the admin panel keeps working exactly as before.
 */
export default function OfferRedirect({ reason = 'promo_page' }) {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const { trackClick } = useAdvertiser();
  const navigate = useNavigate();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const banner = params.get('banner') || params.get('feature') || reason;
    track('offer_redirect', { banner, reason });
    trackClick?.(user?.id, banner);

    const href = getTrackingLink(user?.id, banner, user?.funnel);
    if (href) {
      // Same tab on purpose: this render is no longer inside the click that
      // started it, so window.open would be eaten by the popup blocker.
      window.location.replace(href);
      return;
    }

    // No link to send them to (no user id yet, offer not configured) — bounce
    // home rather than leave someone staring at a blank screen.
    navigate('/', { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gray-900">
      <FootballSpinner />
    </div>
  );
}
