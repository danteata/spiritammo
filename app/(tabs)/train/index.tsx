import React, { useState, useEffect } from 'react'
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Text,
    Dimensions,
} from 'react-native'
import { FontAwesome5, FontAwesome, Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'
import ScreenHeader from '@/components/ScreenHeader'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'
import { AnalyticsEventType } from '@/services/analytics'
import CollectionSelector from '@/components/CollectionSelector'
import CollectionChapterSelector from '@/components/CollectionChapterSelector'
import { Collection } from '@/types/scripture'

const { width } = Dimensions.get('window')

type TrainingMode = 'single' | 'burst' | 'automatic'

export default function TrainingScreen() {
    const { isLoading, theme, isDark, userStats, scriptures, collections } = useAppStore()
    const router = useRouter()
    const params = useLocalSearchParams()
    const { trackEvent } = useAnalytics()

    const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
    const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([])
    const [showChapterSelector, setShowChapterSelector] = useState(false)

    // Track screen view
    useScreenTracking('training')

    const handleModeSelect = (mode: TrainingMode) => {
        trackEvent(AnalyticsEventType.PRACTICE_START, {
            practice_type: 'training_mode_selected',
            mode_selected: mode,
            collection_id: selectedCollection?.id,
            chapter_ids: selectedChapterIds.length > 0 ? selectedChapterIds.join(',') : undefined
        })
        // Navigate to training practice screen with collection and chapter info
        router.push({
            pathname: '/train/practice',
            params: {
                mode,
                collectionId: selectedCollection?.id,
                chapterIds: selectedChapterIds.length > 0 ? selectedChapterIds.join(',') : undefined
            }
        })
    }

    const handleCollectionPractice = () => {
        trackEvent(AnalyticsEventType.PRACTICE_START, {
            practice_type: 'collection_training',
            source: 'training_screen'
        })
        router.push('/train/collection')
    }

    const verseCount = scriptures?.length || 0
    const collectionCount = collections?.length || 0

    const displayVerseCount = selectedCollection
        ? selectedCollection.scriptures.length
        : verseCount

    return (
        <ThemedContainer style={styles.container}>
            <ScreenHeader
                title="PRACTICE AREA"
                subtitle="LEARN AT YOUR PACE"
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Info Banner */}
                <View style={[styles.infoBanner, { backgroundColor: isDark ? `${theme.accent}15` : theme.surface, borderColor: isDark ? 'transparent' : theme.border, borderWidth: isDark ? 0 : 1.5 }]}>
                    <Ionicons name="information-circle" size={18} color={isDark ? theme.accent : theme.textSecondary} />
                    <ThemedText variant="caption" style={[styles.infoText, { color: isDark ? theme.accent : theme.textSecondary }]}>
                        Practice mode is pressure-free. Learn at your own pace without affecting your stats.
                    </ThemedText>
                </View>

                {/* Quick Stats */}
                {/* <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                        <FontAwesome5 name="book" size={20} color={theme.accent} />
                        <ThemedText variant="heading" style={styles.statNumber}>{displayVerseCount}</ThemedText>
                        <ThemedText variant="caption" style={styles.statLabel}>Verses</ThemedText>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                        <FontAwesome name="folder" size={20} color={theme.accent} />
                        <ThemedText variant="heading" style={styles.statNumber}>{collectionCount}</ThemedText>
                        <ThemedText variant="caption" style={styles.statLabel}>Collections</ThemedText>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                        <Ionicons name="time" size={20} color={theme.accent} />
                        <ThemedText variant="heading" style={styles.statNumber}>{userStats?.totalPracticed || 0}</ThemedText>
                        <ThemedText variant="caption" style={styles.statLabel}>Sessions</ThemedText>
                    </View>
                </View> */}

                {/* Load Ammunition */}
                <View style={styles.collectionSection}>
                    {/* <ThemedText variant="caption" style={styles.sectionTitle}>
                        LOAD ARSENAL (OPTIONAL)
                    </ThemedText> */}
                    <CollectionSelector
                        selectedCollection={selectedCollection}
                        onSelectCollection={setSelectedCollection}
                    />
                    
                    {selectedCollection && (
                        <>
                            <CollectionChapterSelector
                                collection={selectedCollection}
                                isVisible={false}
                                onClose={() => setShowChapterSelector(true)}
                                onStartPractice={setSelectedChapterIds}
                                initialSelectedChapterIds={selectedChapterIds}
                                variant="dropdown"
                            />
                            
                            <CollectionChapterSelector
                                collection={selectedCollection}
                                isVisible={showChapterSelector}
                                onClose={() => setShowChapterSelector(false)}
                                onStartPractice={(chapterIds) => {
                                    setSelectedChapterIds(chapterIds)
                                    setShowChapterSelector(false)
                                }}
                                initialSelectedChapterIds={selectedChapterIds}
                                variant="modal"
                            />
                        </>
                    )}
                </View>

                {/* Training Mode Selection */}
                <View style={[styles.modesSection, { marginTop: 10 }]}>
                    <ThemedText variant="caption" style={styles.sectionTitle}>
                        CHOOSE DRILL
                    </ThemedText>

                    {/* Single Mode - Focus on one verse */}
                    <TouchableOpacity
                        style={styles.modeCard}
                        onPress={() => handleModeSelect('single')}
                        activeOpacity={0.9}
                    >
                        <ThemedCard variant="glass" style={[styles.modeCardInner, styles.primaryMode, !isDark && { borderColor: theme.accent }]}>
                            <View style={styles.modeIconContainer}>
                                <View style={[styles.modeIcon, { backgroundColor: `${theme.accent}15` }]}>
                                    <Ionicons name="eye" size={28} color={theme.accent} />
                                </View>
                            </View>
                            <View style={styles.modeContent}>
                                <ThemedText variant="heading" style={[styles.modeTitle, { letterSpacing: 1.5, color: theme.accent }]}>SINGLE FOCUS</ThemedText>
                                <ThemedText variant="body" style={[styles.modeDescription, { color: theme.textSecondary }]}>
                                    Deep memorization drill. Master one target verse at a time before advancing.
                                </ThemedText>
                                <View style={[styles.modeTag, { backgroundColor: `${theme.accent}15` }]}>
                                    <ThemedText variant="caption" style={[styles.modeTagText, { color: theme.accent }]}>Deep Focus</ThemedText>
                                </View>
                            </View>
                            <View style={styles.modeArrow}>
                                <FontAwesome5 name="chevron-right" size={14} color={isDark ? theme.textSecondary : '#6B7B3A'} />
                            </View>
                        </ThemedCard>
                    </TouchableOpacity>

                    {/* Burst Mode - Rapid fire */}
                    <TouchableOpacity
                        style={styles.modeCard}
                        onPress={() => handleModeSelect('burst')}
                        activeOpacity={0.9}
                    >
                        <ThemedCard variant="glass" style={[styles.modeCardInner, !isDark && { borderColor: theme.success }]}>
                            <View style={styles.modeIconContainer}>
                                <View style={[styles.modeIcon, { backgroundColor: `${theme.success}15` }]}>
                                    <Ionicons name="flash" size={28} color={theme.success} />
                                </View>
                            </View>
                            <View style={styles.modeContent}>
                                <ThemedText variant="heading" style={[styles.modeTitle, { letterSpacing: 1.5, color: theme.success }]}>BURST FIRE</ThemedText>
                                <ThemedText variant="body" style={[styles.modeDescription, { color: theme.textSecondary }]}>
                                    Rapid-fire tactical drill for quick recall. Engage multiple familiar verses in succession.
                                </ThemedText>
                                <View style={[styles.modeTag, { backgroundColor: `${theme.success}15` }]}>
                                    <ThemedText variant="caption" style={[styles.modeTagText, { color: theme.success }]}>Quick Review</ThemedText>
                                </View>
                            </View>
                            <View style={styles.modeArrow}>
                                <FontAwesome5 name="chevron-right" size={14} color={isDark ? theme.textSecondary : '#6B7B3A'} />
                            </View>
                        </ThemedCard>
                    </TouchableOpacity>

                    {/* Automatic Mode - Hands-free */}
                    <TouchableOpacity
                        style={styles.modeCard}
                        onPress={() => handleModeSelect('automatic')}
                        activeOpacity={0.9}
                    >
                        <ThemedCard variant="glass" style={[styles.modeCardInner, !isDark && { borderColor: theme.warning }]}>
                            <View style={styles.modeIconContainer}>
                                <View style={[styles.modeIcon, { backgroundColor: `${theme.warning}15` }]}>
                                    <Ionicons name="infinite" size={28} color={theme.warning} />
                                </View>
                            </View>
                            <View style={styles.modeContent}>
                                <ThemedText variant="heading" style={[styles.modeTitle, { letterSpacing: 1.5, color: theme.warning }]}>AUTO PILOT</ThemedText>
                                <ThemedText variant="body" style={[styles.modeDescription, { color: theme.textSecondary }]}>
                                    Verses read aloud automatically, one after another. Just listen and absorb.
                                </ThemedText>
                                <View style={[styles.modeTag, { backgroundColor: `${theme.warning}15` }]}>
                                    <ThemedText variant="caption" style={[styles.modeTagText, { color: theme.warning }]}>Passive Learning</ThemedText>
                                </View>
                            </View>
                            <View style={styles.modeArrow}>
                                <FontAwesome5 name="chevron-right" size={14} color={theme.textSecondary} />
                            </View>
                        </ThemedCard>
                    </TouchableOpacity>
                </View>

                {/* Tips Section */}
                <View style={styles.tipsSection}>
                    <ThemedText variant="caption" style={styles.sectionTitle}>
                        TRAINING INTEL
                    </ThemedText>
                    <ThemedCard variant="glass" style={styles.tipCard}>
                        <View style={styles.tipItem}>
                            <FontAwesome5 name="bullseye" size={14} color={theme.accent} />
                            <ThemedText variant="body" style={styles.tipText}>
                                Use Single Focus for deep coordinate precision
                            </ThemedText>
                        </View>
                        <View style={styles.tipItem}>
                            <FontAwesome5 name="bullseye" size={14} color={theme.accent} />
                            <ThemedText variant="body" style={styles.tipText}>
                                Switch to Burst Fire for rapid-fire review sessions
                            </ThemedText>
                        </View>
                        <View style={styles.tipItem}>
                            <FontAwesome5 name="bullseye" size={14} color={theme.accent} />
                            <ThemedText variant="body" style={styles.tipText}>
                                Use Auto Pilot for passive reconnaissance & absorption
                            </ThemedText>
                        </View>
                        <View style={styles.tipItem}>
                            <FontAwesome5 name="bullseye" size={14} color={theme.accent} />
                            <ThemedText variant="body" style={styles.tipText}>
                                Ready for combat? Deploy to Battle Mode!
                            </ThemedText>
                        </View>
                    </ThemedCard>
                </View>
            </ScrollView>

            <LoadingOverlay visible={isLoading} />
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
        borderRadius: 8,
        marginBottom: 16,
        gap: 8,
    },
    infoText: {
        flex: 1,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginHorizontal: 4,
    },
    statNumber: {
        fontSize: 20,
        marginTop: 4,
    },
    statLabel: {
        fontSize: 10,
        opacity: 0.7,
        marginTop: 2,
    },
    modesSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 11,
        letterSpacing: 2,
        opacity: 0.7,
        marginBottom: 12,
        fontWeight: '700',
    },
    modeCard: {
        marginBottom: 10,
    },
    modeCardInner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 8,
    },
    primaryMode: {
        borderWidth: 2,
    },
    modeIconContainer: {
        marginRight: 12,
    },
    modeIcon: {
        width: 52,
        height: 52,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modeContent: {
        flex: 1,
    },
    modeTitle: {
        fontSize: 16,
        marginBottom: 4,
    },
    modeDescription: {
        fontSize: 12,
        opacity: 0.7,
        lineHeight: 18,
    },
    modeTag: {
        marginTop: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    modeTagText: {
        fontSize: 10,
    },
    modeArrow: {
        marginLeft: 8,
    },
    collectionSection: {
        marginBottom: 24,
    },
    listenMode: {
        borderWidth: 2,
    },
    tipsSection: {
        marginBottom: 24,
    },
    tipCard: {
        padding: 16,
        borderRadius: 8,
    },
    tipItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    tipText: {
        flex: 1,
        fontSize: 13,
    },
    chapterSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 12,
        gap: 12,
    },
    chapterSelectorContent: {
        flex: 1,
    },
    chapterSelectorText: {
        fontWeight: '600',
        fontSize: 14,
    },
    chapterSelectorSubtext: {
        fontSize: 11,
        marginTop: 2,
        opacity: 0.7,
    },
    chapterSection: {
        marginTop: 12,
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
    },
    chapterSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    chapterSectionTitle: {
        fontWeight: '600',
        letterSpacing: 1,
    },
    chapterList: {
        maxHeight: 200,
    },
    chapterItem: {
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 6,
        padding: 10,
    },
    chapterItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    chapterItemInfo: {
        flex: 1,
    },
    chapterItemName: {
        fontWeight: '500',
        fontSize: 13,
    },
    chapterItemCount: {
        fontSize: 11,
        marginTop: 2,
    },
    chapterActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    chapterActionButton: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 6,
        borderWidth: 1,
        alignItems: 'center',
    },
    chapterActionText: {
        fontWeight: '600',
        letterSpacing: 0.5,
    },
})
