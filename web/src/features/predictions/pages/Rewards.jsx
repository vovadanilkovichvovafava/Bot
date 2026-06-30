import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/context/AuthContext';
import api from '../../../shared/api';

const HEADLINE_TIER = 7500; // headline goal = 30-day PRO tier

export default function Rewards() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();

  const [data, setData] = useState(null);
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(null);
  const [toast, setToast] = useState(null);

  const load = async () => {
    try {
      const [me, lb] = await Promise.allSettled([api.getFantasy(), api.getFantasyLeaderboard()]);
      if (me.status === 'fulfilled') setData(me.value);
      if (lb.status === 'fulfilled') setBoard(lb.value?.leaderboard || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const points = data?.points ?? 0;
  const lifetime = data?.lifetime ?? 0;
  const rank = data?.rank;
  const tiers = data?.tiers || [];
  const history = data?.history || [];
  const progress = Math.min(100, Math.round((points / HEADLINE_TIER) * 100));

  const redeem = async (tier) => {
    if (redeeming || !tier.available || tier.type !== 'pro' || points < tier.points) return;
    setRedeeming(tier.id);
    try {
      const res = await api.redeemFantasy(tier.id);
      setToast(`🎉 ${t('rewards.redeemed', { defaultValue: 'Unlocked' })}: ${res.reward || ''}`);
      await refreshUser?.();
      await load();
    } catch (e) {
      const msg = e?.message?.includes('Not enough') ? t('rewards.notEnough', { defaultValue: 'Not enough points' })
        : t('rewards.redeemFailed', { defaultValue: 'Could not redeem' });
      setToast(`⚠️ ${msg}`);
    } finally {
      setRedeeming(null);
      setTimeout(() => setToast(null), 2800);
    }
  };

  const reasonLabel = (h) => {
    if (h.reason === 'correct_prediction') return t('rewards.earnCorrect', { defaultValue: 'Correct prediction' });
    if (h.reason === 'wrong_prediction') return t('rewards.wrongPrediction', { defaultValue: 'Wrong prediction' });
    if (h.reason?.startsWith('redeem_')) return t('rewards.redeemReason', { defaultValue: 'Reward redeemed' });
    return h.reason || '';
  };

  return (
    <div className="bg-[#F0F2F5] min-h-screen pb-10">
      {/* Header */}
      <div className="px-4 pt-5 pb-12" style={{ background: 'linear-gradient(135deg, #14532D 0%, #1B5E3B 60%, #0F3D28 100%)' }}>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <h1 className="flex-1 text-white text-lg font-black">{t('rewards.title', { defaultValue: 'Rewards' })}</h1>
          {rank ? <span className="text-emerald-200 text-xs font-bold bg-white/10 px-2.5 py-1 rounded-full">#{rank}</span> : null}
        </div>

        {/* Points hero */}
        <div className="text-center">
          <p className="text-emerald-200/80 text-[11px] font-bold uppercase tracking-wider">{t('rewards.yourPoints', { defaultValue: 'Your points' })}</p>
          <p className="text-white text-5xl font-black mt-1 tabular-nums">{points.toLocaleString()}</p>
          <p className="text-white/50 text-xs mt-1">{t('rewards.lifetime', { defaultValue: 'Lifetime' })}: {lifetime.toLocaleString()}</p>
        </div>
      </div>

      <div className="px-4 -mt-7 space-y-5">
        {/* Progress to headline tier */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-900">{t('rewards.nextGoal', { defaultValue: 'Next big reward' })}</span>
            <span className="text-xs font-bold text-emerald-600">{points.toLocaleString()} / {HEADLINE_TIER.toLocaleString()}</span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-[11px] text-gray-400 mt-2">{t('rewards.howEarn', { defaultValue: 'Win points for correct predictions — but a wrong pick costs points too. The more confident you are, the bigger the reward and the bigger the risk. Redeem points for PRO — and soon a $50 free bet.' })}</p>
        </div>

        {/* Tiers */}
        <div>
          <h3 className="text-[15px] font-black text-gray-900 mb-3">{t('rewards.redeemTitle', { defaultValue: 'Redeem' })}</h3>
          <div className="space-y-2.5">
            {(tiers.length ? tiers : []).map((tier) => {
              const canRedeem = tier.available && tier.type === 'pro' && points >= tier.points;
              const isCash = tier.type === 'cash';
              return (
                <div key={tier.id} className={`flex items-center gap-3 rounded-2xl border p-3.5 ${isCash ? 'bg-amber-50/60 border-amber-100' : 'bg-white border-gray-100'}`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${isCash ? 'bg-amber-100' : 'bg-emerald-50'}`}>
                    {isCash ? '💵' : '⭐'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">{tier.label}</p>
                    <p className="text-[11px] text-gray-400">{tier.points.toLocaleString()} {t('rewards.pts', { defaultValue: 'pts' })}{isCash ? ` · ${t('rewards.comingSoon', { defaultValue: 'coming soon' })}` : ''}</p>
                  </div>
                  <button
                    onClick={() => redeem(tier)}
                    disabled={!canRedeem || redeeming === tier.id}
                    className={`px-4 py-2 rounded-xl text-sm font-bold shrink-0 transition-colors ${
                      isCash ? 'bg-amber-100 text-amber-400 cursor-not-allowed'
                      : canRedeem ? 'bg-emerald-600 text-white active:scale-95'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isCash ? t('rewards.soon', { defaultValue: 'Soon' })
                      : redeeming === tier.id ? '…'
                      : canRedeem ? t('rewards.get', { defaultValue: 'Get' })
                      : t('rewards.locked', { defaultValue: 'Locked' })}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leaderboard */}
        {board.length > 0 && (
          <div>
            <h3 className="text-[15px] font-black text-gray-900 mb-3">{t('rewards.leaderboard', { defaultValue: 'Leaderboard' })}</h3>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {board.slice(0, 20).map((p) => {
                const me = user && (p.id === user.id);
                return (
                  <div key={p.id || p.rank} className={`flex items-center px-4 py-2.5 ${me ? 'bg-emerald-50/50' : ''}`}>
                    <span className={`w-7 text-sm font-black ${p.rank <= 3 ? 'text-emerald-600' : 'text-gray-300'}`}>{p.rank}</span>
                    <span className="flex-1 text-sm font-semibold text-gray-900 truncate">{p.name}{me ? ` · ${t('rewards.you', { defaultValue: 'you' })}` : ''}</span>
                    <span className="text-sm font-black text-emerald-600 tabular-nums">{(p.points || 0).toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div>
            <h3 className="text-[15px] font-black text-gray-900 mb-3">{t('rewards.history', { defaultValue: 'Recent activity' })}</h3>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {history.map((h, i) => (
                <div key={i} className="flex items-center px-4 py-2.5">
                  <span className="flex-1 text-sm text-gray-700 truncate">{reasonLabel(h)}</span>
                  <span className={`text-sm font-bold tabular-nums ${h.points >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {h.points >= 0 ? '+' : ''}{h.points}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && <div className="text-center text-gray-400 text-sm py-6">{t('common.loading', { defaultValue: 'Loading…' })}</div>}
        {!loading && lifetime === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
            <div className="text-3xl mb-2">🎯</div>
            <p className="text-gray-900 font-bold">{t('rewards.emptyTitle', { defaultValue: 'No points yet' })}</p>
            <p className="text-gray-400 text-sm mt-1">{t('rewards.emptyText', { defaultValue: 'Make predictions on matches — when they land, you earn points.' })}</p>
            <button onClick={() => navigate('/matches')} className="mt-4 bg-emerald-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl active:scale-95">
              {t('rewards.startPredicting', { defaultValue: 'Start predicting' })}
            </button>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg z-50 max-w-[90%] text-center">
          {toast}
        </div>
      )}
    </div>
  );
}
