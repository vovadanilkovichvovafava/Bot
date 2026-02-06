import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import FloatingChatButton from './FloatingChatButton';

export default function Layout() {
  return (
    <div className="h-screen flex flex-col bg-[#F0F2F5]">
      <div className="flex-1 min-h-0 overflow-y-auto pb-20">
        <Outlet />
      </div>
      <FloatingChatButton />
      <BottomNav />
    </div>
  );
}
