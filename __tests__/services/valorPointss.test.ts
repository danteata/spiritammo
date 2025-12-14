import ValorPointsService from '@/services/valorPoints'

describe('ValorPointsService - Equal Verse Treatment', () => {

    // Mock the useAppStore
    const mockAddVPEarned = jest.fn()
    jest.mock('@/hooks/useAppStore', () => ({
        useAppStore: {
            getState: () => ({
                addVPEarned: mockAddVPEarned
            })
        }
    }))

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('Book Completion VP', () => {
        it('should award equal VP for all books', async () => {
            // Test different books - should all get same VP
            const genesisVP = await ValorPointsService.awardBookCompletionVP('Genesis')
            const psalmsVP = await ValorPointsService.awardBookCompletionVP('Psalms')
            const ruthVP = await ValorPointsService.awardBookCompletionVP('Ruth')
            const revelationVP = await ValorPointsService.awardBookCompletionVP('Revelation')

            expect(genesisVP).toBe(300)
            expect(psalmsVP).toBe(300)
            expect(ruthVP).toBe(300)
            expect(revelationVP).toBe(300)

            // All should be equal
            expect(genesisVP).toEqual(psalmsVP)
            expect(psalmsVP).toEqual(ruthVP)
            expect(ruthVP).toEqual(revelationVP)
        })
    })

    describe('Chapter Completion VP', () => {
        it('should award equal VP for all chapters regardless of size', async () => {
            // Test different chapter sizes - should all get same VP
            const smallChapterVP = await ValorPointsService.awardChapterCompletionVP(5) // Small chapter
            const largeChapterVP = await ValorPointsService.awardChapterCompletionVP(50) // Large chapter

            expect(smallChapterVP).toBe(100)
            expect(largeChapterVP).toBe(100)

            // Should be equal
            expect(smallChapterVP).toEqual(largeChapterVP)
        })
    })

    describe('Collection Assault VP', () => {
        it('should award VP based on accuracy only, not collection size', async () => {
            // Test same accuracy with different collection sizes
            const smallCollectionVP = await ValorPointsService.awardCollectionAssaultVP(3, 95, 60, 0, 'recruit')
            const largeCollectionVP = await ValorPointsService.awardCollectionAssaultVP(20, 95, 1200, 0, 'recruit')

            // Both should get same base VP for 95% accuracy
            // The only difference might be time bonus, but base accuracy VP should be same
            const baseVP = ValorPointsService.calculateVPReward(95, 0, 'recruit')

            expect(smallCollectionVP).toBeGreaterThanOrEqual(baseVP)
            expect(largeCollectionVP).toBeGreaterThanOrEqual(baseVP)
        })
    })

    describe('Accuracy-Based VP', () => {
        it('should award higher VP for higher accuracy', () => {
            const accuracy95VP = ValorPointsService.calculateVPReward(95, 0, 'recruit')
            const accuracy90VP = ValorPointsService.calculateVPReward(90, 0, 'recruit')
            const accuracy85VP = ValorPointsService.calculateVPReward(85, 0, 'recruit')
            const accuracy80VP = ValorPointsService.calculateVPReward(80, 0, 'recruit')

            // Higher accuracy should give higher VP
            expect(accuracy95VP).toBeGreaterThan(accuracy90VP)
            expect(accuracy90VP).toBeGreaterThan(accuracy85VP)
            expect(accuracy85VP).toBeGreaterThan(accuracy80VP)
        })
    })
})