import { StateCreator } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Campaign, CampaignNode, NodeStatus } from '@/types/campaign'
import { INITIAL_CAMPAIGNS } from '@/data/campaigns'
import { bibleApiService } from '@/services/bibleApi'
import { generateAutoCampaign, generateThematicCampaign, escalateCampaign, findAvailableThemes } from '@/services/campaignEngine'
import { Scripture } from '@/types/scripture'

export interface CampaignSlice {
    campaigns: Campaign[]
    activeCampaignId: string | null

    // Actions
    loadCampaigns: () => Promise<void>
    startCampaign: (campaignId: string | null) => void
    unlockNode: (campaignId: string, nodeId: string) => void
    completeNode: (campaignId: string, nodeId: string, accuracy: number) => Promise<boolean>
    resetCampaignProgress: (campaignId: string) => void
    deleteCampaign: (campaignId: string) => void
    clearActiveCampaign: () => void
    provisionCampaignScripture: (node: any) => Promise<any | null>
    // Auto-campaign & escalation
    generateAutoCampaign: () => Campaign | null
    generateThematicCampaign: (theme: string) => Campaign | null
    findAvailableThemes: () => string[]
    escalateCampaign: (campaignId: string, level?: number) => Campaign | null
}

export const createCampaignSlice: StateCreator<CampaignSlice & { scriptures: any[]; addScriptures: any }, [], [], CampaignSlice> = (set, get) => ({
    campaigns: [],
    activeCampaignId: null,

    loadCampaigns: async () => {
        try {
            const stored = await AsyncStorage.getItem('user_campaigns')
            let currentCampaigns: Campaign[] = stored ? JSON.parse(stored) : []

            // Smart Merge: Add new campaigns from INITIAL_CAMPAIGNS if they don't exist
            let hasChanges = false
            INITIAL_CAMPAIGNS.forEach(initCamp => {
                const exists = currentCampaigns.find(c => c.id === initCamp.id)
                if (!exists) {
                    currentCampaigns.push(initCamp)
                    hasChanges = true
                }
            })

            // If we started with nothing, OR if we added new stuff, save it back
            if (!stored || hasChanges) {
                // Preserve order based on INITIAL_CAMPAIGNS for consistency
                // (Optional sort, but keeps generic "Foundation" first)
                const sortedCampaigns = INITIAL_CAMPAIGNS.map(init =>
                    currentCampaigns.find(c => c.id === init.id) || init
                )

                // If there were any extra stored campaigns (deprecated ones?), keep them at the end
                // or just stick to the strict list if we want to force conformity. 
                // Let's stick to the mapped list to ensure clean ordering.

                currentCampaigns = sortedCampaigns

                set({ campaigns: currentCampaigns })
                await AsyncStorage.setItem('user_campaigns', JSON.stringify(currentCampaigns))
            } else {
                set({ campaigns: currentCampaigns })
            }
        } catch (error) {
            console.error('Failed to load campaigns:', error)
            set({ campaigns: INITIAL_CAMPAIGNS })
        }
    },

    startCampaign: (campaignId: string | null) => {
        set({ activeCampaignId: campaignId })
    },

    unlockNode: (campaignId: string, nodeId: string) => {
        const { campaigns } = get()
        const updatedCampaigns = campaigns.map(c => {
            if (c.id !== campaignId) return c
            return {
                ...c,
                nodes: c.nodes.map(n =>
                    n.id === nodeId ? { ...n, status: 'ACTIVE' as NodeStatus } : n
                )
            }
        })

        set({ campaigns: updatedCampaigns })
        AsyncStorage.setItem('user_campaigns', JSON.stringify(updatedCampaigns))
    },

    completeNode: async (campaignId: string, nodeId: string, accuracy: number) => {
        const { campaigns } = get()
        const campaignIndex = campaigns.findIndex(c => c.id === campaignId)
        if (campaignIndex === -1) return false

        const campaign = campaigns[campaignIndex]
        const nodeIndex = campaign.nodes.findIndex(n => n.id === nodeId)
        if (nodeIndex === -1) return false

        const node = campaign.nodes[nodeIndex]

        console.log('completeNode called with:', { campaignId, nodeId, accuracy, required: node.requiredAccuracy });

        // Check if accuracy meets requirement
        if (accuracy < node.requiredAccuracy) {
            return false // Failed mission
        }

        // Mark current node as CONQUERED
        const updatedNodes = [...campaign.nodes]
        updatedNodes[nodeIndex] = { ...node, status: 'CONQUERED' }

        // Unlock next node if exists - check and unlock sequentially
        let hasUnlockedNext = false
        for (let i = nodeIndex + 1; i < updatedNodes.length; i++) {
            const currentNode = updatedNodes[i]

            if (currentNode.status === 'LOCKED') {
                // Unlock this node
                updatedNodes[i] = { ...currentNode, status: 'ACTIVE' }
                hasUnlockedNext = true
                break // Only unlock the immediate next LOCKED node
            } else if (currentNode.status === 'CONQUERED') {
                // Continue to find the next locked node
                continue
            } else if (currentNode.status === 'ACTIVE') {
                // Already active, no need to unlock more
                break
            }
        }

        if (!hasUnlockedNext) {
            // All remaining nodes are already unlocked or conquered
        }

        // Calculate progress
        const completedCount = updatedNodes.filter(n => n.status === 'CONQUERED').length

        const updatedCampaign: Campaign = {
            ...campaign,
            nodes: updatedNodes,
            completedNodes: completedCount
        }

        const newCampaigns = [...campaigns]
        newCampaigns[campaignIndex] = updatedCampaign

        set({ campaigns: newCampaigns })
        await AsyncStorage.setItem('user_campaigns', JSON.stringify(newCampaigns))

        return true // Success
    },

    resetCampaignProgress: (campaignId: string) => {
        const { campaigns } = get()
        const template = INITIAL_CAMPAIGNS.find(c => c.id === campaignId)
        if (!template) return

        const updatedCampaigns = campaigns.map(c =>
            c.id === campaignId ? template : c
        )

        set({ campaigns: updatedCampaigns })
        AsyncStorage.setItem('user_campaigns', JSON.stringify(updatedCampaigns))
    },

    deleteCampaign: (campaignId: string) => {
        const { campaigns, activeCampaignId } = get()
        const updatedCampaigns = campaigns.filter(c => c.id !== campaignId)
        const updatedActiveId = activeCampaignId === campaignId ? null : activeCampaignId

        set({ campaigns: updatedCampaigns, activeCampaignId: updatedActiveId })
        AsyncStorage.setItem('user_campaigns', JSON.stringify(updatedCampaigns))
    },

    clearActiveCampaign: () => {
        set({ activeCampaignId: null })
    },

    provisionCampaignScripture: async (node: any) => {
        try {
            if (node.status === 'LOCKED') {
                return null
            }

            const { book, chapter, verse } = node.scriptureReference

            // Try local cache first
            const scriptures = (get() as any).scriptures || []
            let scripture = scriptures.find((s: any) =>
                s.book.toLowerCase() === book.toLowerCase() &&
                s.chapter === chapter &&
                s.verse === verse
            )

            if (scripture) return scripture

            // Try offline bible
            try {
                const chapterData = await bibleApiService.getChapter(book, chapter)
                if (chapterData && chapterData.verses) {
                    const targetVerse = chapterData.verses.find((v: any) => v.verse === verse)
                    if (targetVerse) {
                        scripture = bibleApiService.bibleVerseToScripture(targetVerse)
                        // Cache in store
                        if (scripture && (get() as any).addScriptures) {
                            await (get() as any).addScriptures([scripture])
                        }
                        return scripture
                    }
                }
            } catch (bibleError) {
                console.warn(`Offline bible lookup failed for ${book} ${chapter}:${verse}`)
            }

            return null
        } catch (error) {
            console.error('Failed to provision campaign scripture:', error)
            return null
        }
    },

    generateAutoCampaign: () => {
        const scriptures: Scripture[] = (get() as any).scriptures || []
        const existingAuto = get().campaigns.filter(c => c.id.startsWith('auto_campaign_'))
        if (existingAuto.length >= 3) return null

        const campaign = generateAutoCampaign(scriptures)
        if (!campaign) return null

        const updated = [...get().campaigns, campaign]
        set({ campaigns: updated })
        AsyncStorage.setItem('user_campaigns', JSON.stringify(updated))
        return campaign
    },

    generateThematicCampaign: (theme: string) => {
        const scriptures: Scripture[] = (get() as any).scriptures || []
        const existingThemes = get().campaigns.filter(c => c.id.startsWith('theme_campaign_'))
        if (existingThemes.some(c => c.id.includes(`_${theme}_`))) return null

        const campaign = generateThematicCampaign(scriptures, theme)
        if (!campaign) return null

        const updated = [...get().campaigns, campaign]
        set({ campaigns: updated })
        AsyncStorage.setItem('user_campaigns', JSON.stringify(updated))
        return campaign
    },

    findAvailableThemes: () => {
        const scriptures: Scripture[] = (get() as any).scriptures || []
        return findAvailableThemes(scriptures)
    },

    escalateCampaign: (campaignId: string, level: number = 1) => {
        const { campaigns } = get()
        const campaign = campaigns.find(c => c.id === campaignId)
        if (!campaign) return null

        const escalated = escalateCampaign(campaign, level)
        const finalCampaigns = [...campaigns, escalated]
        set({ campaigns: finalCampaigns })
        AsyncStorage.setItem('user_campaigns', JSON.stringify(finalCampaigns))
        return escalated
    },
})
