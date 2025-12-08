import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { MILITARY_TYPOGRAPHY } from '@/constants/colors';
import { Book } from '@/types/scripture';
import { useAppStore } from '@/hooks/useAppStore';

interface ChapterSelectorProps {
  book: Book;
  onSelectChapter: (chapter: number) => void;
  selectedChapter: number | null;
}

export default function ChapterSelector({ book, onSelectChapter, selectedChapter }: ChapterSelectorProps) {
  const { theme } = useAppStore();
  const renderChapterButtons = () => {
    const chapters = [];
    for (let i = 1; i <= book.chapters; i++) {
      chapters.push(
        <TouchableOpacity
          key={i}
          style={[
            styles.chapterButton,
            { backgroundColor: theme.surface },
            selectedChapter === i && { backgroundColor: theme.accent },
          ]}
          onPress={() => onSelectChapter(i)}
          testID={`chapter-button-${i}`}
        >
          <Text
            style={[
              styles.chapterButtonText,
              { color: theme.text },
              selectedChapter === i && { color: theme.accentContrastText, fontWeight: 'bold' },
            ]}
          >
            {i}
          </Text>
        </TouchableOpacity>
      );
    }
    return chapters;
  };

  return (
    <View style={styles.container}>
      {/* Book Title removed as it's in the header */}

      {/* Separator Line removed */}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.chaptersGrid}>
          {renderChapterButtons()}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  chaptersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  chapterButton: {
    width: '18%',
    aspectRatio: 1,
    marginBottom: 12,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chapterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
