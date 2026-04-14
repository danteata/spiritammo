import {
    calculateNextReview,
    isDue,
    getOverdueDays,
    getUrgencyScore,
    createDefaultSRSState,
    addDays,
} from '../../services/spacedRepetition'
import { SRSRating, DEFAULT_EASE_FACTOR, MINIMUM_EASE_FACTOR } from '../../types/srs'

describe('Spaced Repetition (SM-2) Algorithm', () => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    describe('createDefaultSRSState', () => {
        it('creates a default state with correct initial values', () => {
            const state = createDefaultSRSState()
            expect(state.interval).toBe(1)
            expect(state.easeFactor).toBe(DEFAULT_EASE_FACTOR)
            expect(state.reps).toBe(0)
            expect(state.lapses).toBe(0)
            expect(state.lastReviewDate).toBeNull()
        })

        it('sets due date to today', () => {
            const state = createDefaultSRSState()
            expect(state.dueDate).toBe(todayStr)
        })
    })

    describe('calculateNextReview - Good rating (3)', () => {
        it('uses initial interval of 1 on first review', () => {
            const state = createDefaultSRSState()
            const result = calculateNextReview(state, 3)
            expect(result.interval).toBe(1)
            expect(result.reps).toBe(1)
            expect(result.lastReviewDate).toBe(todayStr)
        })

        it('uses second interval of 6 on second review', () => {
            const state = { ...createDefaultSRSState(), reps: 1 }
            const result = calculateNextReview(state, 3)
            expect(result.interval).toBe(6)
            expect(result.reps).toBe(2)
        })

        it('multiplies interval by ease factor on subsequent reviews', () => {
            const state = {
                ...createDefaultSRSState(),
                interval: 6,
                easeFactor: 2.5,
                reps: 2,
            }
            const result = calculateNextReview(state, 3)
            expect(result.interval).toBe(15) // 6 * 2.5 = 15
            expect(result.reps).toBe(3)
        })

        it('slightly decreases ease factor for good (3) rating', () => {
            const state = { ...createDefaultSRSState(), easeFactor: 2.5 }
            const result = calculateNextReview({ ...state, reps: 3, interval: 10 }, 3)
            expect(result.easeFactor).toBeLessThan(2.5)
            expect(result.easeFactor).toBe(Math.max(MINIMUM_EASE_FACTOR, 2.5 - 0.02))
        })
    })

    describe('calculateNextReview - Easy rating (4)', () => {
        it('boosts initial interval', () => {
            const state = createDefaultSRSState()
            const result = calculateNextReview(state, 4)
            expect(result.interval).toBe(2) // INITIAL_INTERVAL + 1
            expect(result.reps).toBe(1)
        })

        it('boosts second interval', () => {
            const state = { ...createDefaultSRSState(), reps: 1 }
            const result = calculateNextReview(state, 4)
            expect(result.interval).toBe(8) // SECOND_INTERVAL + 2
        })

        it('boosts subsequent intervals by 1.1x ease', () => {
            const state = { ...createDefaultSRSState(), interval: 10, easeFactor: 2.5, reps: 3 }
            const result = calculateNextReview(state, 4)
            expect(result.interval).toBe(Math.round(10 * 2.5 * 1.1)) // 28
        })
    })

    describe('calculateNextReview - Perfect rating (5)', () => {
        it('jumps to second interval on first review', () => {
            const state = createDefaultSRSState()
            const result = calculateNextReview(state, 5)
            expect(result.interval).toBe(6) // SECOND_INTERVAL
        })

        it('doubles second interval', () => {
            const state = { ...createDefaultSRSState(), reps: 1 }
            const result = calculateNextReview(state, 5)
            expect(result.interval).toBe(12) // SECOND_INTERVAL * 2
        })

        it('significantly boosts subsequent intervals', () => {
            const state = { ...createDefaultSRSState(), interval: 10, easeFactor: 2.5, reps: 3 }
            const result = calculateNextReview(state, 5)
            expect(result.interval).toBe(Math.round(10 * 2.5 * 1.3)) // 33
            expect(result.easeFactor).toBeGreaterThan(2.5) // ease increases on perfect
        })
    })

    describe('calculateNextReview - Lapse (0-2)', () => {
        it('resets interval to 1 on lapse (0)', () => {
            const state = {
                ...createDefaultSRSState(),
                interval: 15,
                easeFactor: 2.5,
                reps: 5,
            }
            const result = calculateNextReview(state, 0)
            expect(result.interval).toBe(1)
            expect(result.reps).toBe(0)
            expect(result.lapses).toBe(1)
        })

        it('resets interval on hard rating (1)', () => {
            const state = {
                ...createDefaultSRSState(),
                interval: 15,
                easeFactor: 2.5,
                reps: 5,
            }
            const result = calculateNextReview(state, 1)
            expect(result.interval).toBe(1)
            expect(result.reps).toBe(0)
        })

        it('resets on difficult rating (2)', () => {
            const state = {
                ...createDefaultSRSState(),
                interval: 15,
                easeFactor: 2.5,
                reps: 5,
            }
            const result = calculateNextReview(state, 2)
            expect(result.interval).toBe(1)
            expect(result.reps).toBe(0)
        })

        it('reduces ease factor on lapse', () => {
            const state = {
                ...createDefaultSRSState(),
                interval: 10,
                easeFactor: 2.5,
                reps: 3,
            }
            const result = calculateNextReview(state, 0)
            expect(result.easeFactor).toBeLessThan(2.5)
            expect(result.easeFactor).toBe(Math.max(MINIMUM_EASE_FACTOR, 2.5 - 0.2))
        })

        it('does not reduce ease below minimum', () => {
            const state = {
                ...createDefaultSRSState(),
                interval: 10,
                easeFactor: MINIMUM_EASE_FACTOR + 0.01,
                reps: 3,
            }
            const result = calculateNextReview(state, 0)
            expect(result.easeFactor).toBe(MINIMUM_EASE_FACTOR)
        })

        it('keeps state unchanged for first review on lapse', () => {
            const state = createDefaultSRSState()
            const result = calculateNextReview(state, 0)
            expect(result.interval).toBe(1)
            expect(result.reps).toBe(0)
            expect(result.lastReviewDate).toBe(todayStr)
        })
    })

    describe('isDue', () => {
        it('returns true when due date is today', () => {
            const state = { ...createDefaultSRSState(), dueDate: todayStr }
            expect(isDue(state)).toBe(true)
        })

        it('returns true when due date is in the past', () => {
            const yesterday = addDays(new Date(), -1)
            const state = { ...createDefaultSRSState(), dueDate: yesterday }
            expect(isDue(state)).toBe(true)
        })

        it('returns false when due date is in the future', () => {
            const tomorrow = addDays(new Date(), 1)
            const state = { ...createDefaultSRSState(), dueDate: tomorrow }
            expect(isDue(state)).toBe(false)
        })
    })

    describe('getOverdueDays', () => {
        it('returns 0 when due today', () => {
            const state = { ...createDefaultSRSState(), dueDate: todayStr }
            expect(getOverdueDays(state)).toBe(0)
        })

        it('returns correct overdue count', () => {
            const threeDaysAgo = addDays(new Date(), -3)
            const state = { ...createDefaultSRSState(), dueDate: threeDaysAgo }
            expect(getOverdueDays(state)).toBe(3)
        })

        it('returns 0 when due in the future', () => {
            const tomorrow = addDays(new Date(), 1)
            const state = { ...createDefaultSRSState(), dueDate: tomorrow }
            expect(getOverdueDays(state)).toBe(0)
        })
    })

    describe('getUrgencyScore', () => {
        it('gives higher urgency to more overdue items', () => {
            const state1 = { ...createDefaultSRSState(), dueDate: addDays(new Date(), -2) }
            const state2 = { ...createDefaultSRSState(), dueDate: addDays(new Date(), -5) }
            expect(getUrgencyScore(state2)).toBeGreaterThan(getUrgencyScore(state1))
        })

        it('gives higher urgency to items with more lapses', () => {
            const state1 = { ...createDefaultSRSState(), dueDate: todayStr, lapses: 0 }
            const state2 = { ...createDefaultSRSState(), dueDate: todayStr, lapses: 3 }
            expect(getUrgencyScore(state2)).toBeGreaterThan(getUrgencyScore(state1))
        })

        it('gives higher urgency to items with lower ease', () => {
            const state1 = { ...createDefaultSRSState(), dueDate: todayStr, easeFactor: 2.5 }
            const state2 = { ...createDefaultSRSState(), dueDate: todayStr, easeFactor: 1.5 }
            expect(getUrgencyScore(state2)).toBeGreaterThan(getUrgencyScore(state1))
        })
    })

    describe('Progression over multiple reviews', () => {
        it('follows expected SM-2 interval progression', () => {
            let state = createDefaultSRSState()

            state = calculateNextReview(state, 3)
            expect(state.interval).toBe(1)
            expect(state.reps).toBe(1)

            state = calculateNextReview(state, 3)
            expect(state.interval).toBe(6)
            expect(state.reps).toBe(2)

            state = calculateNextReview(state, 3)
            expect(state.interval).toBe(Math.round(6 * state.easeFactor))
            expect(state.reps).toBe(3)
        })

        it('recovers from a lapse pattern', () => {
            let state = createDefaultSRSState()

            // Build up to a decent interval
            state = calculateNextReview(state, 4) // Easy
            state = calculateNextReview(state, 4) // Easy
            state = calculateNextReview(state, 3) // Good

            // Lapse
            state = calculateNextReview(state, 0)
            expect(state.interval).toBe(1)
            expect(state.reps).toBe(0)
            expect(state.lapses).toBe(1)

            // Recover
            state = calculateNextReview(state, 3)
            expect(state.interval).toBe(1)
            expect(state.reps).toBe(1)

            state = calculateNextReview(state, 4)
            expect(state.interval).toBe(3) // reps=1 + 1 = 2
            expect(state.reps).toBe(2)
        })
    })
})