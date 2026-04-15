import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '@/hooks/useTheme'

interface AccuracyTargetProps {
  accuracy: number
  size?: number
  showShot?: boolean
  showDart?: boolean
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export default function AccuracyTarget({
  accuracy,
  size = 120,
  showShot = true,
  showDart = true,
}: AccuracyTargetProps) {
  const { theme, isDark } = useTheme()

  const shot = useMemo(() => {
    const safeAccuracy = clamp(accuracy, 0, 100)
    const maxDeviation = size / 2 - Math.max(8, size * 0.08)
    const deviation = maxDeviation * (1 - safeAccuracy / 100)
    const angle = Math.random() * Math.PI * 2
    const distance = deviation * (0.75 + Math.random() * 0.4)

    return {
      x: size / 2 + Math.cos(angle) * distance,
      y: size / 2 + Math.sin(angle) * distance,
      isHit: safeAccuracy >= 60,
    }
  }, [accuracy, size])

  const ringColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.2)'
  const shotSize = Math.max(8, Math.round(size * 0.08))
  const ringWidth = Math.max(2, Math.round(size * 0.02))

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[styles.targetFill, { width: size, height: size, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)' }]} />

      <View style={styles.crosshair}>
        <View style={[styles.crosshairHorizontal, { backgroundColor: theme.accent }]} />
        <View style={[styles.crosshairVertical, { backgroundColor: theme.accent }]} />
      </View>

      <View style={[styles.targetRing, styles.outerRing, { width: size, height: size, borderColor: ringColor, borderWidth: ringWidth }]} />
      <View style={[styles.targetRing, styles.middleRing, {
        width: size * 0.68,
        height: size * 0.68,
        borderColor: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)',
        borderWidth: ringWidth,
      }]} />
      <View style={[styles.targetRing, styles.innerRing, {
        width: size * 0.36,
        height: size * 0.36,
        borderColor: theme.warning,
        borderWidth: ringWidth,
      }]} />
      <View style={[styles.targetRing, styles.bullseye, {
        width: size * 0.16,
        height: size * 0.16,
        borderColor: theme.accent,
        borderWidth: ringWidth,
        backgroundColor: 'rgba(255, 107, 53, 0.2)',
      }]} />

      {showShot && (
        <>
          <View
            style={[
              styles.shot,
              {
                width: shotSize,
                height: shotSize,
                borderRadius: shotSize / 2,
                left: shot.x - shotSize / 2,
                top: shot.y - shotSize / 2,
                backgroundColor: shot.isHit ? (isDark ? '#0c0c0c' : '#111') : theme.error,
                borderColor: shot.isHit ? theme.accent : 'rgba(255,0,0,0.4)',
              },
            ]}
          />
          {showDart && (
            <View
              style={[
                styles.dart,
                {
                  height: Math.max(10, Math.round(size * 0.12)),
                  left: shot.x - 1,
                  top: shot.y - Math.max(14, Math.round(size * 0.14)),
                  backgroundColor: shot.isHit ? theme.accent : theme.error,
                },
              ]}
            />
          )}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshair: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshairHorizontal: {
    position: 'absolute',
    width: '100%',
    height: 1,
    opacity: 0.6,
  },
  crosshairVertical: {
    position: 'absolute',
    height: '100%',
    width: 1,
    opacity: 0.6,
  },
  targetFill: {
    position: 'absolute',
    borderRadius: 999,
  },
  targetRing: {
    position: 'absolute',
    borderRadius: 999,
  },
  outerRing: {},
  middleRing: {},
  innerRing: {},
  bullseye: {},
  shot: {
    position: 'absolute',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dart: {
    position: 'absolute',
    width: 2,
    borderRadius: 2,
    opacity: 0.9,
  },
})
