import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { isValidPhone, fullPhoneNumber, parsePhoneNumber, getCountryByCode } from '../../../shared/utils/phoneUtils';
import PhoneInput from '../components/PhoneInput';
import FootballSpinner from '../../../shared/components/FootballSpinner';
import SupportChat from '../../../shared/components/SupportChat';
import { track } from '../../../shared/services/analytics';
import useKeyboardScroll from '../../../shared/hooks/useKeyboardScroll';

export default function Login() {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [phoneCountry, setPhoneCountry] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const formRef = useKeyboardScroll();

  // Prefill phone from localStorage (saved during previous login/register)
  useEffect(() => {
    try {
      const lastPhone = localStorage.getItem('last_phone');
      if (lastPhone) {
        const { countryCode, localDigits } = parsePhoneNumber(lastPhone);
        if (countryCode) setPhoneCountry(getCountryByCode(countryCode));
        setPhone(localDigits);
      }
    } catch {}
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone) { setError(t('auth.errEnterPhone')); return; }
    if (!isValidPhone(phone, phoneCountry)) { setError(t('auth.errInvalidPhone')); return; }
    if (!password) { setError(t('auth.errEnterPassword')); return; }

    setError('');
    setLoading(true);
    track('login_submit');
    try {
      const fullPhone = fullPhoneNumber(phone, phoneCountry);
      await login(fullPhone, password);
      track('login_success');
      navigate('/', { replace: true });
    } catch (err) {
      track('login_error', { error: err.message });
      setError(err.message || t('auth.errLogin'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col overflow-y-auto" style={{ background: 'radial-gradient(120% 80% at 50% 0%, #16264f 0%, #0b1733 55%, #0a1430 100%)' }}>
      <div className="flex-1 flex flex-col justify-center w-full max-w-sm mx-auto px-5 py-8">
        {/* Logo */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center mb-3">
            <svg className="w-9 h-9 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l5-6 4 4 5-8" />
              <circle cx="18" cy="17" r="3.2" />
              <path strokeLinecap="round" d="M20.5 19.5L23 22" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide">{t('auth.appName', { defaultValue: 'STATSPRO' })}</h1>
          <p className="text-white/40 text-sm mt-1">{t('auth.tagline', { defaultValue: 'Professional Sports Analytics & Betting' })}</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          {error && (
            <div className="bg-red-500/15 text-red-300 text-sm p-3 rounded-xl mb-4 text-center flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
              {error}
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-white/50 uppercase tracking-wider mb-1.5">{t('auth.phoneLabel')}</label>
              <PhoneInput value={phone} onChange={setPhone} onCountryChange={setPhoneCountry} dark />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-white/50 uppercase tracking-wider mb-1.5">{t('auth.password')}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-12 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    {showPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/>
                    ) : (
                      <>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* Remember me + Forgot */}
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setRemember(!remember)} className="flex items-center gap-2 text-white/50 text-sm">
                <span className={`w-4 h-4 rounded border flex items-center justify-center ${remember ? 'bg-emerald-500 border-emerald-500' : 'border-white/25'}`}>
                  {remember && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>}
                </span>
                {t('auth.rememberMe', { defaultValue: 'Remember me' })}
              </button>
              <button type="button" onClick={() => setShowSupport(true)} className="text-emerald-400 text-sm font-semibold hover:text-emerald-300 transition-colors">
                {t('auth.forgotPassword')}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-100 hover:bg-white text-[#0b1733] font-bold py-3.5 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <FootballSpinner size="xs" /> : (
                <>
                  {t('auth.signIn')}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Create account */}
        <p className="text-center text-white/50 text-sm mt-6">
          {t('auth.dontHaveAccount')}{' '}
          <Link to="/register" className="text-emerald-400 font-semibold hover:text-emerald-300 transition-colors">
            {t('auth.createAccountLink', { defaultValue: 'Create an account' })}
          </Link>
        </p>

        {/* Technical support */}
        <button onClick={() => setShowSupport(true)} className="mx-auto mt-5 flex items-center gap-1.5 text-white/30 text-xs hover:text-white/50 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"/></svg>
          {t('auth.technicalSupport', { defaultValue: 'Technical Support' })}
        </button>
      </div>

      <SupportChat isOpen={showSupport} onClose={() => setShowSupport(false)} guest={true} />
    </div>
  );
}
