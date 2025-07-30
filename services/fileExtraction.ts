import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Scripture } from '@/types/scripture'

// File extraction types
export interface ExtractedDocument {
  id: string
  name: string
  type: 'pdf' | 'epub' | 'txt'
  size: number
  extractedAt: Date
  totalVerses: number
  extractedText: string
  verses: ExtractedVerse[]
}

export interface ExtractedVerse {
  id: string
  text: string
  reference?: string
  book?: string
  chapter?: number
  verse?: number
  confidence: number // 0-100, how confident we are this is a verse
  context?: string // surrounding text for context
}

export interface ExtractionProgress {
  stage: 'reading' | 'parsing' | 'extracting' | 'analyzing' | 'complete'
  progress: number // 0-100
  message: string
  currentVerse?: number
  totalVerses?: number
}

// Storage keys
const EXTRACTED_DOCUMENTS_KEY = '@spiritammo_extracted_documents'

class FileExtractionService {
  private documents: ExtractedDocument[] = []

  constructor() {
    this.loadExtractedDocuments()
  }

  // Load previously extracted documents
  private async loadExtractedDocuments() {
    try {
      const stored = await AsyncStorage.getItem(EXTRACTED_DOCUMENTS_KEY)
      if (stored) {
        this.documents = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load extracted documents:', error)
    }
  }

  // Save extracted documents
  private async saveExtractedDocuments() {
    try {
      await AsyncStorage.setItem(
        EXTRACTED_DOCUMENTS_KEY,
        JSON.stringify(this.documents)
      )
    } catch (error) {
      console.error('Failed to save extracted documents:', error)
    }
  }

  // Pick and extract file
  async pickAndExtractFile(
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<ExtractedDocument | null> {
    try {
      // Pick document
      onProgress?.({
        stage: 'reading',
        progress: 10,
        message: 'Opening file picker...',
      })

      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/epub+zip', 'text/plain'],
        copyToCacheDirectory: true,
      })

      if (result.canceled) {
        return null
      }

      const file = result.assets[0]

      onProgress?.({
        stage: 'reading',
        progress: 30,
        message: `Reading ${file.name}...`,
      })

      // Read file content
      const fileContent = await FileSystem.readAsStringAsync(file.uri)

      onProgress?.({
        stage: 'parsing',
        progress: 50,
        message: 'Parsing document content...',
      })

      // Determine file type and extract accordingly
      const fileType = this.getFileType(file.name, file.mimeType)
      let extractedText = ''

      switch (fileType) {
        case 'txt':
          extractedText = fileContent
          break
        case 'pdf':
          extractedText = await this.extractFromPDF(fileContent, onProgress)
          break
        case 'epub':
          extractedText = await this.extractFromEPUB(fileContent, onProgress)
          break
        default:
          throw new Error('Unsupported file type')
      }

      onProgress?.({
        stage: 'extracting',
        progress: 70,
        message: 'Extracting verses...',
      })

      // Extract verses from text
      const verses = await this.extractVerses(extractedText, onProgress)

      onProgress?.({
        stage: 'analyzing',
        progress: 90,
        message: 'Analyzing extracted content...',
      })

      // Create extracted document
      const extractedDoc: ExtractedDocument = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        name: file.name,
        type: fileType,
        size: file.size || 0,
        extractedAt: new Date(),
        totalVerses: verses.length,
        extractedText,
        verses,
      }

      // Save document
      this.documents.push(extractedDoc)
      await this.saveExtractedDocuments()

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: `Successfully extracted ${verses.length} verses!`,
        totalVerses: verses.length,
      })

      return extractedDoc
    } catch (error) {
      console.error('Failed to extract file:', error)
      onProgress?.({
        stage: 'complete',
        progress: 0,
        message: `Extraction failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      })
      return null
    }
  }

  // Determine file type
  private getFileType(
    fileName: string,
    mimeType?: string
  ): 'pdf' | 'epub' | 'txt' {
    const extension = fileName.toLowerCase().split('.').pop()

    if (extension === 'pdf' || mimeType === 'application/pdf') {
      return 'pdf'
    }
    if (extension === 'epub' || mimeType === 'application/epub+zip') {
      return 'epub'
    }
    return 'txt'
  }

  // Extract text from PDF (basic implementation)
  private async extractFromPDF(
    content: string,
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<string> {
    // For now, we'll implement a basic text extraction
    // In a production app, you'd use a proper PDF parsing library
    onProgress?.({
      stage: 'parsing',
      progress: 60,
      message: 'Parsing PDF content...',
    })

    // Basic PDF text extraction (this is simplified)
    // Real implementation would use pdf-parse or similar
    try {
      // Remove PDF metadata and extract readable text
      const textContent = content
        .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ') // Remove control characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()

      return textContent
    } catch (error) {
      console.error('PDF extraction error:', error)
      return content // Fallback to raw content
    }
  }

  // Extract text from EPUB (basic implementation)
  private async extractFromEPUB(
    content: string,
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<string> {
    onProgress?.({
      stage: 'parsing',
      progress: 60,
      message: 'Parsing EPUB content...',
    })

    // Basic EPUB text extraction
    // Real implementation would properly parse the EPUB structure
    try {
      // Remove HTML tags and extract text
      const textContent = content
        .replace(/<[^>]*>/g, ' ') // Remove HTML tags
        .replace(/&[^;]+;/g, ' ') // Remove HTML entities
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()

      return textContent
    } catch (error) {
      console.error('EPUB extraction error:', error)
      return content // Fallback to raw content
    }
  }

  // Extract verses from text using pattern matching
  private async extractVerses(
    text: string,
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<ExtractedVerse[]> {
    const verses: ExtractedVerse[] = []

    // Common verse patterns
    const versePatterns = [
      // Standard format: "Book Chapter:Verse"
      /([1-3]?\s*[A-Za-z]+)\s+(\d+):(\d+)[\s\-–—]*([^.!?]*[.!?])/g,
      // Alternative format: "Book Chapter.Verse"
      /([1-3]?\s*[A-Za-z]+)\s+(\d+)\.(\d+)[\s\-–—]*([^.!?]*[.!?])/g,
      // Verse with quotation marks
      /"([^"]+)"\s*[-–—]\s*([1-3]?\s*[A-Za-z]+)\s+(\d+):(\d+)/g,
    ]

    let totalMatches = 0
    let processedMatches = 0

    // First pass: count total potential matches
    for (const pattern of versePatterns) {
      const matches = text.matchAll(pattern)
      for (const _ of matches) {
        totalMatches++
      }
    }

    onProgress?.({
      stage: 'extracting',
      progress: 75,
      message: `Found ${totalMatches} potential verses...`,
      totalVerses: totalMatches,
    })

    // Second pass: extract verses
    for (const pattern of versePatterns) {
      const matches = text.matchAll(pattern)

      for (const match of matches) {
        processedMatches++

        let book: string, chapter: number, verse: number, verseText: string

        if (match[4]) {
          // Standard format
          ;[, book, chapter, verse, verseText] = match.map((m, i) =>
            i === 2 || i === 3 ? parseInt(m) : m?.trim()
          ) as [string, string, number, number, string]
        } else {
          // Quote format
          ;[, verseText, book, chapter, verse] = match.map((m, i) =>
            i === 3 || i === 4 ? parseInt(m) : m?.trim()
          ) as [string, string, string, number, number]
        }

        // Clean up the verse text
        const cleanText = verseText
          .replace(/^\s*[-–—"']\s*/, '') // Remove leading punctuation
          .replace(/\s*[-–—"']\s*$/, '') // Remove trailing punctuation
          .trim()

        if (cleanText.length > 10 && cleanText.length < 500) {
          // Reasonable verse length
          const extractedVerse: ExtractedVerse = {
            id: `verse_${Date.now()}_${verses.length}`,
            text: cleanText,
            reference: `${book} ${chapter}:${verse}`,
            book: book.replace(/^\d+\s*/, ''), // Remove leading numbers
            chapter,
            verse,
            confidence: this.calculateConfidence(cleanText, book),
            context: this.extractContext(text, match.index || 0, 100),
          }

          verses.push(extractedVerse)
        }

        // Update progress
        if (processedMatches % 10 === 0) {
          onProgress?.({
            stage: 'extracting',
            progress: 75 + (processedMatches / totalMatches) * 15,
            message: `Processed ${processedMatches}/${totalMatches} verses...`,
            currentVerse: processedMatches,
            totalVerses: totalMatches,
          })
        }
      }
    }

    // If no verses found with patterns, try to extract by sentence structure
    if (verses.length === 0) {
      const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 20)

      sentences.forEach((sentence, index) => {
        if (this.looksLikeVerse(sentence)) {
          verses.push({
            id: `verse_${Date.now()}_${index}`,
            text: sentence.trim(),
            confidence: 50, // Lower confidence for pattern-less extraction
            context: sentences
              .slice(Math.max(0, index - 1), index + 2)
              .join('. '),
          })
        }
      })
    }

    return verses.filter((v) => v.confidence > 30) // Filter low-confidence verses
  }

  // Calculate confidence score for extracted verse
  private calculateConfidence(text: string, book?: string): number {
    let confidence = 50 // Base confidence

    // Increase confidence for biblical language patterns
    const biblicalWords = [
      'lord',
      'god',
      'jesus',
      'christ',
      'holy',
      'spirit',
      'father',
      'heaven',
      'blessed',
      'righteousness',
      'salvation',
      'faith',
      'love',
      'peace',
      'joy',
      'prayer',
      'worship',
      'praise',
      'glory',
      'amen',
      'hallelujah',
    ]

    const lowerText = text.toLowerCase()
    const biblicalWordCount = biblicalWords.filter((word) =>
      lowerText.includes(word)
    ).length
    confidence += biblicalWordCount * 5

    // Increase confidence if book name is recognized
    if (book && this.isKnownBibleBook(book)) {
      confidence += 20
    }

    // Decrease confidence for very short or very long text
    if (text.length < 20) confidence -= 20
    if (text.length > 300) confidence -= 10

    // Increase confidence for proper sentence structure
    if (/^[A-Z]/.test(text) && /[.!?]$/.test(text)) {
      confidence += 10
    }

    return Math.min(100, Math.max(0, confidence))
  }

  // Check if text looks like a verse
  private looksLikeVerse(text: string): boolean {
    const trimmed = text.trim()

    // Basic heuristics
    return (
      trimmed.length > 20 &&
      trimmed.length < 400 &&
      /^[A-Z]/.test(trimmed) &&
      !/^(Chapter|Section|Part|Page|\d+\.)/.test(trimmed) &&
      (trimmed.includes('Lord') ||
        trimmed.includes('God') ||
        trimmed.includes('Jesus'))
    )
  }

  // Extract context around a match
  private extractContext(
    text: string,
    index: number,
    contextLength: number
  ): string {
    const start = Math.max(0, index - contextLength)
    const end = Math.min(text.length, index + contextLength)
    return text.substring(start, end).trim()
  }

  // Check if book name is a known Bible book
  private isKnownBibleBook(book: string): boolean {
    const bibleBooks = [
      'Genesis',
      'Exodus',
      'Leviticus',
      'Numbers',
      'Deuteronomy',
      'Joshua',
      'Judges',
      'Ruth',
      'Samuel',
      'Kings',
      'Chronicles',
      'Ezra',
      'Nehemiah',
      'Esther',
      'Job',
      'Psalms',
      'Proverbs',
      'Ecclesiastes',
      'Song',
      'Isaiah',
      'Jeremiah',
      'Lamentations',
      'Ezekiel',
      'Daniel',
      'Hosea',
      'Joel',
      'Amos',
      'Obadiah',
      'Jonah',
      'Micah',
      'Nahum',
      'Habakkuk',
      'Zephaniah',
      'Haggai',
      'Zechariah',
      'Malachi',
      'Matthew',
      'Mark',
      'Luke',
      'John',
      'Acts',
      'Romans',
      'Corinthians',
      'Galatians',
      'Ephesians',
      'Philippians',
      'Colossians',
      'Thessalonians',
      'Timothy',
      'Titus',
      'Philemon',
      'Hebrews',
      'James',
      'Peter',
      'Jude',
      'Revelation',
    ]

    const normalizedBook = book.replace(/^\d+\s*/, '').toLowerCase()
    return bibleBooks.some(
      (b) =>
        b.toLowerCase().includes(normalizedBook) ||
        normalizedBook.includes(b.toLowerCase())
    )
  }

  // Convert extracted verses to Scripture format
  convertToScriptures(
    document: ExtractedDocument,
    selectedVerses?: string[]
  ): Scripture[] {
    const versesToConvert = selectedVerses
      ? document.verses.filter((v) => selectedVerses.includes(v.id))
      : document.verses

    return versesToConvert.map((verse) => ({
      id: `imported_${verse.id}`,
      book: verse.book || 'Unknown',
      chapter: verse.chapter || 1,
      verse: verse.verse || 1,
      text: verse.text,
      reference: verse.reference || `Unknown ${verse.id}`,
      source: `Imported from ${document.name}`,
      importedAt: new Date().toISOString(),
    }))
  }

  // Analyze document for chapter organization potential
  analyzeForChapterOrganization(
    document: ExtractedDocument,
    selectedVerses?: string[]
  ): {
    canBeChapterBased: boolean
    suggestedName: string
    sourceBook?: string
    stats: {
      totalBooks: number
      totalChapters: number
      singleBook: boolean
    }
  } {
    const versesToAnalyze = selectedVerses
      ? document.verses.filter((v) => selectedVerses.includes(v.id))
      : document.verses

    const books = new Set<string>()
    const chapters = new Set<string>()

    versesToAnalyze.forEach((verse) => {
      if (verse.book) books.add(verse.book)
      if (verse.book && verse.chapter) {
        chapters.add(`${verse.book}_${verse.chapter}`)
      }
    })

    const totalBooks = books.size
    const totalChapters = chapters.size
    const singleBook = totalBooks === 1
    const sourceBook = singleBook ? Array.from(books)[0] : undefined

    // Suggest collection name based on content
    let suggestedName = `Imported from ${document.name}`
    if (singleBook && sourceBook) {
      if (totalChapters === 1) {
        const firstVerse = versesToAnalyze.find((v) => v.book === sourceBook)
        suggestedName = `${sourceBook} ${firstVerse?.chapter || ''}`
      } else {
        suggestedName = `${sourceBook} Collection`
      }
    } else if (totalBooks <= 3) {
      suggestedName = `${Array.from(books).join(', ')} Collection`
    }

    const canBeChapterBased =
      totalChapters > 1 && (singleBook || totalBooks <= 3)

    return {
      canBeChapterBased,
      suggestedName,
      sourceBook,
      stats: {
        totalBooks,
        totalChapters,
        singleBook,
      },
    }
  }

  // Get all extracted documents
  getExtractedDocuments(): ExtractedDocument[] {
    return [...this.documents]
  }

  // Get document by ID
  getDocumentById(id: string): ExtractedDocument | null {
    return this.documents.find((doc) => doc.id === id) || null
  }

  // Delete extracted document
  async deleteDocument(id: string): Promise<boolean> {
    try {
      this.documents = this.documents.filter((doc) => doc.id !== id)
      await this.saveExtractedDocuments()
      return true
    } catch (error) {
      console.error('Failed to delete document:', error)
      return false
    }
  }
}

// Export singleton instance
export const fileExtractionService = new FileExtractionService()
