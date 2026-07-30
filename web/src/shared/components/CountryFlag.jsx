/**
 * Country flags drawn as SVG.
 *
 * Flag emoji are not usable here: Windows ships no glyphs for regional
 * indicator pairs, so 🇧🇷 renders as the bare letters "BR" — which is exactly
 * how the Brazilian signup screen looked on a desktop screenshot. Drawing the
 * flags ourselves makes them identical on every platform.
 *
 * These are deliberately simplified — they are shown at ~18×13 px, where fine
 * heraldry is invisible anyway. The aim is instant recognition at that size,
 * not accuracy at poster scale.
 */

const FLAGS = {
  BR: (
    <>
      <rect width="28" height="20" fill="#009C3B" />
      <polygon points="14,2.4 25.4,10 14,17.6 2.6,10" fill="#FFDF00" />
      <circle cx="14" cy="10" r="4.3" fill="#002776" />
    </>
  ),
  US: (
    <>
      <rect width="28" height="20" fill="#fff" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} y={i * 3.08} width="28" height="1.54" fill="#B22234" />
      ))}
      <rect width="12" height="10.8" fill="#3C3B6E" />
      {[[3, 2.5], [7, 2.5], [5, 5.4], [3, 8.3], [7, 8.3], [9, 5.4]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="0.7" fill="#fff" />
      ))}
    </>
  ),
  GB: (
    <>
      <rect width="28" height="20" fill="#012169" />
      <path d="M0,0 L28,20 M28,0 L0,20" stroke="#fff" strokeWidth="4" />
      <path d="M0,0 L28,20 M28,0 L0,20" stroke="#C8102E" strokeWidth="2" />
      <path d="M14,0 V20 M0,10 H28" stroke="#fff" strokeWidth="6" />
      <path d="M14,0 V20 M0,10 H28" stroke="#C8102E" strokeWidth="3.4" />
    </>
  ),
  DE: (
    <>
      <rect width="28" height="6.67" fill="#000" />
      <rect y="6.67" width="28" height="6.67" fill="#DD0000" />
      <rect y="13.34" width="28" height="6.66" fill="#FFCE00" />
    </>
  ),
  FR: (
    <>
      <rect width="9.33" height="20" fill="#002395" />
      <rect x="9.33" width="9.34" height="20" fill="#fff" />
      <rect x="18.67" width="9.33" height="20" fill="#ED2939" />
    </>
  ),
  IT: (
    <>
      <rect width="9.33" height="20" fill="#008C45" />
      <rect x="9.33" width="9.34" height="20" fill="#fff" />
      <rect x="18.67" width="9.33" height="20" fill="#CD212A" />
    </>
  ),
  ES: (
    <>
      <rect width="28" height="20" fill="#AA151B" />
      <rect y="5" width="28" height="10" fill="#F1BF00" />
    </>
  ),
  PT: (
    <>
      <rect width="28" height="20" fill="#DA291C" />
      <rect width="11.2" height="20" fill="#046A38" />
      <circle cx="11.2" cy="10" r="4" fill="#FFE900" />
      <circle cx="11.2" cy="10" r="2.4" fill="#DA291C" />
    </>
  ),
  PL: (
    <>
      <rect width="28" height="10" fill="#fff" />
      <rect y="10" width="28" height="10" fill="#DC143C" />
    </>
  ),
  CZ: (
    <>
      <rect width="28" height="10" fill="#fff" />
      <rect y="10" width="28" height="10" fill="#D7141A" />
      <polygon points="0,0 14,10 0,20" fill="#11457E" />
    </>
  ),
  TR: (
    <>
      <rect width="28" height="20" fill="#E30A17" />
      <circle cx="11" cy="10" r="5" fill="#fff" />
      <circle cx="12.6" cy="10" r="4" fill="#E30A17" />
      <polygon points="17.6,10 15.2,10.8 16.7,8.7 16.7,11.3 15.2,9.2" fill="#fff" />
    </>
  ),
  IL: (
    <>
      <rect width="28" height="20" fill="#fff" />
      <rect y="2.4" width="28" height="2.4" fill="#0038B8" />
      <rect y="15.2" width="28" height="2.4" fill="#0038B8" />
      <polygon points="14,6 17.2,11.6 10.8,11.6" fill="none" stroke="#0038B8" strokeWidth="1" />
      <polygon points="14,14 10.8,8.4 17.2,8.4" fill="none" stroke="#0038B8" strokeWidth="1" />
    </>
  ),
  AE: (
    <>
      <rect width="28" height="6.67" x="7" fill="#00732F" />
      <rect y="6.67" x="7" width="28" height="6.67" fill="#fff" />
      <rect y="13.34" x="7" width="28" height="6.66" fill="#000" />
      <rect width="7" height="20" fill="#FF0000" />
    </>
  ),
};

export default function CountryFlag({ code, size = 18, className = '' }) {
  const shape = FLAGS[code];

  // Unknown country — a neutral chip with the ISO code still tells the user
  // where they are, which beats an empty gap.
  if (!shape) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-[2px] bg-gray-200 text-gray-600 font-bold ${className}`}
        style={{ width: size, height: size * 0.72, fontSize: size * 0.45 }}
      >
        {code}
      </span>
    );
  }

  return (
    <svg
      className={`flex-shrink-0 ${className}`}
      width={size}
      height={size * 0.72}
      viewBox="0 0 28 20"
      role="img"
      aria-label={code}
    >
      {/* Rounded corners + a hairline edge so pale flags don't bleed into white */}
      <defs>
        <clipPath id={`flag-clip-${code}`}>
          <rect width="28" height="20" rx="2.5" />
        </clipPath>
      </defs>
      <g clipPath={`url(#flag-clip-${code})`}>{shape}</g>
      <rect width="28" height="20" rx="2.5" fill="none" stroke="rgba(0,0,0,.15)" strokeWidth="1" />
    </svg>
  );
}
