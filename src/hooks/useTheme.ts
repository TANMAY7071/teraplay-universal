import { useState, useEffect } from 'react';


export type AccentTheme = 'purple' | 'blue' | 'crimson' | 'emerald' | 'amoled';

export const accentThemes: { id: AccentTheme; name: string; primary: string; accent: string; background: string }[] = [
  { id: 'purple', name: 'Cosmic Purple', primary: '280 100% 70%', accent: '191 100% 50%', background: '225 32% 4%' },
  { id: 'blue', name: 'Cyber Blue', primary: '217 91% 60%', accent: '185 100% 50%', background: '222 47% 4%' },
  { id: 'crimson', name: 'Crimson', primary: '346 84% 61%', accent: '24 95% 53%', background: '355 50% 3%' },
  { id: 'emerald', name: 'Emerald', primary: '142 70% 50%', accent: '60 80% 50%', background: '142 40% 3%' },
  { id: 'amoled', name: 'AMOLED Black', primary: '280 100% 70%', accent: '191 100% 50%', background: '0 0% 0%' },
];

export function useTheme() {
  const [accentTheme, setAccentTheme] = useState<AccentTheme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('donghua-accent-theme') as AccentTheme;
      return saved || 'purple';
    }
    return 'purple';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Always force dark class
    root.classList.remove('light');
    root.classList.add('dark');

    const themes = {
      purple: {
        '--primary': '280 100% 70%',
        '--accent': '191 100% 50%',
        '--background': '225 32% 4%',
        '--card': '224 28% 7%',
        '--popover': '224 28% 7%',
        '--ring': '280 100% 70%',
      },
      blue: {
        '--primary': '217 91% 60%',
        '--accent': '185 100% 50%',
        '--background': '222 47% 4%',
        '--card': '222 47% 8%',
        '--popover': '222 47% 8%',
        '--ring': '217 91% 60%',
      },
      crimson: {
        '--primary': '346 84% 61%',
        '--accent': '24 95% 53%',
        '--background': '355 50% 3%',
        '--card': '355 50% 6%',
        '--popover': '355 50% 6%',
        '--ring': '346 84% 61%',
      },
      emerald: {
        '--primary': '142 70% 50%',
        '--accent': '60 80% 50%',
        '--background': '142 40% 3%',
        '--card': '142 40% 6%',
        '--popover': '142 40% 6%',
        '--ring': '142 70% 50%',
      },
      amoled: {
        '--primary': '280 100% 70%',
        '--accent': '191 100% 50%',
        '--background': '0 0% 0%',
        '--card': '0 0% 4%',
        '--popover': '0 0% 4%',
        '--ring': '280 100% 70%',
      },
    };

    const currentVars = themes[accentTheme] || themes.purple;
    Object.entries(currentVars).forEach(([key, val]) => {
      root.style.setProperty(key, val);
    });

    localStorage.setItem('donghua-accent-theme', accentTheme);
  }, [accentTheme]);

  return { 
    theme: 'dark' as const, 
    accentTheme, 
    setAccentTheme 
  };
}