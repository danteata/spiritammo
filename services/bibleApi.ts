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
        // On native platforms (iOS/Android), use Expo Asset
        console.log('📖 Loading XML for native platform...');

        // ANDROID SPECIFIC: Try loading from native assets first (since we have the plugin)
        if (Platform.OS === 'android') {
          try {
            console.log('📖 Attempting to read from Android native assets using FileSystem...');
            // Note: FileSystem.readAsStringAsync supports file:///android_asset/ on some versions,
            // but sometimes we need to use the specific bundled asset approach.
            // Let's try the direct URI first.
            const uri = 'file:///android_asset/bible/eng-kjv.osis.xml';
            xmlContent = await FileSystem.readAsStringAsync(uri);
            console.log('✅ Successfully loaded Bible XML from Android native assets');
          } catch (androidError) {
            console.warn('⚠️ Failed to load from native assets (FileSystem):', androidError);

            // Second attempt: Try constructing a raw asset URI if the above failed
            try {
              // This is a backup strategy for some Android versions
              const uri = 'asset:///bible/eng-kjv.osis.xml';
              xmlContent = await FileSystem.readAsStringAsync(uri);
              console.log('✅ Successfully loaded Bible XML from Android native assets (asset:// scheme)');
            } catch (retryError) {
              console.warn('⚠️ Failed to load from native assets (asset:// scheme):', retryError);
            }
          }
        }

        // If not loaded yet (iOS or Android fallback failed), use Expo Asset
        if (!xmlContent) {
          try {
            console.log('📖 Falling back to Expo Asset system...');
            const asset = Asset.fromModule(require('../assets/bible/eng-kjv.osis.xml'));
            await asset.downloadAsync();

            const uri = asset.localUri || asset.uri;
            if (!uri) {
              throw new Error('No valid URI for Bible XML asset');
            }

            console.log('📖 Reading from asset URI:', uri);
            xmlContent = await FileSystem.readAsStringAsync(uri);
            console.log('✅ Successfully loaded Bible XML via Expo Asset');
          } catch (error) {
            console.error('❌ Failed to load from assets:', error);
            throw new Error('Could not load Bible XML from assets. Please ensure metro bundler is running with --clear cache.');
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
    // Optimized "Tag Scanner" approach
    // Instead of matching the whole verse (start+content+end) with a heavy regex,
    // we scan for tags and extract content by substring. This is much faster.

    console.log(`📖 Parsing XML content (length: ${xmlContent.length})`);

    // Relaxed regex to match both <verse ... /> and <verse ... >
    const tagRegex = /<verse\s+([^>]+)>/g;

    // Store the currently open verse
    let currentVerse: { osisId: string, sID: string, n: number, contentStartIndex: number } | null = null;
    let regexMatch: RegExpExecArray | null;
    let matchCount = 0;

    while ((regexMatch = tagRegex.exec(xmlContent)) !== null) {
      matchCount++;
      const tagAttributes = regexMatch[1];
      const tagIndex = regexMatch.index;
      const tagLength = regexMatch[0].length;

      if (matchCount <= 3) {
        console.log(`🔍 Match #${matchCount}: ${regexMatch[0].substring(0, 50)}...`);
      }

      // Check if it's a start tag (has sID) or end tag (has eID)
      if (tagAttributes.includes('sID="')) {
        // It's a start tag. Extract attributes.
        // Use strict regex to avoid matching substrings in other attributes (like osisID matching sID if it were possible)
        const osisIdMatch = tagAttributes.match(/(?:^|\s)osisID="([^"]+)"/);
        const sIdMatch = tagAttributes.match(/(?:^|\s)sID="([^"]+)"/);
        const nMatch = tagAttributes.match(/(?:^|\s)n="(\d+)"/);

        if (matchCount <= 3) {
          console.log(`🔍 Tag Attributes: [${tagAttributes}]`);
          if (sIdMatch) console.log(`   sID match: ${sIdMatch[1]}`);
          else console.log(`   sID match: null`);
        }

        if (osisIdMatch && sIdMatch && nMatch) {
          if (matchCount <= 3) console.log(`➡️ Start tag found: ${osisIdMatch[1]} (sID: ${sIdMatch[1]})`);
          currentVerse = {
            osisId: osisIdMatch[1],
            sID: sIdMatch[1],
            n: parseInt(nMatch[1]),
            contentStartIndex: tagIndex + tagLength
          };
        } else {
          if (matchCount <= 3) console.log(`⚠️ Start tag missing attributes: ${tagAttributes}`);
        }
      } else if (tagAttributes.includes('eID="')) {
        // It's an end tag.
        const eIdMatch = tagAttributes.match(/eID="([^"]+)"/);

        if (eIdMatch) {
          if (matchCount <= 3) console.log(`⬅️ End tag found: ${eIdMatch[1]}`);

          if (currentVerse) {
            if (eIdMatch[1] === currentVerse.sID) {
              // Found the closing tag for the current verse
              // Extract content using substring (extremely fast)
              const rawContent = xmlContent.substring(currentVerse.contentStartIndex, tagIndex);

              if (matchCount <= 3) console.log(`📝 Raw content length: ${rawContent.length}`);

              // Clean up content
              const cleanContent = rawContent
                .replace(/<[^>]+>/g, '') // Remove all XML tags inside
                .replace(/\s+/g, ' ')    // Condense whitespace
                .trim();

              if (cleanContent) {
                if (matchCount <= 3) console.log(`✅ Content extracted: "${cleanContent.substring(0, 20)}..."`);
                this.addVerse(currentVerse.osisId, currentVerse.n, cleanContent);
              } else {
                if (matchCount <= 3) console.log(`⚠️ Content empty after cleanup`);
              }

              // Reset
              currentVerse = null;
            } else {
              if (matchCount <= 3) console.log(`⚠️ Mismatch: End tag ${eIdMatch[1]} != Current ${currentVerse.sID}`);
            }
          } else {
            if (matchCount <= 3) console.log(`⚠️ End tag found but no current verse open`);
          }
        }
      }
    }

    // Sort verses in each chapter by verse number
    for (const chapterData of this.parsedChapters.values()) {
      chapterData.verses.sort((a, b) => a.verse - b.verse);
    }
  }

  private addVerse(osisId: string, verseNum: number, text: string) {
    // Parse book and chapter from osisId
    const [bookAbbrev, chapterStr] = osisId.split('.');
    const chapter = parseInt(chapterStr);

    const normalizedBookName = this.normalizeBookName(bookAbbrev);

    // Debug first few adds
    if (this.parsedVerses.size < 3) {
      console.log(`➕ Adding verse: ${normalizedBookName} ${chapter}:${verseNum}`);
    }

    const verseObj: BibleVerse = {
      book: normalizedBookName,
      chapter,
      verse: verseNum,
      text,
      reference: `${normalizedBookName} ${chapter}:${verseNum}`,
      isJesusWords: false // Simplified for now
    };

    const verseKey = `${bookAbbrev}.${chapter}.${verseNum}`;
    this.parsedVerses.set(verseKey, verseObj);

    const chapterKey = `${bookAbbrev}.${chapter}`;
    if (!this.parsedChapters.has(chapterKey)) {
      this.parsedChapters.set(chapterKey, {
        book: normalizedBookName,
        chapter: chapter,
        verses: []
      });
    }
    this.parsedChapters.get(chapterKey)?.verses.push(verseObj);
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
      'psalm': 'Ps',
      'proverbs': 'Prov',
      'ecclesiastes': 'Eccl',
      'song of solomon': 'Song',
      'song of songs': 'Song',
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
      'zephaniah': 'Zeph',
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
      'philemon': 'Phlm',
      'hebrews': 'Heb',
      'james': 'Jas',
      '1 peter': '1Pet',
      '2 peter': '2Pet',
      '1 john': '1John',
      '2 john': '2John',
      '3 john': '3John',
      'jude': 'Jude',
      'revelation': 'Rev',
    };

    const normalized = book.toLowerCase().trim();
    const abbrev = reverseBookMap[normalized];

    if (!abbrev) {
      console.warn(`⚠️ Could not find abbreviation for book: "${book}" (normalized: "${normalized}")`);
      // Try to return capitalized version as fallback
      return book.charAt(0).toUpperCase() + book.slice(1);
    }

    return abbrev;
  }

  /**
   * Normalize book names to match the app's format
   */
  public normalizeBookName(book: string): string {
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
