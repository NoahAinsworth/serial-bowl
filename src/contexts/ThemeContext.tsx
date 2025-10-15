import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type ThemeMode = 'light' | 'dark' | 'upside_down' | 'the_one_with_the_theme' | 'green_wireframe' | 'stars_hollow' | 'donut_mode';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeMode>('light');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as ThemeMode;
    if (stored) {
      setThemeState(stored);
    }
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Remove all theme classes
    document.documentElement.classList.remove('light', 'dark', 'upside_down', 'the_one_with_the_theme', 'green_wireframe', 'stars_hollow', 'donut_mode');
    document.documentElement.classList.add(newTheme);
    
    // Handle body classes for overlay effects
    document.body.classList.remove('upside-down-overlay');
    if (newTheme === 'upside_down') {
      document.body.classList.add('upside-down-overlay');
    }
  };

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark', 'upside_down', 'the_one_with_the_theme', 'green_wireframe', 'stars_hollow', 'donut_mode');
    document.documentElement.classList.add(theme);
    
    // Handle body classes for overlay effects
    document.body.classList.remove('upside-down-overlay');
    if (theme === 'upside_down') {
      document.body.classList.add('upside-down-overlay');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
