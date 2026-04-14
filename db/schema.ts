import { sqliteTable, text, integer, real, primaryKey, index } from 'drizzle-orm/sqlite-core';

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
}, (table) => ({
    bookChapterIdx: index('idx_book_chapter').on(table.book, table.chapter),
    referenceIdx: index('idx_reference').on(table.reference),
    accuracyIdx: index('idx_accuracy').on(table.accuracy),
}));

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

// Mnemonics Arsenal
export const mnemonics = sqliteTable('mnemonics', {
    id: text('id').primaryKey(),
    scriptureId: text('scripture_id').references(() => scriptures.id).notNull(),
    type: text('type').notNull(), // 'acrostic' | 'visual' | 'story-chain' | 'acronym' | 'keyword'
    content: text('content').notNull(),
    source: text('source').notNull(), // 'ai' | 'community' | 'user'
    authorUserId: text('author_user_id'),
    upvotes: integer('upvotes').default(0),
    downvotes: integer('downvotes').default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at'),
}, (table) => ({
    scriptureIdx: index('idx_mnemonics_scripture').on(table.scriptureId),
    sourceIdx: index('idx_mnemonics_source').on(table.source),
}));

// SRS State (Spaced Repetition)
export const srsStates = sqliteTable('srs_states', {
    id: text('id').primaryKey(),
    scriptureId: text('scripture_id').references(() => scriptures.id).notNull(),
    interval: integer('interval').notNull().default(1),
    easeFactor: real('ease_factor').notNull().default(2.5),
    dueDate: text('due_date').notNull(),
    reps: integer('reps').notNull().default(0),
    lapses: integer('lapses').notNull().default(0),
    lastReviewDate: text('last_review_date'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at'),
}, (table) => ({
    scriptureIdx: index('idx_srs_scripture').on(table.scriptureId),
    dueDateIdx: index('idx_srs_due_date').on(table.dueDate),
}));
