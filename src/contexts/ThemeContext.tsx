import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type ThemeMode = 'light' | 'dark' | 'retro' | 'upside_down' | 'saturday_cartoons' | 'blue_crystal' | 'neo_y2k' | 'polaroid_grey';

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
    document.documentElement.classList.remove('light', 'dark', 'retro', 'upside_down', 'saturday_cartoons', 'blue_crystal', 'neo_y2k', 'polaroid_grey');
    document.documentElement.classList.add(newTheme);
    
    // Handle body classes for overlay effects
    document.body.classList.remove('upside-down-overlay', 'cartoons-bg', 'blue-crystal-overlay', 'neo-y2k-overlay');
    if (newTheme === 'upside_down') {
      document.body.classList.add('upside-down-overlay');
    } else if (newTheme === 'saturday_cartoons') {
      document.body.classList.add('cartoons-bg');
    } else if (newTheme === 'blue_crystal') {
      document.body.classList.add('blue-crystal-overlay');
    } else if (newTheme === 'neo_y2k') {
      document.body.classList.add('neo-y2k-overlay');
    }
  };

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark', 'retro', 'upside_down', 'saturday_cartoons', 'blue_crystal', 'neo_y2k', 'polaroid_grey');
    document.documentElement.classList.add(theme);
    
    // Handle body classes for overlay effects
    document.body.classList.remove('upside-down-overlay', 'cartoons-bg', 'blue-crystal-overlay', 'neo-y2k-overlay');
    if (theme === 'upside_down') {
      document.body.classList.add('upside-down-overlay');
    } else if (theme === 'saturday_cartoons') {
      document.body.classList.add('cartoons-bg');
    } else if (theme === 'blue_crystal') {
      document.body.classList.add('blue-crystal-overlay');
    } else if (theme === 'neo_y2k') {
      document.body.classList.add('neo-y2k-overlay');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
