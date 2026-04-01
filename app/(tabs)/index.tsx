import React, { useState, useEffect, useRef, useMemo } from 'react'
import { StyleSheet, Text, ScrollView, View, TouchableOpacity, Dimensions, Animated } from 'react-native'
import { FontAwesome5 } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedContainer, ThemedText } from '@/components/Themed'
import ScreenHeader from '@/components/ScreenHeader'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { SkeletonHomeScreen } from '@/components/ui/Skeleton'
import SoldierAvatar from '@/components/SoldierAvatar'
import WelcomeModal from '@/components/WelcomeModal'
import TutorialOverlay, { TutorialStep } from '@/components/TutorialOverlay'
import { AnalyticsEventType } from '@/services/analytics'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'
import { streakManager, DailyChallenge } from '@/services/streakManager'

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
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null)
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
    loadDailyChallenge()
  }, [])

  const loadDailyChallenge = async () => {
    try {
      const challenge = await streakManager.getDailyChallenge()
      setDailyChallenge(challenge)
    } catch (error) {
      console.error('Failed to load challenge:', error)
    }
  }

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

  const handleStartDrill = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { })
    trackEvent(AnalyticsEventType.PRACTICE_START, { source: 'home_quick_start' })
    router.push('/train')
  }

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

  const verseCount = scriptures?.length || 0
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
        color: theme.accent,
        greeting: timeGreeting.greeting,
        subtext: timeGreeting.subtext
      }
    }
  }, [verseCount, streak, dailyCompleted, isDark, theme])

  const tutorialSteps: TutorialStep[] = [
    {
      id: 'start-drill',
      title: 'Start Your First Drill',
      description: 'Tap the button below to begin practicing your first verse.',
      position: 'center',
      canSkip: true,
    },
  ]

  return (
    <ThemedContainer style={styles.container}>
      <ScreenHeader
        title="COMMAND CENTER"
        subtitle="YOUR DAILY MISSION"
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <SkeletonHomeScreen />
        ) : (
        <>
        {/* Header Section */}
        <Animated.View style={[styles.headerSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.headerTitleContainer}>
            <ThemedText variant="heading" style={styles.headerTitle}>COMMAND CENTER</ThemedText>
            <View style={[styles.headerUnderline, { backgroundColor: theme.accent }]} />
            <View style={styles.compactStats}>
              <View style={styles.compactStatItem}>
                <FontAwesome5 name="fire" size={10} color={theme.warning} />
                <Text style={[styles.compactStatValue, { color: theme.textSecondary }]}>{streak}</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.compactStatItem}>
                <FontAwesome5 name="coins" size={10} color={theme.accent} />
                <Text style={[styles.compactStatValue, { color: theme.textSecondary }]}>{valorPoints}</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.compactStatItem}>
                <FontAwesome5 name="cross" size={10} color={theme.success} />
                <Text style={[styles.compactStatValue, { color: theme.textSecondary }]}>{verseCount}</Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.8}>
            <View style={[styles.avatarFrame, { borderColor: theme.accent }]}>
              <SoldierAvatar size="small" showStats={false} style={styles.avatar} />
            </View>
            <View style={[styles.rankPlate, { backgroundColor: theme.warning, borderColor: theme.border }]}>
              <Text style={styles.rankPlateText}>E-5</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Tactical Briefing Deck */}
        <Animated.View style={[styles.briefingDeck, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={[
            styles.briefingCard,
            {
              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : theme.border,
              borderLeftColor: theme.accent,
            }
          ]}>
            <View style={styles.transmissionHeader}>
              <View style={styles.transmissionIconBox}>
                <View style={[styles.pingDot, { backgroundColor: theme.accent }]} />
                <FontAwesome5 name="satellite-dish" size={10} color={theme.accent} />
              </View>
              <ThemedText variant="caption" style={[styles.transmissionLabel, { color: theme.accent }]}>
                SECURE COMMS // {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </ThemedText>
              {!isDark && (
                <View style={[styles.classificationStamp, { borderColor: `${theme.error}60`, backgroundColor: `${theme.error}10` }]}>
                  <Text style={[styles.classificationText, { color: theme.error }]}>CLASSIFIED</Text>
                </View>
              )}
            </View>            <ThemedText variant="heading" style={styles.greetingTitle}>{ctaState.greeting}</ThemedText>
            
            <View style={styles.briefingTextContainer}>
              <TypewriterText
                text={`> ${ctaState.subtext}`}
                style={styles.briefingText}
                delay={300}
                isDark={isDark}
              />
            </View>

            {/* Daily Goal Integration */}
            {dailyChallenge && (
              <View style={styles.goalSection}>
                <View style={styles.goalInfo}>
                  <ThemedText variant="caption" style={styles.goalTitle}>{dailyChallenge.title.toUpperCase()}</ThemedText>
                  <ThemedText variant="caption" style={[styles.goalProgress, { color: dailyChallenge.completed ? theme.success : theme.accent }]}>
                    {dailyChallenge.currentValue} / {dailyChallenge.targetValue}
                  </ThemedText>
                </View>
                <View style={[styles.goalProgressBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                  <View 
                    style={[
                      styles.goalProgressBar, 
                      { 
                        backgroundColor: dailyChallenge.completed ? theme.success : theme.accent,
                        width: `${Math.min((dailyChallenge.currentValue / dailyChallenge.targetValue) * 100, 100)}%` 
                      }
                    ]} 
                  />
                </View>
              </View>
            )}
          </View>
        </Animated.View>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
          <PulsingGlow color={ctaState.color} style={styles.ctaWrapper}>
            <TouchableOpacity onPress={handleStartDrill} activeOpacity={0.9}>
              <View style={[
                styles.ctaContainer,
                {
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#FFFFFF',
                  borderColor: isDark ? `${ctaState.color}40` : theme.border,
                }
              ]}>
                <View style={styles.ctaInner}>
                  <View style={[styles.ctaIconBox, { backgroundColor: `${ctaState.color}15` }]}>
                    <FontAwesome5 name={ctaState.icon} size={22} color={ctaState.color} />
                  </View>
                  <View style={styles.ctaTextBox}>
                    <ThemedText variant="heading" style={[styles.ctaTitle, { color: ctaState.color }]}>
                      {ctaState.title}
                    </ThemedText>
                    <ThemedText variant="body" style={styles.ctaSubtitle}>
                      {ctaState.subtitle}
                    </ThemedText>
                  </View>
                  <View style={[styles.ctaArrow, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F5F0E1' }]}>
                    <FontAwesome5 name="chevron-right" size={12} color={isDark ? theme.textSecondary : theme.primary} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </PulsingGlow>
        </Animated.View>

        {/* Secondary Operations */}
        <View style={styles.operationsHeader}>
          <ThemedText variant="subheading" style={styles.operationsTitle}>RECENT OPERATIONS</ThemedText>
          <TouchableOpacity onPress={() => router.push('/(tabs)/train')}>
            <ThemedText variant="caption" style={{ color: theme.accent }}>VIEW ALL</ThemedText>
          </TouchableOpacity>
        </View>
        </>
        )}
      </ScrollView>

      <WelcomeModal isVisible={showWelcome} onClose={() => { setShowWelcome(false); setTimeout(() => setShowTutorial(true), 500); }} />
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
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: '900', letterSpacing: 1.5 },
  headerUnderline: { height: 3, width: 30, marginTop: 4, borderRadius: 2 },
  compactStats: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  compactStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  compactStatValue: { fontSize: 13, fontWeight: '800' },
  statDivider: { width: 1, height: 12, opacity: 0.3 },
  avatarFrame: { padding: 3, borderRadius: 30, borderWidth: 1.5, borderStyle: 'dashed' },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  rankPlate: { position: 'absolute', bottom: -4, right: -4, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  rankPlateText: { fontSize: 8, fontWeight: '900', color: '#000' },
  briefingDeck: { marginBottom: 24 },
  briefingCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  transmissionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, justifyContent: 'space-between' },
  transmissionIconBox: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  pingDot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, opacity: 0.4 },
  transmissionLabel: { letterSpacing: 1.5, fontWeight: '900', fontSize: 10, flex: 1, marginLeft: 8 },
  classificationStamp: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2, borderWidth: 1, transform: [{ rotate: '-12deg' }] },
  classificationText: { fontSize: 9, fontWeight: '900', letterSpacing: 2, fontFamily: 'monospace' },
  greetingTitle: { fontSize: 24, fontWeight: '900', marginBottom: 12, letterSpacing: -0.5 },
  briefingTextContainer: { minHeight: 45, marginBottom: 24 },
  briefingText: { fontSize: 14, lineHeight: 22, fontWeight: '500' },
  goalSection: { marginBottom: 24 },
  goalInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  goalTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1, opacity: 0.6 },
  goalProgress: { fontSize: 11, fontWeight: '900' },
  goalProgressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  goalProgressBar: { height: '100%', borderRadius: 3 },
  readoutFootnote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTopWidth: 1 },
  readoutBox: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  readoutIconFrame: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  readoutValue: { fontSize: 15, fontWeight: '900' },
  readoutLabel: { fontSize: 8, fontWeight: '800', opacity: 0.5, letterSpacing: 0.5 },
  readoutDivider: { width: 1, height: 24 },
  ctaWrapper: { marginBottom: 32, borderRadius: 16 },
  ctaContainer: { borderRadius: 16, padding: 18, borderWidth: 2 },
  ctaInner: { flexDirection: 'row', alignItems: 'center' },
  ctaIconBox: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ctaTextBox: { flex: 1, marginLeft: 16 },
  ctaTitle: { fontSize: 16, marginBottom: 3, fontWeight: '900', letterSpacing: 1 },
  ctaSubtitle: { fontSize: 12, opacity: 0.7, lineHeight: 18 },
  ctaArrow: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.05)' },
  operationsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  operationsTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
})
