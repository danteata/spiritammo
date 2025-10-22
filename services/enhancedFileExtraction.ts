import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Platform-specific FileSystem import
import { Platform } from 'react-native';

// Import FileSystem based on platform
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

import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { BOOKS as ALL_BOOKS } from '@/mocks/books';
import { Scripture } from '@/types/scripture';
import { debugPdfText, analyzePdfContent } from '@/utils/testPdfExtraction';
import { FrontendPDFExtractionService } from './frontendPdfExtraction';

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
  private frontendPDFService: FrontendPDFExtractionService;

  constructor() {
    this.frontendPDFService = new FrontendPDFExtractionService();
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
          const txtResult = await this.extractFromTXT(file.uri, onProgress);
          extractedText = txtResult.text;
          extractionMethod = txtResult.method;
          confidence = txtResult.confidence;
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
      const content = await FileSystem.readAsStringAsync(uri);

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

  // Enhanced PDF extraction using multiple methods with comprehensive fallbacks
  private async extractFromPDF(
    uri: string,
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<{ text: string; method: string; confidence: number }> {
    onProgress?.({
      stage: 'parsing',
      progress: 50,
      message: 'Processing PDF with multiple extraction methods...',
    });

    const extractionAttempts: { method: string; text: string; confidence: number; error?: string }[] = [];

    // Method 1: Try frontend PDF.js first (best for well-formed PDFs)
    try {
      onProgress?.({
        stage: 'parsing',
        progress: 55,
        message: 'Attempting PDF.js extraction...',
      });

      const pdfJsResult = await this.frontendPDFService.extractFromPDF(uri, (progress) => {
        onProgress?.({
          stage: 'parsing',
          progress: progress.progress,
          message: progress.message,
        });
      });

      if (pdfJsResult.success && pdfJsResult.confidence > 60) {
        console.log(`✅ PDF.js extraction successful: ${pdfJsResult.confidence}% confidence`);
        return {
          text: pdfJsResult.text,
          method: pdfJsResult.method,
          confidence: pdfJsResult.confidence,
        };
      } else {
        extractionAttempts.push({
          method: 'PDF.js',
          text: pdfJsResult.text,
          confidence: pdfJsResult.confidence,
          error: pdfJsResult.error
        });
        console.log(`⚠️ PDF.js extraction low confidence (${pdfJsResult.confidence}%), trying alternatives...`);
      }
    } catch (error) {
      console.error('❌ PDF.js extraction failed:', error);
      extractionAttempts.push({
        method: 'PDF.js',
        text: '',
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Method 2: Enhanced pdf-lib extraction with multiple techniques
    try {
      onProgress?.({
        stage: 'parsing',
        progress: 70,
        message: 'Trying enhanced PDF extraction...',
      });

      const enhancedResult = await this.enhancedPDFExtraction(uri, onProgress);
      extractionAttempts.push({
        method: 'Enhanced PDF',
        text: enhancedResult.text,
        confidence: enhancedResult.confidence,
      });

      if (enhancedResult.confidence > 40) {
        console.log(`✅ Enhanced PDF extraction successful: ${enhancedResult.confidence}% confidence`);
        return enhancedResult;
      }
    } catch (error) {
      console.error('❌ Enhanced PDF extraction failed:', error);
      extractionAttempts.push({
        method: 'Enhanced PDF',
        text: '',
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Method 3: Binary extraction as last resort
    try {
      onProgress?.({
        stage: 'parsing',
        progress: 85,
        message: 'Applying binary extraction as fallback...',
      });

      const binaryResult = await this.binaryPDFExtraction(uri);
      extractionAttempts.push({
        method: 'Binary Extraction',
        text: binaryResult.text,
        confidence: binaryResult.confidence,
      });
    } catch (error) {
      console.error('❌ Binary extraction failed:', error);
      extractionAttempts.push({
        method: 'Binary Extraction',
        text: '',
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Return the best result from all attempts
    const bestResult = extractionAttempts
      .filter(attempt => attempt.text.length > 50)
      .reduce((best, current) =>
        current.confidence > best.confidence ? current : best,
        { method: 'No extraction', text: '', confidence: 0 }
      );

    if (bestResult.confidence > 0) {
      console.log(`✨ Best extraction result: ${bestResult.method} with ${bestResult.confidence}% confidence`);
      return bestResult;
    } else {
      // If all methods failed, provide helpful error message
      const errorSummary = extractionAttempts
        .map(attempt => `${attempt.method}: ${attempt.error || 'Low confidence'}`)
        .join('; ');

      throw new Error(`All PDF extraction methods failed. Attempts: ${errorSummary}. This PDF may be image-based, encrypted, or corrupted.`);
    }
  }

  // Enhanced PDF extraction using multiple methods with better error handling
  private async enhancedPDFExtraction(
    uri: string,
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<{ text: string; method: string; confidence: number }> {
    onProgress?.({
      stage: 'parsing',
      progress: 65,
      message: 'Using enhanced PDF extraction methods...',
    });

    try {
      const base64Content = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64'
      } as any);

      // Try pdf-lib for basic PDF parsing
      const pdfBytes = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pageCount = pdfDoc.getPageCount();
      console.log(`📄 Enhanced PDF-lib loaded: ${pageCount} pages`);

      const binaryString = atob(base64Content);
      const extractionResults: { text: string; method: string; confidence: number }[] = [];

      // Method 1: Enhanced text stream extraction
      onProgress?.({
        stage: 'parsing',
        progress: 70,
        message: 'Extracting from enhanced text streams...',
      });
      const textStreamResult = this.enhancedTextStreamExtraction(binaryString);
      extractionResults.push({
        text: textStreamResult,
        method: 'Enhanced Text Streams',
        confidence: this.calculateTextConfidence(textStreamResult),
      });

      // Method 2: Enhanced content stream extraction
      onProgress?.({
        stage: 'parsing',
        progress: 75,
        message: 'Extracting from enhanced content streams...',
      });
      const contentStreamResult = this.enhancedContentStreamExtraction(binaryString);
      extractionResults.push({
        text: contentStreamResult,
        method: 'Enhanced Content Streams',
        confidence: this.calculateTextConfidence(contentStreamResult),
      });

      // Method 3: Advanced binary pattern extraction
      onProgress?.({
        stage: 'parsing',
        progress: 80,
        message: 'Applying advanced binary pattern extraction...',
      });
      const binaryPatternResult = this.advancedBinaryPatternExtraction(binaryString);
      extractionResults.push({
        text: binaryPatternResult,
        method: 'Advanced Binary Patterns',
        confidence: this.calculateTextConfidence(binaryPatternResult),
      });

      // Pick the best result
      const bestResult = extractionResults
        .filter(result => result.text.length > 20)
        .reduce((best, current) =>
          current.confidence > best.confidence ? current : best,
          { text: '', method: 'No extraction', confidence: 0 }
        );

      console.log('📊 Enhanced extraction results:',
        extractionResults.map(r => ({
          method: r.method,
          confidence: r.confidence,
          length: r.text.length
        }))
      );

      if (bestResult.confidence > 20) {
        return {
          text: bestResult.text,
          method: `${bestResult.method} (${pageCount} pages)`,
          confidence: bestResult.confidence,
        };
      } else {
        throw new Error('Enhanced PDF extraction yielded low confidence results');
      }
    } catch (error) {
      console.error('❌ Enhanced PDF extraction failed:', error);
      throw error;
    }
  }

  // Binary PDF extraction as absolute fallback
  private async binaryPDFExtraction(
    uri: string
  ): Promise<{ text: string; method: string; confidence: number }> {
    try {
      const base64Content = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64'
      } as any);

      return this.basicBinaryExtraction(base64Content, 0);
    } catch (error) {
      console.error('❌ Binary PDF extraction failed:', error);
      throw new Error('Binary PDF extraction failed');
    }
  }

  // Enhanced EPUB extraction using JSZip with improved content detection
  private async extractFromEPUB(
    uri: string,
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<{ text: string; method: string; confidence: number }> {
    onProgress?.({
      stage: 'parsing',
      progress: 50,
      message: 'Parsing EPUB with enhanced content detection...',
    });

    try {
      // Read EPUB file as base64
      const base64Content = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64'
      } as any);

      // Load EPUB as ZIP
      const zip = await JSZip.loadAsync(base64Content, { base64: true });
      console.log('📚 Enhanced EPUB loaded, files:', Object.keys(zip.files).length);

      // Method 1: Standard EPUB structure parsing
      let standardResult: { text: string; confidence: number } | null = null;
      try {
        standardResult = await this.extractStandardEPUB(zip, onProgress);
      } catch (error) {
        console.error('❌ Standard EPUB extraction failed:', error);
      }

      // Method 2: Aggressive content detection (for non-standard EPUBs)
      let aggressiveResult: { text: string; confidence: number } | null = null;
      try {
        onProgress?.({
          stage: 'parsing',
          progress: 75,
          message: 'Applying aggressive content detection...',
        });
        aggressiveResult = await this.extractAggressiveEPUB(zip, onProgress);
      } catch (error) {
        console.error('❌ Aggressive EPUB extraction failed:', error);
      }

      // Pick the best result
      const results = [standardResult, aggressiveResult].filter(Boolean);
      if (results.length === 0) {
        throw new Error('All EPUB extraction methods failed');
      }

      const bestResult = results.reduce((best, current) =>
        current!.confidence > best!.confidence ? current : best
      )!;

      const finalConfidence = Math.min(95, bestResult.confidence + (bestResult.text.length > 1000 ? 10 : 0));

      console.log(`✅ EPUB extraction complete: ${bestResult.text.length} characters, ${finalConfidence}% confidence`);

      return {
        text: bestResult.text.trim(),
        method: `Enhanced JSZip EPUB (${Object.keys(zip.files).length} files)`,
        confidence: finalConfidence,
      };
    } catch (error) {
      console.error('❌ EPUB extraction failed:', error);
      throw new Error(`EPUB extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // File type detection
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

  // Enhanced verse extraction with multiple strategies
  private async extractVerses(
    text: string,
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<ExtractedVerse[]> {
    // Debug the extracted text
    const debugInfo = debugPdfText(text);
    const analysis = analyzePdfContent(text);

    console.log('📊 Text Analysis:', analysis);

    // Clean the text first
    const cleanedText = this.cleanExtractedText(text);

    const allVerses: ExtractedVerse[] = [];
    const bookNames = ALL_BOOKS.map(book => book.name).join('|');
    const bookAbbreviations = ALL_BOOKS.flatMap(book => book.abbreviations).join('|');
    const allBookMatchers = `${bookNames}|${bookAbbreviations}`;

    // Strategy 1: Enhanced pattern-based extraction
    onProgress?.({
      stage: 'extracting',
      progress: 75,
      message: 'Applying enhanced pattern matching...',
    });

    const patternVerses = await this.extractWithEnhancedPatterns(
      cleanedText,
      allBookMatchers,
      bookAbbreviations,
      onProgress
    );
    allVerses.push(...patternVerses);

    // Strategy 2: Contextual analysis (if not enough verses found)
    if (allVerses.length < 10) {
      onProgress?.({
        stage: 'extracting',
        progress: 80,
        message: 'Applying contextual analysis...',
      });

      const contextualVerses = await this.extractWithContextualAnalysis(
        cleanedText,
        allBookMatchers,
        onProgress
      );
      allVerses.push(...contextualVerses);
    }

    // Strategy 3: Intelligent content scoring (last resort)
    if (allVerses.length < 5) {
      onProgress?.({
        stage: 'extracting',
        progress: 85,
        message: 'Applying intelligent content scoring...',
      });

      const intelligentVerses = await this.extractWithIntelligentScoring(
        cleanedText,
        onProgress
      );
      allVerses.push(...intelligentVerses);
    }

    // Deduplicate and validate
    const uniqueVerses = this.deduplicateAndValidateVerses(allVerses);

    onProgress?.({
      stage: 'analyzing',
      progress: 95,
      message: 'Finalizing verse extraction...',
    });

    console.log(`🎯 Final extraction: ${uniqueVerses.length} unique verses`);
    return uniqueVerses;
  }

  // Stub methods to be implemented in continuation
  private enhancedTextStreamExtraction(binaryString: string): string {
    // Enhanced text stream extraction logic
    const textMatches = binaryString.match(/\(([^)]{5,})\)/g) || [];
    return textMatches
      .map(match => match.slice(1, -1))
      .filter(text => /[a-zA-Z]/.test(text) && text.length > 10)
      .join(' ');
  }

  private enhancedContentStreamExtraction(binaryString: string): string {
    // Enhanced content stream extraction logic
    const btBlocks = binaryString.match(/BT\s+(.*?)\s+ET/gs) || [];
    return btBlocks
      .map(block => {
        const tjMatches = block.match(/\(([^)]+)\)\s*T[jJ]/g) || [];
        return tjMatches.map(tj => tj.match(/\(([^)]+)\)/)?.[1] || '').join(' ');
      })
      .filter(text => text.length > 10)
      .join(' ');
  }

  private advancedBinaryPatternExtraction(binaryString: string): string {
    // Advanced binary pattern extraction logic
    const patterns = [
      /[\x20-\x7E]{10,}/g, // ASCII printable characters
      /[a-zA-Z\s]{15,}/g,  // English text
    ];

    let extractedText = '';
    for (const pattern of patterns) {
      const matches = binaryString.match(pattern) || [];
      extractedText += matches.join(' ');
    }

    return this.cleanPdfText(extractedText);
  }

  private calculateTextConfidence(text: string): number {
    if (text.length < 20) return 0;

    let confidence = 20;

    // Length bonus
    if (text.length > 500) confidence += 30;
    else if (text.length > 200) confidence += 20;
    else if (text.length > 100) confidence += 10;

    // Word ratio
    const words = text.split(/\s+/).filter(word => word.length > 2);
    const wordRatio = words.length / (text.length / 5);
    confidence += Math.min(20, wordRatio * 10);

    // Sentence structure
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length > 0) confidence += 15;

    // Biblical keywords
    const biblicalWords = ['Lord', 'God', 'Jesus', 'Christ', 'faith', 'love', 'peace', 'salvation'];
    const biblicalCount = biblicalWords.filter(word =>
      text.toLowerCase().includes(word.toLowerCase())
    ).length;
    confidence += biblicalCount * 3;

    return Math.min(95, confidence);
  }

  private basicBinaryExtraction(base64Content: string, pageCount: number): { text: string; method: string; confidence: number } {
    const binaryString = atob(base64Content);
    const asciiText = binaryString.replace(/[^\x20-\x7E]/g, ' ');
    const cleanedText = asciiText
      .replace(/\s+/g, ' ')
      .split(' ')
      .filter(word => word.length > 2 && /[a-zA-Z]/.test(word))
      .join(' ');

    const confidence = this.calculateTextConfidence(cleanedText);

    return {
      text: cleanedText,
      method: `Basic Binary Extraction${pageCount > 0 ? ` (${pageCount} pages)` : ''}`,
      confidence: Math.max(10, confidence),
    };
  }

  private cleanPdfText(text: string): string {
    return text
      .replace(/[^\x20-\x7E\n\r]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private cleanExtractedText(text: string): string {
    return text
      .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Public methods for accessing extracted documents
  getExtractedDocuments(): ExtractedDocument[] {
    return this.documents;
  }

  getDocumentById(id: string): ExtractedDocument | null {
    return this.documents.find(doc => doc.id === id) || null;
  }

  async deleteDocument(id: string): Promise<boolean> {
    const index = this.documents.findIndex(doc => doc.id === id);
    if (index === -1) return false;

    this.documents.splice(index, 1);
    await this.saveExtractedDocuments();
    return true;
  }

  convertToScriptures(document: ExtractedDocument, selectedVerseIds?: string[]): Scripture[] {
    const versesToConvert = selectedVerseIds
      ? document.verses.filter(v => selectedVerseIds.includes(v.id))
      : document.verses;

    return versesToConvert.map((verse, index) => ({
      id: `${document.id}_scripture_${index}`,
      book: verse.book,
      chapter: verse.chapter,
      verse: verse.verse,
      text: verse.text,
      reference: verse.reference,
      tags: ['imported'],
      notes: `Extracted from ${document.name} (${Math.round(verse.confidence)}% confidence)`,
      createdAt: document.extractedAt,
      favorite: false,
    }));
  }

  // Standard EPUB structure parsing
  private async extractStandardEPUB(zip: JSZip, onProgress?: (progress: ExtractionProgress) => void): Promise<{ text: string; confidence: number }> {
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

    // Extract text from each content file in spine order
    for (const spineMatch of spineMatches) {
      const href = manifestMap.get(spineMatch[1]);
      if (!href) continue;

      const filePath = contentDir ? `${contentDir}/${href}` : href;
      const htmlFile = zip.files[filePath];
      if (!htmlFile) continue;

      onProgress?.({
        stage: 'parsing',
        progress: 50 + (processedPages / spineMatches.length) * 20,
        message: `Processing content file ${processedPages + 1}/${spineMatches.length}...`,
      });

      const htmlContent = await htmlFile.async('text');
      const textContent = this.enhancedHtmlClean(htmlContent);

      if (textContent.length > 50) {
        fullText += textContent + '\n\n';
      }
      processedPages++;
    }

    const confidence = this.calculateEPUBConfidence(fullText, processedPages, spineMatches.length);
    return { text: fullText, confidence };
  }

  // Aggressive EPUB content detection for non-standard formats
  private async extractAggressiveEPUB(zip: JSZip, onProgress?: (progress: ExtractionProgress) => void): Promise<{ text: string; confidence: number }> {
    const contentFiles = Object.keys(zip.files)
      .filter(path => {
        const extension = path.toLowerCase().split('.').pop();
        return ['html', 'htm', 'xhtml', 'xml'].includes(extension || '');
      })
      .filter(path => !path.includes('META-INF')); // Exclude metadata

    console.log(`🕵️ Aggressive EPUB: found ${contentFiles.length} potential content files`);

    let fullText = '';
    let processedFiles = 0;
    const contentScores: { file: string; text: string; score: number }[] = [];

    // Process all potential content files
    for (const filePath of contentFiles) {
      try {
        onProgress?.({
          stage: 'parsing',
          progress: 75 + (processedFiles / contentFiles.length) * 15,
          message: `Scanning content file ${processedFiles + 1}/${contentFiles.length}...`,
        });

        const htmlFile = zip.files[filePath];
        if (!htmlFile) continue;

        const htmlContent = await htmlFile.async('text');
        const textContent = this.enhancedHtmlClean(htmlContent);

        if (textContent.length > 20) {
          const contentScore = this.scoreEPUBContent(textContent, filePath);
          contentScores.push({
            file: filePath,
            text: textContent,
            score: contentScore
          });
        }
        processedFiles++;
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
      }
    }

    // Sort by content score and combine high-scoring content
    const goodContent = contentScores
      .filter(item => item.score > 30)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20); // Limit to top 20 files to avoid noise

    fullText = goodContent.map(item => item.text).join('\n\n');

    const confidence = Math.min(85,
      (goodContent.length / Math.max(1, contentFiles.length)) * 100
    );

    console.log(`📊 Aggressive EPUB: processed ${goodContent.length}/${contentFiles.length} files`);
    return { text: fullText, confidence };
  }

  // Enhanced HTML content cleaning
  private enhancedHtmlClean(html: string): string {
    let cleaned = html;

    // Remove script and style content
    cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Remove HTML comments
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

    // Remove navigation and metadata elements
    cleaned = cleaned.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
    cleaned = cleaned.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
    cleaned = cleaned.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
    cleaned = cleaned.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');

    // Preserve paragraph and heading structure
    cleaned = cleaned.replace(/<\/p>/gi, '\n\n');
    cleaned = cleaned.replace(/<\/div>/gi, '\n');
    cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
    cleaned = cleaned.replace(/<\/h[1-6]>/gi, '\n\n');
    cleaned = cleaned.replace(/<\/li>/gi, '\n');

    // Remove all remaining HTML tags
    cleaned = cleaned.replace(/<[^>]+>/g, ' ');

    // Decode HTML entities
    const entityMap: { [key: string]: string } = {
      '&nbsp;': ' ',
      '&': '&',
      '<': '<',
      '>': '>',
      '"': '"',
      '&#39;': "'",
      '&#8217;': "'",
      '&#8220;': '"',
      '&#8221;': '"',
      '&#8211;': '–',
      '&#8212;': '—',
      '&mdash;': '—',
      '&ndash;': '–',
      '&rsquo;': "'",
      '&lsquo;': "'",
      '&rdquo;': '"',
      '&ldquo;': '"',
    };

    Object.keys(entityMap).forEach(entity => {
      const regex = new RegExp(entity, 'g');
      cleaned = cleaned.replace(regex, entityMap[entity]);
    });

    // Clean up whitespace
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n'); // Multiple newlines to double
    cleaned = cleaned.replace(/[ \t]+/g, ' '); // Multiple spaces to single
    cleaned = cleaned.replace(/^\s+|\s+$/gm, ''); // Trim lines

    return cleaned.trim();
  }

  // Score EPUB content quality
  private scoreEPUBContent(text: string, filePath: string): number {
    let score = 0;

    // Length scoring
    if (text.length > 500) score += 20;
    else if (text.length > 200) score += 15;
    else if (text.length > 100) score += 10;
    else if (text.length > 50) score += 5;

    // Sentence structure
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    score += Math.min(15, sentences.length);

    // Biblical content indicators
    const biblicalWords = ['Lord', 'God', 'Jesus', 'Christ', 'faith', 'love', 'peace', 'salvation', 'heaven', 'prayer'];
    const biblicalCount = biblicalWords.filter(word =>
      text.toLowerCase().includes(word.toLowerCase())
    ).length;
    score += biblicalCount * 3;

    // Verse references
    const verseReferences = text.match(/\d+:\d+/g)?.length || 0;
    score += verseReferences * 5;

    // File path indicators
    if (filePath.includes('chapter') || filePath.includes('content')) score += 10;
    if (filePath.includes('toc') || filePath.includes('nav') || filePath.includes('cover')) score -= 10;

    // Penalize very short or very long content
    if (text.length < 50 || text.length > 10000) score -= 5;

    return Math.max(0, score);
  }

  // Calculate EPUB extraction confidence
  private calculateEPUBConfidence(text: string, processedPages: number, totalPages: number): number {
    let confidence = 40; // Base confidence

    // Success rate bonus
    if (totalPages > 0) {
      const successRate = processedPages / totalPages;
      confidence += successRate * 30;
    }

    // Content length bonus
    if (text.length > 2000) confidence += 15;
    else if (text.length > 1000) confidence += 10;
    else if (text.length > 500) confidence += 5;

    // Word quality bonus
    const words = text.split(/\s+/).filter(word => word.length > 2);
    if (words.length > 100) confidence += 10;

    // Biblical content bonus
    const biblicalWords = ['Lord', 'God', 'Jesus', 'Christ', 'faith', 'love', 'peace'];
    const biblicalCount = biblicalWords.filter(word =>
      text.toLowerCase().includes(word.toLowerCase())
    ).length;
    confidence += biblicalCount * 2;

    return Math.min(95, confidence);
  }

  // Enhanced pattern-based verse extraction
  private async extractWithEnhancedPatterns(
    text: string,
    allBookMatchers: string,
    bookAbbreviations: string,
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<ExtractedVerse[]> {
    const verses: ExtractedVerse[] = [];

    // Comprehensive verse patterns with improved flexibility
    const versePatterns = [
      // Standard format: "John 3:16 For God so loved..."
      new RegExp(`(${allBookMatchers})\\s+(\\d+):(\\d+)\\s+([^\\n\\r.!?]{10,500})`, 'gi'),

      // Alternative format: "John 3:16. For God so loved..."
      new RegExp(`(${allBookMatchers})\\s+(\\d+):(\\d+)\\.\\s+([^\\n\\r]{10,500})`, 'gi'),

      // Format with dash: "John 3:16 - For God so loved..."
      new RegExp(`(${allBookMatchers})\\s+(\\d+):(\\d+)\\s*[-–—]\\s*([^\\n\\r]{10,500})`, 'gi'),

      // Verse number at start: "16 For God so loved... (John 3)"
      new RegExp(`^(\\d+)\\s+([^\\n\\r]{20,400}?)\\s+\\((${allBookMatchers})\\s+(\\d+)\\)`, 'gmi'),

      // Simple verse reference followed by text on next line
      new RegExp(`(${allBookMatchers})\\s+(\\d+):(\\d+)\\s*[\\n\\r]\\s*([^\\n\\r]{10,500})`, 'gi'),

      // Verse with book abbreviation
      new RegExp(`\\b(${bookAbbreviations})\\s+(\\d+):(\\d+)\\s+([^\\n\\r]{10,500})`, 'gi'),

      // Format with colon and space: "John 3: 16 For God so loved..."
      new RegExp(`(${allBookMatchers})\\s+(\\d+):\\s+(\\d+)\\s+([^\\n\\r]{10,500})`, 'gi'),

      // Format with verse range: "John 3:16-17 For God so loved..."
      new RegExp(`(${allBookMatchers})\\s+(\\d+):(\\d+)[-–](\\d+)\\s+([^\\n\\r]{10,500})`, 'gi'),

      // Parenthetical reference at end: "For God so loved... (John 3:16)"
      new RegExp(`([^\\n\\r]{20,400})\\s+\\((${allBookMatchers})\\s+(\\d+):(\\d+)\\)`, 'gi'),
    ];

    console.log('🔍 Extracting verses with enhanced patterns...');

    for (let patternIndex = 0; patternIndex < versePatterns.length; patternIndex++) {
      const pattern = versePatterns[patternIndex];
      const matches = text.matchAll(pattern);

      for (const match of matches) {
        let book: string, chapter: string, verse: string, verseText: string;

        // Handle different pattern formats
        if (patternIndex === 3) { // Reverse format: "16 For God... (John 3)"
          [, verse, verseText, book, chapter] = match.map((m, i) =>
            i === 0 ? m : (m || '').trim()
          );
        } else if (patternIndex === 7) { // Verse range format
          [, book, chapter, verse, , verseText] = match.map((m, i) =>
            i === 0 ? m : (m || '').trim()
          );
        } else if (patternIndex === 8) { // Parenthetical at end
          [, verseText, book, chapter, verse] = match.map((m, i) =>
            i === 0 ? m : (m || '').trim()
          );
        } else {
          // Standard format: [full, book, chapter, verse, text]
          [, book, chapter, verse, verseText] = match.map((m, i) =>
            i === 0 ? m : (m || '').trim()
          );
        }

        const cleanText = this.cleanVerseText(verseText);

        if (this.isValidVerse(cleanText, book, parseInt(chapter), parseInt(verse))) {
          const extractedVerse: ExtractedVerse = {
            id: `pattern_verse_${Date.now()}_${verses.length}`,
            text: cleanText,
            reference: `${this.normalizeBookName(book)} ${chapter}:${verse}`,
            book: this.normalizeBookName(book),
            chapter: parseInt(chapter),
            verse: parseInt(verse),
            confidence: this.calculateVerseConfidence(cleanText, book),
            context: this.extractContext(text, match.index || 0, 150),
          };
          verses.push(extractedVerse);

          // Progress update
          onProgress?.({
            stage: 'extracting',
            progress: 70 + (patternIndex / versePatterns.length) * 10,
            message: `Pattern ${patternIndex + 1}: Found ${verses.length} verses...`,
          });
        }
      }
    }

    console.log(`📊 Enhanced patterns found ${verses.length} verses`);
    return verses;
  }

  // Contextual analysis for verse detection
  private async extractWithContextualAnalysis(
    text: string,
    allBookMatchers: string,
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<ExtractedVerse[]> {
    const verses: ExtractedVerse[] = [];
    const lines = text.split(/\n/);

    console.log('🧐 Applying contextual analysis...');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length < 20) continue;

      // Score the line for biblical content
      const biblicalScore = this.scoreBiblicalContent(line);

      if (biblicalScore > 40) {
        // Look for verse references in surrounding context
        const contextLines = [
          lines[i - 2]?.trim() || '',
          lines[i - 1]?.trim() || '',
          line,
          lines[i + 1]?.trim() || '',
          lines[i + 2]?.trim() || '',
        ].join(' ');

        const verseRefMatch = contextLines.match(new RegExp(`(${allBookMatchers})\\s+(\\d+):(\\d+)`, 'i'));

        if (verseRefMatch) {
          const [, book, chapter, verse] = verseRefMatch;
          const cleanText = this.cleanVerseText(line);

          if (this.isValidVerse(cleanText, book, parseInt(chapter), parseInt(verse))) {
            verses.push({
              id: `contextual_verse_${Date.now()}_${verses.length}`,
              text: cleanText,
              reference: `${this.normalizeBookName(book)} ${chapter}:${verse}`,
              book: this.normalizeBookName(book),
              chapter: parseInt(chapter),
              verse: parseInt(verse),
              confidence: Math.min(80, biblicalScore + 10),
              context: contextLines.substring(0, 200),
            });
          }
        }
      }
    }

    console.log(`🎯 Contextual analysis found ${verses.length} verses`);
    return verses;
  }

  // Intelligent content scoring for verse detection
  private async extractWithIntelligentScoring(
    text: string,
    onProgress?: (progress: ExtractionProgress) => void
  ): Promise<ExtractedVerse[]> {
    const verses: ExtractedVerse[] = [];

    console.log('🤖 Applying intelligent content scoring...');

    // Split text into potential verse segments
    const segments = this.segmentTextIntelligently(text);

    segments.forEach((segment, index) => {
      const score = this.scoreVerseContent(segment);

      if (score > 60) {
        const cleanText = this.cleanVerseText(segment);

        if (cleanText.length > 15 && cleanText.length < 400) {
          verses.push({
            id: `intelligent_verse_${Date.now()}_${index}`,
            text: cleanText,
            reference: `Intelligent Extract ${index + 1}`,
            book: 'Unknown',
            chapter: 1,
            verse: index + 1,
            confidence: Math.min(75, score),
            context: segment.substring(0, 200),
          });
        }
      }
    });

    console.log(`🎯 Intelligent scoring found ${verses.length} verses`);
    return verses;
  }

  // Intelligent text segmentation
  private segmentTextIntelligently(text: string): string[] {
    const segments: string[] = [];

    // Method 1: Split by sentences and group
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      if (sentence.length > 30) {
        segments.push(sentence);

        // Also try combining with next sentence
        if (i < sentences.length - 1) {
          const combined = sentence + '. ' + sentences[i + 1].trim();
          if (combined.length < 500) {
            segments.push(combined);
          }
        }
      }
    }

    // Method 2: Split by paragraphs
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 50);
    segments.push(...paragraphs);

    // Method 3: Split by double newlines
    const doubleNewlines = text.split(/\n\n/).filter(p => p.trim().length > 30);
    segments.push(...doubleNewlines);

    return [...new Set(segments)]; // Remove duplicates
  }

  // Score biblical content
  private scoreBiblicalContent(text: string): number {
    let score = 0;

    // Biblical keywords
    const biblicalWords = [
      'Lord', 'God', 'Jesus', 'Christ', 'faith', 'love', 'peace', 'salvation',
      'heaven', 'prayer', 'spirit', 'soul', 'righteousness', 'glory', 'mercy',
      'grace', 'blessed', 'holy', 'eternal', 'kingdom', 'disciples', 'apostle'
    ];

    const biblicalCount = biblicalWords.filter(word =>
      text.toLowerCase().includes(word.toLowerCase())
    ).length;
    score += biblicalCount * 5;

    // Verse-like language patterns
    if (text.includes(' said ') || text.includes(' spoke ') || text.includes(' answered ')) score += 10;
    if (text.includes(' shall ') || text.includes(' thou ') || text.includes(' thy ')) score += 15;
    if (text.match(/\b(and|but|for|therefore|thus|so)\b/gi)) score += 5;

    // Quote patterns
    if (text.includes('"') || text.includes('“') || text.includes('”')) score += 10;

    // Sentence structure (biblical style)
    const words = text.split(/\s+/);
    if (words.length > 8 && words.length < 50) score += 10;

    return score;
  }

  // Score individual verse content
  private scoreVerseContent(text: string): number {
    let score = this.scoreBiblicalContent(text);

    // Length scoring
    if (text.length > 50 && text.length < 300) score += 15;
    else if (text.length > 20 && text.length < 500) score += 10;

    // Completeness (sentence structure)
    if (text.match(/^[A-Z]/) && text.match(/[.!?]$/)) score += 10;

    // Word quality
    const words = text.split(/\s+/).filter(word => word.length > 2);
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    if (avgWordLength > 4) score += 5;

    return score;
  }

  // Clean verse text
  private cleanVerseText(text: string): string {
    return text
      .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^[^a-zA-Z]*/, '')
      .replace(/[^a-zA-Z.!?]*$/, '')
      .trim();
  }

  // Validate verse content
  private isValidVerse(text: string, book: string, chapter: number, verse: number): boolean {
    if (!text || text.length < 10 || text.length > 1000) return false;
    if (!book || chapter < 1 || verse < 1) return false;

    // Check for reasonable content
    const words = text.split(/\s+/).filter(word => word.length > 1);
    if (words.length < 3) return false;

    // Check for biblical book validity
    const normalizedBook = this.normalizeBookName(book);
    const validBook = ALL_BOOKS.some(b =>
      b.name.toLowerCase() === normalizedBook.toLowerCase() ||
      b.abbreviations.some(abbr => abbr.toLowerCase() === normalizedBook.toLowerCase())
    );

    return validBook;
  }

  // Normalize book names
  private normalizeBookName(book: string): string {
    const bookLower = book.toLowerCase().trim();
    const foundBook = ALL_BOOKS.find(b =>
      b.name.toLowerCase() === bookLower ||
      b.abbreviations.some(abbr => abbr.toLowerCase() === bookLower)
    );
    return foundBook ? foundBook.name : book;
  }

  // Calculate verse confidence
  private calculateVerseConfidence(text: string, book: string): number {
    let confidence = 50;

    // Length bonus
    if (text.length > 100) confidence += 20;
    else if (text.length > 50) confidence += 10;

    // Biblical content bonus
    confidence += this.scoreBiblicalContent(text) * 0.3;

    // Book validity bonus
    if (this.normalizeBookName(book) !== book) confidence += 15;

    return Math.min(95, Math.max(30, confidence));
  }

  // Extract context around a match
  private extractContext(text: string, index: number, contextLength: number): string {
    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + contextLength);
    return text.substring(start, end).trim();
  }

  // Deduplicate and validate verses
  private deduplicateAndValidateVerses(verses: ExtractedVerse[]): ExtractedVerse[] {
    // Remove duplicates based on text similarity
    const uniqueVerses: ExtractedVerse[] = [];

    for (const verse of verses) {
      const isDuplicate = uniqueVerses.some(existing => {
        const similarity = this.calculateTextSimilarity(verse.text, existing.text);
        return similarity > 0.8 ||
               (verse.book === existing.book &&
                verse.chapter === existing.chapter &&
                verse.verse === existing.verse);
      });

      if (!isDuplicate) {
        uniqueVerses.push(verse);
      }
    }

    // Sort by confidence and return top results
    return uniqueVerses
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 50); // Limit to top 50 verses
  }

  // Calculate text similarity
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    const allWords = [...new Set([...words1, ...words2])];
    const vector1 = allWords.map(word => words1.filter(w => w === word).length);
    const vector2 = allWords.map(word => words2.filter(w => w === word).length);

    // Calculate cosine similarity
    const dotProduct = vector1.reduce((sum, v1, i) => sum + v1 * vector2[i], 0);
    const magnitude1 = Math.sqrt(vector1.reduce((sum, v) => sum + v * v, 0));
    const magnitude2 = Math.sqrt(vector2.reduce((sum, v) => sum + v * v, 0));

    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    return dotProduct / (magnitude1 * magnitude2);
  }
}
