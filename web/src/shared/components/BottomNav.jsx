import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../features/auth/context/AuthContext';
import { useAdvertiser } from '../context/AdvertiserContext';
import { getTrackingLink } from '../../features/betting/services/trackingService';

const navItems = [
  {
    path: '/',
    labelKey: 'nav.home',
    icon: (active) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>
      </svg>
    ),
  },
  {
    path: '/matches',
    labelKey: 'nav.matches',
    icon: (active) => (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="3"/>
        <line x1="12" y1="2" x2="12" y2="7"/>
        <line x1="12" y1="17" x2="12" y2="22"/>
        <line x1="2" y1="12" x2="7" y2="12"/>
        <line x1="17" y1="12" x2="22" y2="12"/>
      </svg>
    ),
  },
  {
    path: '/ai-chat',
    labelKey: 'nav.aiChat',
    icon: (active) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/>
      </svg>
    ),
  },
  {
    path: '/world-cup',
    labelKey: 'nav.worldCup',
    icon: (active) => (
      <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-2.77.938 6.003 6.003 0 01-2.77-.938"/>
      </svg>
    ),
  },
];

// Bet tab icon (dollar/ticket style)
const BetIcon = ({ active }) => (
  <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
  </svg>
);


export default function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { advertiser, trackClick } = useAdvertiser();
  const isFunnel2 = user?.funnel === 'funnel-2';
  const isFunnel4 = user?.funnel === 'funnel-4';
  const isPremium = user?.is_premium && !isFunnel2 && !isFunnel4;

  const handleBetClick = () => {
    trackClick(user?.id, 'bottom_nav_bet');
    if (isPremium || isFunnel2 || isFunnel4) {
      // PRO, funnel-2, funnel-4 go directly to bookmaker
      const link = getTrackingLink(user?.id, 'bottom_nav_bet', user?.funnel) || advertiser?.link;
      if (link) {
        window.open(link, '_blank', 'noopener,noreferrer');
      }
    } else {
      navigate('/promo?banner=bottom_nav_bet');
    }
  };

  return (
    <nav className="bg-white border-t border-gray-100 z-50 safe-bottom shrink-0">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2 px-1">
        {navItems.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`bottom-nav-item flex-1 py-1 ${isActive ? 'active' : ''}`}
            >
              <div className={`${isActive ? 'bg-primary-50 rounded-full p-1.5' : 'p-1.5'}`}>
                {item.icon(isActive)}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'text-primary-600' : 'text-gray-400'}`}>
                {t(item.labelKey)}
              </span>
            </button>
          );
        })}

        {/* Bet tab */}
        <button
          onClick={handleBetClick}
          className="bottom-nav-item flex-1 py-1"
        >
          <div className="p-1.5 bg-emerald-50 rounded-full">
            <div className="text-emerald-600">
              <BetIcon active={false} />
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-600">
            {t('nav.bet', { defaultValue: 'Bet' })}
          </span>
        </button>
      </div>
    </nav>
  );
}
