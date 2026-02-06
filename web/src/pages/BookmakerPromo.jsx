import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SupportChat, { BOOKMAKER } from '../components/SupportChat';

export default function BookmakerPromo() {
  const navigate = useNavigate();
  const [showChat, setShowChat] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);

  const advantages = [
    { icon: '⚡', title: 'Быстрые выплаты', desc: 'Вывод до 24 часов' },
    { icon: '📱', title: 'Моб. приложение', desc: 'iOS и Android' },
    { icon: '🔴', title: 'Live-ставки', desc: 'Ставь во время матча' },
    { icon: '📊', title: 'Широкая линия', desc: '1000+ событий в день' },
    { icon: '📈', title: 'Высокие коэфф.', desc: 'Маржа от 2%' },
    { icon: '🎁', title: 'Бонусы', desc: 'Регулярные акции' },
  ];

  const reviews = [
    { name: 'Алексей М.', text: 'Пользуюсь уже год, выплаты всегда вовремя. Коэффициенты выше чем у конкурентов.', rating: 5 },
    { name: 'Дмитрий К.', text: 'Приложение удобное, ставки делаю прямо с телефона. Бонус на первый депозит реально дали!', rating: 5 },
    { name: 'Сергей В.', text: 'Раньше ставил в других БК, но здесь линия шире и лайв лучше работает.', rating: 4 },
  ];

  const faqs = [
    { q: 'Как зарегистрироваться?', a: 'Перейдите по нашей ссылке, заполните форму регистрации (займёт 2 минуты), подтвердите email или телефон.' },
    { q: 'Какой минимальный депозит?', a: `Минимальный депозит — ${BOOKMAKER.minDeposit}. Этого достаточно для начала.` },
    { q: 'Как получить бонус?', a: `Бонус ${BOOKMAKER.bonus} зачисляется автоматически после первого депозита при регистрации по нашей ссылке.` },
    { q: 'Как получить PRO-доступ?', a: 'После регистрации и первого депозита PRO-доступ откроется автоматически в течение нескольких минут.' },
    { q: 'Как вывести выигрыш?', a: 'Вывод доступен на банковские карты, электронные кошельки и криптовалюту. Обработка до 24 часов.' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800">
      {/* Header */}
      <div className="px-5 pt-4 pb-2">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
          </svg>
        </button>
      </div>

      {/* Hero */}
      <div className="relative px-5 pt-4 pb-8 overflow-hidden">
        {/* Background effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl"/>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl"/>

        <div className="relative text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-4xl">🎁</span>
          </div>

          <h1 className="text-3xl font-black text-white mb-2">
            Получи бонус {BOOKMAKER.bonus}
          </h1>
          <p className="text-lg text-amber-400 font-semibold mb-1">
            + PRO-доступ бесплатно!
          </p>
          <p className="text-white/60 text-sm mb-6">
            Зарегистрируйся в {BOOKMAKER.name} и делай ставки по AI-прогнозам
          </p>

          <a
            href={BOOKMAKER.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            Зарегистрироваться
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
            </svg>
          </a>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-t-3xl px-5 py-8 space-y-8">

        {/* Advantages */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">Почему {BOOKMAKER.name}?</h2>
          <div className="grid grid-cols-3 gap-3">
            {advantages.map((adv, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                <span className="text-2xl">{adv.icon}</span>
                <p className="text-xs font-semibold text-gray-900 mt-1">{adv.title}</p>
                <p className="text-[10px] text-gray-500">{adv.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How to start */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">Как начать?</h2>
          <div className="space-y-3">
            <StepCard number={1} title="Зарегистрируйся по ссылке" desc="Перейди на сайт и заполни форму регистрации (2 минуты)" />
            <StepCard number={2} title={`Пополни счёт от ${BOOKMAKER.minDeposit}`} desc="Выбери удобный способ оплаты и внеси депозит" />
            <StepCard number={3} title="Получи бонус + PRO" desc={`Бонус ${BOOKMAKER.bonus} зачислится, PRO откроется автоматически!`} done />
          </div>
        </section>

        {/* Help */}
        <section className="bg-gradient-to-r from-primary-50 to-indigo-50 rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">Нужна помощь с регистрацией?</h3>
              <p className="text-sm text-gray-600">Наш менеджер поможет пошагово!</p>
            </div>
          </div>
          <button
            onClick={() => setShowChat(true)}
            className="w-full mt-4 py-3 bg-primary-600 text-white font-semibold rounded-xl"
          >
            Написать в поддержку
          </button>
        </section>

        {/* Reviews */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">Отзывы пользователей</h2>
          <div className="space-y-3">
            {reviews.map((review, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-sm">
                    {review.name[0]}
                  </div>
                  <span className="font-semibold text-gray-900 text-sm">{review.name}</span>
                  <div className="ml-auto flex">
                    {[...Array(review.rating)].map((_, j) => (
                      <span key={j} className="text-amber-400 text-sm">★</span>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-600">{review.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">Частые вопросы</h2>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left"
                >
                  <span className="font-medium text-gray-900 text-sm">{faq.q}</span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${expandedFaq === i ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
                  </svg>
                </button>
                {expandedFaq === i && (
                  <div className="px-4 pb-3 text-sm text-gray-600">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mt-4">
            Не нашёл ответ?{' '}
            <button onClick={() => setShowChat(true)} className="text-primary-600 font-semibold">
              Спроси в поддержке
            </button>
          </p>
        </section>

        {/* Final CTA */}
        <section className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Готов начать?</h2>
          <p className="text-sm text-gray-600 mb-5">
            Зарегистрируйся сейчас и получи бонус {BOOKMAKER.bonus} + PRO-доступ бесплатно
          </p>

          <a
            href={BOOKMAKER.link}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-4 rounded-2xl shadow-lg mb-3"
          >
            Зарегистрироваться в {BOOKMAKER.name}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
            </svg>
          </a>

          <button
            onClick={() => setShowChat(true)}
            className="w-full text-primary-600 font-semibold py-3 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/>
            </svg>
            Написать менеджеру
          </button>
        </section>

        <div className="h-4"/>
      </div>

      {/* Support Chat */}
      <SupportChat isOpen={showChat} onClose={() => setShowChat(false)} />
    </div>
  );
}

function StepCard({ number, title, desc, done }) {
  return (
    <div className="flex items-start gap-4 bg-gray-50 rounded-xl p-4">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-white ${done ? 'bg-green-500' : 'bg-primary-600'}`}>
        {done ? '✓' : number}
      </div>
      <div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{desc}</p>
      </div>
    </div>
  );
}
