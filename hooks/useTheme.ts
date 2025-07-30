import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode } from '@/types/scripture';

const THEME_STORAGE_KEY = '@spiritammo_theme';

export function useTheme() {
  const systemTheme = useColorScheme() || 'light';
  const [themeMode, setThemeMode] = useState<ThemeMode>('auto');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Determine the actual theme based on mode and system
  const actualTheme = themeMode === 'auto' ? systemTheme : themeMode;

  // Load theme from storage
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (storedTheme) {
          setThemeMode(storedTheme as ThemeMode);
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, []);

  // Save theme to storage
  const setTheme = async (newTheme: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      setThemeMode(newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = actualTheme === 'dark' ? 'light' : 'dark';
    await setTheme(newTheme);
  };

  return {
    themeMode,
    isDark: actualTheme === 'dark',
    isLight: actualTheme === 'light',
    setTheme,
    toggleTheme,
    isLoading,
  };
}