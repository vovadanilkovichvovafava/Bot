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

  // Берём из URL, а если нет — из sessionStorage (сохранены до редиректа)
  const getParam = (key) => urlParams.get(key) || sessionStorage.getItem(`tracking_${key}`) || null;

  const fbclid = getParam('fbclid');
  const utm_source = getParam('utm_source');
  const utm_medium = getParam('utm_medium');
  const utm_campaign = getParam('utm_campaign');
  const utm_content = getParam('utm_content');
  const utm_term = getParam('utm_term');

  // Если нет ни одного параметра — не отправляем
  if (!fbclid && !utm_source && !utm_medium && !utm_campaign && !utm_content && !utm_term) {
    return;
  }

  // Очищаем sessionStorage после использования
  try {
    ['fbclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
      .forEach(key => sessionStorage.removeItem(`tracking_${key}`));
  } catch {}

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
 * Построить прямую ссылку на оффер со всеми tracking параметрами.
 * external_id = userId для отслеживания конверсий.
 */
const OFFER_BASE_URL = 'https://siteofficialred.com/KnSQ1M';

export function getTrackingLink(userId, banner = '') {
  if (!userId) return null;

  try {
    const params = new URLSearchParams();
    params.set('external_id', String(userId));
    if (banner) params.set('sub_id_1', banner);

    // Подтягиваем сохранённые tracking параметры из sessionStorage/URL
    const urlParams = new URLSearchParams(window.location.search);
    const getParam = (key) => urlParams.get(key) || sessionStorage.getItem(`tracking_${key}`) || '';

    const fbclid = getParam('fbclid');
    const utm_source = getParam('utm_source');
    const utm_medium = getParam('utm_medium');
    const utm_campaign = getParam('utm_campaign');
    const utm_content = getParam('utm_content');
    const utm_term = getParam('utm_term');

    if (fbclid) params.set('sub_id_2', fbclid);
    if (utm_source) params.set('sub_id_3', utm_source);
    if (utm_medium) params.set('sub_id_4', utm_medium);
    if (utm_campaign) params.set('sub_id_5', utm_campaign);
    if (utm_content) params.set('sub_id_6', utm_content);
    if (utm_term) params.set('sub_id_7', utm_term);

    const link = `${OFFER_BASE_URL}?${params.toString()}`;
    console.log('[Tracking] Link built:', link);
    return link;
  } catch (err) {
    console.warn('[Tracking] Failed to build link:', err.message);
    return `${OFFER_BASE_URL}?external_id=${userId}`;
  }
}
