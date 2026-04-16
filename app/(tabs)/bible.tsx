import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAppStore } from '@/hooks/useAppStore';
import { Scripture, Collection } from '@/types/scripture';
import BibleReaderScreen from '@/components/bible/BibleReaderScreen';
import BibleLogRoundsModal from '@/components/bible/BibleLogRoundsModal';

// Global deep-link handler registered by this tab so AmmunitionCard can call it
export interface BibleDeepLinkTarget {
  book: string;
  chapter: number;
  verse?: number;
}

export let navigateToBibleVerse: ((target: BibleDeepLinkTarget) => void) | null = null;

export default function BibleTab() {
  const { theme, addScriptures, addCollection, addScripturesToCollection, startTraining } = useAppStore();
  const [isLogModalVisible, setIsLogModalVisible] = useState(false);
  const [pendingVerses, setPendingVerses] = useState<Scripture[]>([]);
  const [deepLinkTarget, setDeepLinkTarget] = useState<BibleDeepLinkTarget | undefined>(undefined);
  const [deepLinkKey, setDeepLinkKey] = useState(0);

  // Register the deep-link handler (called by AmmunitionCard "View in Context")
  useEffect(() => {
    navigateToBibleVerse = (target: BibleDeepLinkTarget) => {
      setDeepLinkTarget(target);
      setDeepLinkKey(k => k + 1);
      router.push('/(tabs)/bible');
    };
    return () => {
      navigateToBibleVerse = null;
    };
  }, []);

  const handleAddToCollection = useCallback((verses: Scripture[]) => {
    if (verses.length === 0) return;
    setPendingVerses(verses);
    setIsLogModalVisible(true);
  }, []);

  const handleDrillNow = useCallback(async (verses: Scripture[]) => {
    if (verses.length === 0) return;

    Alert.alert(
      '⚡ DRILL NOW',
      `Start an immediate drill with ${verses.length} verse${verses.length > 1 ? 's' : ''}?\n\nVerses will be added to your store first.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'DRILL',
          onPress: async () => {
            try {
              await addScriptures(verses);

              const drillCollectionId = `drill_${Date.now()}`;
              const drillCollection: Collection = {
                id: drillCollectionId,
                name: 'BIBLE DRILL',
                scriptures: verses.map(v => v.id),
                createdAt: new Date().toISOString(),
                tags: ['bible-drill', 'auto'],
              };
              await addCollection(drillCollection);
              await addScripturesToCollection(drillCollectionId, verses.map(v => v.id));

              startTraining('single', drillCollectionId);
              router.push('/(tabs)/train');
            } catch (e) {
              console.error('Drill Now error:', e);
              Alert.alert('Error', 'Unable to start drill. Please try again.');
            }
          },
        },
      ],
    );
  }, [addScriptures, addCollection, addScripturesToCollection, startTraining]);

  const handleLogSuccess = useCallback((collectionId: string, verses: Scripture[]) => {
    setIsLogModalVisible(false);
    setPendingVerses([]);
  }, []);

  const handleLogClose = useCallback(() => {
    setIsLogModalVisible(false);
    setPendingVerses([]);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <BibleReaderScreen
        initialBook={deepLinkTarget?.book}
        initialChapter={deepLinkTarget?.chapter}
        initialVerse={deepLinkTarget?.verse}
        deepLinkKey={deepLinkKey}
        onRequestAddToCollection={handleAddToCollection}
        onRequestDrill={handleDrillNow}
      />

      {/* Focused verse-confirmation sheet */}
      <BibleLogRoundsModal
        isVisible={isLogModalVisible}
        verses={pendingVerses}
        onClose={handleLogClose}
        onSuccess={handleLogSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
