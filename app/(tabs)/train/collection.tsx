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

export default function CollectionDrillScreen() {
    const {
        scriptures,
        isDark,
        theme,
        updateScriptureAccuracy,
    } = useAppStore()

    const router = useRouter()
    const { trackEvent } = useAnalytics()

    // Track screen view
    useScreenTracking('collection_drill')

    const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
    const [currentScripture, setCurrentScripture] = useState<Scripture | null>(null)
    const [scriptureIndex, setScriptureIndex] = useState(0)
    const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

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

        // Update scripture accuracy (no VP in training mode)
        await updateScriptureAccuracy(currentScripture.id, accuracy)

        trackEvent(AnalyticsEventType.PRACTICE_COMPLETE, {
            practice_type: 'collection_drill',
            collection_id: selectedCollection.id,
            scripture_id: currentScripture.id,
            accuracy: accuracy,
            is_training: true
        })

        setShowVoiceRecorder(false)

        // Show feedback
        const collectionScriptures = scriptures?.filter(s =>
            selectedCollection.scriptures.includes(s.id)
        ) || []

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
                    { text: 'Try Again', onPress: () => setShowVoiceRecorder(true) }
                ]
            )
        } else {
            Alert.alert(
                'Keep Practicing! 💪',
                `${accuracy}% accuracy - you're getting there!`,
                [
                    { text: 'Try Again', onPress: () => setShowVoiceRecorder(true) },
                    { text: 'Skip', onPress: loadNextScripture }
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
                                            backgroundColor: theme.accent
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

                        {/* Practice Button */}
                        <TouchableOpacity
                            style={[styles.practiceButton, { backgroundColor: theme.accent }]}
                            onPress={() => setShowVoiceRecorder(true)}
                        >
                            <FontAwesome5 name="microphone" size={20} color="#FFF" />
                            <ThemedText variant="body" style={styles.practiceButtonText}>
                                Start Practice
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
