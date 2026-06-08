import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function ProBlur({ children, feature, reason = 'upgrade', label, dark = false }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="relative">
      <div className="pointer-events-none select-none" style={{ filter: 'blur(6px)', WebkitFilter: 'blur(6px)' }}>
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <div className={`rounded-2xl px-5 py-4 flex flex-col items-center gap-2 max-w-[260px] text-center backdrop-blur-sm ${
          dark ? 'bg-black/60' : 'bg-white/80 shadow-lg'
        }`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            dark ? 'bg-white/10' : 'bg-amber-50'
          }`}>
            <svg className={`w-5 h-5 ${dark ? 'text-amber-400' : 'text-amber-500'}`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1l3.09 6.26L22 8.27l-5 4.87 1.18 6.88L12 16.77l-6.18 3.25L7 13.14 2 8.27l6.91-1.01L12 1z" />
            </svg>
          </div>
          <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>
            {label || t('pro.unlockFeature', { defaultValue: 'PRO Feature' })}
          </p>
          <button
            onClick={() => navigate(`/pro-access?reason=${reason}&feature=${feature}`)}
            className="mt-1 bg-amber-400 hover:bg-amber-500 text-white text-xs font-bold px-5 py-2 rounded-full transition-colors active:scale-95"
          >
            {t('pro.upgrade', { defaultValue: 'Upgrade to PRO' })}
          </button>
        </div>
      </div>
    </div>
  );
}
