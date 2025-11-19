import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Book } from '@/types/scripture';
import { TACTICAL_THEME, MILITARY_TYPOGRAPHY } from '@/constants/colors';
import { useAppStore } from '@/hooks/useAppStore';

interface BookSelectorProps {
  onSelectBook: (book: Book) => void;
}

export default function BookSelector({ onSelectBook }: BookSelectorProps) {
  const { books, isDark } = useAppStore();
  
  // Define book groups with color coding (inspired by your screenshot)
  const bookGroups = [
    { name: 'Law (Torah)', books: ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'], color: '#FF6B6B' },
    { name: 'History', books: ['Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther'], color: '#4ECDC4' },
    { name: 'Wisdom', books: ['Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon'], color: '#45B7D1' },
    { name: 'Major Prophets', books: ['Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel'], color: '#96CEB4' },
    { name: 'Minor Prophets', books: ['Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi'], color: '#FFEAA7' },
    { name: 'Gospels', books: ['Matthew', 'Mark', 'Luke', 'John'], color: '#74B9FF' },
    { name: 'Acts', books: ['Acts'], color: '#A29BFE' },
    { name: 'Paul\'s Letters', books: ['Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon'], color: '#FD79A8' },
    { name: 'General Letters', books: ['Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude'], color: '#FDCB6E' },
    { name: 'Prophecy', books: ['Revelation'], color: '#FF6B6B' },
  ];
  
  // Get color for a book based on its group
  const getBookGroupColor = (bookName: string): string => {
    for (const group of bookGroups) {
      if (group.books.includes(bookName)) {
        return group.color;
      }
    }
    return TACTICAL_THEME.textSecondary; // Fallback color
  };
  
  const handleSelect = (book: Book) => {
    onSelectBook(book);
  };
  
  const getBookAbbreviation = (book: Book): string => {
    // Common book abbreviations
    const abbreviations: { [key: string]: string } = {
      'Genesis': 'GEN',
      'Exodus': 'EX',
      'Leviticus': 'LEV',
      'Numbers': 'NUM',
      'Deuteronomy': 'DEU',
      'Joshua': 'JOS',
      'Judges': 'JDG',
      'Ruth': 'RTH',
      '1 Samuel': '1SA',
      '2 Samuel': '2SA',
      '1 Kings': '1KI',
      '2 Kings': '2KI',
      '1 Chronicles': '1CH',
      '2 Chronicles': '2CH',
      'Ezra': 'EZR',
      'Nehemiah': 'NEH',
      'Esther': 'EST',
      'Job': 'JOB',
      'Psalms': 'PSA',
      'Proverbs': 'PRV',
      'Ecclesiastes': 'ECC',
      'Song of Solomon': 'SOS',
      'Isaiah': 'ISA',
      'Jeremiah': 'JER',
      'Lamentations': 'LAM',
      'Ezekiel': 'EZE',
      'Daniel': 'DAN',
      'Hosea': 'HOS',
      'Joel': 'JOE',
      'Amos': 'AMO',
      'Obadiah': 'OBD',
      'Jonah': 'JON',
      'Micah': 'MIC',
      'Nahum': 'NAH',
      'Habakkuk': 'HAB',
      'Zephaniah': 'ZEP',
      'Haggai': 'HAG',
      'Zechariah': 'ZEC',
      'Malachi': 'MAL',
      'Matthew': 'MAT',
      'Mark': 'MRK',
      'Luke': 'LUK',
      'John': 'JN',
      'Acts': 'ACT',
      'Romans': 'ROM',
      '1 Corinthians': '1CO',
      '2 Corinthians': '2CO',
      'Galatians': 'GAL',
      'Ephesians': 'EPH',
      'Philippians': 'PHP',
      'Colossians': 'COL',
      '1 Thessalonians': '1TH',
      '2 Thessalonians': '2TH',
      '1 Timothy': '1TI',
      '2 Timothy': '2TI',
      'Titus': 'TIT',
      'Philemon': 'PHM',
      'Hebrews': 'HEB',
      'James': 'JAM',
      '1 Peter': '1PE',
      '2 Peter': '2PE',
      '1 John': '1JN',
      '2 John': '2JN',
      '3 John': '3JN',
      'Jude': 'JUD',
      'Revelation': 'REV',
    };
    return abbreviations[book.name] || book.name.substring(0, 3).toUpperCase();
  };
  
  return (
    <View style={styles.container}>
      {/* Testament Separator Line */}
      <View style={styles.separatorLine} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.booksGrid}>
          {books.map((book, index) => (
            <TouchableOpacity
              key={book.id}
              style={styles.bookButton}
              onPress={() => handleSelect(book)}
              testID={`book-item-${book.id}`}
            >
              <Text style={[styles.bookText, { color: getBookGroupColor(book.name) }]}>
                {getBookAbbreviation(book)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  booksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  bookButton: {
    width: '30%',
    aspectRatio: 2,
    marginHorizontal: '1.5%',
    marginBottom: 12,
    backgroundColor: TACTICAL_THEME.surface,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});