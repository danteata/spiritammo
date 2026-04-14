export type SRSRating = 0 | 1 | 2 | 3 | 4 | 5

export interface SRSState {
    interval: number
    easeFactor: number
    dueDate: string
    reps: number
    lapses: number
    lastReviewDate: string | null
}

export const DEFAULT_EASE_FACTOR = 2.5
export const MINIMUM_EASE_FACTOR = 1.3
export const INITIAL_INTERVAL = 1
export const SECOND_INTERVAL = 6

export const createDefaultSRSState = (now?: Date): SRSState => {
    const date = now || new Date()
    return {
        interval: INITIAL_INTERVAL,
        easeFactor: DEFAULT_EASE_FACTOR,
        dueDate: date.toISOString().split('T')[0],
        reps: 0,
        lapses: 0,
        lastReviewDate: null,
    }
}

export const SRS_RATING_LABELS: Record<SRSRating, string> = {
    0: 'Again',
    1: 'Hard',
    2: 'Difficult',
    3: 'Good',
    4: 'Easy',
    5: 'Perfect',
}

export const SRS_RATING_DESCRIPTIONS: Record<SRSRating, string> = {
    0: 'Complete blackout — relearn from scratch',
    1: 'Incorrect — significant effort needed',
    2: 'Barely correct — hesitated significantly',
    3: 'Correct with some effort',
    4: 'Correct with little effort',
    5: 'Perfect recall — no hesitation',
}

export interface SRSDailySummary {
    dueCount: number
    overdueCount: number
    newCount: number
    reviewedTodayCount: number
    totalScriptures: number
}

export const emptyDailySummary: SRSDailySummary = {
    dueCount: 0,
    overdueCount: 0,
    newCount: 0,
    reviewedTodayCount: 0,
    totalScriptures: 0,
}

export const accuracyToSRSRating = (accuracy: number): SRSRating => {
    if (accuracy < 20) return 0
    if (accuracy < 40) return 1
    if (accuracy < 60) return 2
    if (accuracy < 80) return 3
    if (accuracy < 95) return 4
    return 5
}