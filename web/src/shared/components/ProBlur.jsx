import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function ProBlur({ children, feature, reason = 'upgrade', placeholder = null }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // SECURITY NOTE: a CSS blur is presentation only — it does NOT withhold data,
  // since `children` are still in the DOM and readable via devtools. It is fine
  // for non-secret upsell content (stats, lineups, standings). For anything that
  // must actually be hidden from non-PRO users, pass a `placeholder` (a decoy
  // with the same shape) and DO NOT render the real value as children — the real
  // content should be fetched only after the server confirms the user is PRO.
  const blurred = placeholder ?? children;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Blurred silhouette (decoy when a placeholder is supplied) */}
      <div className="pointer-events-none select-none" style={{ filter: 'blur(12px)', WebkitFilter: 'blur(12px)' }} aria-hidden="true">
        {blurred}
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
