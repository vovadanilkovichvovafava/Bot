import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getReferredBy, clearReferralCode } from '../services/referralStore';
import { isValidPhone, fullPhoneNumber } from '../../../shared/utils/phoneUtils';
import PhoneInput from '../components/PhoneInput';
import FootballSpinner from '../../../shared/components/FootballSpinner';
import SupportChat from '../../../shared/components/SupportChat';
import { track } from '../../../shared/services/analytics';
import useKeyboardScroll from '../../../shared/hooks/useKeyboardScroll';

export default function Register() {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [phoneCountry, setPhoneCountry] = useState(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState(null);
  const [formTouched, setFormTouched] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const formRef = useKeyboardScroll();

  const onFormTouch = () => {
    if (!formTouched) {
      setFormTouched(true);
      track('register_form_started');
    }
  };

  useEffect(() => {
    const ref = getReferredBy();
    if (ref) setReferralCode(ref);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone) { setError(t('auth.errEnterPhone')); return; }
    if (!isValidPhone(phone, phoneCountry)) { setError(t('auth.errInvalidPhone')); return; }
    if (!password) { setError(t('auth.errEnterPassword')); return; }
    if (password.length < 6) { setError(t('auth.errPasswordLength')); return; }
    if (confirm !== password) { setError(t('auth.errPasswordMismatch', { defaultValue: 'Passwords do not match' })); return; }

    setError('');
    setLoading(true);
    track('register_submit');
    try {
      const fullPhone = fullPhoneNumber(phone, phoneCountry);
      await register(fullPhone, password, referralCode);
      track('register_success');
      clearReferralCode();
      try { localStorage.setItem('show_welcome', 'true'); } catch {}
      navigate('/', { replace: true, state: { justRegistered: true } });
    } catch (err) {
      track('register_error', { error: err.message });
      setError(err.message || t('auth.errRegistration'));
    } finally {
      setLoading(false);
    }
  };

  const passwordIcon = (
    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
    </span>
  );

  return (
    <div className="min-h-[100dvh] flex flex-col overflow-y-auto" style={{ background: 'radial-gradient(120% 80% at 50% 0%, #16264f 0%, #0b1733 55%, #0a1430 100%)' }}>
      <div className="w-full max-w-sm mx-auto px-5 pt-6 pb-8 flex-1 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-white font-black tracking-wide">{t('auth.appName', { defaultValue: 'STATSPRO' })}</span>
          <button onClick={() => setShowSupport(true)} className="flex items-center gap-1.5 text-white/40 text-xs hover:text-white/60 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"/></svg>
            {t('auth.support', { defaultValue: 'Support' }).toUpperCase()}
          </button>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-black text-white">{t('auth.createAccountTitle', { defaultValue: 'Create Account' })}</h1>
        <p className="text-white/40 text-sm mt-1 mb-5">{t('auth.createAccountSub', { defaultValue: 'Join the elite community of professional analysts.' })}</p>

        {error && (
          <div className="bg-red-500/15 text-red-300 text-sm p-3 rounded-xl mb-4 text-center flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
            {error}
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-white/50 uppercase tracking-wider mb-1.5">{t('auth.phoneLabel')}</label>
            <PhoneInput value={phone} onChange={setPhone} onCountryChange={setPhoneCountry} onFocus={onFormTouch} dark />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-white/50 uppercase tracking-wider mb-1.5">{t('auth.passwordLabel')}</label>
            <div className="relative">
              {passwordIcon}
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={onFormTouch}
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

          <div>
            <label className="block text-[11px] font-bold text-white/50 uppercase tracking-wider mb-1.5">{t('auth.confirmLabel', { defaultValue: 'Confirm' })}</label>
            <div className="relative">
              {passwordIcon}
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={t('auth.passwordPlaceholder')}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onFocus={onFormTouch}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>
            {confirm.length > 0 && confirm !== password && (
              <p className="text-[11px] text-red-300/80 mt-1.5 px-1">{t('auth.errPasswordMismatch', { defaultValue: 'Passwords do not match' })}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#0b1733] font-bold py-4 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-[15px]"
          >
            {loading ? <FootballSpinner size="xs" /> : (
              <>
                {t('auth.registerCta')}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
              </>
            )}
          </button>

          {/* Implicit consent — checkbox removed to cut signup friction; agreement is given by submitting */}
          <p className="text-center text-white/40 text-[11px] leading-snug">
            {t('auth.termsImplicit', { defaultValue: 'By continuing, you accept the Terms & Conditions and Privacy Policy.' })}
          </p>
        </form>

        <p className="text-center text-white/50 text-sm mt-6">
          {t('auth.alreadyHaveAccount')}{' '}
          <Link to="/login" className="text-white font-bold hover:text-emerald-300 transition-colors">
            {t('auth.loginInstead', { defaultValue: 'Log in instead' })}
          </Link>
        </p>

        {/* Footer trust */}
        <div className="mt-auto pt-8">
          <div className="flex items-center justify-center gap-6 text-white/30 text-xs">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd"/></svg>
              {t('auth.secureVerification', { defaultValue: 'Secure Verification' })}
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
              {t('auth.gdprCompliant', { defaultValue: 'GDPR Compliant' })}
            </span>
          </div>
          <p className="text-center text-white/20 text-[10px] mt-3 uppercase tracking-wide">
            {t('auth.copyright', { defaultValue: '© 2026 STATSPRO TECHNOLOGIES. ALL RIGHTS RESERVED.' })}
          </p>
        </div>
      </div>

      <SupportChat isOpen={showSupport} onClose={() => setShowSupport(false)} guest={true} />
    </div>
  );
}
