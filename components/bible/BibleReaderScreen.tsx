import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Animated,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '@/hooks/useAppStore';
import { useBibleReader } from '@/hooks/useBibleReader';
import { bibleApiService, BibleVerse, ParsedReference } from '@/services/bibleApi';
import { BOOKS } from '@/mocks/books';
import { Scripture } from '@/types/scripture';
import { MILITARY_TYPOGRAPHY } from '@/constants/colors';

import VerseRow from './VerseRow';
import ChapterNavBar from './ChapterNavBar';
import SmartSearchBar from './SmartSearchBar';
import SelectionHUD from './SelectionHUD';
import BookSelector from '@/components/BookSelector';
import { Book, Collection } from '@/types/scripture';

type ReaderMode = 'browsing' | 'reading';

interface BibleReaderScreenProps {
  initialBook?: string;
  initialChapter?: number;
  initialVerse?: number;
  onRequestAddToCollection: (verses: Scripture[], collection?: Collection) => void;
  onRequestDrill: (verses: Scripture[]) => void;
}

export default function BibleReaderScreen({
  initialBook,
  initialChapter,
  initialVerse,
  onRequestAddToCollection,
  onRequestDrill,
}: BibleReaderScreenProps) {
  const { theme, isDark, scriptures: arsenalScriptures, userSettings } = useAppStore();
  const insets = useSafeAreaInsets();

  const {
    currentBook,
    currentChapter,
    highlightedVerse,
    currentChapterCount,
    selectedVerseIds,
    selectedVerses,
    toggleVerseSelection,
    clearSelection,
    arsenalVerseIds,
    getArsenalData,
    chaptersWithArsenal,
    navigateToVerse,
    navigateToReference,
    goBack,
    canGoBack,
    goToChapter,
    goToPreviousChapter,
    goToNextChapter,
    setCurrentBook,
    recentSearches,
    addRecentSearch,
    loadRecentSearches,
  } = useBibleReader(arsenalScriptures);

  const [mode, setMode] = useState<ReaderMode>(initialBook ? 'reading' : 'browsing');
  const [chapterVerses, setChapterVerses] = useState<BibleVerse[]>([]);
  const [isLoadingChapter, setIsLoadingChapter] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Load chapter verses
  const loadChapter = useCallback(async (book: string, chapter: number) => {
    setIsLoadingChapter(true);
    try {
      const bookObj = BOOKS.find(b => b.name.toLowerCase() === book.toLowerCase());
      if (!bookObj) return;
      const data = await bibleApiService.getChapter(bookObj.name, chapter);
      setChapterVerses(data?.verses || []);
    } catch (e) {
      console.error('Failed to load chapter:', e);
      setChapterVerses([]);
    } finally {
      setIsLoadingChapter(false);
    }
  }, []);

  // Initial load and deep-link handling
  useEffect(() => {
    if (initialBook) {
      navigateToVerse(initialBook, initialChapter || 1, initialVerse);
      setMode('reading');
    }
  }, []);

  // Load recent searches on mount
  useEffect(() => {
    loadRecentSearches();
  }, []);

  // Reload whenever book/chapter changes
  useEffect(() => {
    if (mode === 'reading') {
      loadChapter(currentBook, currentChapter);
    }
  }, [currentBook, currentChapter, mode]);

  // Scroll to highlighted verse after load
  useEffect(() => {
    if (highlightedVerse && chapterVerses.length > 0) {
      const index = chapterVerses.findIndex(v => v.verse === highlightedVerse);
      if (index >= 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
        }, 400);
      }
    }
  }, [highlightedVerse, chapterVerses]);

  const handleBookSelect = useCallback((book: Book) => {
    setCurrentBook(book.name);
    navigateToVerse(book.name, 1);
    setMode('reading');
  }, [setCurrentBook, navigateToVerse]);

  const handleReferenceSelect = useCallback((ref: ParsedReference) => {
    addRecentSearch(`${ref.book} ${ref.chapter}${ref.startVerse ? `:${ref.startVerse}` : ''}`);
    navigateToReference(ref);
    setMode('reading');
  }, [addRecentSearch, navigateToReference]);

  const handleVerseSearchSelect = useCallback((verse: BibleVerse) => {
    navigateToVerse(verse.book, verse.chapter, verse.verse);
    setMode('reading');
  }, [navigateToVerse]);

  const handleVerseLongPress = useCallback((verse: BibleVerse) => {
    // Long press also toggles selection
    toggleVerseSelection(verse);
  }, [toggleVerseSelection]);

  const currentBookData = BOOKS.find(b => b.name.toLowerCase() === currentBook.toLowerCase());
  const testament = currentBookData?.testament === 'new' ? 'NEW TESTAMENT' : 'OLD TESTAMENT';

  // ── Render individual verse ──────────────────────────────────────────────────
  const renderVerse = useCallback(({ item }: { item: BibleVerse }) => {
    const verseId = `${item.book.toLowerCase()}-${item.chapter}-${item.verse}`;
    const isSelected = selectedVerseIds.has(verseId);
    const isHighlighted = item.verse === highlightedVerse;
    const arsenalData = getArsenalData(item);

    return (
      <VerseRow
        verse={item}
        isSelected={isSelected}
        isHighlighted={isHighlighted}
        arsenalData={arsenalData}
        onPress={toggleVerseSelection}
        onLongPress={handleVerseLongPress}
        theme={theme}
        isDark={isDark}
      />
    );
  }, [selectedVerseIds, highlightedVerse, getArsenalData, toggleVerseSelection, handleVerseLongPress, theme, isDark]);

  const keyExtractor = useCallback((item: BibleVerse) => `${item.chapter}:${item.verse}`, []);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: 70,
    offset: 70 * index,
    index,
  }), []);

  // ── Header ───────────────────────────────────────────────────────────────────
  const renderHeader = () => (
    <View>
      {/* Sticky dynamic title bar (fades in on scroll) */}
      <Animated.View style={[styles.stickyTitle, {
        opacity: headerOpacity,
        backgroundColor: isDark ? theme.background : '#FFFFFF',
        borderBottomColor: theme.border,
      }]}>
        <Text style={[styles.stickyTitleText, { color: theme.text }]}>
          {currentBook} {currentChapter}
        </Text>
      </Animated.View>

      {/* Chapter hero header */}
      <LinearGradient
        colors={isDark
          ? [theme.surface, theme.background]
          : ['#F8FAFC', '#FFFFFF']}
        style={styles.chapterHero}
      >
        <Text style={[styles.testamentLabel, { color: theme.accent }]}>
          {testament}
        </Text>
        <Text style={[styles.chapterTitle, { color: theme.text }]}>
          {currentBook}
        </Text>
        <View style={styles.chapterNumRow}>
          <TouchableOpacity
            onPress={goToPreviousChapter}
            disabled={currentChapter <= 1}
            style={styles.chapterArrow}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={currentChapter <= 1 ? theme.border : theme.accent}
            />
          </TouchableOpacity>

          <Text style={[styles.chapterNum, { color: theme.text }]}>
            Chapter {currentChapter}
          </Text>

          <TouchableOpacity
            onPress={() => goToNextChapter(currentChapterCount)}
            disabled={currentChapter >= currentChapterCount}
            style={styles.chapterArrow}
          >
            <Ionicons
              name="chevron-forward"
              size={22}
              color={currentChapter >= currentChapterCount ? theme.border : theme.accent}
            />
          </TouchableOpacity>
        </View>

        {/* Arsenal stats for this chapter */}
        {chaptersWithArsenal.has(currentChapter) && (
          <View style={[styles.arsenalBanner, { backgroundColor: `${theme.accent}15`, borderColor: `${theme.accent}30` }]}>
            <Ionicons name="shield-checkmark" size={13} color={theme.accent} />
            <Text style={[styles.arsenalBannerText, { color: theme.accent }]}>
              Arsenal verses in this chapter
            </Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );

  // ── Footer ───────────────────────────────────────────────────────────────────
  const renderFooter = () => (
    <View style={styles.chapterFooter}>
      <View style={styles.footerNavRow}>
        <TouchableOpacity
          style={[styles.footerNavBtn, {
            backgroundColor: isDark ? theme.surface : '#F1F5F9',
            opacity: currentChapter <= 1 ? 0.4 : 1,
          }]}
          onPress={goToPreviousChapter}
          disabled={currentChapter <= 1}
        >
          <Ionicons name="chevron-back" size={16} color={theme.text} />
          <Text style={[styles.footerNavText, { color: theme.text }]}>
            Chapter {currentChapter - 1}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.footerNavBtn, {
            backgroundColor: isDark ? theme.surface : '#F1F5F9',
            opacity: currentChapter >= currentChapterCount ? 0.4 : 1,
          }]}
          onPress={() => goToNextChapter(currentChapterCount)}
          disabled={currentChapter >= currentChapterCount}
        >
          <Text style={[styles.footerNavText, { color: theme.text }]}>
            Chapter {currentChapter + 1}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={theme.text} />
        </TouchableOpacity>
      </View>
      <View style={{ height: 120 }} />
    </View>
  );

  // ── Main Render ──────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* Smart Search Bar — always visible at top */}
      <View style={{ paddingTop: insets.top + (Platform.OS === 'android' ? 8 : 0) }}>
        <SmartSearchBar
          onReferenceSelect={handleReferenceSelect}
          onVerseSelect={handleVerseSearchSelect}
          recentSearches={recentSearches}
          onSearch={addRecentSearch}
          theme={theme}
          isDark={isDark}
        />
      </View>

      {/* Back to browse button */}
      {mode === 'reading' && (
        <TouchableOpacity
          style={[styles.backToBrowse, { backgroundColor: isDark ? theme.surface : '#F1F5F9' }]}
          onPress={() => {
            clearSelection();
            setMode('browsing');
          }}
        >
          <Ionicons name="grid" size={14} color={theme.textSecondary} />
          <Text style={[styles.backToBrowseText, { color: theme.textSecondary }]}>
            BROWSE BOOKS
          </Text>
        </TouchableOpacity>
      )}

      {mode === 'browsing' ? (
        // ── Browsing Mode ──────────────────────────────────────────────────────
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <View style={{ paddingTop: 8 }}>
              <Text style={[styles.browseTitle, MILITARY_TYPOGRAPHY.caption, { color: theme.textSecondary }]}>
                SELECT BOOK
              </Text>
              <BookSelector onSelectBook={handleBookSelect} />
            </View>
          }
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        // ── Reading Mode ───────────────────────────────────────────────────────
        <>
          {/* Chapter navigation bar */}
          <ChapterNavBar
            totalChapters={currentChapterCount}
            currentChapter={currentChapter}
            chaptersWithArsenal={chaptersWithArsenal}
            onSelectChapter={goToChapter}
            theme={theme}
            isDark={isDark}
          />

          {/* Chapter verse list */}
          {isLoadingChapter ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.accent} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                Loading {currentBook} {currentChapter}...
              </Text>
            </View>
          ) : (
            <Animated.FlatList
              ref={flatListRef}
              data={chapterVerses}
              renderItem={renderVerse}
              keyExtractor={keyExtractor}
              ListHeaderComponent={renderHeader}
              ListFooterComponent={renderFooter}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: false }
              )}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.verseListContent}
              keyboardShouldPersistTaps="handled"
              onScrollToIndexFailed={({ index }) => {
                setTimeout(() => {
                  flatListRef.current?.scrollToIndex({ index, animated: true });
                }, 500);
              }}
            />
          )}

          {/* Selection HUD */}
          <SelectionHUD
            selectedVerses={selectedVerses}
            onClear={clearSelection}
            onAddToCollection={onRequestAddToCollection}
            onDrillNow={onRequestDrill}
            theme={theme}
            isDark={isDark}
            userSettings={userSettings}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  browseTitle: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    letterSpacing: 1.5,
  },
  backToBrowse: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  backToBrowseText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.0,
    fontFamily: 'monospace',
  },
  stickyTitle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stickyTitleText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  chapterHero: {
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  testamentLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.0,
    fontFamily: 'monospace',
    marginBottom: 6,
  },
  chapterTitle: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  chapterNumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  chapterNum: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  chapterArrow: {
    padding: 4,
  },
  arsenalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  arsenalBannerText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    fontFamily: 'monospace',
  },
  verseListContent: {
    paddingBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chapterFooter: {
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  footerNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  footerNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  footerNavText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
