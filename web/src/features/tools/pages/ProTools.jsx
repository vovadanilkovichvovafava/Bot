import { useState } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { useAdvertiser } from '../../../shared/context/AdvertiserContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../../shared/api';
import SupportChatModal from '../../../shared/components/SupportChat';

const FREE_AI_LIMIT = 5;

export default function ProTools() {
  const { user } = useAuth();
  const { advertiser, trackClick } = useAdvertiser();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showSupportChat, setShowSupportChat] = useState(false);
  const isFunnel2 = user?.funnel === 'funnel-2' || user?.funnel === 'funnel-4';
  const isPremium = user?.is_premium && !isFunnel2;
  const unlocked = isPremium || isFunnel2;

  const valueBetUsed = localStorage.getItem('value_bet_used') === 'true';

  const handleToolClick = (toolName) => {
    if (toolName === 'yourStats') return navigate('/your-stats');

    if (toolName === 'valueFinder') {
      if (isPremium || isFunnel2 || !valueBetUsed) return navigate('/value-finder');
      return navigate('/pro-access?reason=limit&feature=value-finder');
    }

    if (toolName === 'express') return navigate('/express');

    if (isPremium || isFunnel2) {
      if (toolName === 'predictions') return navigate('/prediction-history');
      if (toolName === 'betSlip') return navigate('/bet-slip-builder');
      if (toolName === 'bankroll') return navigate('/bankroll-tracker');
      if (toolName === 'kelly') return navigate('/kelly-calculator');
      if (toolName === 'oddsConverter') return navigate('/odds-converter');
      return;
    }
    return navigate('/pro-access?reason=limit&feature=' + toolName);
  };

  const [aiRemaining, setAiRemaining] = useState(null);
  useState(() => {
    if (!unlocked) {
      api.getChatLimit()
        .then(data => setAiRemaining(data.remaining ?? FREE_AI_LIMIT))
        .catch(() => setAiRemaining(FREE_AI_LIMIT));
    }
  });
  const remaining = unlocked ? '∞' : (aiRemaining ?? FREE_AI_LIMIT);

  return (
    <div className="bg-[#F0F2F5] min-h-screen pb-24">
      {/* ===== HEADER ===== */}
      <div className="px-4 pt-5 pb-4" style={{ background: 'linear-gradient(135deg, #1B2138 0%, #232a45 100%)' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-full bg-white/15 ring-2 ring-white/10 flex items-center justify-center shrink-0"
          >
            <span className="text-white font-bold text-base">{(user?.username || 'U')[0].toUpperCase()}</span>
          </button>
          <h1 className="text-white text-xl font-black tracking-wide flex-1 truncate">STATSPRO</h1>
          <button
            onClick={() => navigate(unlocked ? '/settings' : '/pro-access')}
            className="flex items-center gap-1.5 bg-black/25 rounded-full pl-2 pr-3 py-1.5 shrink-0"
          >
            <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </span>
            <span className="text-emerald-400 font-bold text-sm">{remaining} {t('home.pts', { defaultValue: 'pts' })}</span>
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* ===== TIER BANNER ===== */}
        {isPremium ? (
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-emerald-500/20">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm">{t('proTools.premiumActive')}</p>
              <p className="text-white/70 text-xs">{t('proTools.unlimitedAccess')}</p>
            </div>
            <svg className="w-6 h-6 text-white/60 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd"/>
            </svg>
          </div>
        ) : !isFunnel2 && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{t('proTools.freeTierTitle', { defaultValue: 'Free Tier' })}</p>
                  <p className="text-gray-500 text-xs">{t('proTools.freePlanDesc')}</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/promo?banner=protools_go_pro')}
                className="bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-emerald-500/30"
              >
                {t('proTools.goPro', { defaultValue: 'GO PRO' })}
              </button>
            </div>
          </div>
        )}

        {/* ===== SECTION: EXCLUSIVE PRO TOOLS ===== */}
        <div className="flex items-center gap-2 pt-2">
          <h2 className="text-gray-900 font-bold text-base">{t('proTools.exclusiveTools', { defaultValue: 'Exclusive PRO Tools' })}</h2>
          {!unlocked && (
            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">PRO</span>
          )}
        </div>

        {/* Value Finder — featured card */}
        <div
          onClick={() => handleToolClick('valueFinder')}
          className="relative overflow-hidden rounded-2xl p-5 cursor-pointer shadow-lg"
          style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 50%, #8B5CF6 100%)' }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
              </svg>
            </div>
            {!unlocked && !valueBetUsed && (
              <span className="bg-emerald-400 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">{t('proTools.freeTry')}</span>
            )}
          </div>
          <h3 className="text-white font-bold text-lg mb-1">{t('proTools.valueBetFinder')}</h3>
          <p className="text-white/70 text-sm mb-4">{t('proTools.valueBetShort', { defaultValue: 'AI finds bets where odds are higher than true probability.' })}</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-white font-bold text-lg">87%</p>
              <p className="text-white/50 text-[10px]">{t('proTools.accuracy')}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-white font-bold text-lg">+12%</p>
              <p className="text-white/50 text-[10px]">{t('proTools.avgEdge')}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-white font-bold text-lg">50+</p>
              <p className="text-white/50 text-[10px]">{t('proTools.dailyBets')}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-white/60 text-xs">{unlocked ? t('proTools.unlimitedScans') : t('proTools.tryFreeNow')}</p>
            <div className="bg-white text-indigo-600 font-bold text-sm px-4 py-2 rounded-xl flex items-center gap-1">
              {t('proTools.findValueBets')}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Two-col: Bankroll Manager + Expert Insights */}
        <div className="grid grid-cols-2 gap-3">
          <ToolTile
            icon={
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/>
              </svg>
            }
            iconBg="bg-emerald-50"
            title={t('proTools.bankrollTracker')}
            desc={t('proTools.bankrollShort', { defaultValue: 'Track bets & P/L' })}
            locked={!unlocked}
            onClick={() => handleToolClick('bankroll')}
          />
          <ToolTile
            icon={
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"/>
              </svg>
            }
            iconBg="bg-amber-50"
            title={t('proTools.expertInsights', { defaultValue: 'Expert Insights' })}
            desc={t('proTools.expertInsightsDesc', { defaultValue: 'AI-powered tips' })}
            locked={!unlocked}
            onClick={() => navigate('/ai-chat')}
          />
        </div>

        {/* AI Express card */}
        <div
          onClick={() => handleToolClick('express')}
          className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm cursor-pointer flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-gray-900 text-sm">{t('express.title', { defaultValue: 'AI Express' })}</p>
              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{t('express.dailyFree', { defaultValue: 'FREE DAILY' })}</span>
            </div>
            <p className="text-gray-500 text-xs truncate">{t('proTools.expressShort', { defaultValue: 'AI-generated accumulators with real odds' })}</p>
          </div>
          <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
          </svg>
        </div>

        {/* Advanced Stats card */}
        <div
          onClick={() => handleToolClick('yourStats')}
          className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm cursor-pointer flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm">{t('proTools.advancedStats', { defaultValue: 'Advanced Stats' })}</p>
            <p className="text-gray-500 text-xs truncate">{t('proTools.yourStatsDesc')}</p>
          </div>
          <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
          </svg>
        </div>

        {/* More PRO tools list */}
        <div className="space-y-2">
          <ToolRow
            icon={<svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>}
            title={t('proTools.betSlipBuilder')}
            locked={!unlocked}
            onClick={() => handleToolClick('betSlip')}
          />
          <ToolRow
            icon={<svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z"/></svg>}
            title={t('proTools.kellyCalculator')}
            locked={!unlocked}
            onClick={() => handleToolClick('kelly')}
          />
          <ToolRow
            icon={<svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/></svg>}
            title={t('proTools.oddsConverter')}
            locked={!unlocked}
            onClick={() => handleToolClick('oddsConverter')}
          />
          <ToolRow
            icon={<svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
            title={t('proTools.predictionHistory')}
            locked={!unlocked}
            onClick={() => handleToolClick('predictions')}
          />
        </div>

        {/* ===== UNLOCK CTA ===== */}
        {!unlocked && (
          <div className="bg-gradient-to-br from-[#1B2138] to-[#2d3557] rounded-2xl p-5 text-center">
            <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
              </svg>
            </div>
            <h3 className="text-white font-bold text-lg mb-1">{t('proTools.unlockPotential', { defaultValue: 'Unlock Your Potential' })}</h3>
            <p className="text-white/60 text-sm mb-4">{t('proTools.unlockPotentialDesc', { defaultValue: 'Get unlimited access to all professional tools and AI features.' })}</p>
            <button
              onClick={() => navigate('/promo?banner=protools_unlock_cta')}
              className="w-full bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/30 mb-2"
            >
              {t('proTools.comparePlans', { defaultValue: 'Compare Plans' })}
            </button>
            <p className="text-white/40 text-xs">{t('proTools.noSubscription', { defaultValue: 'No subscription · deposit stays yours' })}</p>
          </div>
        )}
      </div>

      {showSupportChat && (
        <SupportChatModal
          isOpen={showSupportChat}
          onClose={() => setShowSupportChat(false)}
          initialMessage="I want PRO access"
        />
      )}
    </div>
  );
}

function ToolTile({ icon, iconBg, title, desc, locked, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm cursor-pointer flex flex-col gap-3 relative overflow-hidden"
    >
      <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <p className="font-bold text-gray-900 text-sm">{title}</p>
          {locked && (
            <svg className="w-3.5 h-3.5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
            </svg>
          )}
        </div>
        <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function ToolRow({ icon, title, locked, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl px-4 py-3.5 border border-gray-100 shadow-sm cursor-pointer flex items-center gap-3"
    >
      <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
        {icon}
      </div>
      <p className="font-semibold text-gray-900 text-sm flex-1">{title}</p>
      {locked ? (
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
        </svg>
      ) : (
        <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
        </svg>
      )}
    </div>
  );
}
