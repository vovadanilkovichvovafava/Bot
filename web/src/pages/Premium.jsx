import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import logoBlack from '../assets/logo_black.png';


export default function Premium() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState('month');

  const PLANS = [
    {
      id: 'week',
      days: t('premium.plan7Days'),
      price: '$15',
      period: t('premium.periodWeek'),
      features: t('premium.featuresWeek'),
    },
    {
      id: 'month',
      days: t('premium.plan15Days'),
      price: '$20',
      period: t('premium.period15Days'),
      features: t('premium.featuresMonth'),
      popular: true,
    },
    {
      id: 'year',
      days: t('premium.plan365Days'),
      price: '$100',
      period: t('premium.periodYear'),
      features: t('premium.featuresYear'),
    },
  ];

  const BENEFITS = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.07-9.07l-1.757 1.757a4.5 4.5 0 010 6.364 4.5 4.5 0 01-6.364 0"/>
        </svg>
      ),
      title: t('premium.benefit1Title'),
      subtitle: t('premium.benefit1Subtitle'),
      color: 'bg-blue-50 text-blue-600',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
        </svg>
      ),
      title: t('premium.benefit2Title'),
      subtitle: t('premium.benefit2Subtitle'),
      color: 'bg-purple-50 text-purple-600',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/>
        </svg>
      ),
      title: t('premium.benefit3Title'),
      subtitle: t('premium.benefit3Subtitle'),
      color: 'bg-amber-50 text-amber-600',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
        </svg>
      ),
      title: t('premium.benefit4Title'),
      subtitle: t('premium.benefit4Subtitle'),
      color: 'bg-green-50 text-green-600',
    },
  ];

  const PAYMENT_METHODS = [
    {
      id: 'usdt',
      name: 'USDT (TRC20)',
      subtitle: t('premium.paymentUsdtSubtitle'),
      icon: '\u20AE',
    },
    {
      id: 'ton',
      name: 'TON',
      subtitle: t('premium.paymentTonSubtitle'),
      icon: '\u25C6',
    },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#F0F2F5]">
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Header */}
        <div className="bg-white px-5 pt-4 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
              <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
              </svg>
            </button>
            <h1 className="text-lg font-bold text-gray-900">{t('premium.title')}</h1>
          </div>
        </div>

        <div className="px-5 pt-4 pb-8 space-y-6">
          {/* Hero card */}
          <div className="bg-amber-50 rounded-2xl p-6 text-center">
            <img src={logoBlack} alt="PVA" className="w-24 h-24 mx-auto mb-3 object-contain" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('premium.premiumAccess')}</h2>
            <p className="text-gray-600">{t('premium.premiumDescription')}</p>
          </div>

          {/* Benefits */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t('premium.premiumBenefits')}</h3>
            <div className="space-y-4">
              {BENEFITS.map((b, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${b.color}`}>
                    {b.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{b.title}</p>
                    <p className="text-sm text-gray-500">{b.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Plans */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t('premium.chooseYourPlan')}</h3>
            <div className="space-y-3">
              {PLANS.map(plan => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`card cursor-pointer flex items-center justify-between transition-all ${
                    selectedPlan === plan.id
                      ? 'border-2 border-primary-500 shadow-md'
                      : 'border border-gray-100'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-gray-900">{plan.days}</p>
                      {plan.popular && (
                        <span className="bg-primary-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {t('premium.popular')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{plan.features}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-2xl font-bold text-primary-600">{plan.price}</p>
                    <p className="text-xs text-gray-500">{plan.period}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Methods */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t('premium.paymentMethods')}</h3>
            <div className="space-y-3">
              {PAYMENT_METHODS.map(pm => (
                <div key={pm.id} className="card flex items-center gap-4 border border-gray-100">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-xl font-bold text-gray-600">{pm.icon}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{pm.name}</p>
                    <p className="text-sm text-gray-500">{pm.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
