import React, { useState, useEffect } from 'react'
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native'
import { FontAwesome5 } from '@expo/vector-icons'
import { useLocalSearchParams } from 'expo-router'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'
import ScreenHeader from '@/components/ScreenHeader'
import CampaignMap from '@/components/CampaignMap'
import CampaignCard from '@/components/CampaignCard'
import TargetPractice from '@/components/TargetPractice'
import MissionBriefingModal from '@/components/MissionBriefingModal'
import StealthDrill from '@/components/StealthDrill'
import CollectionSelector from '@/components/CollectionSelector'
import ScriptureCard from '@/components/ScriptureCard'
import VoiceRecorder from '@/components/VoiceRecorder'
import { Collection } from '@/types/scripture'
import { Campaign, CampaignNode } from '@/types/campaign'
import { Scripture } from '@/types/scripture'
import useZustandStore from '@/hooks/zustandStore'
import { errorHandler } from '@/services/errorHandler'

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

    const params = useLocalSearchParams()

    const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null)
    const [selectedNode, setSelectedNode] = useState<CampaignNode | null>(null)
    const [targetScripture, setTargetScripture] = useState<Scripture | null>(null)
    const [practiceMode, setPracticeMode] = useState<'VOICE' | 'STEALTH' | null>(null)
    const [showBriefing, setShowBriefing] = useState(false)
    const [campaignMode, setCampaignMode] = useState<'campaign' | 'collection'>(params.mode === 'collection' ? 'collection' : 'campaign')
    const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
    const [currentCollectionScripture, setCurrentCollectionScripture] = useState<Scripture | null>(null)
    const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)

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
                subtitle={campaignMode === 'campaign' ? 'CAMPAIGN MODE' : 'COLLECTION MODE'}
                rightAction={
                    !activeCampaign ? (
                        <TouchableOpacity
                            style={styles.modeToggle}
                            onPress={() => setCampaignMode(
                                campaignMode === 'campaign' ? 'collection' : 'campaign'
                            )}
                        >
                            <FontAwesome5
                                name={campaignMode === 'campaign' ? 'book' : 'map'}
                                size={16}
                                color={theme.accent}
                                style={{ marginRight: 8 }}
                            />
                            <ThemedText variant="caption" style={{ color: theme.accent, fontSize: 12 }}>
                                {campaignMode === 'campaign' ? 'COLLECTION' : 'CAMPAIGN'}
                            </ThemedText>
                        </TouchableOpacity>
                    ) : null
                }
            />

            <View style={styles.content}>
                {/* Collection Mode - Show collection testing interface */}
                {campaignMode === 'collection' && !activeCampaign ? (
                    <View style={styles.collectionMode}>
                        <CollectionSelector
                            onSelectCollection={(collection) => {
                                setSelectedCollection(collection)
                                // Load first scripture from collection
                                const collectionScriptures = scriptures.filter(s =>
                                    collection.scriptures.includes(s.id)
                                )
                                if (collectionScriptures.length > 0) {
                                    setCurrentCollectionScripture(collectionScriptures[0])
                                }
                            }}
                            selectedCollection={selectedCollection}
                        />

                        {currentCollectionScripture && (
                            <>
                                <ScriptureCard
                                    scripture={currentCollectionScripture}
                                    onReveal={() => {
                                        Alert.alert(
                                            '⚠️ COMPROMISED INTEL DETECTED',
                                            'Revealing hidden scripture text in collection mode violates collection testing protocol. This compromises the integrity of your training data.\n\nReturn to cover immediately!',
                                            [
                                                { text: 'AFFIRMATIVE', style: 'destructive' }
                                            ]
                                        )
                                    }}
                                />

                                <VoiceRecorder
                                    scriptureText={currentCollectionScripture.text}
                                    intelText={`Reference: ${currentCollectionScripture.reference}`}
                                    onRecordingComplete={async (accuracy) => {
                                        console.log('Collection recording complete:', accuracy)

                                        // Update scripture accuracy
                                        await updateScriptureAccuracy(currentCollectionScripture.id, accuracy)

                                        // Show result
                                        Alert.alert(
                                            'VERSE RECORDED',
                                            `Accuracy: ${accuracy.toFixed(1)}%`,
                                            [{ text: 'CONTINUE' }]
                                        )
                                    }}
                                />

                                <View style={styles.tacticalActions}>
                                    <View style={styles.actionRow}>
                                        <TouchableOpacity
                                            style={[styles.tacticalButton, { backgroundColor: theme.accent }]}
                                            onPress={() => {
                                                if (selectedCollection) {
                                                    const collectionScriptures = scriptures.filter(s =>
                                                        selectedCollection.scriptures.includes(s.id)
                                                    )
                                                    if (collectionScriptures.length > 0) {
                                                        const randomIndex = Math.floor(Math.random() * collectionScriptures.length)
                                                        setCurrentCollectionScripture(collectionScriptures[randomIndex])
                                                    }
                                                }
                                            }}
                                        >
                                            <FontAwesome5 name="random" size={16} color="white" />
                                            <ThemedText variant="button" style={{ color: 'white', fontSize: 12 }}>
                                                NEXT
                                            </ThemedText>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.tacticalButton, { backgroundColor: '#3498db' }]}
                                            onPress={() => setPracticeMode('STEALTH')}
                                        >
                                            <FontAwesome5 name="user-secret" size={16} color="white" />
                                            <ThemedText variant="button" style={{ color: 'white', fontSize: 12 }}>
                                                STEALTH
                                            </ThemedText>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.tacticalButton, { backgroundColor: '#9b59b6' }]}
                                            onPress={async () => {
                                                if (currentCollectionScripture) {
                                                    try {
                                                        const { generateAndStoreIntel } = await import('@/services/battleIntelligence')
                                                        const intel = await generateAndStoreIntel(currentCollectionScripture, false)
                                                        if (intel) {
                                                            errorHandler.showSuccess('Intel downloaded and memorized.', 'Tactical Advantage Secured')
                                                        }
                                                    } catch (error) {
                                                        errorHandler.handleError(error, 'Generate Intel')
                                                    }
                                                }
                                            }}
                                        >
                                            <FontAwesome5 name="brain" size={16} color="white" />
                                            <ThemedText variant="button" style={{ color: 'white', fontSize: 12 }}>
                                                INTEL
                                            </ThemedText>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </>
                        )}

                        {(!selectedCollection || !currentCollectionScripture) && (
                            <View style={styles.collectionPlaceholder}>
                                <FontAwesome5 name="book" size={48} color={theme.textSecondary} />
                                <ThemedText variant="body" style={{ color: theme.textSecondary, marginTop: 16, textAlign: 'center' }}>
                                    Select a collection above to begin testing verses.
                                </ThemedText>
                                <ThemedText variant="caption" style={{ color: theme.textSecondary, marginTop: 8, textAlign: 'center' }}>
                                    Your progress will be tracked automatically.
                                </ThemedText>
                            </View>
                        )}
                    </View>
                ) : !activeCampaign ? (
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

            {(targetScripture || currentCollectionScripture) && (
                (() => {
                    const currentScripture = targetScripture || currentCollectionScripture
                    return (
                        <>
                            {practiceMode === 'VOICE' && currentScripture && (
                                <TargetPractice
                                    isVisible={true}
                                    targetVerse={currentScripture.text}
                                    reference={currentScripture.reference}
                                    onRecordingComplete={(_, acc) => handleMissionComplete(acc)}
                                    onClose={() => setPracticeMode(null)}
                                />
                            )}
                            {practiceMode === 'STEALTH' && currentScripture && (
                                <StealthDrill
                                    isVisible={true}
                                    targetVerse={currentScripture.text}
                                    reference={currentScripture.reference}
                                    onComplete={handleMissionComplete}
                                    onClose={() => setPracticeMode(null)}
                                />
                            )}
                        </>
                    )
                })()
            )}

            {/* Collection Voice Recorder Modal */}
            {currentCollectionScripture && showVoiceRecorder && (
                <VoiceRecorder
                    scriptureText={currentCollectionScripture.text}
                    intelText={`Reference: ${currentCollectionScripture.reference}`}
                    onRecordingComplete={async (accuracy) => {
                        console.log('Collection recording complete:', accuracy)
                        setShowVoiceRecorder(false)

                        // Update scripture accuracy
                        await updateScriptureAccuracy(currentCollectionScripture.id, accuracy)

                        // Show result
                        Alert.alert(
                            'VERSE RECORDED',
                            `Accuracy: ${accuracy.toFixed(1)}%`,
                            [{ text: 'CONTINUE' }]
                        )
                    }}
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
    },
    modeToggle: {
        padding: 10,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    collectionMode: {
        flex: 1,
        paddingTop: 16,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
        paddingBottom: 20,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 2,
    },
    primaryAction: {
        backgroundColor: '#007BFF',
        borderColor: '#007BFF',
    },
    secondaryAction: {
        backgroundColor: 'transparent',
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    collectionPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    tacticalActions: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'center',
    },
    tacticalButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 8,
        borderRadius: 8,
        gap: 8,
        minWidth: 80,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 3,
    },
})
