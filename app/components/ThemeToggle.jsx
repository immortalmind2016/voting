'use client';

import { useEffect, useState } from 'react';

// Light is the default; the choice is remembered in localStorage. An inline
// script in the layout applies the stored theme before paint to avoid a flash.
export default function ThemeToggle() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const stored =
      document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(stored);
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch {}
  }

  return (
    <button
      className="ghost small theme-toggle"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
    </button>
  );
}
