
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const BottomNav: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '任务', icon: 'check_circle' },
    { path: '/statistics', label: '统计', icon: 'bar_chart' },
    { path: '/new-task', label: '目标', icon: 'add', isCenter: true },
    { path: '/focus', label: '专注', icon: 'timer' }, // Placeholder for 'timer' view
    { path: '/settings', label: '我的', icon: 'person' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-6 pb-8 pt-4 z-50 max-w-[430px] mx-auto">
      <div className="flex justify-between items-center relative">
        {navItems.map((item) => {
          if (item.isCenter) {
            return (
              <div key={item.path} className="absolute left-1/2 -translate-x-1/2 -top-12">
                <Link
                  to={item.path}
                  className="bg-primary text-background-dark size-14 rounded-full flex items-center justify-center shadow-lg shadow-primary/40 active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-[32px] font-bold">add</span>
                </Link>
              </div>
            );
          }

          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 transition-colors ${
                isActive ? 'text-primary' : 'text-slate-400 dark:text-slate-600'
              }`}
            >
              <span 
                className={`material-symbols-outlined text-[24px] ${isActive ? 'filled-icon' : ''}`}
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <p className="text-[10px] font-bold tracking-wider">{item.label}</p>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
