import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useAppStore } from '@/hooks/useAppStore';
import { Scripture } from '@/types/scripture';
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
  const { theme, addScriptures, startTraining } = useAppStore();
  const [isLogModalVisible, setIsLogModalVisible] = useState(false);
  const [pendingVerses, setPendingVerses] = useState<Scripture[]>([]);
  const [deepLinkTarget, setDeepLinkTarget] = useState<BibleDeepLinkTarget | undefined>(undefined);

  // Register the deep-link handler (called by AmmunitionCard "View in Context")
  useEffect(() => {
    navigateToBibleVerse = (target: BibleDeepLinkTarget) => {
      setDeepLinkTarget(target);
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
              // Navigate to the Train tab and start a single-verse drill
              startTraining('single');
            } catch (e) {
              console.error('Drill Now error:', e);
              Alert.alert('Error', 'Unable to start drill. Please try again.');
            }
          },
        },
      ],
    );
  }, [addScriptures, startTraining]);

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
