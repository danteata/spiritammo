import React, { useState, useCallback, useRef } from 'react'
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native'
import { FontAwesome5, Ionicons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedContainer, ThemedText } from '@/components/Themed'
import ScreenHeader from '@/components/ScreenHeader'
import ScriptureScopeBar from '@/components/ScriptureScopeBar'
import UnifiedScriptureRecorderCard from '@/components/UnifiedScriptureRecorderCard'
import ScriptureActionRow from '@/components/ScriptureActionRow'
import StealthDrill from '@/components/StealthDrill'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'
import { AnalyticsEventType } from '@/services/analytics'
import { useBattleIntel } from '@/hooks/useBattleIntel'
import { usePracticeCompletion } from '@/hooks/usePracticeCompletion'
import { useScriptureScope } from '@/hooks/useScriptureScope'
import { useVerseNavigation } from '@/hooks/useVerseNavigation'
import { Collection } from '@/types/scripture'

export default function BattleScreen() {
    const {
        scriptures: allScriptures,
        collections,
        isDark,
        theme,
        userSettings,
    } = useAppStore()

    const params = useLocalSearchParams()
    const router = useRouter()
    const { trackEvent } = useAnalytics()
    useScreenTracking('battle_screen')

    const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
    const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([])
    const [showStealthDrill, setShowStealthDrill] = useState(false)
    const [battlesWon, setBattlesWon] = useState(0)

    const scopedScriptures = useScriptureScope(allScriptures, selectedCollection, selectedChapterIds)

    const { totalVP, handleComplete } = usePracticeCompletion({
        practiceType: selectedCollection ? 'collection_battle' : 'quick_battle',
        isTraining: false,
        awardVP: true,
        saveLog: true,
        updateProfile: true,
        updateSRS: true,
        afterActionBriefing: true,
    })

    const scriptureRef = useRef<any>(null)
    scriptureRef.current = null

    const {
        currentScripture,
        verseOrder,
        setVerseOrder,
        progress,
        isLoading,
        loadNextScripture,
        scriptureRef: navScriptureRef,
    } = useVerseNavigation({
        scriptures: scopedScriptures,
        initialOrder: (params.mode as 'random' | 'sequential') || 'random',
    })

    const getCurrentScripture = useCallback(() => navScriptureRef.current || null, [navScriptureRef])

    const {
        isLoadingIntel,
        isListeningIntel,
        intelText,
        handleShowIntel,
        handleListenIntel,
    } = useBattleIntel(getCurrentScripture, {
        rate: userSettings?.voiceRate,
        pitch: userSettings?.voicePitch,
        language: userSettings?.language,
    })

    const handleRecordingComplete = async (accuracy: number) => {
        if (!currentScripture) return

        const result = await handleComplete(currentScripture, accuracy)
        if (accuracy >= 80) setBattlesWon(prev => prev + 1)

        trackEvent(AnalyticsEventType.PRACTICE_COMPLETE, {
            practice_type: selectedCollection ? 'collection_battle' : 'quick_battle',
            collection_id: selectedCollection?.id,
            scripture_id: currentScripture.id,
            accuracy,
            vp_earned: result.vpEarned,
            is_training: false,
        })

        const isLast = verseOrder === 'sequential' && progress && progress.current >= progress.total

        if (isLast) {
            Alert.alert(
                'Battle Complete! 🏆',
                `You earned ${totalVP + result.vpEarned} Valor Points!\nAccuracy: ${accuracy}%`,
                [
                    { text: 'View Results', onPress: () => router.back() },
                    { text: 'Battle Again', onPress: () => {} },
                ]
            )
        } else if (accuracy >= 80) {
            Alert.alert('Excellent! ⚔️', `+${result.vpEarned} VP | ${accuracy}% accuracy`, [
                { text: 'Next Verse', onPress: loadNextScripture },
                { text: 'Improve Score', onPress: () => {} },
            ])
        } else {
            Alert.alert('Keep Fighting! 💪', `+${result.vpEarned} VP | ${accuracy}% accuracy`, [
                { text: 'Try Again', onPress: () => {} },
                { text: 'Next Verse', onPress: loadNextScripture },
            ])
        }
    }

    const handleSkip = () => {
        if (verseOrder === 'sequential' && progress && progress.current >= progress.total) {
            router.back()
        } else {
            loadNextScripture()
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

    const headerTitle = selectedCollection ? 'COLLECTION ASSAULT' : 'QUICK SKIRMISH'
    const headerSubtitle = verseOrder === 'random' ? 'RANDOM VERSE BATTLE' : 'SEQUENTIAL VERSE BATTLE'

    return (
        <ThemedContainer style={styles.container}>
            <ScreenHeader title={headerTitle} subtitle={headerSubtitle} />

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

                {/* Scope Filter + Order Toggle */}
                <ScriptureScopeBar
                    selectedCollection={selectedCollection}
                    selectedChapterIds={selectedChapterIds}
                    onCollectionChange={setSelectedCollection}
                    onChapterIdsChange={setSelectedChapterIds}
                    verseOrder={verseOrder}
                    onOrderChange={setVerseOrder}
                    isDark={isDark}
                    theme={theme}
                />

                {/* Progress (sequential only) */}
                {progress && (
                    <View style={styles.progressContainer}>
                        <ThemedText variant="caption" style={styles.progressText}>
                            Verse {progress.current} of {progress.total}
                        </ThemedText>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${(progress.current / progress.total) * 100}%`, backgroundColor: '#EF4444' }]} />
                        </View>
                    </View>
                )}

                {/* Scripture Card */}
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.accent} />
                        <ThemedText variant="body" style={styles.loadingText}>Finding opponent...</ThemedText>
                    </View>
                ) : currentScripture ? (
                    <View style={styles.scriptureContainer}>
                        <View style={styles.verseHeader}>
                            <FontAwesome5 name="crosshairs" size={16} color="#EF4444" />
                            <ThemedText variant="caption" style={styles.verseLabel}>TARGET VERSE</ThemedText>
                        </View>
                        <UnifiedScriptureRecorderCard
                            scripture={currentScripture}
                            isBattleMode
                            onRecordingComplete={handleRecordingComplete}
                            onListen={handleListenIntel}
                            isListening={isListeningIntel}
                            intelText={intelText}
                            onIntel={handleShowIntel}
                            onReadIntelAloud={handleListenIntel}
                            isListeningIntel={isListeningIntel}
                        />
                        <ScriptureActionRow
                            onStealth={handleStartStealthBattle}
                            onIntel={handleShowIntel}
                            isLoadingIntel={isLoadingIntel}
                            accentColor="#EF4444"
                        />
                    </View>
                ) : (
                    <View style={styles.emptyContainer}>
                        <FontAwesome5 name="book" size={48} color={theme.textSecondary} />
                        <ThemedText variant="body" style={styles.emptyText}>No verses available for battle.</ThemedText>
                    </View>
                )}

                {/* Skip Button */}
                {currentScripture && (
                    <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                        <FontAwesome5 name="fast-forward" size={16} color={theme.textSecondary} />
                        <ThemedText variant="caption" style={styles.skipText}>SKIP TARGET</ThemedText>
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
    container: { flex: 1 },
    scrollView: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 40 },
    warningBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 16, gap: 10 },
    warningText: { flex: 1, opacity: 0.8, color: '#FF6B35' },
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    statCard: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 12, gap: 6 },
    statNumber: { fontSize: 22, fontWeight: '700' },
    statLabel: { opacity: 0.6, fontSize: 10, letterSpacing: 1 },
    progressContainer: { marginBottom: 20 },
    progressText: { marginBottom: 8, opacity: 0.7 },
    progressBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 2 },
    scriptureContainer: { marginBottom: 20 },
    verseHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    verseLabel: { letterSpacing: 1.5, opacity: 0.7 },
    loadingContainer: { alignItems: 'center', padding: 40 },
    loadingText: { marginTop: 16, opacity: 0.7 },
    emptyContainer: { alignItems: 'center', padding: 40 },
    emptyText: { marginTop: 16, opacity: 0.7, textAlign: 'center' },
    skipButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, marginTop: 12, gap: 8 },
    skipText: { opacity: 0.7, fontWeight: 'bold', letterSpacing: 1 },
})