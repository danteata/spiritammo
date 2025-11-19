import { Scripture } from '@/types/scripture';
import { XMLParser } from 'fast-xml-parser';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform, NativeModules } from 'react-native';

export interface BibleVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  reference: string;
  isJesusWords?: boolean; // Track if this verse contains words of Jesus
}

export interface BibleChapter {
  book: string;
  chapter: number;
  verses: BibleVerse[];
}

interface OSISVerse {
  '@_osisID': string;
  '@_n': string;
  '#text'?: string;
}

interface OSISChapter {
  '@_osisRef': string;
  p?: any;
}

interface OSISBook {
  '@_osisID': string;
  '@_canonical'?: string;
  title?: any;
  chapter?: OSISChapter[];
}

interface OSISBookGroup {
  '@_canonical'?: string;
  title?: any;
  div?: OSISBook[];
}

interface OSISData {
  osisText: {
    div?: OSISBookGroup[];
  };
}

export class BibleApiService {
  private xmlData: OSISData | null = null;
  private parsedVerses: Map<string, BibleVerse> = new Map();
  private parsedChapters: Map<string, BibleChapter> = new Map();
  private isInitialized = false;

  constructor() {
    this.initializeXMLData();
  }

  private async initializeXMLData() {
    if (this.isInitialized) return;

    try {
      console.log('📖 Loading Bible XML data...');
      
      let xmlContent: string = '';
      
      if (Platform.OS === 'web') {
        // On web, fetch the XML file directly
        console.log('📖 Loading XML for web platform...');
        const response = await fetch(require('../assets/bible/eng-kjv.osis.xml'));
        xmlContent = await response.text();
      } else {
        // On native platforms (iOS/Android), read from bundled assets
        console.log('📖 Loading XML for native platform...');
        
        // For Android, use a native module to read the asset
        if (Platform.OS === 'android') {
          try {
            // Use FileSystem to read from Android assets
            const { RNFSManager } = NativeModules;
            
            // Try reading using react-native's asset system
            const assetPath = 'asset:/bible/eng-kjv.osis.xml';
            console.log('📖 Reading from Android asset:', assetPath);
            
            // Read using FileSystem with asset:// protocol
            xmlContent = await FileSystem.readAsStringAsync(assetPath, {
              encoding: FileSystem.EncodingType.UTF8
            });
            console.log('✅ Successfully loaded Bible XML from Android assets');
          } catch (androidError) {
            console.error('❌ Failed to load from Android assets:', androidError);
            throw new Error('Could not load Bible XML from Android assets');
          }
        } else {
          // For iOS, use the standard asset loading
          try {
            const asset = Asset.fromModule(require('../assets/bible/eng-kjv.osis.xml'));
            await asset.downloadAsync();
            
            const uri = asset.localUri || asset.uri;
            if (!uri) {
              throw new Error('No valid URI for Bible XML asset');
            }
            
            xmlContent = await FileSystem.readAsStringAsync(uri);
            console.log('✅ Successfully loaded Bible XML from iOS assets');
          } catch (iosError) {
            console.error('❌ Failed to load from iOS assets:', iosError);
            throw new Error('Could not load Bible XML from iOS assets');
          }
        }
      }
      
      console.log('📖 Parsing Bible verses from XML...');
      // Parse verses using regex since the OSIS format has complex verse tagging
      this.parseVersesFromXML(xmlContent);
      
      console.log(`✅ Loaded ${this.parsedVerses.size} verses from ${this.parsedChapters.size} chapters`);
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to load and parse Bible XML:', error);
    }
  }

  private parseVersesFromXML(xmlContent: string) {
    // Regex to match verse start and end tags with content between them
    const verseRegex = /<verse[^>]*osisID="([^"]+)"[^>]*sID="([^"]+)"[^>]*n="(\d+)"[^>]*\/>([^<]*(?:<(?!verse)[^<]*)*)<verse[^>]*eID="\2"[^>]*\/>/g;

    let match;
    while ((match = verseRegex.exec(xmlContent)) !== null) {
      const osisId = match[1]; // e.g., "Gen.1.1"
      const verseNum = parseInt(match[3]);
      let verseContent = match[4];

      // Check if this verse contains Jesus's words
      const hasJesusWords = /<q[^>]*who="Jesus"/.test(verseContent);

      // Clean up the text - remove XML tags and normalize whitespace
      let verseText = this.cleanXMLText(verseContent);

      // Skip empty verses
      if (!verseText) continue;

      // Parse book and chapter from osisId
      const [bookAbbrev, chapterStr, verseStr] = osisId.split('.');
      const chapter = parseInt(chapterStr);
      const verse = parseInt(verseStr);

      const normalizedBookName = this.normalizeBookName(bookAbbrev);

      const verseObj: BibleVerse = {
        book: normalizedBookName,
        chapter,
        verse,
        text: verseText,
        reference: `${normalizedBookName} ${chapter}:${verse}`,
        isJesusWords: hasJesusWords
      };

      // Store verse
      const verseKey = `${bookAbbrev}.${chapter}.${verse}`;
      this.parsedVerses.set(verseKey, verseObj);

      // Add to chapter if not already there
      const chapterKey = `${bookAbbrev}.${chapter}`;
      if (!this.parsedChapters.has(chapterKey)) {
        this.parsedChapters.set(chapterKey, {
          book: normalizedBookName,
          chapter,
          verses: []
        });
      }
      const chapterData = this.parsedChapters.get(chapterKey)!;
      if (!chapterData.verses.find(v => v.verse === verse)) {
        chapterData.verses.push(verseObj);
      }
    }

    // Sort verses in each chapter by verse number
    for (const chapterData of this.parsedChapters.values()) {
      chapterData.verses.sort((a, b) => a.verse - b.verse);
    }
  }

  /**
   * Clean XML text by removing tags and normalizing whitespace
   */
  private cleanXMLText(xmlText: string): string {
    // Remove XML tags but keep the text content
    let cleaned = xmlText
      // Remove self-closing tags
      .replace(/<[^>]+\/>/g, '')
      // Remove opening and closing tags
      .replace(/<\/?[^>]+>/g, '')
      // Decode HTML entities
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
    
    return cleaned;
  }

  /**
   * Check if the service is ready to use
   */
  async waitForInitialization(): Promise<boolean> {
    if (this.isInitialized) return true;
    
    // Wait up to 10 seconds for initialization
    const maxWaitTime = 10000;
    const startTime = Date.now();
    
    while (!this.isInitialized && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return this.isInitialized;
  }

  /**
   * Get initialization status
   */
  get ready(): boolean {
    return this.isInitialized;
  }

  /**
   * Fetch a specific verse from the local XML data
   */
  async getVerse(book: string, chapter: number, verse: number): Promise<BibleVerse | null> {
    await this.initializeXMLData();

    const normalizedBook = this.getBookAbbrev(book);
    const verseKey = `${normalizedBook}.${chapter}.${verse}`;

    return this.parsedVerses.get(verseKey) || null;
  }

  /**
   * Fetch all verses in a chapter from the local XML data
   */
  async getChapter(book: string, chapter: number): Promise<BibleChapter | null> {
    await this.initializeXMLData();

    const normalizedBook = this.getBookAbbrev(book);
    const chapterKey = `${normalizedBook}.${chapter}`;

    return this.parsedChapters.get(chapterKey) || null;
  }

  /**
   * Convert Bible verse to Scripture format for the app
   */
  bibleVerseToScripture(verse: BibleVerse): Scripture {
    return {
      id: `${verse.book.toLowerCase()}-${verse.chapter}-${verse.verse}`,
      book: verse.book,
      chapter: verse.chapter,
      verse: verse.verse,
      text: verse.text,
      reference: verse.reference,
      mnemonic: '', // Will be generated by battle intelligence API
      endVerse: verse.verse, // Single verse
      isJesusWords: verse.isJesusWords // Pass through Jesus words flag
    };
  }

  /**
   * Get verses for a range (e.g., verses 1-5)
   */
  async getVerseRange(book: string, chapter: number, startVerse: number, endVerse: number): Promise<Scripture[]> {
    const chapterData = await this.getChapter(book, chapter);

    if (!chapterData) {
      return [];
    }

    const rangeVerses = chapterData.verses.filter(
      verse => verse.verse >= startVerse && verse.verse <= endVerse
    );

    return rangeVerses.map(verse => this.bibleVerseToScripture(verse));
  }

  /**
   * Get book abbreviation from full name
   */
  private getBookAbbrev(book: string): string {
    const reverseBookMap: { [key: string]: string } = {
      'genesis': 'Gen',
      'exodus': 'Exo',
      'leviticus': 'Lev',
      'numbers': 'Num',
      'deuteronomy': 'Deut',
      'joshua': 'Josh',
      'judges': 'Judg',
      'ruth': 'Ruth',
      '1 samuel': '1Sam',
      '2 samuel': '2Sam',
      '1 kings': '1Ki',
      '2 kings': '2Ki',
      '1 chronicles': '1Chr',
      '2 chronicles': '2Chr',
      'ezra': 'Ezra',
      'nehemiah': 'Neh',
      'esther': 'Est',
      'job': 'Job',
      'psalms': 'Ps',
      'proverbs': 'Prov',
      'ecclesiastes': 'Eccl',
      'song of solomon': 'Song',
      'isaiah': 'Isa',
      'jeremiah': 'Jer',
      'lamentations': 'Lam',
      'ezekiel': 'Ezek',
      'daniel': 'Dan',
      'hosea': 'Hos',
      'joel': 'Joel',
      'amos': 'Amos',
      'obadiah': 'Obad',
      'jonah': 'Jonah',
      'micah': 'Mic',
      'nahum': 'Nah',
      'habakkuk': 'Hab',
      'zephaniah': 'Zep',
      'haggai': 'Hag',
      'zechariah': 'Zech',
      'malachi': 'Mal',
      'matthew': 'Matt',
      'mark': 'Mark',
      'luke': 'Luke',
      'john': 'John',
      'acts': 'Acts',
      'romans': 'Rom',
      '1 corinthians': '1Cor',
      '2 corinthians': '2Cor',
      'galatians': 'Gal',
      'ephesians': 'Eph',
      'philippians': 'Phil',
      'colossians': 'Col',
      '1 thessalonians': '1Thess',
      '2 thessalonians': '2Thess',
      '1 timothy': '1Tim',
      '2 timothy': '2Tim',
      'titus': 'Titus',
      'philemon': 'Philem',
      'hebrews': 'Heb',
      'james': 'James',
      '1 peter': '1Pet',
      '2 peter': '2Pet',
      '1 john': '1John',
      '2 john': '2John',
      '3 john': '3John',
      'jude': 'Jude',
      'revelation': 'Rev'
    };

    const normalized = book.toLowerCase().replace(/\s+/g, ' ');
    return reverseBookMap[normalized] || book;
  }

  /**
   * Normalize book names to match the app's format
   */
  private normalizeBookName(book: string): string {
    // Handle common abbreviations and variations
    const bookMap: { [key: string]: string } = {
      'gen': 'Genesis',
      'exo': 'Exodus',
      'lev': 'Leviticus',
      'num': 'Numbers',
      'deut': 'Deuteronomy',
      'josh': 'Joshua',
      'judg': 'Judges',
      'ruth': 'Ruth',
      '1sam': '1 Samuel',
      '2sam': '2 Samuel',
      '1ki': '1 Kings',
      '2ki': '2 Kings',
      '1chr': '1 Chronicles',
      '2chr': '2 Chronicles',
      'ezra': 'Ezra',
      'neh': 'Nehemiah',
      'est': 'Esther',
      'job': 'Job',
      'ps': 'Psalms',
      'prov': 'Proverbs',
      'eccl': 'Ecclesiastes',
      'song': 'Song of Solomon',
      'isa': 'Isaiah',
      'jer': 'Jeremiah',
      'lam': 'Lamentations',
      'ezek': 'Ezekiel',
      'dan': 'Daniel',
      'hos': 'Hosea',
      'joel': 'Joel',
      'amos': 'Amos',
      'obad': 'Obadiah',
      'jonah': 'Jonah',
      'mic': 'Micah',
      'nah': 'Nahum',
      'hab': 'Habakkuk',
      'zep': 'Zephaniah',
      'hag': 'Haggai',
      'zech': 'Zechariah',
      'mal': 'Malachi',
      'matt': 'Matthew',
      'mark': 'Mark',
      'luke': 'Luke',
      'john': 'John',
      'acts': 'Acts',
      'rom': 'Romans',
      '1cor': '1 Corinthians',
      '2cor': '2 Corinthians',
      'gal': 'Galatians',
      'eph': 'Ephesians',
      'phil': 'Philippians',
      'col': 'Colossians',
      '1thess': '1 Thessalonians',
      '2thess': '2 Thessalonians',
      '1tim': '1 Timothy',
      '2tim': '2 Timothy',
      'titus': 'Titus',
      'philem': 'Philemon',
      'heb': 'Hebrews',
      'james': 'James',
      '1pet': '1 Peter',
      '2pet': '2 Peter',
      '1john': '1 John',
      '2john': '2 John',
      '3john': '3 John',
      'jude': 'Jude',
      'rev': 'Revelation'
    };

    const normalized = book.toLowerCase().replace(/\s+/g, '');
    return bookMap[normalized] || book;
  }

  /**
   * Check if a book exists in the Bible
   */
  async bookExists(book: string): Promise<boolean> {
    try {
      // Try to fetch the first chapter of the book
      const result = await this.getChapter(book, 1);
      return result !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get the number of chapters in a book
   */
  async getBookChapters(book: string): Promise<number> {
    try {
      // Try chapters from 1 up to a reasonable maximum
      let chapter = 1;
      while (chapter <= 200) { // Safety limit
        const chapterData = await this.getChapter(book, chapter);
        if (!chapterData || chapterData.verses.length === 0) {
          return chapter - 1; // Return the last valid chapter
        }
        chapter++;
      }
      return 0;
    } catch {
      return 0;
    }
  }
}

// Export singleton instance
export const bibleApiService = new BibleApiService();
