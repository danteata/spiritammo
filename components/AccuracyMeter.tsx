import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Target, TrendingUp, TrendingDown } from 'lucide-react-native';
import { TACTICAL_THEME, MILITARY_TYPOGRAPHY, ACCURACY_COLORS } from '@/constants/colors';

interface AccuracyMeterProps {
  accuracy: number;
  previousAccuracy?: number;
  label?: string;
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
  showTrend?: boolean;
}

export default function AccuracyMeter({ 
  accuracy, 
  previousAccuracy, 
  label = 'ACCURACY', 
  size = 'medium',
  animated = true,
  showTrend = true
}: AccuracyMeterProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (animated) {
      // Animate the accuracy bar
      Animated.timing(animatedValue, {
        toValue: accuracy,
        duration: 1500,
        useNativeDriver: false,
      }).start();

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
        ).start();
      }
    } else {
      animatedValue.setValue(accuracy);
    }
  }, [accuracy, animated]);

  const getAccuracyColor = (acc: number) => {
    if (acc >= 95) return ACCURACY_COLORS.excellent;
    if (acc >= 85) return ACCURACY_COLORS.good;
    if (acc >= 75) return ACCURACY_COLORS.fair;
    return ACCURACY_COLORS.poor;
  };

  const getAccuracyRating = (acc: number) => {
    if (acc >= 95) return 'MARKSMAN';
    if (acc >= 85) return 'SHARPSHOOTER';
    if (acc >= 75) return 'QUALIFIED';
    return 'TRAINEE';
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: { height: 60 },
          meter: { height: 8 },
          text: { fontSize: 12 },
          rating: { fontSize: 10 },
        };
      case 'medium':
        return {
          container: { height: 80 },
          meter: { height: 12 },
          text: { fontSize: 16 },
          rating: { fontSize: 12 },
        };
      case 'large':
        return {
          container: { height: 120 },
          meter: { height: 16 },
          text: { fontSize: 24 },
          rating: { fontSize: 16 },
        };
    }
  };

  const getTrendIcon = () => {
    if (!showTrend || previousAccuracy === undefined) return null;
    
    const trend = accuracy - previousAccuracy;
    if (Math.abs(trend) < 1) return null; // No significant change
    
    return trend > 0 ? (
      <TrendingUp size={16} color={ACCURACY_COLORS.excellent} />
    ) : (
      <TrendingDown size={16} color={ACCURACY_COLORS.poor} />
    );
  };

  const getTrendText = () => {
    if (!showTrend || previousAccuracy === undefined) return '';
    
    const trend = accuracy - previousAccuracy;
    if (Math.abs(trend) < 1) return '';
    
    return trend > 0 ? `+${trend.toFixed(1)}%` : `${trend.toFixed(1)}%`;
  };

  const sizeStyles = getSizeStyles();
  const accuracyColor = getAccuracyColor(accuracy);
  const rating = getAccuracyRating(accuracy);

  return (
    <Animated.View 
      style={[
        styles.container, 
        sizeStyles.container,
        { transform: [{ scale: pulseAnimation }] }
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.labelContainer}>
          <Target size={16} color={accuracyColor} />
          <Text style={[styles.label, MILITARY_TYPOGRAPHY.caption]}>
            {label}
          </Text>
        </View>
        
        {showTrend && (
          <View style={styles.trendContainer}>
            {getTrendIcon()}
            <Text style={[styles.trendText, MILITARY_TYPOGRAPHY.caption, { color: accuracyColor }]}>
              {getTrendText()}
            </Text>
          </View>
        )}
      </View>

      {/* Accuracy display */}
      <View style={styles.accuracyDisplay}>
        <Text style={[styles.accuracyText, sizeStyles.text, { color: accuracyColor }]}>
          {accuracy.toFixed(1)}%
        </Text>
        <Text style={[styles.ratingText, sizeStyles.rating, { color: accuracyColor }]}>
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
          
          {/* Gradient overlay for visual enhancement */}
          <LinearGradient
            colors={[accuracyColor, `${accuracyColor}80`]}
            style={[styles.meterGradient, sizeStyles.meter]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>

        {/* Meter markers */}
        <View style={styles.markers}>
          {[25, 50, 75, 95].map((mark) => (
            <View
              key={mark}
              style={[
                styles.marker,
                { left: `${mark}%` },
                accuracy >= mark && { backgroundColor: accuracyColor },
              ]}
            />
          ))}
        </View>

        {/* Meter labels */}
        <View style={styles.markerLabels}>
          <Text style={[styles.markerLabel, MILITARY_TYPOGRAPHY.caption]}>0</Text>
          <Text style={[styles.markerLabel, MILITARY_TYPOGRAPHY.caption]}>25</Text>
          <Text style={[styles.markerLabel, MILITARY_TYPOGRAPHY.caption]}>50</Text>
          <Text style={[styles.markerLabel, MILITARY_TYPOGRAPHY.caption]}>75</Text>
          <Text style={[styles.markerLabel, MILITARY_TYPOGRAPHY.caption]}>95</Text>
          <Text style={[styles.markerLabel, MILITARY_TYPOGRAPHY.caption]}>100</Text>
        </View>
      </View>

      {/* Performance zones */}
      <View style={styles.zones}>
        <View style={[styles.zone, { backgroundColor: ACCURACY_COLORS.poor }]}>
          <Text style={[styles.zoneLabel, MILITARY_TYPOGRAPHY.caption]}>TRAINEE</Text>
        </View>
        <View style={[styles.zone, { backgroundColor: ACCURACY_COLORS.fair }]}>
          <Text style={[styles.zoneLabel, MILITARY_TYPOGRAPHY.caption]}>QUALIFIED</Text>
        </View>
        <View style={[styles.zone, { backgroundColor: ACCURACY_COLORS.good }]}>
          <Text style={[styles.zoneLabel, MILITARY_TYPOGRAPHY.caption]}>SHARP</Text>
        </View>
        <View style={[styles.zone, { backgroundColor: ACCURACY_COLORS.excellent }]}>
          <Text style={[styles.zoneLabel, MILITARY_TYPOGRAPHY.caption]}>MARKS</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: TACTICAL_THEME.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TACTICAL_THEME.border,
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
  accuracyDisplay: {
    alignItems: 'center',
    marginBottom: 16,
  },
  accuracyText: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  ratingText: {
    fontWeight: 'bold',
  },
  meterContainer: {
    marginBottom: 12,
    position: 'relative',
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
  markers: {
    position: 'absolute',
    top: -2,
    left: 0,
    right: 0,
    height: 20,
  },
  marker: {
    position: 'absolute',
    width: 2,
    height: 20,
    backgroundColor: TACTICAL_THEME.textSecondary,
    transform: [{ translateX: -1 }],
  },
  markerLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  markerLabel: {
    color: TACTICAL_THEME.textSecondary,
    fontSize: 10,
  },
  zones: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  zone: {
    flex: 1,
  },
  zoneLabel: {
    position: 'absolute',
    top: -20,
    left: '50%',
    transform: [{ translateX: -15 }],
    color: TACTICAL_THEME.textSecondary,
    fontSize: 8,
  },
});
