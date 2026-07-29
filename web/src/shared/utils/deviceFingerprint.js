/**
 * Device fingerprint — a short, stable hash of this browser/device.
 *
 * Purpose: tell one PERSON apart from one NETWORK. Mobile carriers (Brazil in
 * particular) put hundreds of real subscribers behind a single CGNAT address, so
 * an IP alone cannot say whether two signups are the same human. A device
 * profile can.
 *
 * It is used to withhold the free PRO trial from repeat signups, never to block
 * registration: fingerprints do collide (same phone model, fresh OS, default
 * settings), and a blocked real lead costs far more than a farmer who gets three
 * free predictions.
 *
 * No third-party library, no tracking beacons — only values the page can read
 * about itself.
 */

/** Canvas rendering differs subtly per GPU/driver/font stack. */
function canvasSignature() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.textBaseline = 'top';
    ctx.font = '14px "Arial"';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('fp-probe-✓éñ', 2, 15);
    ctx.fillStyle = 'rgba(102,204,0,0.7)';
    ctx.fillText('fp-probe-✓éñ', 4, 17);
    return canvas.toDataURL().slice(-96);
  } catch {
    return '';
  }
}

/** GPU vendor/renderer — stable per device, empty when WebGL is unavailable. */
function webglSignature() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return '';
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (!dbg) return String(gl.getParameter(gl.VERSION) || '');
    return [
      gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL),
      gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL),
    ].join('~');
  } catch {
    return '';
  }
}

/** Which of a probe list of fonts are actually installed. */
function fontSignature() {
  try {
    const probes = ['Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia',
                    'Tahoma', 'Trebuchet MS', 'Impact', 'Comic Sans MS'];
    const base = ['monospace', 'sans-serif', 'serif'];
    const span = document.createElement('span');
    span.style.cssText = 'position:absolute;left:-9999px;font-size:72px';
    span.textContent = 'mmmmmmmmmmlli';
    document.body.appendChild(span);

    const baseline = {};
    for (const b of base) {
      span.style.fontFamily = b;
      baseline[b] = [span.offsetWidth, span.offsetHeight].join('x');
    }
    const present = probes.filter((f) =>
      base.some((b) => {
        span.style.fontFamily = `"${f}",${b}`;
        return [span.offsetWidth, span.offsetHeight].join('x') !== baseline[b];
      })
    );
    document.body.removeChild(span);
    return present.join(',');
  } catch {
    return '';
  }
}

/** FNV-1a — short, fast, no crypto dependency. Collisions are acceptable here. */
function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/**
 * Stable id for this device. Cached in localStorage so it stays identical
 * across visits even if a probe (canvas, fonts) behaves differently later.
 */
export function getDeviceFingerprint() {
  const CACHE_KEY = 'device_fp';
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) return cached;
  } catch {
    // private mode — fall through and compute a non-persisted value
  }

  const parts = [
    navigator.userAgent || '',
    navigator.platform || '',
    navigator.hardwareConcurrency || '',
    navigator.deviceMemory || '',
    navigator.maxTouchPoints || '',
    (navigator.languages || []).join(','),
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    String(window.devicePixelRatio || ''),
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    new Date().getTimezoneOffset(),
    canvasSignature(),
    webglSignature(),
    fontSignature(),
  ];

  // Two hashes over the same input give ~64 bits of space — enough to keep
  // accidental collisions rare without shipping a hashing library.
  const raw = parts.join('|');
  const fp = hash(raw) + hash(raw.split('').reverse().join(''));

  try {
    localStorage.setItem(CACHE_KEY, fp);
  } catch {}
  return fp;
}

export default getDeviceFingerprint;
