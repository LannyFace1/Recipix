// src/components/Layout/BottomNav.jsx — Mobile bottom navigation

import { NavLink } from 'react-router-dom';
import { BookOpen, CalendarDays, ShoppingCart, Settings } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { to: '/recipes',      icon: BookOpen,     label: 'Recipes'  },
  { to: '/meal-planner', icon: CalendarDays, label: 'Planner'  },
  { to: '/shopping',     icon: ShoppingCart, label: 'Shopping' },
  { to: '/settings',     icon: Settings,     label: 'Settings' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 
                    border-t border-gray-100 dark:border-gray-800 
                    flex items-stretch shadow-lg
                    safe-area-inset-bottom">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => clsx(
            'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors',
            isActive
              ? 'text-brand-500'
              : 'text-gray-400 dark:text-gray-500'
          )}
        >
          {({ isActive }) => (
            <>
              <Icon className={clsx('w-6 h-6', isActive && 'stroke-[2.5px]')} />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
