import React, { useEffect, useRef } from 'react'
import { StyleSheet, Text, View, Animated } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Target, TrendingUp, TrendingDown } from 'lucide-react-native'
import {
  TACTICAL_THEME,
  MILITARY_TYPOGRAPHY,
  ACCURACY_COLORS,
} from '@/constants/colors'

interface AccuracyMeterProps {
  accuracy: number
  previousAccuracy?: number
  label?: string
  size?: 'small' | 'medium' | 'large'
  animated?: boolean
  showTrend?: boolean
}

export default function AccuracyMeter({
  accuracy,
  previousAccuracy,
  label = 'ACCURACY',
  size = 'medium',
  animated = true,
  showTrend = true,
}: AccuracyMeterProps) {
  const animatedValue = useRef(new Animated.Value(0)).current
  const pulseAnimation = useRef(new Animated.Value(1)).current

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
    if (acc >= 95) return ACCURACY_COLORS.excellent
    if (acc >= 85) return ACCURACY_COLORS.good
    if (acc >= 75) return ACCURACY_COLORS.fair
    return ACCURACY_COLORS.poor
  }

  const getAccuracyRating = (acc: number) => {
    if (acc >= 95) return 'MARKSMAN'
    if (acc >= 85) return 'SHARPSHOOTER'
    if (acc >= 75) return 'QUALIFIED'
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
      <TrendingUp size={16} color={ACCURACY_COLORS.excellent} />
    ) : (
      <TrendingDown size={16} color={ACCURACY_COLORS.poor} />
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
        sizeStyles.container,
        { transform: [{ scale: pulseAnimation }] },
      ]}
    >
      {/* Header with percentage */}
      <View style={styles.header}>
        <View style={styles.labelContainer}>
          <Target size={16} color={accuracyColor} />
          <Text style={[styles.label, MILITARY_TYPOGRAPHY.caption]}>
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
        <View style={[styles.meterBackground, sizeStyles.meter]}>
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
      </View>

      {/* Performance zones */}
      <View style={styles.zones}>
        <View style={[styles.zone, { backgroundColor: ACCURACY_COLORS.poor }]}>
          <Text style={[styles.zoneLabel, MILITARY_TYPOGRAPHY.caption]}>
            TRAINEE
          </Text>
        </View>
        <View style={[styles.zone, { backgroundColor: ACCURACY_COLORS.fair }]}>
          <Text style={[styles.zoneLabel, MILITARY_TYPOGRAPHY.caption]}>
            QUALIFIED
          </Text>
        </View>
        <View style={[styles.zone, { backgroundColor: ACCURACY_COLORS.good }]}>
          <Text style={[styles.zoneLabel, MILITARY_TYPOGRAPHY.caption]}>
            SHARP
          </Text>
        </View>
        <View
          style={[styles.zone, { backgroundColor: ACCURACY_COLORS.excellent }]}
        >
          <Text style={[styles.zoneLabel, MILITARY_TYPOGRAPHY.caption]}>
            MARKS
          </Text>
        </View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: TACTICAL_THEME.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: TACTICAL_THEME.border,
    marginBottom: 12,
    zIndex: 1,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    color: TACTICAL_THEME.text,
    fontWeight: 'bold',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontWeight: 'bold',
  },
  ratingDisplay: {
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 18,
  },
  ratingText: {
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  meterContainer: {
    marginBottom: 10,
    position: 'relative',
    zIndex: 2,
  },
  meterBackground: {
    backgroundColor: TACTICAL_THEME.border,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  meterFill: {
    borderRadius: 8,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  meterGradient: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    borderRadius: 8,
    opacity: 0.7,
  },

  zones: {
    flexDirection: 'row',
    height: 16,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 6,
  },
  zone: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 2,
  },
  zoneLabel: {
    color: TACTICAL_THEME.text,
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
})
