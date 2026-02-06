import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import SupportChatModal, { BOOKMAKER } from '../components/SupportChat';

export default function ProTools() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);
  const [showSupportChat, setShowSupportChat] = useState(false);
  const isPremium = user?.is_premium;

  const handleToolClick = (toolName) => {
    if (isPremium) {
      if (toolName === 'valueFinder') return navigate('/value-finder');
      if (toolName === 'predictions') return navigate('/prediction-history');
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

      {/* PRO Lock Screen Modal - 2 paths */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setModal(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"/>
          <div
            className="relative bg-white rounded-t-3xl w-full max-w-lg px-6 pt-3 pb-8 animate-slideUp"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5"/>

            {/* Star icon */}
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
              </svg>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-gray-900 text-center mb-1">
              Открой {modal === 'valueFinder' ? 'Value Finder' : modal === 'bankroll' ? 'Bankroll Tracker' : modal === 'betSlip' ? 'Bet Slip Builder' : 'PRO'} бесплатно!
            </h2>
            <p className="text-gray-500 text-center text-sm mb-5">
              Зарегистрируйся в {BOOKMAKER.name} и получи полный PRO-доступ на 30 дней
            </p>

            {/* 3 Steps */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                <span className="text-sm text-gray-700">Зарегистрируйся в {BOOKMAKER.name} по ссылке</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                <span className="text-sm text-gray-700">Внеси первый депозит от {BOOKMAKER.minDeposit}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">✓</span>
                <span className="text-sm text-gray-700">PRO откроется автоматически!</span>
              </div>
            </div>

            {/* Bonus badge */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 mb-5 flex items-center gap-3">
              <span className="text-2xl">🎁</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Бонус {BOOKMAKER.bonus} для новых игроков</p>
                <p className="text-xs text-gray-500">+ бесплатный PRO-доступ на 30 дней</p>
              </div>
            </div>

            {/* Path A: Register button */}
            <a
              href={BOOKMAKER.link}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              <span>Зарегистрироваться в {BOOKMAKER.name}</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
              </svg>
            </a>

            {/* Path B: Contact support */}
            <button
              onClick={() => { setModal(null); setShowSupportChat(true); }}
              className="w-full text-primary-600 font-semibold py-3 mt-2 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/>
              </svg>
              Нужна помощь? Напиши нам
            </button>

            {/* Already registered note */}
            <p className="text-center text-xs text-gray-400 mt-3">
              Уже зарегистрирован? Доступ откроется автоматически
            </p>
          </div>
        </div>
      )}

      {/* Support Chat triggered from modal */}
      {showSupportChat && (
        <SupportChatModal
          isOpen={showSupportChat}
          onClose={() => setShowSupportChat(false)}
          initialMessage="Хочу PRO доступ"
        />
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

function ToolCard({ icon, title, subtitle, pro, locked, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`card flex items-center gap-4 ${locked ? 'cursor-pointer' : onClick ? 'cursor-pointer hover:shadow-md' : ''} transition-shadow`}
    >
      <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
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
