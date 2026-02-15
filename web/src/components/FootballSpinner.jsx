/**
 * Football-themed loading spinner.
 *
 * Props:
 *  - size: 'xs' | 'sm' | 'md' | 'lg'  (default 'md')
 *  - text: optional label below the ball
 *  - light: true for white ball (use on dark backgrounds)
 */
export default function FootballSpinner({ size = 'md', text, light = false }) {
  const sizes = {
    xs: { ball: 16, wrapper: 'w-4 h-4', textClass: 'text-[10px] mt-1' },
    sm: { ball: 20, wrapper: 'w-5 h-5', textClass: 'text-xs mt-1' },
    md: { ball: 40, wrapper: 'w-10 h-10', textClass: 'text-sm mt-2' },
    lg: { ball: 56, wrapper: 'w-14 h-14', textClass: 'text-base mt-3' },
  };

  const s = sizes[size] || sizes.md;
  const ballColor = light ? '#ffffff' : '#1a1a1a';
  const patchColor = light ? 'rgba(255,255,255,0.3)' : '#333333';
  const lineColor = light ? 'rgba(255,255,255,0.5)' : '#444444';
  const textColor = light ? 'text-white/80' : 'text-gray-500';

  return (
    <div className="inline-flex flex-col items-center justify-center">
      <div className={`${s.wrapper} football-spinner`}>
        <svg
          viewBox="0 0 100 100"
          width={s.ball}
          height={s.ball}
          className="football-ball"
        >
          {/* Ball body */}
          <circle cx="50" cy="50" r="48" fill={ballColor} stroke={lineColor} strokeWidth="2" />

          {/* Pentagon patches — classic football pattern */}
          <polygon
            points="50,22 61,33 57,46 43,46 39,33"
            fill={patchColor}
            stroke={lineColor}
            strokeWidth="1.5"
          />
          <polygon
            points="27,42 38,33 43,46 35,57 24,53"
            fill={patchColor}
            stroke={lineColor}
            strokeWidth="1.5"
          />
          <polygon
            points="73,42 62,33 57,46 65,57 76,53"
            fill={patchColor}
            stroke={lineColor}
            strokeWidth="1.5"
          />
          <polygon
            points="35,68 43,58 57,58 65,68 57,78"
            fill={patchColor}
            stroke={lineColor}
            strokeWidth="1.5"
          />

          {/* Seam lines connecting patches */}
          <line x1="50" y1="2" x2="50" y2="22" stroke={lineColor} strokeWidth="1" />
          <line x1="61" y1="33" x2="73" y2="42" stroke={lineColor} strokeWidth="1" />
          <line x1="39" y1="33" x2="27" y2="42" stroke={lineColor} strokeWidth="1" />
          <line x1="24" y1="53" x2="20" y2="68" stroke={lineColor} strokeWidth="1" />
          <line x1="76" y1="53" x2="80" y2="68" stroke={lineColor} strokeWidth="1" />
          <line x1="35" y1="68" x2="28" y2="80" stroke={lineColor} strokeWidth="1" />
          <line x1="65" y1="68" x2="72" y2="80" stroke={lineColor} strokeWidth="1" />
          <line x1="57" y1="78" x2="50" y2="98" stroke={lineColor} strokeWidth="1" />
        </svg>
      </div>
      {text && (
        <p className={`${s.textClass} ${textColor} font-medium`}>{text}</p>
      )}

      <style>{`
        .football-spinner {
          animation: footballBounce 0.8s ease-in-out infinite;
        }
        .football-ball {
          animation: footballSpin 1.2s linear infinite;
        }
        @keyframes footballBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-30%); }
        }
        @keyframes footballSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
