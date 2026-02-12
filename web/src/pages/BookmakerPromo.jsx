import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAdvertiser } from '../context/AdvertiserContext';
import SupportChat from '../components/SupportChat';
import geoService from '../services/geoService';

export default function BookmakerPromo() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { advertiser, trackClick } = useAdvertiser();
  const [showChat, setShowChat] = useState(false);
  const [geoInfo, setGeoInfo] = useState(null);
  const [bookmakerLink, setBookmakerLink] = useState(null);
  const [loadingLink, setLoadingLink] = useState(false);

  // Fetch geo info and appropriate bookmaker link on mount
  useEffect(() => {
    async function fetchGeoAndLink() {
      setLoadingLink(true);
      try {
        const geo = await geoService.getGeoInfo();
        setGeoInfo(geo);

        // Get tracked bookmaker link with cloaking support
        const linkData = await geoService.getBookmakerLink(user?.id || 'anonymous', 'promo_page');
        if (linkData.success) {
          setBookmakerLink(linkData.link);
        } else {
          setBookmakerLink(advertiser.link);
        }
      } catch (error) {
        console.error('Failed to fetch geo/link:', error);
        setBookmakerLink(advertiser.link);
      } finally {
        setLoadingLink(false);
      }
    }

    fetchGeoAndLink();
  }, [user?.id, advertiser.link]);

  const benefits = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
        </svg>
      ),
      title: 'Совпадение с нашими прогнозами',
      desc: 'Коэффициенты и линии, которые мы указываем в прогнозах, берутся именно от этого букмекера. У другого букмекера ваши ставки могут не совпадать с нашими рекомендациями.'
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/>
        </svg>
      ),
      title: 'Выплаты любых выигрышей',
      desc: 'Работая по нашим прогнозам, вы будете выигрывать — и зачастую крупные суммы. Этот букмекер гарантированно выплачивает большие выигрыши без задержек и ограничений.'
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/>
        </svg>
      ),
      title: 'Лучшие коэффициенты',
      desc: 'Высокие коэффициенты = больше прибыли с каждой ставки. Здесь одни из самых выгодных коэффициентов на рынке.'
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
        </svg>
      ),
      title: 'Надёжный лицензированный букмекер',
      desc: 'Работает по международной лицензии. Проверен нашей командой и тысячами пользователей AI Betting Bot.'
    },
  ];

  const whyHere = [
    {
      text: 'Наши прогнозы привязаны к этому букмекеру',
      desc: '— коэффициенты, линии и рекомендации рассчитаны под его котировки'
    },
    {
      text: 'У другого букмекера ваш результат может отличаться',
      desc: '— другие коэффициенты и маржа могут привести к убыткам даже при верном прогнозе'
    },
    {
      text: 'Статистика в приложении будет точной',
      desc: '— ваши результаты полностью совпадут с нашей статистикой побед'
    },
  ];

  const steps = [
    {
      num: 1,
      title: 'Установи приложение',
      desc: 'Нажми кнопку ниже — скачай и установи приложение букмекера'
    },
    {
      num: 2,
      title: 'Зарегистрируйся',
      desc: 'Заполни данные за минуту, пополни депозит и получи бонус на ставки до 1500€'
    },
    {
      num: 3,
      title: 'Делай ставки по прогнозам',
      desc: 'Возвращайся в AI Betting Bot, читай прогнозы и ставь по рекомендациям'
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Dark */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white px-5 pt-4 pb-8 rounded-b-3xl">
        {/* Back button */}
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full mb-4">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
          </svg>
        </button>

        {/* Partner badge */}
        <div className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1 mb-4">
          <span className="w-2 h-2 bg-green-400 rounded-full"/>
          <span className="text-xs text-white/80">Официальный партнёр AI Betting Bot</span>
        </div>

        {/* Hero text */}
        <h1 className="text-2xl font-bold mb-2">
          Бонус до <span className="text-amber-400">1 500€</span> на ставки
          <br/>по нашим прогнозам
        </h1>
        <p className="text-white/60 text-sm mb-6">
          Делай ставки по AI-прогнозам у проверенного букмекера с лучшими коэффициентами
        </p>

        {/* Bonus card */}
        <div className="bg-white rounded-2xl p-4 text-gray-900">
          <div className="text-center mb-4">
            <p className="text-xs text-gray-500 mb-1">до</p>
            <p className="text-4xl font-black text-amber-500">1 500<span className="text-2xl">€</span></p>
            <p className="text-xs text-gray-500">бонус на первый депозит для новых игроков</p>
          </div>

          {/* Stats */}
          <div className="flex justify-between border-t border-gray-100 pt-4">
            <div className="text-center flex-1">
              <p className="text-lg font-bold text-gray-900">15 мин</p>
              <p className="text-[10px] text-gray-400 uppercase">вывод средств</p>
            </div>
            <div className="text-center flex-1 border-x border-gray-100">
              <p className="text-lg font-bold text-gray-900">50+</p>
              <p className="text-[10px] text-gray-400 uppercase">видов спорта</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-lg font-bold text-gray-900">24/7</p>
              <p className="text-[10px] text-gray-400 uppercase">поддержка</p>
            </div>
          </div>
        </div>
      </div>

      {/* Geo Warning */}
      {geoInfo?.isBlocked && (
        <div className="mx-5 mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
            </svg>
            <p className="text-amber-700 text-sm">
              Используется альтернативная ссылка для вашего региона ({geoInfo.country})
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-5 py-6 space-y-6">
        {/* Benefits */}
        <section className="space-y-3">
          {benefits.map((b, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0 text-amber-600">
                {b.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm">{b.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{b.desc}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Why here block */}
        <section className="bg-amber-50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-amber-500">⚠️</span>
            <h2 className="font-bold text-gray-900">Почему важно ставить именно здесь?</h2>
          </div>
          <div className="space-y-3">
            {whyHere.map((item, i) => (
              <div key={i} className="flex gap-2">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                </div>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">{item.text}</span>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How to start */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span>🚀</span>
            <h2 className="font-bold text-gray-900">Как начать за 2 минуты</h2>
          </div>
          <div className="space-y-3">
            {steps.map((step) => (
              <div key={step.num} className="flex gap-3">
                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm">
                  {step.num}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm">{step.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Button */}
        <a
          href={bookmakerLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white text-center font-bold py-4 rounded-2xl shadow-lg"
        >
          {loadingLink ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              Загрузка...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/>
              </svg>
              Установить приложение букмекера
            </span>
          )}
        </a>
        <p className="text-center text-xs text-gray-400">
          Бесплатно • Бонус до 1500€ при регистрации
        </p>

        {/* Help block */}
        <section className="bg-primary-50 rounded-2xl p-4 mt-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-sm">Нужна помощь с регистрацией?</h3>
              <p className="text-xs text-gray-500">Наш менеджер поможет пройти все шаги!</p>
            </div>
          </div>
          <button
            onClick={() => setShowChat(true)}
            className="w-full mt-3 py-2.5 bg-primary-600 text-white font-semibold rounded-xl text-sm"
          >
            Написать в поддержку
          </button>
        </section>

        <div className="h-6"/>
      </div>

      {/* Support Chat */}
      <SupportChat isOpen={showChat} onClose={() => setShowChat(false)} />
    </div>
  );
}
