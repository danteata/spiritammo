import { StateCreator } from 'zustand'
import { eq, and, inArray } from 'drizzle-orm'
import { getDb } from '@/db/client'
import {
    collections as collectionsTable,
    collectionScriptures as collectionScripturesTable
} from '@/db/schema'
import { Collection, Scripture } from '@/types/scripture'
import { errorHandler } from '@/services/errorHandler'
import { COLLECTIONS } from '@/mocks/collections'
import { ScriptureSlice } from './createScriptureSlice'

export interface CollectionSlice {
    collections: Collection[]
    getScripturesByCollection: (collectionId: string) => Scripture[]
    addCollection: (collection: Collection) => Promise<boolean>
    addScripturesToCollection: (collectionId: string, scriptureIds: string[]) => Promise<boolean>
    removeScriptureFromCollection: (collectionId: string, scriptureId: string) => Promise<boolean>
    bulkRemoveScripturesFromCollection: (collectionId: string, scriptureIds: string[]) => Promise<boolean>
    deleteCollection: (collectionId: string) => Promise<boolean>
    updateCollection: (updatedCollection: Collection) => Promise<boolean>
}

export const createCollectionSlice: StateCreator<CollectionSlice & ScriptureSlice, [], [], CollectionSlice> = (set, get) => ({
    collections: [], // Initialized empty, loaded later

    getScripturesByCollection: (collectionId) => {
        const collection = get().collections.find((c) => c.id === collectionId)
        if (!collection) return []

        // Filter from the main scriptures list based on IDs in the collection
        return get().scriptures.filter((s) => collection.scriptures.includes(s.id))
    },

    addCollection: async (collection) => {
        try {
            const db = await getDb();

            if (!db) {
                throw new Error('Database not initialized');
            }

            // Insert into DB
            const { scriptures: _scriptures, ...collectionData } = collection;
            await db.insert(collectionsTable).values({
                id: collectionData.id,
                name: collectionData.name,
                abbreviation: collectionData.abbreviation,
                description: collectionData.description,
                createdAt: collectionData.createdAt,
                tags: collectionData.tags,
                isChapterBased: collectionData.isChapterBased,
                sourceBook: collectionData.sourceBook,
                bookInfo: collectionData.bookInfo,
                chapters: collectionData.chapters
            });

            // Insert relationships
            if (collection.scriptures.length > 0) {
                await db.insert(collectionScripturesTable).values(
                    collection.scriptures.map(sid => ({ collectionId: collection.id, scriptureId: sid }))
                );
            }

            const updatedCollections = [...get().collections, collection]
            set({ collections: updatedCollections })
            return true
        } catch (error) {
            await errorHandler.handleError(
                error,
                'Add Collection',
                {
                    customMessage: 'Failed to establish new arsenal. Please retry deployment.',
                    retry: () => get().addCollection(collection)
                }
            )
            return false
        }
    },

    addScripturesToCollection: async (collectionId, scriptureIds) => {
        try {
            const db = await getDb();

            if (!db) {
                console.error('Database not initialized');
                return false;
            }

            const existingRels = await db.select()
                .from(collectionScripturesTable)
                .where(eq(collectionScripturesTable.collectionId, collectionId));

            const existingScriptureIds = new Set(existingRels.map(r => r.scriptureId));
            const newIds = scriptureIds.filter(id => !existingScriptureIds.has(id));

            if (newIds.length > 0) {
                await db.insert(collectionScripturesTable).values(
                    newIds.map(sid => ({ collectionId, scriptureId: sid }))
                ).onConflictDoNothing();
            }

            // Update State
            const updatedCollections = get().collections.map((collection) => {
                if (collection.id === collectionId) {
                    const currentIds = new Set(collection.scriptures);
                    const uniqueNewIds = scriptureIds.filter(id => !currentIds.has(id));
                    return { ...collection, scriptures: [...collection.scriptures, ...uniqueNewIds] };
                }
                return collection;
            });

            set({ collections: updatedCollections });
            return true;
        } catch (error) {
            await errorHandler.handleError(error, 'Add Scriptures to Collection', {
                customMessage: 'Failed to add rounds to arsenal.'
            });
            return false;
        }
    },

    removeScriptureFromCollection: async (collectionId, scriptureId) => {
        try {
            if (!collectionId || !scriptureId) {
                throw new Error('Invalid parameters: collectionId and scriptureId are required');
            }

            const db = await getDb();

            if (!db) {
                throw new Error('Database not initialized');
            }

            await db.delete(collectionScripturesTable)
                .where(
                    and(
                        eq(collectionScripturesTable.collectionId, collectionId),
                        eq(collectionScripturesTable.scriptureId, scriptureId)
                    )
                );

            // Update State
            const updatedCollections = get().collections.map((collection) => {
                if (collection.id === collectionId) {
                    return {
                        ...collection,
                        scriptures: collection.scriptures.filter(id => id !== scriptureId)
                    };
                }
                return collection;
            });

            set({ collections: updatedCollections });
            return true;
        } catch (error) {
            await errorHandler.handleError(
                error,
                'Remove Scripture',
                {
                    customMessage: 'Failed to remove round from arsenal. Please retry operation.',
                    retry: () => get().removeScriptureFromCollection(collectionId, scriptureId)
                }
            )
            return false;
        }
    },

    bulkRemoveScripturesFromCollection: async (collectionId, scriptureIds) => {
        try {
            if (!collectionId || !scriptureIds || scriptureIds.length === 0) {
                console.error('Invalid params for bulkRemoveScripturesFromCollection:', { collectionId, scriptureIds });
                return false;
            }

            const db = await getDb();

            if (!db) {
                console.error('Database not initialized');
                return false;
            }

            await db.delete(collectionScripturesTable)
                .where(
                    and(
                        eq(collectionScripturesTable.collectionId, collectionId),
                        inArray(collectionScripturesTable.scriptureId, scriptureIds)
                    )
                );

            // Update State
            const idsToRemove = new Set(scriptureIds);
            const updatedCollections = get().collections.map((collection) => {
                if (collection.id === collectionId) {
                    return {
                        ...collection,
                        scriptures: collection.scriptures.filter(id => !idsToRemove.has(id))
                    };
                }
                return collection;
            });

            set({ collections: updatedCollections });
            return true;
        } catch (error) {
            await errorHandler.handleError(error, 'Bulk Remove Scriptures', {
                customMessage: 'Failed to remove rounds from arsenal.'
            });
            return false;
        }
    },

    deleteCollection: async (collectionId) => {
        try {
            const db = await getDb();

            if (!db) {
                throw new Error('Database not initialized');
            }

            // Delete collection (CASCADE handles relationships)
            await db.delete(collectionsTable).where(eq(collectionsTable.id, collectionId));

            const updatedCollections = get().collections.filter((c) => c.id !== collectionId)
            set({ collections: updatedCollections })
            return true
        } catch (error) {
            await errorHandler.handleError(
                error,
                'Delete Collection',
                {
                    customMessage: 'Failed to dismantle arsenal. Please retry operation.',
                    retry: () => get().deleteCollection(collectionId)
                }
            )
            return false
        }
    },

    updateCollection: async (updatedCollection) => {
        try {
            const db = await getDb();

            if (!db) {
                throw new Error('Database not initialized');
            }

            const { scriptures: _scriptures, ...collectionData } = updatedCollection;

            await db.update(collectionsTable)
                .set({
                    name: collectionData.name,
                    abbreviation: collectionData.abbreviation,
                    description: collectionData.description,
                    tags: collectionData.tags,
                    // other fields usually don't change on simple update
                })
                .where(eq(collectionsTable.id, updatedCollection.id));

            const updatedCollections = get().collections.map((c) =>
                c.id === updatedCollection.id ? updatedCollection : c
            )
            set({ collections: updatedCollections })
            return true
        } catch (error) {
            await errorHandler.handleError(
                error,
                'Update Collection',
                {
                    customMessage: 'Failed to update arsenal information. Please retry operation.',
                    retry: () => get().updateCollection(updatedCollection)
                }
            )
            return false
        }
    },
})
