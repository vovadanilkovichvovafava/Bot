/**
 * Country taken from the ?offer= / ?geo= tag on the incoming partner link.
 *
 * Language, currency and flags are otherwise decided by a third-party GeoIP
 * lookup. That is fine for organic visits, but on bought traffic the buyer
 * already told us the geo in the link — trusting the tag means a Brazilian
 * lands on the Brazilian screen even when the GeoIP service is rate-limited,
 * slow, or looking at a VPN exit somewhere else.
 *
 * The tag is stashed in sessionStorage by persistTrackingParams (App.jsx), so
 * it survives the redirect through registration.
 */
export const OFFER_TAG_TO_COUNTRY = {
  br: 'BR',
  pt: 'PT',
  es: 'ES',
  ar: 'AR',
};

export function countryFromOfferTag() {
  try {
    const p = new URLSearchParams(window.location.search);
    const tag = (
      p.get('offer') || p.get('geo') ||
      sessionStorage.getItem('tracking_offer') || sessionStorage.getItem('tracking_geo') || ''
    ).trim().toLowerCase();
    return OFFER_TAG_TO_COUNTRY[tag] || '';
  } catch {
    return '';
  }
}
