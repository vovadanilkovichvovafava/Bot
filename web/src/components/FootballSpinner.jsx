/**
 * Football-themed loading spinner — clean bouncing soccer ball with shadow.
 *
 * Props:
 *  - size: 'xs' | 'sm' | 'md' | 'lg'  (default 'md')
 *  - text: optional label below the ball
 *  - light: true for light text (use on dark backgrounds)
 */
export default function FootballSpinner({ size = 'md', text, light = false }) {
  const sizes = {
    xs: { ball: 20, gap: 3, shadow: { w: 16, h: 4 }, textClass: 'text-[10px] mt-1' },
    sm: { ball: 28, gap: 4, shadow: { w: 22, h: 5 }, textClass: 'text-xs mt-1' },
    md: { ball: 48, gap: 6, shadow: { w: 36, h: 8 }, textClass: 'text-sm mt-2' },
    lg: { ball: 64, gap: 8, shadow: { w: 48, h: 10 }, textClass: 'text-base mt-3' },
  };

  const s = sizes[size] || sizes.md;
  const textColor = light ? 'text-white/80' : 'text-gray-500';

  return (
    <div className="inline-flex flex-col items-center justify-center">
      <div className="flex flex-col items-center" style={{ width: s.ball, height: s.ball + s.gap + s.shadow.h }}>
        {/* Bouncing ball */}
        <svg
          viewBox="0 0 100 100"
          width={s.ball}
          height={s.ball}
          className="fb-bounce"
          style={{ flexShrink: 0 }}
        >
          {/* Main circle — dark gray */}
          <circle cx="50" cy="50" r="48" fill="#555" stroke="#333" strokeWidth="3" />

          {/* Center pentagon — white */}
          <polygon
            points="50,22 35,33 39,51 61,51 65,33"
            fill="#fff"
            stroke="#333"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Top-left pentagon */}
          <polygon
            points="35,33 18,28 8,44 17,58 39,51"
            fill="#fff"
            stroke="#333"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Top-right pentagon */}
          <polygon
            points="65,33 82,28 92,44 83,58 61,51"
            fill="#fff"
            stroke="#333"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Bottom-left pentagon */}
          <polygon
            points="39,51 17,58 20,76 40,82 50,67"
            fill="#fff"
            stroke="#333"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Bottom-right pentagon */}
          <polygon
            points="61,51 83,58 80,76 60,82 50,67"
            fill="#fff"
            stroke="#333"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>

        {/* Shadow */}
        <div
          className="fb-shadow rounded-full"
          style={{
            width: s.shadow.w,
            height: s.shadow.h,
            marginTop: s.gap,
            background: 'radial-gradient(ellipse, rgba(0,0,0,0.25) 0%, transparent 70%)',
          }}
        />
      </div>

      {text && (
        <p className={`${s.textClass} ${textColor} font-medium`}>{text}</p>
      )}

      <style>{`
        .fb-bounce {
          animation: fbBounce 0.6s ease-in-out infinite;
        }
        .fb-shadow {
          animation: fbShadow 0.6s ease-in-out infinite;
        }
        @keyframes fbBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-50%); }
        }
        @keyframes fbShadow {
          0%, 100% { transform: scaleX(1); opacity: 0.6; }
          50% { transform: scaleX(0.6); opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
