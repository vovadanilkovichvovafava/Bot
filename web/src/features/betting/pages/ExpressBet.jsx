import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/context/AuthContext';
import { useAdvertiser } from '../../../shared/context/AdvertiserContext';
import { getTrackingLink } from '../services/trackingService';
import api from '../../../shared/api';

const LEAGUE_FLAGS = {
  SA: '\u{1F1EE}\u{1F1F9}', PL: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', BL1: '\u{1F1E9}\u{1F1EA}', PD: '\u{1F1EA}\u{1F1F8}', FL1: '\u{1F1EB}\u{1F1F7}',
  CL: '\u{1F3C6}', EL: '\u{1F3C6}', EKS: '\u{1F1F5}\u{1F1F1}', SB: '\u{1F1EE}\u{1F1F9}', ELC: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
};

const PRESET_ICONS = {
  daily_safe: { bg: 'from-emerald-500 to-green-600', icon: '\u{1F6E1}\u{FE0F}' },
  daily_value: { bg: 'from-blue-500 to-indigo-600', icon: '\u{2B50}' },
  daily_risky: { bg: 'from-orange-500 to-red-600', icon: '\u{1F525}' },
  pro_3legs: { bg: 'from-purple-500 to-violet-600', icon: '\u{26A1}' },
  pro_5legs: { bg: 'from-purple-500 to-indigo-600', icon: '\u{1F3AF}' },
  pro_7legs: { bg: 'from-purple-600 to-pink-600', icon: '\u{1F680}' },
};

export default function ExpressBet() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { trackClick } = useAdvertiser();
  const navigate = useNavigate();

  const isPro = user?.is_premium || user?.funnel === 'funnel-2';
  const isFonbetUser = user?.is_premium;

  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedExpress, setSelectedExpress] = useState(null);
  const [activeTab, setActiveTab] = useState('free'); // 'free' | 'pro' | 'leagues'

  // History
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load menu
  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getExpressMenu();
      setMenu(data.expresses || []);
      // Auto-select first free express
      const freeExpresses = (data.expresses || []).filter(e => !e.is_pro_only);
      if (freeExpresses.length > 0 && !selectedExpress) {
        setSelectedExpress(freeExpresses[0]);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await api.getExpressHistory(20);
      setHistory(data);
      setShowHistory(true);
    } catch {}
  };

  const getBetLink = (leg) => {
    if (leg.fonbet_deeplink && isFonbetUser) {
      return leg.fonbet_deeplink;
    }
    return getTrackingLink(user?.id, 'express_bet');
  };

  const getExpressBetLink = (express) => {
    const firstLeg = express?.legs?.[0];
    if (!firstLeg) return null;
    return getBetLink(firstLeg);
  };

  // Split menu into categories
  const freeExpresses = menu.filter(e => !e.is_pro_only && !e.preset?.startsWith('league_'));
  const proExpresses = menu.filter(e => e.is_pro_only && !e.preset?.startsWith('league_'));
  const leagueExpresses = menu.filter(e => e.preset?.startsWith('league_'));

  const getActiveList = () => {
    if (activeTab === 'free') return freeExpresses;
    if (activeTab === 'pro') return proExpresses;
    if (activeTab === 'leagues') return leagueExpresses;
    return [];
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 px-5 pt-12 pb-6 text-white">
        <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-white/70 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          {t('common.back', { defaultValue: 'Back' })}
        </button>
        <h1 className="text-2xl font-black mb-1">{t('express.title', { defaultValue: 'AI Express' })}</h1>
        <p className="text-white/70 text-sm">
          {t('express.menuSubtitle', { defaultValue: 'Pick from ready-made accumulators — updated every 30 min' })}
        </p>
      </div>

      <div className="px-4 -mt-3 space-y-4">
        {/* Loading / Error */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-8 text-center">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"/>
            <p className="text-xs text-gray-400">{t('express.loading', { defaultValue: 'Loading express...' })}</p>
          </div>
        )}

        {error && (
          <div className="bg-white rounded-2xl shadow-sm border border-red-100 px-4 py-6 text-center">
            <p className="text-sm text-gray-500">{t('express.noMatches', { defaultValue: 'No matches available today. Check back later!' })}</p>
            <button onClick={loadMenu} className="mt-2 text-xs font-bold text-indigo-600">
              {t('express.retry', { defaultValue: 'Retry' })}
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Tab bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5 flex gap-1">
              <TabButton
                active={activeTab === 'free'}
                onClick={() => setActiveTab('free')}
                label={t('express.tabFree', { defaultValue: 'Free' })}
                count={freeExpresses.length}
              />
              <TabButton
                active={activeTab === 'pro'}
                onClick={() => setActiveTab('pro')}
                label={t('express.tabPro', { defaultValue: 'PRO' })}
                count={proExpresses.length}
                locked={!isPro}
              />
              <TabButton
                active={activeTab === 'leagues'}
                onClick={() => setActiveTab('leagues')}
                label={t('express.tabLeagues', { defaultValue: 'By League' })}
                count={leagueExpresses.length}
                locked={!isPro}
              />
            </div>

            {/* PRO upsell for locked tabs */}
            {!isPro && (activeTab === 'pro' || activeTab === 'leagues') && (
              <ProUpsell t={t} navigate={navigate} />
            )}

            {/* Express cards grid */}
            {(activeTab === 'free' || isPro) && (
              <div className="space-y-3">
                {getActiveList().length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-6 text-center">
                    <p className="text-sm text-gray-400">
                      {t('express.noExpresses', { defaultValue: 'No expresses available yet. Check back soon!' })}
                    </p>
                  </div>
                ) : (
                  getActiveList().map(express => (
                    <PresetCard
                      key={express.id}
                      express={express}
                      isSelected={selectedExpress?.id === express.id}
                      onSelect={() => setSelectedExpress(
                        selectedExpress?.id === express.id ? null : express
                      )}
                      getBetLink={getBetLink}
                      getExpressBetLink={getExpressBetLink}
                      t={t}
                      trackClick={trackClick}
                      userId={user?.id}
                    />
                  ))
                )}
              </div>
            )}

            {/* History */}
            {isPro && (
              <button
                onClick={showHistory ? () => setShowHistory(false) : loadHistory}
                className="w-full text-center text-sm text-gray-500 font-medium py-2"
              >
                {showHistory ? t('express.hideHistory', { defaultValue: 'Hide history' }) : t('express.showHistory', { defaultValue: 'Show history' })}
              </button>
            )}

            {showHistory && history.length > 0 && (
              <div className="space-y-3">
                {history.map(exp => (
                  <div key={exp.id} className="bg-white rounded-xl p-3 border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400">
                        {new Date(exp.created_at).toLocaleDateString()}
                      </span>
                      <StatusBadge status={exp.status} t={t} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900">{exp.leg_count} {t('express.legs', { defaultValue: 'legs' })}</span>
                      <span className="text-sm font-black text-indigo-600">&times;{exp.total_odds}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


function TabButton({ active, onClick, label, count, locked }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
        active
          ? 'bg-indigo-500 text-white shadow-sm'
          : 'text-gray-500 hover:bg-gray-50'
      }`}
    >
      {locked && (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
        </svg>
      )}
      {label}
      {count > 0 && <span className={`text-xs ${active ? 'text-white/70' : 'text-gray-400'}`}>({count})</span>}
    </button>
  );
}


function PresetCard({ express, isSelected, onSelect, getBetLink, getExpressBetLink, t, trackClick, userId }) {
  const presetStyle = PRESET_ICONS[express.preset] || { bg: 'from-gray-500 to-gray-600', icon: '\u{26BD}' };
  const leagueCode = express.preset?.startsWith('league_') ? express.preset.replace('league_', '').toUpperCase() : null;
  const betLink = getExpressBetLink(express);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Preset header — clickable to expand */}
      <button onClick={onSelect} className="w-full px-4 py-3 flex items-center gap-3 text-left">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${presetStyle.bg} flex items-center justify-center text-lg flex-shrink-0`}>
          {leagueCode ? (LEAGUE_FLAGS[leagueCode] || '\u{26BD}') : presetStyle.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm">{express.preset_label || express.preset}</p>
          <p className="text-xs text-gray-500 truncate">{express.preset_description}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-black text-gray-900">&times;{express.total_odds}</p>
          <p className="text-xs text-gray-400">{express.leg_count} {t('express.legs', { defaultValue: 'legs' })}</p>
        </div>
        <svg className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${isSelected ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
        </svg>
      </button>

      {/* Expanded legs */}
      {isSelected && (
        <div className="border-t border-gray-100">
          <div className="divide-y divide-gray-50">
            {express.legs.map((leg, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {leg.home_team} &mdash; {leg.away_team}
                  </p>
                  <p className="text-xs text-gray-400">
                    {leg.league && <span className="mr-1">{LEAGUE_FLAGS[leg.league] || ''}</span>}
                    {leg.match_date ? new Date(leg.match_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded-lg">
                    {leg.bet_type}
                  </span>
                  <p className="text-sm font-black text-gray-900 mt-0.5">{leg.odds}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer: total odds + bet button */}
          <div className="px-4 py-3 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-gray-500 font-medium">{t('express.totalOdds', { defaultValue: 'Total Odds' })}</p>
                <p className="text-xl font-black text-gray-900">&times;{express.total_odds}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 font-medium">{t('express.confidence', { defaultValue: 'AI Confidence' })}</p>
                <p className="text-lg font-black text-emerald-600">{Math.round((express.avg_confidence || 0) * 100)}%</p>
              </div>
            </div>

            {betLink && (
              <a
                href={betLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackClick?.(userId, 'express_bet')}
                className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/>
                </svg>
                {t('express.placeBet', { defaultValue: 'Place Bet' })}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


function ProUpsell({ t, navigate }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 px-5 py-5 text-white">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
          </svg>
          <h3 className="font-black text-lg">{t('express.proUpsellTitle', { defaultValue: 'PRO Express Menu' })}</h3>
        </div>
        <p className="text-white/80 text-sm leading-relaxed">
          {t('express.proMenuDesc', { defaultValue: 'Unlock PRO presets: Quick 3, Classic 5, Big 7, and league-specific accumulators. All pre-generated and ready to bet!' })}
        </p>
      </div>

      <div className="px-4 py-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-sm">\u{26A1}</span>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{t('express.proFeatureQuick', { defaultValue: 'Quick 3 — fast results' })}</p>
            <p className="text-xs text-gray-500">{t('express.proFeatureQuickDesc', { defaultValue: '3 high-confidence legs for quick wins' })}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-sm">\u{1F680}</span>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{t('express.proFeatureBig', { defaultValue: 'Big 7 — maximum payout' })}</p>
            <p className="text-xs text-gray-500">{t('express.proFeatureBigDesc', { defaultValue: '7 legs with AI-optimized selection' })}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-sm">\u{26BD}</span>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{t('express.proFeatureLeague', { defaultValue: 'League-specific picks' })}</p>
            <p className="text-xs text-gray-500">{t('express.proFeatureLeagueDesc', { defaultValue: 'Serie A, Premier League, La Liga and more' })}</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-2">
          <p className="font-bold text-amber-900 text-sm mb-2">{t('express.howToGetPro', { defaultValue: 'How to get PRO?' })}</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-amber-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</div>
              <p className="text-xs text-amber-800">{t('express.proStep1', { defaultValue: 'Register with our partner bookmaker' })}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-amber-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</div>
              <p className="text-xs text-amber-800">{t('express.proStep2', { defaultValue: 'Make a deposit (any amount)' })}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-amber-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</div>
              <p className="text-xs text-amber-800">{t('express.proStep3', { defaultValue: 'PRO activates automatically + deposit bonus x2.5!' })}</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/promo?banner=express_unlock_pro')}
          className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 mt-1"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
          </svg>
          {t('express.getProNow', { defaultValue: 'Get PRO — Unlock All Express' })}
        </button>
      </div>
    </div>
  );
}


function StatusBadge({ status, t }) {
  const styles = {
    pending: 'bg-gray-100 text-gray-600',
    won: 'bg-emerald-100 text-emerald-700',
    lost: 'bg-red-100 text-red-600',
    partial: 'bg-amber-100 text-amber-700',
  };
  const labels = {
    pending: t('express.statusPending', { defaultValue: 'Pending' }),
    won: t('express.statusWon', { defaultValue: 'Won' }),
    lost: t('express.statusLost', { defaultValue: 'Lost' }),
    partial: t('express.statusPartial', { defaultValue: 'Partial' }),
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  );
}
