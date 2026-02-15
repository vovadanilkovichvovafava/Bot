import { useRef } from 'react';

/**
 * Premium loading spinner — gradient ring with rolling football.
 *
 * Props:
 *  - size: 'xs' | 'sm' | 'md' | 'lg'  (default 'md')
 *  - text: optional label below the spinner
 *  - light: true for light text (use on dark backgrounds)
 */
export default function FootballSpinner({ size = 'md', text, light = false }) {
  const id = useRef(Math.random().toString(36).slice(2, 8)).current;

  const sizes = {
    xs: { dim: 24, textClass: 'text-[10px] mt-1' },
    sm: { dim: 32, textClass: 'text-xs mt-1' },
    md: { dim: 56, textClass: 'text-sm mt-2' },
    lg: { dim: 72, textClass: 'text-base mt-3' },
  };

  const s = sizes[size] || sizes.md;
  const textColor = light ? 'text-white/80' : 'text-gray-400';

  /* Ring geometry: r=40, circumference ≈ 251 → 75% visible arc = 188, gap = 63 */

  return (
    <div className="inline-flex flex-col items-center justify-center">
      <svg
        viewBox="0 0 100 100"
        width={s.dim}
        height={s.dim}
        className={`fbs-${id}`}
      >
        <defs>
          <linearGradient id={`rg${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="33%" stopColor="#6366F1" />
            <stop offset="66%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
          <filter id={`gw${id}`}>
            <feGaussianBlur stdDeviation="1.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Faint background ring */}
        <circle
          cx="50" cy="50" r="40"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="3"
        />

        {/* Gradient arc with glow */}
        <circle
          cx="50" cy="50" r="40"
          fill="none"
          stroke={`url(#rg${id})`}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="188 63"
          filter={`url(#gw${id})`}
          className={`fbp-${id}`}
        />

        {/* Football at leading edge of arc (12 o'clock position) */}
        <g transform="translate(50,10)">
          <g className={`fbr-${id}`}>
            {/* Ball body */}
            <circle r="6.5" fill="white" />
            {/* Center pentagon */}
            <polygon
              points="0,-2.8 -2.3,-0.9 -1.4,2.3 1.4,2.3 2.3,-0.9"
              fill="none"
              stroke="#bbb"
              strokeWidth="0.6"
              strokeLinejoin="round"
            />
            {/* Seams from pentagon vertices */}
            <line x1="0" y1="-2.8" x2="0" y2="-5.8" stroke="#ccc" strokeWidth="0.4" />
            <line x1="-2.3" y1="-0.9" x2="-5.2" y2="-2.2" stroke="#ccc" strokeWidth="0.4" />
            <line x1="2.3" y1="-0.9" x2="5.2" y2="-2.2" stroke="#ccc" strokeWidth="0.4" />
            <line x1="-1.4" y1="2.3" x2="-3.2" y2="5" stroke="#ccc" strokeWidth="0.4" />
            <line x1="1.4" y1="2.3" x2="3.2" y2="5" stroke="#ccc" strokeWidth="0.4" />
          </g>
        </g>
      </svg>

      {text && (
        <p className={`${s.textClass} ${textColor} font-medium`}>{text}</p>
      )}

      <style>{`
        .fbs-${id} {
          animation: fbSpin 2.5s linear infinite;
        }
        .fbr-${id} {
          animation: fbRoll 2.5s linear infinite;
        }
        .fbp-${id} {
          animation: fbPulse 2.5s ease-in-out infinite;
        }
        @keyframes fbSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes fbRoll {
          to { transform: rotate(2160deg); }
        }
        @keyframes fbPulse {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
