import React, { useRef, useEffect } from 'react'
import {
  StyleSheet,
  View,
  Animated,
  ViewStyle,
  StyleProp,
  Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useAppStore } from '@/hooks/useAppStore'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// ─── Shimmer Effect ───────────────────────────────────────────────────────────

const ShimmerEffect: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const shimmerAnim = useRef(new Animated.Value(-1)).current

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start()
  }, [])

  const translateX = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  })

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { transform: [{ translateX }] },
      ]}
    >
      <LinearGradient
        colors={
          isDark
            ? ['transparent', 'rgba(255,255,255,0.05)', 'transparent']
            : ['transparent', 'rgba(0,0,0,0.04)', 'transparent']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  )
}

// ─── Skeleton Base ────────────────────────────────────────────────────────────

interface SkeletonProps {
  width?: number | string
  height?: number
  borderRadius?: number
  style?: StyleProp<ViewStyle>
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 6,
  style,
}) => {
  const { isDark } = useAppStore()

  return (
    <View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <ShimmerEffect isDark={isDark} />
    </View>
  )
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

export const SkeletonCard: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => {
  const { isDark, theme } = useAppStore()

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#D4CBAB',
        },
        style,
      ]}
    >
      <View style={styles.cardHeader}>
        <Skeleton width={40} height={40} borderRadius={8} />
        <View style={styles.cardHeaderText}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={10} style={{ marginTop: 6 }} />
        </View>
      </View>
      <Skeleton width="100%" height={8} style={{ marginTop: 12 }} />
      <Skeleton width="75%" height={8} style={{ marginTop: 6 }} />
    </View>
  )
}

// ─── Skeleton Collection List ─────────────────────────────────────────────────

export const SkeletonCollectionList: React.FC<{ count?: number }> = ({ count = 4 }) => {
  const { isDark } = useAppStore()

  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.collectionItem,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            },
          ]}
        >
          <Skeleton width={42} height={42} borderRadius={8} />
          <View style={styles.collectionText}>
            <Skeleton width={`${60 + Math.random() * 30}%`} height={14} />
            <Skeleton width={`${30 + Math.random() * 20}%`} height={10} style={{ marginTop: 6 }} />
          </View>
          <Skeleton width={28} height={28} borderRadius={8} />
        </View>
      ))}
    </View>
  )
}

// ─── Skeleton Stats Grid ──────────────────────────────────────────────────────

export const SkeletonStatsGrid: React.FC<{ columns?: number }> = ({ columns = 3 }) => {
  const { isDark } = useAppStore()

  return (
    <View style={styles.statsGrid}>
      {Array.from({ length: columns }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.statCard,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#D4CBAB',
            },
          ]}
        >
          <Skeleton width={24} height={24} borderRadius={6} />
          <Skeleton width={40} height={22} style={{ marginTop: 8 }} borderRadius={4} />
          <Skeleton width={32} height={8} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  )
}

// ─── Skeleton Verse Card ──────────────────────────────────────────────────────

export const SkeletonVerseCard: React.FC = () => {
  const { isDark } = useAppStore()

  return (
    <View
      style={[
        styles.verseCard,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#D4CBAB',
        },
      ]}
    >
      {/* Reference badge */}
      <View style={styles.verseHeader}>
        <Skeleton width={100} height={16} borderRadius={4} />
        <Skeleton width={36} height={16} borderRadius={8} />
      </View>
      {/* Text lines */}
      <Skeleton width="100%" height={12} style={{ marginTop: 10 }} />
      <Skeleton width="90%" height={12} style={{ marginTop: 6 }} />
      <Skeleton width="70%" height={12} style={{ marginTop: 6 }} />
    </View>
  )
}

// ─── Skeleton Home Screen ─────────────────────────────────────────────────────

export const SkeletonHomeScreen: React.FC = () => {
  return (
    <View style={styles.homeContainer}>
      {/* Briefing card */}
      <SkeletonCard style={{ marginBottom: 16 }} />
      {/* CTA */}
      <Skeleton width="100%" height={80} borderRadius={8} style={{ marginBottom: 20 }} />
      {/* Stats grid */}
      <SkeletonStatsGrid />
      {/* Avatar */}
      <View style={{ alignItems: 'center', marginTop: 20 }}>
        <Skeleton width={100} height={100} borderRadius={50} />
      </View>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  listContainer: {
    gap: 8,
  },
  collectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 12,
  },
  collectionText: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  verseCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  verseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  homeContainer: {
    padding: 16,
  },
})
