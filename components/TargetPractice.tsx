import React, { useState, useEffect, useRef } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Modal,
  Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome, Feather } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import {
  TACTICAL_THEME,
  MILITARY_TYPOGRAPHY,
  ACCURACY_COLORS,
} from '@/constants/colors'
import VoiceRecorder from '@/components/VoiceRecorder'

interface TargetPracticeProps {
  onRecordingComplete: (transcript: string, accuracy: number) => void
  targetVerse: string
  intelText?: string
  isVisible: boolean
  onClose: () => void
}

interface ShotResult {
  accuracy: number
  timestamp: Date
  transcript: string
}

interface BulletHole {
  id: string
  x: number
  y: number
  isHit: boolean
}

export default function TargetPractice({
  onRecordingComplete,
  targetVerse,
  intelText,
  isVisible,
  onClose,
}: TargetPracticeProps) {
  const [shotResults, setShotResults] = useState<ShotResult[]>([])
  const [currentAccuracy, setCurrentAccuracy] = useState(0)
  const [windCondition, setWindCondition] = useState<
    'calm' | 'light' | 'strong'
  >('calm')
  const [rangeDistance, setRangeDistance] = useState(100)
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [shots, setShots] = useState<BulletHole[]>([])
  const [isPlaying, setIsPlaying] = useState(false)

  // Animations
  const targetAnimation = useRef(new Animated.Value(1)).current
  const shakeAnimation = useRef(new Animated.Value(0)).current

  const handleVoiceRecorderComplete = (accuracy: number) => {
    // Apply wind condition modifier to accuracy
    let finalAccuracy = accuracy
    switch (windCondition) {
      case 'light':
        finalAccuracy = Math.max(0, accuracy - 5)
        break
      case 'strong':
        finalAccuracy = Math.max(0, accuracy - 15)
        break
    }

    setCurrentAccuracy(finalAccuracy)

    // Calculate shot position
    // Target size is 200x200, center is 100,100
    // Accuracy 100 = center (0 deviation)
    // Accuracy 0 = edge/miss (100 deviation)
    const maxDeviation = 100
    const deviation = maxDeviation * (1 - finalAccuracy / 100)
    const angle = Math.random() * Math.PI * 2
    // Add some randomness to the distance based on deviation
    const distance = deviation * (0.8 + Math.random() * 0.4)

    const x = 100 + Math.cos(angle) * distance
    const y = 100 + Math.sin(angle) * distance

    const isHit = finalAccuracy > 60 // Arbitrary threshold for "hit" vs "miss" visual

    const newShot: BulletHole = {
      id: Date.now().toString(),
      x,
      y,
      isHit
    }

    setShots(prev => [...prev, newShot])

    // Animations
    if (isHit) {
      // Pulse animation for hit
      Animated.sequence([
        Animated.timing(targetAnimation, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(targetAnimation, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      // Shake animation for miss
      Animated.sequence([
        Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start()
    }

    // Simulate wind conditions affecting difficulty
    const windConditions = ['calm', 'light', 'strong'] as const
    setWindCondition(
      windConditions[Math.floor(Math.random() * windConditions.length)]
    )

    setShowVoiceRecorder(false)
  }

  // Handle recording completion from VoiceRecorder
  const handleRecordingComplete = (transcript: string, accuracy: number) => {
    handleVoiceRecorderComplete(accuracy)
  }

  const speakTarget = () => {
    if (isPlaying) {
      Speech.stop()
      setIsPlaying(false)
      return
    }

    Speech.speak(targetVerse, {
      onStart: () => setIsPlaying(true),
      onDone: () => setIsPlaying(false),
      onStopped: () => setIsPlaying(false),
      rate: 0.9,
    })
  }

  const getWindIcon = () => {
    switch (windCondition) {
      case 'calm':
        return null
      case 'light':
        return <Feather name="wind" size={16} color={TACTICAL_THEME.warning} />
      case 'strong':
        return <Feather name="wind" size={16} color={TACTICAL_THEME.error} />
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onClose} style={styles.closeButtonContainer}>
              <Text style={[styles.statusText, MILITARY_TYPOGRAPHY.button]}>
                CEASE FIRE
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.headerCenter}>
            <Text style={[styles.title, MILITARY_TYPOGRAPHY.heading]}>
              TARGET PRACTICE
            </Text>
            <Text style={[styles.subTitle, MILITARY_TYPOGRAPHY.caption]}>
              {getWindDescription()}
            </Text>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesome name="times" size={24} color={TACTICAL_THEME.error} />
          </TouchableOpacity>
        </View>

        {/* Wind conditions */}


        {/* Voice Recorder Modal */}
        {showVoiceRecorder && (
          <VoiceRecorder
            scriptureText={targetVerse}
            intelText={intelText}
            onRecordingComplete={handleVoiceRecorderComplete}
          />
        )}

        {/* Target area - Hide when recording to prevent clutter */}
        {!showVoiceRecorder && (
          <View style={styles.targetArea}>
            <Animated.View
              style={[styles.target, { transform: [{ scale: targetAnimation }] }]}
            >
              {/* Crosshair - always visible */}
              <View style={styles.crosshair}>
                <View style={styles.crosshairHorizontal} />
                <View style={styles.crosshairVertical} />
              </View>

              {/* Target rings */}
              <View style={[styles.targetRing, styles.outerRing]} />
              <View style={[styles.targetRing, styles.middleRing]} />
              <View style={[styles.targetRing, styles.innerRing]} />
              <View style={[styles.targetRing, styles.bullseye]} />

              {/* Bullet Holes */}
              {shots.map(shot => (
                <View
                  key={shot.id}
                  style={[
                    styles.bulletHole,
                    {
                      left: shot.x - 4, // Center the 8px hole
                      top: shot.y - 4,
                      backgroundColor: shot.isHit ? '#1a1a1a' : TACTICAL_THEME.error,
                      borderColor: shot.isHit ? 'rgba(255,255,255,0.2)' : 'rgba(255,0,0,0.3)',
                    }
                  ]}
                />
              ))}
            </Animated.View>
          </View>
        )}

        {/* Verse Display - Hide when recording */}
        {!showVoiceRecorder && (
          <View style={styles.verseContainer}>
            <Text style={[styles.verseText, MILITARY_TYPOGRAPHY.body]}>
              "{targetVerse}"
            </Text>
          </View>
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
            <FontAwesome
              name={isPlaying ? "volume-up" : "volume-off"}
              size={20}
              color={isPlaying ? TACTICAL_THEME.accent : TACTICAL_THEME.text}
            />
            <Text style={[styles.controlText, MILITARY_TYPOGRAPHY.button, isPlaying && { color: TACTICAL_THEME.accent }]}>
              {isPlaying ? "PLAYING..." : "HEAR TARGET"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.recordButton]}
            onPress={() => setShowVoiceRecorder(true)}
            testID="start-recording"
          >
            <View style={styles.recordIconOuter}>
              <View style={styles.recordIconInner} />
            </View>
            <Text style={[styles.controlText, MILITARY_TYPOGRAPHY.button]}>
              ENGAGE TARGET
            </Text>
          </TouchableOpacity>
        </View>

        {/* Last shot result */}
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
                { color: getAccuracyColor(currentAccuracy), fontSize: 48 },
              ]}
            >
              {currentAccuracy.toFixed(1)}%
            </Text>
            <Text
              style={[
                styles.resultZone,
                MILITARY_TYPOGRAPHY.body,
                { color: getAccuracyColor(currentAccuracy), letterSpacing: 2 },
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
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  closeButtonContainer: {
    padding: 8,
    marginLeft: -8, // Align with padding
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
  },
  statusText: {
    color: TACTICAL_THEME.error,
    fontSize: 12,
    fontWeight: 'bold',
  },
  title: {
    color: TACTICAL_THEME.text,
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  subTitle: {
    color: TACTICAL_THEME.textSecondary,
    fontSize: 10,
    marginTop: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  closeButton: {
    flex: 1,
    alignItems: 'flex-end',
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
    gap: 12,
    marginBottom: 30,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  speakButton: {
    backgroundColor: '#5D4037', // Brownish
  },
  recordButton: {
    backgroundColor: '#FF6B35', // Orange
  },
  recordIconOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordIconInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'white',
  },
  controlText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  lastShotResult: {
    alignItems: 'center',
    paddingBottom: 50,
  },
  resultTitle: {
    color: TACTICAL_THEME.textSecondary,
    marginBottom: 10,
    fontSize: 14,
    letterSpacing: 1,
  },
  resultAccuracy: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  resultZone: {
    fontWeight: 'bold',
    fontSize: 14,
    textTransform: 'uppercase',
  },
  bulletHole: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 1,
  },
  verseContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  verseText: {
    color: TACTICAL_THEME.text,
    textAlign: 'center',
    fontStyle: 'italic',
    fontSize: 16,
    lineHeight: 24,
  },
})
