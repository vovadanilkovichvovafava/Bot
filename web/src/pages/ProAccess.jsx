import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useAdvertiser } from '../context/AdvertiserContext';
import SupportChat from '../components/SupportChat';
import geoService from '../services/geoService';
import FootballSpinner from '../components/FootballSpinner';
import { getTrackingLink } from '../services/trackingService';
import { track } from '../services/analytics';


// Download icon for CTA button
const DownloadIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

export default function ProAccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { advertiser } = useAdvertiser();
  const [showChat, setShowChat] = useState(false);
  const [bookmakerLink, setBookmakerLink] = useState(null);
  const [loadingLink, setLoadingLink] = useState(false);

  const feature = searchParams.get('feature');

  // Fetch geo info and build tracking link on mount
  useEffect(() => {
    async function fetchGeoAndLink() {
      setLoadingLink(true);
      try {
        const geo = await geoService.getGeoInfo();

        const userId = user?.id || `anon_${Date.now()}`;
        const banner = feature ? `pro_access_${feature}` : 'pro_access_page';
        const link = await getTrackingLink(userId, banner);
        if (link) {
          setBookmakerLink(link);
        } else {
          setBookmakerLink(`https://bootballgame.shop/?sub_id_10=${userId}&sub_id_11=${banner}`);
        }
      } catch (error) {
        console.error('Failed to fetch geo/link:', error);
        const userId = user?.id || `anon_${Date.now()}`;
        const banner = feature ? `pro_access_${feature}` : 'pro_access_page';
        setBookmakerLink(`https://bootballgame.shop/?sub_id_10=${userId}&sub_id_11=${banner}`);
      } finally {
        setLoadingLink(false);
      }
    }

    fetchGeoAndLink();
  }, [user?.id]);

  const benefits = [
    { emoji: '\u267E\uFE0F', titleKey: 'proAccess.benefit1Title', descKey: 'proAccess.benefit1Desc', highlight: true },
    { emoji: '\uD83D\uDCAC', titleKey: 'proAccess.benefit2Title', descKey: 'proAccess.benefit2Desc', highlight: true },
    { emoji: '\uD83D\uDCB0', titleKey: 'proAccess.benefit3Title', descKey: 'proAccess.benefit3Desc' },
    { emoji: '\uD83D\uDD0D', titleKey: 'proAccess.benefit4Title', descKey: 'proAccess.benefit4Desc' },
    { emoji: '\uD83D\uDCCB', titleKey: 'proAccess.benefit5Title', descKey: 'proAccess.benefit5Desc' },
    { emoji: '\uD83D\uDD04', titleKey: 'proAccess.benefit6Title', descKey: 'proAccess.benefit6Desc' },
  ];

  const steps = [
    { titleKey: 'proAccess.step1Title', descKey: 'proAccess.step1Desc' },
    { titleKey: 'proAccess.step2Title', descKey: 'proAccess.step2Desc' },
    { titleKey: 'proAccess.step3Title', descKey: 'proAccess.step3Desc' },
  ];

  return (
    <div className="min-h-screen bg-[#F0F4F8] overflow-y-auto pb-28" style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif" }}>

      {/* ===== HEADER ===== */}
      <div
        className="text-center px-6 pt-9 pb-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0F2744 0%, #1B3A5C 40%, #2B5A8C 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-12 w-48 h-48 rounded-full" style={{ background: 'rgba(232,163,23,0.06)' }} />
        <div className="absolute -bottom-16 -left-10 w-40 h-40 rounded-full" style={{ background: 'rgba(255,255,255,0.03)' }} />

        {/* PRO icon with logo */}
        <div
          className="w-24 h-24 rounded-[20px] flex items-center justify-center mx-auto mb-4 relative z-10 animate-[fadeUp_0.4s_ease_both] overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #F7C948 0%, #E8A317 50%, #D4940F 100%)', boxShadow: '0 4px 20px rgba(232,163,23,0.3)' }}
        >
          <span className="text-4xl font-black text-white">PRO</span>
        </div>

        <h1 className="text-2xl font-extrabold text-white leading-tight mb-2 relative z-10 animate-[fadeUp_0.4s_ease_0.05s_both]">
          {t('proAccess.heroTitle').split('PRO').map((part, i, arr) =>
            i < arr.length - 1 ? (
              <span key={i}>{part}<span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #F7C948 0%, #E8A317 50%, #D4940F 100%)' }}>PRO</span></span>
            ) : <span key={i}>{part}</span>
          )}
        </h1>
        <p className="text-sm text-white/65 leading-relaxed relative z-10 animate-[fadeUp_0.4s_ease_0.1s_both]">
          {t('proAccess.heroSubtitle')}
        </p>
      </div>

      {/* ===== LIMIT ALERT ===== */}
      <div className="mx-4 -mt-4 bg-red-50 border border-red-200 rounded-[14px] p-3.5 flex gap-2.5 items-start relative z-[2] animate-[fadeUp_0.4s_ease_0.15s_both]">
        <span className="text-lg flex-shrink-0 mt-0.5">{'\u26A0\uFE0F'}</span>
        <p className="text-[13px] text-red-800 leading-[1.45] font-medium">
          {t('proAccess.limitDesc')}
        </p>
      </div>

      {/* ===== HOW TO UNLOCK ===== */}
      <div className="px-4 pt-6">
        <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-[0_2px_8px_rgba(0,0,0,0.04)] animate-[fadeUp_0.4s_ease_0.2s_both]">
          <h2 className="text-[17px] font-extrabold text-[#1B3A5C] mb-4 flex items-center gap-2">
            {'\uD83D\uDCF2'} {t('proAccess.howToTitle')} — {t('proAccess.threeSteps')}
          </h2>

          <div className="space-y-0">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-3.5 items-start relative mb-4 last:mb-0">
                {/* Step number */}
                <div className="w-[30px] h-[30px] rounded-full bg-[#1B3A5C] text-white text-[13px] font-extrabold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </div>
                {/* Vertical line connector */}
                {i < steps.length - 1 && (
                  <div className="absolute left-[14px] top-[34px] bottom-[-12px] w-0.5 bg-[#E2E8F0]" />
                )}
                {/* Text */}
                <div>
                  <h3 className="text-sm font-bold text-[#1E293B] mb-0.5">{t(step.titleKey)}</h3>
                  <p className="text-[13px] text-[#5A6B80] leading-[1.4]">{t(step.descKey)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Auto activation badge */}
          <div className="inline-flex items-center gap-[5px] bg-[#E7F7EF] rounded-lg px-3 py-1.5 mt-3.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1DAA61] animate-pulse" />
            <span className="text-[13px] font-semibold text-[#1DAA61]">{t('proAccess.autoActivation')}</span>
          </div>
        </div>
      </div>

      {/* ===== BONUS BANNER ===== */}
      <div className="mx-4 mt-5 rounded-[14px] p-4 flex gap-3 items-center border border-[#F7C948] animate-[fadeUp_0.4s_ease_0.3s_both]" style={{ background: 'linear-gradient(135deg, #FFFBF0, #FEF3C7)' }}>
        <span className="text-[28px] flex-shrink-0">{'\uD83C\uDF81'}</span>
        <div>
          <h3 className="text-sm font-bold text-[#1E293B]">{t('proAccess.bonusBannerTitle')}</h3>
          <p className="text-xs text-[#5A6B80] leading-[1.4] mt-0.5">{t('proAccess.bonusBannerDesc')}</p>
        </div>
      </div>

      {/* ===== WHAT YOU GET ===== */}
      <div className="px-4 pt-6">
        <h2 className="text-[17px] font-extrabold text-[#1B3A5C] mb-3.5 flex items-center gap-2">
          {'\uD83D\uDD13'} {t('proAccess.benefitsTitle')}
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          {benefits.map((b, i) => (
            <div
              key={i}
              className={`bg-white border rounded-[14px] p-3.5 text-center ${b.highlight ? 'border-[#E8A317] bg-[#FFFBF0]' : 'border-[#E2E8F0]'}`}
              style={{ animation: `fadeUp 0.35s ease ${0.35 + i * 0.05}s both` }}
            >
              <div className="text-2xl mb-1.5">{b.emoji}</div>
              <h3 className="text-[13px] font-bold text-[#1E293B] leading-tight">{t(b.titleKey)}</h3>
              <p className="text-[11px] text-[#5A6B80] mt-0.5 leading-tight">{t(b.descKey)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ===== HELP LINK ===== */}
      <div className="text-center py-5 px-4">
        <button
          onClick={() => setShowChat(true)}
          className="text-sm text-[#2B7AE8] font-semibold bg-transparent border-none cursor-pointer"
        >
          {t('proAccess.helpLink')} {'\uD83D\uDCAC'}
        </button>
      </div>

      {/* ===== STICKY CTA ===== */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-4 pt-3 bg-white/95 backdrop-blur-[12px] border-t border-[#E2E8F0] z-50" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 8px))' }}>
        <button
          onClick={() => {
            track('pro_access_cta_click', { feature: new URLSearchParams(window.location.search).get('feature') });
            if (!bookmakerLink) return;
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches
              || window.navigator.standalone === true;
            if (isStandalone) {
              window.location.href = bookmakerLink;
            } else {
              window.open(bookmakerLink, '_blank', 'noopener,noreferrer');
            }
          }}
          className="flex items-center justify-center gap-2 w-full py-4 px-6 rounded-[14px] text-base font-extrabold text-[#1B3A5C] no-underline tracking-[0.2px] active:scale-[0.97] transition-transform duration-150"
          style={{ background: 'linear-gradient(135deg, #F7C948 0%, #E8A317 50%, #D4940F 100%)', boxShadow: '0 4px 16px rgba(232,163,23,0.35)' }}
        >
          {loadingLink ? (
            <FootballSpinner size="xs" />
          ) : (
            <>
              <DownloadIcon />
              {t('proAccess.ctaButton')}
            </>
          )}
        </button>
        <p className="text-center text-[11px] text-[#5A6B80] mt-1.5">{t('proAccess.ctaSubtext')}</p>
      </div>

      {/* Support Chat */}
      <SupportChat isOpen={showChat} onClose={() => setShowChat(false)} />

      {/* Animations */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
