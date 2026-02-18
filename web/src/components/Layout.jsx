import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import FloatingChatButton from './FloatingChatButton';

export default function Layout() {
  const location = useLocation();
  const isChat = location.pathname === '/ai-chat';

  return (
    <div className="h-screen flex flex-col bg-[#F0F2F5]">
      <div className={`flex-1 min-h-0 ${isChat ? 'overflow-hidden' : 'overflow-y-auto pb-20'}`}>
        <Outlet />
      </div>
      <BottomNav />
      {/* Hide on AI Chat page to avoid overlapping send button */}
      {!isChat && <FloatingChatButton />}
    </div>
  );
}
