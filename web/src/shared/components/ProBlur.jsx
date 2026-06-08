import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function ProBlur({ children, feature, reason = 'upgrade' }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Blurred silhouette of the real content */}
      <div className="pointer-events-none select-none" style={{ filter: 'blur(12px)', WebkitFilter: 'blur(12px)' }}>
        {children}
      </div>
      {/* Single centered upgrade button */}
      <button
        onClick={() => navigate(`/pro-access?reason=${reason}&feature=${feature}`)}
        className="absolute inset-0 z-10 flex items-center justify-center"
      >
        <span className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-lg transition-colors active:scale-95">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1l3.09 6.26L22 8.27l-5 4.87 1.18 6.88L12 16.77l-6.18 3.25L7 13.14 2 8.27l6.91-1.01L12 1z" />
          </svg>
          {t('pro.upgrade', { defaultValue: 'Upgrade to PRO' })}
        </span>
      </button>
    </div>
  );
}
