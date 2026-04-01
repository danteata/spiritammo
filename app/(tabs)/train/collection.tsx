import React, { useMemo, useState, useEffect } from 'react'
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native'
import { FontAwesome5, Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'
import ScreenHeader from '@/components/ScreenHeader'
import CollectionSelector from '@/components/CollectionSelector'
import CollectionChapterSelector from '@/components/CollectionChapterSelector'
import UnifiedScriptureRecorderCard from '@/components/UnifiedScriptureRecorderCard'
import ScriptureActionRow from '@/components/ScriptureActionRow'
import StealthDrill from '@/components/StealthDrill'
import VoicePlaybackService from '@/services/voicePlayback'
import { Collection } from '@/types/scripture'
import { Scripture } from '@/types/scripture'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'
import { AnalyticsEventType } from '@/services/analytics'

export default function CollectionDrillScreen() {
    const {
        scriptures,
        collections,
        isDark,
        theme,
        updateScriptureAccuracy,
        userSettings,
    } = useAppStore()

    const params = useLocalSearchParams()
    const router = useRouter()
    const { trackEvent } = useAnalytics()

    // Track screen view
    useScreenTracking('collection_drill')

    const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
    const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([])
    const [showChapterSelector, setShowChapterSelector] = useState(false)
    const [currentScripture, setCurrentScripture] = useState<Scripture | null>(null)
    const [scriptureIndex, setScriptureIndex] = useState(0)
    const [showStealthDrill, setShowStealthDrill] = useState(false)
    const [isListeningVerse, setIsListeningVerse] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

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
        console.log('🟢 [CollectionDrill] useEffect for collectionId:', collectionId)
        if (!collectionId || !collections) {
            console.log('🟢 [CollectionDrill] No collectionId or collections not ready')
            return
        }
        const preselected = collections.find(c => c.id === collectionId) || null
        console.log('🟢 [CollectionDrill] Found collection:', preselected?.name)
        if (preselected) {
            setSelectedCollection(preselected)
            console.log('🟢 [CollectionDrill] Set selectedCollection')
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

        // Update scripture accuracy (no VP in training mode)
        await updateScriptureAccuracy(currentScripture.id, accuracy)

        trackEvent(AnalyticsEventType.PRACTICE_COMPLETE, {
            practice_type: 'collection_drill',
            collection_id: selectedCollection.id,
            scripture_id: currentScripture.id,
            accuracy: accuracy,
            is_training: true
        })

        // Show feedback
        const isLastScripture = scriptureIndex >= collectionScriptures.length - 1

        if (accuracy >= 80) {
            Alert.alert(
                'Great Work! 🎯',
                `${accuracy}% accuracy on ${currentScripture.reference}`,
                isLastScripture ? [
                    { text: 'Restart Collection', onPress: () => setScriptureIndex(0) },
                    { text: 'Choose Another', onPress: () => setSelectedCollection(null) }
                ] : [
                    { text: 'Next Verse', onPress: loadNextScripture },
                    { text: 'Try Again', onPress: () => { } }
                ]
            )
        } else {
            Alert.alert(
                'Keep Practicing! 💪',
                `${accuracy}% accuracy - you're getting there!`,
                [
                    { text: 'Try Again', onPress: () => { } },
                    { text: 'Skip', onPress: loadNextScripture }
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

    const handleStartStealthPractice = () => {
        if (!currentScripture || !selectedCollection) return
        setShowStealthDrill(true)
        trackEvent(AnalyticsEventType.PRACTICE_START, {
            practice_type: 'stealth_collection',
            collection_id: selectedCollection.id,
            scripture_id: currentScripture.id,
            is_training: true,
        })
    }

    const handleListenVerse = async () => {
        if (!currentScripture) return
        setIsListeningVerse(true)
        try {
            await VoicePlaybackService.playScripture(
                currentScripture.id,
                `${currentScripture.reference}. ${currentScripture.text}`,
                {
                    rate: userSettings.voiceRate || 0.9,
                    pitch: userSettings.voicePitch || 1.0,
                    language: userSettings.language || 'en-US',
                }
            )
        } finally {
            setIsListeningVerse(false)
        }
    }

    return (
        <ThemedContainer style={styles.container}>
            <ScreenHeader
                title="COLLECTION DRILL"
                subtitle="PRACTICE MODE"
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Info Banner */}
                <View style={[styles.infoBanner, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }]}>
                    <Ionicons name="information-circle" size={20} color="#3B82F6" />
                    <ThemedText variant="caption" style={styles.infoText}>
                        Practice verses from your collections. No pressure, no scores recorded.
                    </ThemedText>
                </View>

                {!selectedCollection ? (
                    <View style={styles.selectorContainer}>
                        <ThemedText variant="caption" style={styles.sectionTitle}>
                            SELECT A COLLECTION
                        </ThemedText>
                        <CollectionSelector
                            onSelectCollection={setSelectedCollection}
                            selectedCollection={selectedCollection}
                            selectedChapterIds={selectedChapterIds}
                        />
                    </View>
                ) : (
                    <View style={styles.practiceContainer}>
                        {/* Collection Info */}
                        <TouchableOpacity
                            style={styles.collectionHeader}
                            onPress={() => setSelectedCollection(null)}
                        >
                            <FontAwesome5 name="folder-open" size={16} color={theme.accent} />
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
                                            backgroundColor: theme.accent
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
                                    onRecordingComplete={handleRecordingComplete}
                                />
                                <ScriptureActionRow
                                    onStealth={handleStartStealthPractice}
                                    onListen={handleListenVerse}
                                    isListening={isListeningVerse}
                                />
                            </>
                        )}
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
                        setShowChapterSelector(false)  // Close modal after selection
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
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
        gap: 10,
    },
    infoText: {
        flex: 1,
        opacity: 0.8,
    },
    selectorContainer: {
        marginTop: 10,
    },
    sectionTitle: {
        letterSpacing: 1.5,
        marginBottom: 16,
        opacity: 0.7,
    },
    practiceContainer: {
        marginTop: 10,
    },
    collectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
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
    practiceButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        marginTop: 20,
        gap: 10,
    },
    practiceButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 16,
    },
})
