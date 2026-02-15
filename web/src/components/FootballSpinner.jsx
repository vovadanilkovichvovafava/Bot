/**
 * Football-themed loading spinner — realistic soccer ball.
 *
 * Props:
 *  - size: 'xs' | 'sm' | 'md' | 'lg'  (default 'md')
 *  - text: optional label below the ball
 *  - light: true for light text (use on dark backgrounds)
 */
export default function FootballSpinner({ size = 'md', text, light = false }) {
  const sizes = {
    xs: { ball: 20, wrapper: 'w-5 h-5', textClass: 'text-[10px] mt-1' },
    sm: { ball: 28, wrapper: 'w-7 h-7', textClass: 'text-xs mt-1' },
    md: { ball: 48, wrapper: 'w-12 h-12', textClass: 'text-sm mt-2' },
    lg: { ball: 64, wrapper: 'w-16 h-16', textClass: 'text-base mt-3' },
  };

  const s = sizes[size] || sizes.md;
  const textColor = light ? 'text-white/80' : 'text-gray-500';

  return (
    <div className="inline-flex flex-col items-center justify-center">
      <div className={`${s.wrapper} football-spinner`}>
        <svg
          viewBox="0 0 200 200"
          width={s.ball}
          height={s.ball}
          className="football-ball"
        >
          <defs>
            {/* 3D shading gradient */}
            <radialGradient id="ballShade" cx="40%" cy="35%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="#f0f0f0" />
              <stop offset="100%" stopColor="#cccccc" />
            </radialGradient>
            {/* Highlight glare */}
            <radialGradient id="ballGlare" cx="35%" cy="30%" r="25%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Ball body with 3D shading */}
          <circle cx="100" cy="100" r="96" fill="url(#ballShade)" stroke="#888" strokeWidth="3" />

          {/* White hexagon panels (seam lines) */}
          {/* Top seams */}
          <line x1="100" y1="4" x2="100" y2="30" stroke="#999" strokeWidth="1.5" />
          <line x1="100" y1="30" x2="65" y2="47" stroke="#999" strokeWidth="1.5" />
          <line x1="100" y1="30" x2="135" y2="47" stroke="#999" strokeWidth="1.5" />

          {/* Upper left seams */}
          <line x1="65" y1="47" x2="20" y2="65" stroke="#999" strokeWidth="1.5" />
          <line x1="65" y1="47" x2="55" y2="82" stroke="#999" strokeWidth="1.5" />

          {/* Upper right seams */}
          <line x1="135" y1="47" x2="180" y2="65" stroke="#999" strokeWidth="1.5" />
          <line x1="135" y1="47" x2="145" y2="82" stroke="#999" strokeWidth="1.5" />

          {/* Middle seams */}
          <line x1="55" y1="82" x2="55" y2="120" stroke="#999" strokeWidth="1.5" />
          <line x1="145" y1="82" x2="145" y2="120" stroke="#999" strokeWidth="1.5" />
          <line x1="55" y1="82" x2="75" y2="100" stroke="#999" strokeWidth="1.5" />
          <line x1="145" y1="82" x2="125" y2="100" stroke="#999" strokeWidth="1.5" />
          <line x1="75" y1="100" x2="125" y2="100" stroke="#999" strokeWidth="1.5" />

          {/* Left side seams */}
          <line x1="20" y1="65" x2="8" y2="100" stroke="#999" strokeWidth="1.5" />
          <line x1="55" y1="120" x2="20" y2="135" stroke="#999" strokeWidth="1.5" />
          <line x1="8" y1="100" x2="20" y2="135" stroke="#999" strokeWidth="1.5" />

          {/* Right side seams */}
          <line x1="180" y1="65" x2="192" y2="100" stroke="#999" strokeWidth="1.5" />
          <line x1="145" y1="120" x2="180" y2="135" stroke="#999" strokeWidth="1.5" />
          <line x1="192" y1="100" x2="180" y2="135" stroke="#999" strokeWidth="1.5" />

          {/* Lower seams */}
          <line x1="55" y1="120" x2="75" y2="150" stroke="#999" strokeWidth="1.5" />
          <line x1="145" y1="120" x2="125" y2="150" stroke="#999" strokeWidth="1.5" />
          <line x1="75" y1="150" x2="80" y2="180" stroke="#999" strokeWidth="1.5" />
          <line x1="125" y1="150" x2="120" y2="180" stroke="#999" strokeWidth="1.5" />
          <line x1="75" y1="150" x2="125" y2="150" stroke="#999" strokeWidth="1.5" />
          <line x1="80" y1="180" x2="100" y2="196" stroke="#999" strokeWidth="1.5" />
          <line x1="120" y1="180" x2="100" y2="196" stroke="#999" strokeWidth="1.5" />
          <line x1="20" y1="135" x2="40" y2="170" stroke="#999" strokeWidth="1.5" />
          <line x1="180" y1="135" x2="160" y2="170" stroke="#999" strokeWidth="1.5" />
          <line x1="40" y1="170" x2="80" y2="180" stroke="#999" strokeWidth="1.5" />
          <line x1="160" y1="170" x2="120" y2="180" stroke="#999" strokeWidth="1.5" />

          {/* BLACK PENTAGONS — the signature soccer ball look */}
          {/* Center top pentagon */}
          <polygon
            points="100,30 65,47 55,82 75,100 125,100 145,82 135,47"
            fill="none"
          />
          <polygon
            points="100,30 80,42 72,68 100,80 128,68 120,42"
            fill="#1a1a1a"
            stroke="#111"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Left pentagon */}
          <polygon
            points="20,65 8,100 20,135 55,120 55,82"
            fill="none"
          />
          <polygon
            points="25,75 14,100 25,125 48,115 48,88"
            fill="#1a1a1a"
            stroke="#111"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Right pentagon */}
          <polygon
            points="180,65 192,100 180,135 145,120 145,82"
            fill="none"
          />
          <polygon
            points="175,75 186,100 175,125 152,115 152,88"
            fill="#1a1a1a"
            stroke="#111"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Bottom center pentagon */}
          <polygon
            points="75,150 125,150 120,180 100,196 80,180"
            fill="none"
          />
          <polygon
            points="82,153 118,153 114,175 100,188 86,175"
            fill="#1a1a1a"
            stroke="#111"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Bottom-left pentagon (partially visible) */}
          <polygon
            points="20,135 40,170 80,180 75,150 55,120"
            fill="none"
          />
          <polygon
            points="30,140 45,165 72,172 68,148 52,125"
            fill="#1a1a1a"
            stroke="#111"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Bottom-right pentagon (partially visible) */}
          <polygon
            points="180,135 160,170 120,180 125,150 145,120"
            fill="none"
          />
          <polygon
            points="170,140 155,165 128,172 132,148 148,125"
            fill="#1a1a1a"
            stroke="#111"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Glare / highlight for 3D effect */}
          <circle cx="100" cy="100" r="96" fill="url(#ballGlare)" />
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
          0%, 100% { transform: translateY(0) scale(1); }
          40% { transform: translateY(-40%) scale(1.05); }
          50% { transform: translateY(-42%) scale(1.05); }
          80% { transform: translateY(0) scale(0.97); }
          90% { transform: translateY(0) scale(1.01); }
        }
        @keyframes footballSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
