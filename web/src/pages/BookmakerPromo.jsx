import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SupportChat, { BOOKMAKER } from '../components/SupportChat';
import geoService from '../services/geoService';

export default function BookmakerPromo() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showChat, setShowChat] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [geoInfo, setGeoInfo] = useState(null);
  const [bookmakerLink, setBookmakerLink] = useState(BOOKMAKER.link);
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
        }
      } catch (error) {
        console.error('Failed to fetch geo/link:', error);
      } finally {
        setLoadingLink(false);
      }
    }

    fetchGeoAndLink();
  }, [user?.id]);

  const advantages = [
    { icon: '⚡', title: 'Fast Payouts', desc: 'Withdrawal within 24h' },
    { icon: '📱', title: 'Mobile App', desc: 'iOS and Android' },
    { icon: '🔴', title: 'Live Betting', desc: 'Bet during matches' },
    { icon: '📊', title: 'Wide Markets', desc: '1000+ events daily' },
    { icon: '📈', title: 'High Odds', desc: 'Margin from 2%' },
    { icon: '🎁', title: 'Bonuses', desc: 'Regular promotions' },
  ];

  const reviews = [
    { name: 'Alex M.', text: 'Been using it for a year, payouts always on time. Odds are higher than competitors.', rating: 5 },
    { name: 'David K.', text: 'Convenient app, I place bets right from my phone. First deposit bonus was real!', rating: 5 },
    { name: 'Steve V.', text: 'Used to bet at other bookmakers, but here the market is wider and live works better.', rating: 4 },
  ];

  const faqs = [
    { q: 'How to register?', a: 'Click our link, fill out the registration form (takes 2 minutes), confirm your email or phone.' },
    { q: 'What is the minimum deposit?', a: `Minimum deposit is ${BOOKMAKER.minDeposit}. That's enough to get started.` },
    { q: 'How to get the bonus?', a: `Bonus ${BOOKMAKER.bonus} is credited automatically after your first deposit when registering through our link.` },
    { q: 'How to get PRO access?', a: 'After registration and first deposit, PRO access will open automatically within a few minutes.' },
    { q: 'How to withdraw winnings?', a: 'Withdrawal is available to bank cards, e-wallets, and cryptocurrency. Processing up to 24 hours.' },
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

      {/* Geo Warning Banner (for blocked countries) */}
      {geoInfo?.isBlocked && (
        <div className="mx-5 mb-4 bg-amber-500/20 border border-amber-500/30 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
            </svg>
            <p className="text-amber-200 text-sm">
              Using alternative link for your region ({geoInfo.country})
            </p>
          </div>
        </div>
      )}

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
            Get bonus {BOOKMAKER.bonus}
          </h1>
          <p className="text-lg text-amber-400 font-semibold mb-1">
            + FREE PRO access!
          </p>
          <p className="text-white/60 text-sm mb-6">
            Register at {BOOKMAKER.name} and bet on AI predictions
          </p>

          <a
            href={bookmakerLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            {loadingLink ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                Loading...
              </>
            ) : (
              <>
                Register Now
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
                </svg>
              </>
            )}
          </a>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-t-3xl px-5 py-8 space-y-8">

        {/* Advantages */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">Why {BOOKMAKER.name}?</h2>
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
          <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">How to Start?</h2>
          <div className="space-y-3">
            <StepCard number={1} title="Register via the link" desc="Go to the site and fill out the registration form (2 minutes)" />
            <StepCard number={2} title={`Deposit from ${BOOKMAKER.minDeposit}`} desc="Choose a convenient payment method and make a deposit" />
            <StepCard number={3} title="Get bonus + PRO" desc={`Bonus ${BOOKMAKER.bonus} will be credited, PRO opens automatically!`} done />
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
              <h3 className="font-bold text-gray-900">Need help with registration?</h3>
              <p className="text-sm text-gray-600">Our manager will guide you step by step!</p>
            </div>
          </div>
          <button
            onClick={() => setShowChat(true)}
            className="w-full mt-4 py-3 bg-primary-600 text-white font-semibold rounded-xl"
          >
            Contact Support
          </button>
        </section>

        {/* Reviews */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">User Reviews</h2>
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
          <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">Frequently Asked Questions</h2>
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
            Didn't find an answer?{' '}
            <button onClick={() => setShowChat(true)} className="text-primary-600 font-semibold">
              Ask support
            </button>
          </p>
        </section>

        {/* Final CTA */}
        <section className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ready to Start?</h2>
          <p className="text-sm text-gray-600 mb-5">
            Register now and get bonus {BOOKMAKER.bonus} + FREE PRO access
          </p>

          <a
            href={bookmakerLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-4 rounded-2xl shadow-lg mb-3"
          >
            Register at {BOOKMAKER.name}
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
            Contact Manager
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
