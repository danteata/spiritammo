import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS } from '@/constants/colors';
import { useAppStore } from '@/hooks/useAppStore';

interface ChapterSelectorProps {
  onSelectChapters: (chapters: number[]) => void;
}

export default function ChapterSelector({ onSelectChapters }: ChapterSelectorProps) {
  const { selectedBook, selectedChapters, isDark } = useAppStore();
  
  if (!selectedBook) {
    return null;
  }
  
  const toggleChapter = (chapter: number) => {
    const updatedChapters = selectedChapters.includes(chapter)
      ? selectedChapters.filter(ch => ch !== chapter)
      : [...selectedChapters, chapter];
    
    onSelectChapters(updatedChapters);
  };
  
  const selectAll = () => {
    const allChapters = Array.from({ length: selectedBook.chapters }, (_, i) => i + 1);
    onSelectChapters(allChapters);
  };
  
  const clearAll = () => {
    onSelectChapters([]);
  };
  
  const renderChapterButtons = () => {
    const chapters = [];
    for (let i = 1; i <= selectedBook.chapters; i++) {
      chapters.push(
        <TouchableOpacity
          key={i}
          style={[
            styles.chapterButton,
            selectedChapters.includes(i) && styles.chapterButtonSelected,
            { borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)' }
          ]}
          onPress={() => toggleChapter(i)}
          testID={`chapter-button-${i}`}
        >
          <Text
            style={[
              styles.chapterButtonText,
              selectedChapters.includes(i) && styles.chapterButtonTextSelected,
              { color: isDark ? COLORS.text.dark : COLORS.text.light }
            ]}
          >
            {i}
          </Text>
        </TouchableOpacity>
      );
    }
    return chapters;
  };
  
  const backgroundColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
  const textColor = isDark ? COLORS.text.dark : COLORS.text.light;
  
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: textColor }]}>
        Select Chapters
      </Text>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor }]}
          onPress={selectAll}
          testID="select-all-button"
        >
          <Text style={[styles.actionButtonText, { color: textColor }]}>
            All Rounds
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor }]}
          onPress={clearAll}
          testID="clear-all-button"
        >
          <Text style={[styles.actionButtonText, { color: textColor }]}>
            Clear
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.chaptersContainer}>
        <View style={styles.chaptersGrid}>
          {renderChapterButtons()}
        </View>
      </ScrollView>
      
      <TouchableOpacity
        style={[styles.applyButton, { backgroundColor: COLORS.primary.main }]}
        onPress={() => {}}
        testID="apply-chapters-button"
      >
        <Text style={styles.applyButtonText}>
          Apply Chapters
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chaptersContainer: {
    maxHeight: 200,
  },
  chaptersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chapterButton: {
    width: '20%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: '2.5%',
    borderRadius: 8,
    borderWidth: 1,
  },
  chapterButtonSelected: {
    backgroundColor: COLORS.primary.main,
    borderColor: COLORS.primary.main,
  },
  chapterButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  chapterButtonTextSelected: {
    color: 'white',
  },
  applyButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});