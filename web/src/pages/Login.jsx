import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { isValidPhone, fullPhoneNumber } from '../utils/phoneUtils';
import PhoneInput from '../components/PhoneInput';
import FootballSpinner from '../components/FootballSpinner';
import { track } from '../services/analytics';
import useKeyboardScroll from '../hooks/useKeyboardScroll';


export default function Login() {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [phoneCountry, setPhoneCountry] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const formRef = useKeyboardScroll();

  // Detect keyboard open/close to collapse hero section
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

    if (!phone) {
      setError(t('auth.errEnterPhone'));
      return;
    }
    if (!isValidPhone(phone, phoneCountry)) {
      setError(t('auth.errInvalidPhone'));
      return;
    }
    if (!password) {
      setError(t('auth.errEnterPassword'));
      return;
    }

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
    <div className="min-h-[100dvh] bg-gradient-to-b from-gray-900 via-gray-900 to-primary-900 flex flex-col overflow-y-auto">
      {/* Hero Section — collapses when keyboard is open */}
      <div className={`relative flex-shrink-0 px-6 transition-all duration-200 ${keyboardOpen ? 'pt-2 pb-2' : 'pt-8 pb-8'}`}>
        {/* Background decorations */}
        {!keyboardOpen && (
          <>
            <div className="absolute top-0 left-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"/>
            <div className="absolute top-20 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl translate-x-1/2"/>
          </>
        )}

        <div className="relative text-center">
          <h1 className={`font-bold text-white transition-all duration-200 ${keyboardOpen ? 'text-lg mb-0' : 'text-2xl mb-1'}`}>{t('auth.appName')}</h1>
          {!keyboardOpen && <p className="text-gray-400 text-sm">{t('auth.signInSubtitle')}</p>}
        </div>
      </div>

      {/* Form Section */}
      <div className={`flex-1 bg-white rounded-t-[32px] px-6 pb-6 transition-all duration-200 ${keyboardOpen ? 'pt-3' : 'pt-6'}`}>
        <div className="max-w-sm mx-auto">
          {/* Stats badges — hidden when keyboard is open */}
          {!keyboardOpen && (
            <div className="flex justify-center gap-4 mb-5">
              <div className="bg-green-50 px-4 py-2 rounded-xl text-center">
                <p className="text-green-600 font-bold text-lg">73%</p>
                <p className="text-green-600/70 text-[10px] uppercase font-medium">{t('auth.winRate')}</p>
              </div>
              <div className="bg-amber-50 px-4 py-2 rounded-xl text-center">
                <p className="text-amber-600 font-bold text-lg">{t('auth.pro')}</p>
                <p className="text-amber-600/70 text-[10px] uppercase font-medium">{t('auth.access')}</p>
              </div>
              <div className="bg-purple-50 px-4 py-2 rounded-xl text-center">
                <p className="text-purple-600 font-bold text-lg">{t('auth.ai')}</p>
                <p className="text-purple-600/70 text-[10px] uppercase font-medium">{t('auth.predictions')}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 text-center flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              {error}
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.phoneLabel')}</label>
              <PhoneInput value={phone} onChange={setPhone} onCountryChange={setPhoneCountry} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.password')}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 pl-12 pr-12 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
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

            {/* Forgot password — opens support chat */}
            <div className="text-right -mt-1">
              <Link to="/?openSupport=forgot_password" className="text-xs text-primary-600 font-medium hover:text-primary-700 transition-colors">
                {t('auth.forgotPassword')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <FootballSpinner size="xs" light />
              ) : (
                <>
                  {t('auth.signIn')}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
                  </svg>
                </>
              )}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-5">
            {t('auth.dontHaveAccount')}{' '}
            <Link to="/register" className="text-primary-600 font-semibold hover:text-primary-700 transition-colors">
              {t('auth.signUp')}
            </Link>
          </p>

          {/* Trust badges — hidden when keyboard is open */}
          <div className={`flex items-center justify-center gap-4 mt-5 pt-4 border-t border-gray-100 ${keyboardOpen ? 'hidden' : ''}`}>
            <div className="flex items-center gap-1.5 text-gray-400 text-xs">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd"/>
              </svg>
              {t('auth.secure')}
            </div>
            <div className="w-1 h-1 bg-gray-300 rounded-full"/>
            <div className="flex items-center gap-1.5 text-gray-400 text-xs">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
              {t('auth.verified')}
            </div>
            <div className="w-1 h-1 bg-gray-300 rounded-full"/>
            <div className="flex items-center gap-1.5 text-gray-400 text-xs">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
              4.9/5
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
