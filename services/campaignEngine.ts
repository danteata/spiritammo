import { Campaign, CampaignNode, NodeStatus } from '@/types/campaign'
import { Scripture } from '@/types/scripture'

const MILITARY_VIRTUES = [
    'Faith', 'Shield', 'Sword', 'Fortress', 'Vanguard', 'Sentinel',
    'Haven', 'Beacon', 'Stronghold', 'Outpost', 'Watchtower', 'Citadel',
    'Arsenal', 'Bastion', 'Refuge', 'Phalanx', 'Legion', 'Cavalry',
    'Valor', 'Honor', 'Courage', 'Endurance', 'Discipline', 'Loyalty',
]

const BIBLE_THEMES: Record<string, string[]> = {
    faith: ['believe', 'faith', 'trust', 'hope', 'confident', 'assurance'],
    grace: ['grace', 'mercy', 'forgive', 'forgiveness', 'love', 'kindness', 'favor'],
    warfare: ['fight', 'battle', 'armor', 'weapon', 'enemy', 'stand', 'shield', 'sword'],
    prayer: ['pray', 'prayer', 'petition', 'intercede', 'supplication', 'ask'],
    wisdom: ['wisdom', 'wise', 'understand', 'knowledge', 'discern', 'insight'],
    peace: ['peace', 'calm', 'rest', 'quiet', 'still', 'tranquil'],
    provision: ['provide', 'provision', 'supply', 'needs', 'plan', 'purpose'],
    strength: ['strength', 'strong', 'power', 'mighty', 'courage', 'bold'],
}

const generateNodeCoordinates = (count: number): Array<{ x: number; y: number }> => {
    const coords: Array<{ x: number; y: number }> = []
    if (count === 0) return coords
    if (count === 1) return [{ x: 50, y: 45 }]

    for (let i = 0; i < count; i++) {
        const t = i / (count - 1)
        const zigzag = i % 2 === 0 ? -1 : 1
        const x = 50 + zigzag * 20
        const y = Math.round(80 - t * 55)
        coords.push({
            x: Math.min(80, Math.max(20, x)),
            y: Math.min(80, Math.max(15, y)),
        })
    }
    return coords
}

export interface CampaignEngineConfig {
    maxNodesPerCampaign: number
    minAccuracyThreshold: number
    escalationAccuracyStep: number
}

const DEFAULT_CONFIG: CampaignEngineConfig = {
    maxNodesPerCampaign: 7,
    minAccuracyThreshold: 60,
    escalationAccuracyStep: 10,
}

export const generateAutoCampaign = (
    scriptures: Scripture[],
    config: CampaignEngineConfig = DEFAULT_CONFIG,
): Campaign | null => {
    const weakScriptures = scriptures
        .filter(s => (s.accuracy ?? 0) < 70 && s.practiceCount && s.practiceCount > 0)
        .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))

    if (weakScriptures.length === 0) return null

    const targetScriptures = weakScriptures.slice(0, config.maxNodesPerCampaign)
    const virtue = MILITARY_VIRTUES[Math.floor(Math.random() * MILITARY_VIRTUES.length)]

    const coordinates = generateNodeCoordinates(targetScriptures.length)

    const nodes: CampaignNode[] = targetScriptures.map((s, i) => ({
        id: `auto_${virtue.toLowerCase()}_${i}`,
        title: `${s.reference}`,
        description: `Conquer ${s.reference} — accuracy currently at ${Math.round(s.accuracy ?? 0)}%`,
        scriptureReference: {
            book: s.book,
            chapter: s.chapter,
            verse: s.verse,
            endVerse: s.endVerse,
        },
        status: i === 0 ? ('ACTIVE' as NodeStatus) : ('LOCKED' as NodeStatus),
        requiredAccuracy: Math.min(
            95,
            (s.accuracy ?? 50) + 20,
        ),
        xpReward: 50 + i * 10,
        coordinate: coordinates[i],
    }))

    return {
        id: `auto_campaign_${virtue.toLowerCase()}_${Date.now()}`,
        title: `Operation: ${virtue}`,
        description: `Auto-generated campaign targeting your weakest verses. ${weakScriptures.length} verses need reinforcement.`,
        nodes,
        totalNodes: nodes.length,
        completedNodes: 0,
        difficulty: 'RECRUIT',
        theme: 'jungle',
    }
}

export const generateThematicCampaign = (
    scriptures: Scripture[],
    themeName: string,
    config: CampaignEngineConfig = DEFAULT_CONFIG,
): Campaign | null => {
    const themeKeywords = BIBLE_THEMES[themeName]
    if (!themeKeywords) return null

    const matchingScriptures = scriptures.filter(s =>
        themeKeywords.some(kw => s.text.toLowerCase().includes(kw)),
    )

    if (matchingScriptures.length < 2) return null

    const targetScriptures = matchingScriptures.slice(0, config.maxNodesPerCampaign)
    const capitalized = themeName.charAt(0).toUpperCase() + themeName.slice(1)

    const coordinates = generateNodeCoordinates(targetScriptures.length)

    const nodes: CampaignNode[] = targetScriptures.map((s, i) => ({
        id: `theme_${themeName}_${i}`,
        title: `${s.reference}`,
        description: `Reinforce the ${themeName} theme through ${s.reference}`,
        scriptureReference: {
            book: s.book,
            chapter: s.chapter,
            verse: s.verse,
            endVerse: s.endVerse,
        },
        status: i === 0 ? ('ACTIVE' as NodeStatus) : ('LOCKED' as NodeStatus),
        requiredAccuracy: 70 + i * 5,
        xpReward: 60 + i * 10,
        coordinate: coordinates[i],
    }))

    return {
        id: `theme_campaign_${themeName}_${Date.now()}`,
        title: `Operation: ${capitalized} ${MILITARY_VIRTUES[Math.floor(Math.random() * 3)]}`,
        description: `Thematic operation connecting ${matchingScriptures.length} verses about ${themeName}.`,
        nodes,
        totalNodes: nodes.length,
        completedNodes: 0,
        difficulty: 'SOLDIER',
        theme: 'urban',
    }
}

export const escalateCampaign = (
    campaign: Campaign,
    level: number = 1,
    config: CampaignEngineConfig = DEFAULT_CONFIG,
): Campaign => {
    const difficultyOrder: Campaign['difficulty'][] = [
        'RECRUIT', 'SOLDIER', 'VETERAN', 'SNIPER', 'ELITE',
    ]
    const currentIdx = difficultyOrder.indexOf(campaign.difficulty)
    const newDifficulty = difficultyOrder[Math.min(difficultyOrder.length - 1, currentIdx + level)]

    const escalatedNodes = campaign.nodes.map(node => ({
        ...node,
        status: node.status === 'CONQUERED' ? ('ACTIVE' as NodeStatus) : node.status,
        requiredAccuracy: Math.min(98, node.requiredAccuracy + level * config.escalationAccuracyStep),
        xpReward: node.xpReward + level * 25,
    }))

    return {
        ...campaign,
        id: `${campaign.id}_escalation_${level}`,
        title: `${campaign.title} — Escalation ${level}`,
        description: `${campaign.description} [ESCALATED: Higher accuracy thresholds, greater rewards]`,
        nodes: escalatedNodes,
        difficulty: newDifficulty,
        completedNodes: 0,
    }
}

export const findAvailableThemes = (scriptures: Scripture[]): string[] => {
    return Object.entries(BIBLE_THEMES)
        .filter(([, keywords]) =>
            keywords.some(kw =>
                scriptures.some(s => s.text.toLowerCase().includes(kw)),
            ),
        )
        .map(([theme]) => theme)
}

export const identifyWeakClusters = (
    scriptures: Scripture[],
    clusterSize: number = 3,
): Scripture[][] => {
    const practiced = scriptures
        .filter(s => s.practiceCount && s.practiceCount > 0)
        .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))

    const clusters: Scripture[][] = []

    for (let i = 0; i <= practiced.length - clusterSize; i += clusterSize) {
        const cluster = practiced.slice(i, i + clusterSize)
        const avgAccuracy = cluster.reduce((sum, s) => sum + (s.accuracy ?? 0), 0) / cluster.length
        if (avgAccuracy < 75) {
            clusters.push(cluster)
        }
    }

    return clusters
}