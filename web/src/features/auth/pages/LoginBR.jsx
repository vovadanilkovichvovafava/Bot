import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { isValidPhone, fullPhoneNumber, parsePhoneNumber } from '../../../shared/utils/phoneUtils';
import PhoneInput from '../components/PhoneInput';
import SupportChat from '../../../shared/components/SupportChat';
import { BrazilTopRule, BrazilPattern, BrazilFlag, BR } from '../components/BrazilAccents';
import { track } from '../../../shared/services/analytics';
import useKeyboardScroll from '../../../shared/hooks/useKeyboardScroll';

/**
 * Sign-in screen for Brazil — the same language as the Brazilian signup screen.
 *
 * Same accents (thin green-yellow rule, drawn flag, faint lattice), same
 * centred 420–460 form, same green CTA and the same habit of putting each
 * error under its own field instead of one banner up top.
 *
 * No selling block here: someone on this screen already has an account, so the
 * job is to get them in with as little friction as possible.
 */
export default function LoginBR() {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [phoneCountry, setPhoneCountry] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const formRef = useKeyboardScroll();

  // Prefill the phone from the last session — nobody wants to retype it.
  useEffect(() => {
    try {
      const lastPhone = localStorage.getItem('last_phone');
      if (lastPhone) setPhone(parsePhoneNumber(lastPhone).localDigits);
    } catch {}
  }, []);

  useEffect(() => {
    if (!window.visualViewport) return;
    const vv = window.visualViewport;
    const threshold = window.innerHeight * 0.75;
    const onResize = () => setKeyboardOpen(vv.height < threshold);
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pErr = !phone
      ? t('auth.errEnterPhone')
      : !isValidPhone(phone, phoneCountry) ? t('auth.errInvalidPhone') : '';
    // Not errEnterPassword — that one says "create a password", which is the
    // signup wording and reads as nonsense to someone who already has one.
    const sErr = !password
      ? t('auth.brLoginNoPassword', { defaultValue: 'Informe sua senha' })
      : '';
    setPhoneError(pErr);
    setPasswordError(sErr);
    if (pErr || sErr) return;

    setFormError('');
    setLoading(true);
    track('login_submit', { variant: 'br' });
    try {
      await login(fullPhoneNumber(phone, phoneCountry), password);
      track('login_success', { variant: 'br' });
      navigate('/', { replace: true });
    } catch (err) {
      track('login_error', { variant: 'br', error: err.message });
      setFormError(err.message || t('auth.brLoginError', {
        defaultValue: 'Não foi possível entrar. Confira seus dados e tente novamente.',
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] bg-gradient-to-b from-gray-900 via-gray-900 to-primary-900 flex flex-col overflow-y-auto">
      <BrazilTopRule />
      {!keyboardOpen && <BrazilPattern />}

      <div className={`relative flex-shrink-0 px-4 transition-all duration-200 ${keyboardOpen ? 'pt-3 pb-2' : 'pt-8 pb-6'}`}>
        <div className="max-w-[460px] mx-auto text-center">
          {!keyboardOpen && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold mb-2.5"
              style={{ backgroundColor: '#0b3d24', color: '#8ff0b5', border: `1px solid ${BR.green}55` }}
            >
              <BrazilFlag size={14} />
              {t('auth.brLoginBadge', { defaultValue: 'Seus palpites estão te esperando' })}
            </span>
          )}
          <h1 className={`font-black text-white leading-tight ${keyboardOpen ? 'text-lg' : 'text-2xl'}`}>
            {t('auth.brLoginTitle', { defaultValue: 'Entrar na sua conta' })}
          </h1>
          {!keyboardOpen && (
            <p className="text-gray-300 text-sm mt-1.5">
              {t('auth.brLoginSubtitle', { defaultValue: 'Use o celular e a senha do seu cadastro' })}
            </p>
          )}
        </div>
      </div>

      <div className={`relative flex-1 bg-white rounded-t-[32px] px-6 pb-6 transition-all duration-200 ${keyboardOpen ? 'pt-3' : 'pt-6'}`}>
        <div className="w-full max-w-[420px] sm:max-w-[460px] mx-auto">
          {formError && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 text-center">
              {formError}
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="br-login-phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('auth.phoneLabel')}
              </label>
              <PhoneInput
                id="br-login-phone"
                value={phone}
                onChange={(v) => { setPhone(v); if (phoneError) setPhoneError(''); }}
                onCountryChange={setPhoneCountry}
                lockedCountry="BR"
                flagNode={<BrazilFlag size={18} />}
                placeholder="(11) 99999-9999"
              />
              {phoneError && <p className="text-[12px] text-red-600 mt-1.5 px-1">{phoneError}</p>}
            </div>

            <div>
              <label htmlFor="br-login-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('auth.passwordLabel')}
              </label>
              <div className="relative">
                <input
                  id="br-login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder={t('auth.brLoginPasswordPlaceholder', { defaultValue: 'Sua senha' })}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (passwordError) setPasswordError(''); }}
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
              {passwordError && <p className="text-[12px] text-red-600 mt-1.5 px-1">{passwordError}</p>}
            </div>

            <div className="text-right -mt-1">
              <button
                type="button"
                onClick={() => setShowSupport(true)}
                className="text-xs font-medium transition-colors hover:underline"
                style={{ color: BR.green }}
              >
                {t('auth.forgotPassword')}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] text-white font-bold py-3.5 rounded-xl shadow-lg transition-all
                         hover:brightness-110 active:brightness-95 active:scale-[0.99]
                         disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:brightness-100
                         flex items-center justify-center gap-2 text-[15px]"
              style={{ backgroundColor: BR.green, boxShadow: `0 10px 25px -8px ${BR.green}` }}
            >
              {loading
                ? t('auth.brLoginLoading', { defaultValue: 'Entrando...' })
                : t('auth.brLoginCta', { defaultValue: 'Entrar →' })}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-5">
            {t('auth.dontHaveAccount')}{' '}
            <Link to="/register" className="font-semibold hover:underline" style={{ color: BR.green }}>
              {t('auth.signUp')}
            </Link>
          </p>
        </div>
      </div>

      <SupportChat isOpen={showSupport} onClose={() => setShowSupport(false)} guest={true} />
    </div>
  );
}
