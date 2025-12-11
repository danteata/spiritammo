import React, { useState, useEffect } from 'react'
import {
    StyleSheet,
    Text,
    View,
    Modal,
    TouchableOpacity,
    Animated,
    Alert,
} from 'react-native'
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'

import { useAppStore } from '@/hooks/useAppStore'
import { ThemedText } from '@/components/Themed'
import { Collection, Scripture } from '@/types/scripture'
import TargetPractice from '@/components/TargetPractice'
import { militaryRankingService } from '@/services/militaryRanking'
import { MILITARY_TYPOGRAPHY, COLORS } from '@/constants/colors'

interface AssaultResult {
    scriptureId: string
    accuracy: number
    timestamp: Date
    transcript: string
}

interface CollectionAssaultProps {
    isVisible: boolean
    collections: Collection[]
    parameters: {
        verseCount: number
        timeLimit: number
        difficulty: string
    }
    onComplete: (results: AssaultResult[]) => void
    onClose: () => void
}

export default function CollectionAssault({
    isVisible,
    collections,
    parameters,
    onComplete,
    onClose,
}: CollectionAssaultProps) {
    const { theme, isDark, scriptures, updateScriptureAccuracy, userStats } = useAppStore()

    const [assaultVerses, setAssaultVerses] = useState<Scripture[]>([])
    const [currentVerseIndex, setCurrentVerseIndex] = useState(0)
    const [results, setResults] = useState<AssaultResult[]>([])
    const [isRunning, setIsRunning] = useState(false)
    const [startTime, setStartTime] = useState<Date | null>(null)
    const [currentModal, setCurrentModal] = useState<'assault' | 'practice' | 'results'>('assault')
    const [showNextReveal, setShowNextReveal] = useState(false)

    // Generate assault verses when component becomes visible
    useEffect(() => {
        if (isVisible && collections.length > 0) {
            generateAssaultVerses()
        }
    }, [isVisible, collections])

    const generateAssaultVerses = () => {
        const selectedScriptures: Scripture[] = []

        collections.forEach(collection => {
            const collectionScriptures = scriptures.filter(s =>
                collection.scriptures.includes(s.id)
            )
            selectedScriptures.push(...collectionScriptures)
        })

        // Shuffle and take the requested number
        const shuffled = selectedScriptures.sort(() => 0.5 - Math.random())
        const assaultVerses = shuffled.slice(0, parameters.verseCount)

        console.log(`🎯 Generated ${assaultVerses.length} assault verses`)
        setAssaultVerses(assaultVerses)
    }

    const startAssault = () => {
        if (assaultVerses.length === 0) {
            Alert.alert('NO VERSES AVAILABLE', 'No verses found in selected collections.')
            return
        }

        console.log('🚀 Starting collection assault with', assaultVerses.length, 'verses')
        setIsRunning(true)
        setStartTime(new Date())
        setCurrentVerseIndex(0)
        setResults([])
        setCurrentModal('practice')
    }

    const handleVerseComplete = async (transcript: string, accuracy: number) => {
        console.log(`🎯 Verse ${currentVerseIndex + 1}/${assaultVerses.length} completed:`, accuracy, '%')

        const currentVerse = assaultVerses[currentVerseIndex]

        // Record result
        const result: AssaultResult = {
            scriptureId: currentVerse.id,
            accuracy,
            timestamp: new Date(),
            transcript
        }

        setResults(prev => [...prev, result])

        // Update scripture accuracy in storage
        await updateScriptureAccuracy(currentVerse.id, accuracy)

        // Check if this is the last verse
        if (currentVerseIndex >= assaultVerses.length - 1) {
            // Assault complete
            completeAssault([...results, result])
        } else {
            // Move to next verse
            setCurrentVerseIndex(prev => prev + 1)
            setShowNextReveal(false) // Hide next button while processing
        }
    }

    const completeAssault = async (finalResults: AssaultResult[]) => {
        console.log('🏁 Assault completed!', finalResults)

        // Update military profile for assault completion
        const totalAccuracies = finalResults.reduce((sum, r) => sum + r.accuracy, 0)
        const averageAccuracy = totalAccuracies / finalResults.length

        await militaryRankingService.updateProfile({
            versesMemorized: finalResults.length,
            averageAccuracy,
            consecutiveDays: userStats.streak, // Keep current streak
        })

        setCurrentModal('results')

        // Auto-complete after showing results for 3 seconds
        setTimeout(() => {
            onComplete(finalResults)
        }, 3000)
    }

    const renderAssaultSetup = () => (
        <View style={styles.modalContainer}>
            <ThemedText variant="heading" style={styles.title}>
                COLLECTION ASSAULT
            </ThemedText>

            <View style={styles.assaultInfo}>
                <View style={styles.infoRow}>
                    <Ionicons name="library" size={20} color={theme.text} />
                    <ThemedText variant="body" style={styles.infoText}>
                        COLLECTIONS: {collections.map(c => c.name).join(', ')}
                    </ThemedText>
                </View>

                <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="target" size={20} color={theme.text} />
                    <ThemedText variant="body" style={styles.infoText}>
                        VERSES: {parameters.verseCount}
                    </ThemedText>
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="time" size={20} color={theme.text} />
                    <ThemedText variant="body" style={styles.infoText}>
                        TIME LIMIT: {parameters.timeLimit > 0 ? `${parameters.timeLimit}s` : 'NONE'}
                    </ThemedText>
                </View>
            </View>

            <View style={styles.assaultDescription}>
                <ThemedText variant="caption" style={styles.descriptionText}>
                    You will face {parameters.verseCount} random verses from your selected collections.
                    Text will be completely blacked out - true testing conditions.
                </ThemedText>
            </View>

            <TouchableOpacity
                style={[styles.assaultButton, { backgroundColor: theme.accent }]}
                onPress={startAssault}
            >
                <FontAwesome5 name="fighter-jet" size={20} color={theme.accentContrastText} />
                <ThemedText variant="button" style={styles.buttonText}>
                    BEGIN ASSAULT
                </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
            >
                <Ionicons name="close" size={16} color={theme.textSecondary} />
                <Text style={[styles.cancelText, { color: theme.textSecondary }]}>
                    CANCEL
                </Text>
            </TouchableOpacity>
        </View>
    )

    const renderAssaultProgress = () => {
        const currentVerse = assaultVerses[currentVerseIndex]
        if (!currentVerse) return null

        return (
            <TargetPractice
                isVisible={currentModal === 'practice'}
                targetVerse={currentVerse.text}
                reference={currentVerse.reference}
                isAssaultMode={true}
                onRecordingComplete={handleVerseComplete}
                onClose={() => setCurrentModal('assault')}
            />
        )
    }

    const renderAssaultResults = () => {
        const totalAccuracies = results.reduce((sum, r) => sum + r.accuracy, 0)
        const averageAccuracy = totalAccuracies / results.length

        return (
            <View style={styles.modalContainer}>
                <View style={styles.resultsHeader}>
                    <MaterialCommunityIcons
                        name="trophy-award"
                        size={48}
                        color={theme.accent}
                    />
                    <ThemedText variant="heading" style={styles.resultsTitle}>
                        ASSAULT COMPLETE
                    </ThemedText>
                </View>

                <View style={styles.resultsStats}>
                    <View style={styles.statBox}>
                        <ThemedText variant="heading" style={styles.statValue}>
                            {results.length}
                        </ThemedText>
                        <ThemedText variant="caption" style={styles.statLabel}>
                            VERSES CONQUERED
                        </ThemedText>
                    </View>

                    <View style={styles.statBox}>
                        <ThemedText variant="heading" style={styles.statValue}>
                            {averageAccuracy.toFixed(1)}%
                        </ThemedText>
                        <ThemedText variant="caption" style={styles.statLabel}>
                            AVG ACCURACY
                        </ThemedText>
                    </View>

                    <View style={styles.statBox}>
                        <ThemedText variant="heading" style={styles.statValue}>
                            {startTime ? Math.floor((Date.now() - startTime.getTime()) / 1000) : 0}s
                        </ThemedText>
                        <ThemedText variant="caption" style={styles.statLabel}>
                            TOTAL TIME
                        </ThemedText>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.assaultButton, { backgroundColor: theme.success }]}
                    onPress={() => onComplete(results)}
                >
                    <FontAwesome5 name="check" size={20} color="white" />
                    <Text style={styles.buttonText}>
                        HOOAH!
                    </Text>
                </TouchableOpacity>
            </View>
        )
    }

    return (
        <Modal
            visible={isVisible}
            animationType="slide"
            presentationStyle="fullScreen"
            statusBarTranslucent
        >
            <LinearGradient
                colors={isDark ? [theme.background, '#0D0D0D'] : [theme.background, theme.surface]}
                style={styles.container}
            >
                {/* Close Button */}
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={onClose}
                >
                    <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>

                {/* Modal Content */}
                {currentModal === 'assault' && renderAssaultSetup()}
                {currentModal === 'practice' && renderAssaultProgress()}
                {currentModal === 'results' && renderAssaultResults()}
            </LinearGradient>
        </Modal>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 100,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 24,
        marginBottom: 32,
        letterSpacing: 2,
    },
    assaultInfo: {
        width: '100%',
        marginBottom: 32,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        padding: 16,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 12,
    },
    infoText: {
        marginLeft: 16,
        fontSize: 16,
    },
    assaultDescription: {
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 16,
        marginBottom: 32,
    },
    descriptionText: {
        textAlign: 'center',
        lineHeight: 20,
        opacity: 0.8,
    },
    assaultButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 16,
        marginBottom: 16,
        gap: 12,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    cancelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        gap: 8,
    },
    cancelText: {
        fontSize: 14,
        letterSpacing: 1,
    },
    resultsHeader: {
        alignItems: 'center',
        marginBottom: 32,
    },
    resultsTitle: {
        fontSize: 28,
        marginTop: 16,
        letterSpacing: 2,
    },
    resultsStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: 40,
    },
    statBox: {
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 12,
        minWidth: 80,
    },
    statValue: {
        fontSize: 24,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 10,
        textAlign: 'center',
        opacity: 0.7,
        letterSpacing: 0.5,
    },
})
