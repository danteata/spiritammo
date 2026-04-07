import AsyncStorage from '@react-native-async-storage/async-storage'
import { Asset } from 'expo-asset'
import { Collection, Scripture, CollectionChapter } from '@/types/scripture'
import { fileExtractionService, ExtractedVerse } from './fileExtraction'
import { bibleApiService } from './bibleApi'

const SAMPLE_LOADED_KEY = '@spiritammo_sample_collections_loaded'

// Registry of sample EPUB files bundled with the app.
const SAMPLE_EPUBS: Array<{ requireModule: number; name: string }> = [
  {
    requireModule: require('@/assets/sample-collections/transform-your-pastoral-ministry.epub'),
    name: 'Transform Your Pastoral Ministry',
  },
  {
    requireModule: require('@/assets/sample-collections/24.-The-art-of-leadership-3rd-edition.epub'),
    name: 'The Art of Leadership',
  },
  {
    requireModule: require('@/assets/sample-collections/21.-What-it-means-to-become-a-shepherd.epub'),
    name: 'What It Means to Become a Shepherd',
  },
  {
    requireModule: require('@/assets/sample-collections/loyalty-and-disloyalty.epub'),
    name: 'Loyalty and Disloyalty',
  },
  {
    requireModule: require('@/assets/sample-collections/the-mega-church-2nd-ed-dag-heward-mills.epub'),
    name: 'The Mega Church',
  },
]

export interface SampleLoadResult {
  collections: Collection[]
  scriptures: Scripture[]
  loaded: boolean
}

class SampleCollectionsLoader {
  async isAlreadyLoaded(): Promise<boolean> {
    try {
      const flag = await AsyncStorage.getItem(SAMPLE_LOADED_KEY)
      return flag === 'true'
    } catch {
      return false
    }
  }

  /**
   * @param existingCollections  Collections already loaded from DB so we can
   *   detect the case where a broken run inserted sample collections with
   *   empty/missing chapters.  If a sample collection exists but has no
   *   chapters we re-extract.
   */
  async loadSampleCollections(existingCollections?: Collection[]): Promise<SampleLoadResult> {
    if (await this.isAlreadyLoaded()) {
      if (existingCollections) {
        const existingMap = new Map(existingCollections.map(c => [c.id, c]))
        const needsReextract = SAMPLE_EPUBS.some(epub => {
          const id = `sample_${epub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')}`
          const existing = existingMap.get(id)
          // Collection exists and has chapters — skip
          if (existing && existing.isChapterBased && existing.chapters && existing.chapters.length > 0) {
            return false
          }
          // Collection exists but no chapters — needs re-extract
          if (existing) return true
          // Collection doesn't exist at all — needs extract
          return true
        })
        if (!needsReextract) {
          console.log('📚 Sample collections confirmed in DB with chapters, skipping')
          return { collections: [], scriptures: [], loaded: false }
        }
        console.log('📚 Sample collections missing or have no chapters, re-extracting...')
        await AsyncStorage.removeItem(SAMPLE_LOADED_KEY)
      } else {
        console.log('📚 Sample collections already loaded, skipping')
        return { collections: [], scriptures: [], loaded: false }
      }
    }

    console.log('📚 Loading sample collections from bundled EPUBs...')

    const allCollections: Collection[] = []
    const allScriptures: Scripture[] = []

    await bibleApiService.waitForInitialization()

    for (const epub of SAMPLE_EPUBS) {
      try {
        const asset = Asset.fromModule(epub.requireModule)
        await asset.downloadAsync()

        const uri = asset.localUri || asset.uri
        if (!uri) {
          console.warn(`📚 No local URI for sample EPUB: ${epub.name}, skipping`)
          continue
        }

        console.log(`📚 Extracting sample: ${epub.name} from ${uri}`)

        const text = await fileExtractionService.extractTextFromFile(uri, 'epub')

        const doc = await fileExtractionService.processExtractedText(
          text,
          epub.name,
          'epub',
          0,
          undefined,
          { useInternalBible: true, fileUri: uri }
        )

        if (doc.verses.length === 0) {
          console.warn(`📚 No verses extracted from ${epub.name}, skipping`)
          continue
        }

        const scriptures = fileExtractionService.convertToScriptures(doc)
        const analysis = fileExtractionService.analyzeForChapterOrganization(doc)

        const collectionId = `sample_${epub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')}`
        const scriptureIds = scriptures.map(s => s.id)

        // Build chapters from the extracted verse data.
        // analyzeForChapterOrganization is designed for Bible-book collections
        // and returns canBeChapterBased=false when verses span many books.
        // EPUB collections should always be chapter-based when the extraction
        // produced per-chapter data (collectionChapter on verses).
        const hasChapterData = doc.verses.some(v => v.collectionChapter !== undefined)
        const chapters = hasChapterData
          ? this.buildChapters(doc.verses, scriptures)
          : undefined

        const collection: Collection = {
          id: collectionId,
          name: epub.name,
          description: `Sample collection: ${epub.name}`,
          scriptures: scriptureIds,
          isSystem: true,
          isChapterBased: hasChapterData,
          sourceBook: analysis.sourceBook,
          bookInfo: analysis.sourceBook ? {
            totalChapters: analysis.stats.totalChapters,
            completedChapters: 0,
            averageAccuracy: 0,
          } : undefined,
          chapters,
          createdAt: new Date().toISOString(),
          tags: ['system', 'epub'],
        }

        allCollections.push(collection)
        allScriptures.push(...scriptures)

        console.log(`📚 Sample "${epub.name}": ${scriptures.length} verses, ${chapters?.length || 0} chapters`)
      } catch (error) {
        console.warn(`📚 Failed to load sample EPUB "${epub.name}":`, error)
      }
    }

    if (allCollections.length > 0) {
      await AsyncStorage.setItem(SAMPLE_LOADED_KEY, 'true')
      console.log(`📚 Loaded ${allCollections.length} sample collections with ${allScriptures.length} total verses`)
    }

    return {
      collections: allCollections,
      scriptures: allScriptures,
      loaded: allCollections.length > 0,
    }
  }

  /**
   * Build CollectionChapter[] from extracted verses paired with their
   * corresponding Scripture objects.  Since both arrays share the same
   * ordering (convertToScriptures maps doc.verses 1:1), we match by
   * array index — no fragile ID-pattern guessing needed.
   */
  private buildChapters(
    extractedVerses: ExtractedVerse[],
    scriptures: Scripture[]
  ): CollectionChapter[] {
    // Group scripture indices by chapter number
    const chapterMap = new Map<number, { name: string; scriptureIds: string[] }>()

    for (let i = 0; i < extractedVerses.length; i++) {
      const ev = extractedVerses[i]
      const sc = scriptures[i]
      if (!sc) continue

      const chNum = ev.collectionChapter ?? 1
      const chName = ev.collectionChapterName || `Chapter ${chNum}`

      if (!chapterMap.has(chNum)) {
        chapterMap.set(chNum, { name: chName, scriptureIds: [] })
      }
      chapterMap.get(chNum)!.scriptureIds.push(sc.id)
    }

    // Convert to sorted array
    return Array.from(chapterMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([chapterNum, data]) => ({
        id: `chapter_${chapterNum}`,
        chapterNumber: chapterNum,
        name: data.name,
        scriptures: data.scriptureIds,
        isCompleted: false,
        averageAccuracy: 0,
      }))
  }

  async reset(): Promise<void> {
    await AsyncStorage.removeItem(SAMPLE_LOADED_KEY)
  }
}

export const sampleCollectionsLoader = new SampleCollectionsLoader()
