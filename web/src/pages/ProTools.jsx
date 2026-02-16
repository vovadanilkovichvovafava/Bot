import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAdvertiser } from '../context/AdvertiserContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SupportChatModal from '../components/SupportChat';

export default function ProTools() {
  const { user } = useAuth();
  const { advertiser, trackClick } = useAdvertiser();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showSupportChat, setShowSupportChat] = useState(false);
  const isPremium = user?.is_premium;

  // Check if user has used free Value Bet Finder trial
  const valueBetUsed = localStorage.getItem('value_bet_used') === 'true';

  const handleToolClick = (toolName) => {
    // Free tools - always accessible
    if (toolName === 'yourStats') {
      return navigate('/your-stats');
    }

    // Value Bet Finder - 1 free try, then PRO
    if (toolName === 'valueFinder') {
      if (isPremium || !valueBetUsed) {
        return navigate('/value-finder');
      }
      return navigate('/pro-access?reason=limit&feature=value-finder');
    }

    // PRO tools - need deposit
    if (isPremium) {
      if (toolName === 'predictions') return navigate('/prediction-history');
      if (toolName === 'betSlip') return navigate('/bet-slip-builder');
      if (toolName === 'bankroll') return navigate('/bankroll-tracker');
      if (toolName === 'kelly') return navigate('/kelly-calculator');
      if (toolName === 'oddsConverter') return navigate('/odds-converter');
      return;
    }
    return navigate('/pro-access?reason=limit&feature=' + toolName);
  };

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">{t('nav.proTools')}</h1>
          {!isPremium && (
            <button
              onClick={() => navigate('/promo?banner=protools_get_pro')}
              className="flex items-center gap-1 text-accent-gold text-sm font-semibold"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
              </svg>
              {t('proTools.getPro')}
            </button>
          )}
        </div>

        {isPremium ? (
          <div className="bg-gradient-to-r from-amber-400 to-amber-500 rounded-2xl p-4 mb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
              </svg>
              <div className="text-white">
                <p className="font-bold">{t('proTools.premiumActive')}</p>
                <p className="text-sm text-white/80">{t('proTools.unlimitedAccess')}</p>
              </div>
            </div>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
        ) : (
          <div className="border-2 border-amber-200 bg-amber-50 rounded-2xl p-4 mb-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900">{t('proTools.freePlan')}</p>
                <p className="text-sm text-gray-500">{t('proTools.freePlanDesc')}</p>
              </div>
              <button
                onClick={() => navigate('/promo?banner=protools_deposit_btn')}
                className="bg-accent-gold text-white font-semibold px-4 py-2 rounded-lg text-sm"
              >
                {t('proTools.deposit')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-5 pt-2 pb-4 space-y-4">
        {/* Value Bet Finder - Главный хук! */}
        <div
          onClick={() => handleToolClick('valueFinder')}
          className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
              </svg>
            </div>
            {!isPremium && !valueBetUsed && (
              <span className="bg-green-400 text-green-900 text-xs font-bold px-2 py-1 rounded-full">
                {t('proTools.freeTry')}
              </span>
            )}
            {!isPremium && valueBetUsed && (
              <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
                </svg>
                PRO
              </span>
            )}
          </div>

          <h3 className="text-xl font-bold text-white mb-2">{t('proTools.valueBetFinder')}</h3>
          <p className="text-white/80 text-sm mb-4">
            {t('proTools.valueBetDesc')}
          </p>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <p className="text-white font-bold text-lg">87%</p>
              <p className="text-white/60 text-xs">{t('proTools.accuracy')}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <p className="text-white font-bold text-lg">+12%</p>
              <p className="text-white/60 text-xs">{t('proTools.avgEdge')}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <p className="text-white font-bold text-lg">50+</p>
              <p className="text-white/60 text-xs">{t('proTools.dailyBets')}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              {isPremium ? t('proTools.unlimitedScans') : valueBetUsed ? t('proTools.depositToUnlock') : t('proTools.tryFreeNow')}
            </div>
            <div className="bg-white text-blue-600 font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-1">
              {isPremium || !valueBetUsed ? t('proTools.findValueBets') : t('proTools.unlock')}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Free Tools */}
        <h2 className="section-title">{t('proTools.freeTools')}</h2>

        <ToolCard
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>}
          title={t('proTools.yourStats')}
          subtitle={t('proTools.yourStatsDesc')}
          onClick={() => handleToolClick('yourStats')}
        />

        {/* PRO Tools */}
        <h2 className="section-title mt-6">{t('proTools.proToolsTitle')}</h2>

        <ToolCard
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>}
          title={t('proTools.betSlipBuilder')}
          subtitle={t('proTools.betSlipDesc')}
          pro={!isPremium}
          locked={!isPremium}
          onClick={() => handleToolClick('betSlip')}
        />
        <ToolCard
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/></svg>}
          title={t('proTools.bankrollTracker')}
          subtitle={t('proTools.bankrollDesc')}
          pro={!isPremium}
          locked={!isPremium}
          onClick={() => handleToolClick('bankroll')}
        />
        <ToolCard
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z"/></svg>}
          title={t('proTools.kellyCalculator')}
          subtitle={t('proTools.kellyDesc')}
          pro={!isPremium}
          locked={!isPremium}
          onClick={() => handleToolClick('kelly')}
        />
        <ToolCard
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/></svg>}
          title={t('proTools.oddsConverter')}
          subtitle={t('proTools.oddsConverterDesc')}
          pro={!isPremium}
          locked={!isPremium}
          onClick={() => handleToolClick('oddsConverter')}
        />
        <ToolCard
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
          title={t('proTools.predictionHistory')}
          subtitle={t('proTools.predictionHistoryDesc')}
          pro={!isPremium}
          locked={!isPremium}
          onClick={() => handleToolClick('predictions')}
        />

        <div className="h-4"/>
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

function ToolCard({ icon, title, subtitle, pro, locked, onClick }) {
  return (
    <div
      onClick={onClick}
      className="card flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-gray-900">{title}</p>
          {pro && <span className="badge-pro text-[10px]">PRO</span>}
        </div>
        <p className="text-sm text-gray-500 truncate">{subtitle}</p>
      </div>
      {locked ? (
        <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
        </svg>
      ) : (
        <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
        </svg>
      )}
    </div>
  );
}
