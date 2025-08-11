import * as FileSystem from 'expo-file-system'
import { pdfjs } from 'react-pdf'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import type {
  PDFDocumentProxy,
  TextItem,
} from 'pdfjs-dist/types/src/display/api'

// Configure PDF.js worker for frontend use
const configurePDFWorker = () => {
  try {
    // For Expo/React Native, we need to use a CDN worker
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString()
    pdfjs.GlobalWorkerOptions.workerSrc = `http//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
    // pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs`
    console.log('📄 PDF.js worker configured for frontend')
  } catch (error) {
    console.error('❌ Failed to configure PDF.js worker:', error)
  }
}

// Initialize worker configuration
// configurePDFWorker();

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
        message: 'Loading PDF with frontend PDF.js...',
      })

      // Read PDF file as base64
      const base64Content = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      onProgress?.({
        stage: 'parsing',
        progress: 30,
        message: 'Converting PDF data...',
      })

      // Convert base64 to Uint8Array
      const binaryString = atob(base64Content)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      onProgress?.({
        stage: 'parsing',
        progress: 50,
        message: 'Loading PDF document...',
      })

      // Load PDF document with PDF.js
      const loadingTask = pdfjs.getDocument({
        data: bytes,
        useSystemFonts: true,
        disableFontFace: false,
        verbosity: 0, // Reduce console output
      })

      const pdf: PDFDocumentProxy = await loadingTask.promise
      console.log(`📄 Frontend PDF.js loaded: ${pdf.numPages} pages`)

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

      // Clean up the extracted text
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

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: `Extracted ${wordCount} words from ${pagesProcessed} pages`,
      })

      console.log(
        `✅ Frontend PDF extraction complete: ${wordCount} words, ${confidence}% confidence`
      )

      return {
        success: true,
        text: cleanedText,
        method: `Frontend PDF.js (${pagesProcessed}/${totalPages} pages)`,
        confidence,
        metadata: {
          totalPages,
          totalWords: wordCount,
          totalCharacters: cleanedText.length,
          pagesProcessed,
          pagesWithErrors,
        },
      }
    } catch (error) {
      console.error('❌ Frontend PDF extraction failed:', error)

      return {
        success: false,
        text: '',
        method: 'Frontend PDF.js',
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
        .trim()
    )
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
