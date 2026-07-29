/**
 * Receipt carousel — screenshots of settled winning bets, shown as social proof.
 *
 * Images live in `web/public/receipts/`. To add one: drop the file there and add
 * its filename to RECEIPTS below. Nothing else to change.
 *
 * Placement follows the 28.07 call: directly under the AI Express block, above
 * the stats.
 *
 * Who sees them: the test funnel everywhere, plus everyone in a launch geo that
 * runs without an A/B split (Brazil) — see showsReceipts(). Portugal's baseline
 * funnel stays untouched so its A/B keeps measuring what it should.
 */
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../features/auth/context/AuthContext';
import { useAdvertiser } from '../../context/AdvertiserContext';
import { showsReceipts } from '../../config/funnels';
import { getTrackingLink } from '../../../features/betting/services/trackingService';
import { track } from '../../services/analytics';

// Files in web/public/receipts/ — add new screenshots here.
const RECEIPTS = [
  'receipt-01.jpg',
  'receipt-02.jpg',
  'receipt-03.jpg',
];

export default function ReceiptSlider() {
  const { user } = useAuth();
  const { trackClick, countryCode } = useAdvertiser();
  const [slide, setSlide] = useState(0);
  const [broken, setBroken] = useState(() => new Set());
  const trackRef = useRef(null);

  // Test funnel everywhere, plus every visitor in a launch geo without an
  // A/B split (Brazil) — otherwise the receipts would never show there.
  const enabled = showsReceipts(user, countryCode);
  // A missing file must not leave a blank gap on the home screen.
  const items = RECEIPTS.filter((f) => !broken.has(f));

  useEffect(() => {
    if (!enabled || items.length < 2) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % items.length), 5000);
    return () => clearInterval(id);
  }, [enabled, items.length]);

  useEffect(() => {
    const el = trackRef.current;
    if (el) el.scrollTo({ left: slide * el.clientWidth, behavior: 'smooth' });
  }, [slide]);

  if (!enabled || !items.length) return null;

  const openBookmaker = () => {
    track('receipt_click', {});
    trackClick?.(user?.id, 'receipt');
    const href = getTrackingLink(user?.id, 'receipt', user?.funnel);
    if (href) window.open(href, '_blank', 'noopener');
  };

  return (
    <div>
      {/* The track must be width-constrained, otherwise each slide's `w-full`
          resolves against the growing flex content instead of the viewport and
          the screenshots blow far past the screen edge. */}
      <div
        ref={trackRef}
        className="flex w-full max-w-full overflow-x-auto snap-x snap-mandatory scrollbar-none"
        style={{ scrollbarWidth: 'none' }}
      >
        {items.map((file) => (
          <div key={file} className="snap-center flex-none w-full min-w-full">
            <img
              src={`/receipts/${file}`}
              alt=""
              loading="lazy"
              onClick={openBookmaker}
              onError={() => setBroken((prev) => new Set(prev).add(file))}
              className="w-full h-auto block rounded-2xl cursor-pointer active:scale-[0.99] transition-transform"
            />
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2.5">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              aria-label={`${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === slide ? 'w-5 bg-blue-600' : 'w-1.5 bg-gray-300 dark:bg-slate-600'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
