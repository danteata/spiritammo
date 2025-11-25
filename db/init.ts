import { getExpoDb } from './client';

export const initializeDatabase = async () => {
    try {
        const db = await getExpoDb();

        if (!db) {
            throw new Error('Database instance is null');
        }

        // Use execAsync for async operations to avoid blocking
        await db.execAsync(`
            PRAGMA journal_mode = WAL;
            PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS scriptures (
                id TEXT PRIMARY KEY NOT NULL,
                book TEXT NOT NULL,
                chapter INTEGER NOT NULL,
                verse INTEGER NOT NULL,
                end_verse INTEGER,
                text TEXT NOT NULL,
                reference TEXT NOT NULL,
                mnemonic TEXT,
                last_practiced TEXT,
                accuracy REAL,
                practice_count INTEGER DEFAULT 0,
                is_jesus_words BOOLEAN DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS collections (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                abbreviation TEXT,
                description TEXT,
                created_at TEXT,
                tags TEXT,
                is_chapter_based BOOLEAN DEFAULT 0,
                source_book TEXT,
                book_info TEXT,
                chapters TEXT
            );

            CREATE TABLE IF NOT EXISTS collection_scriptures (
                collection_id TEXT NOT NULL,
                scripture_id TEXT NOT NULL,
                PRIMARY KEY (collection_id, scripture_id),
                FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
                FOREIGN KEY (scripture_id) REFERENCES scriptures(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS practice_logs (
                id TEXT PRIMARY KEY NOT NULL,
                scripture_id TEXT,
                date TEXT NOT NULL,
                accuracy REAL NOT NULL,
                duration INTEGER,
                transcription TEXT,
                FOREIGN KEY (scripture_id) REFERENCES scriptures(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS battle_intel (
                id TEXT PRIMARY KEY NOT NULL,
                reference TEXT NOT NULL,
                battle_plan TEXT NOT NULL,
                tactical_notes TEXT,
                reliability INTEGER,
                date_created TEXT NOT NULL,
                mission_type TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_book_chapter ON scriptures(book, chapter);
            CREATE INDEX IF NOT EXISTS idx_reference ON scriptures(reference);
            CREATE INDEX IF NOT EXISTS idx_accuracy ON scriptures(accuracy);
        `);

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
    }
};
