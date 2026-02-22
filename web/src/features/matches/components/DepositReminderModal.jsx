import { useTranslation } from 'react-i18next';

/**
 * Модалки для юзеров которые зарегались в БК но не депозитнули.
 *
 * variant:
 *   "congrats"   — сразу после регистрации в БК (постбэк reg)
 *   "reminder1"  — через ~4 часа
 *   "reminder2"  — через ~24 часа (последнее напоминание)
 */
export default function DepositReminderModal({ variant = 'congrats', onClose, onGoToPromo }) {
  const { t } = useTranslation();

  const config = {
    congrats: {
      emoji: '🎉',
      gradient: 'from-green-400 via-emerald-500 to-teal-600',
      titleKey: 'bkReminder.congrats.title',
      descKey: 'bkReminder.congrats.desc',
      ctaKey: 'bkReminder.congrats.cta',
    },
    reminder1: {
      emoji: '⏰',
      gradient: 'from-amber-400 via-orange-500 to-red-500',
      titleKey: 'bkReminder.reminder1.title',
      descKey: 'bkReminder.reminder1.desc',
      ctaKey: 'bkReminder.reminder1.cta',
    },
    reminder2: {
      emoji: '🔥',
      gradient: 'from-red-500 via-pink-500 to-purple-600',
      titleKey: 'bkReminder.reminder2.title',
      descKey: 'bkReminder.reminder2.desc',
      ctaKey: 'bkReminder.reminder2.cta',
    },
  };

  const c = config[variant] || config.congrats;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl sm:mx-6 max-w-sm w-full overflow-hidden shadow-2xl animate-slideUp pb-safe">
        {/* Top gradient section */}
        <div className={`bg-gradient-to-br ${c.gradient} px-6 pt-8 pb-6 text-center text-white`}>
          <div className="text-5xl mb-3">{c.emoji}</div>
          <h2 className="text-2xl font-black mb-2">
            {t(c.titleKey)}
          </h2>
          {variant === 'congrats' && (
            <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-3 mt-2">
              <div className="flex items-center justify-center gap-2">
                <span className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                </span>
                <span className="font-bold text-sm">{t('bkReminder.congrats.regDone')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-6 pt-4 pb-2 text-center">
          <p className="text-gray-600 text-sm leading-relaxed">
            {t(c.descKey)}
          </p>

          {/* Steps indicator */}
          <div className="flex items-center justify-center gap-3 mt-4 text-xs text-gray-500">
            {/* Step 1 - Registration (done!) */}
            <div className="flex items-center gap-1">
              <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </span>
              <span className="line-through text-gray-400">{t('bkReminder.step1')}</span>
            </div>
            <svg className="w-3 h-3 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
            </svg>
            {/* Step 2 - Deposit (active) */}
            <div className="flex items-center gap-1">
              <span className="w-5 h-5 bg-amber-400 text-white rounded-full flex items-center justify-center text-[10px] font-bold animate-pulse">2</span>
              <span className="font-bold text-amber-600">{t('bkReminder.step2')}</span>
            </div>
            <svg className="w-3 h-3 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
            </svg>
            {/* Step 3 - PRO (locked) */}
            <div className="flex items-center gap-1">
              <span className="w-5 h-5 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
              <span className="text-gray-400">PRO</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 pt-4 space-y-3">
          <button
            onClick={onGoToPromo}
            className={`w-full bg-gradient-to-r ${c.gradient} text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2`}
          >
            {t(c.ctaKey)}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
            </svg>
          </button>
          <button
            onClick={onClose}
            className="w-full text-gray-400 text-sm py-2"
          >
            {t('bkReminder.later')}
          </button>
        </div>
      </div>
    </div>
  );
}
