import createContextHook from '@nkzw/create-context-hook'
import { useEffect } from 'react'
import { useTheme } from './useTheme'
import useZustandStore from './zustandStore'

// Bridge the existing context-hook API to the zustand store. This preserves the
// current imports (`AppStoreProvider`, `useAppStore`) while moving state into
// zustand. The provider will call initializeAppData once on mount.
export const [AppStoreProvider, useAppStore] = createContextHook(() => {
  const { themeMode, isDark, setTheme, toggleTheme } = useTheme()

  // Call initialize on mount
  const initializeAppData = useZustandStore((s) => s.initializeAppData)
  useEffect(() => {
    initializeAppData()
  }, [initializeAppData])

  // Selectors: mirror the values previously exposed
  const books = useZustandStore((s) => s.books)
  const scriptures = useZustandStore((s) => s.scriptures)
  const collections = useZustandStore((s) => s.collections)
  const selectedBook = useZustandStore((s) => s.selectedBook)
  const selectedChapters = useZustandStore((s) => s.selectedChapters)
  const currentScripture = useZustandStore((s) => s.currentScripture)
  const userSettings = useZustandStore((s) => s.userSettings)
  const userStats = useZustandStore((s) => s.userStats)
  const isLoading = useZustandStore((s) => s.isLoading)

  // Actions
  const setSelectedBook = useZustandStore((s) => s.setSelectedBook)
  const setSelectedChapters = useZustandStore((s) => s.setSelectedChapters)
  const setCurrentScripture = useZustandStore((s) => s.setCurrentScripture)
  const saveUserSettings = useZustandStore((s) => s.saveUserSettings)
  const getScripturesByCollection = useZustandStore((s) => s.getScripturesByCollection)
  const getScripturesByBookAndChapter = useZustandStore((s) => s.getScripturesByBookAndChapter)
  const getRandomScripture = useZustandStore((s) => s.getRandomScripture)
  const updateScriptureAccuracy = useZustandStore((s) => s.updateScriptureAccuracy)
  const updateScriptureMnemonic = useZustandStore((s) => s.updateScriptureMnemonic)
  const addCollection = useZustandStore((s) => s.addCollection)
  const addScripturesToCollection = useZustandStore((s) => s.addScripturesToCollection)
  const addScriptures = useZustandStore((s) => s.addScriptures)
  const updateCollection = useZustandStore((s) => s.updateCollection)
  const deleteCollection = useZustandStore((s) => s.deleteCollection)
  const removeScriptureFromCollection = useZustandStore((s) => s.removeScriptureFromCollection)
  const bulkRemoveScripturesFromCollection = useZustandStore((s) => s.bulkRemoveScripturesFromCollection)

  return {
    // Theme
    themeMode,
    isDark,
    setTheme,
    toggleTheme,

    // Data
    books,
    scriptures,
    collections,
    selectedBook,
    selectedChapters,
    currentScripture,
    userSettings,
    userStats,
    isLoading,

    // Actions
    setSelectedBook,
    setSelectedChapters,
    setCurrentScripture,
    saveUserSettings,
    getScripturesByCollection,
    getScripturesByBookAndChapter,
    getRandomScripture,
    updateScriptureAccuracy,
    updateScriptureMnemonic,
    addCollection,
    addScripturesToCollection,
    addScriptures,
    updateCollection,
    deleteCollection,
    removeScriptureFromCollection,
    bulkRemoveScripturesFromCollection,
  }
})
