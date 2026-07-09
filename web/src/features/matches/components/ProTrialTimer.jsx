import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/context/AuthContext';

/**
 * 12-hour PRO-trial countdown banner. Shows while the new lead's full-PRO trial
 * is active (is_premium + premium_until in the future). Reassures + creates
 * urgency; when it expires the banner disappears and the deposit gates take over.
 */
export default function ProTrialTimer() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const until = user?.premium_until ? new Date(user.premium_until).getTime() : 0;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!until) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [until]);

  if (!user?.is_premium || !until) return null;
  const left = until - now;
  if (left <= 0) return null;

  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className="rounded-2xl p-4 text-white shadow-lg" style={{ background: 'linear-gradient(120deg,#15803d 0%,#16a34a 55%,#22c55e 100%)' }}>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0 text-2xl">⚡</div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-black uppercase tracking-wider text-white/85">
            {t('proTrial.tag', { defaultValue: 'PRO completo ativo' })}
          </p>
          <p className="text-sm font-bold leading-tight">
            {t('proTrial.desc', { defaultValue: 'Previsões e chat de IA ILIMITADOS' })}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="font-black text-xl tabular-nums leading-none">{pad(h)}:{pad(m)}:{pad(s)}</div>
          <div className="text-[10px] text-white/75 mt-0.5">{t('proTrial.left', { defaultValue: 'restantes' })}</div>
        </div>
      </div>
    </div>
  );
}
