import React, { useState, useEffect, useRef } from 'react'
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Modal,
    Animated,
    StatusBar,
    ScrollView,
    Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import {
    TACTICAL_THEME,
    GARRISON_THEME,
    MILITARY_TYPOGRAPHY,
    ACCURACY_COLORS,
} from '@/constants/colors'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedText } from '@/components/Themed'

interface StealthDrillProps {
    isVisible: boolean
    onClose: () => void
    onComplete: (accuracy: number) => void
    targetVerse: string
    reference: string
}

interface WordToken {
    id: string
    text: string
    originalIndex: number
    isBlank: boolean
}

export default function StealthDrill({
    isVisible,
    onClose,
    onComplete,
    targetVerse,
    reference,
}: StealthDrillProps): React.ReactElement {
    type DifficultyLevel = 'RECRUIT' | 'SOLDIER' | 'SNIPER' | 'GHOST'

    const DIFFICULTIES: Record<DifficultyLevel, { label: string, percent: number, icon: keyof typeof MaterialCommunityIcons.glyphMap, color: string }> = {
        'RECRUIT': { label: 'RECRUIT', percent: 0.25, icon: 'shield-outline', color: '#4CAF50' },
        'SOLDIER': { label: 'SOLDIER', percent: 0.50, icon: 'shield-half-full', color: '#FFC107' },
        'SNIPER': { label: 'SNIPER', percent: 0.75, icon: 'crosshairs', color: '#FF5722' },
        'GHOST': { label: 'GHOST', percent: 1.00, icon: 'ghost', color: '#9C27B0' }
    }

    const { isDark } = useAppStore()
    const theme = isDark ? TACTICAL_THEME : GARRISON_THEME

    const [difficulty, setDifficulty] = useState<DifficultyLevel | null>(null)
    const [tokens, setTokens] = useState<WordToken[]>([])
    const [wordBank, setWordBank] = useState<WordToken[]>([])
    const [filledBlanks, setFilledBlanks] = useState<{ [key: number]: WordToken }>({})
    const [selectedBankWord, setSelectedBankWord] = useState<string | null>(null)
    const [drillComplete, setDrillComplete] = useState(false)
    const [accuracy, setAccuracy] = useState(0)

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(50)).current

    useEffect(() => {
        if (isVisible) {
            // Reset state on open
            setDifficulty(null)
            setTokens([])
            setWordBank([])
            setFilledBlanks({})
            setDrillComplete(false)
            setAccuracy(0)

            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start()
        }
    }, [isVisible, targetVerse])

    const startDrill = (selectedLevel: DifficultyLevel) => {
        setDifficulty(selectedLevel)
        initializeDrill(selectedLevel)

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start()
    }

    const initializeDrill = (level: DifficultyLevel) => {
        // 1. Tokenize verse
        const words = targetVerse.split(/\s+/)

        // 2. Determine blanks based on difficulty
        const percent = DIFFICULTIES[level].percent
        const blankCount = Math.max(1, Math.floor(words.length * percent))

        let indicesToHide = new Set<number>()

        if (percent === 1.0) {
            // All blanks
            indicesToHide = new Set(words.map((_, i) => i))
        } else {
            // Random selection
            while (indicesToHide.size < blankCount) {
                indicesToHide.add(Math.floor(Math.random() * words.length))
            }
        }

        const newTokens: WordToken[] = words.map((word, index) => ({
            id: `token-${index}`,
            text: word,
            originalIndex: index,
            isBlank: indicesToHide.has(index),
        }))

        setTokens(newTokens)

        // 3. Create Word Bank
        const bankWords = newTokens
            .filter((t) => t.isBlank)
            .map((t) => ({ ...t, id: `bank-${t.originalIndex}` })) // New IDs for bank items
            .sort(() => Math.random() - 0.5) // Shuffle

        setWordBank(bankWords)
        setFilledBlanks({})
        setDrillComplete(false)
    }

    const handleBankWordSelect = (token: WordToken) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

        // Find first empty blank
        const firstEmptyIndex = tokens.findIndex(
            (t) => t.isBlank && !filledBlanks[t.originalIndex]
        )

        if (firstEmptyIndex !== -1) {
            const newFilled = { ...filledBlanks, [tokens[firstEmptyIndex].originalIndex]: token }
            setFilledBlanks(newFilled)

            // Remove from bank
            setWordBank((prev) => prev.filter((t) => t.id !== token.id))

            // Check completion
            if (Object.keys(newFilled).length === tokens.filter(t => t.isBlank).length) {
                checkResult(newFilled)
            }
        }
    }

    const handleBlankPress = (index: number) => {
        const token = filledBlanks[index]
        if (token) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            // Return to bank
            setWordBank((prev) => [...prev, token])

            const newFilled = { ...filledBlanks }
            delete newFilled[index]
            setFilledBlanks(newFilled)
            setDrillComplete(false)
        }
    }

    const checkResult = (currentFilled: { [key: number]: WordToken }) => {
        let correct = 0
        let total = 0

        tokens.forEach((token) => {
            if (token.isBlank) {
                total++
                const filled = currentFilled[token.originalIndex]
                if (filled && filled.text === token.text) {
                    correct++
                }
            }
        })

        const calculatedAccuracy = total > 0 ? (correct / total) * 100 : 100
        setAccuracy(calculatedAccuracy)
        setDrillComplete(true)

        if (calculatedAccuracy === 100) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        }
    }

    const handleComplete = () => {
        onComplete(accuracy)
        onClose()
    }

    const getAccuracyColor = (acc: number) => {
        if (acc >= 95) return ACCURACY_COLORS.excellent
        if (acc >= 85) return ACCURACY_COLORS.good
        if (acc >= 75) return ACCURACY_COLORS.fair
        return ACCURACY_COLORS.poor
    }

    const renderDifficultySelection = () => (
        <View style={styles.difficultyContainer}>
            <ThemedText variant="heading" style={styles.difficultyTitle}>SELECT DIFFICULTY</ThemedText>
            <View style={styles.difficultyGrid}>
                {(Object.keys(DIFFICULTIES) as DifficultyLevel[]).map((level) => (
                    <TouchableOpacity
                        key={level}
                        style={[styles.difficultyCard, { borderColor: theme.border, backgroundColor: theme.surface }]}
                        onPress={() => startDrill(level)}
                    >
                        <MaterialCommunityIcons
                            name={DIFFICULTIES[level].icon}
                            size={40}
                            color={DIFFICULTIES[level].color}
                            style={{ marginBottom: 12 }}
                        />
                        <ThemedText variant="heading" style={{ color: DIFFICULTIES[level].color, fontSize: 18 }}>
                            {DIFFICULTIES[level].label}
                        </ThemedText>
                        <ThemedText variant="caption" style={{ marginTop: 4 }}>
                            {DIFFICULTIES[level].percent * 100}% HIDDEN
                        </ThemedText>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    )

    const renderContent = () => (
        <>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <MaterialCommunityIcons name="incognito" size={24} color={theme.accent} />
                    <View style={styles.headerTextContainer}>
                        <ThemedText variant="heading" style={styles.title}>
                            STEALTH DRILL
                        </ThemedText>
                        <ThemedText variant="caption" style={styles.subtitle}>
                            {difficulty ? `LEVEL: ${difficulty}` : 'SILENT OPERATION'}
                        </ThemedText>
                    </View>
                </View>

                <TouchableOpacity
                    onPress={onClose}
                    style={[styles.closeButton, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                >
                    <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
            </View>

            {!difficulty ? (
                renderDifficultySelection()
            ) : (
                <>
                    {/* Mission Objective (Verse Reference) */}
                    <View style={styles.missionInfo}>
                        <ThemedText variant="subheading" style={{ color: theme.textSecondary }}>
                            TARGET: {reference}
                        </ThemedText>
                    </View>

                    {/* Drill Area */}
                    <View style={styles.drillContainer}>
                        <View style={[styles.verseContainer, {
                            backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.8)',
                            borderColor: theme.border
                        }]}>
                            <View style={styles.wordsContainer}>
                                {tokens.map((token, i) => {
                                    if (token.isBlank) {
                                        const filled = filledBlanks[token.originalIndex]
                                        const isCorrect = drillComplete && filled?.text === token.text
                                        const isWrong = drillComplete && filled && filled.text !== token.text

                                        return (
                                            <TouchableOpacity
                                                key={`blank-${i}`}
                                                onPress={() => handleBlankPress(token.originalIndex)}
                                                style={[
                                                    styles.blank,
                                                    {
                                                        borderColor: isWrong ? theme.error : (filled ? theme.accent : theme.textSecondary),
                                                        backgroundColor: filled ? (isWrong ? 'rgba(255,0,0,0.1)' : 'rgba(255, 107, 53, 0.1)') : 'transparent'
                                                    }
                                                ]}
                                            >
                                                <Text style={[
                                                    styles.wordText,
                                                    {
                                                        color: filled ? theme.text : 'transparent',
                                                        fontWeight: filled ? 'bold' : 'normal'
                                                    }
                                                ]}>
                                                    {filled ? filled.text : '_______'}
                                                </Text>
                                            </TouchableOpacity>
                                        )
                                    }
                                    return (
                                        <Text key={`word-${i}`} style={[styles.wordText, { color: theme.text }]}>
                                            {token.text}
                                        </Text>
                                    )
                                })}
                            </View>
                        </View>
                    </View>

                    {/* Result Overlay */}
                    {drillComplete && (
                        <Animated.View style={[styles.resultContainer, { opacity: fadeAnim }]}>
                            <Text style={[styles.resultTitle, MILITARY_TYPOGRAPHY.heading, { color: getAccuracyColor(accuracy) }]}>
                                MISSION {accuracy === 100 ? 'ACCOMPLISHED' : 'REPORT'}
                            </Text>
                            <Text style={[styles.accuracyText, MILITARY_TYPOGRAPHY.display, { color: getAccuracyColor(accuracy) }]}>
                                {accuracy.toFixed(0)}%
                            </Text>

                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: theme.accent }]}
                                onPress={handleComplete}
                            >
                                <Text style={[styles.buttonText, MILITARY_TYPOGRAPHY.button]}>
                                    CONFIRM INTEL
                                </Text>
                            </TouchableOpacity>

                            {accuracy < 100 && (
                                <TouchableOpacity
                                    style={[styles.retryButton]}
                                    onPress={() => startDrill(difficulty)}
                                >
                                    <Text style={[styles.retryText, MILITARY_TYPOGRAPHY.button, { color: theme.textSecondary }]}>
                                        RETRY MISSION
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </Animated.View>
                    )}

                    {/* Ammo Supply (Word Bank) - Hide when complete */}
                    {!drillComplete && (
                        <View style={[styles.bankContainer, { borderTopColor: theme.border }]}>
                            <ThemedText variant="caption" style={styles.bankTitle}>AMMO SUPPLY</ThemedText>
                            <View style={styles.bankGrid}>
                                {wordBank.map((token) => (
                                    <TouchableOpacity
                                        key={token.id}
                                        style={[styles.bankWord, { backgroundColor: theme.surface, borderColor: theme.border }]}
                                        onPress={() => handleBankWordSelect(token)}
                                    >
                                        <Text style={[styles.bankWordText, { color: theme.text }]}>{token.text}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}
                </>
            )}
        </>
    )

    return (
        <Modal
            visible={isVisible}
            animationType="fade"
            transparent={false}
            statusBarTranslucent
        >
            {isDark ? (
                <LinearGradient
                    colors={['#1a1f1a', '#0D0D0D']} // Darker, stealthier gradient
                    style={styles.container}
                >
                    {renderContent()}
                </LinearGradient>
            ) : (
                <View style={[styles.container, { backgroundColor: theme.background }]}>
                    {renderContent()}
                </View>
            )}
        </Modal>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 50,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTextContainer: {
        justifyContent: 'center',
    },
    title: {
        fontSize: 20,
        letterSpacing: 1,
    },
    subtitle: {
        opacity: 0.7,
        textTransform: 'uppercase',
        letterSpacing: 2,
        fontSize: 10,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    missionInfo: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    drillContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    verseContainer: {
        padding: 24,
        borderRadius: 12,
        borderWidth: 1,
        minHeight: 200,
        justifyContent: 'center',
    },
    wordsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center', // Center content
    },
    wordText: {
        fontSize: 18,
        lineHeight: 32,
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', // Tactical font
    },
    blank: {
        minWidth: 60,
        borderBottomWidth: 2,
        paddingHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'center',
        height: 32,
        borderRadius: 4,
    },
    bankContainer: {
        padding: 24,
        paddingBottom: 40,
        borderTopWidth: 1,
    },
    bankTitle: {
        textAlign: 'center',
        marginBottom: 16,
        opacity: 0.7,
        letterSpacing: 2,
    },
    bankGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
    },
    bankWord: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    bankWordText: {
        fontSize: 16,
        fontWeight: '600',
    },
    resultContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 40,
        paddingBottom: 60,
        backgroundColor: 'rgba(0,0,0,0.9)',
        alignItems: 'center',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    resultTitle: {
        marginBottom: 8,
        fontSize: 24,
    },
    accuracyText: {
        fontSize: 64,
        fontWeight: 'bold',
        marginBottom: 24,
    },
    actionButton: {
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        marginBottom: 16,
    },
    buttonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
    retryButton: {
        padding: 12,
    },
    retryText: {
        fontSize: 14,
    },
    difficultyContainer: {
        flex: 1,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    difficultyTitle: {
        fontSize: 24,
        marginBottom: 32,
        letterSpacing: 2,
    },
    difficultyGrid: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        justifyContent: 'center',
    },
    difficultyCard: {
        width: '45%',
        aspectRatio: 1,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    }
})

