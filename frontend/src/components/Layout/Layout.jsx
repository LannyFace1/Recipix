// src/components/Layout/Layout.jsx

import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-brand-50 dark:bg-gray-950">
      {/* Sidebar — only on desktop */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main content — padding-bottom on mobile for bottom nav */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Bottom nav — only on mobile */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
