import { useState, useCallback, useEffect } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('teraplay-theme') as 'dark' | 'light') || 'dark';
    }
    return 'dark';
  });

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem('teraplay-theme', next);
        const root = document.documentElement;
        root.classList.toggle('dark', next === 'dark');
        root.classList.toggle('light', next === 'light');
        const meta = document.getElementById('meta-theme-color');
        if (meta) {
          meta.setAttribute('content', next === 'light' ? '#1253a8' : '#060b18');
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      root.classList.toggle('dark', theme === 'dark');
      root.classList.toggle('light', theme === 'light');
    }
  }, [theme]);

  return { theme, toggleTheme };
}
