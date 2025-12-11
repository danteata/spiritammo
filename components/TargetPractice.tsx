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
  ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { FontAwesome, Feather, Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import {
  MILITARY_TYPOGRAPHY,
  ACCURACY_COLORS,
  COLORS
} from '@/constants/colors'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedText } from '@/components/Themed'
import { StatusIndicator } from './ui/StatusIndicator'
import { RecordingControls } from './ui/RecordingControls'
import { AccuracyBadge } from './ui/AccuracyBadge'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useAudioRecording, AudioRecordingResult } from '@/services/audioRecording'
import { calculateTextAccuracy } from '@/utils/accuracyCalculator'
import whisperService from '@/services/whisper'

interface TargetPracticeProps {
  onRecordingComplete: (transcript: string, accuracy: number) => void
  targetVerse: string
  reference?: string
  intelText?: string
  isVisible: boolean
  onClose: () => void
  isAssaultMode?: boolean
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
  reference,
  intelText,
  isVisible,
  onClose,
}: TargetPracticeProps) {
  const { theme, isDark } = useAppStore()

  const { userSettings } = useAppStore()

  const [shotResults, setShotResults] = useState<ShotResult[]>([])
  const [currentAccuracy, setCurrentAccuracy] = useState(0)
  const [windCondition, setWindCondition] = useState<
    'calm' | 'light' | 'strong'
  >('calm')
  const [rangeDistance, setRangeDistance] = useState(100)
  const [isRecordingMode, setIsRecordingMode] = useState(false)
  const [shots, setShots] = useState<BulletHole[]>([])
  const [isPlaying, setIsPlaying] = useState(false)

  // VoiceRecorder state
  const [accuracy, setLocalAccuracy] = useState(0)
  const [showAccuracy, setShowAccuracy] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [audioRecording, setAudioRecording] = useState<AudioRecordingResult | null>(null)
  const [localTranscript, setLocalTranscript] = useState('')
  const [whisperReady, setWhisperReady] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  // Audio recording hook for mobile fallback
  const {
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    deleteRecording,
    isRecording: audioIsRecording,
    error: audioError,
    duration: recordingDuration,
    uri: recordingUri
  } = useAudioRecording()

  // Speech recognition hook
  const {
    isRecognizing,
    transcript,
    interimTranscript,
    error: speechError,
    isAvailable,
    hasPermission,
    start: startSpeechRecognition,
    stop: stopSpeechRecognition,
    resetTranscript,
  } = useSpeechRecognition({
    lang: userSettings.language || 'en-US',
    interimResults: true,
    continuous: false,
    onResult: (resultTranscript, isFinal) => {
      if (isFinal) {
        processTranscript(resultTranscript)
      }
    },
    onError: (errorMessage) => {
      console.error('Speech recognition error:', errorMessage)
    },
  })

  // Animations
  const targetAnimation = useRef(new Animated.Value(1)).current
  const shakeAnimation = useRef(new Animated.Value(0)).current

  // Initialize Whisper and check availability
  useEffect(() => {
    const init = async () => {
      try {
        setIsInitializing(true)
        setStatusMessage('Initializing Whisper model...')
        await whisperService.init()
        console.log('Whisper initialized')
        setWhisperReady(true)
      } catch (error) {
        console.error('Failed to init whisper:', error)
        // Fallback handled by status effect
      } finally {
        setIsInitializing(false)
      }
    }

    init()
  }, [])

  // Clear transcript when scripture changes
  useEffect(() => {
    setLocalTranscript('')
    resetTranscript()
    setLocalAccuracy(0)
    setShowAccuracy(false)
    setAudioRecording(null)
  }, [targetVerse])

  // Update status message during recording or settings change
  useEffect(() => {
    if (isRecognizing) {
      setStatusMessage('Listening... Speak now')
    } else if (audioIsRecording) {
      setStatusMessage(`Recording... ${Math.floor(recordingDuration / 1000)}s`)
    } else if (showAccuracy) {
      setStatusMessage(`Accuracy: ${accuracy}%`)
    } else if (!isInitializing) {
      // Idle state - check settings
      if (!hasPermission) {
        setStatusMessage('Microphone permission needed')
      } else if (userSettings.voiceEngine === 'whisper' && whisperReady) {
        setStatusMessage('Ready to record')
      } else if (isAvailable) {
        setStatusMessage('Ready to listen')
      } else {
        setStatusMessage('Ready to listen')
      }
    }
  }, [isRecognizing, audioIsRecording, recordingDuration, showAccuracy, accuracy, isInitializing, userSettings.voiceEngine, whisperReady, hasPermission, isAvailable])

  // Speak the intel text
  const speakIntel = async () => {
    try {
      // Stop any existing speech
      await Speech.stop()

      const textToSpeak = intelText || "No tactical intel available for this target."

      // Start new speech with proper settings
      await Speech.speak(textToSpeak, {
        rate: userSettings.voiceRate || 0.9,
        pitch: userSettings.voicePitch || 1.0,
        language: userSettings.language || 'en-US',
        onStart: () => {
          setStatusMessage('Reading intel...')
        },
        onDone: () => {
          setStatusMessage('Ready to record')
        },
        onError: (error) => {
          console.error('Speech error:', error)
        }
      })
    } catch (error) {
      console.error('Failed to speak intel:', error)
    }
  }

  // Start recording
  const startRecording = async () => {
    try {
      // Clear previous results
      resetTranscript()
      setLocalTranscript('')
      setLocalAccuracy(0)
      setShowAccuracy(false)
      setAudioRecording(null)

      // Check if we should use Whisper based on settings and availability
      console.log('🎤 VoiceRecorder: userSettings.voiceEngine:', userSettings.voiceEngine)
      console.log('🎤 VoiceRecorder: whisperReady:', whisperReady)

      if (whisperReady && userSettings.voiceEngine === 'whisper') {
        try {
          console.log('🎤 Starting Whisper recording...')
          // 1. Prefer Whisper (Audio Recording) if available
          if (Platform.OS !== 'web') {
            const audioSuccess = await startAudioRecording()
            if (audioSuccess) {
              console.log('Audio recording started (Whisper mode)')
              setStatusMessage('Recording... (Whisper)')
              return
            }
          }
        } catch (error) {
          console.error('Whisper recording failed, falling back to native:', error)
          // Fallback to native if Whisper fails
          // 2. Fallback to Native Speech Recognition
          if (isAvailable) {
            const success = await startSpeechRecognition()
            if (success) {
              setStatusMessage('Speech recognition active')
              return
            }
          }
        }
      } else {
        console.log('🎤 Starting Native recording (Preference: ' + userSettings.voiceEngine + ')')
        // 2. Fallback to Native Speech Recognition
        if (isAvailable) {
          const success = await startSpeechRecognition()
          if (success) {
            setStatusMessage('Speech recognition active')
            return
          }
        }
      }

      // Fallback to audio recording (for platforms without native speech recognition)
      if (Platform.OS !== 'web') {
        const audioSuccess = await startAudioRecording()
        if (audioSuccess) {
          console.log('Audio recording started as fallback')
          setStatusMessage('Audio recording active - using transcription')
          return
        }
      }

      // If we get here, no recording method is available
      console.error('No recording method available on this platform')
    } catch (error) {
      console.error('Error starting recording:', error)
    }
  }

  // Stop recording
  const stopRecording = async () => {
    try {
      if (isRecognizing) {
        // Stop speech recognition
        stopSpeechRecognition()
        return
      }

      if (audioIsRecording) {
        // Stop audio recording
        const audioResult = await stopAudioRecording()
        if (audioResult) {
          setAudioRecording(audioResult)
          console.log('Audio recording stopped:', audioResult)
          // Process the audio file with whisper if available
          await processAudioRecording(audioResult)
        }
      }
    } catch (error) {
      console.error('Error stopping recording:', error)
    }
  }

  // Process audio recording with whisper service
  const processAudioRecording = async (audioResult: AudioRecordingResult) => {
    try {
      setStatusMessage('Transcribing...')
      console.log('🎙️ VoiceRecorder: Processing audio with Whisper:', audioResult.uri)

      try {
        const result = await whisperService.transcribeFromFile(audioResult.uri)
        console.log('🎙️ VoiceRecorder: Whisper result:', result)

        if (result && result.text) {
          setLocalTranscript(result.text)
          const calculatedAccuracy = calculateTextAccuracy(targetVerse, result.text)
          console.log('🎙️ VoiceRecorder: Calculated accuracy from Whisper:', calculatedAccuracy)
          setLocalAccuracy(calculatedAccuracy)
          setShowAccuracy(true)
          console.log('🎙️ VoiceRecorder: Calling onRecordingComplete with accuracy:', calculatedAccuracy)
          onRecordingComplete(calculatedAccuracy, calculatedAccuracy)
        } else {
          console.warn('No transcription received from whisper service')
          setStatusMessage('Transcription failed')
        }
      } catch (err) {
        console.error('Whisper transcription failed:', err)
        setStatusMessage('Transcription error')
      }
    } catch (error) {
      console.error('Error processing audio recording:', error)
      setStatusMessage('Error processing audio')
    }
  }

  // Process the final transcript and calculate accuracy
  const processTranscript = async (finalTranscript: string) => {
    try {
      console.log('🎙️ VoiceRecorder: processTranscript called with:', finalTranscript)
      // Calculate accuracy for web speech or fallback
      const calculatedAccuracy = calculateTextAccuracy(targetVerse, finalTranscript)
      console.log('🎙️ VoiceRecorder: Calculated accuracy:', calculatedAccuracy)
      setLocalAccuracy(calculatedAccuracy)
      setShowAccuracy(true)

      console.log('🎙️ VoiceRecorder: Calling onRecordingComplete with accuracy:', calculatedAccuracy)
      onRecordingComplete(finalTranscript, calculatedAccuracy)
    } catch (error) {
      console.error('Error processing transcript:', error)
    }
  }

  // Toggle recording mode
  const toggleRecordingMode = () => {
    if (isRecordingMode) {
      setIsRecordingMode(false)
    } else {
      setIsRecordingMode(true)
    }
  }

  const textColor = isDark ? COLORS.text.dark : COLORS.text.light
  const isRecording = isRecognizing || audioIsRecording
  const displayError = speechError || audioError
  const displayTranscript = transcript || localTranscript

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
        return <Feather name="wind" size={16} color={theme.warning} />
      case 'strong':
        return <Feather name="wind" size={16} color={theme.error} />
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

      {/* Recording Mode - Show Voice Recorder UI */}
      {isRecordingMode ? (
        <View style={styles.recordingContainer}>
          {/* Comms Panel Header */}
          <View style={styles.panelHeader}>
            {isInitializing || statusMessage.includes('Transcribing') || statusMessage.includes('Initializing') ? (
              <ActivityIndicator size="small" color={textColor} style={{ marginRight: 8 }} />
            ) : (
              <StatusIndicator isActive={isRecording} isLoading={false} isError={false} />
            )}
            <Text style={[styles.statusText, { color: textColor }]}>
              {statusMessage.toUpperCase()}
            </Text>
          </View>

          {/* Main Comms Display */}
          <View style={styles.commsDisplay}>
            {displayError ? (
              <Text style={[styles.displayText, { color: COLORS.error }]}>{displayError}</Text>
            ) : displayTranscript ? (
              <Text style={[styles.displayText, { color: textColor }]}>"{displayTranscript}"</Text>
            ) : interimTranscript ? (
              <Text style={[styles.displayText, { color: textColor, opacity: 0.7 }]}>{interimTranscript}...</Text>
            ) : (
              <View style={styles.waveformContainer}>
                <View style={[styles.waveformBar, { height: 10, opacity: 0.3 }]} />
                <View style={[styles.waveformBar, { height: 16, opacity: 0.5 }]} />
                <View style={[styles.waveformBar, { height: 24, opacity: 0.7 }]} />
                <View style={[styles.waveformBar, { height: 16, opacity: 0.5 }]} />
                <View style={[styles.waveformBar, { height: 10, opacity: 0.3 }]} />
              </View>
            )}

            {/* Accuracy Badge */}
            {showAccuracy && <AccuracyBadge accuracy={accuracy} />}
          </View>

          {/* Controls */}
          <RecordingControls
            isRecording={isRecording}
            isRecognizing={isRecognizing}
            isLoading={isInitializing}
            onSpeakIntel={speakIntel}
            onToggleRecording={isRecording || isRecognizing ? stopRecording : startRecording}
            textColor={textColor}
          />
        </View>
      ) : (
        /* Target area - Hide when recording to prevent clutter */
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
            <View style={[styles.targetRing, styles.innerRing, { borderColor: theme.warning }]} />
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
                    backgroundColor: shot.isHit ? (isDark ? '#1a1a1a' : '#000') : theme.error,
                    borderColor: shot.isHit ? 'rgba(255,255,255,0.5)' : 'rgba(255,0,0,0.3)',
                  }
                ]}
              />
            ))}
          </Animated.View>
        </View>
      )}

      {/* Reference Display - Hide when recording */}
      {!isRecordingMode && (
        <View style={[styles.referenceContainer, {
          backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.8)',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
        }]}>
          {/* Reference (visible - e.g. "John 3:16") */}
          <Text style={[styles.referenceLabel, MILITARY_TYPOGRAPHY.heading, { color: theme.text }]}>
            {reference || 'Verse Reference'}
          </Text>

          {/* Blurred verse text (hidden - e.g. "For God so loved...") */}
          <View style={styles.verseContent}>
            <Text style={[styles.verseText, { color: theme.text }]}>
              {targetVerse}
            </Text>
            <BlurView
              intensity={Platform.OS === 'ios' ? 20 : 15}
              experimentalBlurMethod="dimezisBlurView"
              style={styles.referenceBlur}
              tint={isDark ? "dark" : "light"}
            />
          </View>

          <Text style={[styles.hintText, { color: theme.textSecondary }]}>
            TARGET TEXT (BLURRED)
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
          onPress={toggleRecordingMode}
          testID="start-recording"
        >
          <View style={styles.recordIconOuter}>
            <View style={styles.recordIconInner} />
          </View>
          <Text style={[styles.controlText, MILITARY_TYPOGRAPHY.button, { color: 'white' }]}>
            {isRecordingMode ? 'TARGET' : 'ENGAGE TARGET'}
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
          colors={[theme.background, '#0D0D0D']}
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
  referenceContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  referenceContent: {
    position: 'relative',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  referenceText: {
    fontSize: 18,
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  referenceBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
  },
  referenceLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  verseContent: {
    position: 'relative',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  verseText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  hintText: {
    marginTop: 12,
    fontSize: 10,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.6,
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
  recordingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginHorizontal: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    opacity: 0.8,
  },
  commsDisplay: {
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    marginHorizontal: 16,
  },
  displayText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 24,
  },
  waveformBar: {
    width: 3,
    backgroundColor: 'white',
    borderRadius: 2,
  },
})
