import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { TACTICAL_THEME, MILITARY_TYPOGRAPHY } from '@/constants/colors';
import { useAppStore } from '@/hooks/useAppStore';
import { Collection, Scripture, Book } from '@/types/scripture';
import { bibleApiService } from '@/services/bibleApi';
import VerseSelector from './VerseSelector';

interface SimpleVerseModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function SimpleVerseModal({
  isVisible,
  onClose
}: SimpleVerseModalProps) {
  const {
    collections,
    books,
    scriptures,
    addCollection,
    addScripturesToCollection,
    isDark
  } = useAppStore();

  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [selectedVerses, setSelectedVerses] = useState<Scripture[]>([]);
  const [step, setStep] = useState<'collection' | 'book' | 'chapter' | 'verses'>('collection');
  const [isCreatingNewCollection, setIsCreatingNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [availableChapters, setAvailableChapters] = useState<number[]>([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);

  const resetModal = () => {
    setSelectedCollection(null);
    setSelectedBook(null);
    setSelectedChapter(1);
    setSelectedVerses([]);
    setStep('collection');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleCollectionSelect = (collection: Collection) => {
    setSelectedCollection(collection);
    setStep('book');
  };

  const handleCreateCollection = () => {
    setIsCreatingNewCollection(true);
  };

  const handleCreateCollectionConfirm = () => {
    if (newCollectionName.trim()) {
      const newCollection: Collection = {
        id: `manual_${Date.now()}`,
        name: newCollectionName.trim(),
        scriptures: [],
        createdAt: new Date().toISOString(),
        tags: ['manual'],
      };
      addCollection(newCollection);
      setSelectedCollection(newCollection);
      setIsCreatingNewCollection(false);
      setNewCollectionName('');
      setStep('book');
    }
  };

  const handleCreateCollectionCancel = () => {
    setIsCreatingNewCollection(false);
    setNewCollectionName('');
  };

  const handleBookSelect = async (book: Book) => {
    setSelectedBook(book);
    setIsLoadingChapters(true);

    try {
      // Try to get chapters from Bible API
      const chapterCount = await bibleApiService.getBookChapters(book.name);
      if (chapterCount > 0) {
        const chapters = Array.from({ length: chapterCount }, (_, i) => i + 1);
        setAvailableChapters(chapters);
      } else {
        // Fallback to static chapter count from book data
        const chapters = Array.from({ length: book.chapters }, (_, i) => i + 1);
        setAvailableChapters(chapters);
      }
    } catch (error) {
      console.error('Error loading chapters:', error);
      // Fallback to static chapter count
      const chapters = Array.from({ length: book.chapters }, (_, i) => i + 1);
      setAvailableChapters(chapters);
    }

    setIsLoadingChapters(false);
    setStep('chapter');
  };

  const handleChapterSelect = (chapter: number) => {
    setSelectedChapter(chapter);
    setStep('verses');
  };

  const handleVersesSelected = (verses: Scripture[]) => {
    setSelectedVerses(verses);
  };

  const handleAddVerses = async () => {
    if (!selectedCollection || selectedVerses.length === 0) {
      Alert.alert('Error', 'Please select verses to add');
      return;
    }

    const success = await addScripturesToCollection(
      selectedCollection.id,
      selectedVerses.map(v => v.id)
    );

    if (success) {
      Alert.alert(
        'Success',
        `Added ${selectedVerses.length} verse${selectedVerses.length !== 1 ? 's' : ''} to "${selectedCollection.name}"`
      );
      handleClose();
    } else {
      Alert.alert('Error', 'Failed to add verses to collection');
    }
  };

  const renderCollectionStep = () => {
    if (isCreatingNewCollection) {
      return (
        <View style={styles.stepContent}>
          <Text style={[styles.stepTitle, MILITARY_TYPOGRAPHY.heading]}>
            CREATE NEW COLLECTION
          </Text>
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, MILITARY_TYPOGRAPHY.body]}>
              Collection Name:
            </Text>
            <TextInput
              style={[styles.textInput, { color: TACTICAL_THEME.text, borderColor: TACTICAL_THEME.border }]}
              placeholder="Enter collection name"
              placeholderTextColor={TACTICAL_THEME.textSecondary}
              value={newCollectionName}
              onChangeText={setNewCollectionName}
              autoFocus={true}
            />
            <View style={styles.inputButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: TACTICAL_THEME.surface }]}
                onPress={handleCreateCollectionCancel}
              >
                <Text style={[styles.cancelButtonText, MILITARY_TYPOGRAPHY.button]}>
                  CANCEL
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  newCollectionName.trim() && { backgroundColor: TACTICAL_THEME.accent }
                ]}
                onPress={newCollectionName.trim() ? handleCreateCollectionConfirm : undefined}
                disabled={!newCollectionName.trim()}
              >
                <Text style={[styles.confirmButtonText, MILITARY_TYPOGRAPHY.button]}>
                  CREATE
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, MILITARY_TYPOGRAPHY.heading]}>
          SELECT COLLECTION
        </Text>
        <ScrollView style={styles.list}>
          {collections.map((collection) => (
            <TouchableOpacity
              key={collection.id}
              style={[styles.listItem, { backgroundColor: TACTICAL_THEME.surface }]}
              onPress={() => handleCollectionSelect(collection)}
            >
              <FontAwesome name="book" size={20} color={TACTICAL_THEME.accent} />
              <View style={styles.itemInfo}>
                <Text style={[styles.itemTitle, { color: TACTICAL_THEME.text }]}>
                  {collection.abbreviation ? `${collection.abbreviation} - ${collection.name}` : collection.name}
                </Text>
                <Text style={[styles.itemSubtitle, { color: TACTICAL_THEME.textSecondary }]}>
                  {collection.scriptures.length} verses
                </Text>
              </View>
              <FontAwesome name="chevron-right" size={16} color={TACTICAL_THEME.textSecondary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: TACTICAL_THEME.accent }]}
          onPress={handleCreateCollection}
        >
          <FontAwesome name="plus" size={16} color={TACTICAL_THEME.text} />
          <Text style={[styles.createButtonText, MILITARY_TYPOGRAPHY.button]}>
            CREATE NEW COLLECTION
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderBookStep = () => {
    return (
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, MILITARY_TYPOGRAPHY.heading]}>
          SELECT BOOK
        </Text>
        <Text style={[styles.stepSubtitle, MILITARY_TYPOGRAPHY.caption]}>
          Choose any book from the Bible
        </Text>
        <ScrollView style={styles.list}>
          {books.map((book) => (
            <TouchableOpacity
              key={book.id}
              style={[styles.listItem, { backgroundColor: TACTICAL_THEME.surface }]}
              onPress={() => handleBookSelect(book)}
            >
              <FontAwesome name="book" size={20} color={TACTICAL_THEME.accent} />
              <View style={styles.itemInfo}>
                <Text style={[styles.itemTitle, { color: TACTICAL_THEME.text }]}>
                  {book.name}
                </Text>
                <Text style={[styles.itemSubtitle, { color: TACTICAL_THEME.textSecondary }]}>
                  {book.chapters} chapters
                </Text>
              </View>
              <FontAwesome name="chevron-right" size={16} color={TACTICAL_THEME.textSecondary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderChapterStep = () => {
    if (!selectedBook) return null;

    if (isLoadingChapters) {
      return (
        <View style={styles.stepContent}>
          <Text style={[styles.stepTitle, MILITARY_TYPOGRAPHY.heading]}>
            SELECT CHAPTER
          </Text>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={TACTICAL_THEME.accent} />
            <Text style={[styles.loadingText, MILITARY_TYPOGRAPHY.caption]}>
              Loading chapters for {selectedBook.name}...
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, MILITARY_TYPOGRAPHY.heading]}>
          SELECT CHAPTER
        </Text>
        <Text style={[styles.stepSubtitle, MILITARY_TYPOGRAPHY.caption]}>
          From {selectedBook.name} - All available chapters
        </Text>
        <ScrollView style={styles.chapterGrid}>
          {availableChapters.map((chapter) => (
            <TouchableOpacity
              key={chapter}
              style={[styles.chapterButton, { backgroundColor: TACTICAL_THEME.surface }]}
              onPress={() => handleChapterSelect(chapter)}
            >
              <Text style={[styles.chapterNumber, { color: TACTICAL_THEME.text }]}>
                {chapter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderVersesStep = () => {
    if (!selectedBook) return null;

    return (
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, MILITARY_TYPOGRAPHY.heading]}>
          SELECT VERSES
        </Text>
        <Text style={[styles.stepSubtitle, MILITARY_TYPOGRAPHY.caption]}>
          {selectedBook.name} Chapter {selectedChapter}
        </Text>
        <VerseSelector
          bookName={selectedBook.name}
          chapter={selectedChapter}
          onVersesSelected={handleVersesSelected}
          selectedVerses={selectedVerses}
        />
      </View>
    );
  };

  const renderContent = () => {
    switch (step) {
      case 'collection':
        return renderCollectionStep();
      case 'book':
        return renderBookStep();
      case 'chapter':
        return renderChapterStep();
      case 'verses':
        return renderVersesStep();
      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'collection':
        return selectedCollection !== null;
      case 'book':
        return selectedBook !== null;
      case 'chapter':
        return true;
      case 'verses':
        return selectedVerses.length > 0;
      default:
        return false;
    }
  };

  const handleNext = () => {
    switch (step) {
      case 'collection':
        setStep('book');
        break;
      case 'book':
        setStep('chapter');
        break;
      case 'chapter':
        setStep('verses');
        break;
      case 'verses':
        handleAddVerses();
        break;
    }
  };

  const handleBack = () => {
    switch (step) {
      case 'book':
        setStep('collection');
        break;
      case 'chapter':
        setStep('book');
        break;
      case 'verses':
        setStep('chapter');
        break;
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { backgroundColor: TACTICAL_THEME.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={step !== 'collection' ? handleBack : handleClose}
            >
              <FontAwesome
                name={step !== 'collection' ? "arrow-left" : "times"}
                size={20}
                color={TACTICAL_THEME.text}
              />
            </TouchableOpacity>

            <Text style={[styles.headerTitle, MILITARY_TYPOGRAPHY.heading]}>
              ADD VERSES
            </Text>

            <View style={styles.headerSpacer} />
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {renderContent()}
          </ScrollView>

          {/* Footer */}
          {step !== 'collection' && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  canProceed() && { backgroundColor: TACTICAL_THEME.accent }
                ]}
                onPress={canProceed() ? handleNext : undefined}
                disabled={!canProceed()}
              >
                <Text style={[
                  styles.actionButtonText,
                  MILITARY_TYPOGRAPHY.button,
                  !canProceed() && { opacity: 0.5 }
                ]}>
                  {step === 'verses' ? 'ADD VERSES' : 'NEXT'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: '95%',
    maxHeight: '90%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: TACTICAL_THEME.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: TACTICAL_THEME.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    color: TACTICAL_THEME.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    color: TACTICAL_THEME.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  list: {
    flex: 1,
    marginBottom: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    color: TACTICAL_THEME.text,
    fontWeight: 'bold',
  },
  chapterGrid: {
    flex: 1,
  },
  chapterButton: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
    margin: 8,
  },
  chapterNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: TACTICAL_THEME.border,
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: TACTICAL_THEME.surface,
  },
  actionButtonText: {
    color: TACTICAL_THEME.text,
    fontWeight: 'bold',
  },
  inputContainer: {
    padding: 20,
    backgroundColor: TACTICAL_THEME.background,
    borderRadius: 8,
  },
  inputLabel: {
    color: TACTICAL_THEME.text,
    marginBottom: 8,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  inputButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: TACTICAL_THEME.text,
    fontWeight: 'bold',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: TACTICAL_THEME.surface,
  },
  confirmButtonText: {
    color: TACTICAL_THEME.text,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: TACTICAL_THEME.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
});
