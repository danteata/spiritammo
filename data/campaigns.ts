import { Campaign } from '@/types/campaign'

export const BASIC_TRAINING_CAMPAIGN: Campaign = {
    id: 'campaign_basic_training',
    title: 'OPERATION: FOUNDATION',
    description: 'The essential doctrines of the faith. Master these to build your spiritual base.',
    difficulty: 'RECRUIT',
    theme: 'jungle',
    totalNodes: 5,
    completedNodes: 0,
    nodes: [
        {
            id: 'node_1',
            title: 'THE STANDARD',
            description: 'Understanding God\'s perfection.',
            scriptureReference: { book: 'Romans', chapter: 3, verse: 23 },
            status: 'ACTIVE', // First node is always active
            requiredAccuracy: 90,
            xpReward: 100,
            coordinate: { x: 50, y: 80 } // Center bottom
        },
        {
            id: 'node_2',
            title: 'THE WAGE',
            description: 'The cost of sin is death.',
            scriptureReference: { book: 'Romans', chapter: 6, verse: 23 },
            status: 'LOCKED',
            requiredAccuracy: 90,
            xpReward: 150,
            coordinate: { x: 80, y: 65 } // Right
        },
        {
            id: 'node_3',
            title: 'THE PROOF',
            description: 'God demonstrates His love.',
            scriptureReference: { book: 'Romans', chapter: 5, verse: 8 },
            status: 'LOCKED',
            requiredAccuracy: 90,
            xpReward: 200,
            coordinate: { x: 20, y: 50 } // Left
        },
        {
            id: 'node_4',
            title: 'THE CONFESSION',
            description: 'Confess and believe.',
            scriptureReference: { book: 'Romans', chapter: 10, verse: 9 },
            status: 'LOCKED',
            requiredAccuracy: 95,
            xpReward: 250,
            coordinate: { x: 60, y: 35 } // Rightish
        },
        {
            id: 'node_5',
            title: 'THE ASSURANCE',
            description: 'No condemnation.',
            scriptureReference: { book: 'Romans', chapter: 8, verse: 1 },
            status: 'LOCKED',
            requiredAccuracy: 98,
            xpReward: 500,
            coordinate: { x: 50, y: 15 } // Top center (Final Boss)
        }
    ]
}

export const INITIAL_CAMPAIGNS = [BASIC_TRAINING_CAMPAIGN]
