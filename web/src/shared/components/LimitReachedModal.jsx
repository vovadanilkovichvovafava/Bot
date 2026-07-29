/**
 * "Out of tokens" modal — the short path to a deposit.
 *
 * Vlad on 29.07 about /pro-access: "вместо большого объяснения просто модалку
 * вьебать: у тебя закончились токены, депни и получишь бесконечно токенов, и
 * ссылка на деп". Hitting a limit used to bounce the user out to a long
 * explainer page, which is a bad moment to start reading.
 *
 * The page itself still exists and is reachable by direct link (banners inside
 * the app point at it) — this simply replaces the redirect on limit.
 */
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../features/auth/context/AuthContext';
import { useAdvertiser } from '../context/AdvertiserContext';
import { getTrackingLink } from '../../features/betting/services/trackingService';
import { track } from '../services/analytics';

export default function LimitReachedModal({ open, onClose, feature = 'ai' }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { advertiser, trackClick } = useAdvertiser();

  if (!open) return null;

  const goDeposit = () => {
    track('limit_deposit_click', { feature });
    trackClick?.(user?.id, `limit_${feature}`);
    const href = getTrackingLink(user?.id, `limit_${feature}`, user?.funnel);
    if (href) window.open(href, '_blank', 'noopener');
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h2 className="text-lg font-bold text-center text-gray-900 dark:text-slate-100">
          {t('limitModal.title', { defaultValue: 'You are out of predictions' })}
        </h2>
        <p className="text-sm text-center text-gray-500 dark:text-slate-400 mt-1.5 leading-relaxed">
          {t('limitModal.text', {
            defaultValue: 'Make a deposit at {{name}} and get unlimited AI predictions — no daily cap.',
            name: advertiser?.brandName || advertiser?.name || 'our partner',
          })}
        </p>

        <button
          onClick={goDeposit}
          className="w-full mt-5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-green-500/25 hover:shadow-xl transition-shadow"
        >
          {t('limitModal.cta', { defaultValue: 'Deposit and unlock' })}
        </button>
        <button
          onClick={onClose}
          className="w-full mt-2 text-gray-400 dark:text-slate-500 font-medium py-2.5 text-sm"
        >
          {t('limitModal.later', { defaultValue: 'Later' })}
        </button>
      </div>
    </div>
  );
}
