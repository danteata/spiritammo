import React, { useMemo, useState, useEffect } from 'react'
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native'
import { FontAwesome5, Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedContainer, ThemedText } from '@/components/Themed'
import ScreenHeader from '@/components/ScreenHeader'
import CollectionSelector from '@/components/CollectionSelector'
import CollectionChapterSelector from '@/components/CollectionChapterSelector'
import UnifiedScriptureRecorderCard from '@/components/UnifiedScriptureRecorderCard'
import ScriptureActionRow from '@/components/ScriptureActionRow'
import VoicePlaybackService from '@/services/voicePlayback'
import StealthDrill from '@/components/StealthDrill'
import { Collection } from '@/types/scripture'
import { Scripture } from '@/types/scripture'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'
import { AnalyticsEventType } from '@/services/analytics'
import ValorPointsService from '@/services/valorPoints'

export default function CollectionBattleScreen() {
    const {
        scriptures,
        collections,
        isDark,
        theme,
        updateScriptureAccuracy,
        userStats,
        addValorPoints,
    } = useAppStore()

    const params = useLocalSearchParams()
    const router = useRouter()
    const { trackEvent } = useAnalytics()

    // Track screen view
    useScreenTracking('collection_battle')

    const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
    const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([])
    const [showChapterSelector, setShowChapterSelector] = useState(false)
    const [currentScripture, setCurrentScripture] = useState<Scripture | null>(null)
    const [scriptureIndex, setScriptureIndex] = useState(0)
    const [totalVP, setTotalVP] = useState(0)
    const [showStealthDrill, setShowStealthDrill] = useState(false)
    const [isListeningVerse, setIsListeningVerse] = useState(false)

    const initialChapterIds = useMemo(() => {
        const raw = params.chapterIds
        if (!raw) return []
        if (Array.isArray(raw)) {
            return raw.flatMap((id) => id.split(',')).filter(Boolean)
        }
        return raw.split(',').filter(Boolean)
    }, [params.chapterIds])

    // Preselect collection if provided via params
    useEffect(() => {
        const collectionId = params.collectionId as string | undefined
        if (!collectionId || !collections) return
        const preselected = collections.find(c => c.id === collectionId) || null
        if (preselected) {
            setSelectedCollection(preselected)
        }
    }, [params.collectionId, collections])

    useEffect(() => {
        if (!selectedCollection) {
            setSelectedChapterIds([])
            return
        }

        if (selectedCollection.isChapterBased && selectedCollection.chapters?.length) {
            if (initialChapterIds.length > 0) {
                setSelectedChapterIds(initialChapterIds)
            } else {
                setSelectedChapterIds(selectedCollection.chapters.map((ch) => ch.id))
            }
        } else {
            setSelectedChapterIds([])
        }
    }, [selectedCollection?.id, initialChapterIds.join(',')])

    const collectionScriptures = useMemo(() => {
        if (!selectedCollection || !scriptures) return []

        const base = scriptures.filter(s =>
            selectedCollection.scriptures.includes(s.id)
        )

        if (
            selectedCollection.isChapterBased &&
            selectedCollection.chapters &&
            selectedChapterIds.length > 0
        ) {
            const selectedIds = new Set(
                selectedCollection.chapters
                    .filter((ch) => selectedChapterIds.includes(ch.id))
                    .flatMap((ch) => ch.scriptures)
            )
            return base.filter(s => selectedIds.has(s.id))
        }

        return base
    }, [selectedCollection, scriptures, selectedChapterIds])

    // Load scripture when collection or chapter selection changes
    useEffect(() => {
        if (collectionScriptures.length > 0) {
            setCurrentScripture(collectionScriptures[0])
            setScriptureIndex(0)
        } else {
            setCurrentScripture(null)
            setScriptureIndex(0)
        }
    }, [collectionScriptures, selectedCollection?.id])

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

        // Show feedback
        const isLastScripture = scriptureIndex >= collectionScriptures.length - 1

        if (isLastScripture) {
            // Battle complete
            Alert.alert(
                'Battle Complete! 🏆',
                `You earned ${totalVP + vpEarned} Valor Points!\nAccuracy: ${accuracy}%`,
                [
                    { text: 'View Results', onPress: () => router.back() },
                    {
                        text: 'Battle Again', onPress: () => {
                            setScriptureIndex(0)
                            setTotalVP(0)
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
                    { text: 'Improve Score', onPress: () => { } }
                ]
            )
        } else {
            Alert.alert(
                'Keep Fighting! 💪',
                `+${vpEarned} VP | ${accuracy}% accuracy`,
                [
                    { text: 'Try Again', onPress: () => { } },
                    { text: 'Next Verse', onPress: loadNextScripture }
                ]
            )
        }
    }

    const loadNextScripture = () => {
        if (!selectedCollection || collectionScriptures.length === 0) return

        const nextIndex = scriptureIndex + 1
        if (nextIndex < collectionScriptures.length) {
            setScriptureIndex(nextIndex)
            setCurrentScripture(collectionScriptures[nextIndex])
        }
    }

    const handleSkip = () => {
        if (scriptureIndex < collectionScriptures.length - 1) {
            loadNextScripture()
        } else {
            router.back()
        }
    }

    const handleListenVerse = async () => {
        if (!currentScripture) return
        setIsListeningVerse(true)
        try {
            await VoicePlaybackService.playScripture(
                currentScripture.id,
                `${currentScripture.reference}. ${currentScripture.text}`,
                {
                    rate: 0.9,
                    pitch: 1.0,
                    language: 'en-US',
                }
            )
        } finally {
            setIsListeningVerse(false)
        }
    }

    const handleStartStealthBattle = () => {
        if (!currentScripture || !selectedCollection) return
        setShowStealthDrill(true)
        trackEvent(AnalyticsEventType.PRACTICE_START, {
            practice_type: 'stealth_battle',
            collection_id: selectedCollection.id,
            scripture_id: currentScripture.id,
            is_training: false,
        })
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
                            selectedChapterIds={selectedChapterIds}
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

                        {selectedCollection.isChapterBased && selectedCollection.chapters && (
                            <TouchableOpacity
                                style={styles.chapterFilter}
                                onPress={() => setShowChapterSelector(true)}
                            >
                                <FontAwesome5 name="layer-group" size={14} color={theme.textSecondary} />
                                <ThemedText variant="caption" style={styles.chapterFilterText}>
                                    {selectedChapterIds.length === selectedCollection.chapters.length
                                        ? 'All Chapters'
                                        : `${selectedChapterIds.length} Chapter${selectedChapterIds.length !== 1 ? 's' : ''} Selected`}
                                </ThemedText>
                                <FontAwesome5 name="chevron-right" size={12} color={theme.textSecondary} />
                            </TouchableOpacity>
                        )}

                        {/* Progress */}
                        <View style={styles.progressContainer}>
                            <ThemedText variant="caption" style={styles.progressText}>
                                Verse {scriptureIndex + 1} of {collectionScriptures.length}
                            </ThemedText>
                            <View style={styles.progressBar}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: `${collectionScriptures.length > 0
                                                ? ((scriptureIndex + 1) / collectionScriptures.length) * 100
                                                : 0}%`,
                                            backgroundColor: '#EF4444'
                                        }
                                    ]}
                                />
                            </View>
                        </View>

                        {/* Unified Verse + Recorder Card */}
                        {currentScripture && (
                            <>
                                <UnifiedScriptureRecorderCard
                                    scripture={currentScripture}
                                    isBattleMode
                                    onRecordingComplete={handleRecordingComplete}
                                    onListen={handleListenVerse}
                                    isListening={isListeningVerse}
                                />
                                <ScriptureActionRow
                                    onStealth={handleStartStealthBattle}
                                    accentColor="#EF4444"
                                />
                            </>
                        )}

                        {/* Skip Button */}
                        <TouchableOpacity
                            style={styles.skipButton}
                            onPress={handleSkip}
                        >
                            <FontAwesome5 name="fast-forward" size={16} color={theme.textSecondary} />
                            <ThemedText variant="caption" style={styles.skipText}>
                                SKIP TARGET
                            </ThemedText>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {currentScripture && (
                <StealthDrill
                    isVisible={showStealthDrill}
                    onClose={() => setShowStealthDrill(false)}
                    onComplete={(accuracy: number) => handleRecordingComplete(accuracy)}
                    targetVerse={currentScripture.text}
                    reference={currentScripture.reference}
                />
            )}

            {selectedCollection?.isChapterBased && selectedCollection.chapters && (
                <CollectionChapterSelector
                    isVisible={showChapterSelector}
                    collection={selectedCollection}
                    onClose={() => setShowChapterSelector(false)}
                    initialSelectedChapterIds={selectedChapterIds}
                    actionLabel="APPLY SELECTION"
                    onStartPractice={(chapterIds) => {
                        setSelectedChapterIds(chapterIds)
                        chapterIds.forEach((chapterId) => {
                            const chapter = selectedCollection.chapters?.find((ch) => ch.id === chapterId)
                            trackEvent(AnalyticsEventType.CHAPTER_SELECTED, {
                                chapter_id: chapterId,
                                collection_id: selectedCollection.id,
                                verse_count: chapter?.scriptures.length,
                            })
                        })
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
    chapterFilter: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.04)',
        marginBottom: 12,
        gap: 8,
    },
    chapterFilterText: {
        flex: 1,
        opacity: 0.8,
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
    skipButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        marginTop: 12,
        gap: 8,
    },
    skipText: {
        opacity: 0.7,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
})
