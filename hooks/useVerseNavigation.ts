import { useState, useEffect, useCallback, useRef } from 'react'
import { Animated } from 'react-native'
import { Scripture } from '@/types/scripture'

export type VerseOrder = 'random' | 'sequential'

interface VerseNavigationOptions {
    scriptures: Scripture[]
    initialOrder?: VerseOrder
    fadeAnim?: Animated.Value
}

interface ProgressInfo {
    current: number
    total: number
}

export function useVerseNavigation({
    scriptures,
    initialOrder = 'random',
    fadeAnim,
}: VerseNavigationOptions) {
    const [verseOrder, setVerseOrder] = useState<VerseOrder>(initialOrder)
    const [seqIndex, setSeqIndex] = useState(0)
    const [currentScripture, setCurrentScripture] = useState<Scripture | null>(null)
    const [randomVisited, setRandomVisited] = useState<Set<string>>(new Set())
    const [isLoading, setIsLoading] = useState(true)
    const scriptureRef = useRef<Scripture | null>(null)
    scriptureRef.current = currentScripture

    const animateTransition = useCallback(() => {
        if (!fadeAnim) return
        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start()
    }, [fadeAnim])

    // Pick initial scripture when scriptures or order changes
    useEffect(() => {
        if (!scriptures || scriptures.length === 0) return

        if (verseOrder === 'sequential') {
            const idx = Math.min(seqIndex, scriptures.length - 1)
            setSeqIndex(idx)
            setCurrentScripture(scriptures[idx])
        } else {
            const idx = Math.floor(Math.random() * scriptures.length)
            setCurrentScripture(scriptures[idx])
        }
        setIsLoading(false)
    }, [scriptures, verseOrder])

    // Reset when scriptures shrink below current index
    useEffect(() => {
        if (verseOrder === 'sequential' && seqIndex >= scriptures.length && scriptures.length > 0) {
            setSeqIndex(scriptures.length - 1)
            setCurrentScripture(scriptures[scriptures.length - 1])
        }
    }, [scriptures.length, seqIndex, verseOrder])

    const loadNextScripture = useCallback(() => {
        if (!scriptures || scriptures.length === 0) return

        if (verseOrder === 'sequential') {
            const nextIdx = Math.min(seqIndex + 1, scriptures.length - 1)
            if (nextIdx !== seqIndex) {
                animateTransition()
                setSeqIndex(nextIdx)
                setCurrentScripture(scriptures[nextIdx])
            }
        } else {
            // Random: pick from not-yet-visited, reset if all visited
            const unvisited = scriptures.filter(s => !randomVisited.has(s.id))
            const pool = unvisited.length > 0 ? unvisited : scriptures
            if (unvisited.length === 0) setRandomVisited(new Set())

            let nextIdx = Math.floor(Math.random() * pool.length)
            // Avoid repeating current
            if (pool.length > 1 && currentScripture) {
                const tries = 10
                for (let i = 0; i < tries; i++) {
                    if (pool[nextIdx]?.id !== currentScripture.id) break
                    nextIdx = Math.floor(Math.random() * pool.length)
                }
            }

            animateTransition()
            if (currentScripture) {
                setRandomVisited(prev => new Set(prev).add(currentScripture!.id))
            }
            setCurrentScripture(pool[nextIdx])
        }
    }, [scriptures, verseOrder, seqIndex, randomVisited, currentScripture, animateTransition])

    const loadPreviousScripture = useCallback(() => {
        if (verseOrder === 'sequential') {
            const prevIdx = Math.max(seqIndex - 1, 0)
            if (prevIdx !== seqIndex) {
                animateTransition()
                setSeqIndex(prevIdx)
                setCurrentScripture(scriptures[prevIdx])
            }
        }
        // Random mode: no "previous" in standard implementation
        // Consumers can maintain their own history if needed
    }, [verseOrder, seqIndex, scriptures, animateTransition])

    const progress: ProgressInfo | null = verseOrder === 'sequential' && scriptures.length > 0
        ? { current: seqIndex + 1, total: scriptures.length }
        : null

    const reset = useCallback(() => {
        setSeqIndex(0)
        setRandomVisited(new Set())
        if (scriptures.length > 0) {
            setCurrentScripture(scriptures[0])
        }
    }, [scriptures])

    return {
        currentScripture,
        setCurrentScripture,
        scriptureRef,
        verseOrder,
        setVerseOrder,
        seqIndex,
        setSeqIndex,
        isLoading,
        setIsLoading,
        progress,
        loadNextScripture,
        loadPreviousScripture,
        reset,
        randomVisited,
        setRandomVisited,
    }
}