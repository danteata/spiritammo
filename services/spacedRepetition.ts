import {
    SRSRating,
    SRSState,
    DEFAULT_EASE_FACTOR,
    MINIMUM_EASE_FACTOR,
    INITIAL_INTERVAL,
    SECOND_INTERVAL,
    createDefaultSRSState,
} from '@/types/srs'

const MS_PER_DAY = 86400000

const addDays = (date: Date, days: number): string => {
    const result = new Date(date.getTime() + days * MS_PER_DAY)
    return result.toISOString().split('T')[0]
}

export const calculateNextReview = (state: SRSState, rating: SRSRating, reviewDate?: Date): SRSState => {
    const now = reviewDate || new Date()
    const today = now.toISOString().split('T')[0]

    if (rating < 3) {
        return handleLapse(state, now)
    }

    let { interval, easeFactor, reps } = state

    if (rating === 3) {
        // Good: standard SM-2 progression
        if (reps === 0) {
            interval = INITIAL_INTERVAL
        } else if (reps === 1) {
            interval = SECOND_INTERVAL
        } else {
            interval = Math.round(interval * easeFactor)
        }
    } else if (rating === 4) {
        // Easy: slightly boosted
        if (reps === 0) {
            interval = INITIAL_INTERVAL + 1
        } else if (reps === 1) {
            interval = SECOND_INTERVAL + 2
        } else {
            interval = Math.round(interval * easeFactor * 1.1)
        }
    } else {
        // Perfect (5): significantly boosted
        if (reps === 0) {
            interval = SECOND_INTERVAL
        } else if (reps === 1) {
            interval = SECOND_INTERVAL * 2
        } else {
            interval = Math.round(interval * easeFactor * 1.3)
        }

        // Increase ease factor for perfect recall
        easeFactor = Math.max(MINIMUM_EASE_FACTOR, easeFactor + 0.05)
    }

    // Adjust ease factor based on rating
    if (rating === 3) {
        easeFactor = Math.max(MINIMUM_EASE_FACTOR, easeFactor - 0.02)
    }

    return {
        interval,
        easeFactor,
        dueDate: addDays(now, interval),
        reps: reps + 1,
        lapses: state.lapses,
        lastReviewDate: today,
    }
}

const handleLapse = (state: SRSState, now: Date): SRSState => {
    const today = now.toISOString().split('T')[0]
    let { easeFactor } = state

    if (state.reps === 0) {
        return {
            ...state,
            dueDate: today,
            lastReviewDate: today,
        }
    }

    const rating0Penalty = 0 < 2 ? 0.2 : 0.15
    easeFactor = Math.max(MINIMUM_EASE_FACTOR, easeFactor - rating0Penalty)

    return {
        interval: INITIAL_INTERVAL,
        easeFactor,
        dueDate: addDays(now, INITIAL_INTERVAL),
        reps: 0,
        lapses: state.lapses + 1,
        lastReviewDate: today,
    }
}

export const isDue = (state: SRSState, date?: Date): boolean => {
    const today = (date || new Date()).toISOString().split('T')[0]
    return state.dueDate <= today
}

export const getOverdueDays = (state: SRSState, date?: Date): number => {
    const today = (date || new Date()).toISOString().split('T')[0]
    const due = new Date(state.dueDate)
    const now = new Date(today)
    return Math.max(0, Math.floor((now.getTime() - due.getTime()) / MS_PER_DAY))
}

export const getUrgencyScore = (state: SRSState, date?: Date): number => {
    const overdue = getOverdueDays(state, date)
    const lapseWeight = state.lapses * 2
    const lowEaseWeight = Math.max(0, (DEFAULT_EASE_FACTOR - state.easeFactor) * 10)
    return overdue + lapseWeight + lowEaseWeight
}

export { addDays, createDefaultSRSState }