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
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Clipboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useAppStore } from '@/hooks/useAppStore';
import { useBibleReader } from '@/hooks/useBibleReader';
import { bibleApiService, BibleVerse, ParsedReference } from '@/services/bibleApi';
import { BOOKS } from '@/mocks/books';
import { Scripture } from '@/types/scripture';
import { MILITARY_TYPOGRAPHY } from '@/constants/colors';
import VoicePlaybackService from '@/services/voicePlayback';

import VerseRow from './VerseRow';
import ChapterNavBar from './ChapterNavBar';
import SmartSearchBar from './SmartSearchBar';
import SelectionHUD from './SelectionHUD';
import ReaderSettingsModal from './ReaderSettingsModal';
import BookSelector from '@/components/BookSelector';
import { Book, Collection } from '@/types/scripture';

type ReaderMode = 'browsing' | 'reading';

interface BibleReaderScreenProps {
  initialBook?: string;
  initialChapter?: number;
  initialVerse?: number;
  deepLinkKey?: number;
  onRequestAddToCollection: (verses: Scripture[], collection?: Collection) => void;
  onRequestDrill: (verses: Scripture[]) => void;
}

export default function BibleReaderScreen({
  initialBook,
  initialChapter,
  initialVerse,
  deepLinkKey,
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
    highlights,
    notes,
    loadChapterInsights,
    saveHighlight,
    removeHighlight,
    saveNote,
  } = useBibleReader(arsenalScriptures);

  const [mode, setMode] = useState<ReaderMode>(initialBook ? 'reading' : 'browsing');
  const [chapterVerses, setChapterVerses] = useState<BibleVerse[]>([]);
  const [isLoadingChapter, setIsLoadingChapter] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const onScrollToIndexFailed = useCallback((info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
    const offset = info.averageItemLength * info.index;
    flatListRef.current?.scrollToOffset({ offset, animated: true });
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.3 });
    }, 500);
  }, []);

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
    loadRecentSearches();
    if (initialBook) {
      navigateToVerse(initialBook, initialChapter || 1, initialVerse);
      setMode('reading');
    } else {
      loadChapterInsights(currentBook, currentChapter);
    }
  }, []);

  // React to deep-link changes after mount (e.g. "View in Context" from another tab)
  useEffect(() => {
    if (initialBook && deepLinkKey !== undefined && deepLinkKey > 0) {
      navigateToVerse(initialBook, initialChapter || 1, initialVerse);
      setMode('reading');
    }
  }, [deepLinkKey]);

  // Reload whenever book/chapter changes
  useEffect(() => {
    if (mode === 'reading') {
      loadChapter(currentBook, currentChapter);
    }
  }, [currentBook, currentChapter, mode]);

  // Scroll to highlighted verse after load
  useEffect(() => {
    if (!isLoadingChapter && highlightedVerse && chapterVerses.length > 0) {
      const index = chapterVerses.findIndex(v => v.verse === highlightedVerse);
      if (index >= 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
        }, 800);
      }
    }
  }, [highlightedVerse, chapterVerses, isLoadingChapter, deepLinkKey]);

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
    toggleVerseSelection(verse);
  }, [toggleVerseSelection]);

  const handleHighlight = useCallback((color: string | null) => {
    selectedVerses.forEach(v => {
      saveHighlight(v.id, color || '#FDE047');
    });
  }, [selectedVerses, saveHighlight]);

  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteVerseId, setNoteVerseId] = useState('');

  const handleAddNote = useCallback(() => {
    if (selectedVerses.length === 0) return;
    const verse = selectedVerses[0];
    const existing = notes.get(verse.id) || '';
    setNoteVerseId(verse.id);
    setNoteText(existing);
    setNoteModalVisible(true);
  }, [selectedVerses, notes]);

  const handleSaveNote = useCallback(() => {
    if (noteVerseId) {
      saveNote(noteVerseId, noteText);
    }
    setNoteModalVisible(false);
    setNoteText('');
    setNoteVerseId('');
  }, [noteVerseId, noteText, saveNote]);

  const handleDeleteNote = useCallback(() => {
    if (noteVerseId) {
      saveNote(noteVerseId, '');
    }
    setNoteModalVisible(false);
    setNoteText('');
    setNoteVerseId('');
  }, [noteVerseId, saveNote]);

  const onGestureEvent = useCallback(({ nativeEvent }: any) => {
    if (nativeEvent.state === State.END) {
      const { translationX, velocityX } = nativeEvent;
      // Detect horizontal swipe with enough velocity/distance
      if (Math.abs(translationX) > 100 && Math.abs(velocityX) > 500) {
        if (translationX > 0) {
          goToPreviousChapter();
        } else {
          goToNextChapter(currentChapterCount);
        }
      }
    }
  }, [goToPreviousChapter, goToNextChapter, currentChapterCount]);

  const handleShare = useCallback(() => {
    if (selectedVerses.length === 0) return;
    const text = selectedVerses.map(v => `"${v.text}" — ${v.reference}`).join('\n\n');
    Clipboard.setString(text);
    Alert.alert('Copied to Clipboard', 'Verse text ready to share from clipboard.');
  }, [selectedVerses]);

  const [activelyReadingVerseId, setActivelyReadingVerseId] = useState<string | null>(null);
  const [isListeningToChapter, setIsListeningToChapter] = useState(false);
  const isReadingRef = useRef(false);

  const handleListenToChapter = useCallback(async () => {
    if (isReadingRef.current) {
      VoicePlaybackService.stopPlayback();
      isReadingRef.current = false;
      setActivelyReadingVerseId(null);
      setIsListeningToChapter(false);
      return;
    }

    const scriptures: Scripture[] = chapterVerses.map(v => ({
      id: `${v.book.toLowerCase()}-${v.chapter}-${v.verse}`,
      book: v.book,
      chapter: v.chapter,
      verse: v.verse,
      endVerse: v.verse,
      text: v.text,
      reference: v.reference,
      mnemonic: '',
      isJesusWords: v.isJesusWords,
    }));

    isReadingRef.current = true;
    setIsListeningToChapter(true);

    for (const v of scriptures) {
      if (!isReadingRef.current) break;
      setActivelyReadingVerseId(v.id);

      const idx = chapterVerses.findIndex(cv => cv.reference === v.reference);
      if (idx !== -1) {
        requestAnimationFrame(() => {
          flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.2 });
        });
      }

      await new Promise<void>((resolve) => {
        VoicePlaybackService.playTextToSpeech(`${v.reference}. ${v.text}`, {
          scriptureId: v.id,
          onDone: () => resolve(),
          onError: () => resolve(),
          rate: userSettings?.voiceRate || 0.9,
          pitch: userSettings?.voicePitch || 1.0,
        });
      });
    }

    setActivelyReadingVerseId(null);
    isReadingRef.current = false;
    setIsListeningToChapter(false);
  }, [chapterVerses, userSettings]);

  const handleSequentialListen = useCallback(async (verses: Scripture[]) => {
    if (isReadingRef.current) {
      VoicePlaybackService.stopPlayback();
      isReadingRef.current = false;
      setActivelyReadingVerseId(null);
      setIsListeningToChapter(false);
      return;
    }

    isReadingRef.current = true;
    for (const v of verses) {
      if (!isReadingRef.current) break;
      setActivelyReadingVerseId(v.id);
      
      const idx = chapterVerses.findIndex(cv => cv.reference === v.reference);
      if (idx !== -1) {
        requestAnimationFrame(() => {
          flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.2 });
        });
      }

      await new Promise<void>((resolve) => {
        VoicePlaybackService.playTextToSpeech(`${v.reference}. ${v.text}`, {
          scriptureId: v.id,
          onDone: () => resolve(),
          onError: () => resolve(),
          rate: userSettings?.voiceRate || 0.9,
          pitch: userSettings?.voicePitch || 1.0,
        });
      });
    }
    setActivelyReadingVerseId(null);
    isReadingRef.current = false;
  }, [chapterVerses, userSettings]);

  const currentBookData = BOOKS.find(b => b.name.toLowerCase() === currentBook.toLowerCase());
  const testament = currentBookData?.testament === 'new' ? 'NEW TESTAMENT' : 'OLD TESTAMENT';

  const renderVerse = useCallback(({ item }: { item: BibleVerse }) => {
    const verseId = `${item.book.toLowerCase()}-${item.chapter}-${item.verse}`;
    return (
      <VerseRow
        verse={item}
        isSelected={selectedVerseIds.has(verseId)}
        isHighlighted={item.verse === highlightedVerse}
        highlightColor={highlights.get(verseId)}
        hasNote={notes.has(verseId)}
        isActivelyReading={verseId === activelyReadingVerseId}
        arsenalData={getArsenalData(item)}
        onPress={toggleVerseSelection}
        onLongPress={handleVerseLongPress}
        theme={theme}
        isDark={isDark}
        userSettings={userSettings}
      />
    );
  }, [selectedVerseIds, highlightedVerse, highlights, notes, activelyReadingVerseId, getArsenalData, toggleVerseSelection, handleVerseLongPress, theme, isDark, userSettings]);

  const keyExtractor = useCallback((item: BibleVerse) => `${item.chapter}:${item.verse}`, []);

  const renderHeader = () => (
    <View>
      <Animated.View style={[styles.stickyTitle, {
        opacity: headerOpacity,
        backgroundColor: isDark ? theme.background : '#FFFFFF',
        borderBottomColor: theme.border,
      }]}>
        <Text style={[styles.stickyTitleText, { color: theme.text }]}>
          {currentBook} {currentChapter}
        </Text>
      </Animated.View>

      <LinearGradient
        colors={isDark ? [theme.surface, theme.background] : ['#F8FAFC', '#FFFFFF']}
        style={styles.chapterHero}
      >
        <Text style={[styles.testamentLabel, { color: theme.accent }]}>{testament}</Text>
        <Text style={[styles.chapterTitle, { color: theme.text }]}>{currentBook}</Text>
        <View style={styles.chapterNumRow}>
          <TouchableOpacity onPress={goToPreviousChapter} disabled={currentChapter <= 1} style={styles.chapterArrow}>
            <Ionicons name="chevron-back" size={22} color={currentChapter <= 1 ? theme.border : theme.accent} />
          </TouchableOpacity>
          <Text style={[styles.chapterNum, { color: theme.text }]}>Chapter {currentChapter}</Text>
          <TouchableOpacity onPress={() => goToNextChapter(currentChapterCount)} disabled={currentChapter >= currentChapterCount} style={styles.chapterArrow}>
            <Ionicons name="chevron-forward" size={22} color={currentChapter >= currentChapterCount ? theme.border : theme.accent} />
          </TouchableOpacity>
        </View>
        {chaptersWithArsenal.has(currentChapter) && (
          <View style={[styles.arsenalBanner, { backgroundColor: `${theme.accent}15`, borderColor: `${theme.accent}30` }]}>
            <Ionicons name="shield-checkmark" size={13} color={theme.accent} />
            <Text style={[styles.arsenalBannerText, { color: theme.accent }]}>Arsenal verses in this chapter</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.listenChapterBtn, { backgroundColor: isListeningToChapter ? theme.warning : `${theme.accent}15`, borderColor: isListeningToChapter ? theme.warning : `${theme.accent}30` }]}
          onPress={handleListenToChapter}
          activeOpacity={0.8}
        >
          <Ionicons name={isListeningToChapter ? 'stop-circle' : 'headset'} size={16} color={isListeningToChapter ? '#FFFFFF' : theme.accent} />
          <Text style={[styles.listenChapterBtnText, { color: isListeningToChapter ? '#FFFFFF' : theme.accent }]}>
            {isListeningToChapter ? 'STOP LISTENING' : 'LISTEN TO CHAPTER'}
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.chapterFooter}>
      <View style={styles.footerNavRow}>
        <TouchableOpacity
          style={[styles.footerNavBtn, { backgroundColor: isDark ? theme.surface : '#F1F5F9', opacity: currentChapter <= 1 ? 0.4 : 1 }]}
          onPress={goToPreviousChapter}
          disabled={currentChapter <= 1}
        >
          <Ionicons name="chevron-back" size={16} color={theme.text} />
          <Text style={[styles.footerNavText, { color: theme.text }]}>Chapter {currentChapter - 1}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.footerNavBtn, { backgroundColor: isDark ? theme.surface : '#F1F5F9', opacity: currentChapter >= currentChapterCount ? 0.4 : 1 }]}
          onPress={() => goToNextChapter(currentChapterCount)}
          disabled={currentChapter >= currentChapterCount}
        >
          <Text style={[styles.footerNavText, { color: theme.text }]}>Chapter {currentChapter + 1}</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.text} />
        </TouchableOpacity>
      </View>
      <View style={{ height: 120 }} />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

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

      {mode === 'reading' && (
        <>
          <View style={styles.navTools}>
            <TouchableOpacity
              style={[styles.backToBrowse, { backgroundColor: isDark ? theme.surface : '#F1F5F9' }]}
              onPress={() => { clearSelection(); setMode('browsing'); }}
            >
              <Ionicons name="grid" size={14} color={theme.textSecondary} />
              <Text style={[styles.backToBrowseText, { color: theme.textSecondary }]}>BROWSE BOOKS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.settingsToggle, { backgroundColor: isDark ? theme.surface : '#F1F5F9' }]}
              onPress={() => setIsSettingsVisible(true)}
            >
              <Ionicons name="options" size={16} color={theme.textSecondary} />
              <Text style={[styles.backToBrowseText, { color: theme.textSecondary }]}>DISPLAY</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.bookTitleBar, { backgroundColor: isDark ? theme.background : '#FFFFFF', borderBottomColor: theme.border }]}>
            <Text style={[styles.bookTitleBarText, { color: theme.text }]} numberOfLines={1}>
              {currentBook} <Text style={{ color: theme.textSecondary }}>•</Text> Chapter {currentChapter}
            </Text>
          </View>
        </>
      )}

      {mode === 'browsing' ? (
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <View style={{ paddingTop: 8 }}>
              <Text style={[styles.browseTitle, MILITARY_TYPOGRAPHY.caption, { color: theme.textSecondary }]}>SELECT BOOK</Text>
              <BookSelector onSelectBook={handleBookSelect} />
            </View>
          }
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        <>
          <ChapterNavBar
            totalChapters={currentChapterCount}
            currentChapter={currentChapter}
            chaptersWithArsenal={chaptersWithArsenal}
            onSelectChapter={goToChapter}
            theme={theme}
            isDark={isDark}
          />
          {isLoadingChapter ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.accent} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading {currentBook} {currentChapter}...</Text>
            </View>
          ) : (
            <PanGestureHandler
              onHandlerStateChange={onGestureEvent}
              activeOffsetX={[-20, 20]}
            >
              <Animated.FlatList
                ref={flatListRef}
                data={chapterVerses}
                renderItem={renderVerse}
                keyExtractor={keyExtractor}
                onScrollToIndexFailed={onScrollToIndexFailed}
                ListHeaderComponent={renderHeader}
                ListFooterComponent={renderFooter}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.verseListContent}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={20}
                maxToRenderPerBatch={15}
                windowSize={8}
                removeClippedSubviews={Platform.OS === 'android'}
              />
            </PanGestureHandler>
          )}

          <SelectionHUD
            selectedVerses={selectedVerses}
            onClear={clearSelection}
            onAddToCollection={onRequestAddToCollection}
            onDrillNow={onRequestDrill}
            onHighlight={handleHighlight}
            onAddNote={handleAddNote}
            onShare={handleShare}
            onListen={() => handleSequentialListen(selectedVerses)}
            theme={theme}
            isDark={isDark}
            userSettings={userSettings}
          />

          <ReaderSettingsModal isVisible={isSettingsVisible} onClose={() => setIsSettingsVisible(false)} />

          <Modal visible={noteModalVisible} transparent animationType="slide" onRequestClose={() => setNoteModalVisible(false)}>
            <KeyboardAvoidingView style={styles.noteModalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <TouchableOpacity style={styles.noteModalDismissArea} activeOpacity={1} onPress={() => setNoteModalVisible(false)} />
              <View style={[styles.noteModalSheet, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
                <View style={[styles.noteModalHandle, { backgroundColor: theme.border }]} />
                <Text style={[styles.noteModalTitle, { color: theme.text }]}>MISSION NOTE</Text>
                <TextInput
                  style={[styles.noteModalInput, { color: theme.text, borderColor: theme.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC' }]}
                  placeholder="Add tactical intelligence..."
                  placeholderTextColor={theme.textSecondary}
                  value={noteText}
                  onChangeText={setNoteText}
                  autoFocus
                  multiline
                  maxLength={500}
                />
                <View style={styles.noteModalActions}>
                  <TouchableOpacity style={[styles.noteModalBtn, { backgroundColor: '#EF444420' }]} onPress={handleDeleteNote}>
                    <Text style={[styles.noteModalBtnText, { color: '#EF4444' }]}>DELETE</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => setNoteModalVisible(false)}>
                    <Text style={[styles.noteModalBtnText, { color: theme.textSecondary, textAlign: 'center' }]}>CANCEL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.noteModalBtn, { backgroundColor: theme.accent }]} onPress={handleSaveNote}>
                    <Text style={[styles.noteModalBtnText, { color: theme.accentContrastText }]}>SAVE</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  browseTitle: { paddingHorizontal: 20, paddingBottom: 8, letterSpacing: 1.5 },
  backToBrowse: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  settingsToggle: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  navTools: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginBottom: 4 },
  bookTitleBar: { paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  bookTitleBarText: { fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  backToBrowseText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.0, fontFamily: 'monospace' },
  stickyTitle: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingVertical: 10, alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  stickyTitleText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  chapterHero: { paddingTop: 28, paddingBottom: 20, paddingHorizontal: 24, alignItems: 'center' },
  testamentLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 2.0, fontFamily: 'monospace', marginBottom: 6 },
  chapterTitle: { fontSize: 30, fontWeight: '900', letterSpacing: 0.5, marginBottom: 6 },
  chapterNumRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  chapterNum: { fontSize: 18, fontWeight: '600', letterSpacing: 0.3 },
  chapterArrow: { padding: 4 },
  arsenalBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  arsenalBannerText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, fontFamily: 'monospace' },
  listenChapterBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1 },
  listenChapterBtnText: { fontSize: 11, fontWeight: '700', letterSpacing: 1.0, fontFamily: 'monospace' },
  verseListContent: { paddingBottom: 8 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { fontSize: 14, fontWeight: '500' },
  chapterFooter: { paddingTop: 8, paddingHorizontal: 16 },
  footerNavRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 8 },
  footerNavBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 6 },
  footerNavText: { fontSize: 14, fontWeight: '600' },
  noteModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  noteModalDismissArea: { flex: 1 },
  noteModalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36 },
  noteModalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  noteModalTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 1.2, fontFamily: 'monospace', marginBottom: 12 },
  noteModalInput: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, minHeight: 100, textAlignVertical: 'top', marginBottom: 16 },
  noteModalActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  noteModalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  noteModalBtnText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.8, fontFamily: 'monospace' },
});
