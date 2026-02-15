import { useRef } from 'react';
import soccerBall from '../assets/soccer-ball.svg';

/**
 * Premium bouncing football spinner with gradient glow shadow.
 * Uses a real soccer ball SVG icon (from SVGRepo, public domain).
 *
 * Props:
 *  - size: 'xs' | 'sm' | 'md' | 'lg'  (default 'md')
 *  - text: optional label below the spinner
 *  - light: true for light text (use on dark backgrounds)
 */
export default function FootballSpinner({ size = 'md', text, light = false }) {
  const id = useRef(Math.random().toString(36).slice(2, 8)).current;

  const sizes = {
    xs: { ball: 18, bounce: 8,  shadow: { w: 14, h: 4 }, gap: 2, textClass: 'text-[10px] mt-1' },
    sm: { ball: 26, bounce: 12, shadow: { w: 20, h: 5 }, gap: 3, textClass: 'text-xs mt-1' },
    md: { ball: 44, bounce: 22, shadow: { w: 36, h: 8 }, gap: 5, textClass: 'text-sm mt-2' },
    lg: { ball: 60, bounce: 30, shadow: { w: 48, h: 10 }, gap: 6, textClass: 'text-base mt-3' },
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
        {/* Bouncing ball */}
        <div className={`fbb-${id}`} style={{ flexShrink: 0 }}>
          <img
            src={soccerBall}
            alt=""
            width={s.ball}
            height={s.ball}
            className={`fbr-${id}`}
            draggable={false}
          />
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
          animation: fbbB${id} 0.8s infinite;
        }
        .fbr-${id} {
          animation: fbbR${id} 1.6s linear infinite;
        }
        .fbs-${id} {
          animation: fbbS${id} 0.8s infinite;
        }

        @keyframes fbbB${id} {
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

        @keyframes fbbR${id} {
          to { transform: rotate(360deg); }
        }

        @keyframes fbbS${id} {
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
