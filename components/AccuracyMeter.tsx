import React, { useEffect, useRef } from 'react'
import { StyleSheet, Text, View, Animated } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome } from '@expo/vector-icons';
import {
  TACTICAL_THEME,
  GARRISON_THEME,
  MILITARY_TYPOGRAPHY,
  ACCURACY_COLORS,
} from '@/constants/colors'
import { useAppStore } from '@/hooks/useAppStore'

interface AccuracyMeterProps {
  accuracy: number
  previousAccuracy?: number
  label?: string
  size?: 'small' | 'medium' | 'large'
  animated?: boolean
  showTrend?: boolean
  transparent?: boolean
}

export default function AccuracyMeter({
  accuracy,
  previousAccuracy,
  label = 'ACCURACY',
  size = 'medium',
  animated = true,
  showTrend = true,
  transparent = false,
}: AccuracyMeterProps) {
  const animatedValue = useRef(new Animated.Value(0)).current
  const pulseAnimation = useRef(new Animated.Value(1)).current
  const { isDark } = useAppStore()
  const theme = isDark ? TACTICAL_THEME : GARRISON_THEME

  useEffect(() => {
    if (animated) {
      // Animate the accuracy bar
      Animated.timing(animatedValue, {
        toValue: accuracy,
        duration: 1500,
        useNativeDriver: false,
      }).start()

      // Pulse animation for high accuracy
      if (accuracy >= 95) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnimation, {
              toValue: 1.05,
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
    } else {
      animatedValue.setValue(accuracy)
    }
  }, [accuracy, animated])

  const getAccuracyColor = (acc: number) => {
    if (acc >= 75) return ACCURACY_COLORS.excellent
    if (acc >= 50) return ACCURACY_COLORS.good
    if (acc >= 25) return ACCURACY_COLORS.fair
    return ACCURACY_COLORS.poor
  }

  const getAccuracyRating = (acc: number) => {
    if (acc >= 75) return 'MARKSMAN'
    if (acc >= 50) return 'SHARPSHOOTER'
    if (acc >= 25) return 'QUALIFIED'
    return 'TRAINEE'
  }

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: { minHeight: 40 },
          meter: { height: 4 },
          text: { fontSize: 12 },
          rating: { fontSize: 9 },
        }
      case 'medium':
        return {
          container: { minHeight: 50 },
          meter: { height: 6 }, // Even thinner for compactness
          text: { fontSize: 14 },
          rating: { fontSize: 10 },
        }
      case 'large':
        return {
          container: { minHeight: 60 },
          meter: { height: 8 },
          text: { fontSize: 16 },
          rating: { fontSize: 12 },
        }
    }
  }

  const getTrendIcon = () => {
    if (!showTrend || previousAccuracy === undefined) return null

    const trend = accuracy - previousAccuracy
    if (Math.abs(trend) < 1) return null // No significant change

    return trend > 0 ? (
      <FontAwesome name="long-arrow-up" size={16} color={ACCURACY_COLORS.excellent} />
    ) : (
      <FontAwesome name="long-arrow-down" size={16} color={ACCURACY_COLORS.poor} />
    )
  }

  const getTrendText = () => {
    if (!showTrend || previousAccuracy === undefined) return ''

    const trend = accuracy - previousAccuracy
    if (Math.abs(trend) < 1) return ''

    return trend > 0 ? `+${trend.toFixed(1)}%` : `${trend.toFixed(1)}%`
  }

  const sizeStyles = getSizeStyles()
  const accuracyColor = getAccuracyColor(accuracy)
  const rating = getAccuracyRating(accuracy)

  return (
    <Animated.View
      style={[
        styles.container,
        transparent && styles.transparentContainer,
        sizeStyles.container,
        { transform: [{ scale: pulseAnimation }] },
      ]}
    >
      {/* Header with percentage */}
      <View style={styles.header}>
        <View style={styles.labelContainer}>
          <FontAwesome name="bullseye" size={16} color={accuracyColor} />
          <Text style={[styles.label, MILITARY_TYPOGRAPHY.caption, { color: theme.text }]}>
            {label}: {accuracy.toFixed(1)}%
          </Text>
        </View>

        {showTrend && (
          <View style={styles.trendContainer}>
            {getTrendIcon()}
            <Text
              style={[styles.trendText, { color: accuracyColor, fontSize: 10 }]}
            >
              {getTrendText()}
            </Text>
          </View>
        )}
      </View>

      {/* Rating display only */}
      <View style={styles.ratingDisplay}>
        <Text
          style={[
            styles.ratingText,
            sizeStyles.rating,
            { color: accuracyColor },
          ]}
        >
          {rating}
        </Text>
      </View>

      {/* Meter */}
      <View style={styles.meterContainer}>
        <View style={[styles.meterBackground, sizeStyles.meter, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }]}>
          <Animated.View
            style={[
              styles.meterFill,
              sizeStyles.meter,
              {
                backgroundColor: accuracyColor,
                width: animatedValue.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          />
        </View>

        {/* Target Indicator */}
        <Animated.View
          style={[
            styles.targetIndicator,
            {
              left: animatedValue.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp',
              }),
              transform: [{ translateX: -6 }], // Center the indicator (half of width)
            },
          ]}
        >
          <View style={[styles.indicatorTriangle, { borderTopColor: accuracyColor }]} />
        </Animated.View>
      </View>

      {/* Performance zones */}
      <View style={styles.zones}>
        <View style={[styles.zone, styles.traineeZone, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)' }]}>
          <Text style={[styles.zoneLabel, MILITARY_TYPOGRAPHY.caption, { color: theme.textSecondary }]}>TRAINEE</Text>
        </View>
        <View style={[styles.zone, styles.qualifiedZone, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)' }]}>
          <Text style={[styles.zoneLabel, MILITARY_TYPOGRAPHY.caption, { color: theme.textSecondary }]}>QUALIFIED</Text>
        </View>
        <View style={[styles.zone, styles.sharpZone, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)' }]}>
          <Text style={[styles.zoneLabel, MILITARY_TYPOGRAPHY.caption, { color: theme.textSecondary }]}>SHARP</Text>
        </View>
        <View style={[styles.zone, styles.marksZone, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)' }]}>
          <Text style={[styles.zoneLabel, MILITARY_TYPOGRAPHY.caption, { color: theme.textSecondary }]}>MARKS</Text>
        </View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: TACTICAL_THEME.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TACTICAL_THEME.border,
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  transparentContainer: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    padding: 0,
    marginBottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trendText: {
    fontWeight: 'bold',
  },
  ratingDisplay: {
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 24,
  },
  ratingText: {
    fontWeight: '800', // Slightly reduced from 900 for cleaner render
    textTransform: 'uppercase',
    letterSpacing: 3, // Increased spacing for more tactical look
    textShadowColor: 'rgba(0, 0, 0, 0.3)', // Softer shadow
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  meterContainer: {
    marginBottom: 8,
    position: 'relative',
    zIndex: 2,
    height: 24, // Ensure space for indicator
    justifyContent: 'center',
  },
  meterBackground: {
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  meterFill: {
    borderRadius: 4,
    height: '100%',
  },
  targetIndicator: {
    position: 'absolute',
    top: -8, // Position above the bar
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  indicatorTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  zones: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 2,
  },
  zone: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  zoneLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    opacity: 0.7,
  },
  traineeZone: {
    borderBottomWidth: 2,
    borderBottomColor: ACCURACY_COLORS.poor,
  },
  qualifiedZone: {
    borderBottomWidth: 2,
    borderBottomColor: ACCURACY_COLORS.fair,
  },
  sharpZone: {
    borderBottomWidth: 2,
    borderBottomColor: ACCURACY_COLORS.good,
  },
  marksZone: {
    borderBottomWidth: 2,
    borderBottomColor: ACCURACY_COLORS.excellent,
  },
})
