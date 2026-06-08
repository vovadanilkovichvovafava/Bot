/**
 * Tracking Service — взаимодействие с PostbackAPI для сохранения tracking параметров
 * и получения ссылок на букмекера со всеми sub_id.
 *
 * Поддерживаемые параметры из клоачной ссылки:
 * - external_id — внешний ID юзера из трекера
 * - sub_id_1..sub_id_15 — произвольные метки из трекера
 * - fbclid — Facebook Click ID
 * - utm_source, utm_medium, utm_campaign, utm_content, utm_term — UTM метки
 *
 * App UTM override:
 * - utm_source = 'sportscoreai' (наше приложение)
 * - utm_medium = категория источника (home, aichat, match, express, promo, tools, nav)
 * - utm_campaign = конкретный banner (smart_bet_banner, aichat_bet_card и т.д.)
 * - utm_content, utm_term — из клоакерской ссылки (as-is)
 */

import { ENV } from '../../../shared/config/env';

const TRACKING_API = ENV.TRACKING_API;

/**
 * Маппинг banner → utm_medium (категория источника).
 * Позволяет в аналитике группировать клики по разделам приложения.
 */
function getUtmMedium(banner) {
  if (!banner) return 'other';
  if (banner.startsWith('aichat_')) return 'aichat';
  if (banner.startsWith('match_') || banner.startsWith('live_') || banner.startsWith('matches_')) return 'match';
  if (banner.startsWith('express_')) return 'express';
  if (banner.startsWith('smart_bet_') || banner.startsWith('pro_featured_') || banner.startsWith('pro_fallback_')) return 'home';
  if (banner.startsWith('promo_') || banner.startsWith('pro_access_')) return 'promo';
  if (banner.startsWith('value_finder_') || banner.startsWith('pro_guide_')) return 'tools';
  if (banner === 'bottom_nav_bet') return 'nav';
  if (banner === 'post_match_reminder') return 'reminder';
  return 'other';
}

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
 *   sub_id_9    = original utm_medium из клоачной (affiliate, cpc и т.д.)
 *   sub_id_10   = наш userId (PostbackAPI матчит по нему для премиума!)
 *   sub_id_11   = banner (наш, 21 баннер из разных мест)
 *   sub_id_12..15 = из клоачной ссылки (as-is)
 *   + fbclid, utm_* отдельными параметрами
 */
const OFFER_BASE_URL = ENV.OFFER_URL;
const OFFER_BASE_URL_F2 = ENV.OFFER_URL_F2 || OFFER_BASE_URL;
const OFFER_BASE_URL_GOOGLE = ENV.OFFER_URL_GOOGLE || '';

export function getTrackingLink(userId, banner = '', funnel = '') {
  if (!userId) return null;

  try {
    // Определяем base URL: Google offer > Funnel-2 offer > Default offer
    const utmSource = new URLSearchParams(window.location.search).get('utm_source')
      || sessionStorage.getItem('tracking_utm_source') || '';
    const isGoogle = OFFER_BASE_URL_GOOGLE && utmSource.toLowerCase() === 'google';
    const baseUrl = isGoogle
      ? OFFER_BASE_URL_GOOGLE
      : (funnel === 'funnel-2' || funnel === 'funnel-4') ? OFFER_BASE_URL_F2 : OFFER_BASE_URL;
    const params = new URLSearchParams();
    const urlParams = new URLSearchParams(window.location.search);
    const getParam = (key) => urlParams.get(key) || sessionStorage.getItem(`tracking_${key}`) || '';

    // Наш userId как external_id для постбэков
    params.set('external_id', String(userId));
    // sub_id_10 = наш userId — PostbackAPI матчит юзера по нему для разблокировки премиума
    params.set('sub_id_10', String(userId));
    if (banner) params.set('sub_id_11', banner);

    // sub_id_1..15 из клоачной ссылки (as-is, кроме 8, 9, 10, 11 — наши)
    for (let i = 1; i <= 15; i++) {
      if (i === 8 || i === 9 || i === 10 || i === 11) continue; // зарезервированы нами
      const val = getParam(`sub_id_${i}`);
      if (val) params.set(`sub_id_${i}`, val);
    }

    // Original external_id из клоачной ссылки → sub_id_8
    const cloakerExternalId = getParam('external_id');
    if (cloakerExternalId) params.set('sub_id_8', cloakerExternalId);

    // Оригинальный utm_medium клоакера → sub_id_9 (чтобы не потерять)
    const cloakerUtmMedium = getParam('utm_medium');
    if (cloakerUtmMedium) params.set('sub_id_9', cloakerUtmMedium);

    // partner_click_id из клоакера — критично для атрибуции конверсий
    const partnerClickId = getParam('partner_click_id');
    if (partnerClickId) params.set('partner_click_id', partnerClickId);

    // fbclid → sub_id_16 (Keitaro маппит fbclid на sub_id_16) + отдельный param
    const fbclid = getParam('fbclid');
    if (fbclid) {
      params.set('sub_id_16', fbclid);
      params.set('fbclid', fbclid);
    }

    // UTM метки — приложение ставит свои source/medium/campaign для разделения источников,
    // utm_content и utm_term берём из клоакерской ссылки (as-is)
    params.set('utm_source', 'sportscoreai');
    params.set('utm_medium', getUtmMedium(banner));
    params.set('utm_campaign', banner || 'unknown');
    // utm_content/utm_term — из клоачной ссылки если есть
    const utmContent = getParam('utm_content');
    if (utmContent) params.set('utm_content', utmContent);
    const utmTerm = getParam('utm_term');
    if (utmTerm) params.set('utm_term', utmTerm);

    const link = `${baseUrl}?${params.toString()}`;
    console.log('[Tracking] Link built:', link);
    return link;
  } catch (err) {
    console.warn('[Tracking] Failed to build link:', err.message);
    return `${baseUrl}?external_id=${userId}`;
  }
}

/**
 * Добавить tracking-параметры к ЛЮБОМУ URL (Fonbet deeplink, партнёрский и т.д.).
 * Для постбэков: external_id, sub_id_1..16, UTMs — полный набор как в getTrackingLink.
 * Используем когда ссылка идёт НЕ через OFFER_BASE_URL (Keitaro), а напрямую на букмекера.
 */
export function addTrackingToUrl(url, userId, banner = '') {
  if (!url) return url;
  if (!userId) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('external_id', String(userId));
    u.searchParams.set('sub_id_10', String(userId));
    if (banner) u.searchParams.set('sub_id_11', banner);

    const urlParams = new URLSearchParams(window.location.search);
    const getParam = (key) => urlParams.get(key) || sessionStorage.getItem(`tracking_${key}`) || '';

    // sub_id_1..15 из клоачной ссылки (as-is, кроме 8, 9, 10, 11 — наши)
    for (let i = 1; i <= 15; i++) {
      if (i === 8 || i === 9 || i === 10 || i === 11) continue; // зарезервированы нами
      const val = getParam(`sub_id_${i}`);
      if (val) u.searchParams.set(`sub_id_${i}`, val);
    }

    // Original external_id из клоачной ссылки → sub_id_8
    const cloakerExternalId = getParam('external_id');
    if (cloakerExternalId) u.searchParams.set('sub_id_8', cloakerExternalId);

    // Оригинальный utm_medium клоакера → sub_id_9
    const cloakerUtmMedium = getParam('utm_medium');
    if (cloakerUtmMedium) u.searchParams.set('sub_id_9', cloakerUtmMedium);

    // partner_click_id из клоакера — для атрибуции конверсий
    const partnerClickId = getParam('partner_click_id');
    if (partnerClickId) u.searchParams.set('partner_click_id', partnerClickId);

    // fbclid
    const fbclid = getParam('fbclid');
    if (fbclid) {
      u.searchParams.set('fbclid', fbclid);
      u.searchParams.set('sub_id_16', fbclid);
    }

    // UTM — свои source/medium/campaign для разделения источников
    u.searchParams.set('utm_source', 'sportscoreai');
    u.searchParams.set('utm_medium', getUtmMedium(banner));
    u.searchParams.set('utm_campaign', banner || 'unknown');
    const utmContent = getParam('utm_content');
    if (utmContent) u.searchParams.set('utm_content', utmContent);
    const utmTerm = getParam('utm_term');
    if (utmTerm) u.searchParams.set('utm_term', utmTerm);

    return u.toString();
  } catch {
    // URL невалидный — вернуть как есть
    return url;
  }
}
