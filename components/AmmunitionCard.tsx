import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome, Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  COLORS,
  MILITARY_TYPOGRAPHY,
  TACTICAL_THEME,
  GARRISON_THEME,
  ACCURACY_COLORS,
} from '@/constants/colors'
import { Scripture } from '@/types/scripture'
import ScriptureText from './ScriptureText'

interface AmmunitionCardProps {
  scripture: Scripture
  onFire: () => void
  onReload: () => void
  onIntel: (force?: boolean) => void // Generate mnemonic
  onStealth?: () => void // Silent Drill
  isLoading?: boolean
  isDark?: boolean
}

const AmmunitionCard = React.memo(({
  scripture,
  onFire,
  onReload,
  onIntel,
  onStealth,
  isLoading = false,
  isDark = false,
}: AmmunitionCardProps) => {
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
                  color: isDark ? TACTICAL_THEME.text : GARRISON_THEME.text,
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
        <View style={[
          styles.textContainer,
          { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.03)' }
        ]}>
          <ScriptureText
            text={scripture.text}
            isJesusWords={scripture.isJesusWords}
            style={[
              styles.scriptureText,
              MILITARY_TYPOGRAPHY.body,
              { color: isDark ? TACTICAL_THEME.text : GARRISON_THEME.text }
            ]}
          />
        </View>

        {/* Mnemonic section */}
        {scripture.mnemonic && (
          <View style={styles.mnemonicContainer}>
            <View style={styles.mnemonicHeader}>
              <View style={styles.mnemonicTitle}>
                <FontAwesome5 name="brain" size={16} color={TACTICAL_THEME.accent} />
                <Text style={[styles.mnemonicLabel, MILITARY_TYPOGRAPHY.caption]}>
                  BATTLE INTEL
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => onIntel(true)}
                disabled={isLoading}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <FontAwesome name="refresh" size={14} color={TACTICAL_THEME.accent} />
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
                      { color: isDark ? TACTICAL_THEME.text : GARRISON_THEME.text }
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
                  { color: isDark ? TACTICAL_THEME.text : GARRISON_THEME.text }
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
              { color: isDark ? TACTICAL_THEME.text : GARRISON_THEME.text }
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
                <Ionicons name="flash" size={20} color={TACTICAL_THEME.text} />
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
              <FontAwesome name="undo" size={20} color={TACTICAL_THEME.text} />
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
                <MaterialCommunityIcons name="incognito" size={20} color={TACTICAL_THEME.text} />
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
                <ActivityIndicator size="small" color={TACTICAL_THEME.text} />
              ) : (
                <>
                  <FontAwesome5 name="brain" size={20} color={TACTICAL_THEME.text} />
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
    // Use theme-aware background logic in component
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: TACTICAL_THEME.accent,
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
    borderColor: TACTICAL_THEME.accent,
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
    color: TACTICAL_THEME.accent,
    marginLeft: 8,
  },
  mnemonicContent: {
    gap: 12,
  },
  planSection: {
    marginBottom: 4,
  },
  planLabel: {
    color: TACTICAL_THEME.accent,
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
    color: TACTICAL_THEME.textSecondary,
    fontSize: 10,
    marginBottom: 2,
  },
  notesText: {
    color: TACTICAL_THEME.textSecondary,
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
    backgroundColor: TACTICAL_THEME.border,
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
    backgroundColor: TACTICAL_THEME.accent,
  },
  reloadButton: {
    backgroundColor: TACTICAL_THEME.secondary,
  },
  stealthButton: {
    backgroundColor: '#4E5D6C', // Slate gray for stealth
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
})
