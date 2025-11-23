import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync, SQLiteDatabase } from 'expo-sqlite';
import * as schema from './schema';

const DATABASE_NAME = 'spiritammo.db';

let dbInstance: ReturnType<typeof drizzle> | null = null;
let expoDbInstance: SQLiteDatabase | null = null;
let isInitializing = false;
let initPromise: Promise<void> | null = null;

// Initialize the database with proper error handling and synchronization
const initializeDb = async (): Promise<void> => {
  if (expoDbInstance && dbInstance) {
    return; // Already initialized
  }

  if (isInitializing && initPromise) {
    // Wait for ongoing initialization
    await initPromise;
    return;
  }

  isInitializing = true;
  initPromise = (async () => {
    try {
      if (!expoDbInstance) {
        expoDbInstance = openDatabaseSync(DATABASE_NAME);
        console.log('SQLite database opened successfully');
      }

      if (!dbInstance && expoDbInstance) {
        dbInstance = drizzle(expoDbInstance, { schema });
        console.log('Drizzle ORM initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
      // Reset on error to allow retry
      expoDbInstance = null;
      dbInstance = null;
      throw error;
    } finally {
      isInitializing = false;
    }
  })();

  await initPromise;
};

// Lazy initialization - get the raw expo database
export const getExpoDb = async (): Promise<SQLiteDatabase> => {
  await initializeDb();
  if (!expoDbInstance) {
    throw new Error('Failed to initialize SQLite database');
  }
  return expoDbInstance;
};

// Get the Drizzle ORM instance
export const getDb = async () => {
  await initializeDb();
  if (!dbInstance) {
    throw new Error('Failed to initialize Drizzle ORM');
  }
  return dbInstance;
};

// Synchronous getter for backward compatibility (use with caution)
export const getSyncDb = (): SQLiteDatabase => {
  if (!expoDbInstance) {
    expoDbInstance = openDatabaseSync(DATABASE_NAME);
  }
  return expoDbInstance;
};

// Legacy export for backward compatibility
export const expoDb = getSyncDb();

