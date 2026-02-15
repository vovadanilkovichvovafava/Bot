import { useRef } from 'react';

/**
 * Premium bouncing football spinner with gradient glow shadow.
 *
 * Props:
 *  - size: 'xs' | 'sm' | 'md' | 'lg'  (default 'md')
 *  - text: optional label below the spinner
 *  - light: true for light text (use on dark backgrounds)
 */
export default function FootballSpinner({ size = 'md', text, light = false }) {
  const id = useRef(Math.random().toString(36).slice(2, 8)).current;

  const sizes = {
    xs: { ball: 20, bounce: 10, shadow: { w: 16, h: 4 }, gap: 3, textClass: 'text-[10px] mt-1' },
    sm: { ball: 28, bounce: 14, shadow: { w: 22, h: 5 }, gap: 4, textClass: 'text-xs mt-1' },
    md: { ball: 48, bounce: 24, shadow: { w: 40, h: 8 }, gap: 6, textClass: 'text-sm mt-2' },
    lg: { ball: 64, bounce: 32, shadow: { w: 52, h: 10 }, gap: 8, textClass: 'text-base mt-3' },
  };

  const s = sizes[size] || sizes.md;
  const textColor = light ? 'text-white/80' : 'text-gray-400';
  const totalH = s.bounce + s.ball + s.gap + s.shadow.h;

  return (
    <div className="inline-flex flex-col items-center justify-center">
      <div
        className="flex flex-col items-center justify-end"
        style={{ width: Math.max(s.ball, s.shadow.w), height: totalH }}
      >
        {/* Bouncing ball wrapper */}
        <div className={`fbb-${id}`} style={{ flexShrink: 0 }}>
          <svg
            viewBox="0 0 100 100"
            width={s.ball}
            height={s.ball}
            className={`fbr-${id}`}
          >
            {/* Ball body */}
            <circle cx="50" cy="50" r="48" fill="white" />

            {/* Center pentagon */}
            <polygon
              points="50,28 37,36 40,52 60,52 63,36"
              fill="none"
              stroke="#bbb"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />

            {/* Seams from pentagon to edge */}
            <line x1="50" y1="28" x2="50" y2="4" stroke="#ccc" strokeWidth="1" />
            <line x1="37" y1="36" x2="16" y2="25" stroke="#ccc" strokeWidth="1" />
            <line x1="63" y1="36" x2="84" y2="25" stroke="#ccc" strokeWidth="1" />
            <line x1="40" y1="52" x2="22" y2="68" stroke="#ccc" strokeWidth="1" />
            <line x1="60" y1="52" x2="78" y2="68" stroke="#ccc" strokeWidth="1" />

            {/* Outer connecting seams */}
            <line x1="16" y1="25" x2="5" y2="48" stroke="#ccc" strokeWidth="1" />
            <line x1="84" y1="25" x2="95" y2="48" stroke="#ccc" strokeWidth="1" />
            <line x1="5" y1="48" x2="22" y2="68" stroke="#ccc" strokeWidth="1" />
            <line x1="95" y1="48" x2="78" y2="68" stroke="#ccc" strokeWidth="1" />
            <line x1="22" y1="68" x2="36" y2="88" stroke="#ccc" strokeWidth="1" />
            <line x1="78" y1="68" x2="64" y2="88" stroke="#ccc" strokeWidth="1" />
            <line x1="36" y1="88" x2="50" y2="97" stroke="#ccc" strokeWidth="1" />
            <line x1="64" y1="88" x2="50" y2="97" stroke="#ccc" strokeWidth="1" />
          </svg>
        </div>

        {/* Gradient glow shadow */}
        <div
          className={`fbs-${id} rounded-full`}
          style={{
            width: s.shadow.w,
            height: s.shadow.h,
            marginTop: s.gap,
            background:
              'radial-gradient(ellipse, rgba(99,102,241,0.5) 0%, rgba(139,92,246,0.3) 40%, transparent 70%)',
            flexShrink: 0,
          }}
        />
      </div>

      {text && (
        <p className={`${s.textClass} ${textColor} font-medium`}>{text}</p>
      )}

      <style>{`
        .fbb-${id} {
          animation: fbbBounce${id} 0.8s infinite;
        }
        .fbr-${id} {
          animation: fbbRoll${id} 1.6s linear infinite;
        }
        .fbs-${id} {
          animation: fbbShadow${id} 0.8s infinite;
        }

        @keyframes fbbBounce${id} {
          0%, 100% {
            transform: translateY(0) scaleY(0.88) scaleX(1.12);
            animation-timing-function: ease-out;
          }
          15% {
            transform: translateY(-${Math.round(s.bounce * 0.4)}px) scaleY(1.04) scaleX(0.96);
          }
          50% {
            transform: translateY(-${s.bounce}px) scaleY(1) scaleX(1);
            animation-timing-function: ease-in;
          }
          85% {
            transform: translateY(-${Math.round(s.bounce * 0.4)}px) scaleY(1.04) scaleX(0.96);
          }
        }

        @keyframes fbbRoll${id} {
          to { transform: rotate(360deg); }
        }

        @keyframes fbbShadow${id} {
          0%, 100% {
            transform: scaleX(1.15);
            opacity: 0.7;
            animation-timing-function: ease-out;
          }
          50% {
            transform: scaleX(0.5);
            opacity: 0.25;
            animation-timing-function: ease-in;
          }
        }
      `}</style>
    </div>
  );
}
