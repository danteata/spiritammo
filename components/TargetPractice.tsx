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
import {
  TACTICAL_THEME,
  MILITARY_TYPOGRAPHY,
  ACCURACY_COLORS,
} from '@/constants/colors'
import VoiceRecorder from '@/components/VoiceRecorder'

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
  const [shotResults, setShotResults] = useState<ShotResult[]>([])
  const [currentAccuracy, setCurrentAccuracy] = useState(0)
  const [windCondition, setWindCondition] = useState<
    'calm' | 'light' | 'strong'
  >('calm')
  const [rangeDistance, setRangeDistance] = useState(100)
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)

  // Animations
  const targetAnimation = useRef(new Animated.Value(1)).current

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
    // This would use text-to-speech in a real implementation
    console.log('Speaking target verse:', targetVerse)
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

        {/* Voice Recorder Modal */}
        {showVoiceRecorder && (
          <VoiceRecorder
            scriptureText={targetVerse}
            onRecordingComplete={handleVoiceRecorderComplete}
          />
        )}

        {/* Target area */}
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
            <FontAwesome name="volume-up" size={24} color={TACTICAL_THEME.text} />
            <Text style={[styles.controlText, MILITARY_TYPOGRAPHY.button]}>
              HEAR TARGET
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.recordButton]}
            onPress={() => setShowVoiceRecorder(true)}
            testID="start-recording"
          >
            <FontAwesome name="bullseye" size={24} color={TACTICAL_THEME.text} />
            <Text style={[styles.controlText, MILITARY_TYPOGRAPHY.button]}>
              ENGAGE TARGET
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
  simBanner: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#B00020',
    borderRadius: 8,
    alignItems: 'center',
  },
})
