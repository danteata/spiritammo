import React, { useState, useEffect, useRef, useMemo } from 'react'
import { StyleSheet, Text, ScrollView, View, TouchableOpacity, Dimensions, Animated } from 'react-native'
import { FontAwesome5, FontAwesome, Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter, Link } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'
import ScreenHeader from '@/components/ScreenHeader'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { SkeletonHomeScreen } from '@/components/ui/Skeleton'
import StreakChallenge from '@/components/StreakChallenge'
import SoldierAvatar from '@/components/SoldierAvatar'
import WelcomeModal from '@/components/WelcomeModal'
import TutorialOverlay, { TutorialStep } from '@/components/TutorialOverlay'
import { analytics, Analytics, AnalyticsEventType } from '@/services/analytics'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'

const { width } = Dimensions.get('window')

// Helper to get time-based greeting
const getTimeBasedGreeting = (): { greeting: string; subtext: string } => {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) {
    return { greeting: 'Good morning, Soldier!', subtext: 'Ready for today\'s verse?' }
  } else if (hour >= 12 && hour < 17) {
    return { greeting: 'Good afternoon, Soldier!', subtext: 'Stay sharp with daily drills.' }
  } else if (hour >= 17 && hour < 21) {
    return { greeting: 'Evening drill!', subtext: 'Keep your streak alive.' }
  } else {
    return { greeting: 'Night ops!', subtext: 'Final practice before rest.' }
  }
}

// Animated typing text component for military briefing feel
interface TypewriterTextProps {
  text: string
  style?: any
  delay?: number
  isDark: boolean
}

const TypewriterText: React.FC<TypewriterTextProps> = ({ text, style, delay = 0, isDark }: TypewriterTextProps) => {
  const [displayedText, setDisplayedText] = useState('')
  const [started, setStarted] = useState(false)
  const [showCursor, setShowCursor] = useState(true)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    const startTimer = setTimeout(() => {
      setStarted(true)
    }, delay)
    return () => clearTimeout(startTimer)
  }, [delay])

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 500)
    return () => clearInterval(cursorInterval)
  }, [])

  useEffect(() => {
    if (!started) return

    let currentIndex = 0
    const interval = setInterval(() => {
      if (currentIndex <= text.length) {
        setDisplayedText(text.slice(0, currentIndex))
        if (currentIndex > 0 && currentIndex < text.length) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { })
        }
        currentIndex++
      } else {
        clearInterval(interval)
        setIsComplete(true)
      }
    }, 45)

    return () => clearInterval(interval)
  }, [started, text])

  return (
    <Text style={[style, { fontFamily: 'monospace', color: isDark ? '#94a3b8' : '#6B7B3A' }]}>
      {displayedText}
      {(!isComplete || showCursor) && <Text style={{ opacity: showCursor ? 1 : 0 }}>█</Text>}
    </Text>
  )
}

// Pulsing glow effect component
interface PulsingGlowProps {
  children: React.ReactNode
  color: string
  style?: any
}

const PulsingGlow: React.FC<PulsingGlowProps> = ({ children, color, style }: PulsingGlowProps) => {
  const glowAnim = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start()
  }, [])

  return (
    <Animated.View style={[style, { shadowColor: color, shadowOpacity: glowAnim, shadowRadius: 20, shadowOffset: { width: 0, height: 0 } }]}>
      {children}
    </Animated.View>
  )
}

export default function HomeScreen() {
  const { isLoading, theme, isDark, userStats, scriptures, collections } = useAppStore()
  const router = useRouter()
  const [showWelcome, setShowWelcome] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)
  const [dailyCompleted, setDailyCompleted] = useState(false)
  const { trackEvent } = useAnalytics()

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current
  const scaleAnim = useRef(new Animated.Value(0.95)).current

  // Track screen view
  useScreenTracking('home')

  useEffect(() => {
    checkFirstLaunch()
    checkDailyCompletion()
  }, [])

  const checkDailyCompletion = async () => {
    try {
      const lastPracticeDate = await AsyncStorage.getItem('lastPracticeDate')
      if (lastPracticeDate) {
        const lastDate = new Date(lastPracticeDate).toDateString()
        const today = new Date().toDateString()
        setDailyCompleted(lastDate === today)
      }
    } catch (error) {
      console.error('Failed to check daily completion:', error)
    }
  }

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        startEntranceAnimation()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isLoading])

  const startEntranceAnimation = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start()
  }

  useEffect(() => {
    if (showWelcome) {
      trackEvent(AnalyticsEventType.SCREEN_VIEW, { screen_name: 'welcome_modal' })
    }
  }, [showWelcome, trackEvent])

  useEffect(() => {
    if (showTutorial) {
      trackEvent(AnalyticsEventType.SCREEN_VIEW, { screen_name: 'tutorial_overlay', step: tutorialStep })
    }
  }, [showTutorial, tutorialStep, trackEvent])

  const tutorialSteps: TutorialStep[] = [
    {
      id: 'start-drill',
      title: 'Start Your First Drill',
      description: 'Tap the button below to begin practicing your first verse.',
      position: 'center',
      canSkip: true,
    },
  ]

  const checkFirstLaunch = async () => {
    try {
      const hasSeenWelcome = await AsyncStorage.getItem('hasSeenWelcome')
      if (!hasSeenWelcome) {
        setShowWelcome(true)
      }
    } catch (error) {
      console.error('Failed to check welcome status:', error)
    }
  }

  const handleStartDrill = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { })
    trackEvent(AnalyticsEventType.PRACTICE_START, { source: 'home_quick_start' })
    router.push('/train')
  }

  const handleNavigateToBattle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { })
    router.push('/battle')
  }

  const verseCount = scriptures?.length || 0
  const collectionCount = collections?.length || 0
  const streak = userStats?.streak || 0
  const valorPoints = (userStats as any)?.valorPoints || 0

  const ctaState = useMemo(() => {
    const isNewUser = verseCount === 0 && streak === 0
    const timeGreeting = getTimeBasedGreeting()

    if (isNewUser) {
      return {
        title: 'START FIRST DRILL',
        subtitle: 'Begin your scripture memorization journey',
        icon: 'rocket' as const,
        color: theme.success,
        greeting: 'Welcome, Recruit!',
        subtext: 'Your training begins now.'
      }
    } else if (dailyCompleted) {
      return {
        title: 'EXTRA PRACTICE',
        subtitle: 'Daily mission complete! Keep sharp with bonus drills',
        icon: 'trophy' as const,
        color: theme.accent,
        greeting: 'Mission Complete!',
        subtext: 'Return tomorrow for your next mission.'
      }
    } else if (streak > 0) {
      return {
        title: 'CONTINUE STREAK',
        subtitle: `${streak} day streak! Don't break the chain`,
        icon: 'fire' as const,
        color: isDark ? '#F59E0B' : theme.warning,
        greeting: timeGreeting.greeting,
        subtext: timeGreeting.subtext
      }
    } else {
      return {
        title: 'START DAILY DRILL',
        subtitle: 'Practice your verses and build your streak',
        icon: 'bolt' as const,
        color: isDark ? '#3B82F6' : theme.primary,
        greeting: timeGreeting.greeting,
        subtext: timeGreeting.subtext
      }
    }
  }, [verseCount, streak, dailyCompleted, isDark, theme])

  // Light mode accent colors

  const bgSurface = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.92)'
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#D4CBAB'

  return (
    <ThemedContainer style={styles.container}>
      <ScreenHeader
        title="COMMAND CENTER"
        subtitle="YOUR DAILY MISSION"
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Show skeleton while loading */}
        {isLoading ? (
          <SkeletonHomeScreen />
        ) : (
        <>
        {/* Top Header & Profile Section */}
        <Animated.View style={[styles.profileHeader, {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }]}>
          <View style={styles.profileInfo}>
            <View style={[
              styles.briefingCard,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.05)' : theme.border,
                borderLeftColor: theme.accent,
                flex: 1,
              }
            ]}>
              {!isDark && (
                <View style={[styles.classificationStamp, { borderColor: `${theme.error}40`, backgroundColor: `${theme.error}10` }]}>
                  <Text style={[styles.classificationText, { color: theme.error }]}>CLASSIFIED</Text>
                </View>
              )}
              <View style={styles.briefingHeader}>
                <FontAwesome5 name="satellite-dish" size={14} color={theme.accent} />
                <ThemedText variant="caption" style={[styles.briefingLabel, { color: theme.accent }]}>
                  INCOMING TRANSMISSION
                </ThemedText>
              </View>
              <ThemedText variant="heading" style={[
                styles.greetingText,
                { color: theme.text }
              ]}>
                {ctaState.greeting}
              </ThemedText>
              <TypewriterText
                text={`> ${ctaState.subtext}`}
                style={styles.briefingText}
                delay={300}
                isDark={isDark}
              />

              {/* Tactical Readout (Consolidated Stats) */}
              <View style={styles.tacticalReadout}>
                <View style={styles.readoutItem}>
                  <FontAwesome5 name="fire" size={10} color={theme.warning} />
                  <ThemedText variant="caption" style={styles.readoutValue}>{streak}D</ThemedText>
                </View>
                <View style={[styles.readoutDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
                <View style={styles.readoutItem}>
                  <FontAwesome5 name="coins" size={10} color={theme.accent} />
                  <ThemedText variant="caption" style={styles.readoutValue}>{valorPoints}</ThemedText>
                </View>
                <View style={[styles.readoutDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
                <View style={styles.readoutItem}>
                  <FontAwesome5 name="book" size={10} color={theme.success} />
                  <ThemedText variant="caption" style={styles.readoutValue}>{verseCount}V</ThemedText>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.avatarContainer}>
            <SoldierAvatar size="small" showStats={false} />
          </View>
        </Animated.View>

        {/* Primary Mission Tool - Tactical Action Button */}
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
          marginTop: 16
        }}>
          <PulsingGlow color={ctaState.color} style={styles.primaryCTA}>
            <TouchableOpacity
              onPress={handleStartDrill}
              activeOpacity={0.9}
            >
              <View style={[
                styles.primaryCTACard,
                {
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#FFFFFF',
                  borderColor: isDark ? `${ctaState.color}40` : theme.border,
                }
              ]}>
                {!isDark && (
                  <View style={[styles.ctaStripe, { backgroundColor: ctaState.color }]} />
                )}
                <View style={styles.primaryCTAContent}>
                  <View style={[
                    styles.primaryCTAIcon,
                    { backgroundColor: isDark ? `${ctaState.color}20` : `${ctaState.color}15` }
                  ]}>
                    <FontAwesome5 name={ctaState.icon} size={28} color={ctaState.color} />
                  </View>
                  <View style={styles.primaryCTAText}>
                    <ThemedText variant="heading" style={[
                      styles.primaryCTATitle,
                      { color: ctaState.color, letterSpacing: 2 }
                    ]}>
                      {ctaState.title}
                    </ThemedText>
                    <ThemedText variant="body" style={[
                      styles.primaryCTASubtitle,
                      { color: isDark ? theme.textSecondary : '#6B7B3A' }
                    ]}>
                      {ctaState.subtitle}
                    </ThemedText>
                  </View>
                  <View style={styles.primaryCTAArrow}>
                    <View style={[
                      styles.arrowCircle,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F5F0E1',
                        borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#D4CBAB',
                      }
                    ]}>
                      <FontAwesome5 name="chevron-right" size={14} color={isDark ? theme.textSecondary : theme.primary} />
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </PulsingGlow>
        </Animated.View>

        {/* Streak Challenge - Replaces the redundant stats grid */}
        <Animated.View style={[styles.challengeSection, {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }]}>
          <StreakChallenge />
        </Animated.View>
        </>
        )}
      </ScrollView>

      {/* Welcome Modal */}
      <WelcomeModal
        isVisible={showWelcome}
        onClose={() => {
          setShowWelcome(false)
          setTimeout(() => setShowTutorial(true), 500)
        }}
      />

      <TutorialOverlay
        isVisible={showTutorial}
        steps={tutorialSteps}
        currentStep={tutorialStep}
        onStepChange={setTutorialStep}
        onComplete={() => setShowTutorial(false)}
        onSkip={() => setShowTutorial(false)}
        theme="military"
      />

      <LoadingOverlay visible={isLoading} message="Mobilizing forces..." />
    </ThemedContainer>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
    marginTop: 8,
  },
  profileInfo: {
    flex: 1,
  },
  avatarContainer: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  briefingCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderLeftWidth: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  classificationStamp: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#B91C1C40',
    backgroundColor: '#B91C1C10',
  },
  classificationText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#B91C1C',
    fontFamily: 'monospace',
  },
  briefingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  briefingLabel: {
    letterSpacing: 1.5,
    fontWeight: '700',
    fontSize: 9,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subtextText: {
    fontSize: 14,
    opacity: 0.8,
  },
  briefingText: {
    fontSize: 13,
    lineHeight: 20,
  },
  primaryCTA: {
    marginBottom: 20,
    borderRadius: 8,
  },
  primaryCTACard: {
    borderRadius: 8,
    padding: 20,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  ctaStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 6,
    height: '100%',
  },
  primaryCTAContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryCTAIcon: {
    width: 56,
    height: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  primaryCTAText: {
    flex: 1,
    marginLeft: 14,
  },
  primaryCTATitle: {
    fontSize: 16,
    marginBottom: 4,
    fontWeight: '800',
  },
  primaryCTASubtitle: {
    fontSize: 12,
    opacity: 0.8,
    lineHeight: 17,
  },
  primaryCTAArrow: {
    marginLeft: 8,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  tacticalReadout: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    gap: 12,
  },
  readoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readoutValue: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  readoutDivider: {
    width: 1,
    height: 12,
    opacity: 0.3,
  },
  challengeSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  statsCard: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
  },
  statsAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  statsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
    marginTop: 4,
  },
  statsCardLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  statsCardValue: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statsCardSub: {
    fontSize: 10,
    opacity: 0.6,
    marginTop: 2,
    fontWeight: '600',
  },

  battleSection: {
    marginBottom: 16,
  },
  battleCard: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  battleCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  battleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  battleContent: {
    flex: 1,
  },
  battleTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 1.5,
  },
  battleSubtitle: {
    opacity: 0.7,
  },
})
