import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import SupportChatModal, { BOOKMAKER } from '../components/SupportChat';

// Tools that are not yet implemented
const COMING_SOON_TOOLS = [];

export default function ProTools() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);
  const [showSupportChat, setShowSupportChat] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const isPremium = user?.is_premium;

  const handleToolClick = (toolName) => {
    // Check if tool is coming soon
    if (COMING_SOON_TOOLS.includes(toolName)) {
      setShowComingSoon(true);
      setTimeout(() => setShowComingSoon(false), 2000);
      return;
    }

    if (isPremium) {
      if (toolName === 'valueFinder') return navigate('/value-finder');
      if (toolName === 'predictions') return navigate('/prediction-history');
      if (toolName === 'betSlip') return navigate('/bet-slip-builder');
      if (toolName === 'bankroll') return navigate('/bankroll-tracker');
      if (toolName === 'kelly') return navigate('/kelly-calculator');
      return;
    }
    setModal(toolName);
  };

  const MODAL_INFO = {
    valueFinder: { title: 'Value Finder is a Pro Feature', desc: 'Unlock Value Finder and all other Pro tools with Premium subscription.' },
    betSlip: { title: 'Bet Slip Builder is a Pro Feature', desc: 'Unlock Bet Slip Builder and all other Pro tools with Premium subscription.' },
    bankroll: { title: 'Bankroll Tracker is a Pro Feature', desc: 'Unlock Bankroll Tracker and all other Pro tools with Premium subscription.' },
    predictions: { title: 'Prediction History is a Pro Feature', desc: 'Unlock Prediction History and all other Pro tools with Premium subscription.' },
    kelly: { title: 'Kelly Calculator is a Pro Feature', desc: 'Unlock Kelly Calculator and all other Pro tools with Premium subscription.' },
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Pro Tools</h1>
          {!isPremium && (
            <button onClick={() => navigate('/premium')} className="flex items-center gap-1 text-accent-gold text-sm font-semibold">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
              </svg>
              Upgrade
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
                <p className="font-bold">Premium Active</p>
                <p className="text-sm text-white/80">Unlimited AI predictions</p>
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
                <p className="font-bold text-gray-900">Free Plan</p>
                <p className="text-sm text-gray-500">Upgrade to unlock all pro tools</p>
              </div>
              <button onClick={() => navigate('/premium')} className="bg-accent-gold text-white font-semibold px-4 py-2 rounded-lg text-sm">
                Upgrade
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-5 pt-2 pb-4 space-y-4">
        <h2 className="section-title">Betting Tools</h2>

        <ToolCard
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>}
          title="Value Bet Finder"
          subtitle="AI-powered analysis to find valuable betting opportunities"
          pro={!isPremium}
          locked={!isPremium}
          onClick={() => handleToolClick('valueFinder')}
        />
        <ToolCard
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>}
          title="Bet Slip Builder"
          subtitle="Build and manage your betting slips"
          pro={!isPremium}
          locked={!isPremium}
          onClick={() => handleToolClick('betSlip')}
        />
        <ToolCard
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/></svg>}
          title="Bankroll Tracker"
          subtitle="Track your betting bankroll and performance"
          pro={!isPremium}
          locked={!isPremium}
          onClick={() => handleToolClick('bankroll')}
        />
        <ToolCard
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z"/></svg>}
          title="Kelly Calculator"
          subtitle="Calculate optimal bet sizing based on edge"
          pro={!isPremium}
          locked={!isPremium}
          onClick={() => handleToolClick('kelly')}
        />
        <ToolCard
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/></svg>}
          title="Odds Converter"
          subtitle="Convert between decimal, fractional, and American odds"
          onClick={() => navigate('/odds-converter')}
        />
        <ToolCard
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
          title="Prediction History"
          subtitle="View all your past AI predictions and their results"
          pro={!isPremium}
          locked={!isPremium}
          onClick={() => handleToolClick('predictions')}
        />
        <ToolCard
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>}
          title="Your Stats"
          subtitle="Detailed accuracy, streaks, league breakdown"
          onClick={() => navigate('/your-stats')}
        />

        <div className="h-4"/>
      </div>

      {/* PRO Lock Modal - Compact version */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={() => setModal(null)}>
          <div className="absolute inset-0 bg-black/40"/>
          <div
            className="relative bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button onClick={() => setModal(null)} className="absolute top-3 right-3 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>

            {/* Icon + Title */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">PRO Feature</h3>
                <p className="text-xs text-gray-500">Available with subscription</p>
              </div>
            </div>

            {/* Free unlock option */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
              <p className="text-sm font-medium text-green-800 mb-1">🎁 Get it for FREE!</p>
              <p className="text-xs text-green-600">
                Register at {BOOKMAKER.name} → PRO for 30 days
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <a
                href={BOOKMAKER.link}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 text-sm"
              >
                Unlock for FREE
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
                </svg>
              </a>
              <button
                onClick={() => setModal(null)}
                className="w-full text-gray-500 text-sm py-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Support Chat triggered from modal */}
      {showSupportChat && (
        <SupportChatModal
          isOpen={showSupportChat}
          onClose={() => setShowSupportChat(false)}
          initialMessage="I want PRO access"
        />
      )}

      {/* Coming Soon Toast */}
      {showComingSoon && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span className="text-sm font-medium">Coming Soon!</span>
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureRow({ label }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
        </svg>
        <span className="font-medium text-gray-900">{label}</span>
      </div>
      <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd"/>
      </svg>
    </div>
  );
}

function ToolCard({ icon, title, subtitle, pro, locked, comingSoon, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`card flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow ${comingSoon ? 'opacity-70' : ''}`}
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${comingSoon ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-600'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`font-semibold ${comingSoon ? 'text-gray-500' : 'text-gray-900'}`}>{title}</p>
          {comingSoon && (
            <span className="text-[9px] font-bold bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
              SOON
            </span>
          )}
          {pro && !comingSoon && <span className="badge-pro text-[10px]">PRO</span>}
        </div>
        <p className="text-sm text-gray-500 truncate">{subtitle}</p>
      </div>
      {comingSoon ? (
        <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      ) : locked ? (
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
