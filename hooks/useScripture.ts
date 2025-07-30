import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Scripture } from '@/types/scripture';
import { SCRIPTURES } from '@/mocks/scriptures';

const SCRIPTURE_STORAGE_KEY = '@spiritammo_scriptures';
const PROGRESS_STORAGE_KEY = '@spiritammo_progress';

export function useScripture() {
  const [scriptures, setScriptures] = useState<Scripture[]>([]);
  const [currentScripture, setCurrentScripture] = useState<Scripture | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load scriptures from storage or initialize with mock data
  useEffect(() => {
    const loadScriptures = async () => {
      try {
        setIsLoading(true);
        const storedScriptures = await AsyncStorage.getItem(SCRIPTURE_STORAGE_KEY);
        
        if (storedScriptures) {
          const parsedScriptures = JSON.parse(storedScriptures) as Scripture[];
          setScriptures(parsedScriptures);
          
          // Set a random scripture as current if none is selected
          if (!currentScripture && parsedScriptures.length > 0) {
            const randomIndex = Math.floor(Math.random() * parsedScriptures.length);
            setCurrentScripture(parsedScriptures[randomIndex]);
          }
        } else {
          // Initialize with mock data
          await AsyncStorage.setItem(SCRIPTURE_STORAGE_KEY, JSON.stringify(SCRIPTURES));
          setScriptures(SCRIPTURES);
          
          if (SCRIPTURES.length > 0) {
            setCurrentScripture(SCRIPTURES[0]);
          }
        }
      } catch (error) {
        console.error('Failed to load scriptures:', error);
        setError('Failed to load scriptures. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadScriptures();
  }, []);

  // Get scriptures by book and chapter
  const getScripturesByBook = useCallback((book: string) => {
    return scriptures.filter(scripture => scripture.book === book);
  }, [scriptures]);

  const getScripturesByChapter = useCallback((book: string, chapter: number) => {
    return scriptures.filter(
      scripture => scripture.book === book && scripture.chapter === chapter
    );
  }, [scriptures]);

  // Get a random scripture
  const getRandomScripture = useCallback(() => {
    if (scriptures.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * scriptures.length);
    const scripture = scriptures[randomIndex];
    setCurrentScripture(scripture);
    return scripture;
  }, [scriptures]);

  // Update scripture progress
  const updateScriptureProgress = useCallback(async (
    scriptureId: string, 
    accuracy: number
  ) => {
    try {
      // Get existing progress
      const progressData = await AsyncStorage.getItem(PROGRESS_STORAGE_KEY);
      const progress = progressData ? JSON.parse(progressData) : {};
      
      // Update progress for this scripture
      const scriptureProgress = progress[scriptureId] || {
        practiceCount: 0,
        totalAccuracy: 0,
        lastPracticed: null
      };
      
      scriptureProgress.practiceCount += 1;
      scriptureProgress.totalAccuracy += accuracy;
      scriptureProgress.lastPracticed = new Date().toISOString();
      scriptureProgress.averageAccuracy = 
        scriptureProgress.totalAccuracy / scriptureProgress.practiceCount;
      
      progress[scriptureId] = scriptureProgress;
      
      // Save updated progress
      await AsyncStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
      
      // Update scripture in state
      setScriptures(prev => 
        prev.map(s => 
          s.id === scriptureId 
            ? { 
                ...s, 
                accuracy: scriptureProgress.averageAccuracy,
                practiceCount: scriptureProgress.practiceCount,
                lastPracticed: scriptureProgress.lastPracticed
              } 
            : s
        )
      );
      
      if (currentScripture?.id === scriptureId) {
        setCurrentScripture(prev => 
          prev ? { 
            ...prev, 
            accuracy: scriptureProgress.averageAccuracy,
            practiceCount: scriptureProgress.practiceCount,
            lastPracticed: scriptureProgress.lastPracticed
          } : null
        );
      }
      
      return true;
    } catch (error) {
      console.error('Failed to update scripture progress:', error);
      return false;
    }
  }, [currentScripture]);

  return {
    scriptures,
    currentScripture,
    setCurrentScripture,
    isLoading,
    error,
    getScripturesByBook,
    getScripturesByChapter,
    getRandomScripture,
    updateScriptureProgress
  };
}