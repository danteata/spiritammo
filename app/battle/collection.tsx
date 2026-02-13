import React, { useState, useEffect } from 'react'
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
import CollectionSelector from '@/components/CollectionSelector'
import ScriptureCard from '@/components/ScriptureCard'
import VoiceRecorder from '@/components/VoiceRecorder'
import { Collection } from '@/types/scripture'
import { Scripture } from '@/types/scripture'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'
import { AnalyticsEventType } from '@/services/analytics'
import ValorPointsService from '@/services/valorPoints'

export default function CollectionBattleScreen() {
    const {
        scriptures,
        isDark,
        theme,
        updateScriptureAccuracy,
        userStats,
        addValorPoints,
    } = useAppStore()

    const router = useRouter()
    const { trackEvent } = useAnalytics()

    // Track screen view
    useScreenTracking('collection_battle')

    const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
    const [currentScripture, setCurrentScripture] = useState<Scripture | null>(null)
    const [scriptureIndex, setScriptureIndex] = useState(0)
    const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
    const [totalVP, setTotalVP] = useState(0)
    const [battleComplete, setBattleComplete] = useState(false)

    // Load scripture when collection is selected
    useEffect(() => {
        if (selectedCollection && scriptures) {
            const collectionScriptures = scriptures.filter(s =>
                selectedCollection.scriptures.includes(s.id)
            )
            if (collectionScriptures.length > 0) {
                setCurrentScripture(collectionScriptures[0])
                setScriptureIndex(0)
            }
        }
    }, [selectedCollection, scriptures])

    const handleRecordingComplete = async (accuracy: number) => {
        if (!currentScripture || !selectedCollection) return

        // Update scripture accuracy
        await updateScriptureAccuracy(currentScripture.id, accuracy)

        // Calculate and award Valor Points
        const vpEarned = ValorPointsService.calculateVPReward(accuracy, userStats?.streak || 0, userStats?.rank)
        setTotalVP(prev => prev + vpEarned)
        addValorPoints(vpEarned, 'collection_battle')

        trackEvent(AnalyticsEventType.PRACTICE_COMPLETE, {
            practice_type: 'collection_battle',
            collection_id: selectedCollection.id,
            scripture_id: currentScripture.id,
            accuracy: accuracy,
            vp_earned: vpEarned,
            is_training: false
        })

        setShowVoiceRecorder(false)

        // Show feedback
        const collectionScriptures = scriptures?.filter(s =>
            selectedCollection.scriptures.includes(s.id)
        ) || []

        const isLastScripture = scriptureIndex >= collectionScriptures.length - 1

        if (isLastScripture) {
            // Battle complete
            setBattleComplete(true)
            Alert.alert(
                'Battle Complete! 🏆',
                `You earned ${totalVP + vpEarned} Valor Points!\nAccuracy: ${accuracy}%`,
                [
                    { text: 'View Results', onPress: () => router.back() },
                    {
                        text: 'Battle Again', onPress: () => {
                            setScriptureIndex(0)
                            setTotalVP(0)
                            setBattleComplete(false)
                        }
                    }
                ]
            )
        } else if (accuracy >= 80) {
            Alert.alert(
                'Excellent! ⚔️',
                `+${vpEarned} VP | ${accuracy}% accuracy`,
                [
                    { text: 'Next Verse', onPress: loadNextScripture },
                    { text: 'Improve Score', onPress: () => setShowVoiceRecorder(true) }
                ]
            )
        } else {
            Alert.alert(
                'Keep Fighting! 💪',
                `+${vpEarned} VP | ${accuracy}% accuracy`,
                [
                    { text: 'Try Again', onPress: () => setShowVoiceRecorder(true) },
                    { text: 'Next Verse', onPress: loadNextScripture }
                ]
            )
        }
    }

    const loadNextScripture = () => {
        if (!selectedCollection || !scriptures) return

        const collectionScriptures = scriptures.filter(s =>
            selectedCollection.scriptures.includes(s.id)
        )

        const nextIndex = scriptureIndex + 1
        if (nextIndex < collectionScriptures.length) {
            setScriptureIndex(nextIndex)
            setCurrentScripture(collectionScriptures[nextIndex])
        }
    }

    return (
        <ThemedContainer style={styles.container}>
            <ScreenHeader
                title="COLLECTION ASSAULT"
                subtitle="EARN VALOR POINTS"
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Warning Banner */}
                <View style={[styles.warningBanner, { backgroundColor: isDark ? 'rgba(255, 107, 53, 0.15)' : 'rgba(255, 107, 53, 0.1)' }]}>
                    <Ionicons name="warning" size={20} color="#FF6B35" />
                    <ThemedText variant="caption" style={styles.warningText}>
                        Battle mode: Scores affect your rank & earn Valor Points
                    </ThemedText>
                </View>

                {/* VP Counter */}
                <View style={[styles.vpCounter, { backgroundColor: isDark ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 215, 0, 0.05)' }]}>
                    <FontAwesome5 name="coins" size={20} color="#FFD700" />
                    <ThemedText variant="heading" style={styles.vpText}>{totalVP}</ThemedText>
                    <ThemedText variant="caption" style={styles.vpLabel}>VP Earned</ThemedText>
                </View>

                {!selectedCollection ? (
                    <View style={styles.selectorContainer}>
                        <ThemedText variant="caption" style={styles.sectionTitle}>
                            SELECT YOUR BATTLEFIELD
                        </ThemedText>
                        <CollectionSelector
                            onSelectCollection={setSelectedCollection}
                            selectedCollection={selectedCollection}
                        />
                    </View>
                ) : (
                    <View style={styles.battleContainer}>
                        {/* Collection Info */}
                        <TouchableOpacity
                            style={styles.collectionHeader}
                            onPress={() => setSelectedCollection(null)}
                        >
                            <FontAwesome5 name="crosshairs" size={16} color="#EF4444" />
                            <ThemedText variant="body" style={styles.collectionName}>
                                {selectedCollection.name}
                            </ThemedText>
                            <FontAwesome5 name="chevron-down" size={12} color={theme.textSecondary} />
                        </TouchableOpacity>

                        {/* Progress */}
                        <View style={styles.progressContainer}>
                            <ThemedText variant="caption" style={styles.progressText}>
                                Verse {scriptureIndex + 1} of {selectedCollection.scriptures.length}
                            </ThemedText>
                            <View style={styles.progressBar}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: `${((scriptureIndex + 1) / selectedCollection.scriptures.length) * 100}%`,
                                            backgroundColor: '#EF4444'
                                        }
                                    ]}
                                />
                            </View>
                        </View>

                        {/* Scripture Card */}
                        {currentScripture && (
                            <ScriptureCard
                                scripture={currentScripture}
                                onReveal={() => { }}
                            />
                        )}

                        {/* Battle Button */}
                        <TouchableOpacity
                            style={styles.battleButton}
                            onPress={() => setShowVoiceRecorder(true)}
                        >
                            <FontAwesome5 name="crosshairs" size={20} color="#FFF" />
                            <ThemedText variant="body" style={styles.battleButtonText}>
                                ENGAGE
                            </ThemedText>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Voice Recorder Modal */}
            {showVoiceRecorder && currentScripture && (
                <View style={styles.voiceRecorderOverlay}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setShowVoiceRecorder(false)}
                    >
                        <Ionicons name="close-circle" size={32} color="#FFF" />
                    </TouchableOpacity>
                    <VoiceRecorder
                        scriptureText={currentScripture.text}
                        scriptureId={currentScripture.id}
                        scriptureRef={currentScripture.reference}
                        intelText={`Reference: ${currentScripture.reference}`}
                        onRecordingComplete={handleRecordingComplete}
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
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
        color: '#FF6B35',
    },
    vpCounter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        gap: 10,
    },
    vpText: {
        fontSize: 28,
        color: '#FFD700',
    },
    vpLabel: {
        opacity: 0.7,
    },
    selectorContainer: {
        marginTop: 10,
    },
    sectionTitle: {
        letterSpacing: 1.5,
        marginBottom: 16,
        opacity: 0.7,
    },
    battleContainer: {
        marginTop: 10,
    },
    collectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        marginBottom: 16,
        gap: 10,
    },
    collectionName: {
        flex: 1,
        fontWeight: '600',
    },
    progressContainer: {
        marginBottom: 20,
    },
    progressText: {
        marginBottom: 8,
        opacity: 0.7,
    },
    progressBar: {
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    battleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        marginTop: 20,
        gap: 10,
        backgroundColor: '#EF4444',
    },
    battleButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16,
        letterSpacing: 1,
    },
    voiceRecorderOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    closeButton: {
        position: 'absolute',
        top: 60,
        right: 20,
        zIndex: 10,
    },
})
