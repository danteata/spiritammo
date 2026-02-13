import { useState, useEffect } from 'react'
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native'
import { FontAwesome5, Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
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
import { AccessDeniedModal } from '@/components/AccessDeniedModal'
import { analytics, AnalyticsEventType } from '@/services/analytics'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'

export default function TrainingCampaignScreen() {
    const {
        campaigns,
        activeCampaignId,
        startCampaign,
        completeNode,
        isDark,
        theme,
        userStats
    } = useAppStore()

    const router = useRouter()
    const { trackCampaignStart } = useAnalytics()

    // Track screen view
    useScreenTracking('training_campaign')

    const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null)
    const [selectedNode, setSelectedNode] = useState<CampaignNode | null>(null)
    const [targetScripture, setTargetScripture] = useState<Scripture | null>(null)
    const [practiceMode, setPracticeMode] = useState<'VOICE' | 'STEALTH' | null>(null)
    const [showBriefing, setShowBriefing] = useState(false)
    const [deniedModal, setDeniedModal] = useState({
        visible: false,
        type: 'operation' as 'rank' | 'funds' | 'operation' | 'security',
        itemName: ''
    })

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
                user_streak: userStats.streak,
                is_training: true
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

        // Try to provision the scripture
        setIsLoadingScripture(true)
        const scripture = await useZustandStore.getState().provisionCampaignScripture(node)
        setIsLoadingScripture(false)

        if (scripture) {
            setTargetScripture(scripture)
            setSelectedNode(node)
            setShowBriefing(true)
        } else {
            setDeniedModal({
                visible: true,
                type: 'operation',
                itemName: node.title || 'Unknown Sector'
            })
        }
    }

    const handleStartMission = (mode: 'VOICE' | 'STEALTH') => {
        setShowBriefing(false)
        setTimeout(() => {
            setPracticeMode(mode)
        }, 200)
    }

    const handleMissionComplete = async (accuracy: number) => {
        if (!selectedNode || !activeCampaign) return

        // Close modals
        setPracticeMode(null)

        // In training mode, we don't track scores - just show feedback
        if (accuracy >= 70) {
            Alert.alert(
                'TRAINING COMPLETE',
                `Good work! Accuracy: ${accuracy.toFixed(1)}%`,
                [{ text: 'Continue Training' }]
            )
        } else {
            Alert.alert(
                'KEEP PRACTICING',
                `Accuracy: ${accuracy.toFixed(1)}%. Practice makes perfect!`,
                [{ text: 'Try Again' }]
            )
        }

        // Reset selection
        setSelectedNode(null)
        setTargetScripture(null)
    }

    return (
        <ThemedContainer style={styles.container}>
            <ScreenHeader
                title="CAMPAIGNS"
                subtitle="TRAINING MODE"
            />

            <View style={styles.content}>
                {/* Info Banner */}
                <View style={[styles.infoBanner, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }]}>
                    <Ionicons name="information-circle" size={20} color="#3B82F6" />
                    <ThemedText variant="caption" style={styles.infoText}>
                        Training mode: No scores recorded, no VP at stake. Practice freely!
                    </ThemedText>
                </View>

                {!activeCampaign ? (
                    <ScrollView contentContainerStyle={styles.campaignList} showsVerticalScrollIndicator={false}>
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
                                    Add verses to your arsenal to unlock campaigns.
                                </ThemedText>
                            </ThemedCard>
                        )}
                    </ScrollView>
                ) : (
                    <View style={styles.activeCampaignContainer}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.push('/train')}
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
                            <View style={styles.mapBorder} pointerEvents="none" />
                        </View>

                        {isLoadingScripture && (
                            <View style={styles.loadingOverlay}>
                                <ActivityIndicator size="large" color={theme.accent} />
                                <ThemedText style={{ marginTop: 16, letterSpacing: 2 }}>LOADING...</ThemedText>
                            </View>
                        )}
                    </View>
                )}

                <AccessDeniedModal
                    visible={deniedModal.visible}
                    onClose={() => setDeniedModal(prev => ({ ...prev, visible: false }))}
                    type={deniedModal.type}
                    itemName={deniedModal.itemName}
                    isDark={isDark}
                    theme={theme}
                />
            </View>

            <MissionBriefingModal
                isVisible={showBriefing}
                onClose={() => setShowBriefing(false)}
                onStartMission={handleStartMission}
                node={selectedNode}
                scripture={targetScripture}
            />

            {targetScripture && practiceMode === 'VOICE' && (
                <TargetPractice
                    isVisible={true}
                    targetVerse={targetScripture.text}
                    reference={targetScripture.reference}
                    scriptureId={targetScripture.id}
                    onRecordingComplete={(_, acc) => handleMissionComplete(acc)}
                    onClose={() => setPracticeMode(null)}
                />
            )}

            {targetScripture && practiceMode === 'STEALTH' && (
                <StealthDrill
                    isVisible={true}
                    targetVerse={targetScripture.text}
                    reference={targetScripture.reference}
                    onComplete={handleMissionComplete}
                    onClose={() => setPracticeMode(null)}
                />
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
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        gap: 10,
    },
    infoText: {
        flex: 1,
        opacity: 0.8,
    },
    campaignList: {
        paddingBottom: 100,
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
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 80,
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
        justifyContent: 'center',
        alignItems: 'center',
    },
})
