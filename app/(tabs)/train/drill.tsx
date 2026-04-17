import React, { useState } from 'react'
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    TextInput,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedContainer, ThemedText } from '@/components/Themed'
import ScreenHeader from '@/components/ScreenHeader'
import ScriptureScopeBar from '@/components/ScriptureScopeBar'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'
import { AnalyticsEventType } from '@/services/analytics'
import { Collection } from '@/types/scripture'
import { useScriptureScope } from '@/hooks/useScriptureScope'

export default function CollectionDrillScreen() {
    const {
        scriptures: allScriptures,
        collections,
        isDark,
        theme,
    } = useAppStore()

    const router = useRouter()
    const { trackEvent } = useAnalytics()

    useScreenTracking('collection_drill')

    const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
    const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([])
    const [showCustom, setShowCustom] = useState(false)
    const [questionLimit, setQuestionLimit] = useState(20)
    const [timeLimit, setTimeLimit] = useState<number | null>(null)
    const [isCustomTime, setIsCustomTime] = useState(false)
    const [customMins, setCustomMins] = useState('')

    const filteredScriptures = useScriptureScope(
        allScriptures,
        selectedCollection,
        selectedChapterIds,
    )

    const verseCount = filteredScriptures.length

    const handleQuickDrill = () => {
        if (!selectedCollection) return
        router.push({
            pathname: '/train/quiz',
            params: { collectionId: selectedCollection.id, quick: '1' }
        })
        trackEvent(AnalyticsEventType.QUIZ_STARTED, {
            collection_id: selectedCollection.id,
        })
    }

    const handleCustomDrill = () => {
        if (!selectedCollection) return
        router.push({
            pathname: '/train/quiz',
            params: {
                collectionId: selectedCollection.id,
                questionLimit: String(questionLimit),
                timeLimit: timeLimit !== null ? String(timeLimit) : '',
            }
        })
        trackEvent(AnalyticsEventType.QUIZ_STARTED, {
            collection_id: selectedCollection.id,
            question_limit: questionLimit,
            time_limit: timeLimit,
        })
    }

    const accentColor = theme.accent

    return (
        <ThemedContainer style={styles.container}>
            <ScreenHeader
                title="LIVE FIRE DRILL"
                subtitle="TACTICAL PRACTICE"
                rightAction={
                    <TouchableOpacity onPress={() => router.replace('/train')} style={styles.modesButton}>
                        <Ionicons name="grid" size={20} color={theme.textSecondary} />
                        <ThemedText variant="caption" style={[styles.modesText, { color: theme.textSecondary }]}>Modes</ThemedText>
                    </TouchableOpacity>
                }
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.modeIndicator, { backgroundColor: isDark ? `${accentColor}15` : `${accentColor}10` }]}>
                    <Ionicons name="flash" size={20} color={accentColor} />
                    <ThemedText variant="caption" style={[styles.modeIndicatorText, { color: accentColor }]}>
                        Live Fire Drill — True/false questions from your verses
                    </ThemedText>
                </View>

                <ScriptureScopeBar
                    selectedCollection={selectedCollection}
                    selectedChapterIds={selectedChapterIds}
                    onCollectionChange={setSelectedCollection}
                    onChapterIdsChange={setSelectedChapterIds}
                    verseOrder="random"
                    onOrderChange={() => {}}
                    isDark={isDark}
                    theme={theme}
                    showOrderToggle={false}
                />

                {selectedCollection && (
                    <View style={styles.configSection}>
                        <View style={styles.verseCountRow}>
                            <Ionicons name="book" size={16} color={accentColor} />
                            <ThemedText variant="caption" style={{ color: accentColor, fontWeight: '700', letterSpacing: 1 }}>
                                {verseCount} VERSE{verseCount !== 1 ? 'S' : ''} LOADED
                            </ThemedText>
                        </View>

                        <TouchableOpacity
                            style={[styles.quickButton, { backgroundColor: theme.success }]}
                            onPress={handleQuickDrill}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="flash" size={24} color="#FFF" />
                            <ThemedText variant="body" style={styles.quickButtonText}>
                                QUICK DRILL
                            </ThemedText>
                        </TouchableOpacity>
                        <ThemedText variant="caption" style={styles.quickHint}>
                            10 questions, no time limit
                        </ThemedText>

                        <TouchableOpacity
                            style={styles.advancedToggle}
                            onPress={() => setShowCustom(!showCustom)}
                        >
                            <Ionicons name={showCustom ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                            <ThemedText variant="caption" style={{ color: theme.textSecondary }}>Custom Drill Options</ThemedText>
                        </TouchableOpacity>

                        {showCustom && (
                            <View style={styles.customSection}>
                                <ThemedText variant="subheading" style={styles.sectionHeading}>
                                    MISSION LENGTH
                                </ThemedText>
                                <View style={styles.optionRow}>
                                    {[10, 20, 50, 100].map(limit => (
                                        <TouchableOpacity
                                            key={limit}
                                            style={[
                                                styles.configChip,
                                                {
                                                    backgroundColor: questionLimit === limit ? accentColor : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
                                                    borderColor: questionLimit === limit ? accentColor : 'transparent',
                                                },
                                            ]}
                                            onPress={() => setQuestionLimit(limit)}
                                        >
                                            <ThemedText
                                                variant="caption"
                                                style={{
                                                    fontWeight: '700',
                                                    color: questionLimit === limit ? theme.background : theme.text,
                                                }}
                                            >
                                                {limit}
                                            </ThemedText>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <ThemedText variant="subheading" style={styles.sectionHeading}>
                                    TIME LIMIT
                                </ThemedText>
                                <View style={styles.optionRow}>
                                    {[null, 5, 15, 30].map(mins => (
                                        <TouchableOpacity
                                            key={mins === null ? 'none' : mins}
                                            style={[
                                                styles.configChip,
                                                {
                                                    backgroundColor: (!isCustomTime && (mins === null ? timeLimit === null : timeLimit === mins * 60)) ? accentColor : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
                                                    borderColor: (!isCustomTime && (mins === null ? timeLimit === null : timeLimit === mins * 60)) ? accentColor : 'transparent',
                                                },
                                            ]}
                                            onPress={() => {
                                                setIsCustomTime(false)
                                                setTimeLimit(mins === null ? null : mins * 60)
                                            }}
                                        >
                                            <ThemedText
                                                variant="caption"
                                                style={{
                                                    fontWeight: '700',
                                                    color: (!isCustomTime && (mins === null ? timeLimit === null : timeLimit === mins * 60)) ? theme.background : theme.text,
                                                }}
                                            >
                                                {mins === null ? 'NONE' : `${mins}M`}
                                            </ThemedText>
                                        </TouchableOpacity>
                                    ))}
                                    <TouchableOpacity
                                        style={[
                                            styles.configChip,
                                            {
                                                backgroundColor: isCustomTime ? accentColor : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
                                                borderColor: isCustomTime ? accentColor : 'transparent',
                                            },
                                        ]}
                                        onPress={() => setIsCustomTime(true)}
                                    >
                                        <ThemedText
                                            variant="caption"
                                            style={{
                                                fontWeight: '700',
                                                color: isCustomTime ? theme.background : theme.text,
                                            }}
                                        >
                                            CUSTOM
                                        </ThemedText>
                                    </TouchableOpacity>
                                </View>

                                {isCustomTime && (
                                    <View style={styles.customTimeRow}>
                                        <TextInput
                                            style={[styles.customInput, { color: theme.text, borderColor: accentColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                                            placeholder="MINUTES"
                                            placeholderTextColor={theme.textSecondary}
                                            keyboardType="numeric"
                                            value={customMins}
                                            maxLength={3}
                                            onChangeText={(val) => {
                                                const numericVal = val.replace(/[^0-9]/g, '')
                                                setCustomMins(numericVal)
                                                const mins = parseInt(numericVal)
                                                if (!isNaN(mins) && mins > 0) {
                                                    setTimeLimit(mins * 60)
                                                } else {
                                                    setTimeLimit(null)
                                                }
                                            }}
                                            autoFocus
                                        />
                                        <ThemedText variant="caption" style={{ opacity: 0.5, marginTop: 4 }}>Duration (1-999 min)</ThemedText>
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={[styles.customButton, { backgroundColor: accentColor }]}
                                    onPress={handleCustomDrill}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="rocket" size={20} color={theme.background} />
                                    <ThemedText variant="body" style={[styles.customButtonText, { color: theme.background }]}>
                                        DEPLOY CUSTOM DRILL
                                    </ThemedText>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                {!selectedCollection && (
                    <View style={styles.emptyHint}>
                        <Ionicons name="arrow-up" size={20} color={theme.textSecondary} />
                        <ThemedText variant="caption" style={{ color: theme.textSecondary, opacity: 0.7 }}>
                            Select a collection above to start your drill
                        </ThemedText>
                    </View>
                )}
            </ScrollView>
        </ThemedContainer>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollView: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    modesButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
    modesText: { letterSpacing: 1, fontSize: 11 },
    modeIndicator: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 16, gap: 8 },
    modeIndicatorText: { flex: 1 },
    configSection: {
        marginTop: 20,
        alignItems: 'center',
    },
    verseCountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 24,
    },
    quickButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        paddingHorizontal: 48,
        borderRadius: 14,
        gap: 12,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    quickButtonText: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: 18,
        letterSpacing: 2,
    },
    quickHint: {
        marginTop: 8,
        opacity: 0.5,
        letterSpacing: 1,
    },
    advancedToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
        marginTop: 8,
    },
    customSection: {
        width: '100%',
        alignItems: 'center',
        paddingBottom: 8,
    },
    sectionHeading: {
        letterSpacing: 1.5,
        opacity: 0.7,
        marginBottom: 12,
        textAlign: 'center',
    },
    optionRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
    },
    configChip: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1.5,
    },
    customTimeRow: {
        alignItems: 'center',
        marginBottom: 20,
    },
    customInput: {
        width: 120,
        height: 44,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 16,
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    customButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 14,
        marginTop: 8,
        gap: 10,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    customButtonText: {
        fontWeight: '700',
        fontSize: 15,
        letterSpacing: 1.5,
    },
    emptyHint: {
        alignItems: 'center',
        marginTop: 40,
        gap: 8,
    },
})