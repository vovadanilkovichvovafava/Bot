import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getReferredBy, clearReferralCode } from '../services/referralStore';
import { isValidPhone, fullPhoneNumber } from '../../../shared/utils/phoneUtils';
import PhoneInput from '../components/PhoneInput';
import BrazilPickCard from '../components/BrazilPickCard';
import { BrazilTopRule, BrazilPattern, BrazilFlag, BR } from '../components/BrazilAccents';
import { track } from '../../../shared/services/analytics';
import useKeyboardScroll from '../../../shared/hooks/useKeyboardScroll';

/**
 * Signup screen for Brazil.
 *
 * Built to the brief: keep the dark premium look and the green CTA, let the
 * flag in only as accents, and put a real, API-driven pick above a centred
 * form. Errors sit under their own field instead of in one banner at the top,
 * because a message far from the input is a message people miss.
 *
 * Other geos keep their own A/B'd screen — this file is only reached when the
 * visitor is Brazilian, so nothing here can affect them.
 */

// Backend "this phone already has an account", across locales.
const EXISTS_RE = /already registered|already have an account|j[áa] existe|existe uma conta|ya (existe|tiene|hay)|d[ée]j[àa]|уже (существ|зарегистр)/i;

function Check() {
  return (
    <span
      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
      style={{ backgroundColor: `${BR.green}26`, color: BR.green }}
    >
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    </span>
  );
}

export default function RegisterBR() {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [phoneCountry, setPhoneCountry] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [phoneExists, setPhoneExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState(null);
  const [formTouched, setFormTouched] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const formRef = useKeyboardScroll();

  useEffect(() => { track('register_view', { variant: 'br' }); }, []);

  useEffect(() => {
    const ref = getReferredBy();
    if (ref) setReferralCode(ref);
  }, []);

  // Collapse the hero while the on-screen keyboard is up, so the form stays visible.
  useEffect(() => {
    if (!window.visualViewport) return;
    const vv = window.visualViewport;
    const threshold = window.innerHeight * 0.75;
    const onResize = () => setKeyboardOpen(vv.height < threshold);
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  const onFormTouch = () => {
    if (!formTouched) {
      setFormTouched(true);
      track('register_form_started', { variant: 'br' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pErr = !phone
      ? t('auth.errEnterPhone')
      : !isValidPhone(phone, phoneCountry) ? t('auth.errInvalidPhone') : '';
    const sErr = !password
      ? t('auth.errEnterPassword')
      : password.length < 6 ? t('auth.errPasswordLength') : '';
    setPhoneError(pErr);
    setPasswordError(sErr);
    if (pErr || sErr) return;

    setFormError('');
    setPhoneExists(false);
    setLoading(true);
    track('register_submit', { variant: 'br' });
    try {
      await register(fullPhoneNumber(phone, phoneCountry), password, referralCode);
      track('register_success', { variant: 'br' });
      clearReferralCode();
      try { localStorage.setItem('show_welcome', 'true'); } catch {}
      navigate('/', { replace: true, state: { justRegistered: true } });
    } catch (err) {
      const msg = err.message || '';
      const exists = EXISTS_RE.test(msg);
      setPhoneExists(exists);
      track('register_error', { variant: 'br', error: msg });
      setFormError(exists ? msg : t('auth.brSubmitError', {
        defaultValue: 'Não foi possível criar sua conta. Tente novamente.',
      }));
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    t('auth.brBenefit1', { defaultValue: '3 palpites com IA disponíveis hoje' }),
    t('auth.brBenefit2', { defaultValue: 'Acesso completo por 12 horas' }),
    // No subscription is created and there is nothing to cancel, so the brief's
    // fallback wording is the honest one.
    t('auth.brBenefit3', { defaultValue: 'Sem compromisso e sem cobrança automática' }),
  ];

  return (
    <div className="relative min-h-[100dvh] bg-gradient-to-b from-gray-900 via-gray-900 to-primary-900 flex flex-col overflow-y-auto">
      <BrazilTopRule />
      {!keyboardOpen && <BrazilPattern />}

      {/* Hero — the pick, straight from the API */}
      <div className={`relative flex-shrink-0 px-4 transition-all duration-200 ${keyboardOpen ? 'pt-3 pb-2' : 'pt-6 pb-5'}`}>
        <div className="max-w-[460px] mx-auto">
          {!keyboardOpen && <BrazilPickCard />}

          <div className={`text-center ${keyboardOpen ? '' : 'mt-4'}`}>
            {!keyboardOpen && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold mb-2.5"
                style={{ backgroundColor: '#0b3d24', color: '#8ff0b5', border: `1px solid ${BR.green}55` }}
              >
                <BrazilFlag size={14} />
                {t('auth.brBadge', { defaultValue: 'Palpites selecionados para você' })}
              </span>
            )}
            <h1 className={`font-black text-white leading-tight ${keyboardOpen ? 'text-lg' : 'text-2xl'}`}>
              {t('auth.brTitle', { defaultValue: 'Receba 3 palpites grátis' })}
            </h1>
            {!keyboardOpen && (
              <p className="text-gray-300 text-sm mt-1.5">
                {t('auth.brSubtitle', {
                  defaultValue: '12 horas de acesso completo • Sem cartão • Cadastro em 30 segundos',
                })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className={`relative flex-1 bg-white rounded-t-[32px] px-6 pb-6 transition-all duration-200 ${keyboardOpen ? 'pt-3' : 'pt-6'}`}>
        <div className="w-full max-w-[420px] sm:max-w-[460px] mx-auto">
          {!keyboardOpen && (
            <ul className="space-y-2 mb-5">
              {benefits.map((b, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-gray-700">
                  <Check />
                  <span className="font-medium">{b}</span>
                </li>
              ))}
            </ul>
          )}

          {formError && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 text-center">
              {formError}
            </div>
          )}

          {/* Returning visitor — send them to sign in instead of a dead end */}
          {phoneExists && (
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 w-full bg-primary-600 text-white font-bold py-3 rounded-xl mb-4 shadow-lg shadow-primary-500/30 hover:bg-primary-700 transition-colors"
            >
              {t('auth.signIn')}
            </Link>
          )}

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="br-phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('auth.phoneLabel')}
              </label>
              <PhoneInput
                id="br-phone"
                value={phone}
                onChange={(v) => { setPhone(v); if (phoneError) setPhoneError(''); }}
                onCountryChange={setPhoneCountry}
                onFocus={onFormTouch}
                lockedCountry="BR"
                flagNode={<BrazilFlag size={18} />}
                // The mask spelled exactly as the brief states it — the generic
                // zero-filled hint reads as a different spec at a glance.
                placeholder="(11) 99999-9999"
              />
              {phoneError ? (
                <p className="text-[12px] text-red-600 mt-1.5 px-1">{phoneError}</p>
              ) : (
                <p className="text-[11px] text-gray-400 mt-1.5 px-1">
                  {t('auth.brPhoneHint', {
                    defaultValue: 'Você receberá apenas informações sobre seus palpites.',
                  })}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="br-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('auth.passwordLabel')}
              </label>
              <div className="relative">
                <input
                  id="br-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder={t('auth.brPasswordPlaceholder', { defaultValue: 'Mínimo de 6 caracteres' })}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (passwordError) setPasswordError(''); }}
                  onFocus={onFormTouch}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 pl-4 pr-12 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={t('auth.togglePassword', { defaultValue: 'Mostrar senha' })}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    {showPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    ) : (
                      <>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
              {passwordError && (
                <p className="text-[12px] text-red-600 mt-1.5 px-1">{passwordError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] text-white font-bold py-3.5 rounded-xl shadow-lg transition-all
                         hover:brightness-110 active:brightness-95 active:scale-[0.99]
                         disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:brightness-100
                         flex items-center justify-center gap-2 mt-2 text-[15px]"
              style={{ backgroundColor: BR.green, boxShadow: `0 10px 25px -8px ${BR.green}` }}
            >
              {loading
                ? t('auth.brCtaLoading', { defaultValue: 'Criando sua conta...' })
                : t('auth.brCta', { defaultValue: 'Receber 3 palpites grátis →' })}
            </button>

            {!keyboardOpen && (
              <p className="text-center text-xs text-gray-400 -mt-1">
                {t('auth.brCtaSub', { defaultValue: 'Grátis • Sem cartão • Cadastro rápido' })}
              </p>
            )}
          </form>

          <p className="text-center text-gray-400 text-xs mt-3">{t('auth.agreeTerms')}</p>

          <p className="text-center text-gray-500 text-sm mt-4">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700 transition-colors">
              {t('auth.signIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
