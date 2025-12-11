import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { FontAwesome, Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  COLORS,
  MILITARY_TYPOGRAPHY,
  GARRISON_THEME,
  ACCURACY_COLORS,
} from '@/constants/colors'
import { Scripture } from '@/types/scripture'
import ScriptureText from './ScriptureText'
import { useAppStore } from '@/hooks/useAppStore'

interface AmmunitionCardProps {
  scripture: Scripture
  onFire: () => void
  onReload: () => void
  onIntel: (force?: boolean) => void // Generate mnemonic
  onStealth?: () => void // Silent Drill
  isLoading?: boolean
  isDark?: boolean
  allowBlur?: boolean // Default true for practice, false for assessments
}

const AmmunitionCard = React.memo(({
  scripture,
  onFire,
  onReload,
  onIntel,
  onStealth,
  isLoading = false,
  isDark = false,
  allowBlur = true, // Default true for practice mode
}: AmmunitionCardProps) => {
  const { theme } = useAppStore()
  const styles = getStyles(theme)
  const [fireAnimation] = useState(new Animated.Value(1))
  const [pulseAnimation] = useState(new Animated.Value(1))
  const [revealed, setRevealed] = useState(false)

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
      {isDark ? (
        <View
          style={[
            styles.card,
            {
              backgroundColor: '#0D0D0D',
              borderColor: 'rgba(255, 255, 255, 0.1)',
            },
          ]}
        >
          {renderCardContent()}
        </View>
      ) : (
        <View
          style={[
            styles.card,
            {
              backgroundColor: GARRISON_THEME.surface,
              borderColor: GARRISON_THEME.border,
            },
          ]}
        >
          {renderCardContent()}
        </View>
      )}
    </Animated.View>
  )

  function renderCardContent() {
    return (
      <>
        {/* Header with ammunition info */}
        <View style={styles.header}>
          <View style={styles.ammunitionInfo}>
            <Text
              style={[
                MILITARY_TYPOGRAPHY.heading,
                {
                  color: isDark ? theme.text : GARRISON_THEME.text,
                  marginBottom: 4,
                },
              ]}
            >
              {scripture.reference}
            </Text>
            <Text style={[styles.roundsCount, MILITARY_TYPOGRAPHY.caption]}>
              ROUNDS: {roundsCount.toString().padStart(3, '0')}
            </Text>
          </View>

          <View style={styles.statusIndicators}>
            {/* Reveal/Hide Button - Only in practice mode */}
            {allowBlur && (
              <TouchableOpacity
                style={[styles.iconButton, { marginRight: 12 }]}
                onPress={() => setRevealed(!revealed)}
                testID="toggle-reveal-button"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {revealed ? (
                  <FontAwesome5 name="eye-slash" size={18} color={isDark ? theme.text : GARRISON_THEME.text} />
                ) : (
                  <FontAwesome5 name="eye" size={18} color={isDark ? theme.primary : theme.accent} />
                )}
              </TouchableOpacity>
            )}

            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    roundsCount > 0
                      ? theme.success
                      : theme.error,
                },
              ]}
            />
            <Text style={[styles.statusText, MILITARY_TYPOGRAPHY.caption]}>
              {roundsCount > 0 ? 'LOADED' : 'EMPTY'}
            </Text>
          </View>
        </View>

        {/* Scripture text with conditional blur */}
        <View style={[
          styles.textContainer,
          { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.03)' }
        ]}>
          {(revealed || !allowBlur) ? (
            <ScriptureText
              text={scripture.text}
              isJesusWords={scripture.isJesusWords}
              style={[
                styles.scriptureText,
                MILITARY_TYPOGRAPHY.body,
                { color: isDark ? theme.text : GARRISON_THEME.text }
              ]}
            />
          ) : (
            <View style={styles.hiddenTextContainer}>
              <ScriptureText
                text={scripture.text}
                isJesusWords={scripture.isJesusWords}
                style={[
                  styles.scriptureText,
                  styles.hiddenText,
                  MILITARY_TYPOGRAPHY.body,
                  { color: isDark ? theme.text : GARRISON_THEME.text }
                ]}
              />
              <BlurView
                intensity={Platform.OS === 'ios' ? 25 : 20}
                experimentalBlurMethod="dimezisBlurView"
                style={styles.blurOverlay}
                tint={isDark ? "dark" : "light"}
              />
            </View>
          )}
        </View>

        {/* Mnemonic section */}
        {scripture.mnemonic && (
          <View style={styles.mnemonicContainer}>
            <View style={styles.mnemonicHeader}>
              <View style={styles.mnemonicTitle}>
                <FontAwesome5 name="brain" size={16} color={theme.accent} />
                <Text style={[styles.mnemonicLabel, MILITARY_TYPOGRAPHY.caption]}>
                  BATTLE INTEL
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => onIntel(true)}
                disabled={isLoading}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <FontAwesome name="refresh" size={14} color={theme.accent} />
              </TouchableOpacity>
            </View>
            <View style={styles.mnemonicContent}>
              {scripture.mnemonic.includes('\n---\n') ? (
                <>
                  <View style={styles.planSection}>
                    <Text style={[styles.planLabel, MILITARY_TYPOGRAPHY.caption]}>PLAN:</Text>
                    <Text style={[
                      styles.planText,
                      MILITARY_TYPOGRAPHY.body,
                      { color: isDark ? theme.text : GARRISON_THEME.text }
                    ]}>
                      {scripture.mnemonic.split('\n---\n')[0]}
                    </Text>
                  </View>
                  <View style={styles.notesSection}>
                    <Text style={[styles.notesLabel, MILITARY_TYPOGRAPHY.caption]}>TACTICS:</Text>
                    <Text style={[styles.notesText, MILITARY_TYPOGRAPHY.caption]}>
                      {scripture.mnemonic.split('\n---\n')[1]}
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={[
                  styles.mnemonicText,
                  MILITARY_TYPOGRAPHY.caption,
                  { color: isDark ? theme.text : GARRISON_THEME.text }
                ]}>
                  {scripture.mnemonic}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Accuracy meter */}
        <View style={styles.accuracyContainer}>
          <View style={styles.accuracyHeader}>
            <FontAwesome name="bullseye" size={16} color={getAccuracyColor(accuracy)} />
            <Text style={[
              styles.accuracyLabel,
              MILITARY_TYPOGRAPHY.caption,
              { color: isDark ? theme.text : GARRISON_THEME.text }
            ]}>
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
        {/* Action buttons - 2x2 Grid */}
        <View style={styles.actionGrid}>
          {/* Row 1: Combat Actions */}
          <View style={styles.actionRow}>
            <Animated.View style={{ flex: 1, transform: [{ scale: pulseAnimation }] }}>
              <TouchableOpacity
                style={[styles.actionButton, styles.fireButton]}
                onPress={handleFire}
                disabled={isLoading}
                testID="fire-button"
              >
                <Ionicons name="flash" size={20} color={theme.accentContrastText} />
                <Text style={[styles.fireButtonText, MILITARY_TYPOGRAPHY.button]}>
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
              <FontAwesome name="undo" size={20} color={theme.text} />
              <Text style={[styles.buttonText, MILITARY_TYPOGRAPHY.button]}>
                RELOAD
              </Text>
            </TouchableOpacity>
          </View>

          {/* Row 2: Tactical Actions */}
          <View style={styles.actionRow}>
            {onStealth && (
              <TouchableOpacity
                style={[styles.actionButton, styles.stealthButton]}
                onPress={onStealth}
                disabled={isLoading}
                testID="stealth-button"
              >
                <MaterialCommunityIcons name="incognito" size={20} color={theme.text} />
                <Text style={[styles.buttonText, MILITARY_TYPOGRAPHY.button]}>
                  STEALTH
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButton, styles.intelButton]}
              onPress={() => onIntel(false)}
              disabled={isLoading || !!scripture.mnemonic}
              testID="intel-button"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.text} />
              ) : (
                <>
                  <FontAwesome5 name="brain" size={20} color={theme.text} />
                  <Text style={[styles.buttonText, MILITARY_TYPOGRAPHY.button]}>
                    INTEL
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Damage/wear indicators */}
        {roundsCount > 50 && (
          <View style={styles.wearIndicator}>
            <Text style={[styles.wearText, MILITARY_TYPOGRAPHY.caption]}>
              MAINTENANCE REQUIRED
            </Text>
          </View>
        )}
      </>
    )
  }
});

export default AmmunitionCard;


const getStyles = (theme: any) => StyleSheet.create({
  container: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
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
    color: theme.accent,
    marginBottom: 4,
  },
  roundsCount: {
    color: theme.textSecondary,
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
    color: theme.textSecondary,
  },
  iconButton: {
    padding: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  textContainer: {
    marginBottom: 16,
    padding: 12,
    // Use theme-aware background logic in component
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.accent,
  },
  hiddenTextContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  hiddenText: {
    lineHeight: 24,
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
  },
  scriptureText: {
    lineHeight: 24,
  },
  mnemonicContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.accent,
  },
  mnemonicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  mnemonicTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mnemonicLabel: {
    color: theme.accent,
    marginLeft: 8,
  },
  mnemonicContent: {
    gap: 12,
  },
  planSection: {
    marginBottom: 4,
  },
  planLabel: {
    color: theme.accent,
    fontSize: 10,
    marginBottom: 2,
    opacity: 0.8,
  },
  planText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  notesSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 8,
  },
  notesLabel: {
    color: theme.textSecondary,
    fontSize: 10,
    marginBottom: 2,
  },
  notesText: {
    color: theme.textSecondary,
    fontStyle: 'italic',
    fontSize: 12,
  },
  mnemonicText: {
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
    marginLeft: 8,
    flex: 1,
  },
  accuracyRating: {
    fontWeight: 'bold',
  },
  accuracyBar: {
    height: 4,
    backgroundColor: theme.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  accuracyFill: {
    height: '100%',
    borderRadius: 2,
  },
  actionGrid: {
    gap: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14, // Slightly taller for better touch target
    paddingHorizontal: 8, // Reduce horizontal padding to fit text
    borderRadius: 8,
    gap: 8,
  },
  fireButton: {
    backgroundColor: theme.accent,
  },
  reloadButton: {
    backgroundColor: theme.secondary,
  },
  stealthButton: {
    backgroundColor: '#4E5D6C', // Slate gray for stealth
  },
  intelButton: {
    backgroundColor: theme.primary,
  },
  buttonText: {
    color: theme.text,
  },
  fireButtonText: {
    color: theme.accentContrastText,
  },
  reloadButtonText: {
    color: theme.text,
  },
  stealthButtonText: {
    color: theme.text,
  },
  intelButtonText: {
    color: theme.text,
  },
  wearIndicator: {
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(255, 212, 0, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.warning,
  },
  wearText: {
    color: theme.warning,
    textAlign: 'center',
  },
})
