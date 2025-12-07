import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode, ThemeColor } from '@/types/scripture';
import { TACTICAL_THEME, GARRISON_THEME, JUNGLE_THEME, GRADIENTS } from '@/constants/colors';

const THEME_MODE_KEY = '@spiritammo_theme_mode';
const THEME_COLOR_KEY = '@spiritammo_theme_color';

export function useTheme() {
  const systemTheme = useColorScheme() || 'light';
  const [themeMode, setThemeMode] = useState<ThemeMode>('auto');
  const [themeColor, setThemeColor] = useState<ThemeColor>('slate');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Determine the actual brightness based on mode and system
  const actualBrightness = themeMode === 'auto' ? systemTheme : themeMode;
  const isDark = actualBrightness === 'dark';

  // Determine the active theme object
  const activeTheme = isDark
    ? (themeColor === 'jungle' ? JUNGLE_THEME : TACTICAL_THEME)
    : GARRISON_THEME; // Jungle light mode falls back to Garrison for now, or we could add JUNGLE_LIGHT later

  // Gradients need to be dynamic too
  const activeGradients = {
    ...GRADIENTS,
    primary: isDark
      ? (themeColor === 'jungle' ? GRADIENTS.jungle.background : GRADIENTS.primary.dark)
      : GRADIENTS.primary.light,
    tactical: isDark && themeColor === 'jungle'
      ? GRADIENTS.jungle
      : GRADIENTS.tactical
  };

  // Load theme settings from storage
  useEffect(() => {
    const loadThemeSettings = async () => {
      try {
        const [storedMode, storedColor] = await Promise.all([
          AsyncStorage.getItem(THEME_MODE_KEY),
          AsyncStorage.getItem(THEME_COLOR_KEY)
        ]);

        if (storedMode) setThemeMode(storedMode as ThemeMode);
        if (storedColor) setThemeColor(storedColor as ThemeColor);
      } catch (error) {
        console.error('Failed to load theme settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadThemeSettings();
  }, []);

  // Save mode
  const setTheme = async (newMode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_MODE_KEY, newMode);
      setThemeMode(newMode);
    } catch (error) {
      console.error('Failed to save theme mode:', error);
    }
  };

  // Save color
  const setThemeColorAction = async (newColor: ThemeColor) => {
    try {
      await AsyncStorage.setItem(THEME_COLOR_KEY, newColor);
      setThemeColor(newColor);
    } catch (error) {
      console.error('Failed to save theme color:', error);
    }
  };

  const toggleTheme = async () => {
    const newMode = actualBrightness === 'dark' ? 'light' : 'dark';
    await setTheme(newMode);
  };

  return {
    themeMode,
    themeColor,
    isDark,
    isLight: !isDark,
    theme: activeTheme,
    gradients: activeGradients,
    setTheme,
    setThemeColor: setThemeColorAction,
    toggleTheme,
    isLoading,
  };
}