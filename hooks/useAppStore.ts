import createContextHook from '@nkzw/create-context-hook'
import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  Book,
  Collection,
  Scripture,
  UserSettings,
  UserStats,
} from '@/types/scripture'
import { BOOKS } from '@/mocks/books'
import { COLLECTIONS } from '@/mocks/collections'
import { SCRIPTURES } from '@/mocks/scriptures'
import { useTheme } from './useTheme'

const USER_SETTINGS_KEY = '@spiritammo_user_settings'
const USER_STATS_KEY = '@spiritammo_user_stats'
const SCRIPTURES_KEY = '@spiritammo_scriptures'
const COLLECTIONS_KEY = '@spiritammo_collections'

const DEFAULT_USER_SETTINGS: UserSettings = {
  themeMode: 'auto',
  voiceRate: 0.9,
  voicePitch: 1.0,
  language: 'en-US',
  trainingMode: 'single',
}

const DEFAULT_USER_STATS: UserStats = {
  totalPracticed: 0,
  averageAccuracy: 0,
  streak: 0,
  rank: 'recruit',
}

export const [AppStoreProvider, useAppStore] = createContextHook(() => {
  // Theme
  const { themeMode, isDark, setTheme, toggleTheme } = useTheme()

  // State
  const [books, setBooks] = useState<Book[]>(BOOKS)
  const [scriptures, setScriptures] = useState<Scripture[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [selectedChapters, setSelectedChapters] = useState<number[]>([])
  const [currentScripture, setCurrentScripture] = useState<Scripture | null>(
    null
  )
  const [userSettings, setUserSettings] = useState<UserSettings>(
    DEFAULT_USER_SETTINGS
  )
  const [userStats, setUserStats] = useState<UserStats>(DEFAULT_USER_STATS)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize app data
  useEffect(() => {
    const initializeAppData = async () => {
      try {
        setIsLoading(true)

        // Load user settings
        const storedSettings = await AsyncStorage.getItem(USER_SETTINGS_KEY)
        if (storedSettings) {
          setUserSettings(JSON.parse(storedSettings))
        } else {
          await AsyncStorage.setItem(
            USER_SETTINGS_KEY,
            JSON.stringify(DEFAULT_USER_SETTINGS)
          )
        }

        // Load user stats
        const storedStats = await AsyncStorage.getItem(USER_STATS_KEY)
        if (storedStats) {
          setUserStats(JSON.parse(storedStats))
        } else {
          await AsyncStorage.setItem(
            USER_STATS_KEY,
            JSON.stringify(DEFAULT_USER_STATS)
          )
        }

        // Load scriptures
        const storedScriptures = await AsyncStorage.getItem(SCRIPTURES_KEY)
        if (storedScriptures) {
          setScriptures(JSON.parse(storedScriptures))
        } else {
          await AsyncStorage.setItem(SCRIPTURES_KEY, JSON.stringify(SCRIPTURES))
          setScriptures(SCRIPTURES)
        }

        // Load collections
        const storedCollections = await AsyncStorage.getItem(COLLECTIONS_KEY)
        if (storedCollections) {
          setCollections(JSON.parse(storedCollections))
        } else {
          await AsyncStorage.setItem(
            COLLECTIONS_KEY,
            JSON.stringify(COLLECTIONS)
          )
          setCollections(COLLECTIONS)
        }

        // Set initial scripture
        if (SCRIPTURES.length > 0 && !currentScripture) {
          setCurrentScripture(SCRIPTURES[0])
        }
      } catch (error) {
        console.error('Failed to initialize app data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAppData()
  }, [])

  // Save user settings
  const saveUserSettings = async (settings: UserSettings) => {
    try {
      await AsyncStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(settings))
      setUserSettings(settings)
      return true
    } catch (error) {
      console.error('Failed to save user settings:', error)
      return false
    }
  }

  // Update user stats
  const updateUserStats = async (accuracy: number) => {
    try {
      const updatedStats = { ...userStats }

      // Update stats
      updatedStats.totalPracticed += 1

      // Update average accuracy
      const totalAccuracy =
        updatedStats.averageAccuracy * (updatedStats.totalPracticed - 1) +
        accuracy
      updatedStats.averageAccuracy = totalAccuracy / updatedStats.totalPracticed

      // Update streak
      const today = new Date().toDateString()
      const lastPracticeDate = userStats.lastPracticeDate
        ? new Date(userStats.lastPracticeDate).toDateString()
        : null

      if (lastPracticeDate === today) {
        // Already practiced today, don't increment streak
      } else if (!lastPracticeDate || isYesterday(userStats.lastPracticeDate)) {
        // First practice or practiced yesterday, increment streak
        updatedStats.streak += 1
      } else {
        // Streak broken
        updatedStats.streak = 1
      }

      updatedStats.lastPracticeDate = new Date().toISOString()

      // Update rank based on total practiced and accuracy
      updatedStats.rank = calculateRank(
        updatedStats.totalPracticed,
        updatedStats.averageAccuracy
      )

      // Save updated stats
      await AsyncStorage.setItem(USER_STATS_KEY, JSON.stringify(updatedStats))
      setUserStats(updatedStats)

      return true
    } catch (error) {
      console.error('Failed to update user stats:', error)
      return false
    }
  }

  // Helper function to check if a date is yesterday
  const isYesterday = (dateString?: string) => {
    if (!dateString) return false

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const date = new Date(dateString)
    date.setHours(0, 0, 0, 0)

    return date.getTime() === yesterday.getTime()
  }

  // Calculate rank based on practice count and accuracy
  const calculateRank = (
    practiceCount: number,
    accuracy: number
  ): UserStats['rank'] => {
    if (practiceCount >= 5000 && accuracy >= 99) return 'general'
    if (practiceCount >= 2000 && accuracy >= 98) return 'colonel'
    if (practiceCount >= 1000 && accuracy >= 95) return 'major'
    if (practiceCount >= 500 && accuracy >= 90) return 'captain'
    if (practiceCount >= 200 && accuracy >= 85) return 'lieutenant'
    if (practiceCount >= 100 && accuracy >= 80) return 'sergeant'
    if (practiceCount >= 50 && accuracy >= 75) return 'corporal'
    return 'recruit'
  }

  // Get scriptures by collection
  const getScripturesByCollection = (collectionId: string) => {
    const collection = collections.find((c) => c.id === collectionId)
    if (!collection) return []

    return scriptures.filter((scripture) =>
      collection.scriptures.includes(scripture.id)
    )
  }

  // Get scriptures by book and chapter
  const getScripturesByBookAndChapter = (bookId: string, chapter: number) => {
    return scriptures.filter(
      (scripture) =>
        scripture.book.toLowerCase() === bookId.toLowerCase() &&
        scripture.chapter === chapter
    )
  }

  // Get random scripture
  const getRandomScripture = () => {
    if (scriptures.length === 0) return null

    let filteredScriptures = scriptures

    // Filter by selected book if any
    if (selectedBook) {
      filteredScriptures = filteredScriptures.filter(
        (s) => s.book.toLowerCase() === selectedBook.name.toLowerCase()
      )

      // Further filter by selected chapters if any
      if (selectedChapters.length > 0) {
        filteredScriptures = filteredScriptures.filter((s) =>
          selectedChapters.includes(s.chapter)
        )
      }
    }

    // If no scriptures match the filters, use all scriptures
    if (filteredScriptures.length === 0) {
      filteredScriptures = scriptures
    }

    const randomIndex = Math.floor(Math.random() * filteredScriptures.length)
    const scripture = filteredScriptures[randomIndex]
    setCurrentScripture(scripture)
    return scripture
  }

  // Update scripture accuracy
  const updateScriptureAccuracy = async (
    scriptureId: string,
    accuracy: number
  ) => {
    try {
      const updatedScriptures = scriptures.map((scripture) =>
        scripture.id === scriptureId
          ? {
              ...scripture,
              accuracy: scripture.accuracy
                ? (scripture.accuracy + accuracy) / 2
                : accuracy,
              practiceCount: (scripture.practiceCount || 0) + 1,
              lastPracticed: new Date().toISOString(),
            }
          : scripture
      )

      await AsyncStorage.setItem(
        SCRIPTURES_KEY,
        JSON.stringify(updatedScriptures)
      )
      setScriptures(updatedScriptures)

      // Update current scripture if it's the one being updated
      if (currentScripture?.id === scriptureId) {
        setCurrentScripture(
          updatedScriptures.find((s) => s.id === scriptureId) || null
        )
      }

      // Update user stats
      await updateUserStats(accuracy)

      return true
    } catch (error) {
      console.error('Failed to update scripture accuracy:', error)
      return false
    }
  }

  // Add new collection
  const addCollection = async (collection: Collection): Promise<boolean> => {
    try {
      const updatedCollections = [...collections, collection]
      setCollections(updatedCollections)
      await AsyncStorage.setItem(
        COLLECTIONS_KEY,
        JSON.stringify(updatedCollections)
      )
      return true
    } catch (error) {
      console.error('Failed to add collection:', error)
      return false
    }
  }

  // Add scriptures to collection
  const addScripturesToCollection = async (
    collectionId: string,
    scriptureIds: string[]
  ): Promise<boolean> => {
    try {
      const updatedCollections = collections.map((collection) =>
        collection.id === collectionId
          ? {
              ...collection,
              scriptures: [...collection.scriptures, ...scriptureIds],
            }
          : collection
      )
      setCollections(updatedCollections)
      await AsyncStorage.setItem(
        COLLECTIONS_KEY,
        JSON.stringify(updatedCollections)
      )
      return true
    } catch (error) {
      console.error('Failed to add scriptures to collection:', error)
      return false
    }
  }

  // Add new scriptures to the main scripture store
  const addScriptures = async (
    newScriptures: Scripture[]
  ): Promise<boolean> => {
    try {
      const updatedScriptures = [...scriptures, ...newScriptures]
      setScriptures(updatedScriptures)
      await AsyncStorage.setItem(
        SCRIPTURES_KEY,
        JSON.stringify(updatedScriptures)
      )
      return true
    } catch (error) {
      console.error('Failed to add scriptures:', error)
      return false
    }
  }

  // Update existing collection
  const updateCollection = async (
    updatedCollection: Collection
  ): Promise<boolean> => {
    try {
      const updatedCollections = collections.map((collection) =>
        collection.id === updatedCollection.id ? updatedCollection : collection
      )
      setCollections(updatedCollections)
      await AsyncStorage.setItem(
        COLLECTIONS_KEY,
        JSON.stringify(updatedCollections)
      )
      return true
    } catch (error) {
      console.error('Failed to update collection:', error)
      return false
    }
  }

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
    addCollection,
    addScripturesToCollection,
    addScriptures,
    updateCollection,
  }
})
