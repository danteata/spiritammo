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
import UnifiedScriptureRecorderCard from '@/components/UnifiedScriptureRecorderCard'
import ScriptureActionRow from '@/components/ScriptureActionRow'
import StealthDrill from '@/components/StealthDrill'
import { Scripture } from '@/types/scripture'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'
import { practiceLogService } from '@/services/practiceLogService'
import { generateBattleIntel } from '@/services/battleIntelligence'
import { militaryRankingService } from '@/services/militaryRanking'
import ValorPointsService from '@/services/valorPoints'

export default function QuickBattleScreen() {
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
    useScreenTracking('quick_battle')

    const [currentScripture, setCurrentScripture] = useState<Scripture | null>(null)
    const [totalVP, setTotalVP] = useState(0)
    const [battlesWon, setBattlesWon] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [showStealthDrill, setShowStealthDrill] = useState(false)

    const [isLoadingIntel, setIsLoadingIntel] = useState(false)

    // Load a random scripture on mount
    useEffect(() => {
        loadRandomScripture()
    }, [scriptures])

    const loadRandomScripture = () => {
        setIsLoading(true)
        try {
            if (scriptures && scriptures.length > 0) {
                const randomIndex = Math.floor(Math.random() * scriptures.length)
                setCurrentScripture(scriptures[randomIndex])
            }
        } catch (error) {
            console.error('Error loading scripture:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleRecordingComplete = async (accuracy: number) => {
        if (!currentScripture) return

        // Update scripture accuracy
        await updateScriptureAccuracy(currentScripture.id, accuracy)

        // Calculate and award Valor Points
        const vpEarned = ValorPointsService.calculateVPReward(accuracy, userStats?.streak || 0, userStats?.rank)
        setTotalVP(prev => prev + vpEarned)
        addValorPoints(vpEarned, 'quick_battle')

        trackEvent(AnalyticsEventType.PRACTICE_COMPLETE, {
            practice_type: 'quick_battle',
            scripture_id: currentScripture.id,
            accuracy: accuracy,
            vp_earned: vpEarned,
            is_training: false
        })

        // Save mission log
        await practiceLogService.saveLog({
            scriptureId: currentScripture.id,
            accuracy: accuracy,
            transcription: '', // VoiceRecorder doesn't return transcript yet
        })

        // Update military profile
        await militaryRankingService.updateProfile({
            versesMemorized: userStats?.totalPracticed || 0,
            averageAccuracy: userStats?.averageAccuracy || 0,
            consecutiveDays: userStats?.streak || 0,
            lastSessionAccuracy: accuracy,
            lastSessionWordCount: currentScripture.text.split(' ').length
        })

        // Show feedback based on performance
        if (accuracy >= 80) {
            setBattlesWon(prev => prev + 1)
            Alert.alert(
                'VICTORY! ⚔️',
                `+${vpEarned} VP | ${accuracy}% accuracy`,
                [
                    { text: 'Next Battle', onPress: loadRandomScripture },
                    { text: 'Improve Score', onPress: () => { } }
                ]
            )
        } else if (accuracy >= 60) {
            Alert.alert(
                'HARD FOUGHT! 💪',
                `+${vpEarned} VP | ${accuracy}% accuracy`,
                [
                    { text: 'Try Again', onPress: () => { } },
                    { text: 'Next Battle', onPress: loadRandomScripture }
                ]
            )
        } else {
            Alert.alert(
                'REGROUP! 🎯',
                `${accuracy}% accuracy - Practice makes perfect!`,
                [
                    { text: 'Try Again', onPress: () => { } },
                    { text: 'Next Verse', onPress: loadRandomScripture }
                ]
            )
        }
    }

    const handleShowIntel = async () => {
        if (!currentScripture) return

        setIsLoadingIntel(true)
        try {
            const intel = await generateBattleIntel({
                reference: currentScripture.reference,
                text: currentScripture.text
            })

            Alert.alert(
                'BATTLE INTELLIGENCE 📡',
                `MNEMONIC: ${intel.battlePlan}\n\nTACTICAL NOTES: ${intel.tacticalNotes}`,
                [{ text: 'COPY THAT' }]
            )

            // Record intel generation for rank progress
            await militaryRankingService.recordIntelGenerated()
        } catch (error) {
            console.error('Failed to get intel:', error)
            Alert.alert('SYSTEM ERROR', 'Failed to retrieve battle intelligence. Check communications.')
        } finally {
            setIsLoadingIntel(false)
        }
    }

    const handleStartStealthBattle = () => {
        if (!currentScripture) return
        setShowStealthDrill(true)
        trackEvent(AnalyticsEventType.PRACTICE_START, {
            practice_type: 'stealth_battle',
            scripture_id: currentScripture.id,
            is_training: false,
        })
    }

    return (
        <ThemedContainer style={styles.container}>
            <ScreenHeader
                title="QUICK SKIRMISH"
                subtitle="RANDOM VERSE BATTLE"
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

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                        <FontAwesome5 name="coins" size={20} color="#FFD700" />
                        <ThemedText variant="heading" style={styles.statNumber}>{totalVP}</ThemedText>
                        <ThemedText variant="caption" style={styles.statLabel}>VP Earned</ThemedText>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                        <FontAwesome5 name="trophy" size={20} color="#22C55E" />
                        <ThemedText variant="heading" style={styles.statNumber}>{battlesWon}</ThemedText>
                        <ThemedText variant="caption" style={styles.statLabel}>Victories</ThemedText>
                    </View>
                </View>

                {/* Scripture Card */}
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.accent} />
                        <ThemedText variant="body" style={styles.loadingText}>
                            Finding opponent...
                        </ThemedText>
                    </View>
                ) : currentScripture ? (
                    <View style={styles.scriptureContainer}>
                        <View style={styles.verseHeader}>
                            <FontAwesome5 name="crosshairs" size={16} color="#EF4444" />
                            <ThemedText variant="caption" style={styles.verseLabel}>
                                TARGET VERSE
                            </ThemedText>
                        </View>
                        <UnifiedScriptureRecorderCard
                            scripture={currentScripture}
                            isBattleMode
                            intelText={`Reference: ${currentScripture.reference}`}
                            onRecordingComplete={handleRecordingComplete}
                        />
                        <ScriptureActionRow
                            onStealth={handleStartStealthBattle}
                            onIntel={handleShowIntel}
                            isLoadingIntel={isLoadingIntel}
                            accentColor="#EF4444"
                        />
                    </View>
                ) : (
                    <ThemedCard variant="glass" style={styles.emptyState}>
                        <FontAwesome5 name="book" size={48} color={theme.textSecondary} />
                        <ThemedText variant="body" style={styles.emptyText}>
                            No verses available for battle.
                        </ThemedText>
                        <TouchableOpacity
                            style={[styles.addButton, { backgroundColor: theme.accent }]}
                            onPress={() => router.push('/arsenal')}
                        >
                            <ThemedText variant="body" style={styles.addButtonText}>
                                Add Verses
                            </ThemedText>
                        </TouchableOpacity>
                    </ThemedCard>
                )}

                {/* Skip Button */}
                {currentScripture && (
                    <TouchableOpacity
                        style={styles.skipButton}
                        onPress={loadRandomScripture}
                    >
                        <FontAwesome5 name="random" size={16} color={theme.textSecondary} />
                        <ThemedText variant="caption" style={styles.skipText}>
                            Next Verse
                        </ThemedText>
                    </TouchableOpacity>
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
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    statNumber: {
        fontSize: 24,
    },
    statLabel: {
        opacity: 0.7,
    },
    loadingContainer: {
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        marginTop: 16,
        opacity: 0.7,
    },
    scriptureContainer: {
        marginBottom: 20,
    },
    verseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    verseLabel: {
        letterSpacing: 1.5,
        opacity: 0.7,
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        marginTop: 16,
        textAlign: 'center',
        opacity: 0.7,
    },
    addButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 16,
    },
    addButtonText: {
        color: '#FFF',
        fontWeight: '600',
    },
    battleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#EF4444',
        gap: 10,
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
