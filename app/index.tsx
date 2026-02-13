import React, { useState, useEffect, useRef } from 'react'
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

  useEffect(() => {
    const startTimer = setTimeout(() => {
      setStarted(true)
    }, delay)
    return () => clearTimeout(startTimer)
  }, [delay])

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
      }
    }, 25)

    return () => clearInterval(interval)
  }, [started, text])

  return (
    <Text style={[style, { fontFamily: 'monospace', color: isDark ? '#94a3b8' : '#64748b' }]}>
      {displayedText}
      {started && displayedText.length < text.length && (
        <Text style={{ opacity: 0.5 }}>▌</Text>
      )}
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
  const { trackEvent } = useAnalytics()

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current
  const scaleAnim = useRef(new Animated.Value(0.95)).current

  // Track screen view
  useScreenTracking('home')

  useEffect(() => {
    checkFirstLaunch()
  }, [])

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

  return (
    <ThemedContainer style={styles.container}>
      <ScreenHeader
        title="COMMAND CENTER"
        subtitle="YOUR DAILY MISSION"
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Mission Briefing Section */}
        <Animated.View style={StyleSheet.flatten([styles.briefingSection, {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }])}>
          <View style={[styles.briefingCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
            <View style={styles.briefingHeader}>
              <FontAwesome5 name="satellite-dish" size={16} color="#FFD700" />
              <ThemedText variant="caption" style={styles.briefingLabel}>INCOMING TRANSMISSION</ThemedText>
            </View>
            <TypewriterText
              text="Soldier, your mission awaits. Engage in daily drills to maintain combat readiness."
              style={styles.briefingText}
              delay={500}
              isDark={isDark}
            />
          </View>
        </Animated.View>

        {/* Primary CTA - Start Daily Drill */}
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }}>
          <PulsingGlow color="#3B82F6" style={styles.primaryCTA}>
            <TouchableOpacity
              onPress={handleStartDrill}
              activeOpacity={0.9}
            >
              <ThemedCard variant="glass" style={[styles.primaryCTACard, { borderColor: isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.3)' }]}>
                <View style={styles.primaryCTAContent}>
                  <View style={[styles.primaryCTAIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                    <Ionicons name="flash" size={40} color="#3B82F6" />
                  </View>
                  <View style={styles.primaryCTAText}>
                    <ThemedText variant="heading" style={styles.primaryCTATitle}>START DAILY DRILL</ThemedText>
                    <ThemedText variant="body" style={styles.primaryCTASubtitle}>
                      Practice your verses and maintain your streak
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

        {/* Battle Ready CTA - Moved directly under Daily Drill */}
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
                <FontAwesome5 name="crosshairs" size={28} color="#EF4444" />
              </View>
              <View style={styles.battleContent}>
                <ThemedText variant="heading" style={styles.battleTitle}>ENTER BATTLE</ThemedText>
                <ThemedText variant="caption" style={styles.battleSubtitle}>
                  Test your mettle and earn Valor Points
                </ThemedText>
              </View>
              <FontAwesome5 name="chevron-right" size={16} color="#EF4444" />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Battle Stats Grid - Only Valor and Arsenal (streak shown in StreakChallenge) */}
        <Animated.View style={StyleSheet.flatten([styles.statsGrid, {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }])}>
          <View style={[styles.statsCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <View style={styles.statsCardHeader}>
              <FontAwesome5 name="coins" size={20} color="#FFD700" />
              <ThemedText variant="caption" style={styles.statsCardLabel}>VALOR</ThemedText>
            </View>
            <ThemedText variant="heading" style={styles.statsCardValue}>{valorPoints}</ThemedText>
            <ThemedText variant="caption" style={styles.statsCardSub}>points</ThemedText>
          </View>

          <View style={[styles.statsCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <View style={styles.statsCardHeader}>
              <FontAwesome5 name="book" size={20} color={theme.accent} />
              <ThemedText variant="caption" style={styles.statsCardLabel}>ARSENAL</ThemedText>
            </View>
            <ThemedText variant="heading" style={styles.statsCardValue}>{verseCount}</ThemedText>
            <ThemedText variant="caption" style={styles.statsCardSub}>verses</ThemedText>
          </View>
        </Animated.View>

        {/* Avatar Section - No streak display */}
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
    width: 72,
    height: 72,
    borderRadius: 20,
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
    fontSize: 14,
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
    gap: 12,
  },
  statsCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statsCardLabel: {
    fontSize: 10,
    letterSpacing: 1,
    opacity: 0.7,
  },
  statsCardValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  statsCardSub: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 2,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  battleSection: {
    marginBottom: 20,
  },
  battleCard: {
    borderRadius: 16,
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
