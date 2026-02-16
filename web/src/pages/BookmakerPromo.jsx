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


// SVG Icons
const ChartIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
  </svg>
);

const MoneyIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/>
  </svg>
);

const TrendUpIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/>
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
  </svg>
);

const InfoCircleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/>
  </svg>
);

const RocketIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
  </svg>
);

export default function BookmakerPromo() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { advertiser } = useAdvertiser();
  const [showChat, setShowChat] = useState(false);
  const [geoInfo, setGeoInfo] = useState(null);
  const [bookmakerLink, setBookmakerLink] = useState(null);
  const [loadingLink, setLoadingLink] = useState(false);

  const [searchParams] = useSearchParams();
  const banner = searchParams.get('banner') || '';

  // Fetch geo info and build tracking link on mount
  useEffect(() => {
    async function fetchGeoAndLink() {
      setLoadingLink(true);
      try {
        const geo = await geoService.getGeoInfo();
        setGeoInfo(geo);

        // Get tracking link from PostbackAPI (with all sub_ids)
        const userId = user?.id || `anon_${Date.now()}`;
        const link = await getTrackingLink(userId, banner);
        if (link) {
          setBookmakerLink(link);
        } else {
          // Fallback если API недоступен
          setBookmakerLink(`https://bootballgame.shop/?sub_id_10=${userId}&sub_id_11=${banner}`);
        }
      } catch (error) {
        console.error('Failed to fetch geo/link:', error);
        const userId = user?.id || `anon_${Date.now()}`;
        setBookmakerLink(`https://bootballgame.shop/?sub_id_10=${userId}&sub_id_11=${banner}`);
      } finally {
        setLoadingLink(false);
      }
    }

    fetchGeoAndLink();
  }, [user?.id, banner]);

  const benefits = [
    {
      icon: <ChartIcon />,
      titleKey: 'promo.benefit1Title',
      descKey: 'promo.benefit1Desc'
    },
    {
      icon: <MoneyIcon />,
      titleKey: 'promo.benefit2Title',
      descKey: 'promo.benefit2Desc'
    },
    {
      icon: <TrendUpIcon />,
      titleKey: 'promo.benefit3Title',
      descKey: 'promo.benefit3Desc'
    },
    {
      icon: <ShieldIcon />,
      titleKey: 'promo.benefit4Title',
      descKey: 'promo.benefit4Desc'
    },
  ];

  const whyHereKeys = ['promo.why1', 'promo.why2', 'promo.why3'];

  const stepKeys = [
    { titleKey: 'promo.step1Title', descKey: 'promo.step1Desc' },
    { titleKey: 'promo.step2Title', descKey: 'promo.step2Desc' },
    { titleKey: 'promo.step3Title', descKey: 'promo.step3Desc' },
  ];

  return (
    <div className="h-screen bg-gray-50 overflow-y-auto pb-24">
      {/* Header - Dark */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white px-5 pt-4 pb-8 rounded-b-3xl">
        {/* Back button */}
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full mb-4">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
          </svg>
        </button>

        {/* Partner badge */}
        <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 mb-4">
          <span className="text-xs text-white/80">{t('promo.partnerBadge')}</span>
        </div>

        {/* Hero text */}
        <h1 className="text-2xl font-bold mb-2">
          {t('promo.heroTitle1')} <span className="text-amber-400">{advertiser.bonusAmount}</span> {t('promo.heroTitle2')}
        </h1>
        <p className="text-white/60 text-sm mb-6">
          {t('promo.heroSubtitle')}
        </p>

        {/* Bonus card */}
        <div className="bg-white rounded-2xl p-4 text-gray-900">
          <div className="text-center mb-4">
            <p className="text-xs text-gray-500 mb-1">{t('promo.upTo')}</p>
            <p className="text-4xl font-black text-amber-500">{advertiser.bonusAmount}</p>
            <p className="text-xs text-gray-500">{t('promo.bonusDesc')}</p>
          </div>

          {/* Stats */}
          <div className="flex justify-between border-t border-gray-100 pt-4">
            <div className="text-center flex-1">
              <p className="text-lg font-bold text-gray-900">{t('promo.stat1Value')}</p>
              <p className="text-[10px] text-gray-400 uppercase">{t('promo.stat1Label')}</p>
            </div>
            <div className="text-center flex-1 border-x border-gray-100">
              <p className="text-lg font-bold text-gray-900">50+</p>
              <p className="text-[10px] text-gray-400 uppercase">{t('promo.stat2Label')}</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-lg font-bold text-gray-900">24/7</p>
              <p className="text-[10px] text-gray-400 uppercase">{t('promo.stat3Label')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Geo Warning */}
      {geoInfo?.isBlocked && (
        <div className="mx-5 mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
            </svg>
            <p className="text-amber-700 text-sm">
              {t('promo.geoWarning', { country: geoInfo.country })}
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-5 py-6 space-y-6">
        {/* Benefits */}
        <section className="space-y-3">
          {benefits.map((b, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0 text-amber-600">
                {b.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm">{t(b.titleKey)}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t(b.descKey)}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Why here block */}
        <section className="bg-amber-50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-amber-500">
              <InfoCircleIcon />
            </div>
            <h2 className="font-bold text-gray-900">{t('promo.whyHereTitle')}</h2>
          </div>
          <div className="space-y-3">
            {whyHereKeys.map((key, i) => (
              <div key={i} className="flex gap-2">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                </div>
                <p className="text-sm text-gray-700">{t(key)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How to start */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="text-primary-600">
              <RocketIcon />
            </div>
            <h2 className="font-bold text-gray-900">{t('promo.howToStartTitle')}</h2>
          </div>
          <div className="space-y-3">
            {stepKeys.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm">{t(step.titleKey)}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{t(step.descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Button is now fixed at bottom */}

        {/* Help block */}
        <section className="bg-primary-50 rounded-2xl p-4 mt-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-sm">{t('promo.helpTitle')}</h3>
              <p className="text-xs text-gray-500">{t('promo.helpDesc')}</p>
            </div>
          </div>
          <button
            onClick={() => setShowChat(true)}
            className="w-full mt-3 py-2.5 bg-primary-600 text-white font-semibold rounded-xl text-sm"
          >
            {t('promo.helpButton')}
          </button>
        </section>

        <div className="h-6"/>
      </div>

      {/* Fixed CTA Button at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-5 py-3 z-50">
        <button
          onClick={() => {
            track('promo_cta_click', { banner: new URLSearchParams(window.location.search).get('banner') });
            if (!bookmakerLink) return;
            // In standalone PWA mode, use location.href to open in system browser
            // so that the bookmaker's PWA can install properly
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches
              || window.navigator.standalone === true;
            if (isStandalone) {
              window.location.href = bookmakerLink;
            } else {
              window.open(bookmakerLink, '_blank', 'noopener,noreferrer');
            }
          }}
          className="block w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white text-center font-bold py-4 rounded-2xl shadow-lg"
        >
          {loadingLink ? (
            <span className="flex items-center justify-center gap-2">
              <FootballSpinner size="xs" light />
              {t('common.loading')}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/>
              </svg>
              {t('promo.ctaButton')}
            </span>
          )}
        </button>
        <p className="text-center text-xs text-gray-400 mt-1">
          {t('promo.ctaSubtext')}
        </p>
      </div>

      {/* Support Chat */}
      <SupportChat isOpen={showChat} onClose={() => setShowChat(false)} />
    </div>
  );
}
