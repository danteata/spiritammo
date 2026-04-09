import { useState, useEffect, useCallback, useMemo } from 'react'
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform,
    TextInput,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useAppStore } from '@/hooks/useAppStore'
import { COLORS } from '@/constants/colors'
import { ThemedContainer, ThemedText } from '@/components/Themed'
import ScreenHeader from '@/components/ScreenHeader'
import {
    Question,
    QuestionSet,
    generateCollectionQuestions,
} from '@/services/questionGenerator'
import { useAnalytics } from '@/hooks/useAnalytics'
import { AnalyticsEventType } from '@/services/analytics'
import { Toast } from '@/components/ui/Toast'

export default function QuizScreen() {
    const { scriptures, collections, isDark, theme, userSettings } = useAppStore()
    const params = useLocalSearchParams()
    const router = useRouter()
    const { trackEvent } = useAnalytics()

    const collectionId = params.collectionId as string
    const collection = useMemo(() => {
        if (!collectionId || !collections) return null
        return collections.find(c => c.id === collectionId)
    }, [collectionId, collections])

    const collectionScriptures = useMemo(() => {
        if (!collection || !scriptures) return []
        return collection.scriptures
            .map(id => scriptures.find(s => s.id === id))
            .filter((s): s is NonNullable<typeof s> => s !== undefined)
    }, [collection, scriptures])

    const [questionSet, setQuestionSet] = useState<QuestionSet | null>(null)
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, any>>({})
    const [showResults, setShowResults] = useState(false)
    const [points, setPoints] = useState(0)
    const [totalPointsPossible, setTotalPointsPossible] = useState(0)
    const [isGenerating, setIsGenerating] = useState(false)
    const [showExplanation, setShowExplanation] = useState(false)
    const [questionLimit, setQuestionLimit] = useState(20)
    const [showConfig, setShowConfig] = useState(true)
    const [elapsedTime, setElapsedTime] = useState(0)
    const [timerActive, setTimerActive] = useState(false)
    const [timeLimit, setTimeLimit] = useState<number | null>(null) // in seconds
    const [timedOut, setTimedOut] = useState(false)
    const [isCustomTime, setIsCustomTime] = useState(false)
    const [customMins, setCustomMins] = useState('')


    const formatTime = useCallback((seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }, [])

    const generateQuestions = useCallback(async (limit: number = questionLimit) => {
        if (collectionScriptures.length === 0) return

        setIsGenerating(true)
        setShowConfig(false)
        try {
            const qs = generateCollectionQuestions(collectionScriptures, collectionId, limit)
            setQuestionSet(qs)

            // Each question has exactly 5 options now
            const totalOptions = qs.questions.length * 5
            setTotalPointsPossible(totalOptions)

            setCurrentQuestionIndex(0)
            setSelectedAnswers({})
            setShowResults(false)
            setShowExplanation(false)
            setElapsedTime(0)
            setTimerActive(true)

            trackEvent(AnalyticsEventType.QUIZ_GENERATED, {
                collection_id: collectionId,
                question_count: qs.questions.length,
            })
        } catch (error) {
            console.error('Failed to generate questions:', error)
            Alert.alert('Error', 'Failed to generate quiz questions. Please try again.')
        } finally {
            setIsGenerating(false)
        }
    }, [collectionScriptures, collectionId, trackEvent])

    const currentQuestion = questionSet?.questions[currentQuestionIndex]

    const handleSelectAnswer = useCallback((questionId: string, answer: any) => {
        setSelectedAnswers(prev => ({
            ...prev,
            [questionId]: answer,
        }))
    }, [])

    const handleOptionSelect = useCallback((questionId: string, optionLabel: string, value: 'T' | 'F' | 'S') => {
        setSelectedAnswers(prev => {
            const currentAnswers = (prev[questionId] as Record<string, 'T' | 'F' | 'S'>) || {}
            return {
                ...prev,
                [questionId]: {
                    ...currentAnswers,
                    [optionLabel]: value
                }
            }
        })
    }, [])

    const calculateRunningScore = useCallback((answers: Record<string, any>, questions: Question[]) => {
        let totalPoints = 0

        questions.forEach(q => {
            const answer = answers[q.id]
            if (!answer) return

            if (q.type === 'true-false-list') {
                const correctAnswer = q.correctAnswer as Record<string, 'T' | 'F' | 'S'>
                const userAnswers = answer as Record<string, 'T' | 'F' | 'S'>

                Object.entries(correctAnswer).forEach(([label, correctChoice]) => {
                    const userChoice = userAnswers[label] || 'S'
                    if (userChoice === 'S') return // Skip = 0
                    if (userChoice === correctChoice) {
                        totalPoints += 1
                    } else {
                        totalPoints -= 1
                    }
                })
            } else if (q.type === 'multiple-select' || q.type === 'facts') {
                if (Array.isArray(q.correctAnswer) && Array.isArray(answer)) {
                    const correctSet = new Set(q.correctAnswer.map(a => a.toLowerCase()))
                    const answerSet = new Set(answer.map(a => a.toLowerCase()))
                    const isCorrect = correctSet.size === answerSet.size &&
                        [...correctSet].every(a => answerSet.has(a))
                    if (isCorrect) totalPoints += 1
                }
            } else {
                if (typeof q.correctAnswer === 'string' && typeof answer === 'string') {
                    const isCorrect = q.correctAnswer.toLowerCase() === answer.toLowerCase()
                    if (isCorrect) totalPoints += 1
                }
            }
        })
        return totalPoints
    }, [])

    const finishMission = useCallback((isTimedOut = false) => {
        setTimerActive(false)
        if (!questionSet) return

        const finalPoints = calculateRunningScore(selectedAnswers, questionSet.questions)
        setPoints(finalPoints)
        setShowResults(true)
        setTimedOut(isTimedOut)

        trackEvent(AnalyticsEventType.QUIZ_COMPLETED, {
            collection_id: collectionId,
            points_earned: finalPoints,
            total_possible: totalPointsPossible,
            timed_out: isTimedOut
        })
    }, [questionSet, selectedAnswers, calculateRunningScore, collectionId, trackEvent, totalPointsPossible])

    const handleNextQuestion = useCallback(() => {
        if (!questionSet || !currentQuestion) return

        if (currentQuestionIndex < questionSet.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1)
            setShowExplanation(false)
        } else {
            finishMission(false)
        }
    }, [questionSet, currentQuestion, currentQuestionIndex, finishMission])

    const handlePreviousQuestion = useCallback(() => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1)
            setShowExplanation(false)
        }
    }, [currentQuestionIndex])

    const handleRestartQuiz = useCallback(() => {
        setShowConfig(true)
        setQuestionSet(null)
        setShowResults(false)
        setElapsedTime(0)
        setTimerActive(false)
        setTimedOut(false)
        setIsCustomTime(false)
        setCustomMins('')
    }, [])

    const handleBackToCollection = useCallback(() => {
        router.back()
    }, [router])

    useEffect(() => {
        let interval: NodeJS.Timeout
        if (timerActive) {
            interval = setInterval(() => {
                setElapsedTime(prev => {
                    const nextTime = prev + 1
                    if (timeLimit !== null && nextTime >= timeLimit) {
                        finishMission(true)
                        return timeLimit
                    }
                    return nextTime
                })
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [timerActive, timeLimit, finishMission])

    if (showConfig) {
        return (
            <ThemedContainer style={styles.container}>
                <ScreenHeader title="PRE-DRILL BRIEFING" subtitle={collection?.name} />
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={[styles.resultsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <Ionicons name="fitness" size={48} color={theme.accent} style={{ marginBottom: 16 }} />
                        
                        <View style={{ width: '100%' }}>
                            <ThemedText variant="subheading" style={{ marginBottom: 8, textAlign: 'center' }}>1. MISSION LENGTH</ThemedText>
                            <ThemedText variant="body" style={{ textAlign: 'center', opacity: 0.7, marginBottom: 16 }}>
                                How many questions per drill?
                            </ThemedText>
                        </View>

                        <View style={styles.resultsActions}>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
                                {[20, 50, 100].map(limit => (
                                    <TouchableOpacity
                                        key={limit}
                                        style={[
                                            styles.configOption,
                                            {
                                                backgroundColor: questionLimit === limit ? theme.accent : theme.surface,
                                                borderColor: theme.border,
                                            }
                                        ]}
                                        onPress={() => setQuestionLimit(limit)}
                                    >
                                        <ThemedText variant="body" style={{ fontWeight: 'bold', color: questionLimit === limit ? theme.accentContrastText : theme.text }}>
                                            {limit}
                                        </ThemedText>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.separator} />

                            <View style={{ width: '100%', marginTop: 24 }}>
                                <ThemedText variant="subheading" style={{ marginBottom: 8, textAlign: 'center' }}>2. MISSION DEADLINE</ThemedText>
                                <ThemedText variant="body" style={{ textAlign: 'center', opacity: 0.7, marginBottom: 16 }}>
                                    Establish a hard cutoff for this drill.
                                </ThemedText>
                            </View>

                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
                                {[null, 5, 15, 30].map(mins => (
                                    <TouchableOpacity
                                        key={mins === null ? 'none' : mins}
                                        style={[
                                            styles.configOption,
                                            {
                                                width: mins === null ? '48%' : '23%',
                                                backgroundColor: (!isCustomTime && (mins === null ? timeLimit === null : timeLimit === mins * 60)) ? theme.accent : theme.surface,
                                                borderColor: theme.border,
                                            }
                                        ]}
                                        onPress={() => {
                                            setIsCustomTime(false)
                                            setTimeLimit(mins === null ? null : mins * 60)
                                        }}
                                    >
                                        <ThemedText variant="body" style={{ fontWeight: 'bold', fontSize: 13, color: (!isCustomTime && (mins === null ? timeLimit === null : timeLimit === mins * 60)) ? theme.accentContrastText : theme.text }}>
                                            {mins === null ? 'UNLIMITED' : `${mins}M`}
                                        </ThemedText>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity
                                    style={[
                                        styles.configOption,
                                        {
                                            width: '48%',
                                            backgroundColor: isCustomTime ? theme.accent : theme.surface,
                                            borderColor: theme.border,
                                        }
                                    ]}
                                    onPress={() => setIsCustomTime(true)}
                                >
                                    <ThemedText variant="body" style={{ fontWeight: 'bold', fontSize: 13, color: isCustomTime ? theme.accentContrastText : theme.text }}>
                                        CUSTOM
                                    </ThemedText>
                                </TouchableOpacity>
                            </View>

                            {isCustomTime && (
                                <View style={{ width: '100%', alignItems: 'center', marginBottom: 24 }}>
                                    <TextInput
                                        style={[styles.customInput, { color: theme.text, borderColor: theme.accent, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
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
                                    <ThemedText variant="caption" style={{ marginTop: 8, opacity: 0.6 }}>SPECIFY EXACT DURATION (1-999 MIN)</ThemedText>
                                </View>
                            )}

                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: theme.success, marginTop: 24 }]}
                                onPress={() => generateQuestions(questionLimit)}
                            >
                                <Ionicons name="rocket" size={20} color="#FFF" />
                                <ThemedText variant="body" style={{ color: '#FFF', fontWeight: '700' }}>BEGIN DRILL</ThemedText>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: 'transparent' }]}
                                onPress={handleBackToCollection}
                            >
                                <ThemedText variant="body" style={{ color: theme.textSecondary }}>CANCEL</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </ThemedContainer>
        )
    }

    if (isGenerating || !questionSet) {
        return (
            <ThemedContainer style={styles.container}>
                <ScreenHeader title="DRILL DEPLOYMENT" subtitle="Calibrating targets..." />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.accent} />
                    <ThemedText variant="body" style={styles.loadingText}>
                        Generating questions from {collection?.name || 'collection'}...
                    </ThemedText>
                </View>
            </ThemedContainer>
        )
    }

    if (showResults) {
        const percentage = totalPointsPossible > 0 ? (points / totalPointsPossible) * 100 : 0
        return (
            <ThemedContainer style={styles.container}>
                <ScreenHeader title="AFTER-ACTION REPORT" subtitle="Mission Complete" />
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                    <View style={[styles.resultsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <View style={styles.scoreCircle}>
                            <ThemedText variant="title" style={[styles.scoreText, { color: theme.accent }]}>
                                {Math.max(0, Math.floor(percentage))}%
                            </ThemedText>
                            <ThemedText variant="body" style={styles.scoreLabel}>
                                {points}/{totalPointsPossible} Points
                            </ThemedText>
                        </View>

                        {timedOut && (
                            <View style={[styles.timeStats, { backgroundColor: theme.error + '20', borderColor: theme.error }]}>
                                <Ionicons name="time" size={20} color={theme.error} />
                                <ThemedText variant="body" style={{ fontWeight: 'bold', color: theme.error }}>
                                    MISSION EXPIRED: TIME ELAPSED
                                </ThemedText>
                            </View>
                        )}

                        {(timeLimit !== null || userSettings.isTimedMission) && !timedOut && (
                            <View style={[styles.timeStats, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', borderColor: theme.border }]}>
                                <Ionicons name="timer-outline" size={20} color={theme.accent} />
                                <ThemedText variant="body" style={{ fontWeight: '600' }}>
                                    MISSION DURATION: {formatTime(elapsedTime)}
                                </ThemedText>
                            </View>
                        )}

                        <View style={styles.resultsMessage}>
                            {percentage >= 90 ? (
                                <>
                                    <Ionicons name="trophy" size={48} color={theme.success} />
                                    <ThemedText variant="subheading" style={[styles.resultsTitle, { color: theme.success }]}>
                                        Excellent Marksman!
                                    </ThemedText>
                                    <ThemedText variant="body" style={styles.resultsDesc}>
                                        You demonstrate mastery of this collection.
                                    </ThemedText>
                                </>
                            ) : percentage >= 70 ? (
                                <>
                                    <Ionicons name="star" size={48} color={theme.warning} />
                                    <ThemedText variant="subheading" style={[styles.resultsTitle, { color: theme.warning }]}>
                                        Good Progress!
                                    </ThemedText>
                                    <ThemedText variant="body" style={styles.resultsDesc}>
                                        Keep training to achieve mastery.
                                    </ThemedText>
                                </>
                            ) : (
                                <>
                                    <Ionicons name="refresh" size={48} color={theme.error} />
                                    <ThemedText variant="subheading" style={[styles.resultsTitle, { color: theme.error }]}>
                                        More Training Needed
                                    </ThemedText>
                                    <ThemedText variant="body" style={styles.resultsDesc}>
                                        Review the collection and try again.
                                    </ThemedText>
                                </>
                            )}
                        </View>

                        <View style={styles.resultsActions}>
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: theme.accent }]}
                                onPress={handleRestartQuiz}
                            >
                                <Ionicons name="refresh" size={20} color={theme.accentContrastText} />
                                <ThemedText variant="body" style={[styles.actionButtonText, { color: theme.accentContrastText }]}>
                                    DEPLOY NEW DRILL
                                </ThemedText>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: 'transparent', borderColor: theme.border, borderWidth: 1 }]}
                                onPress={handleBackToCollection}
                            >
                                <Ionicons name="arrow-back" size={20} color={theme.text} />
                                <ThemedText variant="body" style={[styles.actionButtonText, { color: theme.text }]}>
                                    BACK TO COLLECTION
                                </ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={{ marginTop: 24 }}>
                        <ThemedText variant="subheading" style={{ marginBottom: 16 }}>Mission Review</ThemedText>
                        {questionSet.questions.map((q, idx) => {
                            const userAnswer = selectedAnswers[q.id]
                            const correctAnswer = q.correctAnswer

                            return (
                                <View key={q.id} style={[styles.reviewItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <ThemedText variant="caption" style={{ color: theme.accent }}>Q{idx + 1}: {q.type.toUpperCase()}</ThemedText>
                                    </View>
                                    <ThemedText variant="body" style={{ marginBottom: 12 }}>{q.text}</ThemedText>

                                    {q.type === 'true-false-list' ? (
                                        <View style={{ gap: 4 }}>
                                            {q.options.map(opt => {
                                                const userChoice = (userAnswer as Record<string, string>)?.[opt.label] || 'S'
                                                const correctChoice = (correctAnswer as Record<string, string>)[opt.label]
                                                const isCorrect = userChoice === correctChoice

                                                return (
                                                    <View key={opt.label} style={styles.reviewOptionRow}>
                                                        <ThemedText variant="caption" style={{ flex: 1 }}>{opt.label}</ThemedText>
                                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                                            <ThemedText variant="caption" style={{ color: theme.textSecondary }}>YOU: {userChoice}</ThemedText>
                                                            <ThemedText variant="caption" style={{ color: isCorrect ? theme.success : theme.error }}>
                                                                ACTUAL: {correctChoice}
                                                            </ThemedText>
                                                        </View>
                                                    </View>
                                                )
                                            })}
                                        </View>
                                    ) : (
                                        <View style={styles.reviewOptionRow}>
                                            <ThemedText variant="caption" style={{ color: theme.textSecondary }}>YOUR ANSWER: {JSON.stringify(userAnswer)}</ThemedText>
                                            <ThemedText variant="caption" style={{ color: theme.success }}>CORRECT: {JSON.stringify(correctAnswer)}</ThemedText>
                                        </View>
                                    )}
                                </View>
                            )
                        })}
                    </View>
                </ScrollView>
            </ThemedContainer>
        )
    }

    if (!currentQuestion) {
        return (
            <ThemedContainer style={styles.container}>
                <ScreenHeader title="QUIZ COMPLETE" subtitle="No questions available" />
                <View style={styles.loadingContainer}>
                    <ThemedText variant="body">No questions available for this collection.</ThemedText>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.accent, marginTop: 16 }]}
                        onPress={handleBackToCollection}
                    >
                        <ThemedText variant="body" style={{ color: theme.accentContrastText }}>
                            BACK
                        </ThemedText>
                    </TouchableOpacity>
                </View>
            </ThemedContainer>
        )
    }

    const isMultiSelect = currentQuestion.type === 'multiple-select' || currentQuestion.type === 'facts'
    const currentAnswer = selectedAnswers[currentQuestion.id]
    const selectedArray = Array.isArray(currentAnswer) ? currentAnswer : []

    return (
        <ThemedContainer style={styles.container}>
            <ScreenHeader
                title={`QUESTION ${currentQuestionIndex + 1}`}
                subtitle={`of ${questionSet.questions.length}`}
            />

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                <View style={[styles.progressContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <TouchableOpacity
                        style={{ paddingRight: 12, borderRightWidth: 1, borderRightColor: theme.border }}
                        onPress={() => {
                            Alert.alert("ABORT MISSION", "Are you sure you want to end this training session? Points from your current answer will be included.", [
                                { text: "CONTINUE DRILL", style: "cancel" },
                                {
                                    text: "ABORT & REPORT",
                                    style: "destructive",
                                    onPress: () => finishMission(false)
                                }
                            ])
                        }}
                    >
                        <Ionicons name="close-circle" size={24} color={theme.error} />
                    </TouchableOpacity>

                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${((currentQuestionIndex + 1) / questionSet.questions.length) * 100}%`,
                                    backgroundColor: theme.accent,
                                },
                            ]}
                        />
                    </View>
                    <ThemedText variant="caption" style={styles.progressText}>
                        PROGRESS: {currentQuestionIndex + 1}/{questionSet.questions.length}
                    </ThemedText>

                    {(timeLimit !== null || userSettings.isTimedMission) && (
                        <View style={[styles.timerHud, timeLimit !== null && (timeLimit - elapsedTime < 60) && { borderLeftColor: theme.error }]}>
                            <Ionicons 
                                name={timeLimit !== null ? (timeLimit - elapsedTime < 60 ? 'alert-circle' : 'hourglass-outline') : 'timer'} 
                                size={14} 
                                color={timeLimit !== null && (timeLimit - elapsedTime < 60) ? theme.error : theme.accent} 
                            />
                            <ThemedText 
                                variant="caption" 
                                style={[
                                    styles.timerText, 
                                    { color: timeLimit !== null && (timeLimit - elapsedTime < 60) ? theme.error : theme.accent }
                                ]}
                            >
                                {timeLimit !== null ? formatTime(Math.max(0, timeLimit - elapsedTime)) : formatTime(elapsedTime)}
                            </ThemedText>
                        </View>
                    )}
                </View>

                <View style={[styles.questionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View style={styles.questionType}>
                        <Ionicons
                            name={
                                currentQuestion.type === 'reference' ? 'book' :
                                    currentQuestion.type === 'content' ? 'chatbox' :
                                        currentQuestion.type === 'inference' ? 'bulb' :
                                            currentQuestion.type === 'multiple-select' ? 'checkbox' :
                                                'list'
                            }
                            size={16}
                            color={theme.accent}
                        />
                        <ThemedText variant="caption" style={[styles.questionTypeText, { color: theme.accent }]}>
                            {currentQuestion.type === 'reference' ? 'SCRIPTURE REFERENCE' :
                                currentQuestion.type === 'content' ? 'QUOTE IDENTIFICATION' :
                                    currentQuestion.type === 'inference' ? 'INFERENCE' :
                                        currentQuestion.type === 'multiple-select' ? 'MULTIPLE SELECT' :
                                            currentQuestion.type === 'true-false-list' ? 'COLLECTION DRILL' :
                                                'FACTS'}
                        </ThemedText>
                    </View>

                    <ThemedText variant="body" style={styles.questionText}>
                        {currentQuestion.text}
                    </ThemedText>

                    <View style={styles.optionsContainer}>
                        {currentQuestion.type === 'true-false-list' ? (
                            // Render T/F/Skip buttons for each option
                            currentQuestion.options.map((option, index) => {
                                const answers = (selectedAnswers[currentQuestion.id] as Record<string, 'T' | 'F' | 'S'>) || {}
                                const currentChoice = answers[option.label];

                                return (
                                    <View key={index} style={[styles.tfRow, { borderBottomColor: theme.border }]}>
                                        <ThemedText variant="body" style={styles.tfOptionText}>
                                            {String.fromCharCode(97 + index)}. {option.label}
                                        </ThemedText>
                                        <View style={styles.tfButtonGroup}>
                                            {(['T', 'F', 'S'] as const).map(value => {
                                                const isSelected = currentChoice === value;
                                                return (
                                                    <TouchableOpacity
                                                        key={value}
                                                        style={[
                                                            styles.tfButton,
                                                            {
                                                                backgroundColor: isSelected
                                                                    ? (value === 'T' ? theme.success : value === 'F' ? theme.error : theme.accent)
                                                                    : 'transparent',
                                                                borderColor: isSelected ? 'transparent' : theme.border,
                                                                flexDirection: 'row',
                                                                gap: 4,
                                                            }
                                                        ]}
                                                        onPress={() => handleOptionSelect(currentQuestion.id, option.label, value)}
                                                    >
                                                        {isSelected && (
                                                            <Ionicons
                                                                name="checkmark-circle"
                                                                size={12}
                                                                color={value === 'S' ? theme.accentContrastText : '#FFF'}
                                                            />
                                                        )}
                                                        <ThemedText
                                                            variant="caption"
                                                            style={[
                                                                styles.tfButtonText,
                                                                {
                                                                    color: isSelected
                                                                        ? (value === 'S' ? theme.accentContrastText : '#FFF')
                                                                        : theme.text
                                                                }
                                                            ]}
                                                        >
                                                            {value === 'T' ? 'TRUE' : value === 'F' ? 'FALSE' : 'SKIP'}
                                                        </ThemedText>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>
                                );
                            })
                        ) : (
                            // Existing multiple choice logic
                            currentQuestion.options.map((option, index) => {
                                const isMultiSelect = currentQuestion.type === 'multiple-select' || currentQuestion.type === 'facts'
                                const currentAnswer = selectedAnswers[currentQuestion.id]
                                const selectedArray = Array.isArray(currentAnswer) ? currentAnswer : []
                                const isSelected = isMultiSelect
                                    ? selectedArray.includes(option.label)
                                    : currentAnswer === option.label

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.optionButton,
                                            {
                                                backgroundColor: isSelected
                                                    ? theme.accent
                                                    : isDark
                                                        ? 'rgba(255,255,255,0.05)'
                                                        : 'rgba(0,0,0,0.02)',
                                                borderColor: isSelected
                                                    ? theme.accent
                                                    : theme.border,
                                            },
                                        ]}
                                        onPress={() => {
                                            if (isMultiSelect) {
                                                const newSelection = isSelected
                                                    ? selectedArray.filter(a => a !== option.label)
                                                    : [...selectedArray, option.label]
                                                handleSelectAnswer(currentQuestion.id, newSelection)
                                            } else {
                                                handleSelectAnswer(currentQuestion.id, option.label)
                                            }
                                        }}
                                    >
                                        <View style={styles.optionLabel}>
                                            <ThemedText
                                                variant="body"
                                                style={[
                                                    styles.optionLabelText,
                                                    {
                                                        color: isSelected
                                                            ? theme.accentContrastText
                                                            : theme.text,
                                                        fontWeight: isSelected ? '700' : '500',
                                                    },
                                                ]}
                                            >
                                                {String.fromCharCode(97 + index)}.
                                            </ThemedText>
                                        </View>
                                        <ThemedText
                                            variant="body"
                                            style={[
                                                styles.optionText,
                                                { color: isSelected ? theme.accentContrastText : theme.text },
                                            ]}
                                            numberOfLines={2}
                                        >
                                            {option.label}
                                        </ThemedText>
                                        {isSelected && (
                                            <Ionicons
                                                name={isMultiSelect ? 'checkbox' : 'radio-button-on'}
                                                size={20}
                                                color={theme.accentContrastText}
                                            />
                                        )}
                                    </TouchableOpacity>
                                )
                            })
                        )}
                    </View>

                    {currentQuestion.explanation && (
                        <View style={styles.hintContainer}>
                            {!showExplanation ? (
                                <TouchableOpacity
                                    style={[styles.revealButton, { borderColor: theme.info }]}
                                    onPress={() => setShowExplanation(true)}
                                >
                                    <Ionicons name="eye" size={16} color={theme.info} />
                                    <ThemedText variant="caption" style={{ color: theme.info, fontWeight: '700' }}>REVEAL HUD HINT</ThemedText>
                                </TouchableOpacity>
                            ) : (
                                <View style={[styles.explanationBox, { backgroundColor: `${theme.info}15` }]}>
                                    <Ionicons name="information-circle" size={16} color={theme.info} />
                                    <ThemedText variant="caption" style={[styles.explanationText, { color: theme.info }]}>
                                        {currentQuestion.explanation}
                                    </ThemedText>
                                </View>
                            )}
                        </View>
                    )}
                </View>

                <View style={styles.navigationButtons}>
                    <TouchableOpacity
                        style={[
                            styles.navButton,
                            {
                                backgroundColor: 'transparent',
                                borderColor: theme.border,
                                borderWidth: 1,
                                opacity: currentQuestionIndex === 0 ? 0.5 : 1,
                            },
                        ]}
                        onPress={handlePreviousQuestion}
                        disabled={currentQuestionIndex === 0}
                    >
                        <Ionicons name="arrow-back" size={20} color={theme.text} />
                        <ThemedText variant="body" style={{ color: theme.text }}>PREVIOUS</ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.navButton, { backgroundColor: theme.accent }]}
                        onPress={handleNextQuestion}
                    >
                        <ThemedText variant="body" style={{ color: theme.accentContrastText }}>
                            {currentQuestionIndex === questionSet.questions.length - 1 ? 'FINISH' : 'NEXT'}
                        </ThemedText>
                        <Ionicons name="arrow-forward" size={20} color={theme.accentContrastText} />
                    </TouchableOpacity>
                </View>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    loadingText: {
        marginTop: 16,
        opacity: 0.7,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 16,
        gap: 12,
    },
    progressBar: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(0,0,0,0.1)',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressText: {
        minWidth: 80,
        textAlign: 'right',
        fontWeight: '600',
    },
    questionCard: {
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
    },
    questionType: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    questionTypeText: {
        letterSpacing: 1,
        fontWeight: '700',
    },
    questionText: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 20,
    },
    optionsContainer: {
        gap: 12,
    },
    tfRow: {
        flexDirection: 'column',
        paddingVertical: 12,
        borderBottomWidth: 1,
        gap: 8,
    },
    tfOptionText: {
        fontSize: 14,
        lineHeight: 20,
    },
    tfButtonGroup: {
        flexDirection: 'row',
        gap: 8,
    },
    tfButton: {
        flex: 1,
        height: 36,
        borderRadius: 8,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tfButtonText: {
        fontWeight: '700',
        fontSize: 10,
    },
    hintContainer: {
        marginTop: 16,
    },
    revealButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderStyle: 'dashed',
        gap: 8,
    },
    explanationBox: {
        flexDirection: 'row',
        padding: 12,
        borderRadius: 10,
        gap: 8,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        gap: 12,
    },
    optionLabel: {
        minWidth: 24,
    },
    optionLabelText: {
        fontSize: 14,
    },
    optionText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
    },
    explanationBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 12,
        borderRadius: 8,
        marginTop: 16,
        gap: 8,
    },
    explanationText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 18,
    },
    navigationButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    navButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    resultsCard: {
        padding: 24,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
    },
    scoreCircle: {
        alignItems: 'center',
        marginBottom: 24,
    },
    scoreText: {
        fontSize: 48,
        fontWeight: '700',
    },
    scoreLabel: {
        marginTop: 8,
        opacity: 0.7,
    },
    resultsMessage: {
        alignItems: 'center',
        marginBottom: 32,
        gap: 12,
    },
    resultsTitle: {
        fontWeight: '700',
    },
    resultsDesc: {
        textAlign: 'center',
        opacity: 0.7,
    },
    resultsActions: {
        width: '100%',
        gap: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    actionButtonText: {
        fontWeight: '700',
        letterSpacing: 1,
    },
    reviewItem: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    reviewOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 4,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    timerHud: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingLeft: 12,
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(255,165,0,0.2)',
    },
    timerText: {
        fontWeight: 'bold',
        fontFamily: 'monospace',
    },
    timeStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 30,
        marginBottom: 24,
        borderWidth: 1,
    },
    configOption: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 60,
    },
    separator: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        width: '100%',
        marginVertical: 4,
    },
    customInput: {
        width: '60%',
        height: 50,
        borderRadius: 12,
        borderWidth: 2,
        textAlign: 'center',
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 8,
    },
})
