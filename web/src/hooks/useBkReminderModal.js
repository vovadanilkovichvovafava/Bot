import { useState, useEffect, useCallback } from 'react';

const POSTBACK_API = 'https://postbackapi-production.up.railway.app';

// localStorage keys
const BK_REG_SEEN_KEY = 'bk_reminder_congrats_seen';
const BK_REMINDER1_SEEN_KEY = 'bk_reminder1_seen';
const BK_REMINDER2_SEEN_KEY = 'bk_reminder2_seen';
const BK_REG_DETECTED_AT_KEY = 'bk_reg_detected_at';

// Timing
const REMINDER1_DELAY_MS = 4 * 60 * 60 * 1000;   // 4 часа
const REMINDER2_DELAY_MS = 24 * 60 * 60 * 1000;   // 24 часа
const POLL_INTERVAL_MS = 60 * 1000;                 // поллинг раз в минуту

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}

/**
 * Хук для модалок-напоминаний юзерам которые зарегались в БК но не депозитнули.
 *
 * Возвращает: { modalVariant, dismissModal }
 *   modalVariant: null | 'congrats' | 'reminder1' | 'reminder2'
 *   dismissModal: () => void — закрыть текущую модалку
 */
export default function useBkReminderModal(userId) {
  const [modalVariant, setModalVariant] = useState(null);
  const [bkStatus, setBkStatus] = useState(null);

  // Поллим статус юзера
  const checkStatus = useCallback(async () => {
    if (!userId) return;
    try {
      const resp = await fetch(`${POSTBACK_API}/api/user/${userId}/status`);
      if (!resp.ok) return;
      const data = await resp.json();
      setBkStatus(data);
    } catch {
      // сеть недоступна — пропускаем
    }
  }, [userId]);

  // Первый чек + поллинг
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkStatus]);

  // Логика выбора модалки
  useEffect(() => {
    if (!bkStatus) return;

    // Если юзер уже PRO (депозитнул) — никаких модалок
    if (bkStatus.premium) {
      setModalVariant(null);
      return;
    }

    // Если юзер НЕ зарегался в БК — нечего показывать
    if (!bkStatus.bk_registered) {
      setModalVariant(null);
      return;
    }

    // Юзер зарегался в БК, но НЕ депозитнул
    const now = Date.now();

    // Запоминаем когда впервые обнаружили регистрацию
    let detectedAt = parseInt(safeGet(BK_REG_DETECTED_AT_KEY) || '0', 10);
    if (!detectedAt) {
      detectedAt = now;
      safeSet(BK_REG_DETECTED_AT_KEY, String(now));
    }

    const elapsed = now - detectedAt;

    // Модалка 1: Congrats (сразу при обнаружении)
    if (!safeGet(BK_REG_SEEN_KEY)) {
      setModalVariant('congrats');
      return;
    }

    // Модалка 2: Reminder1 (через 4 часа)
    if (elapsed >= REMINDER1_DELAY_MS && !safeGet(BK_REMINDER1_SEEN_KEY)) {
      setModalVariant('reminder1');
      return;
    }

    // Модалка 3: Reminder2 (через 24 часа)
    if (elapsed >= REMINDER2_DELAY_MS && !safeGet(BK_REMINDER2_SEEN_KEY)) {
      setModalVariant('reminder2');
      return;
    }

    // Все модалки показаны
    setModalVariant(null);
  }, [bkStatus]);

  const dismissModal = useCallback(() => {
    if (modalVariant === 'congrats') {
      safeSet(BK_REG_SEEN_KEY, 'true');
    } else if (modalVariant === 'reminder1') {
      safeSet(BK_REMINDER1_SEEN_KEY, 'true');
    } else if (modalVariant === 'reminder2') {
      safeSet(BK_REMINDER2_SEEN_KEY, 'true');
    }
    setModalVariant(null);
  }, [modalVariant]);

  return { modalVariant, dismissModal };
}
