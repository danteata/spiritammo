import { useMemo, useState, useEffect } from 'react'
import { Collection, Scripture } from '@/types/scripture'
import { useAppStore } from '@/hooks/useAppStore'

interface UseCollectionPracticeParams {
    collectionId?: string
    initialChapterIds?: string[]
}

export function useCollectionPractice({
    collectionId,
    initialChapterIds = [],
}: UseCollectionPracticeParams) {
    const { scriptures, collections } = useAppStore()

    const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
    const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([])
    const [currentScripture, setCurrentScripture] = useState<Scripture | null>(null)
    const [scriptureIndex, setScriptureIndex] = useState(0)

    const parsedInitialChapterIds = useMemo(() => {
        if (!initialChapterIds.length) return []
        return initialChapterIds.flatMap((id) => id.split(',')).filter(Boolean)
    }, [initialChapterIds.join(',')])

    useEffect(() => {
        if (!collectionId || !collections) return
        const preselected = collections.find(c => c.id === collectionId) || null
        if (preselected) {
            setSelectedCollection(preselected)
        }
    }, [collectionId, collections])

    useEffect(() => {
        if (!selectedCollection) {
            setSelectedChapterIds([])
            return
        }

        if (selectedCollection.isChapterBased && selectedCollection.chapters?.length) {
            if (parsedInitialChapterIds.length > 0) {
                setSelectedChapterIds(parsedInitialChapterIds)
            } else {
                setSelectedChapterIds(selectedCollection.chapters.map((ch) => ch.id))
            }
        } else {
            setSelectedChapterIds([])
        }
    }, [selectedCollection?.id, parsedInitialChapterIds.join(',')])

    const collectionScriptures = useMemo(() => {
        if (!selectedCollection || !scriptures) return []

        const base = scriptures.filter(s =>
            selectedCollection.scriptures.includes(s.id)
        )

        if (
            selectedCollection.isChapterBased &&
            selectedCollection.chapters &&
            selectedChapterIds.length > 0
        ) {
            const selectedIds = new Set(
                selectedCollection.chapters
                    .filter((ch) => selectedChapterIds.includes(ch.id))
                    .flatMap((ch) => ch.scriptures)
            )
            return base.filter(s => selectedIds.has(s.id))
        }

        return base
    }, [selectedCollection, scriptures, selectedChapterIds])

    useEffect(() => {
        if (collectionScriptures.length > 0) {
            setCurrentScripture(collectionScriptures[0])
            setScriptureIndex(0)
        } else {
            setCurrentScripture(null)
            setScriptureIndex(0)
        }
    }, [collectionScriptures, selectedCollection?.id])

    const loadNextScripture = () => {
        if (scriptureIndex < collectionScriptures.length - 1) {
            const nextIndex = scriptureIndex + 1
            setScriptureIndex(nextIndex)
            setCurrentScripture(collectionScriptures[nextIndex])
        }
    }

    const loadPreviousScripture = () => {
        if (scriptureIndex > 0) {
            const prevIndex = scriptureIndex - 1
            setScriptureIndex(prevIndex)
            setCurrentScripture(collectionScriptures[prevIndex])
        }
    }

    return {
        selectedCollection,
        setSelectedCollection,
        selectedChapterIds,
        setSelectedChapterIds,
        currentScripture,
        scriptureIndex,
        setScriptureIndex,
        collectionScriptures,
        loadNextScripture,
        loadPreviousScripture,
    }
}
