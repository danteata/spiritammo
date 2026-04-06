import { useState, useEffect, useCallback, useMemo } from 'react'
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
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
    const { scriptures, collections, isDark, theme } = useAppStore()
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
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string | string[]>>({})
    const [showResults, setShowResults] = useState(false)
    const [score, setScore] = useState({ correct: 0, total: 0 })
    const [isGenerating, setIsGenerating] = useState(false)

    useEffect(() => {
        if (collectionScriptures.length > 0 && !questionSet) {
            generateQuestions()
        }
    }, [collectionScriptures])

    const generateQuestions = useCallback(async () => {
        if (collectionScriptures.length === 0) return

        setIsGenerating(true)
        try {
            const qs = generateCollectionQuestions(collectionScriptures, collectionId)
            setQuestionSet(qs)
            setCurrentQuestionIndex(0)
            setSelectedAnswers({})
            setShowResults(false)
            setScore({ correct: 0, total: 0 })

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

    const handleSelectAnswer = useCallback((questionId: string, answer: string | string[]) => {
        setSelectedAnswers(prev => ({
            ...prev,
            [questionId]: answer,
        }))
    }, [])

    const handleNextQuestion = useCallback(() => {
        if (!questionSet || !currentQuestion) return

        const answer = selectedAnswers[currentQuestion.id]
        if (!answer) {
            Toast.warning('No Answer Selected', 'Please select an answer before proceeding.')
            return
        }

        let isCorrect = false
        if (currentQuestion.type === 'multiple-select' || currentQuestion.type === 'facts') {
            if (Array.isArray(currentQuestion.correctAnswer) && Array.isArray(answer)) {
                const correctSet = new Set(currentQuestion.correctAnswer.map(a => a.toLowerCase()))
                const answerSet = new Set(answer.map(a => a.toLowerCase()))
                isCorrect = correctSet.size === answerSet.size &&
                    [...correctSet].every(a => answerSet.has(a))
            }
        } else {
            if (typeof currentQuestion.correctAnswer === 'string' && typeof answer === 'string') {
                isCorrect = currentQuestion.correctAnswer.toLowerCase() === answer.toLowerCase()
            }
        }

        if (isCorrect) {
            setScore(prev => ({ correct: prev.correct + 1, total: prev.total + 1 }))
        } else {
            setScore(prev => ({ ...prev, total: prev.total + 1 }))
        }

        trackEvent(AnalyticsEventType.QUIZ_QUESTION_ANSWERED, {
            question_id: currentQuestion.id,
            is_correct: isCorrect,
            question_type: currentQuestion.type,
        })

        if (currentQuestionIndex < questionSet.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1)
        } else {
            setShowResults(true)
            trackEvent(AnalyticsEventType.QUIZ_COMPLETED, {
                collection_id: collectionId,
                score: score.correct + (isCorrect ? 1 : 0),
                total: score.total + 1,
                total_questions: questionSet.questions.length,
            })
        }
    }, [questionSet, currentQuestion, selectedAnswers, currentQuestionIndex, score, collectionId, trackEvent])

    const handlePreviousQuestion = useCallback(() => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1)
        }
    }, [currentQuestionIndex])

    const handleRestartQuiz = useCallback(() => {
        generateQuestions()
    }, [generateQuestions])

    const handleBackToCollection = useCallback(() => {
        router.back()
    }, [router])

    if (isGenerating || !questionSet) {
        return (
            <ThemedContainer style={styles.container}>
                <ScreenHeader title="GENERATING QUIZ" subtitle="Preparing ammunition..." />
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
        const percentage = score.total > 0 ? (score.correct / score.total) * 100 : 0
        return (
            <ThemedContainer style={styles.container}>
                <ScreenHeader title="MISSION REPORT" subtitle="Quiz Results" />
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                    <View style={[styles.resultsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <View style={styles.scoreCircle}>
                            <ThemedText variant="title" style={[styles.scoreText, { color: theme.accent }]}>
                                {percentage.toFixed(0)}%
                            </ThemedText>
                            <ThemedText variant="body" style={styles.scoreLabel}>
                                {score.correct}/{score.total} Correct
                            </ThemedText>
                        </View>

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
                                    <ThemedText variant="h3" style={[styles.resultsTitle, { color: theme.warning }]}>
                                        Good Progress!
                                    </ThemedText>
                                    <ThemedText variant="body" style={styles.resultsDesc}>
                                        Keep training to achieve mastery.
                                    </ThemedText>
                                </>
                            ) : (
                                <>
                                    <Ionicons name="refresh" size={48} color={theme.error} />
                                    <ThemedText variant="h3" style={[styles.resultsTitle, { color: theme.error }]}>
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
                                    RETRY MISSION
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
                        Score: {score.correct}/{score.total}
                    </ThemedText>
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
                             'FACTS'}
                        </ThemedText>
                    </View>

                    <ThemedText variant="body" style={styles.questionText}>
                        {currentQuestion.text}
                    </ThemedText>

                    <View style={styles.optionsContainer}>
                        {currentQuestion.options.map((option, index) => {
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
                        })}
                    </View>

                    {currentQuestion.explanation && (
                        <View style={[styles.explanationBox, { backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)' }]}>
                            <Ionicons name="information-circle" size={16} color={theme.info} />
                            <ThemedText variant="caption" style={[styles.explanationText, { color: theme.info }]}>
                                {currentQuestion.explanation}
                            </ThemedText>
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
})
