import createContextHook from '@nkzw/create-context-hook'
import { useEffect } from 'react'
import { useTheme } from './useTheme'
import useZustandStore from './zustandStore'

// Bridge the existing context-hook API to the zustand store. This preserves the
// current imports (`AppStoreProvider`, `useAppStore`) while moving state into
// zustand. The provider will call initializeAppData once on mount.
export const [AppStoreProvider, useAppStore] = createContextHook(() => {
  const { themeMode, themeColor, isDark, theme, gradients, setTheme, setThemeColor, toggleTheme } = useTheme()

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
  const campaigns = useZustandStore((s) => s.campaigns)
  const activeCampaignId = useZustandStore((s) => s.activeCampaignId)
  const squadMembers = useZustandStore((s) => s.squadMembers)
  const squadChallenges = useZustandStore((s) => s.squadChallenges)
  const isLoading = useZustandStore((s) => s.isLoading)

  // Avatar selectors
  const avatarInventory = useZustandStore((s) => s.avatarInventory)
  const isLoadingAvatar = useZustandStore((s) => s.isLoadingAvatar)

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
  const startCampaign = useZustandStore((s) => s.startCampaign)
  const completeNode = useZustandStore((s) => s.completeNode)
  const resetCampaignProgress = useZustandStore((s) => s.resetCampaignProgress)
  const provisionCampaignScripture = useZustandStore((s) => s.provisionCampaignScripture)
  const loadSquadData = useZustandStore((s) => s.loadSquadData)
  const updateChallengeProgress = useZustandStore((s) => s.updateChallengeProgress)
  const addSquadMember = useZustandStore((s) => s.addSquadMember)
  const addSquadChallenge = useZustandStore((s) => s.addSquadChallenge)

  // Avatar actions
  const purchaseItem = useZustandStore((s) => s.purchaseItem)
  const equipItem = useZustandStore((s) => s.equipItem)
  const addValorPoints = useZustandStore((s) => s.addValorPoints)

  return {
    // Theme
    themeMode,
    themeColor,
    isDark,
    theme,
    gradients,
    setTheme,
    setThemeColor,
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
    campaigns,
    activeCampaignId,
    squadMembers,
    squadChallenges,
    isLoading,

    // Avatar Data
    avatarInventory,
    isLoadingAvatar,

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
    startCampaign,
    completeNode,
    resetCampaignProgress,
    provisionCampaignScripture,
    loadSquadData,
    updateChallengeProgress,
    addSquadMember,
    addSquadChallenge,

    // Avatar Actions
    purchaseItem,
    equipItem,
    addValorPoints,
  }
})
