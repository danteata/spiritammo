import { useState, useCallback, useMemo } from 'react'
import { SRSRating, SRSState, accuracyToSRSRating } from '@/types/srs'
import { Scripture } from '@/types/scripture'

export interface SRSReviewSession {
    queue: Scripture[]
    currentIndex: number
    results: Array<{ scripture: Scripture; rating: SRSRating; accuracy: number }>
    isComplete: boolean
}

export interface UseSRSReviewReturn {
    session: SRSReviewSession
    currentScripture: Scripture | null
    progress: number
    startSession: (scriptures: Scripture[], srsStates: Record<string, SRSState>) => void
    submitReview: (accuracy: number) => SRSRating
    submitRating: (rating: SRSRating) => void
    skipCurrent: () => void
    resetSession: () => void
}

const EMPTY_SESSION: SRSReviewSession = {
    queue: [],
    currentIndex: 0,
    results: [],
    isComplete: false,
}

export const useSRSReview = (): UseSRSReviewReturn => {
    const [session, setSession] = useState<SRSReviewSession>(EMPTY_SESSION)

    const currentScripture = useMemo(
        () => session.queue[session.currentIndex] || null,
        [session.queue, session.currentIndex],
    )

    const progress = useMemo(
        () => session.queue.length > 0
            ? (session.results.length / session.queue.length) * 100
            : 0,
        [session.queue.length, session.results.length],
    )

    const startSession = useCallback((scriptures: Scripture[], srsStates: Record<string, SRSState>) => {
        const today = new Date().toISOString().split('T')[0]

        const dueNew = scriptures.filter(s => {
            const state = srsStates[s.id]
            if (!state) return s.practiceCount === 0 || !s.practiceCount
            return state.dueDate <= today
        })

        const overdue = dueNew
            .filter(s => {
                const state = srsStates[s.id]
                return state && state.dueDate < today
            })
            .sort((a, b) => {
                const stateA = srsStates[a.id]!
                const stateB = srsStates[b.id]!
                return stateA.lapses - stateB.lapses || stateA.easeFactor - stateB.easeFactor
            })

        const dueToday = dueNew
            .filter(s => {
                const state = srsStates[s.id]
                return state && state.dueDate === today
            })

        const newCards = dueNew.filter(s => !srsStates[s.id]).slice(0, 5)

        const seen = new Set<string>()
        const queue: Scripture[] = []
        for (const s of [...overdue, ...dueToday, ...newCards]) {
            if (!seen.has(s.id)) {
                seen.add(s.id)
                queue.push(s)
            }
        }

        setSession({ queue, currentIndex: 0, results: [], isComplete: false })
    }, [])

    const submitReview = useCallback((accuracy: number): SRSRating => {
        const rating = accuracyToSRSRating(accuracy)

        setSession(prev => {
            if (!prev.queue[prev.currentIndex]) return prev

            const scripture = prev.queue[prev.currentIndex]
            const result = { scripture, rating, accuracy }
            const nextIndex = prev.currentIndex + 1
            const isComplete = nextIndex >= prev.queue.length

            return {
                ...prev,
                results: [...prev.results, result],
                currentIndex: isComplete ? prev.currentIndex : nextIndex,
                isComplete,
            }
        })

        return rating
    }, [])

    const submitRating = useCallback((rating: SRSRating) => {
        setSession(prev => {
            if (!prev.queue[prev.currentIndex]) return prev

            const scripture = prev.queue[prev.currentIndex]
            const accuracy = rating >= 3 ? 100 - (5 - rating) * 15 : rating * 10
            const result = { scripture, rating, accuracy }
            const nextIndex = prev.currentIndex + 1
            const isComplete = nextIndex >= prev.queue.length

            return {
                ...prev,
                results: [...prev.results, result],
                currentIndex: isComplete ? prev.currentIndex : nextIndex,
                isComplete,
            }
        })
    }, [])

    const skipCurrent = useCallback(() => {
        setSession(prev => {
            if (!prev.queue[prev.currentIndex]) return prev
            const scripture = prev.queue[prev.currentIndex]
            const result = { scripture, rating: 0 as SRSRating, accuracy: 0 }
            const nextIndex = prev.currentIndex + 1
            const isComplete = nextIndex >= prev.queue.length

            return {
                ...prev,
                results: [...prev.results, result],
                currentIndex: isComplete ? prev.currentIndex : nextIndex,
                isComplete,
            }
        })
    }, [])

    const resetSession = useCallback(() => {
        setSession(EMPTY_SESSION)
    }, [])

    return {
        session,
        currentScripture,
        progress,
        startSession,
        submitReview,
        submitRating,
        skipCurrent,
        resetSession,
    }
}