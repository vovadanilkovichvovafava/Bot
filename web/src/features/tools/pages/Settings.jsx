import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../../../shared/i18n';
import { useAuth } from '../../auth/context/AuthContext';
import { useAdvertiser } from '../../../shared/context/AdvertiserContext';
import api from '../../../shared/api';
import SupportChat from '../../../shared/components/SupportChat';
import FootballSpinner from '../../../shared/components/FootballSpinner';
import { ENV } from '../../../shared/config/env';

const ODDS_VALUES = [1.3, 1.5, 1.7, 2.0, 2.5, 3.0, 4.0, 5.0];

export default function Settings() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { advertiser, trackClick } = useAdvertiser();
  const isFunnel2 = user?.funnel === 'funnel-2' || user?.funnel === 'funnel-4';
  const isPremium = user?.is_premium && !isFunnel2;
  const navigate = useNavigate();
  const [showLangModal, setShowLangModal] = useState(false);
  const [showOddsModal, setShowOddsModal] = useState(null);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [showSupportChat, setShowSupportChat] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationId, setVerificationId] = useState('');
  const [verificationSubmitting, setVerificationSubmitting] = useState(false);
  const [verificationSubmitted, setVerificationSubmitted] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [minOdds, setMinOdds] = useState(user?.min_odds || 1.5);
  const [maxOdds, setMaxOdds] = useState(user?.max_odds || 3.0);
  const [riskLevel, setRiskLevel] = useState(user?.risk_level || 'medium');
  const RISK_OPTIONS = [
    {
      key: 'low',
      label: t('settings.riskLow'),
      labelColor: 'text-green-600',
      summary: t('settings.riskLowSummary'),
      desc: t('settings.riskLowDesc'),
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
      label: t('settings.riskMedium'),
      labelColor: 'text-amber-600',
      summary: t('settings.riskMediumSummary'),
      desc: t('settings.riskMediumDesc'),
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
      label: t('settings.riskHigh'),
      labelColor: 'text-red-600',
      summary: t('settings.riskHighSummary'),
      desc: t('settings.riskHighDesc'),
      bg: 'bg-red-50',
      borderActive: 'border-red-400',
      icon: (
        <svg className="w-7 h-7 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/>
        </svg>
      ),
    },
  ];

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

  const handleVerificationSubmit = async () => {
    if (!verificationId.trim()) return;
    setVerificationSubmitting(true);
    try {
      const geoUrl = ENV.GEO_SERVER_URL;
      await fetch(`${geoUrl}/api/verification/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          email: user?.email,
          bookmakerId: verificationId.trim(),
          bookmaker: advertiser.name,
        }),
      });
      setVerificationSubmitted(true);
    } catch (e) {
      console.error('Failed to submit verification:', e);
    } finally {
      setVerificationSubmitting(false);
    }
  };

  return (
    <div className="bg-[#F0F2F5] min-h-screen pb-24">
      {/* ===== HEADER ===== */}
      <div className="px-4 pt-5 pb-6" style={{ background: 'linear-gradient(135deg, #1B2138 0%, #232a45 100%)' }}>
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
            </svg>
          </button>
          <h1 className="text-white text-xl font-black tracking-wide flex-1">STATSPRO</h1>
        </div>

        {/* Profile card inside header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/15 ring-2 ring-white/20 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-2xl">{(user?.username || 'U')[0].toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              {editingUsername ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder={t('settings.enterUsername')}
                    autoFocus
                    maxLength={30}
                  />
                  <button
                    onClick={async () => {
                      if (!newUsername.trim()) return;
                      setSavingUsername(true);
                      try {
                        await api.updateMe({ username: newUsername.trim() });
                        window.location.reload();
                      } catch { /* ignore */ }
                      setSavingUsername(false);
                      setEditingUsername(false);
                    }}
                    disabled={savingUsername || !newUsername.trim()}
                    className="shrink-0 px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg disabled:opacity-50"
                  >
                    {savingUsername ? '...' : 'OK'}
                  </button>
                  <button
                    onClick={() => setEditingUsername(false)}
                    className="shrink-0 text-white/60 text-xs px-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-white font-bold text-lg truncate">{user?.username || 'User'}</p>
                  <button
                    onClick={() => { setNewUsername(user?.username || ''); setEditingUsername(true); }}
                    className="text-white/40 hover:text-white/70 transition-colors shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/>
                    </svg>
                  </button>
                </>
              )}
            </div>
            <p className="text-white/50 text-sm truncate">{user?.email?.includes('@phone.local') ? '' : user?.email}</p>
            {/* Badge */}
            {isPremium ? (
              <span className="inline-flex items-center gap-1 mt-1.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                {t('settings.proMember', { defaultValue: 'PRO MEMBER' })}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 mt-1.5 bg-white/10 text-white/50 text-[10px] font-bold px-2.5 py-1 rounded-full">
                {t('settings.freePlan', { defaultValue: 'FREE PLAN' })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {/* ===== ACCOUNT SECTION ===== */}
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider px-1">{t('settings.accountSection', { defaultValue: 'Account' })}</p>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
          <MenuItem
            icon={<svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>}
            label={t('settings.accountDetails', { defaultValue: 'Account' })}
            subtitle={user?.email?.includes('@phone.local') ? (user?.phone || '') : (user?.email || '')}
          />
          <MenuItem
            icon={<svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/></svg>}
            label={t('settings.notifications')}
            subtitle={t('settings.notificationsDesc')}
          />
          <MenuItem
            icon={<svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
            label={t('settings.bettingLimits', { defaultValue: 'Betting Limits' })}
            subtitle={`${t('settings.riskLevel')}: ${riskInfo.label}`}
            onClick={() => setShowRiskModal(true)}
          />
          <MenuItem
            icon={<svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>}
            label={t('settings.security', { defaultValue: 'Security' })}
            subtitle={t('settings.securityDesc', { defaultValue: 'Password & verification' })}
            onClick={() => setShowSupportChat(true)}
          />
        </div>

        {/* ===== PREFERENCES ===== */}
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider px-1 pt-2">{t('settings.preferencesSection', { defaultValue: 'Preferences' })}</p>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
          <MenuItem
            icon={<svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802"/></svg>}
            label={t('settings.language', { defaultValue: 'Language' })}
            value={{ en: 'English', es: 'Espanol', pt: 'Portugues', fr: 'Francais', it: 'Italiano', pl: 'Polski', de: 'Deutsch' }[i18n.language] || i18n.language}
            onClick={() => setShowLangModal(true)}
          />
          <MenuItem
            icon={<svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181"/></svg>}
            label={t('settings.minOdds')}
            value={minOdds.toFixed(1)}
            onClick={() => setShowOddsModal('min')}
          />
          <MenuItem
            icon={<svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/></svg>}
            label={t('settings.maxOdds')}
            value={maxOdds.toFixed(1)}
            onClick={() => setShowOddsModal('max')}
          />
        </div>

        {/* ===== SUPPORT & INFO ===== */}
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider px-1 pt-2">{t('settings.supportSection', { defaultValue: 'Support' })}</p>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
          <MenuItem
            icon={<svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/></svg>}
            label={t('settings.contactSupport')}
            subtitle={t('settings.helpWithRegistration')}
            onClick={() => setShowSupportChat(true)}
          />
          <MenuItem
            icon={<svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"/></svg>}
            label={t('settings.beginnersGuide')}
            subtitle={t('settings.tipsToStart')}
            onClick={() => navigate('/guide')}
          />
          {!isFunnel2 && (
            <MenuItem
              icon={<svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24"><path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"/></svg>}
              label={t('settings.upgradePremium')}
              subtitle={t('settings.unlimitedPredictions')}
              onClick={() => navigate('/pro-access?reason=upgrade&feature=premium')}
            />
          )}
        </div>

        {/* ===== LOG OUT ===== */}
        <button
          onClick={handleLogout}
          className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 flex items-center gap-3 text-left"
        >
          <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/>
            </svg>
          </div>
          <span className="text-red-500 font-semibold text-sm">{t('settings.signOut')}</span>
        </button>

        {/* ===== FOOTER ===== */}
        <div className="text-center pt-2 pb-4">
          <p className="text-gray-400 text-xs">STATSPRO v1.0.2</p>
          <p className="text-gray-300 text-[10px] mt-1">{t('auth.copyright', { defaultValue: '(c) 2026 STATSPRO TECHNOLOGIES' })}</p>
        </div>
      </div>

      {/* ============ MODALS ============ */}

      {/* Language Modal */}
      {showLangModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowLangModal(false)}>
          <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t('settings.language', { defaultValue: 'Language' })}</h3>
            <div className="space-y-1">
              {[
                { code: 'en', flag: '\u{1F1EC}\u{1F1E7}', name: 'English' },
                { code: 'es', flag: '\u{1F1EA}\u{1F1F8}', name: 'Espanol' },
                { code: 'pt', flag: '\u{1F1F5}\u{1F1F9}', name: 'Portugues' },
                { code: 'fr', flag: '\u{1F1EB}\u{1F1F7}', name: 'Francais' },
                { code: 'it', flag: '\u{1F1EE}\u{1F1F9}', name: 'Italiano' },
                { code: 'pl', flag: '\u{1F1F5}\u{1F1F1}', name: 'Polski' },
                { code: 'de', flag: '\u{1F1E9}\u{1F1EA}', name: 'Deutsch' },
              ].map(lang => (
                <button
                  key={lang.code}
                  onClick={() => {
                    i18n.changeLanguage(lang.code);
                    try { localStorage.setItem('i18nManualLang', lang.code); } catch {}
                    setShowLangModal(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                    i18n.language === lang.code
                      ? 'bg-emerald-50 text-emerald-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl">{lang.flag}</span>
                  <span>{lang.name}</span>
                  {i18n.language === lang.code && (
                    <svg className="w-5 h-5 ml-auto text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Risk Level Modal */}
      {showRiskModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowRiskModal(false)}>
          <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('settings.riskLevelTitle')}</h3>
            <p className="text-sm text-gray-500 mb-5">{t('settings.riskLevelDesc')}</p>
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowOddsModal(null)}>
          <div className="bg-white w-full sm:max-w-xs rounded-t-3xl sm:rounded-3xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {showOddsModal === 'min' ? t('settings.minOdds') : t('settings.maxOdds')}
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
                        ? 'bg-emerald-50 text-emerald-600 font-bold'
                        : 'text-gray-700 hover:bg-gray-50'
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

      {/* Manual Verification Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => !verificationSubmitting && setShowVerificationModal(false)}>
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{t('settings.verificationTitle')}</h3>
              <button onClick={() => !verificationSubmitting && setShowVerificationModal(false)} className="text-gray-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            {verificationSubmitted ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">{t('settings.requestSubmitted')}</h4>
                <p className="text-sm text-gray-600 mb-4">{t('settings.verifyAndActivate')}</p>
                <button
                  onClick={() => {
                    setShowVerificationModal(false);
                    setVerificationSubmitted(false);
                    setVerificationId('');
                  }}
                  className="px-6 py-2 bg-emerald-500 text-white font-medium rounded-xl"
                >
                  {t('settings.gotIt')}
                </button>
              </div>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-5">
                  <p className="text-xs text-blue-700">
                    <span className="font-semibold">How it works:</span> {t('settings.howItWorks', { name: advertiser.name })}
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('settings.yourAccountId', { name: advertiser.name })}
                    </label>
                    <input
                      type="text"
                      value={verificationId}
                      onChange={(e) => setVerificationId(e.target.value)}
                      placeholder={t('settings.enterAccountId')}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('settings.findInProfile', { name: advertiser.name })}
                    </p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs text-amber-700">
                      <span className="font-semibold">Requirements:</span> {t('settings.verificationReq')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleVerificationSubmit}
                  disabled={!verificationId.trim() || verificationSubmitting}
                  className="w-full mt-6 py-3.5 bg-emerald-500 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {verificationSubmitting ? (
                    <>
                      <FootballSpinner size="xs" light />
                      {t('settings.submitting')}
                    </>
                  ) : (
                    t('settings.submitVerification')
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, subtitle, value, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
    >
      <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm">{label}</p>
        {subtitle && <p className="text-gray-500 text-xs truncate">{subtitle}</p>}
      </div>
      {value && <span className="text-gray-400 text-sm shrink-0">{value}</span>}
      <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
      </svg>
    </button>
  );
}
