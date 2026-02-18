/**
 * Tracking Service — взаимодействие с PostbackAPI для сохранения tracking параметров
 * и получения ссылок на букмекера со всеми sub_id.
 *
 * Поддерживаемые параметры из клоачной ссылки:
 * - external_id — внешний ID юзера из трекера
 * - sub_id_1..sub_id_15 — произвольные метки из трекера
 * - fbclid — Facebook Click ID
 * - utm_source, utm_medium, utm_campaign, utm_content, utm_term — UTM метки
 */

const TRACKING_API = 'https://postbackapi-production.up.railway.app';

/**
 * Собрать ВСЕ tracking параметры из URL + sessionStorage.
 * App.jsx persistTrackingParams() сохраняет params в sessionStorage ДО редиректа,
 * поэтому к моменту вызова после регистрации они точно есть в sessionStorage.
 */
function collectAllTrackingParams() {
  const urlParams = new URLSearchParams(window.location.search);

  // Приоритет: URL > sessionStorage (URL свежее)
  const getParam = (key) => urlParams.get(key) || sessionStorage.getItem(`tracking_${key}`) || null;

  const result = {};

  // 1. external_id
  const externalId = getParam('external_id');
  if (externalId) result.external_id = externalId;

  // 2. fbclid
  const fbclid = getParam('fbclid');
  if (fbclid) result.fbclid = fbclid;

  // 3. UTM параметры
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  for (const key of utmKeys) {
    const val = getParam(key);
    if (val) result[key] = val;
  }

  // 4. sub_id_1..sub_id_15 — из клоачной ссылки
  const subIds = {};
  for (let i = 1; i <= 15; i++) {
    const val = getParam(`sub_id_${i}`);
    if (val) subIds[`sub_id_${i}`] = val;
  }
  if (Object.keys(subIds).length > 0) {
    result.sub_ids = subIds;
  }

  return result;
}

/**
 * Очистить все tracking_ ключи из sessionStorage после использования.
 */
function clearTrackingSession() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('tracking_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  } catch {}
}

/**
 * Сохранить ВСЕ tracking параметры из URL/sessionStorage на PostbackAPI.
 * Вызывается один раз после регистрации/логина в App.jsx.
 */
export async function saveTrackingParams(userId) {
  if (!userId) return;

  const params = collectAllTrackingParams();

  // Если нет ни одного параметра — не отправляем
  if (Object.keys(params).length === 0) {
    return;
  }

  // НЕ чистим sessionStorage здесь! Данные нужны getTrackingLink() позже.
  // sessionStorage сам очистится когда вкладка закроется.

  try {
    const body = {
      user_id: userId,
      ...params,
    };

    const res = await fetch(`${TRACKING_API}/api/tracking/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      console.log('[Tracking] Params saved for', userId, params);
    } else {
      console.warn('[Tracking] Save failed:', res.status);
    }
  } catch (err) {
    console.warn('[Tracking] Failed to save params:', err.message);
  }
}

/**
 * Построить прямую ссылку на оффер со всеми tracking параметрами.
 * external_id = userId для отслеживания конверсий.
 *
 * Маппинг:
 *   external_id = наш userId (для постбэков)
 *   sub_id_1..7 = из клоачной ссылки (as-is)
 *   sub_id_8    = original external_id из клоачной
 *   sub_id_9    = из клоачной ссылки (as-is)
 *   sub_id_10   = наш userId (PostbackAPI матчит по нему для премиума!)
 *   sub_id_11   = banner (наш, 21 баннер из разных мест)
 *   sub_id_12..15 = из клоачной ссылки (as-is)
 *   + fbclid, utm_* отдельными параметрами
 */
const OFFER_BASE_URL = 'https://siteofficialred.com/KnSQ1M';

export function getTrackingLink(userId, banner = '') {
  if (!userId) return null;

  try {
    const params = new URLSearchParams();
    const urlParams = new URLSearchParams(window.location.search);
    const getParam = (key) => urlParams.get(key) || sessionStorage.getItem(`tracking_${key}`) || '';

    // Наш userId как external_id для постбэков
    params.set('external_id', String(userId));
    // sub_id_10 = наш userId — PostbackAPI матчит юзера по нему для разблокировки премиума
    params.set('sub_id_10', String(userId));
    if (banner) params.set('sub_id_11', banner);

    // sub_id_1..15 из клоачной ссылки (as-is, кроме 8, 10, 11 — наши)
    for (let i = 1; i <= 15; i++) {
      if (i === 8 || i === 10 || i === 11) continue; // зарезервированы нами
      const val = getParam(`sub_id_${i}`);
      if (val) params.set(`sub_id_${i}`, val);
    }

    // Original external_id из клоачной ссылки → sub_id_8
    const cloakerExternalId = getParam('external_id');
    if (cloakerExternalId) params.set('sub_id_8', cloakerExternalId);

    // fbclid → sub_id_16 (Keitaro маппит fbclid на sub_id_16) + отдельный param
    const fbclid = getParam('fbclid');
    if (fbclid) {
      params.set('sub_id_16', fbclid);
      params.set('fbclid', fbclid);
    }

    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    for (const key of utmKeys) {
      const val = getParam(key);
      if (val) params.set(key, val);
    }

    const link = `${OFFER_BASE_URL}?${params.toString()}`;
    console.log('[Tracking] Link built:', link);
    return link;
  } catch (err) {
    console.warn('[Tracking] Failed to build link:', err.message);
    return `${OFFER_BASE_URL}?external_id=${userId}`;
  }
}
