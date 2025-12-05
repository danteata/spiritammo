import React, { useState, useEffect } from 'react'
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome5 } from '@expo/vector-icons'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'
import ScreenHeader from '@/components/ScreenHeader'
import CampaignMap from '@/components/CampaignMap'
import TargetPractice from '@/components/TargetPractice'
import StealthDrill from '@/components/StealthDrill'
import { TACTICAL_THEME, MILITARY_TYPOGRAPHY } from '@/constants/colors'
import { Campaign, CampaignNode } from '@/types/campaign'
import { Scripture } from '@/types/scripture'
import useZustandStore from '@/hooks/zustandStore' // Import direct store for actionscripture'
import { router } from 'expo-router'

export default function CampaignScreen() {
    const {
        campaigns,
        activeCampaignId,
        startCampaign,
        completeNode,
        scriptures,
        updateScriptureAccuracy,
        isDark
    } = useAppStore()

    const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null)
    const [selectedNode, setSelectedNode] = useState<CampaignNode | null>(null)
    const [targetScripture, setTargetScripture] = useState<Scripture | null>(null)
    const [practiceMode, setPracticeMode] = useState<'VOICE' | 'STEALTH' | null>(null)

    // Constants
    const [isLoadingScripture, setIsLoadingScripture] = useState(false)

    useEffect(() => {
        if (activeCampaignId) {
            const campaign = campaigns.find(c => c.id === activeCampaignId)
            setActiveCampaign(campaign || null)
        }
    }, [activeCampaignId, campaigns])

    const handleStartCampaign = (campaignId: string) => {
        startCampaign(campaignId)
    }

    const handleNodeSelect = async (node: CampaignNode) => {
        // 1. Try to provision (find or fetch) the scripture
        setIsLoadingScripture(true)
        const scripture = await useZustandStore.getState().provisionCampaignScripture(node)
        setIsLoadingScripture(false)

        if (scripture) {
            setTargetScripture(scripture)
            setSelectedNode(node)

            // Ask for mode
            Alert.alert(
                'MISSION BRIEFING',
                `Target: ${node.title}\nPass Requirement: ${node.requiredAccuracy}% Accuracy`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Stealth Op (Silent)', onPress: () => setPracticeMode('STEALTH') },
                    { text: 'Live Fire (Voice)', onPress: () => setPracticeMode('VOICE') }
                ]
            )
        } else {
            Alert.alert('Intel Missing', 'Could not retrieve data for this mission. Please check connection and try again.')
        }
    }

    const handleMissionComplete = async (accuracy: number) => {
        if (!selectedNode || !activeCampaign) return

        // Close modals
        setPracticeMode(null)

        // Check pass/fail logic locally for immediate feedback
        if (accuracy >= selectedNode.requiredAccuracy) {
            // Update Store
            const success = await completeNode(activeCampaign.id, selectedNode.id, accuracy)

            if (success) {
                Alert.alert(
                    'MISSION ACCOMPLISHED',
                    `Sector Secured! Accuracy: ${accuracy.toFixed(1)}%`,
                    [{ text: 'Hooah!' }]
                )
            } else {
                Alert.alert(
                    'MISSION DEBRIEF',
                    `Accuracy: ${accuracy.toFixed(1)}%. You've already conquered this or requirement met, but level up logic failed.`,
                    [{ text: 'Dismiss' }]
                )
            }
        } else {
            Alert.alert(
                'MISSION FAILED',
                `Accuracy: ${accuracy.toFixed(1)}%. Required: ${selectedNode.requiredAccuracy}%. Return to base and practice.`,
                [{ text: 'Retry', style: 'cancel' }]
            )
        }

        // Reset selection
        setSelectedNode(null)
        setTargetScripture(null)
    }

    return (
        <ThemedContainer style={styles.container}>
            <ScreenHeader
                title="CONQUEST"
                subtitle="CAMPAIGN MODE"
            />

            <View style={styles.content}>
                {!activeCampaign ? (
                    <ScrollView contentContainerStyle={styles.campaignList}>
                        <ThemedText variant="subheading" style={{ marginBottom: 16 }}>AVAILABLE OPERATIONS</ThemedText>
                        {campaigns.map(campaign => (
                            <TouchableOpacity
                                key={campaign.id}
                                style={styles.campaignCardWrapper}
                                onPress={() => handleStartCampaign(campaign.id)}
                            >
                                <ThemedCard variant="default" style={styles.campaignCard}>
                                    <View style={styles.campaignIcon}>
                                        <FontAwesome5 name="globe-americas" size={32} color={TACTICAL_THEME.accent} />
                                    </View>
                                    <View style={styles.campaignInfo}>
                                        <ThemedText variant="heading" style={{ fontSize: 18 }}>{campaign.title}</ThemedText>
                                        <ThemedText variant="body" style={{ fontSize: 12, opacity: 0.7 }}>{campaign.description}</ThemedText>
                                        <View style={styles.campaignStats}>
                                            <ThemedText variant="caption" style={{ color: TACTICAL_THEME.success }}>
                                                {campaign.completedNodes} / {campaign.totalNodes} SECURED
                                            </ThemedText>
                                        </View>
                                    </View>
                                    <FontAwesome5 name="chevron-right" size={16} color={TACTICAL_THEME.textSecondary} />
                                </ThemedCard>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                ) : (
                    <View style={styles.activeCampaignContainer}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => startCampaign(null)} // Reset active (hacky way, should explicitly support clear)
                        >
                            <FontAwesome5 name="arrow-left" size={16} color={TACTICAL_THEME.text} />
                            <ThemedText variant="button" style={{ marginLeft: 8 }}>ALL OPERATIONS</ThemedText>
                        </TouchableOpacity>

                        <CampaignMap
                            campaign={activeCampaign}
                            onNodeSelect={handleNodeSelect}
                        />

                        {/* Loading Overlay */}
                        {isLoadingScripture && (
                            <View style={styles.loadingOverlay}>
                                <ActivityIndicator size="large" color={TACTICAL_THEME.accent} />
                                <ThemedText style={{ marginTop: 10 }}>DECRYPTING INTEL...</ThemedText>
                            </View>
                        )}
                    </View>
                )}
            </View>

            {/* Mission Modals */}
            {targetScripture && (
                <>
                    <TargetPractice
                        isVisible={practiceMode === 'VOICE'}
                        targetVerse={targetScripture.text}
                        onRecordingComplete={(_, acc) => handleMissionComplete(acc)}
                        onClose={() => setPracticeMode(null)}
                    />
                    <StealthDrill
                        isVisible={practiceMode === 'STEALTH'}
                        targetVerse={targetScripture.text}
                        reference={targetScripture.reference}
                        onComplete={handleMissionComplete}
                        onClose={() => setPracticeMode(null)}
                    />
                </>
            )}

        </ThemedContainer>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    campaignList: {
        paddingBottom: 40,
    },
    campaignCardWrapper: {
        marginBottom: 16,
    },
    campaignCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    campaignIcon: {
        width: 50,
        alignItems: 'center',
    },
    campaignInfo: {
        flex: 1,
        paddingHorizontal: 12,
    },
    campaignStats: {
        marginTop: 8,
        flexDirection: 'row',
    },
    activeCampaignContainer: {
        flex: 1,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20
    }
})
