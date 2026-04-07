import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { eq, inArray, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
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
} from '@/types/scripture'
import { Campaign } from '@/types/campaign'
import { SquadMember, SquadChallenge } from '@/types/squad'
import { BOOKS } from '@/mocks/books'
import { COLLECTIONS } from '@/mocks/collections'
import { SCRIPTURES } from '@/mocks/scriptures'
import { INITIAL_CAMPAIGNS } from '@/data/campaigns'
import { DataLoaderService } from '@/services/dataLoader'
import { bibleApiService } from '@/services/bibleApi'
import { errorHandler } from '@/services/errorHandler'
import { CollectionChapterService } from '@/services/collectionChapters'
import { sampleCollectionsLoader } from '@/services/sampleCollectionsLoader'
import { createAvatarSlice, AvatarSlice } from '@/hooks/stores/createAvatarSlice'
import { createScriptureSlice, ScriptureSlice } from '@/hooks/stores/createScriptureSlice'
import { createCollectionSlice, CollectionSlice } from '@/hooks/stores/createCollectionSlice'
import { createUserSlice, UserSlice } from '@/hooks/stores/createUserSlice'
import { createCampaignSlice, CampaignSlice } from '@/hooks/stores/createCampaignSlice'
import { createThemeSlice, ThemeSlice } from '@/hooks/stores/createThemeSlice'
import { analytics, AnalyticsEvents } from '@/services/analytics'

// ─── Types ───────────────────────────────────────────────────────────────────

type AppState = AvatarSlice &
  ScriptureSlice &
  CollectionSlice &
  UserSlice &
  CampaignSlice &
  ThemeSlice & {
    // Additional state not in slices
    isLoading: boolean
    squadMembers: SquadMember[]
    squadChallenges: SquadChallenge[]

    // Init
    initializeAppData: () => Promise<void>

    // Squad
    loadSquadData: () => Promise<boolean>
    updateChallengeProgress: (challengeId: string, progress: number) => Promise<boolean>
    addSquadMember: (member: SquadMember) => Promise<boolean>
    addSquadChallenge: (challenge: SquadChallenge) => Promise<boolean>
  }

// ─── Store ───────────────────────────────────────────────────────────────────

export const useZustandStore = create<AppState>((set, get, store) => ({
  // Slices
  ...createAvatarSlice(set, get, store),
  ...createScriptureSlice(set, get, store),
  ...createCollectionSlice(set, get, store),
  ...createUserSlice(set, get, store),
  ...createCampaignSlice(set, get, store),
  ...createThemeSlice(set, get, store),

  // Additional state
  isLoading: true,
  squadMembers: [],
  squadChallenges: [],

  // ─── Initialization ───────────────────────────────────────────────────────

  initializeAppData: async () => {
    let retryCount = 0
    const maxRetries = 3

    while (retryCount < maxRetries) {
      try {
        set({ isLoading: true })
        await get().initializeTheme()
        await initializeDatabase()
        await get().loadAvatarData()

        // Batch all AsyncStorage reads into a single call (perf: 3 round-trips → 1)
        const [[, storedSettings], [, storedCampaigns], [, storedStats]] =
          await AsyncStorage.multiGet(['user_settings', 'user_campaigns', 'user_stats'])

        // Load user settings
        if (storedSettings) {
          set({ userSettings: JSON.parse(storedSettings) })
        } else {
          await AsyncStorage.setItem('user_settings', JSON.stringify(get().userSettings))
        }

        // Load campaigns
        if (storedCampaigns) {
          try {
            set({ campaigns: JSON.parse(storedCampaigns) })
          } catch {
            await AsyncStorage.removeItem('user_campaigns')
            set({ campaigns: INITIAL_CAMPAIGNS })
          }
        } else {
          set({ campaigns: INITIAL_CAMPAIGNS })
        }
        if (storedStats) {
          set({ userStats: JSON.parse(storedStats) })
        } else {
          const db = await getDb()
          if (db) {
            const statsResult = await db.select({
              total: sql`COUNT(*)`,
              avgAccuracy: sql`AVG(accuracy)`,
            }).from(practiceLogsTable)

            const totalPracticed = Number(statsResult[0]?.total || 0)
            const averageAccuracy = Number(statsResult[0]?.avgAccuracy || 0)

            let streak = 0
            let lastPracticeDate: string | undefined

            if (totalPracticed > 0) {
              const sortedLogs = await db.select({ date: practiceLogsTable.date })
                .from(practiceLogsTable)
                .orderBy(sql`${practiceLogsTable.date} DESC`)

              lastPracticeDate = sortedLogs[0]?.date

              const now = new Date()
              now.setHours(0, 0, 0, 0)
              for (const log of sortedLogs) {
                const logDate = new Date(log.date)
                logDate.setHours(0, 0, 0, 0)
                const diff = Math.floor((now.getTime() - logDate.getTime()) / 86400000)
                if (diff === streak) streak++
                else if (diff > streak) break
              }
            }

            const stats = {
              totalPracticed,
              averageAccuracy,
              streak,
              rank: 'recruit' as const,
              lastPracticeDate,
            }
            await AsyncStorage.setItem('user_stats', JSON.stringify(stats))
            set({ userStats: stats })
          }
        }

        // Load data from DB
        const db = await getDb()
        if (!db) throw new Error('Failed to get database instance')

        const dbScriptures = await db.select().from(scripturesTable)
        const dbCollections = await db.select().from(collectionsTable)

        if (dbScriptures.length > 0) {
          const dbCollectionScriptures = await db.select().from(collectionScripturesTable)
          const scripturesByCollection: Record<string, string[]> = {}
          dbCollectionScriptures.forEach(row => {
            if (!scripturesByCollection[row.collectionId]) scripturesByCollection[row.collectionId] = []
            scripturesByCollection[row.collectionId].push(row.scriptureId)
          })

          const systemCollectionIds = new Set(COLLECTIONS.filter(c => c.isSystem).map(c => c.id))
          dbCollections.forEach(c => {
            if (c.id.startsWith('sample_')) systemCollectionIds.add(c.id)
          })

          let mergedCollections: Collection[] = dbCollections.map(c => ({
            id: c.id,
            name: c.name,
            abbreviation: c.abbreviation || undefined,
            description: c.description || undefined,
            createdAt: c.createdAt || undefined,
            tags: (c.tags as string[]) || [],
            isChapterBased: c.isChapterBased || false,
            sourceBook: c.sourceBook || undefined,
            bookInfo: (c.bookInfo as Collection['bookInfo']) || undefined,
            chapters: (c.chapters as Collection['chapters']) || undefined,
            isSystem: systemCollectionIds.has(c.id),
            scriptures: scripturesByCollection[c.id] || []
          }))

          // Ensure system collections exist
          const systemCollections = COLLECTIONS.filter(c => c.isSystem)
          const existingSystemIds = new Set(mergedCollections.map(c => c.id))
          const missingSystemCollections = systemCollections.filter(c => !existingSystemIds.has(c.id))
          const existingSystemCollections = mergedCollections.filter(c => systemCollectionIds.has(c.id))
          const systemCollectionsNeedingRelationships = existingSystemCollections.filter(
            sysCol => !sysCol.scriptures || sysCol.scriptures.length === 0
          )
          const systemCollectionDataMap = new Map(COLLECTIONS.filter(c => c.isSystem).map(c => [c.id, c]))

          if (missingSystemCollections.length > 0 || systemCollectionsNeedingRelationships.length > 0) {
            const existingScriptureIds = new Set(dbScriptures.map(s => s.id))
            const allReferencedScriptures = [...missingSystemCollections, ...systemCollectionsNeedingRelationships].flatMap(c => c.scriptures)
            const missingScriptures = allReferencedScriptures.filter(sid => !existingScriptureIds.has(sid))

            if (missingScriptures.length > 0) {
              const scripturesToAdd = SCRIPTURES.filter(s => missingScriptures.includes(s.id))
              if (scripturesToAdd.length > 0) {
                await db.insert(scripturesTable).values(scripturesToAdd.map(s => ({
                  id: s.id, book: s.book, chapter: s.chapter, verse: s.verse,
                  endVerse: s.endVerse, text: s.text, reference: s.reference,
                  mnemonic: s.mnemonic, lastPracticed: s.lastPracticed,
                  accuracy: s.accuracy, practiceCount: s.practiceCount, isJesusWords: s.isJesusWords
                })))
                dbScriptures.push(...scripturesToAdd.map(s => ({
                  id: s.id, book: s.book, chapter: s.chapter, verse: s.verse,
                  endVerse: s.endVerse ?? null, text: s.text, reference: s.reference,
                  mnemonic: s.mnemonic ?? null, lastPracticed: s.lastPracticed ?? null,
                  accuracy: s.accuracy ?? null, practiceCount: s.practiceCount ?? null,
                  isJesusWords: s.isJesusWords ?? null,
                })))
              }
            }

            for (const sysCol of missingSystemCollections) {
              const { scriptures: _scriptures, ...collectionData } = sysCol
              await db.insert(collectionsTable).values({
                id: collectionData.id, name: collectionData.name,
                abbreviation: collectionData.abbreviation, description: collectionData.description,
                createdAt: collectionData.createdAt, tags: collectionData.tags,
                isChapterBased: collectionData.isChapterBased, sourceBook: collectionData.sourceBook,
                bookInfo: collectionData.bookInfo, chapters: collectionData.chapters
              })
              if (sysCol.scriptures.length > 0) {
                await db.insert(collectionScripturesTable).values(
                  sysCol.scriptures.map(sid => ({ collectionId: sysCol.id, scriptureId: sid }))
                )
              }
              mergedCollections.push({ ...sysCol, scriptures: [...sysCol.scriptures] })
            }

            for (const sysCol of systemCollectionsNeedingRelationships) {
              const originalData = systemCollectionDataMap.get(sysCol.id)
              if (originalData && originalData.scriptures.length > 0) {
                await db.insert(collectionScripturesTable).values(
                  originalData.scriptures.map(sid => ({ collectionId: sysCol.id, scriptureId: sid }))
                ).onConflictDoNothing()
                sysCol.scriptures = [...originalData.scriptures]
              }
            }

            // Update scriptures arrays
            const updatedDbCollectionScriptures = await db.select().from(collectionScripturesTable)
            const updatedScripturesByCollection: Record<string, string[]> = {}
            updatedDbCollectionScriptures.forEach(row => {
              if (!updatedScripturesByCollection[row.collectionId]) updatedScripturesByCollection[row.collectionId] = []
              updatedScripturesByCollection[row.collectionId].push(row.scriptureId)
            })
            mergedCollections = mergedCollections.map(c => ({
              ...c, scriptures: updatedScripturesByCollection[c.id] || []
            }))
          }

          set({
            scriptures: dbScriptures.map(s => ({
              ...s, endVerse: s.endVerse || undefined, mnemonic: s.mnemonic || undefined,
              lastPracticed: s.lastPracticed || undefined, accuracy: s.accuracy || undefined,
              practiceCount: s.practiceCount || 0, isJesusWords: s.isJesusWords || false,
            })),
            collections: mergedCollections
          })
        } else {
          // First time: seed from mocks
          const transformedData = await DataLoaderService.loadTransformedData()
          const initialScriptures = transformedData.success ? transformedData.scriptures : SCRIPTURES
          const initialCollections = transformedData.success ? transformedData.collections : COLLECTIONS

          if (initialScriptures.length > 0) {
            await db.insert(scripturesTable).values(initialScriptures.map(s => ({
              id: s.id, book: s.book, chapter: s.chapter, verse: s.verse,
              endVerse: s.endVerse, text: s.text, reference: s.reference,
              mnemonic: s.mnemonic, lastPracticed: s.lastPracticed,
              accuracy: s.accuracy, practiceCount: s.practiceCount, isJesusWords: s.isJesusWords
            })))
          }

          if (initialCollections.length > 0) {
            await db.insert(collectionsTable).values(initialCollections.map(c => ({
              id: c.id, name: c.name, abbreviation: c.abbreviation, description: c.description,
              createdAt: c.createdAt, tags: c.tags, isChapterBased: c.isChapterBased,
              sourceBook: c.sourceBook, bookInfo: c.bookInfo, chapters: c.chapters
            })))
            for (const col of initialCollections) {
              if (col.scriptures.length > 0) {
                await db.insert(collectionScripturesTable).values(
                  col.scriptures.map(sid => ({ collectionId: col.id, scriptureId: sid }))
                )
              }
            }
          }

          set({ scriptures: initialScriptures, collections: initialCollections })
        }

        // Load sample EPUB collections
        try {
          const existingCollections = get().collections
          const sampleResult = await sampleCollectionsLoader.loadSampleCollections(existingCollections)
          if (sampleResult.loaded) {
            const existingSampleIds = sampleResult.collections
              .filter(c => existingCollections.some(ec => ec.id === c.id))
              .map(c => c.id)

            if (existingSampleIds.length > 0) {
              for (const colId of existingSampleIds) {
                await db.delete(collectionScripturesTable).where(eq(collectionScripturesTable.collectionId, colId))
              }
              await db.delete(collectionsTable).where(inArray(collectionsTable.id, existingSampleIds))
              const oldIds = existingCollections.filter(c => existingSampleIds.includes(c.id)).flatMap(c => c.scriptures)
              if (oldIds.length > 0) await db.delete(scripturesTable).where(inArray(scripturesTable.id, oldIds))
            }

            if (sampleResult.scriptures.length > 0) {
              await db.insert(scripturesTable).values(sampleResult.scriptures.map(s => ({
                id: s.id, book: s.book, chapter: s.chapter, verse: s.verse,
                endVerse: s.endVerse, text: s.text, reference: s.reference,
                mnemonic: s.mnemonic, lastPracticed: s.lastPracticed,
                accuracy: s.accuracy, practiceCount: s.practiceCount, isJesusWords: s.isJesusWords
              })))
            }

            for (const col of sampleResult.collections) {
              const { scriptures: _scriptures, ...cd } = col
              await db.insert(collectionsTable).values({
                id: cd.id, name: cd.name, abbreviation: cd.abbreviation, description: cd.description,
                createdAt: cd.createdAt, tags: cd.tags, isChapterBased: cd.isChapterBased,
                sourceBook: cd.sourceBook, bookInfo: cd.bookInfo, chapters: cd.chapters,
              })
              if (col.scriptures.length > 0) {
                await db.insert(collectionScripturesTable).values(
                  col.scriptures.map(sid => ({ collectionId: col.id, scriptureId: sid }))
                )
              }
            }

            const colIdSet = new Set(sampleResult.collections.map(c => c.id))
            const scrIdSet = new Set(sampleResult.scriptures.map(s => s.id))
            set({
              collections: [...get().collections.filter(c => !colIdSet.has(c.id)), ...sampleResult.collections],
              scriptures: [...get().scriptures.filter(s => !scrIdSet.has(s.id)), ...sampleResult.scriptures],
            })
          }
        } catch (sampleError) {
          console.warn('📚 Sample collection loading failed (non-fatal):', sampleError)
        }

        // Set initial scripture
        if (get().scriptures.length > 0 && !get().currentScripture) {
          set({ currentScripture: get().scriptures[0] })
        }

        set({ isLoading: false })
        break
      } catch (error) {
        await errorHandler.handleError(error, `Initialize App Data (Attempt ${retryCount + 1}/${maxRetries})`, { silent: true })
        retryCount++
        if (retryCount >= maxRetries) {
          await errorHandler.handleError(new Error('Database initialization failed after max retries'), 'Initialize App Data', {
            customMessage: 'Critical failure: Unable to access ammunition depot. Please restart the application.'
          })
          set({ scriptures: SCRIPTURES, collections: COLLECTIONS, isLoading: false })
          return
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
      } finally {
        if (retryCount >= maxRetries || retryCount === 0) {
          set({ isLoading: false })
        }
      }
    }
  },

  // ─── Squad (stub) ─────────────────────────────────────────────────────────

  loadSquadData: async () => {
    console.log('Squad data loaded')
    return true
  },

  updateChallengeProgress: async (challengeId, progress) => {
    try {
      set({
        squadChallenges: get().squadChallenges.map(c =>
          c.id === challengeId ? { ...c, progress } : c
        )
      })
      return true
    } catch { return false }
  },

  addSquadMember: async (member) => {
    try {
      set({ squadMembers: [...get().squadMembers, member] })
      return true
    } catch { return false }
  },

  addSquadChallenge: async (challenge) => {
    try {
      set({ squadChallenges: [...get().squadChallenges, challenge] })
      return true
    } catch { return false }
  },
}))

export default useZustandStore
