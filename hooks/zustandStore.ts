import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { eq, inArray, and } from 'drizzle-orm'
import { getDb, getExpoDb } from '@/db/client'
import { initializeDatabase } from '@/db/init'
import {
  scriptures as scripturesTable,
  collections as collectionsTable,
  collectionScriptures as collectionScripturesTable,
  practiceLogs as practiceLogsTable
} from '@/db/schema'
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
import { militaryRankingService } from '@/services/militaryRanking'

// Generate a simple UUID for React Native
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const USER_SETTINGS_KEY = 'user_settings'
const USER_STATS_KEY = 'user_stats'

const DEFAULT_USER_SETTINGS: UserSettings = {
  themeMode: 'auto',
  voiceRate: 0.9,
  voicePitch: 1.0,
  language: 'en-US',
  trainingMode: 'single',
  voiceEngine: 'whisper',
}

const DEFAULT_USER_STATS: UserStats = {
  totalPracticed: 0,
  averageAccuracy: 0,
  streak: 0,
  rank: 'recruit',
}

type AppState = {
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
  removeScriptureFromCollection: (collectionId: string, scriptureId: string) => Promise<boolean>
  bulkRemoveScripturesFromCollection: (collectionId: string, scriptureIds: string[]) => Promise<boolean>
  deleteCollection: (collectionId: string) => Promise<boolean>
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
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        set({ isLoading: true })

        // 1. Initialize Database Tables
        await initializeDatabase();

        // 2. Load User Settings from AsyncStorage
        const storedSettings = await AsyncStorage.getItem(USER_SETTINGS_KEY)
        if (storedSettings) {
          set({ userSettings: JSON.parse(storedSettings) })
        } else {
          await AsyncStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(DEFAULT_USER_SETTINGS))
        }

        // 3. Initialize Database and get connection
        const db = await getDb();

        if (!db) {
          throw new Error('Failed to get database instance');
        }

        // 4. Load User Stats from AsyncStorage
        const storedStats = await AsyncStorage.getItem(USER_STATS_KEY)
        if (storedStats) {
          set({ userStats: JSON.parse(storedStats) })
        } else {
          // No stored stats - try to calculate from practice logs
          const practiceLogs = await db.select().from(practiceLogsTable);

          if (practiceLogs.length > 0) {
            // Calculate stats from existing practice logs
            const totalPracticed = practiceLogs.length;
            const totalAccuracy = practiceLogs.reduce((sum, log) => sum + (log.accuracy || 0), 0);
            const averageAccuracy = totalAccuracy / totalPracticed;

            // Calculate streak from practice logs
            const sortedLogs = [...practiceLogs].sort((a, b) =>
              new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            let streak = 0;
            let currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0);

            for (const log of sortedLogs) {
              const logDate = new Date(log.date);
              logDate.setHours(0, 0, 0, 0);

              const daysDiff = Math.floor((currentDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));

              if (daysDiff === streak) {
                streak++;
              } else if (daysDiff > streak) {
                break;
              }
            }

            const lastPracticeDate = sortedLogs[0]?.date;
            const rank = calculateRank(totalPracticed, averageAccuracy);

            const calculatedStats = {
              totalPracticed,
              averageAccuracy,
              streak,
              rank,
              lastPracticeDate,
            };

            await AsyncStorage.setItem(USER_STATS_KEY, JSON.stringify(calculatedStats));
            set({ userStats: calculatedStats });
            console.log('📊 Calculated stats from practice logs:', calculatedStats);
          } else {
            // No practice logs either - use defaults
            await AsyncStorage.setItem(USER_STATS_KEY, JSON.stringify(DEFAULT_USER_STATS));
            set({ userStats: DEFAULT_USER_STATS });
          }
        }

        // 5. Load Data from SQLite with retry logic

        const dbScriptures = await db.select().from(scripturesTable);
        const dbCollections = await db.select().from(collectionsTable);

        if (dbScriptures.length > 0) {
          // Fetch relationships
          const dbCollectionScriptures = await db.select().from(collectionScripturesTable);

          // Group scripture IDs by collection ID
          const scripturesByCollection: Record<string, string[]> = {};
          dbCollectionScriptures.forEach(row => {
            if (!scripturesByCollection[row.collectionId]) {
              scripturesByCollection[row.collectionId] = [];
            }
            scripturesByCollection[row.collectionId].push(row.scriptureId);
          });

          // Merge into collections
          // @ts-ignore - Drizzle types might need slight mapping if JSON fields are involved
          const mergedCollections = dbCollections.map(c => ({
            ...c,
            scriptures: scripturesByCollection[c.id] || []
          }));

          // @ts-ignore
          set({ scriptures: dbScriptures, collections: mergedCollections })
        } else {
          // First time load: Seed from Mocks/DataLoader
          console.log('Seeding database...');
          const transformedData = await DataLoaderService.loadTransformedData()
          let initialScriptures = transformedData.success ? transformedData.scriptures : SCRIPTURES;
          let initialCollections = transformedData.success ? transformedData.collections : COLLECTIONS;

          // Insert into SQLite
          // Batch insert scriptures
          if (initialScriptures.length > 0) {
            // @ts-ignore
            await db.insert(scripturesTable).values(initialScriptures);
          }

          // Batch insert collections
          if (initialCollections.length > 0) {
            // @ts-ignore
            await db.insert(collectionsTable).values(initialCollections.map(c => ({
              ...c,
              tags: c.tags, // Drizzle handles JSON
              bookInfo: c.bookInfo,
              chapters: c.chapters
            })));

            // Handle relationships for collections
            for (const col of initialCollections) {
              if (col.scriptures.length > 0) {
                await db.insert(collectionScripturesTable).values(
                  col.scriptures.map(sid => ({ collectionId: col.id, scriptureId: sid }))
                );
              }
            }
          }

          set({ scriptures: initialScriptures, collections: initialCollections })
        }

        // Set initial scripture if none
        const s = get().currentScripture
        if ((get().scriptures.length > 0) && !s) {
          set({ currentScripture: get().scriptures[0] })
        }

        // Success - break retry loop
        break;
      } catch (error) {
        console.error(`Failed to initialize app data (attempt ${retryCount + 1}/${maxRetries}):`, error)
        retryCount++;

        if (retryCount >= maxRetries) {
          console.error('Max retries reached. Database initialization failed.');
          // Set error state or fallback to in-memory data
          set({
            scriptures: SCRIPTURES,
            collections: COLLECTIONS,
            isLoading: false
          });
          return;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      } finally {
        if (retryCount >= maxRetries || retryCount === 0) {
          set({ isLoading: false })
        }
      }
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
      console.log('📊 updateUserStats called with accuracy:', accuracy)
      const updatedStats = { ...get().userStats }
      console.log('📊 Current stats before update:', updatedStats)

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

      // Sync with Military Ranking Service
      try {
        console.log('🎖 Syncing with Military Ranking Service...')
        console.log('🎖 Current Rank:', updatedStats.rank)
        const rankingResult = await militaryRankingService.updateProfile({
          versesMemorized: updatedStats.totalPracticed,
          averageAccuracy: updatedStats.averageAccuracy,
          consecutiveDays: updatedStats.streak,
          lastSessionAccuracy: accuracy,
          lastSessionWordCount: get().currentScripture?.text ? get().currentScripture!.text.split(/\s+/).length : 0
        })
        console.log('🎖 Ranking Service Result:', rankingResult)

        if (rankingResult.newRank && rankingResult.newRank !== updatedStats.rank) {
          console.log('🎖 Rank updated from service:', rankingResult.newRank)
          updatedStats.rank = rankingResult.newRank
        }
      } catch (rankError) {
        console.error('Failed to sync military ranking:', rankError)
      }

      console.log('📊 Updated stats:', updatedStats)
      await AsyncStorage.setItem(USER_STATS_KEY, JSON.stringify(updatedStats))
      console.log('📊 Stats saved to AsyncStorage')

      set({ userStats: updatedStats })
      console.log('📊 Stats updated in state')
      return true
    } catch (error) {
      console.error('Failed to update user stats:', error)
      return false
    }
  },

  getScripturesByCollection: (collectionId: string) => {
    // In-memory filter for now since we load everything into Zustand
    // For larger datasets, we would query DB directly here
    const collection = get().collections.find((c: Collection) => c.id === collectionId)
    if (!collection) return []

    // If collection has scriptures array (from legacy or join), use it
    // But we should probably query the join table if we were pure DB. 
    // For hybrid, we'll assume 'scriptures' prop on Collection is populated or we filter.
    // The current Collection type has 'scriptures: string[]'.

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
      console.log('🎯 updateScriptureAccuracy called:', { scriptureId, accuracy })
      const timestamp = new Date().toISOString();
      const db = await getDb();

      if (!db) {
        console.error('Database not initialized');
        return false;
      }

      // 1. Update in DB
      // We need to fetch current values first or calculate in SQL. Drizzle doesn't support 'update ... set x = x + 1' easily without raw sql
      // So we'll use the in-memory state to calculate new values
      const currentScripture = get().scriptures.find(s => s.id === scriptureId);
      if (!currentScripture) {
        console.error('Scripture not found:', scriptureId);
        return false;
      }

      const newAccuracy = currentScripture.accuracy ? (currentScripture.accuracy + accuracy) / 2 : accuracy;
      const newCount = (currentScripture.practiceCount || 0) + 1;

      console.log('🎯 Updating scripture in DB:', { newAccuracy, newCount });
      await db.update(scripturesTable)
        .set({
          accuracy: newAccuracy,
          practiceCount: newCount,
          lastPracticed: timestamp
        })
        .where(eq(scripturesTable.id, scriptureId));

      // 2. Log practice
      console.log('🎯 Logging practice to database');
      await db.insert(practiceLogsTable).values({
        id: generateUUID(),
        scriptureId,
        date: timestamp,
        accuracy,
        duration: 0 // TODO: Pass duration
      });

      // 3. Update State
      const updatedScriptures = get().scriptures.map((scripture: Scripture) =>
        scripture.id === scriptureId
          ? ({
            ...scripture,
            accuracy: newAccuracy,
            practiceCount: newCount,
            lastPracticed: timestamp,
          } as Scripture)
          : scripture
      )

      set({ scriptures: updatedScriptures })

      if (get().currentScripture?.id === scriptureId) {
        set({ currentScripture: (updatedScriptures.find((s: Scripture) => s.id === scriptureId) as Scripture) || null })
      }

      console.log('🎯 Calling updateUserStats with accuracy:', accuracy);
      await get().updateUserStats(accuracy)
      console.log('🎯 updateScriptureAccuracy completed successfully');
      return true
    } catch (error) {
      console.error('Failed to update scripture accuracy:', error)
      return false
    }
  },

  addCollection: async (collection) => {
    try {
      const db = await getDb();

      if (!db) {
        console.error('Database not initialized');
        return false;
      }

      // Insert into DB
      // @ts-ignore
      const { scriptures, ...collectionData } = collection;
      await db.insert(collectionsTable).values({
        ...collectionData,
        tags: collection.tags,
        bookInfo: collection.bookInfo,
        chapters: collection.chapters
      });

      // Insert relationships
      if (collection.scriptures.length > 0) {
        await db.insert(collectionScripturesTable).values(
          collection.scriptures.map(sid => ({ collectionId: collection.id, scriptureId: sid }))
        );
      }

      const updatedCollections = [...get().collections, collection]
      set({ collections: updatedCollections })
      return true
    } catch (error) {
      console.error('Failed to add collection:', error)
      return false
    }
  },

  addScripturesToCollection: async (collectionId, scriptureIds) => {
    try {
      const db = await getDb();

      if (!db) {
        console.error('Database not initialized');
        return false;
      }

      // Insert new relationships into DB
      // We should filter duplicates first or use ON CONFLICT DO NOTHING
      // For now, simple loop with try/catch or check

      const existingRels = await db.select()
        .from(collectionScripturesTable)
        .where(eq(collectionScripturesTable.collectionId, collectionId));

      const existingScriptureIds = new Set(existingRels.map(r => r.scriptureId));
      const newIds = scriptureIds.filter(id => !existingScriptureIds.has(id));

      if (newIds.length > 0) {
        await db.insert(collectionScripturesTable).values(
          newIds.map(sid => ({ collectionId, scriptureId: sid }))
        ).onConflictDoNothing();
      }

      // Update State
      const updatedCollections = get().collections.map((collection) => {
        if (collection.id === collectionId) {
          // We also need to update the in-memory 'scriptures' array of the collection
          const currentIds = new Set(collection.scriptures);
          const uniqueNewIds = scriptureIds.filter(id => !currentIds.has(id));
          return { ...collection, scriptures: [...collection.scriptures, ...uniqueNewIds] };
        }
        return collection;
      });

      set({ collections: updatedCollections });
      return true;
    } catch (error) {
      console.error('Failed to add scriptures to collection:', error);
      return false;
    }
  },

  removeScriptureFromCollection: async (collectionId: string, scriptureId: string) => {
    try {
      if (!collectionId || !scriptureId) {
        console.error('Invalid params for removeScriptureFromCollection:', { collectionId, scriptureId });
        return false;
      }

      const db = await getDb();

      if (!db) {
        console.error('Database not initialized');
        return false;
      }

      // Use Drizzle ORM with proper error handling
      await db.delete(collectionScripturesTable)
        .where(
          and(
            eq(collectionScripturesTable.collectionId, collectionId),
            eq(collectionScripturesTable.scriptureId, scriptureId)
          )
        );

      // Update State
      const updatedCollections = get().collections.map((collection) => {
        if (collection.id === collectionId) {
          return {
            ...collection,
            scriptures: collection.scriptures.filter(id => id !== scriptureId)
          };
        }
        return collection;
      });

      set({ collections: updatedCollections });
      return true;
    } catch (error) {
      console.error('Failed to remove scripture from collection:', error);
      return false;
    }
  },

  bulkRemoveScripturesFromCollection: async (collectionId: string, scriptureIds: string[]) => {
    try {
      if (!collectionId || !scriptureIds || scriptureIds.length === 0) {
        console.error('Invalid params for bulkRemoveScripturesFromCollection:', { collectionId, scriptureIds });
        return false;
      }

      const db = await getDb();

      if (!db) {
        console.error('Database not initialized');
        return false;
      }

      // Use Drizzle ORM with proper error handling
      await db.delete(collectionScripturesTable)
        .where(
          and(
            eq(collectionScripturesTable.collectionId, collectionId),
            inArray(collectionScripturesTable.scriptureId, scriptureIds)
          )
        );

      // Update State
      const idsToRemove = new Set(scriptureIds);
      const updatedCollections = get().collections.map((collection) => {
        if (collection.id === collectionId) {
          return {
            ...collection,
            scriptures: collection.scriptures.filter(id => !idsToRemove.has(id))
          };
        }
        return collection;
      });

      set({ collections: updatedCollections });
      return true;
    } catch (error) {
      console.error('Failed to bulk remove scriptures from collection:', error);
      return false;
    }
  },

  addScriptures: async (newScriptures) => {
    try {
      const db = await getDb();

      if (!db) {
        console.error('Database not initialized');
        return false;
      }

      const existingScriptures = get().scriptures;
      const existingIds = new Set(existingScriptures.map(s => s.id));

      const uniqueNewScriptures = newScriptures.filter(s => !existingIds.has(s.id));

      if (uniqueNewScriptures.length === 0) return true;

      // Insert into DB
      // @ts-ignore
      await db.insert(scripturesTable).values(uniqueNewScriptures).onConflictDoNothing();

      const updatedScriptures = [...existingScriptures, ...uniqueNewScriptures];
      set({ scriptures: updatedScriptures });
      return true;
    } catch (error) {
      console.error('Failed to add scriptures:', error);
      return false;
    }
  },

  deleteCollection: async (collectionId: string) => {
    try {
      const db = await getDb();

      if (!db) {
        console.error('Database not initialized');
        return false;
      }

      // Delete collection and related data (CASCADE will handle collection_scriptures)
      await db.delete(collectionsTable)
        .where(eq(collectionsTable.id, collectionId));

      // Update State
      const updatedCollections = get().collections.filter(c => c.id !== collectionId);
      set({ collections: updatedCollections });
      return true;
    } catch (error) {
      console.error('Failed to delete collection:', error);
      return false;
    }
  },

  updateCollection: async (updatedCollection) => {
    try {
      const db = await getDb();

      if (!db) {
        console.error('Database not initialized');
        return false;
      }

      // Use Drizzle ORM with proper error handling
      await db.update(collectionsTable)
        .set({
          name: updatedCollection.name,
          description: updatedCollection.description || null,
        })
        .where(eq(collectionsTable.id, updatedCollection.id));

      const updatedCollections = get().collections.map((collection) =>
        collection.id === updatedCollection.id ? updatedCollection : collection
      )
      set({ collections: updatedCollections })
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
