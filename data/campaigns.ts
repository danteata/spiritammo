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
            status: 'ACTIVE',
            requiredAccuracy: 90,
            xpReward: 100,
            coordinate: { x: 50, y: 80 }
        },
        {
            id: 'node_2',
            title: 'THE WAGE',
            description: 'The cost of sin is death.',
            scriptureReference: { book: 'Romans', chapter: 6, verse: 23 },
            status: 'LOCKED',
            requiredAccuracy: 90,
            xpReward: 150,
            coordinate: { x: 80, y: 65 }
        },
        {
            id: 'node_3',
            title: 'THE PROOF',
            description: 'God demonstrates His love.',
            scriptureReference: { book: 'Romans', chapter: 5, verse: 8 },
            status: 'LOCKED',
            requiredAccuracy: 90,
            xpReward: 200,
            coordinate: { x: 20, y: 50 }
        },
        {
            id: 'node_4',
            title: 'THE CONFESSION',
            description: 'Confess and believe.',
            scriptureReference: { book: 'Romans', chapter: 10, verse: 9 },
            status: 'LOCKED',
            requiredAccuracy: 95,
            xpReward: 250,
            coordinate: { x: 60, y: 35 }
        },
        {
            id: 'node_5',
            title: 'THE ASSURANCE',
            description: 'No condemnation.',
            scriptureReference: { book: 'Romans', chapter: 8, verse: 1 },
            status: 'LOCKED',
            requiredAccuracy: 98,
            xpReward: 500,
            coordinate: { x: 50, y: 15 }
        }
    ]
}

export const FAITH_CAMPAIGN: Campaign = {
    id: 'campaign_faith',
    title: 'OPERATION: SHIELD',
    description: 'Fortify your defense with the Shield of Faith. Trust in His promises.',
    difficulty: 'SOLDIER',
    theme: 'desert',
    totalNodes: 5,
    completedNodes: 0,
    nodes: [
        {
            id: 'node_f1',
            title: 'SUBSTANCE',
            description: 'Faith is the assurance of things hoped for.',
            scriptureReference: { book: 'Hebrews', chapter: 11, verse: 1 },
            status: 'ACTIVE',
            requiredAccuracy: 90,
            xpReward: 150,
            coordinate: { x: 50, y: 85 }
        },
        {
            id: 'node_f2',
            title: 'TRUST',
            description: 'Trust in the Lord with all your heart.',
            scriptureReference: { book: 'Proverbs', chapter: 3, verse: 5 },
            status: 'LOCKED',
            requiredAccuracy: 92,
            xpReward: 200,
            coordinate: { x: 25, y: 65 }
        },
        {
            id: 'node_f3',
            title: 'WALK',
            description: 'We walk by faith, not by sight.',
            scriptureReference: { book: '2 Corinthians', chapter: 5, verse: 7 },
            status: 'LOCKED',
            requiredAccuracy: 92,
            xpReward: 200,
            coordinate: { x: 75, y: 65 }
        },
        {
            id: 'node_f4',
            title: 'CRUCIFIED',
            description: 'I live by faith in the Son of God.',
            scriptureReference: { book: 'Galatians', chapter: 2, verse: 20 },
            status: 'LOCKED',
            requiredAccuracy: 95,
            xpReward: 300,
            coordinate: { x: 50, y: 40 }
        },
        {
            id: 'node_f5',
            title: 'MOUNTAIN MOVER',
            description: 'Have faith in God.',
            scriptureReference: { book: 'Mark', chapter: 11, verse: 22 },
            status: 'LOCKED',
            requiredAccuracy: 98,
            xpReward: 600,
            coordinate: { x: 50, y: 15 }
        }
    ]
}

export const WARFARE_CAMPAIGN: Campaign = {
    id: 'campaign_warfare',
    title: 'OPERATION: SWORD',
    description: 'Offensive maneuvers. Wield the Sword of the Spirit against the enemy.',
    difficulty: 'SNIPER',
    theme: 'urban',
    totalNodes: 5,
    completedNodes: 0,
    nodes: [
        {
            id: 'node_w1',
            title: 'THE ARMOR',
            description: 'Put on the whole armor of God.',
            scriptureReference: { book: 'Ephesians', chapter: 6, verse: 11 },
            status: 'ACTIVE',
            requiredAccuracy: 92,
            xpReward: 200,
            coordinate: { x: 50, y: 80 }
        },
        {
            id: 'node_w2',
            title: 'RESIST',
            description: 'Submit to God, resist the devil.',
            scriptureReference: { book: 'James', chapter: 4, verse: 7 },
            status: 'LOCKED',
            requiredAccuracy: 94,
            xpReward: 250,
            coordinate: { x: 80, y: 60 }
        },
        {
            id: 'node_w3',
            title: 'NO WEAPON',
            description: 'No weapon formed against you shall prosper.',
            scriptureReference: { book: 'Isaiah', chapter: 54, verse: 17 },
            status: 'LOCKED',
            requiredAccuracy: 95,
            xpReward: 300,
            coordinate: { x: 20, y: 60 }
        },
        {
            id: 'node_w4',
            title: 'VIGILANCE',
            description: 'Be sober, be vigilant.',
            scriptureReference: { book: '1 Peter', chapter: 5, verse: 8 },
            status: 'LOCKED',
            requiredAccuracy: 96,
            xpReward: 400,
            coordinate: { x: 50, y: 40 }
        },
        {
            id: 'node_w5',
            title: 'AUTHORITY',
            description: 'Power to tread on serpents.',
            scriptureReference: { book: 'Luke', chapter: 10, verse: 19 },
            status: 'LOCKED',
            requiredAccuracy: 100,
            xpReward: 800,
            coordinate: { x: 50, y: 15 }
        }
    ]
}

export const LOVE_CAMPAIGN: Campaign = {
    id: 'campaign_love',
    title: 'OPERATION: HEARTBEAT',
    description: 'Love covers all. Master the ultimate weapon - selfless love.',
    difficulty: 'VETERAN',
    theme: 'arctic',
    totalNodes: 6,
    completedNodes: 0,
    nodes: [
        {
            id: 'node_l1',
            title: 'GREATEST',
            description: 'Love is the greatest commandment.',
            scriptureReference: { book: 'Matthew', chapter: 22, verse: 37 },
            status: 'ACTIVE',
            requiredAccuracy: 88,
            xpReward: 150,
            coordinate: { x: 50, y: 85 }
        },
        {
            id: 'node_l2',
            title: 'SACRIFICE',
            description: 'Greater love has no one than this.',
            scriptureReference: { book: 'John', chapter: 15, verse: 13 },
            status: 'LOCKED',
            requiredAccuracy: 90,
            xpReward: 200,
            coordinate: { x: 75, y: 70 }
        },
        {
            id: 'node_l3',
            title: 'GOD IS LOVE',
            description: 'God is love.',
            scriptureReference: { book: '1 John', chapter: 4, verse: 8 },
            status: 'LOCKED',
            requiredAccuracy: 92,
            xpReward: 250,
            coordinate: { x: 25, y: 55 }
        },
        {
            id: 'node_l4',
            title: 'NEIGHBOR',
            description: 'Love your neighbor as yourself.',
            scriptureReference: { book: 'Mark', chapter: 12, verse: 31 },
            status: 'LOCKED',
            requiredAccuracy: 95,
            xpReward: 350,
            coordinate: { x: 80, y: 40 }
        },
        {
            id: 'node_l5',
            title: 'NEW COMMAND',
            description: 'Love one another as I have loved you.',
            scriptureReference: { book: 'John', chapter: 13, verse: 34 },
            status: 'LOCKED',
            requiredAccuracy: 97,
            xpReward: 450,
            coordinate: { x: 35, y: 25 }
        },
        {
            id: 'node_l6',
            title: 'FIRSTFRUITS',
            description: 'Love is the first fruit of the Spirit.',
            scriptureReference: { book: 'Galatians', chapter: 5, verse: 22 },
            status: 'LOCKED',
            requiredAccuracy: 98,
            xpReward: 700,
            coordinate: { x: 60, y: 10 }
        }
    ]
}

export const HOPE_CAMPAIGN: Campaign = {
    id: 'campaign_hope',
    title: 'OPERATION: ANCHOR',
    description: 'Hope anchors the soul. Stand firm in eternal promises.',
    difficulty: 'RECRUIT',
    theme: 'desert',
    totalNodes: 5,
    completedNodes: 0,
    nodes: [
        {
            id: 'node_h1',
            title: 'ANCHOR',
            description: 'Hope is the anchor for our soul.',
            scriptureReference: { book: 'Hebrews', chapter: 6, verse: 19 },
            status: 'ACTIVE',
            requiredAccuracy: 85,
            xpReward: 125,
            coordinate: { x: 50, y: 80 }
        },
        {
            id: 'node_h2',
            title: 'TRIUMPHANT',
            description: 'Hope does not disappoint us.',
            scriptureReference: { book: 'Romans', chapter: 5, verse: 5 },
            status: 'LOCKED',
            requiredAccuracy: 87,
            xpReward: 150,
            coordinate: { x: 20, y: 60 }
        },
        {
            id: 'node_h3',
            title: 'LIVING',
            description: 'Christ in you, the hope of glory.',
            scriptureReference: { book: 'Colossians', chapter: 1, verse: 27 },
            status: 'LOCKED',
            requiredAccuracy: 90,
            xpReward: 200,
            coordinate: { x: 80, y: 60 }
        },
        {
            id: 'node_h4',
            title: 'GLORIOUS',
            description: 'Hope of the glorious appearing.',
            scriptureReference: { book: 'Titus', chapter: 2, verse: 13 },
            status: 'LOCKED',
            requiredAccuracy: 95,
            xpReward: 300,
            coordinate: { x: 40, y: 35 }
        },
        {
            id: 'node_h5',
            title: 'ETERNAL',
            description: 'Rejoicing in hope of the glory of God.',
            scriptureReference: { book: 'Romans', chapter: 5, verse: 2 },
            status: 'LOCKED',
            requiredAccuracy: 97,
            xpReward: 500,
            coordinate: { x: 50, y: 15 }
        }
    ]
}

export const INITIAL_CAMPAIGNS = [
    BASIC_TRAINING_CAMPAIGN,
    FAITH_CAMPAIGN,
    WARFARE_CAMPAIGN,
    LOVE_CAMPAIGN,
    HOPE_CAMPAIGN
]
