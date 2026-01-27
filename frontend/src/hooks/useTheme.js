import { useEffect, useState } from 'react';

/**
 * Get initial theme from localStorage or system preference
 */
export function getInitialTheme() {
  try {
    const saved = localStorage.getItem('notePulse_theme');
    if (saved && (saved === 'light' || saved === 'dark')) {
      return saved;
    }
  } catch (e) {
    console.warn('Could not access localStorage for theme');
  }
  
  // Check system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  
  return 'dark'; // default
}

/**
 * React hook for theme management
 * @returns {{theme: string, setTheme: function, toggleTheme: function}}
 */
export default function useTheme() {
  const [theme, setThemeState] = useState(getInitialTheme);

  useEffect(() => {
    // Apply theme to document root
    document.documentElement.dataset.theme = theme;
    
    // Persist to localStorage
    try {
      localStorage.setItem('notePulse_theme', theme);
    } catch (e) {
      console.warn('Could not save theme to localStorage');
    }
  }, [theme]);

  const setTheme = (newTheme) => {
    if (newTheme === 'light' || newTheme === 'dark') {
      setThemeState(newTheme);
    }
  };

  const toggleTheme = () => {
    setThemeState((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  return { theme, setTheme, toggleTheme };
}
