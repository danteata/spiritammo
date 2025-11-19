import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { TACTICAL_THEME, MILITARY_TYPOGRAPHY } from '@/constants/colors';
import { Book } from '@/types/scripture';

interface ChapterSelectorProps {
  book: Book;
  onSelectChapter: (chapter: number) => void;
  selectedChapter: number | null;
}

export default function ChapterSelector({ book, onSelectChapter, selectedChapter }: ChapterSelectorProps) {
  const renderChapterButtons = () => {
    const chapters = [];
    for (let i = 1; i <= book.chapters; i++) {
      chapters.push(
        <TouchableOpacity
          key={i}
          style={[
            styles.chapterButton,
            selectedChapter === i && styles.chapterButtonSelected,
          ]}
          onPress={() => onSelectChapter(i)}
          testID={`chapter-button-${i}`}
        >
          <Text
            style={[
              styles.chapterButtonText,
              selectedChapter === i && styles.chapterButtonTextSelected,
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
      {/* Current Book Title */}
      <Text style={styles.bookTitle}>
        {book.name}
      </Text>
      
      {/* Separator Line */}
      <View style={styles.separatorLine} />
      
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
  bookTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TACTICAL_THEME.text,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  separatorLine: {
    height: 1,
    backgroundColor: TACTICAL_THEME.border,
    marginHorizontal: 16,
    marginBottom: 16,
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
    justifyContent: 'flex-start',
  },
  chapterButton: {
    width: '14%',
    aspectRatio: 1,
    marginHorizontal: '1.5%',
    marginBottom: 12,
    backgroundColor: TACTICAL_THEME.surface,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chapterButtonSelected: {
    backgroundColor: TACTICAL_THEME.accent,
  },
  chapterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: TACTICAL_THEME.text,
  },
  chapterButtonTextSelected: {
    color: TACTICAL_THEME.text,
    fontWeight: 'bold',
  },
});