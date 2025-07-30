import AsyncStorage from '@react-native-async-storage/async-storage';
import { Collection, CollectionChapter, Scripture } from '@/types/scripture';

// Collection chapter management service
export class CollectionChapterService {
  
  // Analyze scriptures and suggest chapter organization
  static analyzeScripturesForChapters(scriptures: Scripture[]): {
    canBeChapterBased: boolean;
    suggestedChapters: CollectionChapter[];
    sourceBook?: string;
    stats: {
      totalBooks: number;
      totalChapters: number;
      consecutiveChapters: boolean;
      singleBook: boolean;
    };
  } {
    if (scriptures.length === 0) {
      return {
        canBeChapterBased: false,
        suggestedChapters: [],
        stats: { totalBooks: 0, totalChapters: 0, consecutiveChapters: false, singleBook: false }
      };
    }

    // Group scriptures by book and chapter
    const bookChapterMap = new Map<string, Map<number, Scripture[]>>();
    const books = new Set<string>();
    
    scriptures.forEach(scripture => {
      if (!scripture.book || scripture.chapter === undefined) return;
      
      books.add(scripture.book);
      
      if (!bookChapterMap.has(scripture.book)) {
        bookChapterMap.set(scripture.book, new Map());
      }
      
      const chapterMap = bookChapterMap.get(scripture.book)!;
      if (!chapterMap.has(scripture.chapter)) {
        chapterMap.set(scripture.chapter, []);
      }
      
      chapterMap.get(scripture.chapter)!.push(scripture);
    });

    const totalBooks = books.size;
    const singleBook = totalBooks === 1;
    const sourceBook = singleBook ? Array.from(books)[0] : undefined;
    
    // Calculate total chapters across all books
    let totalChapters = 0;
    bookChapterMap.forEach(chapterMap => {
      totalChapters += chapterMap.size;
    });

    // Check if chapters are consecutive (for single book)
    let consecutiveChapters = false;
    if (singleBook && sourceBook) {
      const chapters = Array.from(bookChapterMap.get(sourceBook)!.keys()).sort((a, b) => a - b);
      consecutiveChapters = this.areChaptersConsecutive(chapters);
    }

    // Determine if collection can be chapter-based
    const canBeChapterBased = totalChapters > 1 && (singleBook || totalBooks <= 3);

    // Generate suggested chapters
    const suggestedChapters: CollectionChapter[] = [];
    
    if (canBeChapterBased) {
      bookChapterMap.forEach((chapterMap, book) => {
        const sortedChapters = Array.from(chapterMap.keys()).sort((a, b) => a - b);
        
        sortedChapters.forEach(chapterNum => {
          const chapterScriptures = chapterMap.get(chapterNum)!;
          const chapterName = this.generateChapterName(book, chapterNum, chapterScriptures);
          
          suggestedChapters.push({
            id: `chapter_${book.toLowerCase().replace(/\s+/g, '_')}_${chapterNum}`,
            chapterNumber: chapterNum,
            name: chapterName,
            description: `${chapterScriptures.length} verses from ${book} ${chapterNum}`,
            scriptures: chapterScriptures.map(s => s.id),
            isCompleted: false,
            isCustomSection: !singleBook, // Multi-book collections use custom sections
          });
        });
      });
    }

    return {
      canBeChapterBased,
      suggestedChapters: suggestedChapters.sort((a, b) => {
        // Sort by book order, then chapter number
        if (a.name && b.name) {
          return a.name.localeCompare(b.name);
        }
        return a.chapterNumber - b.chapterNumber;
      }),
      sourceBook,
      stats: {
        totalBooks,
        totalChapters,
        consecutiveChapters,
        singleBook
      }
    };
  }

  // Check if chapters are consecutive
  private static areChaptersConsecutive(chapters: number[]): boolean {
    if (chapters.length <= 1) return true;
    
    for (let i = 1; i < chapters.length; i++) {
      if (chapters[i] !== chapters[i - 1] + 1) {
        return false;
      }
    }
    return true;
  }

  // Generate meaningful chapter names
  private static generateChapterName(book: string, chapter: number, scriptures: Scripture[]): string {
    // Special cases for well-known chapters
    const specialChapters: { [key: string]: string } = {
      'Genesis_1': 'Creation',
      'Genesis_2': 'Garden of Eden',
      'Genesis_3': 'The Fall',
      'Exodus_20': 'Ten Commandments',
      'Psalm_23': 'The Lord is My Shepherd',
      'Psalm_91': 'Under His Wings',
      'Psalm_119': 'Your Word is a Lamp',
      'Matthew_5': 'Sermon on the Mount - Beatitudes',
      'Matthew_6': 'Sermon on the Mount - Prayer',
      'Matthew_7': 'Sermon on the Mount - Golden Rule',
      'John_3': 'Born Again',
      'John_14': 'I Am the Way',
      'Romans_8': 'Life in the Spirit',
      '1_Corinthians_13': 'Love Chapter',
      'Ephesians_6': 'Armor of God',
      'Philippians_4': 'Rejoice in the Lord',
      'Hebrews_11': 'Faith Hall of Fame',
      'James_1': 'Trials and Temptations',
      'Revelation_21': 'New Heaven and Earth',
    };

    const key = `${book.replace(/\s+/g, '_')}_${chapter}`;
    if (specialChapters[key]) {
      return `${book} ${chapter}: ${specialChapters[key]}`;
    }

    // Default naming
    return `${book} Chapter ${chapter}`;
  }

  // Convert regular collection to chapter-based collection
  static async convertToChapterBased(
    collection: Collection, 
    scriptures: Scripture[]
  ): Promise<Collection> {
    const analysis = this.analyzeScripturesForChapters(scriptures);
    
    if (!analysis.canBeChapterBased) {
      throw new Error('Collection cannot be organized by chapters');
    }

    const updatedCollection: Collection = {
      ...collection,
      isChapterBased: true,
      chapters: analysis.suggestedChapters,
      sourceBook: analysis.sourceBook,
      bookInfo: analysis.sourceBook ? {
        totalChapters: analysis.stats.totalChapters,
        completedChapters: 0,
        averageAccuracy: 0,
      } : undefined,
    };

    return updatedCollection;
  }

  // Get scriptures for a specific chapter
  static getChapterScriptures(
    collection: Collection, 
    chapterId: string, 
    allScriptures: Scripture[]
  ): Scripture[] {
    if (!collection.isChapterBased || !collection.chapters) {
      return [];
    }

    const chapter = collection.chapters.find(c => c.id === chapterId);
    if (!chapter) return [];

    return allScriptures.filter(scripture => 
      chapter.scriptures.includes(scripture.id)
    );
  }

  // Update chapter progress
  static updateChapterProgress(
    collection: Collection,
    chapterId: string,
    accuracy: number,
    isCompleted: boolean = false
  ): Collection {
    if (!collection.isChapterBased || !collection.chapters) {
      return collection;
    }

    const updatedChapters = collection.chapters.map(chapter => {
      if (chapter.id === chapterId) {
        return {
          ...chapter,
          averageAccuracy: chapter.averageAccuracy 
            ? (chapter.averageAccuracy + accuracy) / 2 
            : accuracy,
          lastPracticed: new Date().toISOString(),
          isCompleted: isCompleted || chapter.isCompleted || false,
        };
      }
      return chapter;
    });

    // Update book info if available
    let updatedBookInfo = collection.bookInfo;
    if (updatedBookInfo) {
      const completedChapters = updatedChapters.filter(c => c.isCompleted).length;
      const totalAccuracy = updatedChapters
        .filter(c => c.averageAccuracy)
        .reduce((sum, c) => sum + (c.averageAccuracy || 0), 0);
      const chaptersWithAccuracy = updatedChapters.filter(c => c.averageAccuracy).length;

      updatedBookInfo = {
        ...updatedBookInfo,
        completedChapters,
        averageAccuracy: chaptersWithAccuracy > 0 ? totalAccuracy / chaptersWithAccuracy : 0,
      };
    }

    return {
      ...collection,
      chapters: updatedChapters,
      bookInfo: updatedBookInfo,
    };
  }

  // Create custom chapter/section
  static createCustomChapter(
    collection: Collection,
    name: string,
    description: string,
    scriptureIds: string[],
    sectionRange?: string
  ): Collection {
    if (!collection.isChapterBased) {
      // Convert to chapter-based first
      collection = { ...collection, isChapterBased: true, chapters: [] };
    }

    const newChapter: CollectionChapter = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      chapterNumber: (collection.chapters?.length || 0) + 1,
      name,
      description,
      scriptures: scriptureIds,
      isCompleted: false,
      isCustomSection: true,
      sectionRange,
    };

    return {
      ...collection,
      chapters: [...(collection.chapters || []), newChapter],
    };
  }

  // Remove chapter from collection
  static removeChapter(collection: Collection, chapterId: string): Collection {
    if (!collection.isChapterBased || !collection.chapters) {
      return collection;
    }

    const updatedChapters = collection.chapters.filter(c => c.id !== chapterId);
    
    // If no chapters left, convert back to regular collection
    if (updatedChapters.length === 0) {
      return {
        ...collection,
        isChapterBased: false,
        chapters: undefined,
        sourceBook: undefined,
        bookInfo: undefined,
      };
    }

    return {
      ...collection,
      chapters: updatedChapters,
    };
  }

  // Get chapter statistics
  static getChapterStats(collection: Collection): {
    totalChapters: number;
    completedChapters: number;
    averageAccuracy: number;
    lastPracticed?: string;
    progressPercentage: number;
  } {
    if (!collection.isChapterBased || !collection.chapters) {
      return {
        totalChapters: 0,
        completedChapters: 0,
        averageAccuracy: 0,
        progressPercentage: 0,
      };
    }

    const totalChapters = collection.chapters.length;
    const completedChapters = collection.chapters.filter(c => c.isCompleted).length;
    const chaptersWithAccuracy = collection.chapters.filter(c => c.averageAccuracy);
    const averageAccuracy = chaptersWithAccuracy.length > 0
      ? chaptersWithAccuracy.reduce((sum, c) => sum + (c.averageAccuracy || 0), 0) / chaptersWithAccuracy.length
      : 0;
    
    const lastPracticedDates = collection.chapters
      .map(c => c.lastPracticed)
      .filter(Boolean)
      .sort();
    const lastPracticed = lastPracticedDates.length > 0 
      ? lastPracticedDates[lastPracticedDates.length - 1] 
      : undefined;

    const progressPercentage = totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0;

    return {
      totalChapters,
      completedChapters,
      averageAccuracy,
      lastPracticed,
      progressPercentage,
    };
  }
}
