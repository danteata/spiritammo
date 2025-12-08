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
  StatusBar,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { MILITARY_TYPOGRAPHY } from '@/constants/colors';
import { useAppStore } from '@/hooks/useAppStore';
import {
  Book,
  Collection,
  Scripture,
  UserSettings,
  UserStats,
} from '@/types/scripture'
import { BOOKS } from '@/mocks/books'
import BookSelector from './BookSelector';
import ChapterSelector from './ChapterSelector';
import VerseSelector from './VerseSelector';
import CollectionSelector from './CollectionSelector';

interface AddVersesModalProps {
  isVisible: boolean;
  onClose: () => void;
  onVersesAdded?: (collectionId: string, verses: Scripture[]) => void;
  preselectedCollection?: Collection;
}

type TabType = 'BOOK' | 'CHAPTER' | 'VERSE';
type Step = 'collection' | 'navigation';

export default function AddVersesModal({
  isVisible,
  onClose,
  onVersesAdded,
  preselectedCollection
}: AddVersesModalProps) {
  const {
    collections,
    addCollection,
    addScripturesToCollection,
    addScriptures,
    isDark
  } = useAppStore();

  const { theme } = useAppStore();

  const [currentStep, setCurrentStep] = useState<Step>('collection');
  const [activeTab, setActiveTab] = useState<TabType>('BOOK');
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [selectedVerses, setSelectedVerses] = useState<Scripture[]>([]);
  const [isCreatingNewCollection, setIsCreatingNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const resetModal = () => {
    if (!preselectedCollection) {
      setCurrentStep('collection');
    }
    setActiveTab('BOOK');
    if (!preselectedCollection) {
      setSelectedCollection(null);
    }
    setSelectedBook(null);
    setSelectedChapter(null);
    setSelectedVerses([]);
    setIsCreatingNewCollection(false);
    setNewCollectionName('');
    setSearchQuery('');
  };

  // Set preselected collection when provided
  useEffect(() => {
    if (preselectedCollection && isVisible) {
      setSelectedCollection(preselectedCollection);
      setCurrentStep('navigation');
    }
  }, [preselectedCollection, isVisible]);

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleCollectionSelect = (collection: Collection) => {
    setSelectedCollection(collection);
    setCurrentStep('navigation');
  };

  const handleCreateNewCollection = () => {
    setIsCreatingNewCollection(true);
  };

  const handleBookSelect = (book: Book) => {
    setSelectedBook(book);
    setActiveTab('CHAPTER');
  };

  const handleChapterSelect = (chapter: number) => {
    setSelectedChapter(chapter);
    setActiveTab('VERSE');
  };

  const handleVersesSelected = (verses: Scripture[]) => {
    setSelectedVerses(verses);
  };

  const handleSearch = async () => {
    // Parse search query like "John 1" or "Gen 3:16" or "John 3:16"
    const query = searchQuery.trim();
    if (!query) return;

    console.log('Search:', query);

    // Parse patterns like "John 1", "Gen 3", "John 3:16", "Genesis 1:1"
    const patterns = [
      /^([1-3]?\s*[A-Za-z]+)\s+(\d+):(\d+)$/,  // Book Chapter:Verse (e.g., "John 3:16", "1 John 3:16")
      /^([1-3]?\s*[A-Za-z]+)\s+(\d+)$/,         // Book Chapter (e.g., "John 1", "1 John 1")
    ];

    let bookName = '';
    let chapter = null;
    let verse = null;

    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) {
        bookName = match[1].trim();
        chapter = parseInt(match[2]);
        verse = match[3] ? parseInt(match[3]) : null;
        break;
      }
    }

    if (!bookName || !chapter) {
      Alert.alert('Invalid Search', 'Please use format like "John 1" or "John 3:16"');
      return;
    }

    // Find matching book from BOOKS
    const book = BOOKS.find(b =>
      b.name.toLowerCase() === bookName.toLowerCase() ||
      b.abbreviations?.some(abbr => abbr.toLowerCase() === bookName.toLowerCase())
    );

    if (!book) {
      Alert.alert('Book Not Found', `Could not find book "${bookName}"`);
      return;
    }

    // Validate chapter
    if (chapter > book.chapters) {
      Alert.alert('Invalid Chapter', `${book.name} only has ${book.chapters} chapters`);
      return;
    }

    // Set the book and chapter
    setSelectedBook(book);
    setSelectedChapter(chapter);
    setActiveTab('VERSE');

    // If specific verse was requested, we'll select it after verses load
    // For now, just navigate to the verse tab
  };

  const handleConfirm = async () => {
    if (!selectedCollection && !isCreatingNewCollection) {
      Alert.alert('Error', 'Please select a collection');
      return;
    }

    if (selectedVerses.length === 0) {
      Alert.alert('Error', 'Please select at least one verse');
      return;
    }

    try {
      let targetCollection = selectedCollection;

      // Create new collection if needed
      if (isCreatingNewCollection) {
        if (!newCollectionName.trim()) {
          Alert.alert('Error', 'Please enter a collection name');
          return;
        }

        const newCollection: Collection = {
          id: `manual_${Date.now()}`,
          name: newCollectionName.trim(),
          scriptures: [],
          createdAt: new Date().toISOString(),
          tags: ['manual'],
        };

        const success = await addCollection(newCollection);
        if (!success) {
          Alert.alert('Error', 'Failed to create collection');
          return;
        }
        targetCollection = newCollection;
      }

      if (!targetCollection) {
        Alert.alert('Error', 'No collection selected');
        return;
      }

      console.log(`📦 Adding ${selectedVerses.length} verses to collection`);

      // First, add the scripture objects to the global scriptures store
      const addScripturesSuccess = await addScriptures(selectedVerses);
      if (!addScripturesSuccess) {
        console.error('❌ Failed to add scriptures to global store');
        Alert.alert('Error', 'Failed to add verses to store');
        return;
      }
      console.log('✅ Scriptures added to global store');

      // Then, add the scripture IDs to the collection
      const success = await addScripturesToCollection(
        targetCollection.id,
        selectedVerses.map(v => v.id)
      );

      if (success) {
        console.log(`✅ Added ${selectedVerses.length} verse IDs to collection ${targetCollection.name}`);
        Alert.alert(
          'Success',
          `Added ${selectedVerses.length} verse${selectedVerses.length !== 1 ? 's' : ''} to "${targetCollection.name}"`,
          [
            {
              text: 'Done',
              onPress: () => {
                onVersesAdded?.(targetCollection.id, selectedVerses);
                handleClose();
              }
            },
            {
              text: 'Add More',
              onPress: () => {
                // Reset selections but keep collection and stay in navigation
                setSelectedBook(null);
                setSelectedChapter(null);
                setSelectedVerses([]);
                setActiveTab('BOOK');
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to add verses to collection');
      }
    } catch (error) {
      console.error('Error adding verses:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'collection':
        return selectedCollection !== null || isCreatingNewCollection;
      case 'navigation':
        return selectedVerses.length > 0;
      default:
        return false;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'collection':
        return 'Deploy Ammunition';
      case 'navigation':
        return 'Intel Package Navigation';
      default:
        return '';
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'collection':
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepDescription, MILITARY_TYPOGRAPHY.caption]}>
              Select target ammunition depot or establish new supply cache
            </Text>

            {!isCreatingNewCollection ? (
              <>
                <CollectionSelector
                  onSelectCollection={handleCollectionSelect}
                  selectedCollection={selectedCollection}
                />

                <TouchableOpacity
                  style={[styles.newCollectionButton, { backgroundColor: theme.accent }]}
                  onPress={handleCreateNewCollection}
                >
                  <FontAwesome name="plus" size={16} color={theme.text} />
                  <Text style={[styles.newCollectionText, MILITARY_TYPOGRAPHY.button]}>
                    ESTABLISH NEW DEPOT
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.newCollectionForm}>
                <Text style={[styles.formLabel, MILITARY_TYPOGRAPHY.body]}>
                  Depot Designation:
                </Text>
                <TextInput
                  style={[styles.collectionNameInput, { color: theme.text, borderColor: theme.border }]}
                  placeholder="Enter depot name"
                  placeholderTextColor={theme.textSecondary}
                  value={newCollectionName}
                  onChangeText={setNewCollectionName}
                  autoFocus={true}
                />
                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={[styles.cancelButton, { backgroundColor: theme.surface }]}
                    onPress={() => {
                      setIsCreatingNewCollection(false);
                      setNewCollectionName('');
                    }}
                  >
                    <Text style={[styles.cancelButtonText, MILITARY_TYPOGRAPHY.button]}>
                      ABORT
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.createButton,
                      newCollectionName.trim() && { backgroundColor: theme.accent }
                    ]}
                    onPress={() => newCollectionName.trim() && setCurrentStep('navigation')}
                    disabled={!newCollectionName.trim()}
                  >
                    <Text style={[styles.createButtonText, MILITARY_TYPOGRAPHY.button]}>
                      ESTABLISH
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        );

      case 'navigation':
        return (
          <View style={styles.navigationContent}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <FontAwesome name="book" size={20} color={theme.accent} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="John 1"
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <TouchableOpacity
                style={styles.goButton}
                onPress={handleSearch}
              >
                <Text style={styles.goButtonText}>GO</Text>
              </TouchableOpacity>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'BOOK' && styles.tabActive]}
                onPress={() => setActiveTab('BOOK')}
              >
                <FontAwesome name="book" size={16} color={activeTab === 'BOOK' ? theme.accent : theme.text} />
                <Text style={[styles.tabText, activeTab === 'BOOK' && styles.tabTextActive]}>
                  BOOK
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, activeTab === 'CHAPTER' && styles.tabActive]}
                onPress={() => setActiveTab('CHAPTER')}
                disabled={!selectedBook}
              >
                <FontAwesome name="bookmark" size={16} color={activeTab === 'CHAPTER' ? theme.accent : theme.textSecondary} />
                <Text style={[styles.tabText, activeTab === 'CHAPTER' && styles.tabTextActive, !selectedBook && styles.tabTextDisabled]}>
                  CHAPTER
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, activeTab === 'VERSE' && styles.tabActive]}
                onPress={() => setActiveTab('VERSE')}
                disabled={!selectedChapter}
              >
                <FontAwesome name="list-ol" size={16} color={activeTab === 'VERSE' ? theme.accent : theme.textSecondary} />
                <Text style={[styles.tabText, activeTab === 'VERSE' && styles.tabTextActive, !selectedChapter && styles.tabTextDisabled]}>
                  VERSE
                </Text>
              </TouchableOpacity>
            </View>

            {/* Current Selection Display */}
            {(selectedBook || selectedChapter) && (
              <Text style={styles.currentSelection}>
                {selectedBook?.name || ''}{selectedChapter ? ` ${selectedChapter}` : ''}
              </Text>
            )}

            {/* Tab Content */}
            <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
              {activeTab === 'BOOK' && (
                <BookSelector onSelectBook={handleBookSelect} />
              )}
              {activeTab === 'CHAPTER' && selectedBook && (
                <ChapterSelector
                  book={selectedBook}
                  onSelectChapter={handleChapterSelect}
                  selectedChapter={selectedChapter}
                />
              )}
              {activeTab === 'VERSE' && selectedBook && selectedChapter && (
                <VerseSelector
                  bookName={selectedBook.name}
                  chapter={selectedChapter}
                  onVersesSelected={handleVersesSelected}
                  selectedVerses={selectedVerses}
                />
              )}
            </ScrollView>
          </View>
        );

      default:
        return null;
    }
  };

  const handleBack = () => {
    if (currentStep === 'navigation') {
      setCurrentStep('collection');
    }
  };

  const styles = getStyles(theme);

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={isVisible}
      onRequestClose={handleClose}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.background }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={currentStep !== 'collection' ? handleBack : handleClose}
          >
            <FontAwesome
              name={currentStep !== 'collection' ? "arrow-left" : "times"}
              size={24}
              color={theme.text}
            />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, MILITARY_TYPOGRAPHY.heading]}>
            {getStepTitle()}
          </Text>

          <TouchableOpacity style={styles.settingsButton}>
            <FontAwesome name="cog" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {renderStepContent()}
        </View>

        {/* Footer - Deploy Button */}
        {currentStep === 'navigation' && selectedVerses.length > 0 && (
          <View style={styles.footer}>
            <View style={styles.deployInfo}>
              <Text style={styles.deployInfoText}>
                {selectedVerses.length} round{selectedVerses.length !== 1 ? 's' : ''} ready for deployment
              </Text>
              <Text style={styles.deployTargetText}>
                Target: {selectedCollection?.name || newCollectionName}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.deployButton, { backgroundColor: theme.accent }]}
              onPress={handleConfirm}
            >
              <FontAwesome name="rocket" size={20} color={theme.text} style={{ marginRight: 8 }} />
              <Text style={[styles.deployButtonText, MILITARY_TYPOGRAPHY.button]}>
                DEPLOY AMMUNITION
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

// Helper function to get theme colors since we can't use hooks in StyleSheet
// We'll use inline styles for theme-dependent colors or a style generator
const getStyles = (theme: typeof TACTICAL_THEME) => StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.background,
  },
  backButton: {
    padding: 8,
  },
  settingsButton: {
    padding: 8,
  },
  headerTitle: {
    color: theme.text,
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    padding: 20,
  },
  stepDescription: {
    color: theme.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  navigationContent: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    color: theme.text,
  },
  goButton: {
    backgroundColor: theme.accent,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 6,
  },
  goButtonText: {
    color: theme.text, // Accent usually has light text, but let's stick to theme.text for now or hardcode white if needed
    fontSize: 14,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: theme.surface,
    gap: 8,
  },
  tabActive: {
    borderWidth: 2,
    borderColor: theme.accent,
  },
  tabText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabTextActive: {
    color: theme.accent,
  },
  tabTextDisabled: {
    color: theme.textSecondary,
    opacity: 0.5,
  },
  currentSelection: {
    color: theme.text,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  tabContent: {
    flex: 1,
  },
  newCollectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
  },
  newCollectionText: {
    color: theme.text, // Check contrast
    fontWeight: 'bold',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.surface,
  },
  deployInfo: {
    marginBottom: 12,
  },
  deployInfoText: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  deployTargetText: {
    color: theme.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  deployButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
  },
  deployButtonText: {
    color: theme.text, // Check contrast
  },
  newCollectionForm: {
    padding: 20,
    backgroundColor: theme.background,
    borderRadius: 8,
  },
  formLabel: {
    color: theme.text,
    marginBottom: 8,
    fontWeight: '500',
  },
  collectionNameInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  formActions: {
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
    color: theme.text,
    fontWeight: 'bold',
  },
  createButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: theme.surface,
  },
  createButtonText: {
    color: theme.text,
    fontWeight: 'bold',
  },
});
