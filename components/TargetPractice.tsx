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
import { Target, Mic, Square, Volume2, Wind } from 'lucide-react-native'
import {
  TACTICAL_THEME,
  MILITARY_TYPOGRAPHY,
  ACCURACY_COLORS,
} from '@/constants/colors'

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
}

export default function TargetPractice({
  onRecordingComplete,
  targetVerse,
  isVisible,
  onClose,
}: TargetPracticeProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [shotResults, setShotResults] = useState<ShotResult[]>([])
  const [currentAccuracy, setCurrentAccuracy] = useState(0)
  const [windCondition, setWindCondition] = useState<
    'calm' | 'light' | 'strong'
  >('calm')
  const [rangeDistance, setRangeDistance] = useState(100)

  // Animations
  const crosshairAnimation = useRef(new Animated.Value(1)).current
  const targetAnimation = useRef(new Animated.Value(1)).current
  const pulseAnimation = useRef(new Animated.Value(1)).current

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

  const startRecording = () => {
    setIsRecording(true)
    // Simulate wind conditions affecting difficulty
    const windConditions = ['calm', 'light', 'strong'] as const
    setWindCondition(
      windConditions[Math.floor(Math.random() * windConditions.length)]
    )
  }

  const stopRecording = () => {
    setIsRecording(false)

    // Simulate speech recognition result
    const simulatedTranscript = targetVerse // In real app, this would come from voice recognition
    const baseAccuracy = Math.floor(Math.random() * 30) + 70

    // Apply wind condition modifier
    let finalAccuracy = baseAccuracy
    switch (windCondition) {
      case 'light':
        finalAccuracy = Math.max(0, baseAccuracy - 5)
        break
      case 'strong':
        finalAccuracy = Math.max(0, baseAccuracy - 15)
        break
    }

    const shotResult: ShotResult = {
      accuracy: finalAccuracy,
      timestamp: new Date(),
      transcript: simulatedTranscript,
    }

    setShotResults((prev) => [...prev, shotResult])
    setCurrentAccuracy(finalAccuracy)

    // Target hit animation
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

    onRecordingComplete(simulatedTranscript, finalAccuracy)
  }

  const speakTarget = () => {
    // This would use text-to-speech in a real implementation
    console.log('Speaking target verse:', targetVerse)
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

        {/* Wind conditions */}
        <View style={styles.conditionsContainer}>
          <View style={styles.windIndicator}>
            {getWindIcon()}
            <Text style={[styles.windText, MILITARY_TYPOGRAPHY.caption]}>
              {getWindDescription()}
            </Text>
          </View>
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
            ]}
            onPress={isRecording ? stopRecording : startRecording}
            testID={isRecording ? 'stop-recording' : 'start-recording'}
          >
            {isRecording ? (
              <Square size={24} color={TACTICAL_THEME.text} />
            ) : (
              <Target size={24} color={TACTICAL_THEME.text} />
            )}
            <Text style={[styles.controlText, MILITARY_TYPOGRAPHY.button]}>
              {isRecording ? 'CEASE FIRE' : 'ENGAGE TARGET'}
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
})
