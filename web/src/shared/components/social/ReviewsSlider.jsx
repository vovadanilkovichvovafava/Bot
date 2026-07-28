import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdvertiser } from '../../context/AdvertiserContext';

/* Testimonials per country. Not a translation job — a Brazilian reading
 * "levantei 340€" and "golos" knows instantly the reviews were written for
 * Portugal: there it's reais and "gols", and the names differ too. Each review
 * carries the reviewer's flag, which Vlad asked for on the 28.07 call as a
 * trust trigger ("in my creatives the flag works well"). */
const REVIEWS_BY_COUNTRY = {
  PT: [
    { name: 'João M.', stars: 5, text: 'Nunca acreditei em apps de prognósticos, mas a IA acertou 4 dos meus 5 jogos. Já levantei 340€.' },
    { name: 'Ricardo S.', stars: 5, text: 'Logo na primeira aposta tive lucro — segui o palpite da IA, handicap -2.5 a 3.10, e entrou certinho!' },
    { name: 'Tiago F.', stars: 5, text: 'O que mais gosto é a quantidade de jogos e as estatísticas dos confrontos anteriores.' },
    { name: 'Miguel A.', stars: 5, text: 'Melhor app de apostas que já usei. Os palpites de "mais de 2.5 golos" são incríveis. 5 estrelas!' },
    { name: 'André C.', stars: 4, text: 'Comecei com 50€ e já vou em 280€. A IA é mesmo boa, principalmente nos golos.' },
  ],
  BR: [
    { name: 'Lucas M.', stars: 5, text: 'Não acreditava em app de palpite, mas a IA acertou 4 dos meus 5 jogos. Já saquei R$1.200.' },
    { name: 'Matheus S.', stars: 5, text: 'Logo na primeira aposta deu lucro — segui o palpite da IA no Brasileirão e entrou certinho!' },
    { name: 'Rafael O.', stars: 5, text: 'O melhor é a quantidade de jogos e as estatísticas dos confrontos. Uso todo dia antes de apostar.' },
    { name: 'Bruno C.', stars: 5, text: 'Melhor app de apostas que já usei. Os palpites de "mais de 2.5 gols" são certeiros demais.' },
    { name: 'Thiago P.', stars: 4, text: 'Comecei com R$100 e já estou em R$680. A IA acerta bastante, principalmente nos gols.' },
  ],
  ES: [
    { name: 'Carlos R.', stars: 5, text: 'No creía en apps de pronósticos, pero la IA acertó 4 de mis 5 partidos. Ya retiré 340€.' },
    { name: 'Javier M.', stars: 5, text: 'En la primera apuesta ya tuve ganancia — seguí el pronóstico de la IA y entró perfecto.' },
    { name: 'Diego S.', stars: 5, text: 'Lo que más me gusta es la cantidad de partidos y las estadísticas de enfrentamientos.' },
    { name: 'Pablo A.', stars: 5, text: 'La mejor app de apuestas que he usado. Los pronósticos de "más de 2.5 goles" son increíbles.' },
    { name: 'Alejandro C.', stars: 4, text: 'Empecé con 50€ y ya voy por 280€. La IA es muy buena, sobre todo en los goles.' },
  ],
};

const DEFAULT_REVIEWS = [
  { name: 'James M.', stars: 5, text: 'Never believed in prediction apps, but the AI got 4 of my 5 games right. Already withdrew €340.' },
  { name: 'Oliver S.', stars: 5, text: 'Profit on the very first bet — followed the AI pick and it landed exactly right.' },
  { name: 'Harry F.', stars: 5, text: 'What I like most is the number of games and the head-to-head stats.' },
  { name: 'Thomas A.', stars: 5, text: 'Best betting app I have used. The "over 2.5 goals" picks are incredible. 5 stars!' },
  { name: 'George C.', stars: 4, text: 'Started with €50 and I am already at €280. The AI is good, especially on goals.' },
];

/** ISO country code → flag emoji. */
function flagOf(code) {
  if (!code || code.length !== 2 || !/^[A-Za-z]{2}$/.test(code)) return null;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1f1e6 + c.charCodeAt(0) - 65));
}

const Stars = ({ n }) => (
  <span className="text-amber-400 text-xs tracking-tight">{'★'.repeat(n)}<span className="text-gray-300">{'★'.repeat(5 - n)}</span></span>
);

export default function ReviewsSlider({ title }) {
  const { t } = useTranslation();
  const { countryCode } = useAdvertiser();
  const [slide, setSlide] = useState(0);
  const trackRef = useRef(null);

  const cc = (countryCode || '').toUpperCase();
  const reviews = REVIEWS_BY_COUNTRY[cc] || DEFAULT_REVIEWS;
  const flag = flagOf(cc);
  const heading = title || t('reviews.title', { defaultValue: 'What our users say' });

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % reviews.length), 4000);
    return () => clearInterval(id);
  }, [reviews.length]);

  useEffect(() => {
    const el = trackRef.current;
    if (el) el.scrollTo({ left: slide * el.clientWidth, behavior: 'smooth' });
  }, [slide]);

  return (
    <div>
      {heading && <h3 className="text-sm font-extrabold text-gray-900 mb-2.5">{heading}</h3>}
      <div ref={trackRef} className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none -mx-1" style={{ scrollbarWidth: 'none' }}>
        {reviews.map((r, i) => (
          <div key={i} className="snap-center shrink-0 w-full px-1">
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-100 rounded-2xl p-4">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm">{r.name[0]}</div>
                <div>
                  <p className="text-[13px] font-bold text-gray-900 flex items-center gap-1.5">
                    {r.name}
                    {flag && <span className="text-[13px] leading-none">{flag}</span>}
                  </p>
                  <Stars n={r.stars} />
                </div>
                <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-green-600">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                  {t('reviews.verified', { defaultValue: 'verified' })}
                </span>
              </div>
              <p className="text-[13px] text-gray-600 leading-relaxed">"{r.text}"</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-1.5 mt-2.5">
        {reviews.map((_, i) => (
          <button key={i} onClick={() => setSlide(i)} className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-5 bg-blue-600' : 'w-1.5 bg-gray-300'}`} />
        ))}
      </div>
    </div>
  );
}
