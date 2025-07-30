import AsyncStorage from '@react-native-async-storage/async-storage';
import { Collection, Scripture } from '@/types/scripture';
import { collections as transformedCollections, scriptures as transformedScriptures } from '@/mocks/collections-transformed';

const COLLECTIONS_KEY = 'collections';
const SCRIPTURES_KEY = 'scriptures';
const DATA_LOADED_KEY = 'data_loaded_v1';

export class DataLoaderService {
  
  // Check if transformed data has already been loaded
  static async isDataLoaded(): Promise<boolean> {
    try {
      const loaded = await AsyncStorage.getItem(DATA_LOADED_KEY);
      return loaded === 'true';
    } catch (error) {
      console.error('Error checking data loaded status:', error);
      return false;
    }
  }

  // Load transformed collections and scriptures into AsyncStorage
  static async loadTransformedData(): Promise<{
    collections: Collection[];
    scriptures: Scripture[];
    success: boolean;
  }> {
    try {
      // Check if data is already loaded
      const alreadyLoaded = await this.isDataLoaded();
      if (alreadyLoaded) {
        console.log('Transformed data already loaded, skipping...');
        return await this.getStoredData();
      }

      console.log('Loading transformed collections and scriptures...');

      // Get existing data
      const existingCollections = await this.getExistingCollections();
      const existingScriptures = await this.getExistingScriptures();

      // Merge with transformed data (avoid duplicates)
      const mergedCollections = this.mergeCollections(existingCollections, transformedCollections);
      const mergedScriptures = this.mergeScriptures(existingScriptures, transformedScriptures);

      // Save merged data
      await AsyncStorage.setItem(COLLECTIONS_KEY, JSON.stringify(mergedCollections));
      await AsyncStorage.setItem(SCRIPTURES_KEY, JSON.stringify(mergedScriptures));
      await AsyncStorage.setItem(DATA_LOADED_KEY, 'true');

      console.log(`Loaded ${transformedCollections.length} collections and ${transformedScriptures.length} scriptures`);

      return {
        collections: mergedCollections,
        scriptures: mergedScriptures,
        success: true,
      };
    } catch (error) {
      console.error('Error loading transformed data:', error);
      return {
        collections: [],
        scriptures: [],
        success: false,
      };
    }
  }

  // Get existing collections from storage
  private static async getExistingCollections(): Promise<Collection[]> {
    try {
      const stored = await AsyncStorage.getItem(COLLECTIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting existing collections:', error);
      return [];
    }
  }

  // Get existing scriptures from storage
  private static async getExistingScriptures(): Promise<Scripture[]> {
    try {
      const stored = await AsyncStorage.getItem(SCRIPTURES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting existing scriptures:', error);
      return [];
    }
  }

  // Merge collections, avoiding duplicates
  private static mergeCollections(existing: Collection[], newCollections: Collection[]): Collection[] {
    const existingIds = new Set(existing.map(c => c.id));
    const uniqueNew = newCollections.filter(c => !existingIds.has(c.id));
    return [...existing, ...uniqueNew];
  }

  // Merge scriptures, avoiding duplicates
  private static mergeScriptures(existing: Scripture[], newScriptures: Scripture[]): Scripture[] {
    const existingIds = new Set(existing.map(s => s.id));
    const uniqueNew = newScriptures.filter(s => !existingIds.has(s.id));
    return [...existing, ...uniqueNew];
  }

  // Get stored data
  private static async getStoredData(): Promise<{
    collections: Collection[];
    scriptures: Scripture[];
    success: boolean;
  }> {
    try {
      const collections = await this.getExistingCollections();
      const scriptures = await this.getExistingScriptures();
      return {
        collections,
        scriptures,
        success: true,
      };
    } catch (error) {
      console.error('Error getting stored data:', error);
      return {
        collections: [],
        scriptures: [],
        success: false,
      };
    }
  }

  // Force reload data (useful for development)
  static async forceReloadData(): Promise<{
    collections: Collection[];
    scriptures: Scripture[];
    success: boolean;
  }> {
    try {
      // Clear the loaded flag
      await AsyncStorage.removeItem(DATA_LOADED_KEY);
      
      // Reload data
      return await this.loadTransformedData();
    } catch (error) {
      console.error('Error force reloading data:', error);
      return {
        collections: [],
        scriptures: [],
        success: false,
      };
    }
  }

  // Get collection statistics
  static getCollectionStats(collections: Collection[]): {
    total: number;
    chapterBased: number;
    totalChapters: number;
    totalScriptures: number;
  } {
    const chapterBased = collections.filter(c => c.isChapterBased);
    const totalChapters = chapterBased.reduce((sum, c) => sum + (c.chapters?.length || 0), 0);
    const totalScriptures = collections.reduce((sum, c) => sum + c.scriptures.length, 0);

    return {
      total: collections.length,
      chapterBased: chapterBased.length,
      totalChapters,
      totalScriptures,
    };
  }

  // Clear all data (useful for development/testing)
  static async clearAllData(): Promise<boolean> {
    try {
      await AsyncStorage.multiRemove([COLLECTIONS_KEY, SCRIPTURES_KEY, DATA_LOADED_KEY]);
      console.log('All data cleared successfully');
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }

  // Export data for backup/sharing
  static async exportData(): Promise<{
    collections: Collection[];
    scriptures: Scripture[];
    exportDate: string;
  } | null> {
    try {
      const { collections, scriptures } = await this.getStoredData();
      return {
        collections,
        scriptures,
        exportDate: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  }
}
