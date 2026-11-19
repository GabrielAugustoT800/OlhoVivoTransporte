import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeName, ThemeColors, themeMap } from './colors';

interface ThemeContextType {
  theme: ThemeName;
  colors: ThemeColors;
  setTheme: (name: ThemeName) => Promise<void>;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@app/theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('light');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTheme() {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme === 'light' || savedTheme === 'dark') {
          setThemeState(savedTheme);
        }
      } catch (e) {
        console.warn('Erro ao carregar tema', e);
      } finally {
        setLoading(false);
      }
    }
    loadTheme();
  }, []);

  const setTheme = async (name: ThemeName) => {
    setThemeState(name);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, name);
  };

  const colors = themeMap[theme];

  return (
    <ThemeContext.Provider value={{ theme, colors, setTheme, loading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
}