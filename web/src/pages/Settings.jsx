import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAdvertiser } from '../context/AdvertiserContext';
import api from '../api';
import SupportChat from '../components/SupportChat';
import { getReferralStats, copyReferralLink, getReferralLink } from '../services/referralStore';

const ODDS_VALUES = [1.3, 1.5, 1.7, 2.0, 2.5, 3.0, 4.0, 5.0];

const RISK_OPTIONS = [
  {
    key: 'low',
    label: 'LOW',
    labelColor: 'text-green-600',
    summary: 'Safer bets \u2022 1-2% stakes',
    desc: 'Double chance, under goals, low odds favorites',
    bg: 'bg-green-50',
    borderActive: 'border-green-400',
    icon: (
      <svg className="w-7 h-7 text-green-500" fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.932 9.563 12.348a.749.749 0 00.374 0c5.499-1.416 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516 11.209 11.209 0 01-7.877-3.08zm3.044 7.89a.75.75 0 10-1.12-.998l-3.236 3.636L9.53 11.022a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.09-.03l3.75-4.242z" clipRule="evenodd"/>
      </svg>
    ),
  },
  {
    key: 'medium',
    label: 'MEDIUM',
    labelColor: 'text-amber-600',
    summary: 'Balanced \u2022 2-5% stakes',
    desc: '1X2, over/under, BTTS, moderate odds',
    bg: 'bg-amber-50',
    borderActive: 'border-amber-400',
    icon: (
      <svg className="w-7 h-7 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
      </svg>
    ),
  },
  {
    key: 'high',
    label: 'HIGH',
    labelColor: 'text-red-600',
    summary: 'Aggressive \u2022 5-10% stakes',
    desc: 'Accumulators, correct scores, value picks',
    bg: 'bg-red-50',
    borderActive: 'border-red-400',
    icon: (
      <svg className="w-7 h-7 text-red-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/>
      </svg>
    ),
  },
];

export default function Settings() {
  const { user, logout, togglePremium, bookmakerAccount, bookmakerBalance, connectBookmaker, disconnectBookmaker } = useAuth();
  const { advertiser, trackClick } = useAdvertiser();
  const navigate = useNavigate();
  const [showOddsModal, setShowOddsModal] = useState(null);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [showSupportChat, setShowSupportChat] = useState(false);
  const [showBookmakerModal, setShowBookmakerModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [bookmakerLogin, setBookmakerLogin] = useState('');
  const [bookmakerPassword, setBookmakerPassword] = useState('');
  const [connectingBookmaker, setConnectingBookmaker] = useState(false);
  const [minOdds, setMinOdds] = useState(user?.min_odds || 1.5);
  const [maxOdds, setMaxOdds] = useState(user?.max_odds || 3.0);
  const [riskLevel, setRiskLevel] = useState(user?.risk_level || 'medium');
  const [referralStats, setReferralStats] = useState(null);
  const [referralCopied, setReferralCopied] = useState(false);

  // Load referral stats
  useEffect(() => {
    if (user?.id) {
      setReferralStats(getReferralStats(user.id));
    }
  }, [user?.id]);

  const riskInfo = RISK_OPTIONS.find(r => r.key === riskLevel) || RISK_OPTIONS[1];

  const handleUpdate = async (data) => {
    try {
      await api.updateMe(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleConnectBookmaker = async () => {
    if (!bookmakerLogin || !bookmakerPassword) return;
    setConnectingBookmaker(true);
    try {
      await connectBookmaker(bookmakerLogin, bookmakerPassword);
      setShowBookmakerModal(false);
      setBookmakerLogin('');
      setBookmakerPassword('');
    } catch (e) {
      console.error('Failed to connect bookmaker:', e);
    } finally {
      setConnectingBookmaker(false);
    }
  };

  return (
    <div>
      <div className="bg-white px-5 pt-6 pb-4">
        <h1 className="text-xl font-bold text-center">Settings</h1>
      </div>

      <div className="px-5 pt-4 pb-8 space-y-0">
        {/* Profile */}
        <div className="card mb-3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-700 font-bold text-lg">
                {(user?.username || user?.email || 'U')[0].toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-bold text-gray-900">{user?.username || user?.email?.split('@')[0]}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Bookmaker Partner Status */}
        <div className="mb-3">
          <p className="text-primary-600 font-semibold text-sm mb-1">Partner</p>
          <p className="text-xs text-gray-500 mb-3">{advertiser.name} registration status</p>
        </div>

        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-xl p-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-lg">🎁</span>
            </div>
            <div className="flex-1 min-w-0">
              {user?.is_premium ? (
                <>
                  <p className="text-sm font-semibold text-green-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    Registered
                  </p>
                  <p className="text-xs text-gray-600">PRO access active</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-gray-900">Bonus {advertiser.bonus}</p>
                  <p className="text-xs text-gray-600">Register to get PRO access</p>
                </>
              )}
            </div>
            {!user?.is_premium && (
              <a
                href={advertiser.link}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-xs px-3 py-1.5 rounded-lg shrink-0"
              >
                Get It
              </a>
            )}
          </div>
        </div>

        {/* One-Click Betting */}
        <div className="mb-3 mt-4">
          <p className="text-primary-600 font-semibold text-sm mb-1">One-Click Betting</p>
          <p className="text-xs text-gray-500 mb-3">Connect your account to place bets instantly</p>
        </div>

        {bookmakerAccount ? (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-green-700">Account Connected</p>
                <p className="text-xs text-gray-600">{bookmakerAccount.login}</p>
                {bookmakerBalance && (
                  <p className="text-xs text-green-600 font-medium mt-0.5">
                    Balance: ${bookmakerBalance.amount}
                  </p>
                )}
              </div>
              <button
                onClick={disconnectBookmaker}
                className="text-red-500 text-xs font-medium px-2 py-1"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowBookmakerModal(true)}
            className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl p-4 mb-3 flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold">Connect Account</p>
              <p className="text-xs text-white/80">Place bets directly from the app</p>
            </div>
            <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
            </svg>
          </button>
        )}

        <div className="h-3"/>

        <SettingsItem
          icon={<span className="text-lg">💬</span>}
          label="Contact Support"
          value="Help with registration & PRO"
          onClick={() => setShowSupportChat(true)}
        />

        <SettingsItem
          icon={<span className="text-lg">📚</span>}
          label="Beginner's Guide"
          value="10 tips to get started"
          onClick={() => navigate('/guide')}
        />

        <SettingsItem
          icon={<span className="text-lg">🎁</span>}
          label="Promo Page"
          value={`${advertiser.name} bonuses`}
          onClick={() => navigate('/promo')}
        />

        <div className="h-3"/>

        {/* AI Betting Preferences */}
        <div className="mb-3">
          <p className="text-primary-600 font-semibold text-sm mb-1">AI Betting Preferences</p>
          <p className="text-xs text-gray-500 mb-3">These settings personalize AI recommendations for you</p>
        </div>

        <SettingsItem
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181"/></svg>}
          label="Minimum Odds"
          value={minOdds.toFixed(1)}
          onClick={() => setShowOddsModal('min')}
        />
        <SettingsItem
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/></svg>}
          label="Maximum Odds"
          value={maxOdds.toFixed(1)}
          onClick={() => setShowOddsModal('max')}
        />
        <SettingsItem
          icon={<svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>}
          label="Risk Level"
          value={`${riskInfo.label} \u2022 ${riskLevel === 'low' ? '1-2%' : riskLevel === 'medium' ? '2-5%' : '5-10%'} stakes`}
          onClick={() => setShowRiskModal(true)}
        />

        <div className="h-3"/>

        {/* Referral Program */}
        <div className="mb-3">
          <p className="text-primary-600 font-semibold text-sm mb-1">Referral Program</p>
          <p className="text-xs text-gray-500 mb-3">Invite friends and earn free AI requests</p>
        </div>

        <button
          onClick={() => setShowReferralModal(true)}
          className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-4 mb-3 flex items-center gap-3 text-white"
        >
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold">Invite Friends</p>
            <p className="text-xs text-white/80">
              {referralStats?.totalReferrals > 0
                ? `${referralStats.totalReferrals} friends invited`
                : 'Get +1 free AI request per invite'}
            </p>
          </div>
          <div className="text-right">
            {referralStats?.freeRequests > 0 && (
              <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-full">
                +{referralStats.freeRequests}
              </span>
            )}
          </div>
        </button>

        <div className="h-3"/>

        <SettingsItem
          icon={<svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24"><path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"/></svg>}
          label="Upgrade to Premium"
          value="Unlimited predictions"
          onClick={() => navigate('/premium')}
        />

        <SettingsItem
          icon={<svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>}
          label="About"
          value="Version 1.0.2"
        />

        <div className="h-3"/>

        {/* Developer Testing */}
        <div className="mb-3">
          <p className="text-gray-400 font-semibold text-xs mb-1">DEV / TEST</p>
        </div>

        <button
          onClick={togglePremium}
          className={`w-full flex items-center gap-4 px-4 py-3.5 border-2 border-dashed rounded-xl text-left mb-3 ${
            user?.is_premium
              ? 'bg-green-50 border-green-300'
              : 'bg-gray-50 border-gray-300'
          }`}
        >
          <span className="text-lg">{user?.is_premium ? '✅' : '🔒'}</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">Toggle Premium (Test)</p>
            <p className={`text-sm ${user?.is_premium ? 'text-green-600' : 'text-gray-500'}`}>
              {user?.is_premium ? 'PRO active' : 'PRO disabled'}
            </p>
          </div>
          <div className={`px-2 py-1 rounded text-xs font-bold ${
            user?.is_premium ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'
          }`}>
            {user?.is_premium ? 'ON' : 'OFF'}
          </div>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-500 font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/>
          </svg>
          Sign Out
        </button>
      </div>

      {/* Risk Level Modal */}
      {showRiskModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6" onClick={() => setShowRiskModal(false)}>
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Risk Level</h3>
            <p className="text-sm text-gray-500 mb-5">Choose how aggressive AI recommendations should be:</p>

            <div className="space-y-3">
              {RISK_OPTIONS.map(opt => (
                <div
                  key={opt.key}
                  onClick={() => {
                    setRiskLevel(opt.key);
                    handleUpdate({ risk_level: opt.key });
                    setShowRiskModal(false);
                  }}
                  className={`flex items-start gap-3 p-4 rounded-2xl cursor-pointer border-2 transition-all ${
                    riskLevel === opt.key
                      ? `${opt.bg} ${opt.borderActive}`
                      : 'border-transparent bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${opt.bg}`}>
                    {opt.icon}
                  </div>
                  <div>
                    <p className="font-bold">
                      <span className={opt.labelColor}>{opt.label}</span>
                      <span className="text-gray-500 font-normal text-sm ml-2">{opt.summary}</span>
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">{opt.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Odds Modal */}
      {showOddsModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-6" onClick={() => setShowOddsModal(null)}>
          <div className="bg-[#F0F2F5] w-full max-w-xs rounded-3xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {showOddsModal === 'min' ? 'Minimum Odds' : 'Maximum Odds'}
            </h3>
            <div className="space-y-1">
              {ODDS_VALUES.map(v => {
                const current = showOddsModal === 'min' ? minOdds : maxOdds;
                return (
                  <button
                    key={v}
                    onClick={() => {
                      if (showOddsModal === 'min') { setMinOdds(v); handleUpdate({ min_odds: v }); }
                      else { setMaxOdds(v); handleUpdate({ max_odds: v }); }
                      setShowOddsModal(null);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl text-lg transition-colors ${
                      current === v
                        ? 'bg-primary-50 text-primary-600 font-bold'
                        : 'text-gray-700 hover:bg-white'
                    }`}
                  >
                    {v.toFixed(1)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Support Chat */}
      <SupportChat isOpen={showSupportChat} onClose={() => setShowSupportChat(false)} />

      {/* Bookmaker Connection Modal */}
      {showBookmakerModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowBookmakerModal(false)}>
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-xl animate-slideUp"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Connect Account</h3>
              <button onClick={() => setShowBookmakerModal(false)} className="text-gray-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5">
              <p className="text-xs text-amber-700">
                <span className="font-semibold">Note:</span> Enter your {advertiser.name} credentials.
                Data is stored locally and used only for placing bets.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Login / Email</label>
                <input
                  type="text"
                  value={bookmakerLogin}
                  onChange={(e) => setBookmakerLogin(e.target.value)}
                  placeholder="Enter login"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={bookmakerPassword}
                  onChange={(e) => setBookmakerPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              onClick={handleConnectBookmaker}
              disabled={!bookmakerLogin || !bookmakerPassword || connectingBookmaker}
              className="w-full mt-6 py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {connectingBookmaker ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                  </svg>
                  Connect
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Referral Modal */}
      {showReferralModal && referralStats && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowReferralModal(false)}>
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Invite Friends</h3>
              <button onClick={() => setShowReferralModal(false)} className="text-gray-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Reward explanation */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 mb-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-purple-800">Earn Free AI Requests</p>
                  <p className="text-xs text-purple-600">+1 request per friend who joins</p>
                </div>
              </div>
            </div>

            {/* Referral stats */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{referralStats.totalReferrals}</p>
                <p className="text-xs text-gray-500">Invited</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{referralStats.activeReferrals}</p>
                <p className="text-xs text-gray-500">Active</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-600">+{referralStats.freeRequests}</p>
                <p className="text-xs text-green-600">Earned</p>
              </div>
            </div>

            {/* Referral code */}
            <div className="mb-5">
              <p className="text-sm font-medium text-gray-700 mb-2">Your Referral Code</p>
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-3">
                <code className="flex-1 text-lg font-mono font-bold text-gray-900">{referralStats.code}</code>
                <button
                  onClick={async () => {
                    await copyReferralLink(referralStats.code);
                    setReferralCopied(true);
                    setTimeout(() => setReferralCopied(false), 2000);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    referralCopied
                      ? 'bg-green-500 text-white'
                      : 'bg-primary-500 text-white hover:bg-primary-600'
                  }`}
                >
                  {referralCopied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>

            {/* Share buttons */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(getReferralLink(referralStats.code))}&text=${encodeURIComponent('Join me on PVA Betting App!')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1"
              >
                <div className="w-12 h-12 bg-[#0088cc] rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                </div>
                <span className="text-[10px] text-gray-500">Telegram</span>
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent('Join me on PVA Betting App! ' + getReferralLink(referralStats.code))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1"
              >
                <div className="w-12 h-12 bg-[#25D366] rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <span className="text-[10px] text-gray-500">WhatsApp</span>
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Join me on PVA Betting App!')}&url=${encodeURIComponent(getReferralLink(referralStats.code))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1"
              >
                <div className="w-12 h-12 bg-[#1DA1F2] rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </div>
                <span className="text-[10px] text-gray-500">X</span>
              </a>
              <button
                onClick={async () => {
                  await copyReferralLink(referralStats.code);
                  setReferralCopied(true);
                  setTimeout(() => setReferralCopied(false), 2000);
                }}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-12 h-12 bg-gray-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"/>
                  </svg>
                </div>
                <span className="text-[10px] text-gray-500">Copy</span>
              </button>
            </div>

            <p className="text-center text-xs text-gray-400">
              Share your link with friends and earn rewards when they sign up!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsItem({ icon, label, value, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-3.5 bg-white border-b border-gray-50 text-left"
    >
      <span className="text-gray-500">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900">{label}</p>
        {value && <p className="text-sm text-gray-500 truncate">{value}</p>}
      </div>
      <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
      </svg>
    </button>
  );
}
