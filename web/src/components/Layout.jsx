import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import FloatingChatButton from './FloatingChatButton';
import NotificationSetupModal from './NotificationSetupModal';
import {
  wasModalShown,
  shouldShowReminder,
  updateActivity,
} from '../services/notificationStore';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [isReminderModal, setIsReminderModal] = useState(false);

  // Update activity on each page visit
  useEffect(() => {
    updateActivity();
  }, [location.pathname]);

  // Check if should show notification modal
  useEffect(() => {
    // Delay to allow page to load first
    const timer = setTimeout(() => {
      // First visit - show intro modal after 3 seconds
      if (!wasModalShown()) {
        setIsReminderModal(false);
        setShowNotificationModal(true);
        return;
      }

      // Check for reminder (every 3 days if not set up)
      if (shouldShowReminder()) {
        setIsReminderModal(true);
        setShowNotificationModal(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Listen for notification clicks from service worker
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'NOTIFICATION_CLICK' && event.data?.url) {
        navigate(event.data.url);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [navigate]);

  return (
    <div className="h-screen flex flex-col bg-[#F0F2F5]">
      <div className="flex-1 min-h-0 overflow-y-auto pb-20">
        <Outlet />
      </div>
      <FloatingChatButton />
      <BottomNav />

      {/* Notification Setup Modal */}
      <NotificationSetupModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        isReminder={isReminderModal}
      />
    </div>
  );
}
