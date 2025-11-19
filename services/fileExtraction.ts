import * as DocumentPicker from 'expo-document-picker'
// Use legacy import as suggested by error message for readAsStringAsync
import * as FileSystem from 'expo-file-system/legacy'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Scripture } from '@/types/scripture'
import JSZip from 'jszip'

// File extraction types

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

  // Pick file (step 1)
  async pickFile(): Promise<{ uri: string; name: string; size?: number; mimeType?: string } | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/epub+zip', 'text/plain'],
        copyToCacheDirectory: true,
      })

      if (result.canceled) return null
      const asset = result.assets?.[0]
      if (!asset) return null

      return {
        uri: asset.uri,
        name: asset.name,
        size: asset.size,
        mimeType: asset.mimeType,
      }
    } catch (error) {
      console.error('Failed to pick file:', error)
      return null
    }
  }

  // Extract text from non-PDF files (step 2a)
  async extractTextFromFile(
    uri: string,
    fileType: 'epub' | 'txt',
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<string> {
    if (fileType === 'txt') {
      return await FileSystem.readAsStringAsync(uri)
    } else if (fileType === 'epub') {
      return await this.extractFromEPUB(uri, onProgress)
    }
    return ''
  }

  // Process extracted text into verses and save (step 3)
  async processExtractedText(
    text: string,
    fileName: string,
    fileType: 'pdf' | 'epub' | 'txt',
    fileSize: number,
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<ExtractedDocument> {
    try {
      onProgress?.({
        stage: 'extracting',
        progress: 70,
        message: 'Extracting verses...',
      })

      const verses = await this.extractVerses(text, onProgress)

      onProgress?.({
        stage: 'analyzing',
        progress: 90,
        message: 'Analyzing extracted content...',
      })

      const extractedDoc: ExtractedDocument = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        name: fileName,
        type: fileType,
        size: fileSize,
        extractedAt: new Date(),
        totalVerses: verses.length,
        extractedText: text,
        verses,
      }

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
      console.error('Processing error:', error)
      throw error
    }
  }

  // Deprecated: Keep for backward compatibility if needed, but it won't handle PDF anymore
  async pickAndExtractFile(
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<ExtractedDocument | null> {
    throw new Error('Use pickFile and processExtractedText instead')
  }

  // Determine file type
  getFileType(
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



  // Extract text from EPUB
  private async extractFromEPUB(
    uri: string,
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<string> {
    onProgress?.({
      stage: 'reading',
      progress: 40,
      message: 'Reading EPUB file...',
    })

    try {
      const fileContent = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      })

      onProgress?.({
        stage: 'parsing',
        progress: 50,
        message: 'Unzipping EPUB container...',
      })

      const zip = await JSZip.loadAsync(fileContent, { base64: true })

      // Find OPF file from container.xml
      const containerXml = await zip.file('META-INF/container.xml')?.async('string')
      if (!containerXml) throw new Error('Invalid EPUB: Missing container.xml')

      const opfPathMatch = containerXml.match(/full-path="([^"]+)"/)
      const opfPath = opfPathMatch ? opfPathMatch[1] : null
      if (!opfPath) throw new Error('Invalid EPUB: Could not find OPF path')

      // Read OPF file
      const opfContent = await zip.file(opfPath)?.async('string')
      if (!opfContent) throw new Error('Invalid EPUB: Missing OPF file')

      // Parse spine to get reading order
      // Simple regex parsing to avoid XML parser dependency if possible, 
      // but we can use fast-xml-parser if needed. For now, regex.
      const manifestItems: Record<string, string> = {}
      const manifestRegex = /<item[^>]*id="([^"]+)"[^>]*href="([^"]+)"/g
      let match
      while ((match = manifestRegex.exec(opfContent)) !== null) {
        manifestItems[match[1]] = match[2]
      }

      const spineRegex = /<itemref[^>]*idref="([^"]+)"/g
      const spineIds: string[] = []
      while ((match = spineRegex.exec(opfContent)) !== null) {
        spineIds.push(match[1])
      }

      // Resolve relative paths
      const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : ''

      let fullText = ''
      let processedItems = 0

      onProgress?.({
        stage: 'extracting',
        progress: 60,
        message: 'Extracting text from chapters...',
      })

      for (const id of spineIds) {
        const href = manifestItems[id]
        if (href) {
          const filePath = opfDir + href
          const content = await zip.file(filePath)?.async('string')

          if (content) {
            // Strip HTML tags
            const text = content
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
              .replace(/<[^>]+>/g, ' ') // Remove tags
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/\s+/g, ' ')
              .trim()

            fullText += text + '\n\n'
          }
        }

        processedItems++
        if (processedItems % 5 === 0) {
          onProgress?.({
            stage: 'extracting',
            progress: 60 + Math.floor((processedItems / spineIds.length) * 20),
            message: `Processed ${processedItems}/${spineIds.length} chapters...`,
          })
        }
      }

      return fullText
    } catch (error) {
      console.error('EPUB extraction error:', error)
      throw new Error(`Failed to parse EPUB: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
      const matches = Array.from(text.matchAll(pattern))
      totalMatches += matches.length
    }

    onProgress?.({
      stage: 'extracting',
      progress: 75,
      message: `Found ${totalMatches} potential verses...`,
      totalVerses: totalMatches,
    })

    // Second pass: extract verses
    for (const pattern of versePatterns) {
      const matches = Array.from(text.matchAll(pattern))

      for (const match of matches) {
        processedMatches++

        let book = ''
        let chapter = 0
        let verseNum = 0
        let verseText = ''

        // Determine mapping based on pattern shape
        if (pattern === versePatterns[2]) {
          // Quote format: "text" - Book Chapter:Verse
          verseText = match[1] || ''
          book = (match[2] || '').toString()
          chapter = parseInt(match[3]) || 0
          verseNum = parseInt(match[4]) || 0
        } else {
          // Standard formats: Book Chapter:Verse <text>  OR Book Chapter.Verse <text>
          book = (match[1] || '').toString()
          chapter = parseInt(match[2]) || 0
          verseNum = parseInt(match[3]) || 0
          verseText = match[4] || ''
        }

        // Clean up the verse text
        const cleanText = (verseText || '')
          .replace(/^\s*[-–—"']\s*/, '')
          .replace(/\s*[-–—"']\s*$/, '')
          .trim()

        if (cleanText.length > 10 && cleanText.length < 500) {
          // Reasonable verse length
          const extractedVerse: ExtractedVerse = {
            id: `verse_${Date.now()}_${verses.length}`,
            text: cleanText,
            reference: `${book} ${chapter}:${verseNum}`,
            book: book.replace(/^\d+\s*/, ''), // Remove leading numbers
            chapter,
            verse: verseNum,
            confidence: this.calculateConfidence(cleanText, book),
            context: this.extractContext(text, match.index || 0, 100),
          }

          verses.push(extractedVerse)
        }

        // Update progress (guard divide-by-zero)
        if (totalMatches > 0 && processedMatches % 10 === 0) {
          const pct = 75 + (processedMatches / totalMatches) * 15
          onProgress?.({
            stage: 'extracting',
            progress: Math.min(90, Math.round(pct)),
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
