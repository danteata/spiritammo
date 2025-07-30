import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Book, ChevronRight } from 'lucide-react-native';
import { GRADIENTS } from '@/constants/colors';
import { useAppStore } from '@/hooks/useAppStore';
import { Collection } from '@/types/scripture';

export default function ArmoryScreen() {
  const { isDark, collections, books, setSelectedBook, setCurrentScripture, getScripturesByCollection } = useAppStore();
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  
  const handleSelectCollection = (collection: Collection) => {
    setSelectedCollection(collection);
    const scriptures = getScripturesByCollection(collection.id);
    if (scriptures.length > 0) {
      setCurrentScripture(scriptures[0]);
    }
  };
  
  const handleSelectBook = (bookId: string) => {
    const book = books.find(b => b.id === bookId);
    if (book) {
      setSelectedBook(book);
    }
  };
  
  const renderCollectionItem = ({ item }: { item: Collection }) => (
    <TouchableOpacity
      style={[
        styles.collectionItem,
        { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }
      ]}
      onPress={() => handleSelectCollection(item)}
      testID={`collection-${item.id}`}
    >
      <View style={styles.collectionInfo}>
        <Text style={[styles.collectionName, { color: isDark ? 'white' : 'black' }]}>
          {item.name}
        </Text>
        {item.description && (
          <Text style={[styles.collectionDescription, { color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)' }]}>
            {item.description}
          </Text>
        )}
        <Text style={[styles.collectionCount, { color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)' }]}>
          {item.scriptures.length} rounds
        </Text>
      </View>
      <ChevronRight size={20} color={isDark ? 'white' : 'black'} />
    </TouchableOpacity>
  );
  
  const renderBookItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.bookItem,
        { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }
      ]}
      onPress={() => handleSelectBook(item.id)}
      testID={`book-${item.id}`}
    >
      <Book size={20} color={isDark ? 'white' : 'black'} />
      <Text style={[styles.bookName, { color: isDark ? 'white' : 'black' }]}>
        {item.name}
      </Text>
      <Text style={[styles.bookChapters, { color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)' }]}>
        {item.chapters} chapters
      </Text>
      <ChevronRight size={20} color={isDark ? 'white' : 'black'} />
    </TouchableOpacity>
  );
  
  const backgroundColors = isDark ? GRADIENTS.primary.dark : GRADIENTS.primary.light;
  
  return (
    <LinearGradient
      colors={backgroundColors}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <Text style={[styles.sectionTitle, { color: 'white' }]}>
        Scripture Ammunition
      </Text>
      
      <Text style={[styles.sectionSubtitle, { color: 'white' }]}>
        Collections
      </Text>
      
      <FlatList
        data={collections}
        renderItem={renderCollectionItem}
        keyExtractor={item => item.id}
        style={styles.list}
      />
      
      <Text style={[styles.sectionSubtitle, { color: 'white' }]}>
        Books
      </Text>
      
      <FlatList
        data={books}
        renderItem={renderBookItem}
        keyExtractor={item => item.id}
        style={styles.list}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  list: {
    flex: 1,
  },
  collectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  collectionInfo: {
    flex: 1,
  },
  collectionName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  collectionDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  collectionCount: {
    fontSize: 12,
    marginTop: 4,
  },
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  bookName: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
  bookChapters: {
    fontSize: 12,
    marginRight: 8,
  },
});