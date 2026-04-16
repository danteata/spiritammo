import { useState, useEffect } from 'react'
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Platform,
} from 'react-native'
import { FontAwesome5, Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'
import ScreenHeader from '@/components/ScreenHeader'
import CampaignMap from '@/components/CampaignMap'
import CampaignCard from '@/components/CampaignCard'
import UnifiedScriptureRecorderCard from '@/components/UnifiedScriptureRecorderCard'
import ScriptureActionRow from '@/components/ScriptureActionRow'
import VoicePlaybackService from '@/services/voicePlayback'
import MissionBriefingModal from '@/components/MissionBriefingModal'
import StealthDrill from '@/components/StealthDrill'
import { Campaign, CampaignNode } from '@/types/campaign'
import { Scripture } from '@/types/scripture'
import useZustandStore from '@/hooks/zustandStore'
import { AccessDeniedModal } from '@/components/AccessDeniedModal'
import { analytics, AnalyticsEventType } from '@/services/analytics'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'
import ValorPointsService from '@/services/valorPoints'
import { Toast } from '@/components/ui/Toast'
import { generateBattleIntel } from '@/services/battleIntelligence'
import { militaryRankingService } from '@/services/militaryRanking'

export default function CampaignScreen() {
    const {
        campaigns,
        activeCampaignId,
        startCampaign,
        completeNode,
        isDark,
        theme,
        userStats,
        scriptures,
        generateAutoCampaign,
        generateThematicCampaign,
        findAvailableThemes,
        escalateCampaign,
    } = useAppStore()

    const router = useRouter()
    const { trackCampaignStart, trackCampaignComplete } = useAnalytics()

    // Track screen view
    useScreenTracking('campaign')

    const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null)
    const [selectedNode, setSelectedNode] = useState<CampaignNode | null>(null)
    const [targetScripture, setTargetScripture] = useState<Scripture | null>(null)
    const [practiceMode, setPracticeMode] = useState<'VOICE' | 'STEALTH' | null>(null)
    const [deniedModal, setDeniedModal] = useState({
        visible: false,
        type: 'operation' as 'rank' | 'funds' | 'operation' | 'security',
        itemName: ''
    })

    const [isLoadingScripture, setIsLoadingScripture] = useState(false)
    const [isListeningVerse, setIsListeningVerse] = useState(false)
    const [isListeningIntel, setIsListeningIntel] = useState(false)
    const [isLoadingIntel, setIsLoadingIntel] = useState(false)
    const [tacticalIntel, setTacticalIntel] = useState<{ battlePlan: string; tacticalNotes: string } | null>(null)
    const [mapContainerHeight, setMapContainerHeight] = useState(0)
    const [isLooping, setIsLooping] = useState(false)

    useEffect(() => {
        setTacticalIntel(null)
    }, [targetScripture?.id])

    const handleMapLayout = (e: any) => {
        setMapContainerHeight(e.nativeEvent.layout.height)
    }

    useEffect(() => {
        if (activeCampaignId) {
            const campaign = campaigns.find(c => c.id === activeCampaignId)
            setActiveCampaign(campaign || null)
        } else {
            setActiveCampaign(null)
        }
    }, [activeCampaignId, campaigns])

    const handleStartCampaign = (campaignId: string) => {
        const campaign = campaigns.find(c => c.id === campaignId)
        analytics.track({
            name: AnalyticsEventType.CAMPAIGN_START,
            properties: {
                campaign_id: campaignId,
                campaign_name: campaign?.title,
                campaign_difficulty: campaign?.difficulty,
                campaign_theme: campaign?.theme,
                total_nodes: campaign?.nodes.length,
                user_rank: userStats.rank,
                user_streak: userStats.streak
            }
        })
        startCampaign(campaignId)
    }

    const handleNodeSelect = async (node: CampaignNode) => {
        // Check if node is locked first
        if (node.status === 'LOCKED') {
            setDeniedModal({
                visible: true,
                type: 'operation',
                itemName: node.title || 'Unknown Sector'
            })
            return
        }

        // 1. Try to provision (find or fetch) the scripture
        setIsLoadingScripture(true)
        const scripture = await useZustandStore.getState().provisionCampaignScripture(node)
        setIsLoadingScripture(false)

        if (scripture) {
            setTargetScripture(scripture)
            setSelectedNode(node)
            setPracticeMode('VOICE') // Direct to recorder
        } else {
            // This shouldn't happen for non-locked nodes, but just in case
            setDeniedModal({
                visible: true,
                type: 'operation',
                itemName: node.title || 'Unknown Sector'
            })
        }
    }

    const handleMissionComplete = async (accuracy: number) => {
        if (!selectedNode || !activeCampaign) return

        if (accuracy >= selectedNode.requiredAccuracy) {
            const vpEarned = await ValorPointsService.awardTargetPracticeVP(
                accuracy,
                0, 
                userStats.rank || 'recruit'
            )

            const success = await completeNode(activeCampaign.id, selectedNode.id, accuracy)

            // Update SRS state for spaced repetition scheduling
            if (targetScripture) {
                useZustandStore.getState().updateSRSAfterReview(targetScripture.id, accuracy)
            }

            if (success) {
                Toast.missionSuccess(`Sector Secured! ${accuracy.toFixed(1)}% | ${vpEarned} VP Earned`)
            } else {
                Toast.info('MISSION DEBRIEF', `Accuracy: ${accuracy.toFixed(1)}%. Already conquered or level up failed.`)
            }
        } else {
            Toast.missionFailed(`Required: ${selectedNode.requiredAccuracy}%. You got ${accuracy.toFixed(1)}%.`)
        }
    }

    const handleListenIntel = async () => {
        if (!targetScripture) return
        setIsListeningIntel(true)
        try {
            let intel = tacticalIntel
            if (!intel) {
                setIsLoadingIntel(true)
                intel = await generateBattleIntel({
                    reference: targetScripture.reference,
                    text: targetScripture.text
                })
                setTacticalIntel(intel)
                setIsLoadingIntel(false)
                await militaryRankingService.recordIntelGenerated()
            }
            await VoicePlaybackService.playTextToSpeech(`${intel.battlePlan}. ${intel.tacticalNotes}`, {
                rate: 0.9,
                pitch: 1.0,
                language: 'en-US',
            })
        } catch (error) {
            console.error('Failed to get intel:', error)
            Alert.alert('SYSTEM ERROR', 'Failed to retrieve battle intelligence. Check communications.')
        } finally {
            setIsListeningIntel(false)
            setIsLoadingIntel(false)
        }
    }

    const handleShowIntel = async () => {
        if (!targetScripture) return

        setIsLoadingIntel(true)
        try {
            const intel = await generateBattleIntel({
                reference: targetScripture.reference,
                text: targetScripture.text
            })
            setTacticalIntel(intel)
            await militaryRankingService.recordIntelGenerated()
        } catch (error) {
            console.error('Failed to get intel:', error)
            Alert.alert('SYSTEM ERROR', 'Failed to retrieve battle intelligence. Check communications.')
        } finally {
            setIsLoadingIntel(false)
        }
    }

    return (
        <ThemedContainer style={styles.container}>
            <ScreenHeader
                title="CAMPAIGNS"
                subtitle="CONQUEST MODE"
            />

            <View style={styles.content}>
                {!activeCampaign ? (
                    <ScrollView contentContainerStyle={styles.campaignList} showsVerticalScrollIndicator={false}>
                        {/* Warning Banner */}
                        <View style={[styles.warningBanner, { backgroundColor: isDark ? 'rgba(255, 107, 53, 0.15)' : 'rgba(255, 107, 53, 0.1)' }]}>
                            <Ionicons name="warning" size={20} color="#FF6B35" />
                            <ThemedText variant="caption" style={styles.warningText}>
                                Campaign missions affect your score & earn Valor Points
                            </ThemedText>
                        </View>

                        <View style={styles.sectionHeader}>
                            <FontAwesome5 name="globe" size={12} color={theme.accent} style={{ opacity: 0.7 }} />
                            <ThemedText variant="caption" style={{ letterSpacing: 2, marginLeft: 8, opacity: 0.7 }}>AVAILABLE THEATERS</ThemedText>
                        </View>

                        {campaigns && campaigns.length > 0 ? (
                            campaigns.map(campaign => (
                                <CampaignCard
                                    key={campaign.id}
                                    campaign={campaign}
                                    onPress={handleStartCampaign}
                                />
                            ))
                        ) : (
                            <ThemedCard variant="glass" style={styles.emptyState}>
                                <FontAwesome5 name="map" size={48} color={theme.textSecondary} />
                                <ThemedText variant="body" style={styles.emptyText}>
                                    No campaigns available yet.
                                </ThemedText>
                                <ThemedText variant="caption" style={styles.emptySubtext}>
                                    Complete training exercises to unlock campaigns.
                                </ThemedText>
                            </ThemedCard>
                        )}

                        {/* Auto-generated Campaign Actions */}
                        <View style={styles.autoCampaignSection}>
                            <View style={styles.sectionHeader}>
                                <FontAwesome5 name="robot" size={12} color={theme.warning} style={{ opacity: 0.7 }} />
                                <ThemedText variant="caption" style={{ letterSpacing: 2, marginLeft: 8, opacity: 0.7 }}>ADAPTIVE OPERATIONS</ThemedText>
                            </View>

                            <ThemedText variant="caption" style={{ opacity: 0.55, marginBottom: 12, lineHeight: 18 }}>
                                Procedurally generated campaigns that adapt to your performance. Auto Operations target your weakest verses; Thematic Operations connect verses by biblical theme.
                            </ThemedText>

                            <TouchableOpacity
                                style={[styles.autoCampaignButton, { borderColor: theme.accent }]}
                                onPress={() => {
                                    const campaign = generateAutoCampaign()
                                    if (campaign) {
                                        handleStartCampaign(campaign.id)
                                    } else {
                                        Alert.alert('ALL CLEAR', 'No weak areas detected. Keep up the good work, soldier!', [{ text: 'Understood' }])
                                    }
                                }}
                                activeOpacity={0.7}
                            >
                                <FontAwesome5 name="crosshairs" size={20} color={theme.accent} />
                                <View style={styles.autoCampaignText}>
                                    <ThemedText variant="body" style={{ fontWeight: '700' }}>AUTO OPERATION</ThemedText>
                                    <ThemedText variant="caption" style={{ opacity: 0.7 }}>Targets your weakest verses</ThemedText>
                                </View>
                                <FontAwesome5 name="chevron-right" size={14} color={theme.textSecondary} />
                            </TouchableOpacity>

                            {findAvailableThemes().length > 0 && (
                                <TouchableOpacity
                                    style={[styles.autoCampaignButton, { borderColor: theme.warning }]}
                                    onPress={() => {
                                        const themes = findAvailableThemes()
                                        if (themes.length > 0) {
                                            const campaign = generateThematicCampaign(themes[0])
                                            if (campaign) {
                                                handleStartCampaign(campaign.id)
                                            } else {
                                                Alert.alert('INSUFFICIENT DATA', 'Practice more verses to unlock thematic operations.', [{ text: 'Understood' }])
                                            }
                                        }
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <FontAwesome5 name="link" size={20} color={theme.warning} />
                                    <View style={styles.autoCampaignText}>
                                        <ThemedText variant="body" style={{ fontWeight: '700' }}>THEMATIC OPERATION</ThemedText>
                                        <ThemedText variant="caption" style={{ opacity: 0.7 }}>Connects verses by theme ({findAvailableThemes().slice(0, 3).join(', ')})</ThemedText>
                                    </View>
                                    <FontAwesome5 name="chevron-right" size={14} color={theme.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </ScrollView>
                ) : (
                    <View style={styles.activeCampaignContainer}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => {
                                useZustandStore.getState().clearActiveCampaign()
                                router.push('/battle')
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={styles.backButtonIcon}>
                                <FontAwesome5 name="arrow-left" size={12} color={theme.text} />
                            </View>
                            <ThemedText variant="button" style={{ fontSize: 14, letterSpacing: 1 }}>ABANDON MISSION</ThemedText>
                        </TouchableOpacity>

                        <View style={styles.mapContainer} onLayout={handleMapLayout}>
                            <CampaignMap
                                campaign={activeCampaign}
                                onNodeSelect={handleNodeSelect}
                                containerHeight={mapContainerHeight}
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

                {/* Access Denied Modal for Campaigns */}
                <AccessDeniedModal
                    visible={deniedModal.visible}
                    onClose={() => setDeniedModal(prev => ({ ...prev, visible: false }))}
                    type={deniedModal.type}
                    itemName={deniedModal.itemName}
                    isDark={isDark}
                    theme={theme}
                />
            </View>

            {targetScripture && practiceMode === 'VOICE' && (
                <View style={styles.fullScreenPractice}>
                    <View style={styles.practiceHeader}>
                        <TouchableOpacity 
                            style={styles.closePracticeButton}
                            onPress={() => setPracticeMode(null)}
                        >
                            <Ionicons name="arrow-back" size={24} color={theme.accent} />
                            <ThemedText variant="button" style={{ marginLeft: 8, color: theme.accent }}>END SESSION</ThemedText>
                        </TouchableOpacity>
                        <View style={styles.requirementBadge}>
                            <ThemedText variant="caption" style={{ color: theme.accent }}>REQ: {selectedNode?.requiredAccuracy}% ACCURACY</ThemedText>
                        </View>
                    </View>
                    
                    <ScrollView contentContainerStyle={styles.practiceScrollContent}>
                    <UnifiedScriptureRecorderCard
                        scripture={targetScripture}
                        isBattleMode={true}
                        onRecordingComplete={handleMissionComplete}
                        onListen={handleListenIntel}
                        onClose={() => {
                            setPracticeMode(null)
                            setSelectedNode(null)
                            setTargetScripture(null)
                        }}
                        isListening={isListeningIntel}
                        intelText={tacticalIntel ? `${tacticalIntel.battlePlan}\n\n${tacticalIntel.tacticalNotes}` : undefined}
                        onIntel={handleShowIntel}
                        onReadIntelAloud={handleListenIntel}
                        isListeningIntel={isListeningIntel}
                        isLoadingIntel={isLoadingIntel}
                        isLooping={isLooping}
                        onToggleLoop={() => setIsLooping(prev => !prev)}
                    />
                        <ScriptureActionRow
                            onStealth={() => setPracticeMode('STEALTH')}
                            onIntel={handleShowIntel}
                            isLoadingIntel={isLoadingIntel}
                            accentColor={theme.accent}
                        />
                        
                        <ThemedCard variant="glass" style={styles.missionNote}>
                            <Ionicons name="shield-checkmark" size={20} color={theme.accent} />
                            <ThemedText variant="caption" style={styles.missionNoteText}>
                                Ensure maximum silence for optimal transmission clarity. Target coordinates locked.
                            </ThemedText>
                        </ThemedCard>
                    </ScrollView>
                </View>
            )}

            {targetScripture && practiceMode === 'STEALTH' && (
                <View style={styles.fullScreenPractice}>
                    <StealthDrill
                        isVisible={true}
                        targetVerse={targetScripture.text}
                        reference={targetScripture.reference}
                        onComplete={handleMissionComplete}
                        onClose={() => setPracticeMode(null)}
                    />
                </View>
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
    warningBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        gap: 10,
    },
    warningText: {
        flex: 1,
        opacity: 0.8,
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
    emptyState: {
        alignItems: 'center',
        padding: 40,
        marginTop: 20,
    },
    emptyText: {
        marginTop: 16,
        textAlign: 'center',
        opacity: 0.7,
    },
    emptySubtext: {
        marginTop: 8,
        textAlign: 'center',
        opacity: 0.5,
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
    },
    mapBorder: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderRadius: 24,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.8)',
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    fullScreenPractice: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.9)',
        zIndex: 100,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    practiceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    closePracticeButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    requirementBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    practiceScrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    missionNote: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginTop: 20,
        gap: 12,
    },
    missionNoteText: {
        flex: 1,
        opacity: 0.8,
        letterSpacing: 0.5,
    },
    autoCampaignSection: {
        marginTop: 24,
        gap: 12,
    },
    autoCampaignButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1.5,
        gap: 12,
    },
    autoCampaignText: {
        flex: 1,
    },
})
