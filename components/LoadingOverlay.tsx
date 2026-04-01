import React, { useEffect, useRef, useState } from 'react'
import { StyleSheet, View, Modal, Text, Animated, Easing, Platform } from 'react-native'
import { useAppStore } from '@/hooks/useAppStore'

interface LoadingOverlayProps {
  visible: boolean
  message?: string
  transparent?: boolean
  /** Show progress percentage (0-100) */
  progress?: number
  /** Cycle through military tips */
  showTips?: boolean
}

const MILITARY_TIPS = [
  'Calibrating weapon systems...',
  'Securing perimeter...',
  'Loading ammunition...',
  'Establishing comms...',
  'Deploying tactical assets...',
  'Synchronizing intel...',
  'Preparing mission briefing...',
  'Arming warheads...',
]

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = 'Mission in progress...',
  transparent = false,
  progress,
  showTips = false,
}) => {
  const { isDark, theme } = useAppStore()

  // Animations
  const pulseAnim = useRef(new Animated.Value(0.4)).current
  const rotateAnim = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(0)).current
  const ring1 = useRef(new Animated.Value(0)).current
  const ring2 = useRef(new Animated.Value(0)).current
  const [tipIndex, setTipIndex] = useState(0)

  useEffect(() => {
    if (!visible) return

    // Entrance fade
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start()

    // Pulse glow
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    )
    pulseLoop.start()

    // Rotation for radar sweep
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    )
    rotateLoop.start()

    // Ring expansion
    const ring1Loop = Animated.loop(
      Animated.sequence([
        Animated.timing(ring1, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ring1, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    )
    ring1Loop.start()

    const ring2Loop = Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(ring2, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ring2, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    )
    ring2Loop.start()

    // Cycle tips
    let tipTimer: ReturnType<typeof setInterval> | undefined
    if (showTips) {
      tipTimer = setInterval(() => {
        setTipIndex((prev) => (prev + 1) % MILITARY_TIPS.length)
      }, 2500)
    }

    return () => {
      pulseLoop.stop()
      rotateLoop.stop()
      ring1Loop.stop()
      ring2Loop.stop()
      if (tipTimer) clearInterval(tipTimer)
    }
  }, [visible])

  if (!visible) return null

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const accentColor = theme.accent

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            backgroundColor: transparent
              ? 'rgba(0, 0, 0, 0.5)'
              : isDark
                ? 'rgba(0, 0, 0, 0.85)'
                : 'rgba(255, 255, 255, 0.92)',
            opacity: fadeAnim,
          },
        ]}
      >
        <View
          style={[
            styles.container,
            {
              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            },
          ]}
        >
          {/* Radar animation */}
          <View style={styles.radarContainer}>
            {/* Expanding rings */}
            <Animated.View
              style={[
                styles.ring,
                {
                  borderColor: accentColor,
                  opacity: ring1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.4, 0],
                  }),
                  transform: [
                    {
                      scale: ring1.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.6, 1.8],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.ring,
                {
                  borderColor: accentColor,
                  opacity: ring2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 0],
                  }),
                  transform: [
                    {
                      scale: ring2.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.6, 1.8],
                      }),
                    },
                  ],
                },
              ]}
            />

            {/* Center crosshair */}
            <Animated.View
              style={[
                styles.crosshair,
                {
                  opacity: pulseAnim,
                },
              ]}
            >
              <View style={[styles.crosshairLine, styles.crosshairH, { backgroundColor: accentColor }]} />
              <View style={[styles.crosshairLine, styles.crosshairV, { backgroundColor: accentColor }]} />
              <View style={[styles.crosshairDot, { backgroundColor: accentColor }]} />
            </Animated.View>

            {/* Rotating sweep */}
            <Animated.View
              style={[
                styles.sweep,
                {
                  transform: [{ rotate: spin }],
                },
              ]}
            >
              <View
                style={[
                  styles.sweepLine,
                  { backgroundColor: accentColor },
                ]}
              />
            </Animated.View>
          </View>

          {/* Message */}
          <Text
            style={[
              styles.message,
              {
                color: isDark ? theme.text : '#1A2309',
                fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
              },
            ]}
          >
            {message}
          </Text>

          {/* Tips */}
          {showTips && (
            <Text
              style={[
                styles.tip,
                { color: isDark ? theme.textSecondary : '#6B7B3A' },
              ]}
            >
              {MILITARY_TIPS[tipIndex]}
            </Text>
          )}

          {/* Progress bar */}
          {progress !== undefined && (
            <View style={styles.progressContainer}>
              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
                ]}
              >
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: accentColor,
                      width: `${Math.min(100, Math.max(0, progress))}%`,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.progressText,
                  { color: isDark ? theme.textSecondary : '#6B7B3A' },
                ]}
              >
                {Math.round(progress)}%
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  radarContainer: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  ring: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
  },
  crosshair: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshairLine: {
    position: 'absolute',
  },
  crosshairH: {
    width: 28,
    height: 1.5,
  },
  crosshairV: {
    width: 1.5,
    height: 28,
  },
  crosshairDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  sweep: {
    position: 'absolute',
    width: 64,
    height: 64,
    alignItems: 'center',
  },
  sweepLine: {
    width: 1,
    height: 32,
    opacity: 0.4,
  },
  message: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  tip: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.7,
    fontStyle: 'italic',
  },
  progressContainer: {
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
})
