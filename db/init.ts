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

            CREATE TABLE IF NOT EXISTS mnemonics (
                id TEXT PRIMARY KEY NOT NULL,
                scripture_id TEXT NOT NULL,
                type TEXT NOT NULL,
                content TEXT NOT NULL,
                source TEXT NOT NULL,
                author_user_id TEXT,
                upvotes INTEGER DEFAULT 0,
                downvotes INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT,
                FOREIGN KEY (scripture_id) REFERENCES scriptures(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS srs_states (
                id TEXT PRIMARY KEY NOT NULL,
                scripture_id TEXT NOT NULL,
                interval INTEGER NOT NULL DEFAULT 1,
                ease_factor REAL NOT NULL DEFAULT 2.5,
                due_date TEXT NOT NULL,
                reps INTEGER NOT NULL DEFAULT 0,
                lapses INTEGER NOT NULL DEFAULT 0,
                last_review_date TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT,
                FOREIGN KEY (scripture_id) REFERENCES scriptures(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_mnemonics_scripture ON mnemonics(scripture_id);
            CREATE INDEX IF NOT EXISTS idx_mnemonics_source ON mnemonics(source);
            CREATE INDEX IF NOT EXISTS idx_srs_scripture ON srs_states(scripture_id);
            CREATE INDEX IF NOT EXISTS idx_srs_due_date ON srs_states(due_date);

            CREATE TABLE IF NOT EXISTS bible_highlights (
                id TEXT PRIMARY KEY NOT NULL,
                verse_id TEXT NOT NULL,
                color TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS bible_notes (
                id TEXT PRIMARY KEY NOT NULL,
                verse_id TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_highlight_verse ON bible_highlights(verse_id);
            CREATE INDEX IF NOT EXISTS idx_note_verse ON bible_notes(verse_id);
        `);

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
    }
};
