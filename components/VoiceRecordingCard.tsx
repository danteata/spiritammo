import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Mic, Square, Volume2, RotateCcw, CheckCircle } from 'lucide-react-native';
import { useExpoVoiceRecognition } from '@/hooks/useExpoVoiceRecognition';
import { usePlayerStore } from '@/hooks/usePlayerStore';
import { COLORS, LIGHT_THEME } from '@/constants/colors';
import { Scripture } from '@/types/scripture';
import { useColorScheme } from 'react-native';

interface VoiceRecordingCardProps {
  scripture: Scripture;
  onRecordingComplete: (accuracy: number) => void;
}

export default function VoiceRecordingCard({
  scripture,
  onRecordingComplete,
}: VoiceRecordingCardProps) {
  const {
    isRecording,
    transcript,
    partialTranscript,
    error,
    startRecording,
    stopRecording,
    speak,
    processTranscript,
    reset,
  } = useExpoVoiceRecognition();

  const { addVerse, updateStreak } = usePlayerStore();
  const [accuracy, setAccuracy] = useState<number>(0);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? COLORS : LIGHT_THEME;

  // Animation values
  const pulseAnimation = new Animated.Value(1);
  const fadeAnimation = new Animated.Value(0);

  // Pulse animation for recording
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnimation.stopAnimation();
      pulseAnimation.setValue(1);
    }
  }, [isRecording]);

  // Show results animation
  useEffect(() => {
    if (showResults) {
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnimation.setValue(0);
    }
  }, [showResults]);

  const handleStartRecording = async () => {
    reset();
    setAccuracy(0);
    setHasRecorded(false);
    setShowResults(false);
    
    const success = await startRecording();
    if (!success) {
      Alert.alert('Recording Failed', 'Unable to start voice recording. Please check your microphone permissions.');
    }
  };

  const handleStopRecording = async () => {
    const success = await stopRecording();
    if (success && transcript) {
      const calculatedAccuracy = processTranscript(scripture.text);
      setAccuracy(calculatedAccuracy);
      setHasRecorded(true);
      setShowResults(true);
      
      // Update player stats
      addVerse(calculatedAccuracy, 1); // 1 minute practice time estimate
      updateStreak();
      
      // Notify parent component
      onRecordingComplete(calculatedAccuracy);
    }
  };

  const handleSpeakVerse = async () => {
    await speak(scripture.text);
  };

  const handleReset = () => {
    reset();
    setAccuracy(0);
    setHasRecorded(false);
    setShowResults(false);
  };

  const getAccuracyColor = (acc: number) => {
    if (acc >= 90) return COLORS.success;
    if (acc >= 75) return COLORS.warning;
    return COLORS.error;
  };

  const getAccuracyMessage = (acc: number) => {
    if (acc >= 95) return "OUTSTANDING! SNIPER PRECISION!";
    if (acc >= 85) return "EXCELLENT SHOT! TARGET NEUTRALIZED!";
    if (acc >= 75) return "GOOD HIT! SOLID MARKSMANSHIP!";
    if (acc >= 60) return "TARGET HIT! ADJUST AND CONTINUE!";
    if (acc >= 40) return "NEAR MISS! RECALIBRATE YOUR SIGHTS!";
    return "MISSED TARGET! RETURN TO BASIC TRAINING!";
  };

  const cardColors = isDark
    ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']
    : ['#FFFFFF', '#F8F9FA'];

  return (
    <LinearGradient
      colors={cardColors}
      style={[styles.container, !isDark && styles.lightContainer]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? 'white' : theme.text }]}>Voice Recognition Training</Text>
        <Text style={[styles.subtitle, { color: isDark ? 'rgba(255,255,255,0.8)' : theme.textSecondary }]}>Speak the verse clearly and accurately</Text>
      </View>

      {/* Recording Controls */}
      <View style={styles.controlsContainer}>
        {!isRecording ? (
          <TouchableOpacity
            style={[styles.recordButton, hasRecorded && styles.recordButtonSecondary]}
            onPress={handleStartRecording}
          >
            <Mic size={32} color="white" />
            <Text style={styles.recordButtonText}>
              {hasRecorded ? 'RECORD AGAIN' : 'START RECORDING'}
            </Text>
          </TouchableOpacity>
        ) : (
          <Animated.View style={{ transform: [{ scale: pulseAnimation }] }}>
            <TouchableOpacity
              style={styles.stopButton}
              onPress={handleStopRecording}
            >
              <Square size={32} color="white" />
              <Text style={styles.stopButtonText}>STOP RECORDING</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Secondary controls */}
        <View style={styles.secondaryControls}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleSpeakVerse}>
            <Volume2 size={20} color={COLORS.primary.main} />
            <Text style={styles.secondaryButtonText}>Listen</Text>
          </TouchableOpacity>

          {hasRecorded && (
            <TouchableOpacity style={styles.secondaryButton} onPress={handleReset}>
              <RotateCcw size={20} color={COLORS.primary.main} />
              <Text style={styles.secondaryButtonText}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Live Transcript */}
      {(isRecording || partialTranscript) && (
        <View style={styles.transcriptContainer}>
          <Text style={[styles.transcriptLabel, { color: isDark ? 'rgba(255,255,255,0.7)' : theme.textSecondary }]}>
            {isRecording ? 'Listening...' : 'Partial Result:'}
          </Text>
          <Text style={[styles.transcriptText, { color: isDark ? 'white' : theme.text }]}>
            {partialTranscript || 'Speak now...'}
          </Text>
        </View>
      )}

      {/* Results */}
      {showResults && (
        <Animated.View style={[styles.resultsContainer, { opacity: fadeAnimation }]}>
          <View style={styles.accuracyHeader}>
            <CheckCircle size={24} color={getAccuracyColor(accuracy)} />
            <Text style={[styles.accuracyScore, { color: getAccuracyColor(accuracy) }]}>
              {accuracy.toFixed(1)}% Accuracy
            </Text>
          </View>
          
          <Text style={[styles.accuracyMessage, { color: getAccuracyColor(accuracy) }]}>
            {getAccuracyMessage(accuracy)}
          </Text>

          {transcript && (
            <View style={styles.transcriptResult}>
              <Text style={[styles.transcriptResultLabel, { color: isDark ? 'rgba(255,255,255,0.7)' : theme.textSecondary }]}>Your Response:</Text>
              <Text style={[styles.transcriptResultText, { color: isDark ? 'white' : theme.text }]}>{transcript}</Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Status Indicator */}
      <View style={styles.statusContainer}>
        <View style={[
          styles.statusDot,
          { backgroundColor: isRecording ? COLORS.error : hasRecorded ? COLORS.success : COLORS.text.light }
        ]} />
        <Text style={styles.statusText}>
          {isRecording ? 'Recording...' : hasRecorded ? 'Complete' : 'Ready'}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginVertical: 16,
    marginHorizontal: 16,
  },
  lightContainer: {
    shadowColor: '#2D5016',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  controlsContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  recordButton: {
    backgroundColor: COLORS.primary.main,
    borderRadius: 50,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 16,
    minWidth: 200,
  },
  recordButtonSecondary: {
    backgroundColor: COLORS.secondary.main,
  },
  recordButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  stopButton: {
    backgroundColor: COLORS.error,
    borderRadius: 50,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 16,
    minWidth: 200,
  },
  stopButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  secondaryControls: {
    flexDirection: 'row',
    gap: 16,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  secondaryButtonText: {
    color: COLORS.primary.main,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  transcriptContainer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  transcriptLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  transcriptText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  resultsContainer: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  accuracyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  accuracyScore: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  accuracyMessage: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 1,
  },
  transcriptResult: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 16,
  },
  transcriptResultLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  transcriptResultText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  errorContainer: {
    backgroundColor: 'rgba(255,0,0,0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
