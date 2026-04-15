/**
 * BibleLogRoundsModal
 * A focused bottom-sheet modal for adding pre-selected Bible verses
 * to an arsenal collection. Replaces the heavyweight AddVersesModal flow
 * when coming from the Bible reader where verses are already chosen.
 */
import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Scripture, Collection } from '@/types/scripture';
import { MILITARY_TYPOGRAPHY } from '@/constants/colors';
import { useAppStore } from '@/hooks/useAppStore';

interface BibleLogRoundsModalProps {
  isVisible: boolean;
  verses: Scripture[];
  onClose: () => void;
  onSuccess: (collectionId: string, verses: Scripture[]) => void;
}

export default function BibleLogRoundsModal({
  isVisible,
  verses,
  onClose,
  onSuccess,
}: BibleLogRoundsModalProps) {
  const {
    theme,
    isDark,
    collections,
    addCollection,
    addScriptures,
    addScripturesToCollection,
  } = useAppStore();

  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleClose = useCallback(() => {
    setSelectedCollection(null);
    setIsCreating(false);
    setNewName('');
    setIsSaving(false);
    onClose();
  }, [onClose]);

  const handleSave = useCallback(async () => {
    if (!selectedCollection && !isCreating) {
      Alert.alert('Select Arsenal', 'Please select or create an arsenal first.');
      return;
    }
    if (isCreating && !newName.trim()) {
      Alert.alert('Name Required', 'Enter a name for the new arsenal.');
      return;
    }

    setIsSaving(true);
    try {
      let targetCollection = selectedCollection;

      if (isCreating) {
        const newCollection: Collection = {
          id: `bible_${Date.now()}`,
          name: newName.trim(),
          scriptures: [],
          createdAt: new Date().toISOString(),
          tags: ['bible-reader'],
        };
        await addCollection(newCollection);
        targetCollection = newCollection;
      }

      if (!targetCollection) return;

      const added = await addScriptures(verses);
      if (!added) throw new Error('Failed to add scriptures');

      const linked = await addScripturesToCollection(
        targetCollection.id,
        verses.map(v => v.id),
      );
      if (!linked) throw new Error('Failed to link to collection');

      onSuccess(targetCollection.id, verses);
      Alert.alert(
        '🎯 ROUNDS LOGGED',
        `${verses.length} verse${verses.length !== 1 ? 's' : ''} added to "${targetCollection.name}"`,
        [{ text: 'DISMISSED', onPress: handleClose }],
      );
    } catch (e) {
      console.error('BibleLogRoundsModal save error:', e);
      Alert.alert('Error', 'Could not save verses. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [selectedCollection, isCreating, newName, verses, addCollection, addScriptures, addScripturesToCollection, onSuccess, handleClose]);

  const renderCollection = useCallback(({ item }: { item: Collection }) => {
    const isSelected = selectedCollection?.id === item.id;
    return (
      <TouchableOpacity
        style={[
          styles.collectionRow,
          { borderColor: isSelected ? theme.accent : theme.border },
          isSelected && { backgroundColor: `${theme.accent}18` },
        ]}
        onPress={() => { setSelectedCollection(item); setIsCreating(false); }}
        activeOpacity={0.75}
      >
        <View style={[styles.collectionIcon, { backgroundColor: isSelected ? theme.accent : theme.surface }]}>
          <Ionicons name="book" size={14} color={isSelected ? theme.accentContrastText : theme.textSecondary} />
        </View>
        <View style={styles.collectionInfo}>
          <Text style={[styles.collectionName, { color: theme.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.collectionMeta, { color: theme.textSecondary }]}>
            {item.scriptures.length} rounds
          </Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={20} color={theme.accent} />
        )}
      </TouchableOpacity>
    );
  }, [selectedCollection, theme]);

  const versePreview = useMemo(() =>
    verses.slice(0, 3).map(v => v.reference).join(', ') +
    (verses.length > 3 ? ` +${verses.length - 3} more` : ''),
    [verses],
  );

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFillObject} />
        <TouchableOpacity style={styles.dismissArea} onPress={handleClose} />

        <View style={[styles.sheet, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
          {/* Drag handle */}
          <View style={[styles.handle, { backgroundColor: theme.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, MILITARY_TYPOGRAPHY.heading, { color: theme.text }]}>
                LOG ROUNDS
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                {verses.length} verse{verses.length !== 1 ? 's' : ''} · {versePreview}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Verse chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsContent}
          >
            {verses.map(v => (
              <View key={v.id} style={[styles.chip, { backgroundColor: `${theme.accent}22`, borderColor: `${theme.accent}50` }]}>
                <Text style={[styles.chipText, { color: theme.accent }]}>{v.reference}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Section: Create new */}
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            TARGET ARSENAL
          </Text>

          {isCreating ? (
            <View style={styles.createRow}>
              <TextInput
                style={[styles.createInput, { color: theme.text, borderColor: theme.accent, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC' }]}
                placeholder="Arsenal name..."
                placeholderTextColor={theme.textSecondary}
                value={newName}
                onChangeText={setNewName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
              <TouchableOpacity
                style={styles.createCancelBtn}
                onPress={() => { setIsCreating(false); setNewName(''); }}
              >
                <Ionicons name="close-circle" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.newArsenalBtn, { borderColor: theme.border }]}
              onPress={() => { setIsCreating(true); setSelectedCollection(null); }}
            >
              <Ionicons name="add-circle-outline" size={18} color={theme.accent} />
              <Text style={[styles.newArsenalText, { color: theme.accent }]}>NEW ARSENAL</Text>
            </TouchableOpacity>
          )}

          {/* Collection list */}
          <FlatList
            data={collections}
            renderItem={renderCollection}
            keyExtractor={item => item.id}
            style={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No arsenals yet. Create one above.
              </Text>
            }
          />

          {/* Deploy button */}
          <TouchableOpacity
            style={[
              styles.deployBtn,
              {
                backgroundColor: selectedCollection || (isCreating && newName.trim())
                  ? theme.accent
                  : theme.border,
              },
            ]}
            onPress={handleSave}
            disabled={isSaving || (!selectedCollection && !(isCreating && newName.trim()))}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={theme.accentContrastText} />
            ) : (
              <>
                <Ionicons name="rocket" size={18} color={theme.accentContrastText} />
                <Text style={[styles.deployText, MILITARY_TYPOGRAPHY.button, { color: theme.accentContrastText }]}>
                  DEPLOY TO ARSENAL
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  title: {
    letterSpacing: 1.0,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '400',
  },
  closeBtn: {
    padding: 4,
  },
  chipsScroll: {
    marginBottom: 14,
  },
  chipsContent: {
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontFamily: 'monospace',
    marginBottom: 10,
  },
  newArsenalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  newArsenalText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: 'monospace',
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  createInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '500',
  },
  createCancelBtn: {
    padding: 4,
  },
  list: {
    maxHeight: 220,
    marginBottom: 16,
  },
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    marginBottom: 8,
    gap: 10,
  },
  collectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectionInfo: {
    flex: 1,
  },
  collectionName: {
    fontSize: 14,
    fontWeight: '600',
  },
  collectionMeta: {
    fontSize: 11,
    marginTop: 1,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 13,
    paddingVertical: 20,
  },
  deployBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  deployText: {
    letterSpacing: 1.0,
  },
});
