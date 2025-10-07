import { create } from 'zustand'
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
import { DataLoaderService } from '@/services/dataLoader'

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

type AppState = {
  // Theme is handled elsewhere (useTheme). We keep it in the hook-level.

  // Data
  books: Book[]
  scriptures: Scripture[]
  collections: Collection[]
  selectedBook: Book | null
  selectedChapters: number[]
  currentScripture: Scripture | null
  userSettings: UserSettings
  userStats: UserStats
  isLoading: boolean

  // Actions
  initializeAppData: () => Promise<void>
  saveUserSettings: (settings: UserSettings) => Promise<boolean>
  updateUserStats: (accuracy: number) => Promise<boolean>
  getScripturesByCollection: (collectionId: string) => Scripture[]
  getScripturesByBookAndChapter: (bookId: string, chapter: number) => Scripture[]
  getRandomScripture: () => Scripture | null
  updateScriptureAccuracy: (scriptureId: string, accuracy: number) => Promise<boolean>
  addCollection: (collection: Collection) => Promise<boolean>
  addScripturesToCollection: (collectionId: string, scriptureIds: string[]) => Promise<boolean>
  addScriptures: (newScriptures: Scripture[]) => Promise<boolean>
  updateCollection: (updatedCollection: Collection) => Promise<boolean>
  setSelectedBook: (book: Book | null) => void
  setSelectedChapters: (chapters: number[]) => void
  setCurrentScripture: (s: Scripture | null) => void
}

export const useZustandStore = create<AppState>((set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void, get: () => AppState) => ({
  books: BOOKS,
  scriptures: [],
  collections: [],
  selectedBook: null,
  selectedChapters: [],
  currentScripture: null,
  userSettings: DEFAULT_USER_SETTINGS,
  userStats: DEFAULT_USER_STATS,
  isLoading: true,

  // Mutations
  setSelectedBook: (book: Book | null) => set({ selectedBook: book }),
  setSelectedChapters: (chapters: number[]) => set({ selectedChapters: chapters }),
  setCurrentScripture: (s: Scripture | null) => set({ currentScripture: s }),

  initializeAppData: async () => {
    try {
      set({ isLoading: true })

      // Load user settings
      const storedSettings = await AsyncStorage.getItem(USER_SETTINGS_KEY)
      if (storedSettings) {
        set({ userSettings: JSON.parse(storedSettings) })
      } else {
        await AsyncStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(DEFAULT_USER_SETTINGS))
      }

      // Load user stats
      const storedStats = await AsyncStorage.getItem(USER_STATS_KEY)
      if (storedStats) {
        set({ userStats: JSON.parse(storedStats) })
      } else {
        await AsyncStorage.setItem(USER_STATS_KEY, JSON.stringify(DEFAULT_USER_STATS))
      }

      // Load transformed data
      const transformedData = await DataLoaderService.loadTransformedData()
      if (transformedData.success) {
        set({ scriptures: transformedData.scriptures, collections: transformedData.collections })
      } else {
        const storedScriptures = await AsyncStorage.getItem(SCRIPTURES_KEY)
        if (storedScriptures) {
          set({ scriptures: JSON.parse(storedScriptures) })
        } else {
          await AsyncStorage.setItem(SCRIPTURES_KEY, JSON.stringify(SCRIPTURES))
          set({ scriptures: SCRIPTURES })
        }

        const storedCollections = await AsyncStorage.getItem(COLLECTIONS_KEY)
        if (storedCollections) {
          set({ collections: JSON.parse(storedCollections) })
        } else {
          await AsyncStorage.setItem(COLLECTIONS_KEY, JSON.stringify(COLLECTIONS))
          set({ collections: COLLECTIONS })
        }
      }

      // Set initial scripture if none
      const s = get().currentScripture
      if ((get().scriptures.length > 0) && !s) {
        set({ currentScripture: get().scriptures[0] })
      }
    } catch (error) {
      console.error('Failed to initialize app data:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  saveUserSettings: async (settings: UserSettings) => {
    try {
      await AsyncStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(settings))
      set({ userSettings: settings })
      return true
    } catch (error) {
      console.error('Failed to save user settings:', error)
      return false
    }
  },

  updateUserStats: async (accuracy: number) => {
    try {
      const updatedStats = { ...get().userStats }
      updatedStats.totalPracticed += 1

      const totalAccuracy = updatedStats.averageAccuracy * (updatedStats.totalPracticed - 1) + accuracy
      updatedStats.averageAccuracy = totalAccuracy / updatedStats.totalPracticed

      const today = new Date().toDateString()
      const lastPracticeDate = updatedStats.lastPracticeDate ? new Date(updatedStats.lastPracticeDate).toDateString() : null

      if (lastPracticeDate === today) {
        // no-op
      } else if (!lastPracticeDate || isYesterday(updatedStats.lastPracticeDate)) {
        updatedStats.streak += 1
      } else {
        updatedStats.streak = 1
      }

      updatedStats.lastPracticeDate = new Date().toISOString()

      updatedStats.rank = calculateRank(updatedStats.totalPracticed, updatedStats.averageAccuracy)

      await AsyncStorage.setItem(USER_STATS_KEY, JSON.stringify(updatedStats))
      set({ userStats: updatedStats })
      return true
    } catch (error) {
      console.error('Failed to update user stats:', error)
      return false
    }
  },

  getScripturesByCollection: (collectionId: string) => {
    const collection = get().collections.find((c: Collection) => c.id === collectionId)
    if (!collection) return []
    return get().scriptures.filter((s: Scripture) => collection.scriptures.includes(s.id))
  },

  getScripturesByBookAndChapter: (bookId: string, chapter: number) => {
    return get().scriptures.filter((scripture: Scripture) =>
      scripture.book.toLowerCase() === bookId.toLowerCase() && scripture.chapter === chapter
    )
  },

  getRandomScripture: (): Scripture | null => {
    const scriptures = get().scriptures
    if (scriptures.length === 0) return null

    let filtered = scriptures
    const selectedBook = get().selectedBook
    if (selectedBook) {
      filtered = filtered.filter((s: Scripture) => s.book.toLowerCase() === selectedBook.name.toLowerCase())
      if (get().selectedChapters.length > 0) {
        filtered = filtered.filter((s: Scripture) => get().selectedChapters.includes(s.chapter))
      }
    }

    if (filtered.length === 0) filtered = scriptures

    const idx = Math.floor(Math.random() * filtered.length)
    const scripture = filtered[idx]
    set({ currentScripture: scripture })
    return scripture
  },

  updateScriptureAccuracy: async (scriptureId: string, accuracy: number) => {
    try {
      const updatedScriptures = get().scriptures.map((scripture: Scripture) =>
        scripture.id === scriptureId
          ? ({
              ...scripture,
              accuracy: scripture.accuracy ? (scripture.accuracy + accuracy) / 2 : accuracy,
              practiceCount: (scripture.practiceCount || 0) + 1,
              lastPracticed: new Date().toISOString(),
            } as Scripture)
          : scripture
      )

      await AsyncStorage.setItem(SCRIPTURES_KEY, JSON.stringify(updatedScriptures))
      set({ scriptures: updatedScriptures })

      if (get().currentScripture?.id === scriptureId) {
        set({ currentScripture: (updatedScriptures.find((s: Scripture) => s.id === scriptureId) as Scripture) || null })
      }

      await get().updateUserStats(accuracy)
      return true
    } catch (error) {
      console.error('Failed to update scripture accuracy:', error)
      return false
    }
  },

  addCollection: async (collection) => {
    try {
      const updatedCollections = [...get().collections, collection]
      set({ collections: updatedCollections })
      await AsyncStorage.setItem(COLLECTIONS_KEY, JSON.stringify(updatedCollections))
      return true
    } catch (error) {
      console.error('Failed to add collection:', error)
      return false
    }
  },

  addScripturesToCollection: async (collectionId, scriptureIds) => {
    try {
      const updatedCollections = get().collections.map((collection) =>
        collection.id === collectionId
          ? { ...collection, scriptures: [...collection.scriptures, ...scriptureIds] }
          : collection
      )
      set({ collections: updatedCollections })
      await AsyncStorage.setItem(COLLECTIONS_KEY, JSON.stringify(updatedCollections))
      return true
    } catch (error) {
      console.error('Failed to add scriptures to collection:', error)
      return false
    }
  },

  addScriptures: async (newScriptures) => {
    try {
      const updatedScriptures = [...get().scriptures, ...newScriptures]
      set({ scriptures: updatedScriptures })
      await AsyncStorage.setItem(SCRIPTURES_KEY, JSON.stringify(updatedScriptures))
      return true
    } catch (error) {
      console.error('Failed to add scriptures:', error)
      return false
    }
  },

  updateCollection: async (updatedCollection) => {
    try {
      const updatedCollections = get().collections.map((collection) =>
        collection.id === updatedCollection.id ? updatedCollection : collection
      )
      set({ collections: updatedCollections })
      await AsyncStorage.setItem(COLLECTIONS_KEY, JSON.stringify(updatedCollections))
      return true
    } catch (error) {
      console.error('Failed to update collection:', error)
      return false
    }
  },
}))

// Helpers (copied logic)
const isYesterday = (dateString?: string) => {
  if (!dateString) return false
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)

  const date = new Date(dateString)
  date.setHours(0, 0, 0, 0)

  return date.getTime() === yesterday.getTime()
}

const calculateRank = (practiceCount: number, accuracy: number): UserStats['rank'] => {
  if (practiceCount >= 5000 && accuracy >= 99) return 'general'
  if (practiceCount >= 2000 && accuracy >= 98) return 'colonel'
  if (practiceCount >= 1000 && accuracy >= 95) return 'major'
  if (practiceCount >= 500 && accuracy >= 90) return 'captain'
  if (practiceCount >= 200 && accuracy >= 85) return 'lieutenant'
  if (practiceCount >= 100 && accuracy >= 80) return 'sergeant'
  if (practiceCount >= 50 && accuracy >= 75) return 'corporal'
  return 'recruit'
}

export default useZustandStore
