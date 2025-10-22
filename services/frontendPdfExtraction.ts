// Platform-specific FileSystem import
import { Platform } from 'react-native'

let FileSystem: any = null

// Import FileSystem based on platform
if (Platform.OS === 'web') {
  // Use web stub on web platform
  const webFileSystem = require('./webFileSystemStub').default
  FileSystem = webFileSystem
} else {
  // Use native expo-file-system on mobile platforms
  try {
    FileSystem = require('expo-file-system')
  } catch (error) {
    console.error('Failed to import expo-file-system:', error)
    throw new Error('expo-file-system is required for mobile platforms')
  }
}

// Import PDF.js for different platforms with improved error handling
let pdfjs: any = null
let getDocument: any = null
let GlobalWorkerOptions: any = null
let pdfJsAvailable = false

// Initialize PDF.js only on web platform with comprehensive error handling
if (Platform.OS === 'web') {
  try {
    console.log('🌐 Web platform detected - initializing PDF.js...')
    
    // Try dynamic import first (better for bundling)
    let pdfJsModule: any
    try {
      pdfJsModule = require('pdfjs-dist')
    } catch (requireError) {
      console.warn('⚠️ Standard require failed, trying alternative import...')
      // Alternative import method
      pdfJsModule = require('pdfjs-dist/build/pdf')
    }
    
    // Extract PDF.js components with null checks
    if (pdfJsModule) {
      pdfjs = pdfJsModule.pdfjs || pdfJsModule.default || pdfJsModule
      getDocument = pdfJsModule.getDocument || (pdfjs && pdfjs.getDocument)
      GlobalWorkerOptions = pdfJsModule.GlobalWorkerOptions || (pdfjs && pdfjs.GlobalWorkerOptions)
      
      console.log('📄 PDF.js module loaded:', {
        hasGetDocument: !!getDocument,
        hasGlobalWorkerOptions: !!GlobalWorkerOptions,
        hasPdfjs: !!pdfjs
      })
      
      // Configure worker with multiple fallback options
      if (GlobalWorkerOptions && typeof GlobalWorkerOptions === 'object') {
        try {
          // Try setting worker from CDN
          GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`
          console.log('✅ PDF.js worker configured from CDN')
          pdfJsAvailable = true
        } catch (workerError) {
          console.warn('⚠️ Failed to set CDN worker, trying fallback...', workerError)
          try {
            // Fallback: try local worker
            GlobalWorkerOptions.workerSrc = require('pdfjs-dist/build/pdf.worker.entry')
            console.log('✅ PDF.js worker configured from local bundle')
            pdfJsAvailable = true
          } catch (localError) {
            console.warn('⚠️ Local worker also failed, disabling worker...', localError)
            GlobalWorkerOptions.workerSrc = ''
            pdfJsAvailable = !!getDocument // Still try without worker
          }
        }
      } else {
        console.warn('⚠️ GlobalWorkerOptions not available - PDF.js may run without worker')
        pdfJsAvailable = !!getDocument // Try without worker if getDocument is available
      }
    } else {
      throw new Error('PDF.js module could not be loaded')
    }
  } catch (error) {
    console.error('❌ Failed to initialize PDF.js for web:', error)
    // Complete fallback: disable PDF.js
    pdfjs = null
    getDocument = null
    GlobalWorkerOptions = null
    pdfJsAvailable = false
  }
} else {
  console.log('📱 Mobile platform detected - PDF.js not needed for native extraction')
}

import type {
  PDFDocumentProxy,
  TextItem,
} from 'pdfjs-dist/types/src/display/api'

export interface FrontendPDFExtractionResult {
  success: boolean
  text: string
  method: string
  confidence: number
  metadata: {
    totalPages: number
    totalWords: number
    totalCharacters: number
    pagesProcessed: number
    pagesWithErrors: number
  }
  error?: string
}

export class FrontendPDFExtractionService {
  async extractFromPDF(
    uri: string,
    onProgress?: (progress: {
      stage: string
      progress: number
      message: string
    }) => void
  ): Promise<FrontendPDFExtractionResult> {
    try {
      onProgress?.({
        stage: 'loading',
        progress: 10,
        message: 'Loading PDF document...',
      })

      // Read PDF file as base64
      const base64Content = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      onProgress?.({
        stage: 'parsing',
        progress: 30,
        message: 'Processing PDF data...',
      })

      // Try different extraction methods based on platform
      if (Platform.OS === 'web' && pdfJsAvailable && getDocument) {
        return await this.extractWithPDFJS(base64Content, onProgress)
      } else {
        console.log('📝 Using native extraction methods (PDF.js unavailable or mobile platform)')
        return await this.extractWithNativeMethods(base64Content, onProgress)
      }
    } catch (error) {
      console.error('❌ PDF extraction failed:', error)

      return {
        success: false,
        text: '',
        method: 'PDF Extraction',
        confidence: 0,
        metadata: {
          totalPages: 0,
          totalWords: 0,
          totalCharacters: 0,
          pagesProcessed: 0,
          pagesWithErrors: 1,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  private async extractWithPDFJS(
    base64Content: string,
    onProgress?: (progress: {
      stage: string
      progress: number
      message: string
    }) => void
  ): Promise<FrontendPDFExtractionResult> {
    onProgress?.({
      stage: 'parsing',
      progress: 40,
      message: 'Using PDF.js for extraction...',
    })

    // Convert base64 to Uint8Array
    const binaryString = atob(base64Content)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Load PDF document with PDF.js
    const loadingTask = getDocument({
      data: bytes,
      useSystemFonts: true,
      disableFontFace: false,
      verbosity: 0,
    })

    const pdf: PDFDocumentProxy = await loadingTask.promise
    console.log(`📄 PDF.js loaded: ${pdf.numPages} pages`)

    onProgress?.({
      stage: 'extracting',
      progress: 60,
      message: `Extracting text from ${pdf.numPages} pages...`,
    })

    let fullText = ''
    let pagesProcessed = 0
    let pagesWithErrors = 0
    const totalPages = pdf.numPages

    // Extract text from each page
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        onProgress?.({
          stage: 'extracting',
          progress: 60 + (pageNum / totalPages) * 30,
          message: `Processing page ${pageNum}/${totalPages}...`,
        })

        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()

        // Process text items with better handling
        const pageText = this.processTextContent(textContent)

        if (pageText.trim()) {
          fullText += pageText + '\n\n'
          pagesProcessed++
        }

        console.log(
          `📖 Page ${pageNum}: ${pageText.length} characters extracted`
        )
      } catch (pageError) {
        console.error(`❌ Error processing page ${pageNum}:`, pageError)
        pagesWithErrors++
      }
    }

    return this.buildExtractionResult(
      fullText,
      `PDF.js (${pagesProcessed}/${totalPages} pages)`,
      totalPages,
      pagesProcessed,
      pagesWithErrors
    )
  }

  private async extractWithNativeMethods(
    base64Content: string,
    onProgress?: (progress: {
      stage: string
      progress: number
      message: string
    }) => void
  ): Promise<FrontendPDFExtractionResult> {
    onProgress?.({
      stage: 'parsing',
      progress: 40,
      message: 'Using native extraction methods...',
    })

    const binaryString = atob(base64Content)
    let extractedText = ''
    let totalPages = 0
    let confidence = 0

    try {
      // Method 1: Extract from text streams
      onProgress?.({
        stage: 'extracting',
        progress: 50,
        message: 'Extracting from text streams...',
      })
      
      const textStreamResult = this.extractFromTextStreams(binaryString)
      
      // Method 2: Extract from content streams
      onProgress?.({
        stage: 'extracting',
        progress: 70,
        message: 'Extracting from content streams...',
      })
      
      const contentStreamResult = this.extractFromContentStreams(binaryString)
      
      // Method 3: Basic binary extraction
      onProgress?.({
        stage: 'extracting',
        progress: 80,
        message: 'Applying binary extraction...',
      })
      
      const binaryResult = this.extractFromBinaryData(binaryString)
      
      // Combine results and pick the best one
      const results = [
        { text: textStreamResult, method: 'Text Streams' },
        { text: contentStreamResult, method: 'Content Streams' },
        { text: binaryResult, method: 'Binary Data' },
      ]
      
      // Calculate confidence for each method
      const scoredResults = results.map(result => ({
        ...result,
        confidence: this.calculateTextConfidence(result.text),
      }))
      
      // Pick the best result
      const bestResult = scoredResults.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      )
      
      extractedText = bestResult.text
      confidence = bestResult.confidence
      
      // Try to estimate page count
      totalPages = Math.max(1, Math.floor(extractedText.length / 2000))
      
      console.log(`✨ Native extraction complete: ${bestResult.method} with ${confidence}% confidence`)
      
    } catch (error) {
      console.error('❌ Native extraction failed:', error)
      throw error
    }

    return this.buildExtractionResult(
      extractedText,
      `Native Mobile (${totalPages} estimated pages)`,
      totalPages,
      1,
      0
    )
  }

  private extractFromTextStreams(binaryString: string): string {
    // Enhanced text stream extraction with better decoding
    const textStreams = []
    
    // Look for text in parentheses (most common PDF text format)
    const parenthesesMatches = binaryString.match(/\(([^)]+)\)/g) || []
    
    // Look for text in angle brackets
    const angleBracketMatches = binaryString.match(/<([^>]+)>/g) || []
    
    // Look for text in square brackets
    const squareBracketMatches = binaryString.match(/\[([^\]]+)\]/g) || []
    
    const allMatches = [...parenthesesMatches, ...angleBracketMatches, ...squareBracketMatches]
    
    return allMatches
      .map(match => {
        let text = match.slice(1, -1) // Remove brackets
        
        // Decode common PDF escape sequences
        text = text.replace(/\\([0-7]{3})/g, (match, octal) => {
          const charCode = parseInt(octal, 8)
          return charCode >= 32 && charCode <= 126 ? String.fromCharCode(charCode) : ' '
        })
        
        // Handle standard escape sequences
        text = text.replace(/\\n/g, '\n')
        text = text.replace(/\\r/g, '\r')
        text = text.replace(/\\t/g, '\t')
        text = text.replace(/\\\\/g, '\\')
        text = text.replace(/\\'/g, "'")
        text = text.replace(/\\"/g, '"')
        
        // Handle Unicode sequences
        text = text.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
          return String.fromCharCode(parseInt(hex, 16))
        })
        
        return this.cleanPdfText(text)
      })
      .filter(text => text.length > 1 && /[a-zA-Z]/.test(text))
      .join(' ')
  }
  
  private extractFromContentStreams(binaryString: string): string {
    // Look for BT/ET blocks (text blocks in PDF)
    const btBlocks = binaryString.match(/BT\s+(.*?)\s+ET/gs) || []
    
    const extractedTexts = btBlocks.map(block => {
      let blockText = ''
      
      // Extract text from Tj and TJ commands
      const tjMatches = block.match(/\(([^)]+)\)\s*T[jJ]/g) || []
      const arrayMatches = block.match(/\[([^\]]+)\]\s*TJ/g) || []
      
      // Process Tj commands
      tjMatches.forEach(tj => {
        const text = tj.match(/\(([^)]+)\)/)?.[1] || ''
        blockText += this.cleanPdfText(text) + ' '
      })
      
      // Process TJ array commands
      arrayMatches.forEach(array => {
        const content = array.match(/\[([^\]]+)\]/)?.[1] || ''
        const strings = content.match(/\(([^)]+)\)/g) || []
        strings.forEach(str => {
          const text = str.slice(1, -1)
          blockText += this.cleanPdfText(text) + ' '
        })
      })
      
      return blockText.trim()
    })
    
    return extractedTexts.filter(text => text.length > 0).join(' ')
  }
  
  private extractFromBinaryData(binaryString: string): string {
    // Extract readable text from binary data with improved filtering
    let text = ''
    let currentWord = ''
    
    for (let i = 0; i < binaryString.length; i++) {
      const char = binaryString[i]
      const charCode = char.charCodeAt(0)
      
      // Include printable ASCII characters
      if (charCode >= 32 && charCode <= 126) {
        if (charCode >= 65 && charCode <= 90 || // A-Z
            charCode >= 97 && charCode <= 122 || // a-z
            charCode >= 48 && charCode <= 57 || // 0-9
            [32, 39, 44, 46, 58, 59, 63, 33].includes(charCode)) { // space, ', ,, ., :, ;, ?, !
          currentWord += char
        } else if (currentWord.length > 2) {
          text += currentWord + ' '
          currentWord = ''
        }
      } else if (currentWord.length > 2) {
        text += currentWord + ' '
        currentWord = ''
      }
    }
    
    // Add the last word if it exists
    if (currentWord.length > 2) {
      text += currentWord
    }
    
    return this.cleanExtractedText(text)
  }
  
  private calculateTextConfidence(text: string): number {
    if (!text || text.length < 10) return 0
    
    let confidence = 0
    
    // Length factor (more text = higher confidence)
    if (text.length > 1000) confidence += 30
    else if (text.length > 500) confidence += 25
    else if (text.length > 100) confidence += 20
    else if (text.length > 50) confidence += 15
    else confidence += 10
    
    // Readable character ratio
    const readableChars = text.match(/[a-zA-Z]/g)?.length || 0
    const readableRatio = readableChars / text.length
    confidence += readableRatio * 30
    
    // Word structure and spacing
    const words = text.split(/\s+/).filter(word => word.length > 1)
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length
    
    if (avgWordLength >= 3 && avgWordLength <= 8) confidence += 15
    if (words.length > 50) confidence += 10
    
    // Biblical content indicators
    const biblicalWords = ['God', 'Lord', 'Jesus', 'Christ', 'heaven', 'earth', 'love', 'faith', 'spirit', 'word', 'truth', 'salvation']
    const biblicalMatches = biblicalWords.filter(word =>
      text.toLowerCase().includes(word.toLowerCase())
    ).length
    confidence += Math.min(biblicalMatches * 3, 15)
    
    // Verse reference patterns
    const verseReferences = text.match(/\d+:\d+/g)?.length || 0
    if (verseReferences > 10) confidence += 15
    else if (verseReferences > 5) confidence += 10
    else if (verseReferences > 0) confidence += 5
    
    // Sentence structure
    if (/[.!?]/.test(text)) confidence += 5
    if (/[A-Z][a-z]/.test(text)) confidence += 5
    
    return Math.min(100, Math.max(0, Math.round(confidence)))
  }
  
  private buildExtractionResult(
    fullText: string,
    method: string,
    totalPages: number,
    pagesProcessed: number,
    pagesWithErrors: number
  ): FrontendPDFExtractionResult {
    const cleanedText = this.cleanExtractedText(fullText)
    const wordCount = cleanedText
      .split(/\s+/)
      .filter((word) => word.length > 0).length
    const confidence = this.calculateConfidence(
      cleanedText,
      totalPages,
      pagesProcessed,
      pagesWithErrors
    )
    
    console.log(
      `✅ PDF extraction complete: ${wordCount} words, ${confidence}% confidence`
    )
    
    return {
      success: true,
      text: cleanedText,
      method,
      confidence,
      metadata: {
        totalPages,
        totalWords: wordCount,
        totalCharacters: cleanedText.length,
        pagesProcessed,
        pagesWithErrors,
      },
    }
  }
  
  private processTextContent(textContent: any): string {
    const textItems = textContent.items
    let pageText = ''

    // Group text items by their vertical position to maintain reading order
    const lines: { [key: number]: TextItem[] } = {}

    textItems.forEach((item: any) => {
      if (item.str && item.str.trim()) {
        // Round Y position to group items on the same line
        const lineY = Math.round(item.transform[5] / 5) * 5
        if (!lines[lineY]) {
          lines[lineY] = []
        }
        lines[lineY].push(item)
      }
    })

    // Sort lines by Y position (top to bottom)
    const sortedLines = Object.keys(lines)
      .map((y) => parseInt(y))
      .sort((a, b) => b - a) // Descending order (PDF coordinates)

    // Process each line
    sortedLines.forEach((lineY) => {
      const lineItems = lines[lineY]

      // Sort items in the line by X position (left to right)
      lineItems.sort((a, b) => a.transform[4] - b.transform[4])

      // Combine text items in the line
      const lineText = lineItems
        .map((item) => this.cleanTextItem(item.str))
        .filter((text) => text.length > 0)
        .join(' ')

      if (lineText.trim()) {
        pageText += lineText + '\n'
      }
    })

    return pageText
  }

  private cleanTextItem(text: string): string {
    return (
      text
        // Remove control characters but keep basic punctuation
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
        // Remove or replace problematic Unicode characters
        .replace(/[\uFEFF\uFFFE\uFFFF]/g, '') // BOM and invalid chars
        // Handle common PDF encoding issues
        .replace(/\\([0-7]{3})/g, (match, octal) => {
          const charCode = parseInt(octal, 8)
          return charCode >= 32 && charCode <= 126 ? String.fromCharCode(charCode) : ' '
        })
        // Handle Unicode sequences
        .replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
          return String.fromCharCode(parseInt(hex, 16))
        })
        // Handle standard escape sequences
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\')
        .replace(/\\'/g, "'")
        .replace(/\\"/g, '"')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim()
    )
  }

  private cleanExtractedText(text: string): string {
    return (
      text
        // Remove excessive whitespace
        .replace(/\n\s*\n\s*\n/g, '\n\n') // Multiple newlines to double
        .replace(/[ \t]+/g, ' ') // Multiple spaces/tabs to single space
        // Remove page headers/footers patterns
        .replace(/^\d+\s*$/gm, '') // Lines with just page numbers
        .replace(/^Page \d+ of \d+\s*$/gm, '') // "Page X of Y" lines
        // Clean up common PDF artifacts
        .replace(/\f/g, '\n') // Form feed to newline
        // Remove PDF structure artifacts
        .replace(/endstream\s+endobj/g, ' ')
        .replace(/stream\s+x[A-Za-z0-9+/=]+/g, ' ')
        .replace(/obj<</g, ' ')
        .replace(/>>/g, ' ')
        .replace(/\d+\s+0\s+obj/g, ' ')
        // Remove encoding artifacts
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Control characters
        .replace(/þÿ/g, '') // BOM markers
        .replace(/[^\x20-\x7E\s]/g, '') // Keep only printable ASCII and whitespace
        .trim()
    )
  }
  
  private cleanPdfText(text: string): string {
    return text
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Control characters
      .replace(/þÿ/g, '') // BOM markers
      .replace(/[^\x20-\x7E\s]/g, '') // Keep only printable ASCII and whitespace
      .trim()
  }

  private calculateConfidence(
    text: string,
    totalPages: number,
    pagesProcessed: number,
    pagesWithErrors: number
  ): number {
    if (!text || text.length < 10) return 0

    let confidence = 50 // Base confidence

    // Page processing success rate
    const successRate = totalPages > 0 ? pagesProcessed / totalPages : 0
    confidence += successRate * 30

    // Text quality indicators
    const wordCount = text.split(/\s+/).filter((word) => word.length > 0).length
    if (wordCount > 500) confidence += 15
    else if (wordCount > 100) confidence += 10
    else if (wordCount > 50) confidence += 5

    // Readable character ratio
    const readableChars = text.match(/[a-zA-Z]/g)?.length || 0
    const readableRatio = text.length > 0 ? readableChars / text.length : 0
    if (readableRatio > 0.7) confidence += 10
    else if (readableRatio > 0.5) confidence += 5

    // Structure indicators
    if (text.includes('\n')) confidence += 3 // Has line breaks
    if (/[.!?]/.test(text)) confidence += 3 // Has sentence endings
    if (/[A-Z][a-z]/.test(text)) confidence += 3 // Has proper capitalization

    // Biblical content indicators
    const biblicalWords = [
      'God',
      'Lord',
      'Jesus',
      'Christ',
      'heaven',
      'earth',
      'love',
      'faith',
      'spirit',
      'word',
      'truth',
    ]
    const biblicalMatches = biblicalWords.filter((word) =>
      text.toLowerCase().includes(word.toLowerCase())
    ).length
    confidence += Math.min(biblicalMatches * 2, 10)

    // Verse reference patterns
    const verseReferences = text.match(/\d+:\d+/g)?.length || 0
    if (verseReferences > 10) confidence += 10
    else if (verseReferences > 5) confidence += 5

    // Penalize errors
    if (pagesWithErrors > 0) {
      const errorRate = pagesWithErrors / totalPages
      confidence -= errorRate * 20
    }

    return Math.min(100, Math.max(0, Math.round(confidence)))
  }
}

// Export singleton instance
export const frontendPDFExtraction = new FrontendPDFExtractionService()
