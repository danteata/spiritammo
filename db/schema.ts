import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';

// Scriptures Table
export const scriptures = sqliteTable('scriptures', {
    id: text('id').primaryKey(),
    book: text('book').notNull(),
    chapter: integer('chapter').notNull(),
    verse: integer('verse').notNull(),
    endVerse: integer('end_verse'),
    text: text('text').notNull(),
    reference: text('reference').notNull(),
    mnemonic: text('mnemonic'),
    lastPracticed: text('last_practiced'),
    accuracy: real('accuracy'),
    practiceCount: integer('practice_count').default(0),
    isJesusWords: integer('is_jesus_words', { mode: 'boolean' }).default(false),
});

// Collections Table
export const collections = sqliteTable('collections', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    abbreviation: text('abbreviation'),
    description: text('description'),
    createdAt: text('created_at'),
    tags: text('tags', { mode: 'json' }), // Storing array as JSON
    isChapterBased: integer('is_chapter_based', { mode: 'boolean' }).default(false),
    sourceBook: text('source_book'),
    // We'll store bookInfo and chapters as JSON for simplicity in this version, 
    // or we could normalize them. For now, JSON is flexible.
    bookInfo: text('book_info', { mode: 'json' }),
    chapters: text('chapters', { mode: 'json' }),
});

// Join table for Collections <-> Scriptures (Many-to-Many)
export const collectionScriptures = sqliteTable('collection_scriptures', {
    collectionId: text('collection_id').references(() => collections.id).notNull(),
    scriptureId: text('scripture_id').references(() => scriptures.id).notNull(),
}, (t) => ({
    pk: primaryKey({ columns: [t.collectionId, t.scriptureId] }),
}));

// Practice Logs / History
export const practiceLogs = sqliteTable('practice_logs', {
    id: text('id').primaryKey(),
    scriptureId: text('scripture_id').references(() => scriptures.id),
    date: text('date').notNull(),
    accuracy: real('accuracy').notNull(),
    duration: integer('duration'), // in seconds
    transcription: text('transcription'),
});

// Battle Intel (Mnemonics)
export const battleIntel = sqliteTable('battle_intel', {
    id: text('id').primaryKey(),
    reference: text('reference').notNull(),
    battlePlan: text('battle_plan').notNull(),
    tacticalNotes: text('tactical_notes'),
    reliability: integer('reliability'),
    dateCreated: text('date_created').notNull(),
    missionType: text('mission_type'),
});
