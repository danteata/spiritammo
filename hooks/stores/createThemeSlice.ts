import AsyncStorage from '@react-native-async-storage/async-storage'
import { StateCreator } from 'zustand'
import { Appearance } from 'react-native'
import { ThemeMode, ThemeColor } from '@/types/scripture'
import { TACTICAL_THEME, GARRISON_THEME, JUNGLE_THEME, SLATE_THEME, GRADIENTS } from '@/constants/colors'

const THEME_MODE_KEY = '@spiritammo_theme_mode'
const THEME_COLOR_KEY = '@spiritammo_theme_color'

function getSystemTheme() {
    return Appearance.getColorScheme() || 'light'
}

function computeTheme(mode: ThemeMode, color: ThemeColor) {
    const systemTheme = getSystemTheme()
    const isDark = (mode === 'auto' ? systemTheme : mode) === 'dark'

    const activeTheme = isDark
        ? (color === 'jungle' ? JUNGLE_THEME : color === 'slate' ? SLATE_THEME : TACTICAL_THEME)
        : GARRISON_THEME

    const activeGradients = {
        ...GRADIENTS,
        primary: isDark
            ? (color === 'jungle' ? GRADIENTS.jungle.background : color === 'slate' ? GRADIENTS.slate.background : GRADIENTS.primary.dark)
            : GRADIENTS.primary.light,
        tactical: isDark && color === 'jungle'
            ? GRADIENTS.jungle
            : isDark && color === 'slate'
                ? GRADIENTS.slate
                : GRADIENTS.tactical
    }

    return { isDark, theme: activeTheme, gradients: activeGradients as any }
}

export interface ThemeSlice {
    themeMode: ThemeMode
    themeColor: ThemeColor
    isDark: boolean
    theme: typeof TACTICAL_THEME
    gradients: typeof GRADIENTS
    setTheme: (mode: ThemeMode) => Promise<void>
    setThemeColor: (color: ThemeColor) => Promise<void>
    toggleTheme: () => Promise<void>
    initializeTheme: () => Promise<void>
}

export const createThemeSlice: StateCreator<ThemeSlice, [], [], ThemeSlice> = (set, get) => ({
    themeMode: 'auto',
    themeColor: 'slate',
    isDark: false,
    theme: GARRISON_THEME,
    gradients: {
        ...GRADIENTS,
        primary: GRADIENTS.primary.light,
        tactical: GRADIENTS.tactical,
    } as any,

    initializeTheme: async () => {
        try {
            const [storedMode, storedColor] = await Promise.all([
                AsyncStorage.getItem(THEME_MODE_KEY),
                AsyncStorage.getItem(THEME_COLOR_KEY)
            ])

            const mode = (storedMode as ThemeMode) || 'auto'
            const color = (storedColor as ThemeColor) || 'slate'
            const { isDark, theme, gradients } = computeTheme(mode, color)

            set({ themeMode: mode, themeColor: color, isDark, theme, gradients })
        } catch (error) {
            console.error('Failed to initialize theme:', error)
        }
    },

    setTheme: async (newMode) => {
        try {
            await AsyncStorage.setItem(THEME_MODE_KEY, newMode)
            const { themeColor } = get()
            const { isDark, theme, gradients } = computeTheme(newMode, themeColor)
            set({ themeMode: newMode, isDark, theme, gradients })
        } catch (error) {
            console.error('Failed to save theme mode:', error)
        }
    },

    setThemeColor: async (newColor) => {
        try {
            await AsyncStorage.setItem(THEME_COLOR_KEY, newColor)
            const { themeMode } = get()
            const { isDark, theme, gradients } = computeTheme(themeMode, newColor)
            set({ themeColor: newColor, isDark, theme, gradients })
        } catch (error) {
            console.error('Failed to save theme color:', error)
        }
    },

    toggleTheme: async () => {
        const { themeMode } = get()
        const systemTheme = getSystemTheme()
        const current = themeMode === 'auto' ? systemTheme : themeMode
        const newMode = current === 'dark' ? 'light' : 'dark'
        await get().setTheme(newMode)
    },
})
