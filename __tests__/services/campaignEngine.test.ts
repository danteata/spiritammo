import { generateAutoCampaign, generateThematicCampaign, escalateCampaign, findAvailableThemes } from '../../services/campaignEngine'
import { Scripture } from '../../types/scripture'

const createMockScripture = (overrides: Partial<Scripture> = {}): Scripture => ({
    id: `test_${Math.random().toString(36).substr(2, 9)}`,
    book: 'John',
    chapter: 3,
    verse: 16,
    text: 'For God so loved the world that he gave his only begotten Son',
    reference: 'John 3:16',
    accuracy: 50,
    practiceCount: 5,
    ...overrides,
})

describe('Campaign Engine', () => {
    const mockScriptures: Scripture[] = [
        createMockScripture({ id: 's1', reference: 'John 3:16', text: 'For God so loved the world that he gave his only begotten Son', accuracy: 45, practiceCount: 10, book: 'John', chapter: 3, verse: 16 }),
        createMockScripture({ id: 's2', reference: 'Romans 8:28', text: 'And we know that for those who love God all things work together for good', accuracy: 60, practiceCount: 8, book: 'Romans', chapter: 8, verse: 28 }),
        createMockScripture({ id: 's3', reference: 'Philippians 4:13', text: 'I can do all things through Christ who strengthens me', accuracy: 75, practiceCount: 5, book: 'Philippians', chapter: 4, verse: 13 }),
        createMockScripture({ id: 's4', reference: 'Psalm 23:1', text: 'The Lord is my shepherd I shall not want', accuracy: 30, practiceCount: 3, book: 'Psalms', chapter: 23, verse: 1 }),
        createMockScripture({ id: 's5', reference: 'Proverbs 3:5', text: 'Trust in the Lord with all your heart and lean not on your own understanding', accuracy: 55, practiceCount: 7, book: 'Proverbs', chapter: 3, verse: 5 }),
        createMockScripture({ id: 's6', reference: 'Ephesians 6:11', text: 'Put on the whole armor of God that you may be able to stand against the schemes of the devil', accuracy: 40, practiceCount: 4, book: 'Ephesians', chapter: 6, verse: 11 }),
        createMockScripture({ id: 's7', reference: 'Hebrews 11:1', text: 'Now faith is the assurance of things hoped for the conviction of things not seen', accuracy: 85, practiceCount: 12, book: 'Hebrews', chapter: 11, verse: 1 }),
    ]

    describe('generateAutoCampaign', () => {
        it('generates a campaign from weak scriptures', () => {
            const campaign = generateAutoCampaign(mockScriptures)
            expect(campaign).not.toBeNull()
            expect(campaign!.nodes.length).toBeGreaterThan(0)
            expect(campaign!.nodes.length).toBeLessThanOrEqual(7)
            expect(campaign!.title).toContain('Operation:')
            expect(campaign!.nodes[0].status).toBe('ACTIVE')
        })

        it('sorts weak scriptures by accuracy (lowest first)', () => {
            const campaign = generateAutoCampaign(mockScriptures)
            expect(campaign).not.toBeNull()
            if (campaign!.nodes.length >= 2) {
                const firstNodeAccuracy = mockScriptures.find(
                    s => s.reference === campaign!.nodes[0].title
                )?.accuracy ?? 100
                const secondNodeAccuracy = mockScriptures.find(
                    s => s.reference === campaign!.nodes[1].title
                )?.accuracy ?? 100
                expect(firstNodeAccuracy).toBeLessThanOrEqual(secondNodeAccuracy)
            }
        })

        it('returns null when all scriptures are strong', () => {
            const strongScriptures = mockScriptures.map(s => ({ ...s, accuracy: 95, practiceCount: 20 }))
            const campaign = generateAutoCampaign(strongScriptures)
            expect(campaign).toBeNull()
        })

        it('generates unique IDs', () => {
            const campaign1 = generateAutoCampaign(mockScriptures)
            const campaign2 = generateAutoCampaign(mockScriptures)
            expect(campaign1!.id).not.toBe(campaign2!.id)
        })

        it('sets required accuracy dynamically based on current accuracy', () => {
            const campaign = generateAutoCampaign(mockScriptures)
            expect(campaign).not.toBeNull()
            campaign!.nodes.forEach(node => {
                expect(node.requiredAccuracy).toBeGreaterThanOrEqual(50)
                expect(node.requiredAccuracy).toBeLessThanOrEqual(95)
            })
        })
    })

    describe('generateThematicCampaign', () => {
        it('generates a faith-themed campaign', () => {
            const campaign = generateThematicCampaign(mockScriptures, 'faith')
            expect(campaign).not.toBeNull()
            expect(campaign!.title).toContain('faith')
            expect(campaign!.nodes.length).toBeGreaterThanOrEqual(2)
        })

        it('returns null for unknown themes', () => {
            const campaign = generateThematicCampaign(mockScriptures, 'unknown_theme')
            expect(campaign).toBeNull()
        })

        it('returns null when no scriptures match', () => {
            const noMatchScriptures = [createMockScripture({ text: 'Random text without theme keywords', practiceCount: 0 })]
            const campaign = generateThematicCampaign(noMatchScriptures, 'faith')
            expect(campaign).toBeNull()
        })
    })

    describe('escalateCampaign', () => {
        it('increases difficulty by one level', () => {
            const baseCampaign = generateAutoCampaign(mockScriptures)!
            const escalated = escalateCampaign(baseCampaign, 1)
            expect(escalated.difficulty).not.toBe(baseCampaign.difficulty)
            expect(escalated.id).toContain('escalation')
        })

        it('increases required accuracy for each node', () => {
            const baseCampaign = generateAutoCampaign(mockScriptures)!
            if (baseCampaign.nodes.length === 0) return
            const escalated = escalateCampaign(baseCampaign, 1)
            baseCampaign.nodes.forEach((node, i) => {
                expect(escalated.nodes[i].requiredAccuracy).toBeGreaterThan(node.requiredAccuracy)
            })
        })

        it('caps at ELITE difficulty', () => {
            const baseCampaign = generateAutoCampaign(mockScriptures)!
            const maxEscalated = escalateCampaign(baseCampaign, 10)
            expect(maxEscalated.difficulty).toBe('ELITE')
        })

        it('resets completed nodes to ACTIVE', () => {
            const baseCampaign = generateAutoCampaign(mockScriptures)!
            const completedCampaign = {
                ...baseCampaign,
                nodes: baseCampaign.nodes.map(n => ({ ...n, status: 'CONQUERED' as const })),
            }
            const escalated = escalateCampaign(completedCampaign, 1)
            escalated.nodes.forEach(node => {
                expect(node.status).toBe('ACTIVE')
            })
        })
    })

    describe('findAvailableThemes', () => {
        it('finds themes matching scripture content', () => {
            const themes = findAvailableThemes(mockScriptures)
            expect(themes).toContain('faith')
            expect(themes).toContain('warfare')
            expect(themes).toContain('strength')
        })

        it('returns empty array for scriptures with no matching themes', () => {
            const noThemes = [createMockScripture({ text: 'Random text without keywords' })]
            const themes = findAvailableThemes(noThemes)
            expect(themes.length).toBeLessThan(noThemes.length)
        })
    })
})