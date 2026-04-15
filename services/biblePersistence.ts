import { getDb } from '@/db/client';
import { bibleHighlights, bibleNotes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export interface BibleHighlight {
  id: string;
  verseId: string;
  color: string;
  createdAt: string;
}

export interface BibleNote {
  id: string;
  verseId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export const biblePersistence = {
  // Highlights
  async getHighlightsForChapter(book: string, chapter: number): Promise<BibleHighlight[]> {
    const db = await getDb();
    const prefix = `${book.toLowerCase()}-${chapter}-`;
    // We can use a like query or filter in JS if the DB is small. 
    // Drizzle doesn't have a great "starts with" for all sqlite versions without raw.
    // Let's just fetch all and filter for now, or use a better schema later.
    const all = await db.select().from(bibleHighlights).execute();
    return all.filter(h => h.verseId.startsWith(prefix));
  },

  async saveHighlight(verseId: string, color: string): Promise<BibleHighlight> {
    const db = await getDb();
    const id = `hl_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const highlight: BibleHighlight = {
      id,
      verseId,
      color,
      createdAt: new Date().toISOString(),
    };
    
    // Remove existing highlight for this verse first (one highlight per verse)
    await db.delete(bibleHighlights).where(eq(bibleHighlights.verseId, verseId)).execute();
    
    await db.insert(bibleHighlights).values(highlight).execute();
    return highlight;
  },

  async removeHighlight(verseId: string): Promise<void> {
    const db = await getDb();
    await db.delete(bibleHighlights).where(eq(bibleHighlights.verseId, verseId)).execute();
  },

  // Notes
  async getNotesForChapter(book: string, chapter: number): Promise<BibleNote[]> {
    const db = await getDb();
    const prefix = `${book.toLowerCase()}-${chapter}-`;
    const all = await db.select().from(bibleNotes).execute();
    return all.filter(n => n.verseId.startsWith(prefix));
  },

  async saveNote(verseId: string, content: string): Promise<BibleNote> {
    const db = await getDb();
    const existing = await db.select().from(bibleNotes).where(eq(bibleNotes.verseId, verseId)).execute();
    
    const now = new Date().toISOString();
    if (existing.length > 0) {
      const updated = {
        ...existing[0],
        content,
        updatedAt: now,
      };
      await db.update(bibleNotes).set({ content, updatedAt: now }).where(eq(bibleNotes.verseId, verseId)).execute();
      return updated;
    } else {
      const id = `note_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const note: BibleNote = {
        id,
        verseId,
        content,
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(bibleNotes).values(note).execute();
      return note;
    }
  },

  async deleteNote(verseId: string): Promise<void> {
    const db = await getDb();
    await db.delete(bibleNotes).where(eq(bibleNotes.verseId, verseId)).execute();
  }
};
