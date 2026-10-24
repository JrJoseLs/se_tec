import { useCallback, useEffect, useState } from 'react';

const KEY = 'seshat-tema';
const read = () => document.documentElement.getAttribute('data-theme') || 'claro';

export function useTheme() {
  const [theme, setTheme] = useState(read);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'oscuro' ? '#12161f' : '#1e3a6e');
  }, [theme]);
  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === 'oscuro' ? 'claro' : 'oscuro';
      try {
        localStorage.setItem(KEY, next);
      } catch {}
      return next;
    });
  }, []);
  return [theme, toggle];
}
