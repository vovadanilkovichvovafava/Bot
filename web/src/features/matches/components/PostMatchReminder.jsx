import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { useAdvertiser } from '../../../shared/context/AdvertiserContext';
import { getTrackingLink } from '../../betting/services/trackingService';
import { useTranslation } from 'react-i18next';
import { generatePostMatchShareText, sharePrediction } from '../../predictions/services/shareUtils';
import api from '../../../shared/api';

const STORAGE_KEY = 'post_match_reminders';
const MAX_PER_DAY = 3;

function getShownToday() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: '', ids: [], count: 0 };
    const data = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    if (data.date !== today) return { date: today, ids: [], count: 0 };
    return data;
  } catch {
    return { date: '', ids: [], count: 0 };
  }
}

function markShown(predictionId) {
  const today = new Date().toISOString().slice(0, 10);
  const data = getShownToday();
  data.date = today;
  if (!data.ids.includes(predictionId)) {
    data.ids.push(predictionId);
    data.count = (data.count || 0) + 1;
  }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

export default function PostMatchReminder() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { advertiser, trackClick } = useAdvertiser();
  const [reminder, setReminder] = useState(null);
  const [visible, setVisible] = useState(false);

  const checkReminders = useCallback(async () => {
    if (!user) return;

    const shown = getShownToday();
    if (shown.count >= MAX_PER_DAY) return;

    try {
      const data = await api.getVerifiedRecent();
      if (!data?.predictions?.length) return;

      // Find first winning prediction not yet shown to user
      const next = data.predictions.find(p => !shown.ids.includes(p.id));
      if (!next) return;

      setReminder(next);
      setTimeout(() => setVisible(true), 500);
    } catch {
      // silently fail
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(checkReminders, 5000);
    return () => clearTimeout(timer);
  }, [checkReminders]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(checkReminders, 2000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [checkReminders]);

  const handleDismiss = () => {
    if (reminder) markShown(reminder.id);
    setVisible(false);
    setTimeout(() => setReminder(null), 300);
  };

  const handlePlaceBet = () => {
    if (reminder) markShown(reminder.id);
    trackClick(user?.id, 'post_match_reminder');
    const link = getTrackingLink(user?.id, 'post_match_reminder', user?.funnel) || advertiser?.link;
    if (link) window.open(link, '_blank', 'noopener,noreferrer');
    setVisible(false);
    setTimeout(() => setReminder(null), 300);
  };

  if (!reminder) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={handleDismiss}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className={`relative w-full sm:max-w-sm mx-4 mb-4 sm:mb-0 rounded-2xl shadow-xl overflow-hidden transition-transform duration-300 ${
          visible ? 'translate-y-0' : 'translate-y-full sm:translate-y-4'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 bg-gradient-to-br from-emerald-500 to-green-600">
          <button onClick={handleDismiss} className="absolute top-3 right-3 text-white/60 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>

          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/20">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
            </div>
            <span className="text-white/80 text-xs font-medium uppercase tracking-wide">
              {t('postMatch.predictionCorrect', { defaultValue: 'Prediction correct!' })}
            </span>
          </div>

          <div className="text-white">
            <p className="font-bold text-lg">{reminder.home_team} vs {reminder.away_team}</p>
            {reminder.actual_score && (
              <p className="text-white/70 text-sm mt-0.5">
                {t('postMatch.finalScore', { defaultValue: 'Final score' })}: {reminder.actual_score}
              </p>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="bg-white px-5 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700">
              {reminder.bet_name || reminder.bet_type}
            </div>
            <span className="text-sm text-gray-500">
              @ {reminder.odds?.toFixed(2)}
            </span>
          </div>

          {/* Could have won */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-3">
            <p className="text-sm text-emerald-800 font-medium mb-1">
              {t('postMatch.youCouldHaveWon', { defaultValue: 'You could have won' })}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-600">
                {advertiser?.currency}{reminder.potential_win}
              </span>
              <span className="text-sm text-emerald-500">
                {t('postMatch.fromStake', { stake: reminder.stake, currency: advertiser?.currency, defaultValue: `from ${advertiser?.currency}${reminder.stake} stake` })}
              </span>
            </div>
            <p className="text-xs text-emerald-600 mt-1">
              +{advertiser?.currency}{reminder.missed_profit} {t('postMatch.profit', { defaultValue: 'profit' })}
            </p>
          </div>

          {/* Bonus calculation — with free bet you'd win even more */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-xl p-3 mb-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">🎁</span>
              <p className="text-xs font-bold text-amber-800">
                {t('postMatch.withFreebet', { defaultValue: 'With free bet bonus:' })}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-amber-700">{advertiser?.bonusBanner?.bonus || '€100'}</span>
              <span className="text-amber-500">&times;</span>
              <span className="font-bold text-amber-700">{reminder.odds?.toFixed(2)}</span>
              <span className="text-amber-500">=</span>
              <span className="text-lg font-black text-amber-700">
                {advertiser?.currency}{Math.round((advertiser?.freeBetAmount || 100) * (reminder.odds || 1))}
              </span>
            </div>
          </div>

          {/* CTA: Place bet */}
          <button
            onClick={handlePlaceBet}
            className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white"
          >
            {t('postMatch.startWinning', { defaultValue: 'Start winning — Place your bet' })}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
            </svg>
          </button>

          {/* Share + Dismiss row */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={async () => {
                const text = generatePostMatchShareText({
                  homeTeam: reminder.home_team,
                  awayTeam: reminder.away_team,
                  score: reminder.actual_score || '',
                  bet: reminder.bet_name || reminder.bet_type,
                  odds: reminder.odds?.toFixed(2),
                  potentialWin: reminder.potential_win,
                  currency: advertiser?.currency || '€',
                  referralCode: user?.referral_code,
                  bonus: advertiser?.bonusBanner?.bonus || '€100',
                });
                trackClick(user?.id, 'post_match_share');
                await sharePrediction(text, `${reminder.home_team} vs ${reminder.away_team}`);
              }}
              className="flex-1 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"/>
              </svg>
              {t('postMatch.share', { defaultValue: 'Share' })}
            </button>
            <button
              onClick={handleDismiss}
              className="flex-1 text-center text-sm text-gray-400 py-2"
            >
              {t('postMatch.dismiss', { defaultValue: 'Maybe later' })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
