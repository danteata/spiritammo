import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bibleApiService, BibleApiService, BibleVerse, ParsedReference } from '@/services/bibleApi';
import { BOOKS } from '@/mocks/books';
import { Book } from '@/types/scripture';

interface SearchResult {
  type: 'reference' | 'verse' | 'book_suggestion';
  parsed?: ParsedReference;
  verse?: BibleVerse;
  book?: Book;
  display: string;
  subtitle?: string;
}

interface SmartSearchBarProps {
  onReferenceSelect: (ref: ParsedReference) => void;
  onVerseSelect: (verse: BibleVerse) => void;
  recentSearches: string[];
  onSearch: (query: string) => void;
  theme: any;
  isDark: boolean;
}

const SmartSearchBar = memo(({
  onReferenceSelect,
  onVerseSelect,
  recentSearches,
  onSearch,
  theme,
  isDark,
}: SmartSearchBarProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const expandAnim = useRef(new Animated.Value(0)).current;
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showDropdown = isFocused && (results.length > 0 || recentSearches.length > 0 || query.length === 0);

  useEffect(() => {
    Animated.timing(expandAnim, {
      toValue: showDropdown ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [showDropdown]);

  const performSearch = useCallback(async (text: string) => {
    if (text.length === 0) {
      setResults([]);
      return;
    }

    setIsLoading(true);

    // 1. Try smart reference parsing first (instant)
    const parsedRef = BibleApiService.parseReference(text);

    const searchResults: SearchResult[] = [];

    if (parsedRef) {
      searchResults.push({
        type: 'reference',
        parsed: parsedRef,
        display: `${parsedRef.book} ${parsedRef.chapter}${parsedRef.startVerse ? `:${parsedRef.startVerse}` : ''}${parsedRef.endVerse && parsedRef.endVerse !== parsedRef.startVerse ? `-${parsedRef.endVerse}` : ''}`,
        subtitle: 'Jump to verse',
      });
    }

    // 2. Book name autocomplete suggestions
    const lowerText = text.toLowerCase();
    const bookMatches = BOOKS.filter(b =>
      b.name.toLowerCase().startsWith(lowerText) ||
      b.abbreviations.some(a => a.toLowerCase().startsWith(lowerText))
    ).slice(0, 3);

    bookMatches.forEach(book => {
      if (!parsedRef || parsedRef.book !== book.name) {
        searchResults.push({
          type: 'book_suggestion',
          book,
          display: book.name,
          subtitle: `${book.testament === 'old' ? 'Old' : 'New'} Testament · ${book.chapters} chapters`,
        });
      }
    });

    // 3. Full-text verse search (async, skip if short)
    if (text.length >= 3 && bookMatches.length === 0 && !parsedRef) {
      const verseResults = await bibleApiService.searchVerses(text, 8);
      verseResults.forEach(verse => {
        searchResults.push({
          type: 'verse',
          verse,
          display: verse.reference,
          subtitle: verse.text.slice(0, 70) + (verse.text.length > 70 ? '...' : ''),
        });
      });
    }

    setResults(searchResults);
    setIsLoading(false);
  }, []);

  const handleTextChange = useCallback((text: string) => {
    setQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => performSearch(text), 200);
  }, [performSearch]);

  const handleResultPress = useCallback((result: SearchResult) => {
    if (result.type === 'reference' && result.parsed) {
      onSearch(query);
      onReferenceSelect(result.parsed);
    } else if (result.type === 'verse' && result.verse) {
      onSearch(query);
      onVerseSelect(result.verse);
    } else if (result.type === 'book_suggestion' && result.book) {
      onReferenceSelect({ book: result.book.name, chapter: 1 });
    }
    setQuery('');
    setResults([]);
    inputRef.current?.blur();
    setIsFocused(false);
  }, [query, onReferenceSelect, onVerseSelect, onSearch]);

  const handleRecentPress = useCallback((search: string) => {
    setQuery(search);
    performSearch(search);
  }, [performSearch]);

  const renderResult = ({ item }: { item: SearchResult }) => {
    const icon = item.type === 'reference'
      ? 'navigate' : item.type === 'book_suggestion'
        ? 'book' : 'search';
    const iconComponent = item.type === 'reference'
      ? <Ionicons name="navigate" size={16} color={theme.accent} />
      : item.type === 'book_suggestion'
        ? <Ionicons name="book" size={16} color={theme.info} />
        : <Ionicons name="search" size={14} color={theme.textSecondary} />;

    return (
      <TouchableOpacity
        style={[styles.resultItem, { borderBottomColor: theme.border }]}
        onPress={() => handleResultPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.resultIcon}>{iconComponent}</View>
        <View style={styles.resultText}>
          <Text style={[styles.resultTitle, { color: theme.text }]} numberOfLines={1}>
            {item.display}
          </Text>
          {item.subtitle && (
            <Text style={[styles.resultSubtitle, { color: theme.textSecondary }]} numberOfLines={2}>
              {item.subtitle}
            </Text>
          )}
        </View>
        <Ionicons name="arrow-forward" size={14} color={theme.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.wrapper}>
      {/* Search Input */}
      <View style={[styles.inputContainer, {
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
        borderColor: isFocused ? theme.accent : theme.border,
      }]}>
        <Ionicons name="search" size={18} color={isFocused ? theme.accent : theme.textSecondary} />
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: theme.text }]}
          placeholder='Search "Jn 3:16" or "love"...'
          placeholderTextColor={theme.textSecondary}
          value={query}
          onChangeText={handleTextChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {isLoading && <ActivityIndicator size="small" color={theme.accent} />}
        {!isLoading && query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
            <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Dropdown Results */}
      {showDropdown && (
        <View style={[styles.dropdown, {
          backgroundColor: isDark ? '#1C2333' : '#FFFFFF',
          borderColor: theme.border,
          shadowColor: theme.shadow,
        }]}>
          {results.length > 0 ? (
            <FlatList
              data={results}
              renderItem={renderResult}
              keyExtractor={(item, index) => `${item.type}-${index}`}
              scrollEnabled={false}
              keyboardShouldPersistTaps="handled"
            />
          ) : query.length === 0 && recentSearches.length > 0 ? (
            <View>
              <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>
                RECENT
              </Text>
              {recentSearches.slice(0, 5).map((search, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.resultItem, { borderBottomColor: theme.border }]}
                  onPress={() => handleRecentPress(search)}
                >
                  <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
                  <Text style={[styles.recentText, { color: theme.text }]}>{search}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : query.length >= 1 && results.length === 0 && !isLoading ? (
            <View style={styles.noResults}>
              <Text style={[styles.noResultsText, { color: theme.textSecondary }]}>
                No results for "{query}"
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
});

SmartSearchBar.displayName = 'SmartSearchBar';
export default SmartSearchBar;

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 100,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
  },
  dropdown: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
    zIndex: 200,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    fontFamily: 'monospace',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  resultIcon: {
    width: 20,
    alignItems: 'center',
  },
  resultText: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  resultSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  recentText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  noResults: {
    padding: 16,
  },
  noResultsText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
