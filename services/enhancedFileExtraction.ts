import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { BOOKS as ALL_BOOKS } from '@/mocks/books';
import { Scripture } from '@/types/scripture';
import { debugPdfText, analyzePdfContent } from '@/utils/testPdfExtraction';
import { frontendPDFExtraction } from './frontendPdfExtraction';

// Enhanced extraction types
export interface ExtractedDocument {
  id: string;
  name: string;
  type: 'pdf' | 'epub' | 'txt';
  size: number;
  extractedAt: Date;
  totalVerses: number;
  extractedText: string;
  verses: ExtractedVerse[];
  fileUri: string;
  extractionMethod: string;
  confidence: number;
}

export interface ExtractedVerse {
  id: string;
  text: string;
  reference: string;
  book: string;
  chapter: number;
  verse: number;
  confidence: number;
  context: string;
}

export interface ExtractionProgress {
  stage: 'reading' | 'parsing' | 'extracting' | 'analyzing' | 'complete';
  progress: number;
  message: string;
  totalVerses?: number;
}

export class EnhancedFileExtractionService {
  private documents: ExtractedDocument[] = [];
  private readonly STORAGE_KEY = 'extracted_documents_enhanced';

  constructor() {
    this.loadExtractedDocuments();
  }

  // Load saved documents
  private async loadExtractedDocuments(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.documents = JSON.parse(stored).map((doc: any) => ({
          ...doc,
          extractedAt: new Date(doc.extractedAt),
        }));
      }
    } catch (error) {
      console.error('Failed to load extracted documents:', error);
    }
  }

  // Save documents
  private async saveExtractedDocuments(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.documents));
    } catch (error) {
      console.error('Failed to save extracted documents:', error);
    }
  }

  // Main extraction method
  async pickAndExtractFile(
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<ExtractedDocument | null> {
    try {
      onProgress?.({
        stage: 'reading',
        progress: 10,
        message: 'Opening file picker...',
      });

      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/epub+zip',
          'text/plain',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return null;
      }

      const file = result.assets[0];
      console.log('📄 Selected file:', file.name, file.mimeType);

      onProgress?.({
        stage: 'reading',
        progress: 30,
        message: `Reading ${file.name}...`,
      });

      const fileType = this.getFileType(file.name, file.mimeType);
      let extractedText = '';
      let extractionMethod = '';
      let confidence = 0;

      switch (fileType) {
        case 'txt':
          const result = await this.extractFromTXT(file.uri, onProgress);
          extractedText = result.text;
          extractionMethod = result.method;
          confidence = result.confidence;
          break;
        case 'pdf':
          const pdfResult = await this.extractFromPDF(file.uri, onProgress);
          extractedText = pdfResult.text;
          extractionMethod = pdfResult.method;
          confidence = pdfResult.confidence;
          break;
        case 'epub':
          const epubResult = await this.extractFromEPUB(file.uri, onProgress);
          extractedText = epubResult.text;
          extractionMethod = epubResult.method;
          confidence = epubResult.confidence;
          break;
        default:
          throw new Error('Unsupported file type');
      }

      onProgress?.({
        stage: 'extracting',
        progress: 70,
        message: 'Extracting verses...',
      });

      const verses = await this.extractVerses(extractedText, onProgress);

      onProgress?.({
        stage: 'analyzing',
        progress: 90,
        message: 'Analyzing extracted content...',
      });

      const extractedDoc: ExtractedDocument = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        name: file.name,
        type: fileType,
        size: file.size || 0,
        extractedAt: new Date(),
        totalVerses: verses.length,
        extractedText,
        verses,
        fileUri: file.uri,
        extractionMethod,
        confidence,
      };

      this.documents.push(extractedDoc);
      await this.saveExtractedDocuments();

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: `Successfully extracted ${verses.length} verses using ${extractionMethod}!`,
        totalVerses: verses.length,
      });

      return extractedDoc;
    } catch (error) {
      console.error('❌ Extraction failed:', error);
      onProgress?.({
        stage: 'complete',
        progress: 0,
        message: `Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      return null;
    }
  }

  // Enhanced TXT extraction
  private async extractFromTXT(
    uri: string,
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<{ text: string; method: string; confidence: number }> {
    onProgress?.({
      stage: 'parsing',
      progress: 50,
      message: 'Reading text file...',
    });

    try {
      const content = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      return {
        text: content,
        method: 'Direct UTF-8 Text Reading',
        confidence: 100,
      };
    } catch (error) {
      console.error('TXT extraction error:', error);
      throw new Error('Failed to read text file');
    }
  }

  // Enhanced PDF extraction using frontend PDF.js
  private async extractFromPDF(
    uri: string,
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<{ text: string; method: string; confidence: number }> {
    onProgress?.({
      stage: 'parsing',
      progress: 50,
      message: 'Processing PDF with frontend PDF.js...',
    });

    try {
      // Try frontend PDF.js first
      const result = await frontendPDFExtraction.extractFromPDF(uri, onProgress);

      if (result.success && result.confidence > 50) {
        console.log(`✅ Frontend PDF.js extraction successful: ${result.confidence}% confidence`);
        return {
          text: result.text,
          method: result.method,
          confidence: result.confidence,
        };
      } else {
        console.log(`⚠️ Frontend PDF.js extraction low confidence (${result.confidence}%), trying fallback...`);
        throw new Error(result.error || 'Low confidence extraction');
      }
    } catch (error) {
      console.error('❌ Frontend PDF.js extraction failed:', error);

      // Fallback to enhanced pdf-lib extraction
      onProgress?.({
        stage: 'parsing',
        progress: 60,
        message: 'Trying fallback extraction method...',
      });

      return this.fallbackPDFExtraction(uri, onProgress);
    }
  }

  // Enhanced PDF extraction using multiple methods
  private async fallbackPDFExtraction(
    uri: string,
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<{ text: string; method: string; confidence: number }> {
    onProgress?.({
      stage: 'parsing',
      progress: 60,
      message: 'Using enhanced PDF extraction...',
    });

    try {
      const base64Content = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Try pdf-lib for basic PDF parsing
      const pdfBytes = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
      const pdfDoc = await PDFDocument.load(pdfBytes);

      const pageCount = pdfDoc.getPageCount();
      console.log(`📄 PDF-lib loaded: ${pageCount} pages`);

      const binaryString = atob(base64Content);

      // Method 1: Extract from text streams with better decoding
      onProgress?.({
        stage: 'parsing',
        progress: 65,
        message: 'Extracting from text streams...',
      });

      const method1Text = this.extractFromTextStreams(binaryString);

      // Method 2: Extract from content streams
      onProgress?.({
        stage: 'parsing',
        progress: 70,
        message: 'Extracting from content streams...',
      });

      const method2Text = this.extractFromContentStreams(binaryString);

      // Method 3: Extract from font mappings and character codes
      onProgress?.({
        stage: 'parsing',
        progress: 75,
        message: 'Extracting from font mappings...',
      });

      const method3Text = this.extractFromFontMappings(binaryString);

      // Combine all methods and pick the best result
      const results = [
        { text: method1Text, method: 'Text Streams', confidence: this.calculateTextConfidence(method1Text) },
        { text: method2Text, method: 'Content Streams', confidence: this.calculateTextConfidence(method2Text) },
        { text: method3Text, method: 'Font Mappings', confidence: this.calculateTextConfidence(method3Text) },
      ].sort((a, b) => b.confidence - a.confidence);

      const bestResult = results[0];

      console.log('📊 Extraction results:', results.map(r => ({ method: r.method, confidence: r.confidence, length: r.text.length })));

      if (bestResult.confidence > 30) {
        return {
          text: bestResult.text,
          method: `Enhanced PDF (${bestResult.method}, ${pageCount} pages)`,
          confidence: bestResult.confidence,
        };
      } else {
        // If all methods failed, try basic extraction
        return this.basicBinaryExtraction(base64Content, pageCount);
      }
    } catch (error) {
      console.error('❌ Enhanced PDF extraction failed:', error);

      // Last resort: basic binary extraction
      try {
        const base64Content = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return this.basicBinaryExtraction(base64Content, 0);
      } catch (finalError) {
        console.error('❌ All PDF extraction methods failed:', finalError);
        throw new Error('All PDF extraction methods failed');
      }
    }
  }

  // Enhanced EPUB extraction using JSZip
  private async extractFromEPUB(
    uri: string,
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<{ text: string; method: string; confidence: number }> {
    onProgress?.({
      stage: 'parsing',
      progress: 50,
      message: 'Parsing EPUB with JSZip...',
    });

    try {
      // Read EPUB file as base64
      const base64Content = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Load EPUB as ZIP
      const zip = await JSZip.loadAsync(base64Content, { base64: true });
      console.log('📚 EPUB loaded, files:', Object.keys(zip.files).length);

      // Find container.xml
      const containerFile = zip.files['META-INF/container.xml'];
      if (!containerFile) {
        throw new Error('Invalid EPUB: container.xml not found');
      }

      const containerXML = await containerFile.async('text');
      const contentFilePathMatch = containerXML.match(/full-path="([^"]+)"/);
      if (!contentFilePathMatch) {
        throw new Error('Could not find content.opf in container.xml');
      }

      const contentFilePath = contentFilePathMatch[1];
      const contentFile = zip.files[contentFilePath];
      if (!contentFile) {
        throw new Error(`Content file not found: ${contentFilePath}`);
      }

      const contentXML = await contentFile.async('text');
      
      // Extract spine order and manifest
      const spineMatches = [...contentXML.matchAll(/<itemref idref="([^"]+)"/g)];
      const manifestMatches = [...contentXML.matchAll(/<item id="([^"]+)" href="([^"]+)"/g)];

      const manifestMap = new Map<string, string>();
      for (const match of manifestMatches) {
        manifestMap.set(match[1], match[2]);
      }

      const contentDir = contentFilePath.substring(0, contentFilePath.lastIndexOf('/'));
      let fullText = '';
      let processedPages = 0;

      // Extract text from each content file
      for (const spineMatch of spineMatches) {
        const href = manifestMap.get(spineMatch[1]);
        if (!href) continue;

        const filePath = contentDir ? `${contentDir}/${href}` : href;
        const htmlFile = zip.files[filePath];
        if (!htmlFile) continue;

        onProgress?.({
          stage: 'parsing',
          progress: 50 + (processedPages / spineMatches.length) * 20,
          message: `Extracting page ${processedPages + 1}/${spineMatches.length}...`,
        });

        const htmlContent = await htmlFile.async('text');
        const textContent = this.cleanHtml(htmlContent);
        fullText += textContent + '\n\n';
        processedPages++;
      }

      const confidence = fullText.length > 100 ? 90 : 70;

      return {
        text: fullText.trim(),
        method: `JSZip EPUB (${processedPages} pages)`,
        confidence,
      };
    } catch (error) {
      console.error('❌ EPUB extraction failed:', error);
      throw new Error(`EPUB extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Clean HTML content
  private cleanHtml(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Determine file type
  private getFileType(fileName: string, mimeType?: string): 'pdf' | 'epub' | 'txt' {
    const extension = fileName.toLowerCase().split('.').pop();

    if (extension === 'pdf' || mimeType === 'application/pdf') {
      return 'pdf';
    }
    if (extension === 'epub' || mimeType === 'application/epub+zip') {
      return 'epub';
    }
    return 'txt';
  }

  // Enhanced verse extraction
  private async extractVerses(
    text: string,
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<ExtractedVerse[]> {
    // Debug the extracted text
    const debugInfo = debugPdfText(text);
    const analysis = analyzePdfContent(text);

    console.log('📊 PDF Analysis:', analysis);

    // Clean the text first
    const cleanedText = this.cleanExtractedText(text);

    const verses: ExtractedVerse[] = [];
    const bookNames = ALL_BOOKS.map(book => book.name).join('|');
    const bookAbbreviations = ALL_BOOKS.flatMap(book => book.abbreviations).join('|');
    const allBookMatchers = `${bookNames}|${bookAbbreviations}`;

    // Enhanced verse pattern with more flexibility
    const versePatterns = [
      // Standard format: "John 3:16 For God so loved..."
      new RegExp(`(${allBookMatchers})\\s+(\\d+):(\\d+)\\s+([^\\n\\r.!?]{10,})`, 'gi'),
      // Alternative format: "John 3:16. For God so loved..."
      new RegExp(`(${allBookMatchers})\\s+(\\d+):(\\d+)\\.\\s+([^\\n\\r]{10,})`, 'gi'),
      // Verse number at start: "16 For God so loved... (John 3)"
      new RegExp(`(\\d+)\\s+([^\\n\\r]{20,}?)\\s+\\((${allBookMatchers})\\s+(\\d+)\\)`, 'gi'),
      // Format with dash: "John 3:16 - For God so loved..."
      new RegExp(`(${allBookMatchers})\\s+(\\d+):(\\d+)\\s*[-–—]\\s*([^\\n\\r]{10,})`, 'gi'),
      // Simple verse reference followed by text on next line
      new RegExp(`(${allBookMatchers})\\s+(\\d+):(\\d+)\\s*\\n\\s*([^\\n\\r]{10,})`, 'gi'),
      // Verse with book abbreviation
      new RegExp(`\\b(${bookAbbreviations})\\s+(\\d+):(\\d+)\\s+([^\\n\\r]{10,})`, 'gi'),
    ];

    console.log('🔍 Extracting verses with enhanced patterns...');

    for (const pattern of versePatterns) {
      const matches = cleanedText.matchAll(pattern);
      let processedMatches = 0;

      for (const match of matches) {
        processedMatches++;
        
        let book: string, chapter: number, verse: number, verseText: string;
        
        if (pattern === versePatterns[2]) {
          // Special handling for reverse format
          [, verse, verseText, book, chapter] = match.map((m, i) => 
            i === 1 || i === 4 ? parseInt(m, 10) : m?.trim()
          ) as [string, number, string, string, number];
        } else {
          [, book, chapter, verse, verseText] = match.map((m, i) => 
            i === 2 || i === 3 ? parseInt(m, 10) : m?.trim()
          ) as [string, string, number, number, string];
        }

        const cleanText = verseText.trim();

        if (cleanText.length > 10 && cleanText.length < 500) {
          const extractedVerse: ExtractedVerse = {
            id: `verse_${Date.now()}_${verses.length}`,
            text: cleanText,
            reference: `${book} ${chapter}:${verse}`,
            book: book.replace(/^\d+\s*/, ''),
            chapter,
            verse,
            confidence: 95,
            context: this.extractContext(text, match.index || 0, 100),
          };
          verses.push(extractedVerse);
        }

        if (processedMatches % 10 === 0) {
          onProgress?.({
            stage: 'extracting',
            progress: 70 + (processedMatches / 100) * 15,
            message: `Found ${verses.length} verses...`,
          });
        }
      }
    }

    // If we didn't find many verses, try a more general approach
    if (verses.length < 5) {
      console.log('🔍 Trying general verse pattern extraction...');

      // Look for any text that might be verses (sentences with biblical language)
      const biblicalWords = ['God', 'Lord', 'Jesus', 'Christ', 'heaven', 'earth', 'love', 'faith', 'spirit', 'word', 'truth'];
      const sentences = cleanedText.split(/[.!?]+/).filter(sentence => {
        const trimmed = sentence.trim();
        return trimmed.length > 20 &&
               trimmed.length < 300 &&
               biblicalWords.some(word => trimmed.toLowerCase().includes(word.toLowerCase()));
      });

      sentences.forEach((sentence, index) => {
        const trimmed = sentence.trim();
        if (trimmed.length > 20) {
          const extractedVerse: ExtractedVerse = {
            id: `general_verse_${Date.now()}_${index}`,
            text: trimmed,
            reference: `Extracted Text ${index + 1}`,
            book: 'Unknown',
            chapter: 1,
            verse: index + 1,
            confidence: 50, // Lower confidence for general extraction
            context: this.extractContext(cleanedText, cleanedText.indexOf(sentence), 50),
          };
          verses.push(extractedVerse);
        }
      });
    }

    console.log(`✅ Extracted ${verses.length} verses`);
    return verses;
  }

  // Enhanced PDF text extraction methods
  private extractFromTextStreams(binaryString: string): string {
    // Look for text in parentheses (most common PDF text format)
    const textStreams = binaryString.match(/\(([^)]+)\)/g) || [];
    return textStreams
      .map(match => {
        let text = match.slice(1, -1); // Remove parentheses

        // Decode common PDF escape sequences
        text = text.replace(/\\([0-7]{3})/g, (match, octal) => {
          const charCode = parseInt(octal, 8);
          return charCode >= 32 && charCode <= 126 ? String.fromCharCode(charCode) : ' ';
        });

        text = text.replace(/\\n/g, '\n');
        text = text.replace(/\\r/g, '\r');
        text = text.replace(/\\t/g, '\t');
        text = text.replace(/\\\\/g, '\\');
        text = text.replace(/\\'/g, "'");
        text = text.replace(/\\"/g, '"');

        return this.cleanPdfText(text);
      })
      .filter(text => text.length > 1 && /[a-zA-Z]/.test(text))
      .join(' ');
  }

  private extractFromContentStreams(binaryString: string): string {
    // Look for BT/ET blocks (text blocks in PDF)
    const btBlocks = binaryString.match(/BT\s+(.*?)\s+ET/gs) || [];
    return btBlocks
      .map(block => {
        // Extract text from Tj and TJ commands
        const tjMatches = block.match(/\(([^)]+)\)\s*T[jJ]/g) || [];
        const arrayMatches = block.match(/\[([^\]]+)\]\s*TJ/g) || [];

        let blockText = '';

        // Process Tj commands
        tjMatches.forEach(tj => {
          const text = tj.match(/\(([^)]+)\)/)?.[1] || '';
          blockText += this.cleanPdfText(text) + ' ';
        });

        // Process TJ array commands
        arrayMatches.forEach(array => {
          const content = array.match(/\[([^\]]+)\]/)?.[1] || '';
          const strings = content.match(/\(([^)]+)\)/g) || [];
          strings.forEach(str => {
            const text = str.slice(1, -1);
            blockText += this.cleanPdfText(text) + ' ';
          });
        });

        return blockText.trim();
      })
      .filter(text => text.length > 0)
      .join(' ');
  }

  private extractFromFontMappings(binaryString: string): string {
    // Look for font encoding and character mappings
    const fontMappings = binaryString.match(/\/Encoding\s*<<[^>]*>>/g) || [];
    const charMappings = binaryString.match(/\/Differences\s*\[[^\]]*\]/g) || [];

    // This is a simplified approach - real PDF font decoding is very complex
    // For now, just look for readable text patterns near font definitions
    let extractedText = '';

    fontMappings.forEach(mapping => {
      const nearbyText = binaryString.substring(
        Math.max(0, binaryString.indexOf(mapping) - 500),
        binaryString.indexOf(mapping) + 500
      );

      const textMatches = nearbyText.match(/\(([^)]+)\)/g) || [];
      textMatches.forEach(match => {
        const text = this.cleanPdfText(match.slice(1, -1));
        if (text.length > 2 && /[a-zA-Z]/.test(text)) {
          extractedText += text + ' ';
        }
      });
    });

    return extractedText.trim();
  }

  private cleanPdfText(text: string): string {
    return text
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Control characters
      .replace(/þÿ/g, '') // BOM markers
      .replace(/[^\x20-\x7E\s]/g, '') // Keep only printable ASCII and whitespace
      .trim();
  }

  private calculateTextConfidence(text: string): number {
    if (!text || text.length < 10) return 0;

    let confidence = 0;

    // Length factor
    if (text.length > 100) confidence += 30;
    else if (text.length > 50) confidence += 20;
    else if (text.length > 20) confidence += 10;

    // Readable character ratio
    const readableChars = text.match(/[a-zA-Z]/g)?.length || 0;
    const readableRatio = readableChars / text.length;
    confidence += readableRatio * 40;

    // Word structure
    const words = text.split(/\s+/).filter(word => word.length > 1);
    if (words.length > 10) confidence += 20;
    else if (words.length > 5) confidence += 10;

    // Biblical content indicators
    const biblicalWords = ['God', 'Lord', 'Jesus', 'Christ', 'heaven', 'earth', 'love', 'faith'];
    const biblicalMatches = biblicalWords.filter(word =>
      text.toLowerCase().includes(word.toLowerCase())
    ).length;
    confidence += biblicalMatches * 5;

    return Math.min(100, confidence);
  }

  private basicBinaryExtraction(base64Content: string, pageCount: number): { text: string; method: string; confidence: number } {
    const binaryString = atob(base64Content);
    const textContent = binaryString
      .replace(/[\x00-\x1F\x80-\xFF]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      text: textContent.length > 50 ? textContent : 'PDF text extraction failed - file may be image-based or encrypted',
      method: `Basic Binary (${pageCount} pages)`,
      confidence: textContent.length > 100 ? 20 : 10,
    };
  }

  // Clean extracted text to remove PDF artifacts
  private cleanExtractedText(text: string): string {
    return text
      // Remove PDF encoding artifacts
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Control characters
      .replace(/þÿ/g, '') // BOM markers
      .replace(/\\[0-7]{3}/g, '') // Octal escapes
      .replace(/\\[rnt]/g, ' ') // Escape sequences
      .replace(/[^\x20-\x7E\s]/g, '') // Keep only printable ASCII and whitespace
      // Remove PDF structure artifacts
      .replace(/endstream\s+endobj/g, ' ')
      .replace(/stream\s+x[A-Za-z0-9+/=]+/g, ' ')
      .replace(/obj<</g, ' ')
      .replace(/>>/g, ' ')
      .replace(/\d+\s+0\s+obj/g, ' ')
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Extract context around a match
  private extractContext(text: string, index: number, contextLength: number): string {
    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + contextLength);
    return text.substring(start, end).trim();
  }

  // Get all extracted documents
  getExtractedDocuments(): ExtractedDocument[] {
    return this.documents;
  }

  // Get document by ID
  getDocumentById(id: string): ExtractedDocument | null {
    return this.documents.find(doc => doc.id === id) || null;
  }

  // Delete document
  async deleteDocument(id: string): Promise<boolean> {
    const index = this.documents.findIndex(doc => doc.id === id);
    if (index === -1) return false;

    this.documents.splice(index, 1);
    await this.saveExtractedDocuments();
    return true;
  }

  // Convert extracted verses to Scripture format
  convertToScriptures(document: ExtractedDocument): Scripture[] {
    return document.verses.map(verse => ({
      id: verse.id,
      text: verse.text,
      reference: verse.reference,
      book: verse.book,
      chapter: verse.chapter,
      verse: verse.verse,
      version: 'Extracted',
      category: 'imported',
      difficulty: 'medium' as const,
      tags: ['imported', document.name.toLowerCase()],
      mnemonic: '',
      createdAt: document.extractedAt,
      lastPracticed: null,
      practiceCount: 0,
      averageAccuracy: 0,
      bestAccuracy: 0,
      currentStreak: 0,
      longestStreak: 0,
    }));
  }
}
