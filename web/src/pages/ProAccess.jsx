import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useAdvertiser } from '../context/AdvertiserContext';
import SupportChat from '../components/SupportChat';
import geoService from '../services/geoService';
import FootballSpinner from '../components/FootballSpinner';
import { getTrackingLink } from '../services/trackingService';

// Country to language mapping
const countryToLanguage = {
  RU: 'ru', UA: 'ru', BY: 'ru', KZ: 'ru',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
  PT: 'pt', BR: 'pt',
  DE: 'de', AT: 'de', CH: 'de',
  FR: 'fr', BE: 'fr', CA: 'fr',
  IT: 'it',
  PL: 'pl',
  RO: 'ro', MD: 'ro',
  TR: 'tr',
  IN: 'hi',
  CN: 'zh', TW: 'zh', HK: 'zh',
  SA: 'ar', AE: 'ar', EG: 'ar', MA: 'ar',
};

// SVG Icons
const StarIcon = () => (
  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
    <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
  </svg>
);

const InfinityIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25c2.485 0 4.5 1.679 4.5 3.75s-2.015 3.75-4.5 3.75c-1.41 0-2.664-.56-3.5-1.427-.836.867-2.09 1.427-3.5 1.427C7.015 15.75 5 14.071 5 12s2.015-3.75 4.5-3.75c1.41 0 2.664.56 3.5 1.427.836-.867 2.09-1.427 3.5-1.427z"/>
  </svg>
);

const ChatIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/>
  </svg>
);

const WalletIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/>
  </svg>
);

const SearchIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
  </svg>
);

const ClipboardIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"/>
  </svg>
);

const ArrowPathIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/>
  </svg>
);

const RocketIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
  </svg>
);

const CheckIcon = () => (
  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
  </svg>
);

export default function ProAccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { advertiser } = useAdvertiser();
  const [showChat, setShowChat] = useState(false);
  const [bookmakerLink, setBookmakerLink] = useState(null);
  const [loadingLink, setLoadingLink] = useState(false);

  // Check if user exhausted free limit
  const reason = searchParams.get('reason');
  const feature = searchParams.get('feature');

  // Fetch geo info and build tracking link on mount
  useEffect(() => {
    async function fetchGeoAndLink() {
      setLoadingLink(true);
      try {
        const geo = await geoService.getGeoInfo();

        // Set language based on geo
        const geoLang = countryToLanguage[geo.country];
        if (geoLang && i18n.language !== geoLang) {
          i18n.changeLanguage(geoLang);
        }

        // Get tracking link from PostbackAPI (with all sub_ids)
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
  }, [user?.id, i18n]);

  const benefits = [
    {
      icon: <InfinityIcon />,
      titleKey: 'proAccess.benefit1Title',
      descKey: 'proAccess.benefit1Desc',
    },
    {
      icon: <ChatIcon />,
      titleKey: 'proAccess.benefit2Title',
      descKey: 'proAccess.benefit2Desc',
    },
    {
      icon: <WalletIcon />,
      titleKey: 'proAccess.benefit3Title',
      descKey: 'proAccess.benefit3Desc',
    },
    {
      icon: <SearchIcon />,
      titleKey: 'proAccess.benefit4Title',
      descKey: 'proAccess.benefit4Desc',
    },
    {
      icon: <ClipboardIcon />,
      titleKey: 'proAccess.benefit5Title',
      descKey: 'proAccess.benefit5Desc',
    },
    {
      icon: <ArrowPathIcon />,
      titleKey: 'proAccess.benefit6Title',
      descKey: 'proAccess.benefit6Desc',
    },
  ];

  const steps = [
    { titleKey: 'proAccess.step1Title', descKey: 'proAccess.step1Desc' },
    { titleKey: 'proAccess.step2Title', descKey: 'proAccess.step2Desc' },
    { titleKey: 'proAccess.step3Title', descKey: 'proAccess.step3Desc' },
  ];

  return (
    <div className="h-screen bg-gray-50 overflow-y-auto">
      {/* Header - Dark style like BookmakerPromo */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white px-5 pt-4 pb-8 rounded-b-3xl">
        {/* Back button */}
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full mb-4">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
          </svg>
        </button>

        {/* PRO badge */}
        <div className="inline-flex items-center gap-1.5 bg-amber-500/20 rounded-full px-3 py-1 mb-4">
          <div className="text-amber-400">
            <StarIcon />
          </div>
          <span className="text-xs font-medium text-amber-400">PRO Access</span>
        </div>

        {/* Hero text */}
        <h1 className="text-2xl font-bold mb-2">
          {t('proAccess.heroTitle')}
        </h1>
        <p className="text-white/60 text-sm mb-6">
          {t('proAccess.heroSubtitle')}
        </p>

        {/* Bonus card */}
        <div className="bg-white rounded-2xl p-4 text-gray-900">
          <div className="text-center mb-4">
            <p className="text-xs text-gray-500 mb-1">{t('proAccess.unlockWith')}</p>
            <p className="text-4xl font-black text-amber-500">1 500<span className="text-2xl">€</span></p>
            <p className="text-xs text-gray-500">{t('proAccess.bonusDesc')}</p>
          </div>

          {/* Stats */}
          <div className="flex justify-between border-t border-gray-100 pt-4">
            <div className="text-center flex-1">
              <p className="text-lg font-bold text-gray-900">∞</p>
              <p className="text-[10px] text-gray-400 uppercase">{t('proAccess.statPredictions')}</p>
            </div>
            <div className="text-center flex-1 border-x border-gray-100">
              <p className="text-lg font-bold text-gray-900">∞</p>
              <p className="text-[10px] text-gray-400 uppercase">{t('proAccess.statValueBets')}</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-lg font-bold text-gray-900">100%</p>
              <p className="text-[10px] text-gray-400 uppercase">{t('proAccess.statTools')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Limit Warning - if coming from limit exceeded */}
      {reason === 'limit' && (
        <div className="mx-5 mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
            </svg>
            <p className="text-amber-700 text-sm">
              {t('proAccess.limitTitle')}
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

        {/* Why deposit here block */}
        <section className="bg-amber-50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/>
            </svg>
            <h2 className="font-bold text-gray-900">{t('proAccess.whyDepositTitle')}</h2>
          </div>
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <CheckIcon />
              </div>
              <p className="text-sm text-gray-700">{t('proAccess.why1')}</p>
            </div>
            <div className="flex gap-2">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <CheckIcon />
              </div>
              <p className="text-sm text-gray-700">{t('proAccess.why2')}</p>
            </div>
            <div className="flex gap-2">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <CheckIcon />
              </div>
              <p className="text-sm text-gray-700">{t('proAccess.why3')}</p>
            </div>
          </div>
        </section>

        {/* How to activate */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="text-primary-600">
              <RocketIcon />
            </div>
            <h2 className="font-bold text-gray-900">{t('proAccess.howToTitle')}</h2>
          </div>
          <div className="space-y-3">
            {steps.map((step, i) => (
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

        {/* CTA Button */}
        <a
          href={bookmakerLink}
          target="_blank"
          rel="noopener noreferrer"
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
              {t('proAccess.ctaButton')}
            </span>
          )}
        </a>
        <p className="text-center text-xs text-gray-400">
          {t('proAccess.ctaSubtext')}
        </p>

        {/* Help block */}
        <section className="bg-primary-50 rounded-2xl p-4 mt-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-sm">{t('proAccess.needHelp')}</h3>
              <p className="text-xs text-gray-500">{t('proAccess.helpDesc')}</p>
            </div>
          </div>
          <button
            onClick={() => setShowChat(true)}
            className="w-full mt-3 py-2.5 bg-primary-600 text-white font-semibold rounded-xl text-sm"
          >
            {t('proAccess.contactSupport')}
          </button>
        </section>

        <div className="h-6"/>
      </div>

      {/* Support Chat */}
      <SupportChat isOpen={showChat} onClose={() => setShowChat(false)} />
    </div>
  );
}
