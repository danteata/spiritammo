import { useState, useEffect } from 'react'
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native'
import { FontAwesome5 } from '@expo/vector-icons'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'
import ScreenHeader from '@/components/ScreenHeader'
import CampaignMap from '@/components/CampaignMap'
import CampaignCard from '@/components/CampaignCard'
import TargetPractice from '@/components/TargetPractice'
import MissionBriefingModal from '@/components/MissionBriefingModal'
import StealthDrill from '@/components/StealthDrill'
import { Campaign, CampaignNode } from '@/types/campaign'
import { Scripture } from '@/types/scripture'
import useZustandStore from '@/hooks/zustandStore'

export default function CampaignScreen() {
    const {
        campaigns,
        activeCampaignId,
        startCampaign,
        completeNode,
        scriptures,
        updateScriptureAccuracy,
        isDark,
        theme
    } = useAppStore()

    const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null)
    const [selectedNode, setSelectedNode] = useState<CampaignNode | null>(null)
    const [targetScripture, setTargetScripture] = useState<Scripture | null>(null)
    const [practiceMode, setPracticeMode] = useState<'VOICE' | 'STEALTH' | null>(null)
    const [showBriefing, setShowBriefing] = useState(false)

    // Constants
    const [isLoadingScripture, setIsLoadingScripture] = useState(false)

    useEffect(() => {
        if (activeCampaignId) {
            const campaign = campaigns.find(c => c.id === activeCampaignId)
            setActiveCampaign(campaign || null)
        } else {
            setActiveCampaign(null)
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
            setShowBriefing(true) // Show custom briefing instead of Alert
        } else {
            Alert.alert('Intel Missing', 'Could not retrieve data for this mission. Please check connection and try again.')
        }
    }

    const handleStartMission = (mode: 'VOICE' | 'STEALTH') => {
        setShowBriefing(false)
        // Small delay to allow modal to close smoothly
        setTimeout(() => {
            setPracticeMode(mode)
        }, 200)
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
                    <ScrollView contentContainerStyle={styles.campaignList} showsVerticalScrollIndicator={false}>
                        <View style={styles.sectionHeader}>
                            <FontAwesome5 name="globe" size={12} color={theme.accent} style={{ opacity: 0.7 }} />
                            <ThemedText variant="caption" style={{ letterSpacing: 2, marginLeft: 8, opacity: 0.7 }}>AVAILABLE THEATERS</ThemedText>
                        </View>

                        {campaigns.map(campaign => (
                            <CampaignCard
                                key={campaign.id}
                                campaign={campaign}
                                onPress={handleStartCampaign}
                            />
                        ))}
                    </ScrollView>
                ) : (
                    <View style={styles.activeCampaignContainer}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => startCampaign(null)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.backButtonIcon}>
                                <FontAwesome5 name="arrow-left" size={12} color={theme.text} />
                            </View>
                            <ThemedText variant="button" style={{ fontSize: 14, letterSpacing: 1 }}>RETURN TO BASE</ThemedText>
                        </TouchableOpacity>

                        <View style={styles.mapContainer}>
                            <CampaignMap
                                campaign={activeCampaign}
                                onNodeSelect={handleNodeSelect}
                            />
                            {/* Glass Overlay Border for Map */}
                            <View style={styles.mapBorder} pointerEvents="none" />
                        </View>

                        {/* Loading Overlay */}
                        {isLoadingScripture && (
                            <View style={styles.loadingOverlay}>
                                <ActivityIndicator size="large" color={theme.accent} />
                                <ThemedText style={{ marginTop: 16, letterSpacing: 2 }}>DECRYPTING DATA...</ThemedText>
                            </View>
                        )}
                    </View>
                )}
            </View>

            {/* Mission Modals */}
            <MissionBriefingModal
                isVisible={showBriefing}
                onClose={() => setShowBriefing(false)}
                onStartMission={handleStartMission}
                node={selectedNode}
                scripture={targetScripture}
            />

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
        paddingHorizontal: 16,
    },
    campaignList: {
        paddingBottom: 100, // Space for tab bar
        paddingTop: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 4,
    },

    activeCampaignContainer: {
        flex: 1,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        padding: 8,
        marginLeft: -8,
        alignSelf: 'flex-start',
    },
    backButtonIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    mapContainer: {
        flex: 1,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 80, // Space for tab bar
    },
    mapBorder: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderRadius: 24,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20,
        backdropFilter: 'blur(10px)', // Web support
    }
})
