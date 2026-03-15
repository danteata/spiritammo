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
    // Blinking cursor effect
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
    }, 45) // Slightly slower typing pace

    return () => clearInterval(interval)
  }, [started, text])

  return (
    <Text style={[style, { fontFamily: 'monospace', color: isDark ? '#94a3b8' : '#64748b' }]}>
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

  // Check if daily practice was completed today
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

  // Start animation only after loading is complete
  useEffect(() => {
    if (!isLoading) {
      // Small delay to ensure the UI is ready
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

  // Track welcome modal views
  useEffect(() => {
    if (showWelcome) {
      trackEvent(AnalyticsEventType.SCREEN_VIEW, { screen_name: 'welcome_modal' })
    }
  }, [showWelcome, trackEvent])

  // Track tutorial interactions
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
    router.push({ pathname: '/train/campaign', params: { mode: 'collection' } })
  }

  const handleNavigateToBattle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { })
    router.push('/battle')
  }

  const verseCount = scriptures?.length || 0
  const collectionCount = collections?.length || 0
  const streak = userStats?.streak || 0
  const valorPoints = (userStats as any)?.valorPoints || 0

  // Determine CTA state based on user progress
  const ctaState = useMemo(() => {
    const isNewUser = verseCount === 0 && streak === 0
    const timeGreeting = getTimeBasedGreeting()

    if (isNewUser) {
      return {
        title: 'START FIRST DRILL',
        subtitle: 'Begin your scripture memorization journey',
        icon: 'rocket' as const,
        color: '#22C55E',
        greeting: 'Welcome, Recruit!',
        subtext: 'Your training begins now.'
      }
    } else if (dailyCompleted) {
      return {
        title: 'EXTRA PRACTICE',
        subtitle: 'Daily mission complete! Keep sharp with bonus drills',
        icon: 'trophy' as const,
        color: '#FFD700',
        greeting: 'Mission Complete!',
        subtext: 'Return tomorrow for your next mission.'
      }
    } else if (streak > 0) {
      return {
        title: 'CONTINUE STREAK',
        subtitle: `${streak} day streak! Don't break the chain`,
        icon: 'fire' as const,
        color: '#FF6B35',
        greeting: timeGreeting.greeting,
        subtext: timeGreeting.subtext
      }
    } else {
      return {
        title: 'START DAILY DRILL',
        subtitle: 'Practice your verses and build your streak',
        icon: 'flash' as const,
        color: '#3B82F6',
        greeting: timeGreeting.greeting,
        subtext: timeGreeting.subtext
      }
    }
  }, [verseCount, streak, dailyCompleted])

  return (
    <ThemedContainer style={styles.container}>
      <ScreenHeader
        title="COMMAND CENTER"
        subtitle="YOUR DAILY MISSION"
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Contextual Greeting Section */}
        <Animated.View style={StyleSheet.flatten([styles.briefingSection, {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }])}>
          <View style={[styles.briefingCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
            <View style={styles.briefingHeader}>
              <FontAwesome5 name="satellite-dish" size={16} color="#FFD700" />
              <ThemedText variant="caption" style={styles.briefingLabel}>INCOMING TRANSMISSION</ThemedText>
            </View>
            <ThemedText variant="heading" style={styles.greetingText}>{ctaState.greeting}</ThemedText>
            <TypewriterText
              text={`🗣️ ${ctaState.subtext}`}
              style={styles.briefingText}
              delay={300}
              isDark={isDark}
            />
          </View>
        </Animated.View>

        {/* Single Primary CTA - Contextual based on user state */}
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }}>
          <PulsingGlow color={ctaState.color} style={styles.primaryCTA}>
            <TouchableOpacity
              onPress={handleStartDrill}
              activeOpacity={0.9}
            >
              <ThemedCard variant="glass" style={[styles.primaryCTACard, { borderColor: `${ctaState.color}40` }]}>
                <View style={styles.primaryCTAContent}>
                  <View style={[styles.primaryCTAIcon, { backgroundColor: `${ctaState.color}20` }]}>
                    <FontAwesome5 name={ctaState.icon} size={32} color={ctaState.color} />
                  </View>
                  <View style={styles.primaryCTAText}>
                    <ThemedText variant="heading" style={[styles.primaryCTATitle, { color: ctaState.color }]}>{ctaState.title}</ThemedText>
                    <ThemedText variant="body" style={styles.primaryCTASubtitle}>
                      {ctaState.subtitle}
                    </ThemedText>
                  </View>
                  <View style={styles.primaryCTAArrow}>
                    <FontAwesome5 name="chevron-right" size={20} color={theme.textSecondary} />
                  </View>
                </View>
              </ThemedCard>
            </TouchableOpacity>
          </PulsingGlow>
        </Animated.View>

        {/* Challenge Mode - Secondary CTA (only for users with verses) */}
        {/* {verseCount > 0 && (
          <Animated.View style={StyleSheet.flatten([styles.battleSection, {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }])}>
            <TouchableOpacity
              style={styles.battleCard}
              onPress={handleNavigateToBattle}
              activeOpacity={0.9}
            >
              <View style={[styles.battleCardInner, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)' }]}>
                <View style={styles.battleIconContainer}>
                  <FontAwesome5 name="crosshairs" size={24} color="#EF4444" />
                </View>
                <View style={styles.battleContent}>
                  <ThemedText variant="heading" style={styles.battleTitle}>BATTLE MODE</ThemedText>
                  <ThemedText variant="caption" style={styles.battleSubtitle}>
                    Test your recall and earn Valor Points
                  </ThemedText>
                </View>
                <FontAwesome5 name="chevron-right" size={14} color="#EF4444" />
              </View>
            </TouchableOpacity>
          </Animated.View>
        )} */}

        {/* Simplified Stats Grid - Streak, Valor, Arsenal */}
        <Animated.View style={StyleSheet.flatten([styles.statsGrid, {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }])}>
          <View style={[styles.statsCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <View style={styles.statsCardHeader}>
              <FontAwesome5 name="fire" size={18} color="#FF6B35" />
              <ThemedText variant="caption" style={styles.statsCardLabel}>STREAK</ThemedText>
            </View>
            <ThemedText variant="heading" style={styles.statsCardValue}>{streak}</ThemedText>
            <ThemedText variant="caption" style={styles.statsCardSub}>days</ThemedText>
          </View>

          <View style={[styles.statsCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <View style={styles.statsCardHeader}>
              <FontAwesome5 name="coins" size={18} color="#FFD700" />
              <ThemedText variant="caption" style={styles.statsCardLabel}>VALOR</ThemedText>
            </View>
            <ThemedText variant="heading" style={styles.statsCardValue}>{valorPoints}</ThemedText>
            <ThemedText variant="caption" style={styles.statsCardSub}>points</ThemedText>
          </View>

          <View style={[styles.statsCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <View style={styles.statsCardHeader}>
              <FontAwesome5 name="book" size={18} color={theme.accent} />
              <ThemedText variant="caption" style={styles.statsCardLabel}>ARSENAL</ThemedText>
            </View>
            <ThemedText variant="heading" style={styles.statsCardValue}>{verseCount}</ThemedText>
            <ThemedText variant="caption" style={styles.statsCardSub}>verses</ThemedText>
          </View>
        </Animated.View>

        {/* Avatar Section */}
        <Animated.View style={StyleSheet.flatten([styles.avatarSection, {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }])}>
          <SoldierAvatar size="medium" showStats={false} />
        </Animated.View>

        {/* Streak Challenge */}
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }}>
          <StreakChallenge compact={true} />
        </Animated.View>
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
  briefingSection: {
    marginBottom: 16,
  },
  briefingCard: {
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FFD700',
  },
  briefingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  briefingLabel: {
    color: '#FFD700',
    letterSpacing: 1,
    fontWeight: '700',
    fontSize: 10,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtextText: {
    fontSize: 14,
    opacity: 0.8,
  },
  briefingText: {
    fontSize: 14,
    lineHeight: 20,
  },
  primaryCTA: {
    marginBottom: 20,
    borderRadius: 20,
  },
  primaryCTACard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
  },
  primaryCTAContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryCTAIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCTAText: {
    flex: 1,
    marginLeft: 16,
  },
  primaryCTATitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  primaryCTASubtitle: {
    fontSize: 13,
    opacity: 0.7,
  },
  primaryCTAArrow: {
    marginLeft: 8,
    opacity: 0.5,
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
    borderRadius: 14,
    alignItems: 'center',
  },
  statsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  statsCardLabel: {
    fontSize: 9,
    letterSpacing: 1,
    opacity: 0.7,
  },
  statsCardValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  statsCardSub: {
    fontSize: 10,
    opacity: 0.5,
    marginTop: 2,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  battleSection: {
    marginBottom: 16,
  },
  battleCard: {
    borderRadius: 14,
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
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  battleContent: {
    flex: 1,
  },
  battleTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  battleSubtitle: {
    opacity: 0.7,
  },
})
