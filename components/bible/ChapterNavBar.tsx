import React, { useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

interface ChapterNavBarProps {
  totalChapters: number;
  currentChapter: number;
  chaptersWithArsenal: Set<number>;
  onSelectChapter: (chapter: number) => void;
  theme: any;
  isDark: boolean;
}

const ITEM_WIDTH = 44;

const ChapterNavBar = memo(({
  totalChapters,
  currentChapter,
  chaptersWithArsenal,
  onSelectChapter,
  theme,
  isDark,
}: ChapterNavBarProps) => {
  const flatListRef = useRef<FlatList>(null);
  const chapters = Array.from({ length: totalChapters }, (_, i) => i + 1);

  // Auto-scroll to keep current chapter visible
  useEffect(() => {
    if (flatListRef.current && totalChapters > 0) {
      const index = currentChapter - 1;
      const offset = Math.max(0, (index * ITEM_WIDTH) - 100);
      flatListRef.current.scrollToOffset({ offset, animated: true });
    }
  }, [currentChapter, totalChapters]);

  const renderChapter = ({ item: chapter }: { item: number }) => {
    const isActive = chapter === currentChapter;
    const hasArsenal = chaptersWithArsenal.has(chapter);

    return (
      <TouchableOpacity
        onPress={() => onSelectChapter(chapter)}
        activeOpacity={0.7}
        style={[
          styles.chapterPill,
          {
            backgroundColor: isActive
              ? theme.accent
              : isDark
                ? 'rgba(255,255,255,0.06)'
                : 'rgba(0,0,0,0.05)',
          },
          isActive && styles.activePill,
        ]}
      >
        <Text style={[
          styles.chapterText,
          { color: isActive ? theme.accentContrastText : theme.textSecondary },
          isActive && styles.activeText,
        ]}>
          {chapter}
        </Text>
        {hasArsenal && !isActive && (
          <View style={[styles.arsenalDot, { backgroundColor: theme.accent }]} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, {
      backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)',
      borderBottomColor: theme.border,
    }]}>
      <FlatList
        ref={flatListRef}
        data={chapters}
        renderItem={renderChapter}
        keyExtractor={item => String(item)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        getItemLayout={(_, index) => ({
          length: ITEM_WIDTH,
          offset: ITEM_WIDTH * index,
          index,
        })}
        initialNumToRender={20}
        maxToRenderPerBatch={30}
        windowSize={10}
      />
    </View>
  );
});

ChapterNavBar.displayName = 'ChapterNavBar';
export default ChapterNavBar;

const styles = StyleSheet.create({
  container: {
    height: 52,
    borderBottomWidth: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 6,
  },
  chapterPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
    position: 'relative',
  },
  activePill: {
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  chapterText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  activeText: {
    fontWeight: '900',
  },
  arsenalDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
