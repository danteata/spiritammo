import { useMemo } from 'react'
import { Scripture, Collection } from '@/types/scripture'

export function useScriptureScope(
    allScriptures: Scripture[],
    collection: Collection | null,
    chapterIds: string[],
    fallbackToAll: boolean = true
): Scripture[] {
    return useMemo(() => {
        if (!collection) return allScriptures

        const mapped = collection.scriptures
            .map(id => allScriptures.find(s => s.id === id))
            .filter((s): s is Scripture => s !== undefined)

        if (
            collection.isChapterBased &&
            collection.chapters &&
            chapterIds.length > 0
        ) {
            const selectedIds = new Set(
                collection.chapters
                    .filter(ch => chapterIds.includes(ch.id))
                    .flatMap(ch => ch.scriptures)
            )
            const filtered = mapped.filter(s => selectedIds.has(s.id))
            if (filtered.length > 0) return filtered
        }

        return mapped.length > 0 ? mapped : (fallbackToAll ? allScriptures : mapped)
    }, [allScriptures, collection, chapterIds, fallbackToAll])
}