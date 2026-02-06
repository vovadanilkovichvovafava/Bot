import { useState, useEffect } from 'react';
import SupportChat from './SupportChat';

export default function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [showPulse, setShowPulse] = useState(true);

  // Stop pulsing after first open
  useEffect(() => {
    if (isOpen) {
      setShowPulse(false);
      setHasUnread(false);
    }
  }, [isOpen]);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform"
        style={{ boxShadow: '0 4px 20px rgba(79, 70, 229, 0.4)' }}
      >
        {/* Pulse animation */}
        {showPulse && (
          <>
            <span className="absolute inset-0 rounded-full bg-primary-500 animate-ping opacity-40"/>
            <span className="absolute inset-0 rounded-full bg-primary-500 animate-ping opacity-20" style={{ animationDelay: '0.5s' }}/>
          </>
        )}

        {/* Chat icon */}
        <svg className="w-7 h-7 relative z-10" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
          <circle cx="12" cy="10" r="1.5"/>
          <circle cx="8" cy="10" r="1.5"/>
          <circle cx="16" cy="10" r="1.5"/>
        </svg>

        {/* Unread badge */}
        {hasUnread && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            1
          </span>
        )}
      </button>

      {/* Chat Modal */}
      <SupportChat isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

// Hook to open support chat from anywhere
let openChatCallback = null;

export function useSupportChat() {
  return {
    openChat: (message = '') => {
      if (openChatCallback) openChatCallback(message);
    }
  };
}

export function SupportChatProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialMessage, setInitialMessage] = useState('');

  useEffect(() => {
    openChatCallback = (message) => {
      setInitialMessage(message);
      setIsOpen(true);
    };
    return () => { openChatCallback = null; };
  }, []);

  return (
    <>
      {children}
      <SupportChat
        isOpen={isOpen}
        onClose={() => { setIsOpen(false); setInitialMessage(''); }}
        initialMessage={initialMessage}
      />
    </>
  );
}
