import { StateCreator } from 'zustand'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { scriptures as scripturesTable, practiceLogs as practiceLogsTable } from '@/db/schema'
import { Book, Scripture } from '@/types/scripture'
import { errorHandler } from '@/services/errorHandler'
import { BOOKS } from '@/mocks/books'

// Generate a simple UUID for React Native
function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export interface ScriptureSlice {
    books: Book[]
    scriptures: Scripture[]
    selectedBook: Book | null
    selectedChapters: number[]
    currentScripture: Scripture | null

    setSelectedBook: (book: Book | null) => void
    setSelectedChapters: (chapters: number[]) => void
    setCurrentScripture: (s: Scripture | null) => void
    getScripturesByBookAndChapter: (bookId: string, chapter: number) => Scripture[]
    getRandomScripture: () => Scripture | null
    updateScriptureAccuracy: (scriptureId: string, accuracy: number) => Promise<boolean>
    updateScriptureMnemonic: (scriptureId: string, mnemonic: string) => Promise<boolean>
    addScriptures: (newScriptures: Scripture[]) => Promise<boolean>
}

export const createScriptureSlice: StateCreator<ScriptureSlice & { updateUserStats: (accuracy: number) => Promise<boolean> }, [], [], ScriptureSlice> = (set, get) => ({
    books: BOOKS,
    scriptures: [],
    selectedBook: null,
    selectedChapters: [],
    currentScripture: null,

    setSelectedBook: (book) => set({ selectedBook: book }),
    setSelectedChapters: (chapters) => set({ selectedChapters: chapters }),
    setCurrentScripture: (s) => set({ currentScripture: s }),

    getScripturesByBookAndChapter: (bookId, chapter) => {
        return get().scriptures.filter((scripture) =>
            scripture.book.toLowerCase() === bookId.toLowerCase() && scripture.chapter === chapter
        )
    },

    getRandomScripture: () => {
        const scriptures = get().scriptures
        if (scriptures.length === 0) return null

        let filtered = scriptures
        const selectedBook = get().selectedBook
        if (selectedBook) {
            filtered = filtered.filter((s) => s.book.toLowerCase() === selectedBook.name.toLowerCase())
            if (get().selectedChapters.length > 0) {
                filtered = filtered.filter((s) => get().selectedChapters.includes(s.chapter))
            }
        }

        if (filtered.length === 0) filtered = scriptures

        const idx = Math.floor(Math.random() * filtered.length)
        const scripture = filtered[idx]
        set({ currentScripture: scripture })
        return scripture
    },

    updateScriptureAccuracy: async (scriptureId, accuracy) => {
        try {
            console.log('🎯 updateScriptureAccuracy called:', { scriptureId, accuracy })
            const timestamp = new Date().toISOString();
            const db = await getDb();

            if (!db) {
                throw new Error('Database not initialized');
            }

            // 1. Update in DB
            const currentScripture = get().scriptures.find(s => s.id === scriptureId);
            if (!currentScripture) {
                throw new Error(`Scripture not found: ${scriptureId}`);
            }

            const newAccuracy = currentScripture.accuracy ? (currentScripture.accuracy + accuracy) / 2 : accuracy;
            const newCount = (currentScripture.practiceCount || 0) + 1;

            console.log('🎯 Updating scripture in DB:', { newAccuracy, newCount });
            await db.update(scripturesTable)
                .set({
                    accuracy: newAccuracy,
                    practiceCount: newCount,
                    lastPracticed: timestamp
                })
                .where(eq(scripturesTable.id, scriptureId));

            // 2. Log practice
            console.log('🎯 Logging practice to database');
            await db.insert(practiceLogsTable).values({
                id: generateUUID(),
                scriptureId,
                date: timestamp,
                accuracy,
                duration: 0 // TODO: Pass duration
            });

            // 3. Update State
            const updatedScriptures = get().scriptures.map((scripture) =>
                scripture.id === scriptureId
                    ? ({
                        ...scripture,
                        accuracy: newAccuracy,
                        practiceCount: newCount,
                        lastPracticed: timestamp,
                    } as Scripture)
                    : scripture
            )

            set({ scriptures: updatedScriptures })

            if (get().currentScripture?.id === scriptureId) {
                set({ currentScripture: (updatedScriptures.find((s) => s.id === scriptureId) as Scripture) || null })
            }

            console.log('🎯 Calling updateUserStats with accuracy:', accuracy);
            // Note: updateUserStats is expected to be in the merged store
            await get().updateUserStats(accuracy)
            console.log('🎯 updateScriptureAccuracy completed successfully');
            return true
        } catch (error) {
            await errorHandler.handleError(
                error,
                'Update Scripture Accuracy',
                {
                    customMessage: 'Failed to record target practice results. Please retry mission.',
                    retry: () => get().updateScriptureAccuracy(scriptureId, accuracy)
                }
            )
            return false
        }
    },

    updateScriptureMnemonic: async (scriptureId, mnemonic) => {
        try {
            console.log('🧠 updateScriptureMnemonic called:', { scriptureId })
            const db = await getDb();

            if (!db) {
                throw new Error('Database not initialized');
            }

            // 1. Update in DB
            await db.update(scripturesTable)
                .set({ mnemonic })
                .where(eq(scripturesTable.id, scriptureId));

            // 2. Update State
            const updatedScriptures = get().scriptures.map((scripture) =>
                scripture.id === scriptureId
                    ? { ...scripture, mnemonic }
                    : scripture
            )

            set({ scriptures: updatedScriptures })

            if (get().currentScripture?.id === scriptureId) {
                set({ currentScripture: { ...get().currentScripture!, mnemonic } })
            }

            console.log('🧠 Mnemonic updated in DB and State');
            return true
        } catch (error) {
            await errorHandler.handleError(
                error,
                'Update Mnemonic',
                {
                    customMessage: 'Failed to save battle intelligence. Please retry operation.',
                    retry: () => get().updateScriptureMnemonic(scriptureId, mnemonic)
                }
            )
            return false
        }
    },

    addScriptures: async (newScriptures) => {
        try {
            const db = await getDb();

            if (!db) {
                console.error('Database not initialized');
                return false;
            }

            const existingScriptures = get().scriptures;
            const existingIds = new Set(existingScriptures.map(s => s.id));

            const uniqueNewScriptures = newScriptures.filter(s => !existingIds.has(s.id));

            if (uniqueNewScriptures.length === 0) return true;

            // Insert into DB
            const scripturesToInsert = uniqueNewScriptures.map(s => ({
                id: s.id,
                book: s.book,
                chapter: s.chapter,
                verse: s.verse,
                endVerse: s.endVerse,
                text: s.text,
                reference: s.reference,
                mnemonic: s.mnemonic,
                lastPracticed: s.lastPracticed,
                accuracy: s.accuracy,
                practiceCount: s.practiceCount,
                isJesusWords: s.isJesusWords
            }));
            await db.insert(scripturesTable).values(scripturesToInsert).onConflictDoNothing();

            const updatedScriptures = [...existingScriptures, ...uniqueNewScriptures];
            set({ scriptures: updatedScriptures });
            return true;
        } catch (error) {
            await errorHandler.handleError(error, 'Add Scriptures', {
                customMessage: 'Failed to requisition new ammunition.'
            });
            return false;
        }
    },
})
