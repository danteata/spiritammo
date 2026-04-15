import React, { useState } from 'react'
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native'
import { FontAwesome5, Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedContainer, ThemedText } from '@/components/Themed'
import ScreenHeader from '@/components/ScreenHeader'
import CollectionSelector from '@/components/CollectionSelector'
import UnifiedScriptureRecorderCard from '@/components/UnifiedScriptureRecorderCard'
import ScriptureActionRow from '@/components/ScriptureActionRow'
import StealthDrill from '@/components/StealthDrill'
import VoicePlaybackService from '@/services/voicePlayback'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'
import { AnalyticsEventType } from '@/services/analytics'
import { Toast } from '@/components/ui/Toast'
import { useCollectionPractice } from '@/hooks/useCollectionPractice'
import { useLocalSearchParams } from 'expo-router'

export default function CollectionDrillScreen() {
    const {
        isDark,
        theme,
        updateScriptureAccuracy,
        userSettings,
    } = useAppStore()

    const params = useLocalSearchParams()
    const router = useRouter()
    const { trackEvent } = useAnalytics()

    useScreenTracking('collection_drill')

    const {
        selectedCollection,
        setSelectedCollection,
        selectedChapterIds,
        setSelectedChapterIds,
        currentScripture,
        scriptureIndex,
        collectionScriptures,
        loadNextScripture,
        loadPreviousScripture,
    } = useCollectionPractice({
        collectionId: params.collectionId as string | undefined,
        initialChapterIds: params.chapterIds ? (Array.isArray(params.chapterIds) ? params.chapterIds : [params.chapterIds]) : [],
    })

    const [showStealthDrill, setShowStealthDrill] = useState(false)
    const [isListeningVerse, setIsListeningVerse] = useState(false)

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

        const isLastScripture = scriptureIndex >= collectionScriptures.length - 1

        if (accuracy >= 80) {
            Toast.missionSuccess(`${accuracy}% ACCURACY ON ${currentScripture.reference.toUpperCase()}`)
            if (isLastScripture) {
                Alert.alert(
                    'COLLECTION COMPLETE 🎖️',
                    'You have engaged all targets in this collection.',
                    [
                        { text: 'Restart', onPress: () => {
                            setSelectedChapterIds([])
                        }},
                        { text: 'Finish', onPress: () => router.back() }
                    ]
                )
            } else {
                // Auto-advance after 2 seconds if high accuracy
                setTimeout(() => {
                    loadNextScripture()
                }, 2000)
            }
        } else {
            Toast.show({
                type: 'warning',
                title: '⚡ LOW PRECISION',
                message: `${accuracy}% accuracy - check your coordinates and try again.`,
            })
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

    const handleIntelPress = async () => {
        if (!currentScripture) return
        const intelText = currentScripture.mnemonic || `Target reference: ${currentScripture.reference}`
        setIsListeningVerse(true)
        try {
            await VoicePlaybackService.playTextToSpeech(intelText, {
                rate: userSettings.voiceRate || 0.9,
                pitch: userSettings.voicePitch || 1.0,
                language: userSettings.language || 'en-US',
            })
        } finally {
            setIsListeningVerse(false)
        }
    }

    return (
        <ThemedContainer style={styles.container}>
            <ScreenHeader
                title="LIVE FIRE DRILL"
                subtitle="TACTICAL PRACTICE"
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

                        <TouchableOpacity
                            style={[styles.quizButton, { backgroundColor: theme.accent }]}
                            onPress={() => {
                                router.push({
                                    pathname: '/train/quiz',
                                    params: { collectionId: selectedCollection.id }
                                })
                                trackEvent(AnalyticsEventType.QUIZ_STARTED, {
                                    collection_id: selectedCollection.id,
                                })
                            }}
                        >
                            <Ionicons name="rocket" size={20} color={theme.accentContrastText} />
                            <ThemedText variant="body" style={[styles.quizButtonText, { color: theme.accentContrastText }]}>
                                DEPLOY DRILL
                            </ThemedText>
                        </TouchableOpacity>

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
                                    onListen={handleListenVerse}
                                    isListening={isListeningVerse}
                                />
                                <ScriptureActionRow
                                    onStealth={handleStartStealthPractice}
                                    onIntel={handleIntelPress}
                                />

                                {/* Manual Navigation */}
                                <View style={styles.navRow}>
                                    <TouchableOpacity 
                                        style={[styles.navButton, { borderColor: theme.border }]}
                                        onPress={loadPreviousScripture}
                                        disabled={scriptureIndex === 0}
                                    >
                                        <Ionicons name="chevron-back" size={24} color={scriptureIndex === 0 ? theme.textSecondary : theme.accent} />
                                        <ThemedText variant="caption" style={{ color: scriptureIndex === 0 ? theme.textSecondary : theme.accent }}>PREV</ThemedText>
                                    </TouchableOpacity>

                                    <TouchableOpacity 
                                        style={[styles.navButton, { backgroundColor: theme.surfaceHighlight, borderColor: theme.accent }]}
                                        onPress={loadNextScripture}
                                        disabled={scriptureIndex >= collectionScriptures.length - 1}
                                    >
                                        <ThemedText variant="caption" style={{ color: theme.accent, fontWeight: '700' }}>NEXT TARGET</ThemedText>
                                        <Ionicons name="chevron-forward" size={24} color={theme.accent} />
                                    </TouchableOpacity>
                                </View>
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
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 100,
        gap: 20,
    },
    loadingText: {
        letterSpacing: 2,
        opacity: 0.6,
    },
    quizButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        marginTop: 12,
        gap: 10,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    quizButtonText: {
        fontWeight: '700',
        fontSize: 16,
        letterSpacing: 1,
    },
    navRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 24,
        gap: 12,
    },
    navButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
    },
})
