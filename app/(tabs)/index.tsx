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
        color: isDark ? '#22C55E' : '#4A7C2E',
        greeting: 'Welcome, Recruit!',
        subtext: 'Your training begins now.'
      }
    } else if (dailyCompleted) {
      return {
        title: 'EXTRA PRACTICE',
        subtitle: 'Daily mission complete! Keep sharp with bonus drills',
        icon: 'trophy' as const,
        color: isDark ? '#FFD700' : '#C8A951',
        greeting: 'Mission Complete!',
        subtext: 'Return tomorrow for your next mission.'
      }
    } else if (streak > 0) {
      return {
        title: 'CONTINUE STREAK',
        subtitle: `${streak} day streak! Don't break the chain`,
        icon: 'fire' as const,
        color: isDark ? '#FF6B35' : '#B45309',
        greeting: timeGreeting.greeting,
        subtext: timeGreeting.subtext
      }
    } else {
      return {
        title: 'START DAILY DRILL',
        subtitle: 'Practice your verses and build your streak',
        icon: 'flash' as const,
        color: isDark ? '#3B82F6' : '#4A5D23',
        greeting: timeGreeting.greeting,
        subtext: timeGreeting.subtext
      }
    }
  }, [verseCount, streak, dailyCompleted, isDark])

  // Light mode accent colors
  const accentGold = isDark ? '#FFD700' : '#C8A951'
  const accentRed = isDark ? '#EF4444' : '#B91C1C'
  const accentGreen = isDark ? '#22C55E' : '#4A7C2E'
  const accentOlive = isDark ? theme.accent : '#4A5D23'
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
        {/* Contextual Greeting Section - Military Briefing Card */}
        <Animated.View style={StyleSheet.flatten([styles.briefingSection, {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }])}>
          <View style={[
            styles.briefingCard,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#D4CBAB',
              borderLeftColor: isDark ? '#FFD700' : '#C8A951',
            }
          ]}>
            {/* Classification stamp for light mode */}
            {!isDark && (
              <View style={styles.classificationStamp}>
                <Text style={styles.classificationText}>CLASSIFIED</Text>
              </View>
            )}
            <View style={styles.briefingHeader}>
              <FontAwesome5 name="satellite-dish" size={14} color={accentGold} />
              <ThemedText variant="caption" style={[styles.briefingLabel, { color: accentGold }]}>
                INCOMING TRANSMISSION
              </ThemedText>
            </View>
            <ThemedText variant="heading" style={[
              styles.greetingText,
              { color: isDark ? '#F8FAFC' : '#1A2309' }
            ]}>
              {ctaState.greeting}
            </ThemedText>
            <TypewriterText
              text={`> ${ctaState.subtext}`}
              style={styles.briefingText}
              delay={300}
              isDark={isDark}
            />
          </View>
        </Animated.View>

        {/* Single Primary CTA - Tactical Action Button */}
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
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
                  borderColor: isDark ? `${ctaState.color}40` : '#4A5D23',
                }
              ]}>
                {/* Military diagonal stripe for light mode */}
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
                      <FontAwesome5 name="chevron-right" size={14} color={isDark ? theme.textSecondary : '#4A5D23'} />
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </PulsingGlow>
        </Animated.View>

        {/* Stats Grid - Military Dashboard Style */}
        <Animated.View style={StyleSheet.flatten([styles.statsGrid, {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }])}>
          <View style={[
            styles.statsCard,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#D4CBAB',
            }
          ]}>
            <View style={[styles.statsAccentBar, { backgroundColor: isDark ? '#FF6B35' : '#B45309' }]} />
            <View style={styles.statsCardHeader}>
              <FontAwesome5 name="fire" size={16} color={isDark ? '#FF6B35' : '#B45309'} />
              <ThemedText variant="caption" style={[styles.statsCardLabel, { color: isDark ? theme.textSecondary : '#6B7B3A' }]}>
                STREAK
              </ThemedText>
            </View>
            <ThemedText variant="heading" style={[
              styles.statsCardValue,
              { color: isDark ? '#F8FAFC' : '#1A2309' }
            ]}>
              {streak}
            </ThemedText>
            <ThemedText variant="caption" style={[styles.statsCardSub, { color: isDark ? theme.textSecondary : '#6B7B3A' }]}>
              days
            </ThemedText>
          </View>

          <View style={[
            styles.statsCard,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#D4CBAB',
            }
          ]}>
            <View style={[styles.statsAccentBar, { backgroundColor: accentGold }]} />
            <View style={styles.statsCardHeader}>
              <FontAwesome5 name="coins" size={16} color={accentGold} />
              <ThemedText variant="caption" style={[styles.statsCardLabel, { color: isDark ? theme.textSecondary : '#6B7B3A' }]}>
                VALOR
              </ThemedText>
            </View>
            <ThemedText variant="heading" style={[
              styles.statsCardValue,
              { color: isDark ? '#F8FAFC' : '#1A2309' }
            ]}>
              {valorPoints}
            </ThemedText>
            <ThemedText variant="caption" style={[styles.statsCardSub, { color: isDark ? theme.textSecondary : '#6B7B3A' }]}>
              points
            </ThemedText>
          </View>

          <View style={[
            styles.statsCard,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#D4CBAB',
            }
          ]}>
            <View style={[styles.statsAccentBar, { backgroundColor: accentOlive }]} />
            <View style={styles.statsCardHeader}>
              <FontAwesome5 name="book" size={16} color={accentOlive} />
              <ThemedText variant="caption" style={[styles.statsCardLabel, { color: isDark ? theme.textSecondary : '#6B7B3A' }]}>
                ARSENAL
              </ThemedText>
            </View>
            <ThemedText variant="heading" style={[
              styles.statsCardValue,
              { color: isDark ? '#F8FAFC' : '#1A2309' }
            ]}>
              {verseCount}
            </ThemedText>
            <ThemedText variant="caption" style={[styles.statsCardSub, { color: isDark ? theme.textSecondary : '#6B7B3A' }]}>
              verses
            </ThemedText>
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
  briefingSection: {
    marginBottom: 16,
    marginTop: 4,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
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
