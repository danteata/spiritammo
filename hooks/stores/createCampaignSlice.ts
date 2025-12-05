import { StateCreator } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Campaign, CampaignNode, NodeStatus } from '@/types/campaign'
import { INITIAL_CAMPAIGNS } from '@/data/campaigns'

export interface CampaignSlice {
    campaigns: Campaign[]
    activeCampaignId: string | null

    // Actions
    loadCampaigns: () => Promise<void>
    startCampaign: (campaignId: string | null) => void
    unlockNode: (campaignId: string, nodeId: string) => void
    completeNode: (campaignId: string, nodeId: string, accuracy: number) => Promise<boolean> // Returns true if leveled up/unlocked next
    resetCampaignProgress: (campaignId: string) => void
}

export const createCampaignSlice: StateCreator<CampaignSlice> = (set, get) => ({
    campaigns: [],
    activeCampaignId: null,

    loadCampaigns: async () => {
        try {
            const stored = await AsyncStorage.getItem('user_campaigns')
            if (stored) {
                set({ campaigns: JSON.parse(stored) })
            } else {
                set({ campaigns: INITIAL_CAMPAIGNS })
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

        // Check if accuracy meets requirement
        if (accuracy < node.requiredAccuracy) {
            return false // Failed mission
        }

        // Mark current node as CONQUERED
        const updatedNodes = [...campaign.nodes]
        updatedNodes[nodeIndex] = { ...node, status: 'CONQUERED' }

        // Unlock next node if exists
        let unlockedNext = false
        if (nodeIndex + 1 < updatedNodes.length) {
            const nextNode = updatedNodes[nodeIndex + 1]
            // Only unlock if it was previously LOCKED (don't overwrite CONQUERED)
            if (nextNode.status === 'LOCKED') {
                updatedNodes[nodeIndex + 1] = { ...nextNode, status: 'ACTIVE' }
                unlockedNext = true
            }
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
        // Reset to initial state from data/campaigns but keep the structure
        // Actually, safer to find the initial template and restore it
        const template = INITIAL_CAMPAIGNS.find(c => c.id === campaignId)
        if (!template) return

        const updatedCampaigns = campaigns.map(c =>
            c.id === campaignId ? template : c
        )

        set({ campaigns: updatedCampaigns })
        AsyncStorage.setItem('user_campaigns', JSON.stringify(updatedCampaigns))
    }
})
