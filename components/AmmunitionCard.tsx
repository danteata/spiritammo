import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Target, Zap, Brain, RotateCcw } from 'lucide-react-native'
import {
  TACTICAL_THEME,
  MILITARY_TYPOGRAPHY,
  ACCURACY_COLORS,
} from '@/constants/colors'
import { Scripture } from '@/types/scripture'
import ScriptureText from './ScriptureText'

interface AmmunitionCardProps {
  scripture: Scripture
  onFire: () => void
  onReload: () => void
  onIntel: () => void // Generate mnemonic
  isLoading?: boolean
  isGeneratingIntel?: boolean
  intelFeedback?: string | null
}

export default function AmmunitionCard({
  scripture,
  onFire,
  onReload,
  onIntel,
  isLoading = false,
  isGeneratingIntel = false,
  intelFeedback = null,
}: AmmunitionCardProps) {
  const [fireAnimation] = useState(new Animated.Value(1))
  const [pulseAnimation] = useState(new Animated.Value(1))

  useEffect(() => {
    // Start pulsing animation for the FIRE button
    const startPulse = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start()
    }

    startPulse()
  }, [])

  const handleFire = () => {
    // Recoil animation
    Animated.sequence([
      Animated.timing(fireAnimation, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(fireAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start()

    onFire()
  }

  const getAccuracyColor = (accuracy?: number) => {
    if (!accuracy) return ACCURACY_COLORS.poor
    if (accuracy >= 95) return ACCURACY_COLORS.excellent
    if (accuracy >= 85) return ACCURACY_COLORS.good
    if (accuracy >= 75) return ACCURACY_COLORS.fair
    return ACCURACY_COLORS.poor
  }

  const getAccuracyLabel = (accuracy?: number) => {
    if (!accuracy) return 'UNTESTED'
    if (accuracy >= 95) return 'MARKSMAN'
    if (accuracy >= 85) return 'SHARPSHOOTER'
    if (accuracy >= 75) return 'QUALIFIED'
    return 'TRAINEE'
  }

  const roundsCount = scripture.practiceCount || 0
  const accuracy = scripture.accuracy || 0

  return (
    <Animated.View
      style={[styles.container, { transform: [{ scale: fireAnimation }] }]}
    >
      <LinearGradient
        colors={[TACTICAL_THEME.surface, TACTICAL_THEME.background]}
        style={styles.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header with ammunition info */}
        <View style={styles.header}>
          <View style={styles.ammunitionInfo}>
            <Text style={[styles.reference, MILITARY_TYPOGRAPHY.code]}>
              {scripture.reference}
            </Text>
            <Text style={[styles.roundsCount, MILITARY_TYPOGRAPHY.caption]}>
              ROUNDS: {roundsCount.toString().padStart(3, '0')}
            </Text>
          </View>

          <View style={styles.statusIndicators}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    roundsCount > 0
                      ? TACTICAL_THEME.success
                      : TACTICAL_THEME.error,
                },
              ]}
            />
            <Text style={[styles.statusText, MILITARY_TYPOGRAPHY.caption]}>
              {roundsCount > 0 ? 'LOADED' : 'EMPTY'}
            </Text>
          </View>
        </View>

        {/* Scripture text */}
        <View style={styles.textContainer}>
          <ScriptureText
            text={scripture.text}
            style={[styles.scriptureText, MILITARY_TYPOGRAPHY.body]}
          />
        </View>

        {/* Mnemonic section */}
        {scripture.mnemonic && (
          <View style={styles.mnemonicContainer}>
            <View style={styles.mnemonicHeader}>
              <Brain size={16} color={TACTICAL_THEME.accent} />
              <Text style={[styles.mnemonicLabel, MILITARY_TYPOGRAPHY.caption]}>
                BATTLE INTEL
              </Text>
            </View>
            <Text style={[styles.mnemonicText, MILITARY_TYPOGRAPHY.caption]}>
              {scripture.mnemonic}
            </Text>
          </View>
        )}

        {/* Accuracy meter */}
        <View style={styles.accuracyContainer}>
          <View style={styles.accuracyHeader}>
            <Target size={16} color={getAccuracyColor(accuracy)} />
            <Text style={[styles.accuracyLabel, MILITARY_TYPOGRAPHY.caption]}>
              ACCURACY: {accuracy.toFixed(1)}%
            </Text>
            <Text
              style={[
                styles.accuracyRating,
                MILITARY_TYPOGRAPHY.caption,
                { color: getAccuracyColor(accuracy) },
              ]}
            >
              {getAccuracyLabel(accuracy)}
            </Text>
          </View>

          <View style={styles.accuracyBar}>
            <View
              style={[
                styles.accuracyFill,
                {
                  width: `${accuracy}%`,
                  backgroundColor: getAccuracyColor(accuracy),
                },
              ]}
            />
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          <Animated.View style={{ transform: [{ scale: pulseAnimation }] }}>
            <TouchableOpacity
              style={[styles.actionButton, styles.fireButton]}
              onPress={handleFire}
              disabled={isLoading}
              testID="fire-button"
            >
              <Zap size={20} color={TACTICAL_THEME.text} />
              <Text style={[styles.buttonText, MILITARY_TYPOGRAPHY.button]}>
                FIRE!
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            style={[styles.actionButton, styles.reloadButton]}
            onPress={onReload}
            disabled={isLoading}
            testID="reload-button"
          >
            <RotateCcw size={20} color={TACTICAL_THEME.text} />
            <Text style={[styles.buttonText, MILITARY_TYPOGRAPHY.button]}>
              RELOAD
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.intelButton,
              isGeneratingIntel && styles.generatingButton
            ]}
            onPress={onIntel}
            disabled={isLoading || isGeneratingIntel}
            testID="intel-button"
          >
            {isGeneratingIntel ? (
              <Animated.View style={{ transform: [{ rotate: pulseAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg'],
              }) }] }}>
                <Brain size={20} color={TACTICAL_THEME.text} />
              </Animated.View>
            ) : (
              <Brain size={20} color={TACTICAL_THEME.text} />
            )}
            <Text style={[styles.buttonText, MILITARY_TYPOGRAPHY.button]}>
              {isGeneratingIntel ? 'ACQUIRING...' : 'INTEL'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Intel Feedback Display */}
        {intelFeedback && (
          <View style={styles.intelFeedback}>
            <Text style={styles.intelFeedbackText}>{intelFeedback}</Text>
          </View>
        )}

        {/* Damage/wear indicators */}
        {roundsCount > 50 && (
          <View style={styles.wearIndicator}>
            <Text style={[styles.wearText, MILITARY_TYPOGRAPHY.caption]}>
              MAINTENANCE REQUIRED
            </Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: TACTICAL_THEME.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ammunitionInfo: {
    flex: 1,
  },
  reference: {
    color: TACTICAL_THEME.accent,
    marginBottom: 4,
  },
  roundsCount: {
    color: TACTICAL_THEME.textSecondary,
  },
  statusIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    color: TACTICAL_THEME.textSecondary,
  },
  textContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: TACTICAL_THEME.accent,
  },
  scriptureText: {
    color: TACTICAL_THEME.text,
    lineHeight: 24,
  },
  mnemonicContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: TACTICAL_THEME.accent,
  },
  mnemonicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  mnemonicLabel: {
    color: TACTICAL_THEME.accent,
    marginLeft: 8,
  },
  mnemonicText: {
    color: TACTICAL_THEME.text,
    fontStyle: 'italic',
  },
  accuracyContainer: {
    marginBottom: 16,
  },
  accuracyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  accuracyLabel: {
    color: TACTICAL_THEME.text,
    marginLeft: 8,
    flex: 1,
  },
  accuracyRating: {
    fontWeight: 'bold',
  },
  accuracyBar: {
    height: 4,
    backgroundColor: TACTICAL_THEME.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  accuracyFill: {
    height: '100%',
    borderRadius: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  fireButton: {
    backgroundColor: TACTICAL_THEME.accent,
    flex: 1.2, // Slightly smaller than equal
  },
  reloadButton: {
    backgroundColor: TACTICAL_THEME.secondary,
    flex: 1.3, // Slightly larger for better spacing
    marginRight: 8, // Add right padding
  },
  intelButton: {
    backgroundColor: TACTICAL_THEME.primary,
  },
  buttonText: {
    color: TACTICAL_THEME.text,
  },
  wearIndicator: {
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(255, 212, 0, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: TACTICAL_THEME.warning,
  },
  wearText: {
    color: TACTICAL_THEME.warning,
    textAlign: 'center',
  },
  generatingButton: {
    backgroundColor: '#FF8C00', // Dark orange for generating state
    opacity: 0.8,
  },
  intelFeedback: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: TACTICAL_THEME.accent,
  },
  intelFeedbackText: {
    color: TACTICAL_THEME.accent,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
})
