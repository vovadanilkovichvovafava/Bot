import { useEffect, useRef, useState, useCallback } from 'react';
import FootballSpinner from './FootballSpinner';

// 1Win Geetest v4 captcha ID
const GEETEST_CAPTCHA_ID = 'c8abe6dfba763d691007f7b470f73b9e';

/**
 * Geetest v4 Captcha Hook
 * @param {string} captchaId - Optional custom captcha ID
 * @returns {object} { ready, verify, reset }
 */
export function useGeetest(captchaId = GEETEST_CAPTCHA_ID) {
  const captchaRef = useRef(null);
  const captchaIdRef = useRef(captchaId);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // If SDK already loaded, initialize
    if (typeof window.initGeetest4 === 'function') {
      initCaptcha();
      return;
    }

    // Load Geetest v4 SDK
    const script = document.createElement('script');
    script.src = 'https://static.geetest.com/v4/gt4.js';
    script.async = true;
    script.onload = () => initCaptcha();
    script.onerror = () => {
      console.warn('[GeeTest] Failed to load SDK - captcha will be skipped');
      setReady(true); // Allow login without captcha
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (captchaRef.current) {
        try {
          captchaRef.current.destroy?.();
        } catch (e) {}
      }
    };
  }, []);

  function initCaptcha() {
    const id = captchaIdRef.current;
    if (!id || typeof window.initGeetest4 !== 'function') {
      setReady(true);
      return;
    }

    try {
      window.initGeetest4({
        captchaId: id,
        product: 'bind', // Invisible captcha, triggered programmatically
        language: 'eng',
      }, (captcha) => {
        captchaRef.current = captcha;
        setReady(true);
      });
    } catch (e) {
      console.error('[GeeTest] Init error:', e);
      setReady(true);
    }
  }

  // Verify captcha - returns promise with response or null
  const verify = useCallback(() => {
    return new Promise((resolve) => {
      if (!captchaRef.current) {
        resolve(null);
        return;
      }

      captchaRef.current.onSuccess(() => {
        const result = captchaRef.current.getValidate();
        if (result) {
          resolve({
            lot_number: result.lot_number,
            captcha_output: result.captcha_output,
            pass_token: result.pass_token,
            gen_time: result.gen_time,
          });
        } else {
          resolve(null);
        }
      });

      captchaRef.current.onError(() => {
        resolve(null);
      });

      captchaRef.current.onClose(() => {
        resolve(null);
      });

      // Show captcha
      captchaRef.current.showCaptcha();
    });
  }, []);

  // Reset captcha
  const reset = useCallback(() => {
    if (captchaRef.current) {
      captchaRef.current.reset?.();
    }
  }, []);

  return { ready, verify, reset };
}

/**
 * Geetest Captcha Button Component
 * Shows a button that triggers captcha verification
 */
export default function GeetestCaptcha({
  onVerify,
  children = 'Verify',
  className = '',
  disabled = false,
}) {
  const { ready, verify } = useGeetest();
  const [verifying, setVerifying] = useState(false);

  const handleClick = async () => {
    if (!ready || verifying || disabled) return;

    setVerifying(true);
    try {
      const result = await verify();
      onVerify?.(result);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!ready || verifying || disabled}
      className={className}
    >
      {verifying ? (
        <div className="flex items-center justify-center gap-2">
          <FootballSpinner size="xs" />
          Verifying...
        </div>
      ) : children}
    </button>
  );
}

export { GEETEST_CAPTCHA_ID };
