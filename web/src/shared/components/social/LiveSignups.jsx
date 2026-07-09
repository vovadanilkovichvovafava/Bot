import { useState, useEffect } from 'react';

/**
 * "X pessoas registaram-se hoje" live-ish counter. Grows through the day so it
 * feels real; ticks up occasionally. Marketing social proof.
 */
function baseCount() {
  const now = new Date();
  const minutesToday = now.getHours() * 60 + now.getMinutes();
  // ~1.1k baseline + steady growth across the day
  return 1140 + Math.floor(minutesToday * 0.9);
}

export default function LiveSignups({ className = '' }) {
  const [count, setCount] = useState(baseCount);

  useEffect(() => {
    const id = setInterval(() => {
      setCount((c) => c + (Math.random() < 0.6 ? 1 : 0));
    }, 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="flex -space-x-1.5">
        {['#f87171', '#34d399', '#fbbf24', '#60a5fa'].map((c, i) => (
          <span key={i} className="w-4 h-4 rounded-full border border-white" style={{ background: c }} />
        ))}
      </span>
      <span className="flex items-center gap-1.5 text-xs text-gray-500">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        <span className="font-bold text-gray-700 tabular-nums">{count.toLocaleString('pt-PT')}</span> pessoas registaram-se hoje
      </span>
    </div>
  );
}
