import React, { useState, useEffect, useRef } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Modal,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import {
  Target,
  Mic,
  Square,
  Volume2,
  Wind,
  AlertTriangle,
} from 'lucide-react-native'
import {
  TACTICAL_THEME,
  MILITARY_TYPOGRAPHY,
  ACCURACY_COLORS,
} from '@/constants/colors'
import { useSmartVoiceRecognition } from '@/hooks/useSmartVoiceRecognition'

interface TargetPracticeProps {
  onRecordingComplete: (transcript: string, accuracy: number) => void
  targetVerse: string
  isVisible: boolean
  onClose: () => void
}

interface ShotResult {
  accuracy: number
  timestamp: Date
  transcript: string
  feedback: string
  rank: string
}

interface MilitaryFeedback {
  message: string
  rank: string
  color: string
}

export default function TargetPractice({
  onRecordingComplete,
  targetVerse,
  isVisible,
  onClose,
}: TargetPracticeProps) {
  const [shotResults, setShotResults] = useState<ShotResult[]>([])
  const [currentAccuracy, setCurrentAccuracy] = useState(0)
  const [windCondition, setWindCondition] = useState<
    'calm' | 'light' | 'strong'
  >('calm')
  const [rangeDistance, setRangeDistance] = useState(100)
  const [isEngaging, setIsEngaging] = useState(false)
  const [militaryFeedback, setMilitaryFeedback] =
    useState<MilitaryFeedback | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)

  // Use smart voice recognition
  const {
    isRecording,
    transcript,
    error: voiceError,
    startRecording: startVoiceRecording,
    stopRecording: stopVoiceRecording,
    speak,
    processTranscript,
    isInitialized,
    reset: resetVoice,
  } = useSmartVoiceRecognition()

  // Animations
  const crosshairAnimation = useRef(new Animated.Value(1)).current
  const targetAnimation = useRef(new Animated.Value(1)).current
  const feedbackAnimation = useRef(new Animated.Value(0)).current
  const pulseAnimation = useRef(new Animated.Value(0)).current

  // Start pulse animation when engaging
  useEffect(() => {
    if (isEngaging) {
      Animated.loop(
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start()
    } else {
      pulseAnimation.stopAnimation()
      pulseAnimation.setValue(0)
    }
  }, [isEngaging])

  // Military feedback based on accuracy
  const getMilitaryFeedback = (accuracy: number): MilitaryFeedback => {
    if (accuracy >= 95) {
      return {
        message: 'OUTSTANDING SHOT! SNIPER PRECISION!',
        rank: 'EXPERT MARKSMAN',
        color: '#FFD700', // Gold
      }
    } else if (accuracy >= 85) {
      return {
        message: 'EXCELLENT SHOT! TARGET NEUTRALIZED!',
        rank: 'SHARPSHOOTER',
        color: '#00FF00', // Green
      }
    } else if (accuracy >= 75) {
      return {
        message: 'GOOD HIT! SOLID MARKSMANSHIP!',
        rank: 'MARKSMAN',
        color: '#32CD32', // Lime Green
      }
    } else if (accuracy >= 60) {
      return {
        message: 'TARGET HIT! ADJUST AND CONTINUE!',
        rank: 'QUALIFIED',
        color: '#FFA500', // Orange
      }
    } else if (accuracy >= 40) {
      return {
        message: 'NEAR MISS! RECALIBRATE YOUR SIGHTS!',
        rank: 'TRAINEE',
        color: '#FF6347', // Tomato
      }
    } else {
      return {
        message: 'MISSED TARGET! RETURN TO BASIC TRAINING!',
        rank: 'RECRUIT',
        color: '#FF0000', // Red
      }
    }
  }

  useEffect(() => {
    if (isRecording) {
      // Start crosshair animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(crosshairAnimation, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(crosshairAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start()

      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start()
    } else {
      crosshairAnimation.stopAnimation()
      pulseAnimation.stopAnimation()
      crosshairAnimation.setValue(1)
      pulseAnimation.setValue(1)
    }
  }, [isRecording])

  const startRecording = async () => {
    try {
      setIsEngaging(true)
      setMilitaryFeedback({
        message: 'ACQUIRING TARGET... STAND BY...',
        rank: 'ENGAGING',
        color: '#FFA500',
      })
      setShowFeedback(true)

      // Simulate wind conditions affecting difficulty
      const windConditions = ['calm', 'light', 'strong'] as const
      setWindCondition(
        windConditions[Math.floor(Math.random() * windConditions.length)]
      )

      // Reset previous results
      resetVoice()

      // Brief delay for dramatic effect
      await new Promise((resolve) => setTimeout(resolve, 800))

      // Start voice recording
      const success = await startVoiceRecording()
      if (success) {
        setMilitaryFeedback({
          message: 'TARGET ACQUIRED! WEAPONS HOT! SPEAK NOW!',
          rank: 'RECORDING',
          color: '#FF0000',
        })
        setIsEngaging(false)
      } else {
        setMilitaryFeedback({
          message: 'WEAPON MALFUNCTION! CHECK YOUR EQUIPMENT!',
          rank: 'ERROR',
          color: '#FF0000',
        })
        setIsEngaging(false)
        // Hide feedback after error
        setTimeout(() => setShowFeedback(false), 2000)
      }
    } catch (error) {
      console.error('Error starting recording:', error)
      setMilitaryFeedback({
        message: 'MISSION ABORT! TECHNICAL DIFFICULTIES!',
        rank: 'ABORT',
        color: '#FF0000',
      })
      setIsEngaging(false)
      setTimeout(() => setShowFeedback(false), 2000)
    }
  }

  const stopRecording = async () => {
    setIsEngaging(false)
    setMilitaryFeedback({
      message: 'CEASE FIRE! ANALYZING SHOT...',
      rank: 'ANALYZING',
      color: '#FFA500',
    })

    const success = await stopVoiceRecording()
    if (!success) {
      console.error('Failed to stop voice recording in target practice')
      setMilitaryFeedback({
        message: 'COMMUNICATION ERROR! MISSION INCOMPLETE!',
        rank: 'ERROR',
        color: '#FF0000',
      })
      setTimeout(() => setShowFeedback(false), 2000)
    }
  }

  // Handle when transcript is available
  useEffect(() => {
    if (!isRecording && transcript && transcript.trim()) {
      // Calculate accuracy using the voice recognition's built-in method
      const calculatedAccuracy = processTranscript(targetVerse)

      // Apply wind condition modifier
      let finalAccuracy = calculatedAccuracy
      switch (windCondition) {
        case 'light':
          finalAccuracy = Math.max(0, calculatedAccuracy - 5)
          break
        case 'strong':
          finalAccuracy = Math.max(0, calculatedAccuracy - 15)
          break
      }

      // Get military feedback
      const feedback = getMilitaryFeedback(finalAccuracy)

      const shotResult: ShotResult = {
        accuracy: finalAccuracy,
        timestamp: new Date(),
        transcript: transcript,
        feedback: feedback.message,
        rank: feedback.rank,
      }

      setShotResults((prev) => [...prev, shotResult])
      setCurrentAccuracy(finalAccuracy)
      setMilitaryFeedback(feedback)
      setShowFeedback(true)

      // Target hit animation with feedback
      Animated.sequence([
        Animated.timing(targetAnimation, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(targetAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()

      // Show feedback animation
      Animated.sequence([
        Animated.timing(feedbackAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2500),
        Animated.timing(feedbackAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowFeedback(false)
      })

      onRecordingComplete(transcript, finalAccuracy)
    }
  }, [
    isRecording,
    transcript,
    targetVerse,
    windCondition,
    processTranscript,
    onRecordingComplete,
  ])

  const speakTarget = async () => {
    const success = await speak(targetVerse)
    if (!success) {
      console.error('Failed to speak target verse')
    }
  }

  const getWindIcon = () => {
    switch (windCondition) {
      case 'calm':
        return null
      case 'light':
        return <Wind size={16} color={TACTICAL_THEME.warning} />
      case 'strong':
        return <Wind size={16} color={TACTICAL_THEME.error} />
    }
  }

  const getWindDescription = () => {
    switch (windCondition) {
      case 'calm':
        return 'CALM CONDITIONS'
      case 'light':
        return 'LIGHT CROSSWIND'
      case 'strong':
        return 'STRONG HEADWIND'
    }
  }

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 95) return ACCURACY_COLORS.excellent
    if (accuracy >= 85) return ACCURACY_COLORS.good
    if (accuracy >= 75) return ACCURACY_COLORS.fair
    return ACCURACY_COLORS.poor
  }

  const getHitZone = (accuracy: number) => {
    if (accuracy >= 95) return 'BULLSEYE'
    if (accuracy >= 85) return 'INNER RING'
    if (accuracy >= 75) return 'OUTER RING'
    return 'MISS'
  }

  const averageAccuracy =
    shotResults.length > 0
      ? shotResults.reduce((sum, shot) => sum + shot.accuracy, 0) /
        shotResults.length
      : 0

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <LinearGradient
        colors={[TACTICAL_THEME.background, '#0D0D0D']}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeText, MILITARY_TYPOGRAPHY.button]}>
              CEASE FIRE
            </Text>
          </TouchableOpacity>

          <Text style={[styles.title, MILITARY_TYPOGRAPHY.heading]}>
            TARGET PRACTICE
          </Text>

          <View style={styles.rangeInfo}>
            <Text style={[styles.rangeText, MILITARY_TYPOGRAPHY.caption]}>
              {rangeDistance}M RANGE
            </Text>
          </View>
        </View>

        {/* Wind conditions and voice status */}
        <View style={styles.conditionsContainer}>
          <View style={styles.windIndicator}>
            {getWindIcon()}
            <Text style={[styles.windText, MILITARY_TYPOGRAPHY.caption]}>
              {getWindDescription()}
            </Text>
          </View>

          {voiceError && (
            <View style={styles.voiceErrorContainer}>
              <Text style={styles.voiceErrorText}>VOICE ERROR</Text>
            </View>
          )}
        </View>

        {/* Target area */}
        <View style={styles.targetArea}>
          <Animated.View
            style={[styles.target, { transform: [{ scale: targetAnimation }] }]}
          >
            {/* Crosshair */}
            <Animated.View
              style={[
                styles.crosshair,
                {
                  transform: [{ scale: crosshairAnimation }],
                  opacity: isRecording ? 1 : 0.5,
                },
              ]}
            >
              <View style={styles.crosshairHorizontal} />
              <View style={styles.crosshairVertical} />
            </Animated.View>

            {/* Target rings */}
            <View style={[styles.targetRing, styles.outerRing]} />
            <View style={[styles.targetRing, styles.middleRing]} />
            <View style={[styles.targetRing, styles.innerRing]} />
            <View style={[styles.targetRing, styles.bullseye]} />

            {/* Recording indicator */}
            {isRecording && (
              <Animated.View
                style={[
                  styles.recordingIndicator,
                  { transform: [{ scale: pulseAnimation }] },
                ]}
              >
                <Text
                  style={[styles.recordingText, MILITARY_TYPOGRAPHY.caption]}
                >
                  RECORDING
                </Text>
              </Animated.View>
            )}
          </Animated.View>
        </View>

        {/* Military Feedback Display */}
        {showFeedback && militaryFeedback && (
          <Animated.View
            style={[
              styles.militaryFeedback,
              {
                opacity: feedbackAnimation,
                transform: [
                  {
                    translateY: feedbackAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View
              style={[
                styles.feedbackHeader,
                { borderColor: militaryFeedback.color },
              ]}
            >
              <Text
                style={[styles.feedbackRank, { color: militaryFeedback.color }]}
              >
                {militaryFeedback.rank}
              </Text>
            </View>
            <Text
              style={[
                styles.feedbackMessage,
                { color: militaryFeedback.color },
              ]}
            >
              {militaryFeedback.message}
            </Text>
          </Animated.View>
        )}

        {/* Shot grouping display */}
        {shotResults.length > 0 && (
          <View style={styles.shotGrouping}>
            <Text
              style={[styles.groupingTitle, MILITARY_TYPOGRAPHY.subheading]}
            >
              SHOT GROUPING
            </Text>
            <View style={styles.groupingStats}>
              <Text style={[styles.statText, MILITARY_TYPOGRAPHY.body]}>
                SHOTS: {shotResults.length}
              </Text>
              <Text style={[styles.statText, MILITARY_TYPOGRAPHY.body]}>
                AVG: {averageAccuracy.toFixed(1)}%
              </Text>
              <Text
                style={[
                  styles.statText,
                  MILITARY_TYPOGRAPHY.body,
                  { color: getAccuracyColor(currentAccuracy) },
                ]}
              >
                LAST: {getHitZone(currentAccuracy)}
              </Text>
            </View>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, styles.speakButton]}
            onPress={speakTarget}
            testID="speak-target-button"
          >
            <Volume2 size={24} color={TACTICAL_THEME.text} />
            <Text style={[styles.controlText, MILITARY_TYPOGRAPHY.button]}>
              HEAR TARGET
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlButton,
              isRecording ? styles.stopButton : styles.recordButton,
              isEngaging && styles.engagingButton,
            ]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isEngaging}
            testID={isRecording ? 'stop-recording' : 'start-recording'}
          >
            {isRecording ? (
              <Square size={24} color={TACTICAL_THEME.text} />
            ) : isEngaging ? (
              <Animated.View
                style={{
                  transform: [
                    {
                      rotate: pulseAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                }}
              >
                <Target size={24} color={TACTICAL_THEME.text} />
              </Animated.View>
            ) : (
              <Target size={24} color={TACTICAL_THEME.text} />
            )}
            <Text style={[styles.controlText, MILITARY_TYPOGRAPHY.button]}>
              {isRecording
                ? 'CEASE FIRE'
                : isEngaging
                ? 'ACQUIRING...'
                : 'ENGAGE TARGET'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Last shot result */}
        {currentAccuracy > 0 && (
          <View style={styles.lastShotResult}>
            <Text style={[styles.resultTitle, MILITARY_TYPOGRAPHY.subheading]}>
              SHOT RESULT
            </Text>
            <Text
              style={[
                styles.resultAccuracy,
                MILITARY_TYPOGRAPHY.title,
                { color: getAccuracyColor(currentAccuracy) },
              ]}
            >
              {currentAccuracy.toFixed(1)}%
            </Text>
            <Text
              style={[
                styles.resultZone,
                MILITARY_TYPOGRAPHY.body,
                { color: getAccuracyColor(currentAccuracy) },
              ]}
            >
              {getHitZone(currentAccuracy)}
            </Text>
          </View>
        )}
      </LinearGradient>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    color: TACTICAL_THEME.error,
  },
  title: {
    color: TACTICAL_THEME.text,
  },
  rangeInfo: {
    alignItems: 'flex-end',
  },
  rangeText: {
    color: TACTICAL_THEME.textSecondary,
  },
  conditionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  windIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  windText: {
    color: TACTICAL_THEME.textSecondary,
  },
  voiceStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  voiceStatusText: {
    color: TACTICAL_THEME.warning,
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  voiceErrorContainer: {
    backgroundColor: 'rgba(220, 53, 69, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  voiceErrorText: {
    color: TACTICAL_THEME.error,
    fontSize: 10,
    fontWeight: 'bold',
  },
  targetArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  target: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  crosshair: {
    position: 'absolute',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  crosshairHorizontal: {
    position: 'absolute',
    width: 40,
    height: 2,
    backgroundColor: TACTICAL_THEME.accent,
  },
  crosshairVertical: {
    position: 'absolute',
    width: 2,
    height: 40,
    backgroundColor: TACTICAL_THEME.accent,
  },
  targetRing: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 100,
  },
  outerRing: {
    width: 200,
    height: 200,
    borderColor: TACTICAL_THEME.border,
  },
  middleRing: {
    width: 150,
    height: 150,
    borderColor: TACTICAL_THEME.textSecondary,
  },
  innerRing: {
    width: 100,
    height: 100,
    borderColor: TACTICAL_THEME.warning,
  },
  bullseye: {
    width: 50,
    height: 50,
    borderColor: TACTICAL_THEME.accent,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
  },
  recordingIndicator: {
    position: 'absolute',
    top: -40,
    backgroundColor: TACTICAL_THEME.error,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recordingText: {
    color: TACTICAL_THEME.text,
    fontWeight: 'bold',
  },
  shotGrouping: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  groupingTitle: {
    color: TACTICAL_THEME.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  groupingStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statText: {
    color: TACTICAL_THEME.textSecondary,
  },
  controls: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 20,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  speakButton: {
    backgroundColor: TACTICAL_THEME.secondary,
  },
  recordButton: {
    backgroundColor: TACTICAL_THEME.accent,
  },
  stopButton: {
    backgroundColor: TACTICAL_THEME.error,
  },
  controlText: {
    color: TACTICAL_THEME.text,
  },
  lastShotResult: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  resultTitle: {
    color: TACTICAL_THEME.textSecondary,
    marginBottom: 8,
  },
  resultAccuracy: {
    marginBottom: 4,
  },
  resultZone: {
    fontWeight: 'bold',
  },
  engagingButton: {
    backgroundColor: '#FF8C00', // Dark orange for engaging state
    opacity: 0.8,
  },
  militaryFeedback: {
    position: 'absolute',
    top: '50%',
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    zIndex: 1000,
  },
  feedbackHeader: {
    borderBottomWidth: 2,
    paddingBottom: 8,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  feedbackRank: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 2,
  },
  feedbackMessage: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
})
