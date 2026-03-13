'use client';

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Moon, Sun } from 'lucide-react';

export function DarkModeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all flex items-center justify-center relative overflow-hidden group"
      title={resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {/* Sun Icon (visible in dark mode, rotates out) */}
        <Sun 
          className={`absolute h-5 w-5 transition-all duration-300 ease-in-out ${
            resolvedTheme === 'dark' 
              ? 'scale-100 rotate-0 opacity-100 text-yellow-500' 
              : 'scale-50 rotate-90 opacity-0 text-yellow-500'
          }`} 
        />
        
        {/* Moon Icon (visible in light mode, rotates out) */}
        <Moon 
          className={`absolute h-5 w-5 transition-all duration-300 ease-in-out ${
            resolvedTheme === 'light' 
              ? 'scale-100 rotate-0 opacity-100 text-slate-700' 
              : 'scale-50 -rotate-90 opacity-0 text-slate-700'
          }`} 
        />
      </div>
    </button>
  );
}
