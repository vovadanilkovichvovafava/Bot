import { useState, useEffect, useRef } from 'react';

/* Curated PT testimonials — marketing social proof. Edit freely. */
const REVIEWS = [
  { name: 'João M.', stars: 5, text: 'Nunca acreditei em apps de prognósticos, mas a IA acertou 4 dos meus 5 jogos. Já levantei 340€.' },
  { name: 'Ricardo S.', stars: 5, text: 'Logo na primeira aposta tive lucro — segui o palpite da IA no Argentina vs Argélia, handicap -2.5 a 3.10, e entrou certinho!' },
  { name: 'Tiago F.', stars: 5, text: 'O que mais gosto é a quantidade de jogos e as estatísticas dos confrontos anteriores. Uso como substituto do Flashscore.' },
  { name: 'Miguel A.', stars: 5, text: 'Melhor app de apostas que já usei. Os palpites de "mais de 2.5 golos" são incríveis. 5 estrelas!' },
  { name: 'André C.', stars: 4, text: 'Comecei com 50€ e já vou em 280€. A IA é mesmo boa, principalmente nos golos.' },
];

const Stars = ({ n }) => (
  <span className="text-amber-400 text-xs tracking-tight">{'★'.repeat(n)}<span className="text-gray-300">{'★'.repeat(5 - n)}</span></span>
);

export default function ReviewsSlider({ title = 'O que dizem os utilizadores' }) {
  const [slide, setSlide] = useState(0);
  const trackRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % REVIEWS.length), 4000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (el) el.scrollTo({ left: slide * el.clientWidth, behavior: 'smooth' });
  }, [slide]);

  return (
    <div>
      {title && <h3 className="text-sm font-extrabold text-gray-900 mb-2.5">{title}</h3>}
      <div ref={trackRef} className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none -mx-1" style={{ scrollbarWidth: 'none' }}>
        {REVIEWS.map((r, i) => (
          <div key={i} className="snap-center shrink-0 w-full px-1">
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-100 rounded-2xl p-4">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm">{r.name[0]}</div>
                <div>
                  <p className="text-[13px] font-bold text-gray-900">{r.name}</p>
                  <Stars n={r.stars} />
                </div>
                <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-green-600">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                  verificado
                </span>
              </div>
              <p className="text-[13px] text-gray-600 leading-relaxed">"{r.text}"</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-1.5 mt-2.5">
        {REVIEWS.map((_, i) => (
          <button key={i} onClick={() => setSlide(i)} className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-5 bg-blue-600' : 'w-1.5 bg-gray-300'}`} />
        ))}
      </div>
    </div>
  );
}
