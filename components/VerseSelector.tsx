import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { MILITARY_TYPOGRAPHY } from '@/constants/colors';
import { Scripture } from '@/types/scripture';
import { bibleApiService } from '@/services/bibleApi';
import { useAppStore } from '@/hooks/useAppStore';

interface VerseSelectorProps {
  bookName: string;
  chapter: number;
  onVersesSelected: (verses: Scripture[]) => void;
  selectedVerses?: Scripture[];
}

export default function VerseSelector({
  bookName,
  chapter,
  onVersesSelected,
  selectedVerses = []
}: VerseSelectorProps) {
  const { theme } = useAppStore();
  const styles = getStyles(theme);
  const [verses, setVerses] = useState<Scripture[]>([]);
  const [selectedVerseIds, setSelectedVerseIds] = useState<Set<string>>(new Set());
  const [isLoadingVerses, setIsLoadingVerses] = useState(false);

  useEffect(() => {
    const loadVerses = async () => {
      setIsLoadingVerses(true);
      try {
        console.log(`📖 Loading verses for ${bookName} ${chapter}...`);
        // Wait for Bible service to initialize and load verses
        const chapterData = await bibleApiService.getChapter(bookName, chapter);

        console.log(`📖 Chapter data:`, chapterData);

        if (chapterData && chapterData.verses.length > 0) {
          const scriptures = chapterData.verses.map((verse: any) =>
            bibleApiService.bibleVerseToScripture(verse)
          );
          console.log(`✅ Loaded ${scriptures.length} verses`);
          setVerses(scriptures);
        } else {
          console.warn(`⚠️ No verses found for ${bookName} ${chapter}`);
          setVerses([]);
        }
      } catch (error) {
        console.error('❌ Error loading verses:', error);
        setVerses([]);
      }
      setIsLoadingVerses(false);
    };

    loadVerses();
  }, [bookName, chapter]);

  useEffect(() => {
    const ids = new Set(selectedVerses.map(v => v.id));
    setSelectedVerseIds(ids);
  }, [selectedVerses]);

  const toggleVerse = (verse: Scripture) => {
    const newSelected = new Set(selectedVerseIds);
    if (newSelected.has(verse.id)) {
      newSelected.delete(verse.id);
    } else {
      newSelected.add(verse.id);
    }
    setSelectedVerseIds(newSelected);

    const selectedScriptures = verses.filter(v => newSelected.has(v.id));
    onVersesSelected(selectedScriptures);
  };

  const selectRange = () => {
    // Select all verses from current selection to the end
    if (selectedVerseIds.size === 0) {
      selectAll();
      return;
    }

    const selectedArray = Array.from(selectedVerseIds);
    const lastSelectedVerse = verses.find(v => v.id === selectedArray[selectedArray.length - 1]);

    if (!lastSelectedVerse) return;

    const rangeVerses = verses.filter(v => v.verse >= lastSelectedVerse.verse);
    const newSelected = new Set(selectedVerseIds);

    rangeVerses.forEach(verse => {
      newSelected.add(verse.id);
    });

    setSelectedVerseIds(newSelected);
    const selectedScriptures = verses.filter(v => newSelected.has(v.id));
    onVersesSelected(selectedScriptures);
  };

  const selectAll = () => {
    const allIds = new Set(verses.map(v => v.id));
    setSelectedVerseIds(allIds);
    onVersesSelected(verses);
  };

  const clearAll = () => {
    setSelectedVerseIds(new Set());
    onVersesSelected([]);
  };

  return (
    <View style={styles.container}>
      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={selectAll}
        >
          <FontAwesome name="check-circle" size={16} color={theme.text} />
          <Text style={styles.actionButtonText}>ALL ROUNDS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={clearAll}
        >
          <FontAwesome name="times-circle" size={16} color={theme.text} />
          <Text style={styles.actionButtonText}>CLEAR</Text>
        </TouchableOpacity>
      </View>

      {/* Selected Count */}
      <Text style={styles.selectedCount}>
        {selectedVerseIds.size} ROUND{selectedVerseIds.size !== 1 ? 'S' : ''} SELECTED
      </Text>

      {/* Separator Line */}
      <View style={styles.separatorLine} />

      {/* Verses Grid */}
      {isLoadingVerses ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={styles.loadingText}>Loading ammunition...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {verses.length > 0 ? (
            <View style={styles.versesGrid}>
              {verses.map((verse) => (
                <TouchableOpacity
                  key={verse.id}
                  style={[
                    styles.verseButton,
                    selectedVerseIds.has(verse.id) && styles.verseButtonSelected,
                  ]}
                  onPress={() => toggleVerse(verse)}
                >
                  <Text
                    style={[
                      styles.verseNumber,
                      selectedVerseIds.has(verse.id) && styles.verseNumberSelected,
                    ]}
                  >
                    {verse.verse}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <FontAwesome name="exclamation-triangle" size={48} color={theme.textSecondary} />
              <Text style={styles.emptyText}>
                No ammunition found for {bookName} Chapter {chapter}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: theme.surface,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectedCount: {
    color: theme.accent,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  separatorLine: {
    height: 1,
    backgroundColor: theme.border,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: theme.textSecondary,
    marginTop: 16,
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  versesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  verseButton: {
    width: '18%',
    aspectRatio: 1,
    marginBottom: 12,
    backgroundColor: theme.surface,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verseButtonSelected: {
    backgroundColor: theme.accent,
  },
  verseNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  verseNumberSelected: {
    color: theme.text,
    fontWeight: 'bold',
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    color: theme.textSecondary,
    marginTop: 16,
  },
});
