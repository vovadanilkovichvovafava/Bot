/**
 * "Do you want a quick tour?" — the first thing a new user sees.
 *
 * Vlad on 29.07: "хочется чтобы был опрос: вам нужно обучение, да или нет".
 * Asking beats forcing: people who already know the app skip in one tap, and
 * those who say yes are actually paying attention when the tour starts.
 */
import { useTranslation } from 'react-i18next';
import { track } from '../../../shared/services/analytics';

export default function TourPrompt({ onAccept, onDecline }) {
  const { t } = useTranslation();

  const accept = () => { track('tour_prompt', { answer: 'yes' }); onAccept(); };
  const decline = () => { track('tour_prompt', { answer: 'no' }); onDecline(); };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-6 shadow-2xl">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        </div>

        <h2 className="text-lg font-bold text-center text-gray-900 dark:text-slate-100">
          {t('tour.promptTitle', { defaultValue: 'Want a quick tour?' })}
        </h2>
        <p className="text-sm text-center text-gray-500 dark:text-slate-400 mt-1.5 leading-relaxed">
          {t('tour.promptText', {
            defaultValue: 'Takes 30 seconds — we show where the matches are, how to get an AI prediction and where the best perks live.',
          })}
        </p>

        <button
          onClick={accept}
          className="w-full mt-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl transition-shadow"
        >
          {t('tour.promptYes', { defaultValue: 'Yes, show me' })}
        </button>
        <button
          onClick={decline}
          className="w-full mt-2 text-gray-400 dark:text-slate-500 font-medium py-2.5 text-sm"
        >
          {t('tour.promptNo', { defaultValue: 'No thanks, I know my way' })}
        </button>
      </div>
    </div>
  );
}
