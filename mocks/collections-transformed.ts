import { Collection, Scripture, CollectionChapter } from '@/types/scripture'
import { bibleApiService } from '@/services/bibleApi'
import { collections as rawCollections } from './collections-raw'

// Helper function to parse verse reference
const parseReference = (reference: string) => {
  // Match "Book Chapter:Verse(s)"
  // e.g., "John 3:16", "Psalm 23:1-6", "2 Samuel 3:20,21"
  const match = reference.match(/^((?:[1-3]\s)?[A-Za-z]+)\s+(\d+):(.+)$/)

  if (!match) {
    console.warn(`⚠️ Could not parse reference: "${reference}"`)
    return null
  }

  const book = match[1].trim()
  const chapter = parseInt(match[2])
  const versePart = match[3].trim()

  return { book, chapter, versePart }
}

// Transform raw data to Scripture format
const transformToScriptures = async (
  rawData: any,
  collectionAbbr: string
): Promise<Scripture[]> => {
  const scriptures: Scripture[] = []
  let scriptureId = 1

  // Ensure Bible API is ready
  await bibleApiService.waitForInitialization()

  const chapterKeys = Object.keys(rawData)

  for (const chapterKey of chapterKeys) {
    const chapterNumber = parseInt(chapterKey)
    const verses = rawData[chapterKey]

    for (const verseData of verses) {
      const parsed = parseReference(verseData.reference)

      if (!parsed) {
        // Fallback to existing text if parsing fails (stripping HTML)
        const cleanedText = verseData.text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
        scriptures.push({
          id: `${collectionAbbr}_${chapterNumber}_${scriptureId}`,
          book: 'Unknown',
          chapter: 1,
          verse: 1,
          text: cleanedText,
          reference: verseData.reference,
          accuracy: Math.floor(Math.random() * 30) + 70,
          practiceCount: Math.floor(Math.random() * 10),
          lastPracticed: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        scriptureId++
        continue
      }

      const { book, chapter, versePart } = parsed
      let text = ''
      let startVerse = 0
      let endVerse = 0

      // Handle ranges (e.g., "1-6")
      if (versePart.includes('-')) {
        const [start, end] = versePart.split('-').map(v => parseInt(v.trim()))
        startVerse = start
        endVerse = end

        const rangeVerses = await bibleApiService.getVerseRange(book, chapter, start, end)
        if (rangeVerses.length > 0) {
          text = rangeVerses.map(v => v.text).join(' ')
        }
      }
      // Handle comma-separated (e.g., "20,21")
      else if (versePart.includes(',')) {
        const verses = versePart.split(',').map(v => parseInt(v.trim()))
        startVerse = verses[0]
        endVerse = verses[verses.length - 1]

        const fetchedVerses = []
        for (const v of verses) {
          const verseObj = await bibleApiService.getVerse(book, chapter, v)
          if (verseObj) fetchedVerses.push(verseObj.text)
        }
        text = fetchedVerses.join(' ')
      }
      // Single verse
      else {
        startVerse = parseInt(versePart)
        endVerse = startVerse
        const verseObj = await bibleApiService.getVerse(book, chapter, startVerse)
        if (verseObj) text = verseObj.text
      }

      // Fallback if Bible API returned nothing
      if (!text) {
        console.warn(`⚠️ Could not fetch text for ${verseData.reference}, using fallback`)
        text = verseData.text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
      }

      scriptures.push({
        id: `${collectionAbbr}_${chapterNumber}_${scriptureId}`,
        book,
        chapter,
        verse: startVerse,
        endVerse: endVerse > startVerse ? endVerse : undefined,
        text,
        reference: verseData.reference,
        accuracy: Math.floor(Math.random() * 30) + 70,
        practiceCount: Math.floor(Math.random() * 10),
        lastPracticed: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      scriptureId++
    }
  }

  return scriptures
}

// Create collection chapters
const createChapters = (
  rawData: any,
  scriptures: Scripture[],
  collectionAbbr: string
): CollectionChapter[] => {
  const chapters: CollectionChapter[] = []

  Object.keys(rawData).forEach((chapterKey) => {
    const chapterNumber = parseInt(chapterKey)
    const chapterScriptures = scriptures.filter((s) =>
      s.id.includes(`${collectionAbbr}_${chapterNumber}_`)
    )

    chapters.push({
      id: `${collectionAbbr}_chapter_${chapterNumber}`,
      chapterNumber,
      name: `Chapter ${chapterNumber}`,
      description: `${chapterScriptures.length} verses from chapter ${chapterNumber}`,
      scriptures: chapterScriptures.map((s) => s.id),
      isCompleted: Math.random() > 0.7,
      averageAccuracy: Math.floor(Math.random() * 30) + 70,
      lastPracticed:
        Math.random() > 0.5
          ? new Date(
            Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
          ).toISOString()
          : undefined,
      isCustomSection: false,
    })
  })

  return chapters.sort((a, b) => a.chapterNumber - b.chapterNumber)
}

// Collection definitions
const collectionDefinitions = {
  POSE: {
    name: 'What it Means to be a Shepherd',
    abbreviation: 'POSE',
    description: "Biblical teachings on pastoral care and shepherding God's people",
  },
  LAD: {
    name: 'Loyalty and Disloyalty',
    abbreviation: 'LAD',
    description: 'Scriptures about faithfulness, betrayal, and loyalty in leadership',
  },
  MC: {
    name: 'MegaChurch',
    abbreviation: 'MC',
    description: 'Principles for large church leadership and ministry',
  },
  TYPM: {
    name: 'Transform Your Pastoral Ministry',
    abbreviation: 'TYPM',
    description: 'Transformational approaches to pastoral leadership',
  },
  AOL: {
    name: 'The Art of Leadership',
    abbreviation: 'AOL',
    description: 'Biblical principles of effective Christian leadership',
  },
}

// Main transformation function
export const transformCollections = async (): Promise<{
  collections: Collection[]
  scriptures: Scripture[]
}> => {
  const transformedCollections: Collection[] = []
  const transformedScriptures: Scripture[] = []

  console.log('🔄 Starting legacy collection transformation...')

  // Process POSE
  if (rawCollections.POSE) {
    const poseScriptures = await transformToScriptures(rawCollections.POSE, 'POSE')
    const poseChapters = createChapters(rawCollections.POSE, poseScriptures, 'POSE')

    transformedScriptures.push(...poseScriptures)
    transformedCollections.push({
      id: 'collection_pose',
      name: collectionDefinitions.POSE.name,
      abbreviation: collectionDefinitions.POSE.abbreviation,
      description: collectionDefinitions.POSE.description,
      scriptures: poseScriptures.map((s) => s.id),
      createdAt: new Date().toISOString(),
      tags: ['pastoral', 'shepherding', 'leadership'],
      isChapterBased: true,
      chapters: poseChapters,
      sourceBook: 'Mixed',
      bookInfo: {
        totalChapters: poseChapters.length,
        completedChapters: poseChapters.filter((c) => c.isCompleted).length,
        averageAccuracy:
          poseChapters.reduce((sum, c) => sum + (c.averageAccuracy || 0), 0) /
          poseChapters.length,
      },
    })
  }

  // Process LAD
  if (rawCollections.LAD) {
    const ladScriptures = await transformToScriptures(rawCollections.LAD, 'LAD')
    const ladChapters = createChapters(rawCollections.LAD, ladScriptures, 'LAD')

    transformedScriptures.push(...ladScriptures)
    transformedCollections.push({
      id: 'collection_lad',
      name: collectionDefinitions.LAD.name,
      abbreviation: collectionDefinitions.LAD.abbreviation,
      description: collectionDefinitions.LAD.description,
      scriptures: ladScriptures.map((s) => s.id),
      createdAt: new Date().toISOString(),
      tags: ['loyalty', 'faithfulness', 'betrayal', 'leadership'],
      isChapterBased: true,
      chapters: ladChapters,
      sourceBook: 'Mixed',
      bookInfo: {
        totalChapters: ladChapters.length,
        completedChapters: ladChapters.filter((c) => c.isCompleted).length,
        averageAccuracy:
          ladChapters.reduce((sum, c) => sum + (c.averageAccuracy || 0), 0) /
          ladChapters.length,
      },
    })
  }

  // Process MC
  if (rawCollections.MC) {
    const mcScriptures = await transformToScriptures(rawCollections.MC, 'MC')
    const mcChapters = createChapters(rawCollections.MC, mcScriptures, 'MC')

    transformedScriptures.push(...mcScriptures)
    transformedCollections.push({
      id: 'collection_mc',
      name: collectionDefinitions.MC.name,
      abbreviation: collectionDefinitions.MC.abbreviation,
      description: collectionDefinitions.MC.description,
      scriptures: mcScriptures.map((s) => s.id),
      createdAt: new Date().toISOString(),
      tags: ['megachurch', 'large-ministry', 'leadership'],
      isChapterBased: true,
      chapters: mcChapters,
      sourceBook: 'Mixed',
      bookInfo: {
        totalChapters: mcChapters.length,
        completedChapters: mcChapters.filter((c) => c.isCompleted).length,
        averageAccuracy:
          mcChapters.reduce((sum, c) => sum + (c.averageAccuracy || 0), 0) /
          mcChapters.length,
      },
    })
  }

  // Process TYPM
  if (rawCollections.TYPM) {
    const typmScriptures = await transformToScriptures(rawCollections.TYPM, 'TYPM')
    const typmChapters = createChapters(rawCollections.TYPM, typmScriptures, 'TYPM')

    transformedScriptures.push(...typmScriptures)
    transformedCollections.push({
      id: 'collection_typm',
      name: collectionDefinitions.TYPM.name,
      abbreviation: collectionDefinitions.TYPM.abbreviation,
      description: collectionDefinitions.TYPM.description,
      scriptures: typmScriptures.map((s) => s.id),
      createdAt: new Date().toISOString(),
      tags: ['transformation', 'pastoral', 'ministry'],
      isChapterBased: true,
      chapters: typmChapters,
      sourceBook: 'Mixed',
      bookInfo: {
        totalChapters: typmChapters.length,
        completedChapters: typmChapters.filter((c) => c.isCompleted).length,
        averageAccuracy:
          typmChapters.reduce((sum, c) => sum + (c.averageAccuracy || 0), 0) /
          typmChapters.length,
      },
    })
  }

  // Process AOL
  if (rawCollections.AOL) {
    const aolScriptures = await transformToScriptures(rawCollections.AOL, 'AOL')
    const aolChapters = createChapters(rawCollections.AOL, aolScriptures, 'AOL')

    transformedScriptures.push(...aolScriptures)
    transformedCollections.push({
      id: 'collection_aol',
      name: collectionDefinitions.AOL.name,
      abbreviation: collectionDefinitions.AOL.abbreviation,
      description: collectionDefinitions.AOL.description,
      scriptures: aolScriptures.map((s) => s.id),
      createdAt: new Date().toISOString(),
      tags: ['leadership', 'art', 'principles'],
      isChapterBased: true,
      chapters: aolChapters,
      sourceBook: 'Mixed',
      bookInfo: {
        totalChapters: aolChapters.length,
        completedChapters: aolChapters.filter((c) => c.isCompleted).length,
        averageAccuracy:
          aolChapters.reduce((sum, c) => sum + (c.averageAccuracy || 0), 0) /
          aolChapters.length,
      },
    })
  }

  console.log(`✅ Transformation complete: ${transformedCollections.length} collections, ${transformedScriptures.length} scriptures`)

  return {
    collections: transformedCollections,
    scriptures: transformedScriptures,
  }
}
