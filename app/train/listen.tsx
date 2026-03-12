import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Animated,
    Dimensions,
} from 'react-native'
import { FontAwesome5, Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'
import ScreenHeader from '@/components/ScreenHeader'
import CollectionSelector from '@/components/CollectionSelector'
import { Collection, Scripture } from '@/types/scripture'
import VoicePlaybackService from '@/services/voicePlayback'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'
import { AnalyticsEventType } from '@/services/analytics'

const { width } = Dimensions.get('window')
const DELAY_BETWEEN_VERSES_MS = 3000

type PlaybackSpeed = 0.7 | 0.8 | 0.9 | 1.0 | 1.1 | 1.2 | 1.3
const SPEED_OPTIONS: PlaybackSpeed[] = [0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3]

export default function ListenAndLearnScreen() {
    const {
        scriptures,
        isDark,
        theme,
        userSettings,
    } = useAppStore()

    const router = useRouter()
    const { trackEvent } = useAnalytics()

    useScreenTracking('listen_and_learn')

    // State
    const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
    const [collectionScriptures, setCollectionScriptures] = useState<Scripture[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [isShuffle, setIsShuffle] = useState(false)
    const [speed, setSpeed] = useState<PlaybackSpeed>(1.0)
    const [playOrder, setPlayOrder] = useState<number[]>([])
    const [versesListened, setVersesListened] = useState(0)
    const [isReading, setIsReading] = useState(false)

    // Refs
    const delayTimerRef = useRef<NodeJS.Timeout | null>(null)
    const fadeAnim = useRef(new Animated.Value(1)).current
    const progressAnim = useRef(new Animated.Value(0)).current
    const isMountedRef = useRef(true)

    // Load collection scriptures
    useEffect(() => {
        if (selectedCollection && scriptures) {
            const verses = scriptures.filter(s =>
                selectedCollection.scriptures.includes(s.id)
            )
            setCollectionScriptures(verses)
            setCurrentIndex(0)
            setPlayOrder(generateOrder(verses.length, isShuffle))
            setVersesListened(0)

            trackEvent(AnalyticsEventType.PRACTICE_START, {
                practice_type: 'listen_and_learn',
                collection_id: selectedCollection.id,
                collection_name: selectedCollection.name,
                verse_count: verses.length,
            })
        }
    }, [selectedCollection, scriptures])

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true
        return () => {
            isMountedRef.current = false
            stopPlayback()
        }
    }, [])

    // Generate play order
    const generateOrder = (length: number, shuffle: boolean): number[] => {
        const order = Array.from({ length }, (_, i) => i)
        if (shuffle) {
            for (let i = order.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [order[i], order[j]] = [order[j], order[i]]
            }
        }
        return order
    }

    // Get current scripture based on play order
    const currentScripture = collectionScriptures.length > 0 && playOrder.length > 0
        ? collectionScriptures[playOrder[currentIndex]]
        : null

    // Play the current verse via TTS
    const playCurrentVerse = useCallback(async () => {
        if (!currentScripture || !isMountedRef.current) return

        setIsReading(true)

        // Fade in animation
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start()

        // Animate progress bar
        Animated.timing(progressAnim, {
            toValue: (currentIndex + 1) / collectionScriptures.length,
            duration: 300,
            useNativeDriver: false,
        }).start()

        try {
            // First announce the reference
            const textToRead = `${currentScripture.reference}. ${currentScripture.text}`

            await VoicePlaybackService.playScripture(
                currentScripture.id,
                textToRead,
                {
                    rate: speed,
                    pitch: userSettings.voicePitch || 1.0,
                    language: userSettings.language || 'en-US',
                    onStart: () => {
                        if (isMountedRef.current) {
                            setIsReading(true)
                        }
                    },
                    onDone: () => {
                        if (!isMountedRef.current) return
                        setIsReading(false)
                        setVersesListened(prev => prev + 1)

                        // Auto-advance after delay
                        delayTimerRef.current = setTimeout(() => {
                            if (!isMountedRef.current || isPaused) return
                            advanceToNext()
                        }, DELAY_BETWEEN_VERSES_MS)
                    },
                    onError: (error) => {
                        console.error('Listen & Learn playback error:', error)
                        if (isMountedRef.current) {
                            setIsReading(false)
                        }
                    },
                }
            )
        } catch (error) {
            console.error('Failed to play verse:', error)
            setIsReading(false)
        }
    }, [currentScripture, speed, userSettings, isPaused, currentIndex, collectionScriptures.length])

    // Advance to the next verse
    const advanceToNext = useCallback(() => {
        if (!isMountedRef.current) return

        const nextIndex = currentIndex + 1
        if (nextIndex < playOrder.length) {
            // Fade out current
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start(() => {
                if (!isMountedRef.current) return
                setCurrentIndex(nextIndex)
            })
        } else {
            // Reached the end — loop back to start
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start(() => {
                if (!isMountedRef.current) return
                // Regenerate order if shuffle
                if (isShuffle) {
                    setPlayOrder(generateOrder(collectionScriptures.length, true))
                }
                setCurrentIndex(0)
            })
        }
    }, [currentIndex, playOrder.length, isShuffle, collectionScriptures.length])

    // Auto-play when index changes and we're playing
    useEffect(() => {
        if (isPlaying && !isPaused && currentScripture) {
            playCurrentVerse()
        }
    }, [currentIndex, isPlaying, isPaused])

    // Start playback
    const handlePlay = () => {
        setIsPlaying(true)
        setIsPaused(false)
    }

    // Pause playback
    const handlePause = () => {
        setIsPaused(true)
        VoicePlaybackService.stopPlayback()
        setIsReading(false)
        if (delayTimerRef.current) {
            clearTimeout(delayTimerRef.current)
        }
    }

    // Resume playback
    const handleResume = () => {
        setIsPaused(false)
        playCurrentVerse()
    }

    // Stop everything
    const stopPlayback = () => {
        setIsPlaying(false)
        setIsPaused(false)
        setIsReading(false)
        VoicePlaybackService.stopPlayback()
        if (delayTimerRef.current) {
            clearTimeout(delayTimerRef.current)
        }
    }

    // Skip forward
    const handleSkipForward = () => {
        VoicePlaybackService.stopPlayback()
        setIsReading(false)
        if (delayTimerRef.current) {
            clearTimeout(delayTimerRef.current)
        }
        advanceToNext()
    }

    // Skip back
    const handleSkipBack = () => {
        VoicePlaybackService.stopPlayback()
        setIsReading(false)
        if (delayTimerRef.current) {
            clearTimeout(delayTimerRef.current)
        }
        const prevIndex = Math.max(0, currentIndex - 1)
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            if (isMountedRef.current) {
                setCurrentIndex(prevIndex)
            }
        })
    }

    // Toggle shuffle
    const handleToggleShuffle = () => {
        const newShuffle = !isShuffle
        setIsShuffle(newShuffle)
        setPlayOrder(generateOrder(collectionScriptures.length, newShuffle))
        setCurrentIndex(0)
    }

    // Cycle speed
    const handleCycleSpeed = () => {
        const currentSpeedIndex = SPEED_OPTIONS.indexOf(speed)
        const nextIndex = (currentSpeedIndex + 1) % SPEED_OPTIONS.length
        setSpeed(SPEED_OPTIONS[nextIndex])
    }

    // Change collection
    const handleChangeCollection = () => {
        stopPlayback()
        setSelectedCollection(null)
        setCollectionScriptures([])
        setCurrentIndex(0)
    }

    return (
        <ThemedContainer style={styles.container}>
            <ScreenHeader
                title="LISTEN & LEARN"
                subtitle="PASSIVE MEMORIZATION"
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Info Banner */}
                <View style={[styles.infoBanner, { backgroundColor: isDark ? 'rgba(168, 85, 247, 0.15)' : 'rgba(168, 85, 247, 0.1)' }]}>
                    <Ionicons name="headset" size={20} color="#A855F7" />
                    <ThemedText variant="caption" style={[styles.infoText, { color: '#A855F7' }]}>
                        Sit back and listen. Verses are read aloud automatically for passive memorization.
                    </ThemedText>
                </View>

                {!selectedCollection ? (
                    <View style={styles.selectorContainer}>
                        <ThemedText variant="caption" style={styles.sectionTitle}>
                            SELECT A COLLECTION TO LISTEN
                        </ThemedText>
                        <CollectionSelector
                            onSelectCollection={setSelectedCollection}
                            selectedCollection={selectedCollection}
                        />
                    </View>
                ) : (
                    <View style={styles.playerContainer}>
                        {/* Collection Header */}
                        <TouchableOpacity
                            style={[styles.collectionHeader, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                            onPress={handleChangeCollection}
                        >
                            <FontAwesome5 name="folder-open" size={16} color={theme.accent} />
                            <ThemedText variant="body" style={styles.collectionName}>
                                {selectedCollection.name}
                            </ThemedText>
                            <ThemedText variant="caption" style={styles.verseCountLabel}>
                                {collectionScriptures.length} verses
                            </ThemedText>
                            <FontAwesome5 name="exchange-alt" size={12} color={theme.textSecondary} />
                        </TouchableOpacity>

                        {/* Progress */}
                        <View style={styles.progressContainer}>
                            <ThemedText variant="caption" style={styles.progressText}>
                                Verse {currentIndex + 1} of {collectionScriptures.length}
                            </ThemedText>
                            <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                <Animated.View
                                    style={[
                                        styles.progressFill,
                                        {
                                            backgroundColor: '#A855F7',
                                            width: progressAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: ['0%', '100%'],
                                            }),
                                        },
                                    ]}
                                />
                            </View>
                        </View>

                        {/* Current Verse Display */}
                        {currentScripture && (
                            <Animated.View style={[styles.verseCard, { opacity: fadeAnim }]}>
                                <ThemedCard variant="glass" style={styles.verseCardInner}>
                                    <View style={styles.verseHeader}>
                                        <View style={[styles.referenceTag, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                                            <ThemedText variant="caption" style={styles.referenceText}>
                                                {currentScripture.reference}
                                            </ThemedText>
                                        </View>
                                        {isReading && (
                                            <View style={styles.readingIndicator}>
                                                <Ionicons name="volume-high" size={16} color="#A855F7" />
                                                <ThemedText variant="caption" style={[styles.readingLabel, { color: '#A855F7' }]}>
                                                    Reading...
                                                </ThemedText>
                                            </View>
                                        )}
                                    </View>
                                    <ThemedText variant="body" style={styles.verseText}>
                                        {currentScripture.text}
                                    </ThemedText>
                                </ThemedCard>
                            </Animated.View>
                        )}

                        {/* Playback Controls */}
                        <View style={styles.controlsContainer}>
                            {/* Speed & Shuffle Row */}
                            <View style={styles.optionsRow}>
                                <TouchableOpacity
                                    style={[
                                        styles.optionButton,
                                        isShuffle && { backgroundColor: 'rgba(168, 85, 247, 0.2)' },
                                    ]}
                                    onPress={handleToggleShuffle}
                                >
                                    <Ionicons
                                        name="shuffle"
                                        size={20}
                                        color={isShuffle ? '#A855F7' : theme.textSecondary}
                                    />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.optionButton, { paddingHorizontal: 12 }]}
                                    onPress={handleCycleSpeed}
                                >
                                    <ThemedText variant="caption" style={styles.speedText}>
                                        {speed}x
                                    </ThemedText>
                                </TouchableOpacity>
                            </View>

                            {/* Main Controls */}
                            <View style={styles.mainControls}>
                                <TouchableOpacity
                                    style={styles.controlButton}
                                    onPress={handleSkipBack}
                                    disabled={!isPlaying}
                                >
                                    <Ionicons
                                        name="play-skip-back"
                                        size={28}
                                        color={isPlaying ? theme.text : theme.textSecondary}
                                    />
                                </TouchableOpacity>

                                {!isPlaying ? (
                                    <TouchableOpacity
                                        style={[styles.playButton, { backgroundColor: '#A855F7' }]}
                                        onPress={handlePlay}
                                    >
                                        <Ionicons name="play" size={32} color="#FFF" />
                                    </TouchableOpacity>
                                ) : isPaused ? (
                                    <TouchableOpacity
                                        style={[styles.playButton, { backgroundColor: '#A855F7' }]}
                                        onPress={handleResume}
                                    >
                                        <Ionicons name="play" size={32} color="#FFF" />
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        style={[styles.playButton, { backgroundColor: '#A855F7' }]}
                                        onPress={handlePause}
                                    >
                                        <Ionicons name="pause" size={32} color="#FFF" />
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity
                                    style={styles.controlButton}
                                    onPress={handleSkipForward}
                                    disabled={!isPlaying}
                                >
                                    <Ionicons
                                        name="play-skip-forward"
                                        size={28}
                                        color={isPlaying ? theme.text : theme.textSecondary}
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Stop Button */}
                            {isPlaying && (
                                <TouchableOpacity
                                    style={[styles.stopButton, { borderColor: theme.textSecondary }]}
                                    onPress={stopPlayback}
                                >
                                    <Ionicons name="stop" size={16} color={theme.textSecondary} />
                                    <ThemedText variant="caption" style={styles.stopText}>
                                        STOP SESSION
                                    </ThemedText>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Session Stats */}
                        {versesListened > 0 && (
                            <ThemedCard variant="glass" style={styles.statsCard}>
                                <View style={styles.statItem}>
                                    <Ionicons name="ear" size={16} color={theme.accent} />
                                    <ThemedText variant="body" style={styles.statValue}>
                                        {versesListened}
                                    </ThemedText>
                                    <ThemedText variant="caption" style={styles.statLabel}>
                                        Verses Listened
                                    </ThemedText>
                                </View>
                            </ThemedCard>
                        )}
                    </View>
                )}
            </ScrollView>
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
        padding: 16,
        paddingBottom: 100,
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
    },
    selectorContainer: {
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 12,
        letterSpacing: 1.5,
        opacity: 0.7,
        marginBottom: 12,
    },
    playerContainer: {
        marginTop: 8,
    },
    collectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        marginBottom: 16,
        gap: 10,
    },
    collectionName: {
        flex: 1,
        fontWeight: '600',
    },
    verseCountLabel: {
        opacity: 0.6,
    },
    progressContainer: {
        marginBottom: 20,
    },
    progressText: {
        marginBottom: 8,
        opacity: 0.7,
        textAlign: 'center',
    },
    progressBar: {
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    verseCard: {
        marginBottom: 24,
    },
    verseCardInner: {
        padding: 24,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(168, 85, 247, 0.2)',
    },
    verseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    referenceTag: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 6,
    },
    referenceText: {
        color: '#A855F7',
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    readingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    readingLabel: {
        fontWeight: '600',
    },
    verseText: {
        fontSize: 18,
        lineHeight: 28,
    },
    controlsContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    optionsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 20,
    },
    optionButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    speedText: {
        fontWeight: '700',
        fontSize: 13,
    },
    mainControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        marginBottom: 16,
    },
    controlButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#A855F7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    stopButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
    },
    stopText: {
        letterSpacing: 1,
    },
    statsCard: {
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    statItem: {
        alignItems: 'center',
        gap: 4,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
    },
    statLabel: {
        opacity: 0.6,
    },
})
