import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center px-6 text-center">
      {/* Animated 404 */}
      <div className="relative mb-8">
        <h1 className="text-[120px] font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-purple-500 leading-none">
          404
        </h1>
        <div className="absolute inset-0 text-[120px] font-black text-primary-500/20 blur-2xl leading-none">
          404
        </div>
      </div>

      {/* Icon */}
      <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6 border border-gray-700">
        <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
        </svg>
      </div>

      {/* Text */}
      <h2 className="text-2xl font-bold text-white mb-2">
        {t('notFound.title')}
      </h2>
      <p className="text-gray-400 mb-8 max-w-sm">
        {t('notFound.description')}
      </p>

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => navigate('/')}
          className="w-full bg-gradient-to-r from-primary-500 to-purple-500 text-white font-semibold py-3.5 rounded-xl"
        >
          {t('notFound.goHome')}
        </button>
        <button
          onClick={() => navigate(-1)}
          className="w-full bg-gray-800 text-gray-300 font-medium py-3.5 rounded-xl border border-gray-700"
        >
          {t('notFound.goBack')}
        </button>
      </div>

      {/* Fun stats */}
      <div className="mt-12 flex gap-8 text-center">
        <div>
          <p className="text-3xl font-bold text-primary-400">99%</p>
          <p className="text-xs text-gray-500">{t('notFound.pagesWork')}</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-purple-400">1</p>
          <p className="text-xs text-gray-500">{t('notFound.unlucky')}</p>
        </div>
      </div>
    </div>
  );
}
