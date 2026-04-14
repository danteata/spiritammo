import createContextHook from '@nkzw/create-context-hook'
import { useEffect, useMemo, useRef } from 'react'
import { useTheme } from './useTheme'
import useZustandStore from './zustandStore'

export const [AppStoreProvider, useAppStore] = createContextHook(() => {
  const { themeMode, themeColor, isDark, theme, gradients, setTheme, setThemeColor, toggleTheme } = useTheme()

  const initializeAppData = useZustandStore((s) => s.initializeAppData)
  useEffect(() => {
    // Analytics is initialized by AnalyticsProvider in root layout
    initializeAppData()
  }, [initializeAppData])

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
  const versePerformance = useZustandStore((s) => s.versePerformance)
  const distractorPerformance = useZustandStore((s) => s.distractorPerformance)

  const srsDailySummary = useZustandStore((s) => s.srsDailySummary)
  const srsStates = useZustandStore((s) => s.srsStates)
  const updateSRSAfterReview = useZustandStore((s) => s.updateSRSAfterReview)
  const getDueScriptures = useZustandStore((s) => s.getDueScriptures)
  const getOverdueScriptures = useZustandStore((s) => s.getOverdueScriptures)

  const afterActionBriefings = useZustandStore((s) => s.afterActionBriefings)
  const crossReferenceBriefings = useZustandStore((s) => s.crossReferenceBriefings)
  const weeklyPlan = useZustandStore((s) => s.weeklyPlan)
  const isBriefingLoading = useZustandStore((s) => s.isBriefingLoading)
  const requestAfterActionBriefing = useZustandStore((s) => s.requestAfterActionBriefing)
  const requestCrossReferenceBriefing = useZustandStore((s) => s.requestCrossReferenceBriefing)
  const requestWeeklyPlan = useZustandStore((s) => s.requestWeeklyPlan)

  const mnemonics = useZustandStore((s) => s.mnemonics)
  const isMnemonicLoading = useZustandStore((s) => s.isMnemonicLoading)
  const getMnemonicsForScripture = useZustandStore((s) => s.getMnemonicsForScripture)
  const generateMnemonicsForScripture = useZustandStore((s) => s.generateMnemonicsForScripture)
  const addMnemonic = useZustandStore((s) => s.addMnemonic)

  const avatarInventory = useZustandStore((s) => s.avatarInventory)
  const isLoadingAvatar = useZustandStore((s) => s.isLoadingAvatar)

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

  const generateAutoCampaign = useZustandStore((s) => s.generateAutoCampaign)
  const generateThematicCampaign = useZustandStore((s) => s.generateThematicCampaign)
  const findAvailableThemes = useZustandStore((s) => s.findAvailableThemes)
  const escalateCampaign = useZustandStore((s) => s.escalateCampaign)
  const deleteCampaign = useZustandStore((s) => s.deleteCampaign)
  const clearActiveCampaign = useZustandStore((s) => s.clearActiveCampaign)

  const loadSquadData = useZustandStore((s) => s.loadSquadData)
  const updateChallengeProgress = useZustandStore((s) => s.updateChallengeProgress)
  const addSquadMember = useZustandStore((s) => s.addSquadMember)
  const addSquadChallenge = useZustandStore((s) => s.addSquadChallenge)
  const recordQuizResults = useZustandStore((s) => s.recordQuizResults)

  const purchaseItem = useZustandStore((s) => s.purchaseItem)
  const equipItem = useZustandStore((s) => s.equipItem)
  const addValorPoints = useZustandStore((s) => s.addValorPoints)

  const pendingTrainingMode = useZustandStore((s) => s.pendingTrainingMode)
  const startTraining = useZustandStore((s) => s.startTraining)
  const consumeTrainingIntent = useZustandStore((s) => s.consumeTrainingIntent)

  return useMemo(() => ({
    themeMode, themeColor, isDark, theme, gradients, setTheme, setThemeColor, toggleTheme,
    books, scriptures, collections, selectedBook, selectedChapters, currentScripture,
    userSettings, userStats, campaigns, activeCampaignId, squadMembers, squadChallenges,
    isLoading, versePerformance, distractorPerformance,
    srsDailySummary, srsStates, updateSRSAfterReview, getDueScriptures, getOverdueScriptures,
    afterActionBriefings, crossReferenceBriefings, weeklyPlan, isBriefingLoading,
    requestAfterActionBriefing, requestCrossReferenceBriefing, requestWeeklyPlan,
    mnemonics, isMnemonicLoading, getMnemonicsForScripture, generateMnemonicsForScripture, addMnemonic,
    avatarInventory, isLoadingAvatar,
    setSelectedBook, setSelectedChapters, setCurrentScripture, saveUserSettings,
    getScripturesByCollection, getScripturesByBookAndChapter, getRandomScripture,
    updateScriptureAccuracy, updateScriptureMnemonic,
    addCollection, addScripturesToCollection, addScriptures,
    updateCollection, deleteCollection, removeScriptureFromCollection, bulkRemoveScripturesFromCollection,
    startCampaign, completeNode, resetCampaignProgress, provisionCampaignScripture,
    generateAutoCampaign, generateThematicCampaign, findAvailableThemes, escalateCampaign,
    deleteCampaign, clearActiveCampaign,
    loadSquadData, updateChallengeProgress, addSquadMember, addSquadChallenge, recordQuizResults,
    purchaseItem, equipItem, addValorPoints,
    pendingTrainingMode, startTraining, consumeTrainingIntent,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [
    themeMode, themeColor, isDark, theme, gradients, setTheme, setThemeColor, toggleTheme,
    books, scriptures, collections, selectedBook, selectedChapters, currentScripture,
    userSettings, userStats, campaigns, activeCampaignId, squadMembers, squadChallenges,
    isLoading, versePerformance, distractorPerformance,
    srsDailySummary, srsStates, updateSRSAfterReview, getDueScriptures, getOverdueScriptures,
    afterActionBriefings, crossReferenceBriefings, weeklyPlan, isBriefingLoading,
    requestAfterActionBriefing, requestCrossReferenceBriefing, requestWeeklyPlan,
    mnemonics, isMnemonicLoading, getMnemonicsForScripture, generateMnemonicsForScripture, addMnemonic,
    avatarInventory, isLoadingAvatar,
    setSelectedBook, setSelectedChapters, setCurrentScripture, saveUserSettings,
    getScripturesByCollection, getScripturesByBookAndChapter, getRandomScripture,
    updateScriptureAccuracy, updateScriptureMnemonic,
    addCollection, addScripturesToCollection, addScriptures,
    updateCollection, deleteCollection, removeScriptureFromCollection, bulkRemoveScripturesFromCollection,
    startCampaign, completeNode, resetCampaignProgress, provisionCampaignScripture,
    generateAutoCampaign, generateThematicCampaign, findAvailableThemes, escalateCampaign,
    deleteCampaign, clearActiveCampaign,
    loadSquadData, updateChallengeProgress, addSquadMember, addSquadChallenge, recordQuizResults,
    purchaseItem, equipItem, addValorPoints,
    pendingTrainingMode, startTraining, consumeTrainingIntent,
  ])
})