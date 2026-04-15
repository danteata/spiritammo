import { useState, useCallback, useMemo, useRef } from 'react';
import { Scripture } from '@/types/scripture';
import { bibleApiService, BibleVerse, ParsedReference } from '@/services/bibleApi';
import { BOOKS } from '@/mocks/books';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BiblePosition {
  book: string;
  chapter: number;
  highlightVerse?: number; // for deep linking
}

interface HistoryEntry extends BiblePosition {}

const RECENT_SEARCHES_KEY = '@spiritammo_bible_recent_searches';
const MAX_RECENT_SEARCHES = 10;

export function useBibleReader(scriptures: Scripture[]) {
  const [currentBook, setCurrentBook] = useState<string>('John');
  const [currentChapter, setCurrentChapter] = useState<number>(3);
  const [highlightedVerse, setHighlightedVerse] = useState<number | undefined>(undefined);
  const [selectedVerseIds, setSelectedVerseIds] = useState<Set<string>>(new Set());
  const [selectedVerses, setSelectedVerses] = useState<Scripture[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const historyStack = useRef<HistoryEntry[]>([]);

  // Build a fast lookup Set of verse IDs already in the arsenal
  const arsenalVerseIds = useMemo(() => {
    return new Set(scriptures.map(s => s.id));
  }, [scriptures]);

  // Build a map from verse ID → scripture (for quick mastery data access)
  const arsenalVerseMap = useMemo(() => {
    const map = new Map<string, Scripture>();
    scriptures.forEach(s => map.set(s.id, s));
    return map;
  }, [scriptures]);

  // Check if a BibleVerse is in the arsenal by constructing its ID
  const getArsenalData = useCallback((verse: BibleVerse): Scripture | null => {
    const id = `${verse.book.toLowerCase()}-${verse.chapter}-${verse.verse}`;
    return arsenalVerseMap.get(id) || null;
  }, [arsenalVerseMap]);

  // Navigate to a specific book/chapter, with optional verse highlight
  const navigateToVerse = useCallback((book: string, chapter: number, verse?: number) => {
    // Save current position to history
    historyStack.current.push({ book: currentBook, chapter: currentChapter });
    if (historyStack.current.length > 30) historyStack.current.shift();

    setCurrentBook(book);
    setCurrentChapter(chapter);
    setHighlightedVerse(verse);
    setSelectedVerseIds(new Set());
    setSelectedVerses([]);
  }, [currentBook, currentChapter]);

  // Navigate using a parsed reference
  const navigateToReference = useCallback((ref: ParsedReference) => {
    navigateToVerse(ref.book, ref.chapter, ref.startVerse);
  }, [navigateToVerse]);

  // Go back in history
  const goBack = useCallback(() => {
    const prev = historyStack.current.pop();
    if (prev) {
      setCurrentBook(prev.book);
      setCurrentChapter(prev.chapter);
      setHighlightedVerse(prev.highlightVerse);
      setSelectedVerseIds(new Set());
      setSelectedVerses([]);
    }
  }, []);

  const canGoBack = historyStack.current.length > 0;

  // Chapter navigation with bounds
  const goToChapter = useCallback((chapter: number) => {
    setCurrentChapter(chapter);
    setHighlightedVerse(undefined);
    setSelectedVerseIds(new Set());
    setSelectedVerses([]);
  }, []);

  const goToPreviousChapter = useCallback(() => {
    if (currentChapter > 1) {
      goToChapter(currentChapter - 1);
    }
  }, [currentChapter, goToChapter]);

  const goToNextChapter = useCallback((totalChapters: number) => {
    if (currentChapter < totalChapters) {
      goToChapter(currentChapter + 1);
    }
  }, [currentChapter, goToChapter]);

  // Toggle verse selection
  const toggleVerseSelection = useCallback((verse: BibleVerse) => {
    const id = `${verse.book.toLowerCase()}-${verse.chapter}-${verse.verse}`;
    setSelectedVerseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

    setSelectedVerses(prev => {
      const exists = prev.find(v =>
        v.book.toLowerCase() === verse.book.toLowerCase() &&
        v.chapter === verse.chapter &&
        v.verse === verse.verse
      );
      if (exists) {
        return prev.filter(v => !(
          v.book.toLowerCase() === verse.book.toLowerCase() &&
          v.chapter === verse.chapter &&
          v.verse === verse.verse
        ));
      } else {
        const s: Scripture = {
          id,
          book: verse.book,
          chapter: verse.chapter,
          verse: verse.verse,
          endVerse: verse.verse,
          text: verse.text,
          reference: verse.reference,
          mnemonic: '',
          isJesusWords: verse.isJesusWords,
        };
        return [...prev, s];
      }
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedVerseIds(new Set());
    setSelectedVerses([]);
  }, []);

  // Get chapters that contain arsenal verses for a book (for chapter nav dots)
  const getChaptersWithArsenal = useCallback((book: string): Set<number> => {
    const chapters = new Set<number>();
    scriptures.forEach(s => {
      if (s.book.toLowerCase() === book.toLowerCase()) {
        chapters.add(s.chapter);
      }
    });
    return chapters;
  }, [scriptures]);

  // Recent searches persistence
  const addRecentSearch = useCallback(async (query: string) => {
    setRecentSearches(prev => {
      const next = [query, ...prev.filter(s => s !== query)].slice(0, MAX_RECENT_SEARCHES);
      AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const loadRecentSearches = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch {}
  }, []);

  // Chapter count from BOOKS mock (fast, synchronous)
  const getChapterCount = useCallback((bookName: string): number => {
    const book = BOOKS.find(b => b.name.toLowerCase() === bookName.toLowerCase());
    return book?.chapters || 0;
  }, []);

  const currentChapterCount = useMemo(
    () => getChapterCount(currentBook),
    [currentBook, getChapterCount]
  );

  const chaptersWithArsenal = useMemo(
    () => getChaptersWithArsenal(currentBook),
    [currentBook, getChaptersWithArsenal]
  );

  return {
    // Current position
    currentBook,
    currentChapter,
    highlightedVerse,
    currentChapterCount,

    // Selection
    selectedVerseIds,
    selectedVerses,
    toggleVerseSelection,
    clearSelection,

    // Arsenal awareness
    arsenalVerseIds,
    arsenalVerseMap,
    getArsenalData,
    chaptersWithArsenal,

    // Navigation
    navigateToVerse,
    navigateToReference,
    goBack,
    canGoBack,
    goToChapter,
    goToPreviousChapter,
    goToNextChapter,
    setCurrentBook,

    // Recent searches
    recentSearches,
    addRecentSearch,
    loadRecentSearches,

    // Utilities
    getChapterCount,
  };
}
