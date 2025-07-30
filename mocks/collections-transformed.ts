import { Collection, Scripture, CollectionChapter } from '@/types/scripture'

// Helper function to clean HTML from text
const cleanText = (htmlText: string): string => {
  return htmlText
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim()
}

// Helper function to extract verse number from reference
const extractVerseInfo = (reference: string) => {
  const match = reference.match(/(\d*\s*\w+)\s+(\d+):?(\d+)?/)
  if (match) {
    const book = match[1].trim()
    const chapter = parseInt(match[2])
    const verse = match[3] ? parseInt(match[3]) : 1
    return { book, chapter, verse }
  }
  return { book: 'Unknown', chapter: 1, verse: 1 }
}

// Transform raw data to Scripture format
const transformToScriptures = (
  rawData: any,
  collectionAbbr: string
): Scripture[] => {
  const scriptures: Scripture[] = []
  let scriptureId = 1

  Object.keys(rawData).forEach((chapterKey) => {
    const chapterNumber = parseInt(chapterKey)
    const verses = rawData[chapterKey]

    verses.forEach((verse: any, index: number) => {
      const {
        book,
        chapter,
        verse: verseNum,
      } = extractVerseInfo(verse.reference)
      const cleanedText = cleanText(verse.text)

      scriptures.push({
        id: `${collectionAbbr}_${chapterNumber}_${scriptureId}`,
        book,
        chapter,
        verse: verseNum,
        text: cleanedText,
        reference: verse.reference,
        source: `${collectionAbbr} Collection`,
        accuracy: Math.floor(Math.random() * 30) + 70, // Random accuracy 70-100%
        practiceCount: Math.floor(Math.random() * 10),
        lastPracticed: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      })
      scriptureId++
    })
  })

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
      isCompleted: Math.random() > 0.7, // Random completion status
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

// Collection definitions with full names and abbreviations
const collectionDefinitions = {
  POSE: {
    name: 'What it Means to be a Shepherd',
    abbreviation: 'POSE',
    description:
      "Biblical teachings on pastoral care and shepherding God's people",
  },
  LAD: {
    name: 'Loyalty and Disloyalty',
    abbreviation: 'LAD',
    description:
      'Scriptures about faithfulness, betrayal, and loyalty in leadership',
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
    name: 'Art of Leadership',
    abbreviation: 'AOL',
    description: 'Biblical principles of effective Christian leadership',
  },
}

// Raw data import (you'll need to import your actual raw data here)
import { collections as rawCollections } from './collections-raw'

// Transform all collections
export const transformedCollections: Collection[] = []
export const transformedScriptures: Scripture[] = []

// Process POSE collection (What it Means to be a Shepherd)
if (rawCollections.POSE) {
  const poseScriptures = transformToScriptures(rawCollections.POSE, 'POSE')
  const poseChapters = createChapters(
    rawCollections.POSE,
    poseScriptures,
    'POSE'
  )

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

// Process LAD collection (Loyalty and Disloyalty)
if (rawCollections.LAD) {
  const ladScriptures = transformToScriptures(rawCollections.LAD, 'LAD')
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

// Process remaining collections if they exist in raw data
// Note: Add MC, TYPM, AOL processing here when raw data is available

// For now, create placeholder collections for the other abbreviations
const placeholderCollections = [
  {
    id: 'collection_mc',
    name: collectionDefinitions.MC.name,
    abbreviation: collectionDefinitions.MC.abbreviation,
    description: collectionDefinitions.MC.description,
    scriptures: [],
    createdAt: new Date().toISOString(),
    tags: ['megachurch', 'large-ministry', 'leadership'],
    isChapterBased: false,
  },
  {
    id: 'collection_typm',
    name: collectionDefinitions.TYPM.name,
    abbreviation: collectionDefinitions.TYPM.abbreviation,
    description: collectionDefinitions.TYPM.description,
    scriptures: [],
    createdAt: new Date().toISOString(),
    tags: ['transformation', 'pastoral', 'ministry'],
    isChapterBased: false,
  },
  {
    id: 'collection_aol',
    name: collectionDefinitions.AOL.name,
    abbreviation: collectionDefinitions.AOL.abbreviation,
    description: collectionDefinitions.AOL.description,
    scriptures: [],
    createdAt: new Date().toISOString(),
    tags: ['leadership', 'art', 'principles'],
    isChapterBased: false,
  },
]

// Add placeholder collections (will be replaced when raw data is available)
transformedCollections.push(...placeholderCollections)

// Export for use in the app
export {
  transformedCollections as collections,
  transformedScriptures as scriptures,
}
