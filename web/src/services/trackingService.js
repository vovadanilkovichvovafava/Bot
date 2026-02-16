/**
 * Tracking Service — взаимодействие с PostbackAPI для сохранения tracking параметров
 * и получения ссылок на букмекера со всеми sub_id.
 */

const TRACKING_API = 'https://postbackapi-production.up.railway.app';

/**
 * Сохранить fbclid и utm параметры из URL при первом заходе юзера.
 * Вызывается один раз при загрузке PWA.
 */
export async function saveTrackingParams(userId) {
  if (!userId) return;

  const urlParams = new URLSearchParams(window.location.search);
  const fbclid = urlParams.get('fbclid');
  const utm_source = urlParams.get('utm_source');
  const utm_medium = urlParams.get('utm_medium');
  const utm_campaign = urlParams.get('utm_campaign');
  const utm_content = urlParams.get('utm_content');
  const utm_term = urlParams.get('utm_term');

  // Если нет ни одного параметра — не отправляем
  if (!fbclid && !utm_source && !utm_medium && !utm_campaign && !utm_content && !utm_term) {
    return;
  }

  try {
    const body = { user_id: userId };
    if (fbclid) body.fbclid = fbclid;
    if (utm_source) body.utm_source = utm_source;
    if (utm_medium) body.utm_medium = utm_medium;
    if (utm_campaign) body.utm_campaign = utm_campaign;
    if (utm_content) body.utm_content = utm_content;
    if (utm_term) body.utm_term = utm_term;

    await fetch(`${TRACKING_API}/api/tracking/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    console.log('[Tracking] Params saved for', userId);
  } catch (err) {
    console.warn('[Tracking] Failed to save params:', err.message);
  }
}

/**
 * Получить ссылку на букмекера со всеми tracking параметрами (sub_id_10-16, pixel).
 * Вызывается при клике на баннер/CTA.
 */
export async function getTrackingLink(userId, banner = '') {
  if (!userId) return null;

  try {
    const params = new URLSearchParams({ user_id: userId });
    if (banner) params.append('banner', banner);

    const res = await fetch(`${TRACKING_API}/api/tracking/link?${params}`);
    const data = await res.json();

    if (data.status === 'ok') {
      console.log('[Tracking] Link generated:', data.link);
      return data.link;
    }
    return null;
  } catch (err) {
    console.warn('[Tracking] Failed to get link:', err.message);
    return null;
  }
}
