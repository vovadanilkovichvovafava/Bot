import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Settings() {
  const { user, logout, isDemo } = useAuth();
  const navigate = useNavigate();
  const [showLangModal, setShowLangModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showOddsModal, setShowOddsModal] = useState(null);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [language, setLanguage] = useState(user?.language || 'en');
  const [theme, setTheme] = useState('system');
  const [minOdds, setMinOdds] = useState(user?.min_odds || 1.5);
  const [maxOdds, setMaxOdds] = useState(user?.max_odds || 3.0);
  const [riskLevel, setRiskLevel] = useState(user?.risk_level || 'medium');

  const langNames = { en: 'English', ru: 'Russian', pt: 'Portuguese', es: 'Spanish' };
  const themeNames = { light: 'Light', dark: 'Dark', system: 'System' };
  const riskNames = { low: 'LOW - 1-2% stakes', medium: 'MEDIUM - 2-5% stakes', high: 'HIGH - 5-10% stakes' };

  const handleUpdate = async (data) => {
    if (isDemo) return;
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

        {/* General Settings */}
        <SettingsItem
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582"/></svg>}
          label="Language"
          value={langNames[language]}
          onClick={() => setShowLangModal(true)}
        />
        <SettingsItem
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z"/></svg>}
          label="Theme"
          value={themeNames[theme]}
          onClick={() => setShowThemeModal(true)}
        />
        <SettingsItem
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/></svg>}
          label="Notifications"
          value=""
          onClick={() => {}}
        />

        <div className="h-3"/>

        {/* AI Betting Preferences */}
        <div className="mb-3">
          <p className="text-primary-600 font-semibold text-sm mb-1">AI Betting Preferences</p>
          <p className="text-xs text-gray-500 mb-3">These settings personalize AI recommendations for you</p>

          <div className="card mb-3 border-2 border-primary-100">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
              </svg>
              <span className="font-semibold text-primary-600">Your AI Profile</span>
            </div>
            <p className="text-sm text-gray-700">Odds range: {minOdds} - {maxOdds}</p>
            <p className="text-sm text-gray-700">Risk: {riskLevel.toUpperCase()} ({riskLevel === 'low' ? '1-2%' : riskLevel === 'medium' ? '2-5%' : '5-10%'} stakes)</p>
            <p className="text-xs text-gray-400 italic mt-1">AI suggests balanced mix of 1X2, over/under, BTTS</p>
          </div>
        </div>

        <SettingsItem
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181"/></svg>}
          label="Minimum Odds"
          value={`AI won't recommend below ${minOdds}`}
          onClick={() => setShowOddsModal('min')}
        />
        <SettingsItem
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/></svg>}
          label="Maximum Odds"
          value={`AI won't recommend above ${maxOdds}`}
          onClick={() => setShowOddsModal('max')}
        />
        <SettingsItem
          icon={<svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>}
          label="Risk Level"
          value={`${riskLevel.toUpperCase()} - ${riskLevel === 'low' ? '1-2%' : riskLevel === 'medium' ? '2-5%' : '5-10%'} stakes`}
          onClick={() => setShowRiskModal(true)}
        />

        <div className="h-3"/>

        <SettingsItem
          icon={<svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24"><path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"/></svg>}
          label="Upgrade to Premium"
          value="Unlimited predictions"
          onClick={() => navigate('/pro-tools')}
        />

        <SettingsItem
          icon={<svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>}
          label="About"
          value="Version 1.0.0"
        />

        <div className="h-3"/>

        {/* Sign Out */}
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

      {/* Language Modal */}
      {showLangModal && (
        <Modal title="Language" onClose={() => setShowLangModal(false)}>
          {Object.entries(langNames).map(([code, name]) => (
            <button
              key={code}
              onClick={() => { setLanguage(code); handleUpdate({ language: code }); setShowLangModal(false); }}
              className={`w-full text-left px-4 py-3 rounded-xl ${language === code ? 'bg-primary-50 text-primary-600 font-semibold' : 'text-gray-700'}`}
            >
              {name}
            </button>
          ))}
        </Modal>
      )}

      {/* Theme Modal */}
      {showThemeModal && (
        <Modal title="Theme" onClose={() => setShowThemeModal(false)}>
          {Object.entries(themeNames).map(([code, name]) => (
            <button
              key={code}
              onClick={() => { setTheme(code); setShowThemeModal(false); }}
              className={`w-full text-left px-4 py-3 rounded-xl ${theme === code ? 'bg-primary-50 text-primary-600 font-semibold' : 'text-gray-700'}`}
            >
              {name}
            </button>
          ))}
        </Modal>
      )}

      {/* Odds Modal */}
      {showOddsModal && (
        <Modal title={showOddsModal === 'min' ? 'Minimum Odds' : 'Maximum Odds'} onClose={() => setShowOddsModal(null)}>
          {[1.2, 1.3, 1.5, 1.8, 2.0, 2.5, 3.0, 4.0, 5.0].map(v => {
            const current = showOddsModal === 'min' ? minOdds : maxOdds;
            return (
              <button
                key={v}
                onClick={() => {
                  if (showOddsModal === 'min') { setMinOdds(v); handleUpdate({ min_odds: v }); }
                  else { setMaxOdds(v); handleUpdate({ max_odds: v }); }
                  setShowOddsModal(null);
                }}
                className={`w-full text-left px-4 py-3 rounded-xl ${current === v ? 'bg-primary-50 text-primary-600 font-semibold' : 'text-gray-700'}`}
              >
                {v.toFixed(1)}
              </button>
            );
          })}
        </Modal>
      )}

      {/* Risk Modal */}
      {showRiskModal && (
        <Modal title="Risk Level" onClose={() => setShowRiskModal(false)}>
          {Object.entries(riskNames).map(([code, name]) => (
            <button
              key={code}
              onClick={() => { setRiskLevel(code); handleUpdate({ risk_level: code }); setShowRiskModal(false); }}
              className={`w-full text-left px-4 py-3 rounded-xl ${riskLevel === code ? 'bg-primary-50 text-primary-600 font-semibold' : 'text-gray-700'}`}
            >
              {name}
            </button>
          ))}
        </Modal>
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

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-gray-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="space-y-1">{children}</div>
      </div>
    </div>
  );
}
