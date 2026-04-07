import useZustandStore from './zustandStore'
import { ThemeMode, ThemeColor } from '@/types/scripture'

export function useTheme() {
  const themeMode = useZustandStore((s) => s.themeMode)
  const themeColor = useZustandStore((s) => s.themeColor)
  const isDark = useZustandStore((s) => s.isDark)
  const theme = useZustandStore((s) => s.theme)
  const gradients = useZustandStore((s) => s.gradients)
  const setTheme = useZustandStore((s) => s.setTheme)
  const setThemeColor = useZustandStore((s) => s.setThemeColor)
  const toggleTheme = useZustandStore((s) => s.toggleTheme)

  return {
    themeMode,
    themeColor,
    isDark,
    isLight: !isDark,
    theme,
    gradients,
    setTheme,
    setThemeColor,
    toggleTheme,
  }
}
