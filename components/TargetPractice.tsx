import React, { useState, useEffect, useRef } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Modal,
  Alert,
  Platform,
  StatusBar,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome, Feather, Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import {
  TACTICAL_THEME,
  GARRISON_THEME,
  MILITARY_TYPOGRAPHY,
  ACCURACY_COLORS,
} from '@/constants/colors'
import VoiceRecorder from '@/components/VoiceRecorder'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedText } from '@/components/Themed'

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
  const { isDark } = useAppStore()
  const theme = isDark ? TACTICAL_THEME : GARRISON_THEME

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
    console.log('🎤 TargetPractice: handleVoiceRecorderComplete called with accuracy:', accuracy)
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

    console.log('🎤 TargetPractice: Final accuracy after wind conditions:', finalAccuracy)
    setCurrentAccuracy(finalAccuracy)

    // Record shot result
    const newResult: ShotResult = {
      accuracy: finalAccuracy,
      timestamp: new Date(),
      transcript: '' // Transcript not available here but could be passed
    }
    setShotResults(prev => [...prev, newResult])

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

    // **FIX: Call the parent's onRecordingComplete to update stats**
    console.log('🎤 TargetPractice: Calling parent onRecordingComplete with accuracy:', finalAccuracy)
    onRecordingComplete('', finalAccuracy)
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


  const renderContent = () => (
    <>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onClose}
          style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
        >
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <ThemedText variant="heading" style={styles.title}>
            TARGET PRACTICE
          </ThemedText>
          <View style={styles.windIndicator}>
            {getWindIcon()}
            <ThemedText variant="caption" style={styles.subTitle}>
              {getWindDescription()}
            </ThemedText>
          </View>
        </View>

        <View style={{ width: 40 }} />
      </View>

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
              <View style={[styles.crosshairHorizontal, { backgroundColor: theme.accent }]} />
              <View style={[styles.crosshairVertical, { backgroundColor: theme.accent }]} />
            </View>

            {/* Target rings */}
            <View style={[styles.targetRing, styles.outerRing, { borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }]} />
            <View style={[styles.targetRing, styles.middleRing, { borderColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }]} />
            <View style={[styles.targetRing, styles.innerRing, { borderColor: TACTICAL_THEME.warning }]} />
            <View style={[styles.targetRing, styles.bullseye, { borderColor: theme.accent, backgroundColor: 'rgba(255, 107, 53, 0.2)' }]} />

            {/* Bullet Holes */}
            {shots.map(shot => (
              <View
                key={shot.id}
                style={[
                  styles.bulletHole,
                  {
                    left: shot.x - 4, // Center the 8px hole
                    top: shot.y - 4,
                    backgroundColor: shot.isHit ? (isDark ? '#1a1a1a' : '#000') : TACTICAL_THEME.error,
                    borderColor: shot.isHit ? 'rgba(255,255,255,0.5)' : 'rgba(255,0,0,0.3)',
                  }
                ]}
              />
            ))}
          </Animated.View>
        </View>
      )}

      {/* Verse Display - Hide when recording */}
      {!showVoiceRecorder && (
        <View style={[styles.verseContainer, {
          backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.8)',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
        }]}>
          <Text style={[styles.verseText, MILITARY_TYPOGRAPHY.body, { color: theme.text }]}>
            "{targetVerse}"
          </Text>
        </View>
      )}

      {/* Shot grouping display */}
      {shotResults.length > 0 && (
        <View style={styles.shotGrouping}>
          <ThemedText variant="subheading" style={styles.groupingTitle}>
            SHOT GROUPING
          </ThemedText>
          <View style={styles.groupingStats}>
            <ThemedText variant="body" style={styles.statText}>
              SHOTS: {shotResults.length}
            </ThemedText>
            <ThemedText variant="body" style={styles.statText}>
              AVG: {averageAccuracy.toFixed(1)}%
            </ThemedText>
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
          style={[styles.controlButton, styles.speakButton, { backgroundColor: isDark ? '#5D4037' : '#D7CCC8' }]}
          onPress={speakTarget}
          testID="speak-target-button"
        >
          <FontAwesome
            name={isPlaying ? "volume-up" : "volume-off"}
            size={20}
            color={isPlaying ? theme.accent : (isDark ? 'white' : 'black')}
          />
          <Text style={[styles.controlText, MILITARY_TYPOGRAPHY.button, { color: isDark ? 'white' : 'black' }, isPlaying && { color: theme.accent }]}>
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
          <Text style={[styles.controlText, MILITARY_TYPOGRAPHY.button, { color: 'white' }]}>
            ENGAGE TARGET
          </Text>
        </TouchableOpacity>
      </View>

      {/* Last shot result */}
      {currentAccuracy > 0 && (
        <View style={styles.lastShotResult}>
          <ThemedText variant="subheading" style={styles.resultTitle}>
            SHOT RESULT
          </ThemedText>
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
    </>

  )

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      {isDark ? (
        <LinearGradient
          colors={[TACTICAL_THEME.background, '#0D0D0D']}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    letterSpacing: 1,
  },
  subTitle: {
    fontSize: 10,
    marginLeft: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  windIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
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
  },
  crosshairVertical: {
    position: 'absolute',
    width: 2,
    height: 40,
  },
  targetRing: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 100,
  },
  outerRing: {
    width: 200,
    height: 200,
  },
  middleRing: {
    width: 150,
    height: 150,
  },
  innerRing: {
    width: 100,
    height: 100,
  },
  bullseye: {
    width: 50,
    height: 50,
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
    borderRadius: 12,
    borderWidth: 1,
  },
  verseText: {
    textAlign: 'center',
    fontStyle: 'italic',
    fontSize: 16,
    lineHeight: 24,
  },
  shotGrouping: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  groupingTitle: {
    textAlign: 'center',
    marginBottom: 12,
  },
  groupingStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statText: {
    opacity: 0.8,
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
    // Background color handled inline
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
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  lastShotResult: {
    alignItems: 'center',
    paddingBottom: 50,
  },
  resultTitle: {
    marginBottom: 10,
    opacity: 0.8,
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
})
