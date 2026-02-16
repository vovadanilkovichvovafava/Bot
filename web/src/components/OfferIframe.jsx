import { useState } from 'react';

/**
 * Fullscreen iframe overlay to show bookmaker PWA install page
 * directly inside our PWA. Used in standalone mode where we can't
 * open system browser reliably.
 */
export default function OfferIframe({ url, isOpen, onClose }) {
  const [loading, setLoading] = useState(true);

  if (!isOpen || !url) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col">
      {/* Top bar with close button */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-white safe-area-top">
        <span className="text-xs text-gray-400 truncate flex-1 mr-3">{url}</span>
        <button
          onClick={onClose}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white text-lg font-bold"
        >
          &times;
        </button>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-10 mt-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-500">Loading...</span>
          </div>
        </div>
      )}

      {/* Iframe */}
      <iframe
        src={url}
        className="flex-1 w-full border-none"
        onLoad={() => setLoading(false)}
        allow="web-share"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-downloads allow-top-navigation"
        title="Bookmaker Install"
      />
    </div>
  );
}
