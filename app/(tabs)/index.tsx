import React, { useState, useEffect, useRef, useMemo } from 'react'
import { StyleSheet, Text, ScrollView, View, TouchableOpacity, Animated } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome5, Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useAppStore } from '@/hooks/useAppStore'
import useZustandStore from '@/hooks/zustandStore'
import { ThemedContainer, ThemedText } from '@/components/Themed'
import ScreenHeader from '@/components/ScreenHeader'
import { SkeletonHomeScreen } from '@/components/ui/Skeleton'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import SoldierAvatar from '@/components/SoldierAvatar'
import WelcomeModal from '@/components/WelcomeModal'
import { AnalyticsEventType } from '@/services/analytics'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'
import { streakManager, DailyChallenge } from '@/services/streakManager'
import { SRSDailySummary } from '@/types/srs'
import { getSRSPriorityDescription } from '@/services/srsScheduler'
import { RANK_COLORS } from '@/constants/colors'

const RANK_DISPLAY: Record<string, string> = {
  recruit: 'RCT',
  private: 'PVT',
  corporal: 'CPL',
  sergeant: 'SGT',
  lieutenant: 'LT',
  captain: 'CPT',
  major: 'MAJ',
  colonel: 'COL',
  general: 'GEN',
}

const getTimeBasedGreeting = (): { greeting: string; subtext: string } => {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) {
    return { greeting: 'Good morning, Soldier!', subtext: 'Ready for today\'s drill?' }
  } else if (hour >= 12 && hour < 17) {
    return { greeting: 'Good afternoon, Soldier!', subtext: 'Stay sharp with daily drills.' }
  } else if (hour >= 17 && hour < 21) {
    return { greeting: 'Evening drill!', subtext: 'Keep your streak alive.' }
  } else {
    return { greeting: 'Night ops!', subtext: 'Final practice before rest.' }
  }
}

interface TypewriterTextProps {
  text: string
  style?: any
  delay?: number
  isDark: boolean
  theme: any
}

const TypewriterText: React.FC<TypewriterTextProps> = ({ text, style, delay = 0, theme }: TypewriterTextProps) => {
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

  const handleTapReveal = () => {
    if (!isComplete) {
      setDisplayedText(text)
      setIsComplete(true)
    }
  }

  return (
    <Text style={[style, { fontFamily: 'monospace', color: theme.textSecondary }]} onPress={handleTapReveal}>
      {displayedText}
      {(!isComplete || showCursor) && <Text style={{ opacity: showCursor ? 1 : 0 }}>█</Text>}
    </Text>
  )
}

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

const STAT_ITEMS = [
  { key: 'streak', icon: 'fire', label: 'STREAK', format: (v: number) => `${v}d` },
  { key: 'verses', icon: 'book', label: 'VERSES', format: (v: number) => `${v}` },
  { key: 'valor', icon: 'star', label: 'VALOR', format: (v: number) => `${v}` },
  { key: 'sessions', icon: 'bullseye', label: 'MISSIONS', format: (v: number) => `${v}` },
] as const

const QUICK_START_ITEMS = [
  { key: 'drill', icon: 'shuffle', label: 'Drill', subtitle: 'Random verse', color: 'accent' as const, mode: 'single' as const },
  { key: 'autopilot', icon: 'infinite', label: 'Auto Pilot', subtitle: 'Hands-free', color: 'warning' as const, mode: 'automatic' as const },
  { key: 'battle', icon: 'crosshairs', label: 'Battle', subtitle: 'Challenge', color: 'error' as const, mode: 'single' as const, iconSet: 'fontawesome' as const },
] as const

export default function HomeScreen() {
  const { isLoading, theme, isDark, userStats, scriptures, collections, userSettings, startTraining } = useAppStore()
  const srsDailySummary = useZustandStore((s) => s.srsDailySummary)
  const router = useRouter()
  const [showWelcome, setShowWelcome] = useState(false)
  const [dailyCompleted, setDailyCompleted] = useState(false)
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null)
  const { trackEvent } = useAnalytics()

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current
  const scaleAnim = useRef(new Animated.Value(0.95)).current

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
    trackEvent(AnalyticsEventType.PRACTICE_START, { source: 'home_cta' })
    if (verseCount === 0) {
      router.push('/(tabs)/arsenal')
    } else {
      startTraining('single')
      router.push('/(tabs)/train')
    }
  }

  const handleQuickStart = (mode: 'single' | 'automatic') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { })
    trackEvent(AnalyticsEventType.PRACTICE_START, { source: `home_quick_${mode}` })
    if (mode === 'single' && verseCount === 0) {
      router.push('/(tabs)/arsenal')
    } else {
      startTraining(mode)
      router.push('/(tabs)/train')
    }
  }

  const handleBattle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { })
    router.push('/(tabs)/battle')
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
  const totalSessions = userStats?.totalPracticed || 0
  const collectionCount = collections?.length || 0
  const userRank = userStats?.rank || 'recruit'
  const rankDisplay = RANK_DISPLAY[userRank] || 'RCT'
  const rankColor = RANK_COLORS[userRank]

  const statValues = useMemo(() => ({
    streak,
    verses: verseCount,
    valor: valorPoints,
    sessions: totalSessions,
  }), [streak, verseCount, valorPoints, totalSessions])

  const ctaState = useMemo(() => {
    const timeGreeting = getTimeBasedGreeting()

    if (verseCount === 0) {
      return {
        title: 'ADD YOUR FIRST VERSE',
        subtitle: 'Head to your Arsenal to begin training.',
        icon: 'plus-circle' as const,
        color: theme.accent,
        gradient: [theme.accent, `${theme.accent}CC`] as [string, string],
        greeting: 'Welcome, Recruit!',
        subtext: 'Your training begins now.'
      }
    } else if (dailyCompleted) {
      return {
        title: 'EXTRA PRACTICE',
        subtitle: 'Daily mission complete! Keep sharp.',
        icon: 'trophy' as const,
        color: theme.success,
        gradient: [theme.success, `${theme.success}CC`] as [string, string],
        greeting: 'Mission Complete!',
        subtext: 'Return tomorrow for your next mission.'
      }
    } else if (streak > 0) {
      return {
        title: 'CONTINUE STREAK',
        subtitle: `${streak} day streak! Don't break the chain.`,
        icon: 'fire' as const,
        color: theme.warning,
        gradient: [theme.warning, `${theme.warning}CC`] as [string, string],
        greeting: timeGreeting.greeting,
        subtext: timeGreeting.subtext
      }
    } else {
      return {
        title: 'START DAILY DRILL',
        subtitle: 'Practice your verses and build your streak.',
        icon: 'bolt' as const,
        color: theme.accent,
        gradient: [theme.accent, `${theme.accent}CC`] as [string, string],
        greeting: timeGreeting.greeting,
        subtext: timeGreeting.subtext
      }
    }
  }, [verseCount, streak, dailyCompleted, theme])

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
            {/* Hero Header */}
            <Animated.View style={[styles.headerSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.headerTitleContainer}>
                <ThemedText variant="heading" style={styles.headerTitle}>
                  {userSettings?.soldierName || 'Soldier'}
                </ThemedText>
                <View style={[styles.headerUnderline, { backgroundColor: theme.accent }]} />
                <ThemedText variant="caption" style={[styles.headerSubtext, { color: theme.textSecondary }]}>
                  {ctaState.greeting}
                </ThemedText>
              </View>

              <TouchableOpacity
                onPress={() => router.push('/(tabs)/profile')}
                activeOpacity={0.8}
                style={styles.avatarWrapper}
              >
                <View style={[styles.avatarFrame, { borderColor: theme.accent }]}>
                  <SoldierAvatar size="small" showStats={false} style={styles.avatar} />
                </View>
                <View style={[styles.rankPlate, { backgroundColor: rankColor, borderColor: theme.border }]}>
                  <Text style={[styles.rankPlateText, { color: theme.accentContrastText }]}>{rankDisplay}</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* Stats Bar */}
            <Animated.View style={[styles.statsBar, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              {STAT_ITEMS.map((stat, index) => (
                <View
                  key={stat.key}
                  style={[
                    styles.statPill,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      borderRightWidth: index < STAT_ITEMS.length - 1 ? 1 : 0,
                      borderRightColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    }
                  ]}
                >
                  <FontAwesome5
                    name={stat.icon}
                    size={11}
                    color={stat.key === 'streak' && streak > 0 ? theme.warning : stat.key === 'valor' ? theme.accent : theme.textSecondary}
                    solid
                  />
                  <Text style={[styles.statValue, { color: theme.text, fontVariant: ['tabular-nums'] as any }]}>
                    {stat.format(statValues[stat.key])}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                    {stat.label}
                  </Text>
                </View>
              ))}
            </Animated.View>

            {/* Primary CTA - Full-width gradient button */}
            <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
              <PulsingGlow color={ctaState.color} style={styles.ctaWrapper}>
                <TouchableOpacity onPress={handleStartDrill} activeOpacity={0.85}>
                  <LinearGradient
                    colors={[ctaState.gradient[0], ctaState.gradient[1]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.ctaGradient}
                  >
                    <View style={styles.ctaContent}>
                      <View style={styles.ctaLeft}>
                        <View style={styles.ctaIconCircle}>
                          <FontAwesome5 name={ctaState.icon} size={24} color="#FFF" solid />
                        </View>
                        <View style={styles.ctaTextBox}>
                          <Text style={styles.ctaTitle}>{ctaState.title}</Text>
                          <Text style={styles.ctaSubtitle}>{ctaState.subtitle}</Text>
                        </View>
                      </View>
                      <View style={styles.ctaChevron}>
                        <FontAwesome5 name="chevron-right" size={16} color="rgba(255,255,255,0.8)" />
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </PulsingGlow>
            </Animated.View>

            {/* Tactical Briefing Card */}
            <Animated.View style={[styles.briefingDeck, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={[
                styles.briefingCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  borderLeftColor: theme.accent,
                }
              ]}>
                <View style={styles.transmissionHeader}>
                  <View style={styles.transmissionIconBox}>
                    <View style={[styles.pingDot, { backgroundColor: theme.accent }]} />
                    <FontAwesome5 name="satellite-dish" size={10} color={theme.accent} />
                  </View>
                  <ThemedText variant="caption" style={[styles.transmissionLabel, { color: theme.accent }]}>
                    INCOMING TRANSMISSION // {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </ThemedText>
                  {!isDark && (
                    <View style={[styles.classificationStamp, { borderColor: `${theme.accent}60`, backgroundColor: `${theme.accent}10` }]}>
                      <Text style={[styles.classificationText, { color: theme.accent }]}>CLASSIFIED</Text>
                    </View>
                  )}
                </View>
                <View style={styles.briefingTextContainer}>
                  <TypewriterText
                    text={`> ${ctaState.greeting}\n> ${ctaState.subtext}`}
                    style={styles.briefingText}
                    delay={300}
                    isDark={isDark}
                    theme={theme}
                  />
                </View>

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

            {/* Daily Mission Card (SRS) */}
            {verseCount > 0 && srsDailySummary.dueCount > 0 && (
              <Animated.View style={[styles.sectionWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <View style={[
                  styles.briefingCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    borderLeftColor: srsDailySummary.overdueCount > 0 ? theme.warning : theme.success,
                  }
                ]}>
                  <View style={styles.transmissionHeader}>
                    <View style={styles.transmissionIconBox}>
                      <FontAwesome5 name="crosshairs" size={10} color={srsDailySummary.overdueCount > 0 ? theme.warning : theme.success} />
                    </View>
                    <ThemedText variant="caption" style={[styles.transmissionLabel, { color: srsDailySummary.overdueCount > 0 ? theme.warning : theme.success }]}>
                      {srsDailySummary.overdueCount > 0 ? 'OVERDUE MISSIONS' : 'DAILY MISSIONS'}
                    </ThemedText>
                  </View>
                  <ThemedText variant="body" style={styles.briefingText}>
                    {getSRSPriorityDescription(srsDailySummary.overdueCount, srsDailySummary.dueCount)}
                  </ThemedText>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
                      startTraining('single' as any)
                      router.push('/(tabs)/train')
                    }}
                    style={[styles.missionDeployButton, { backgroundColor: `${srsDailySummary.overdueCount > 0 ? theme.warning : theme.success}20`, borderColor: `${srsDailySummary.overdueCount > 0 ? theme.warning : theme.success}40` }]}
                    activeOpacity={0.8}
                  >
                    <FontAwesome5 name="play" size={14} color={srsDailySummary.overdueCount > 0 ? theme.warning : theme.success} />
                    <ThemedText variant="caption" style={{ color: srsDailySummary.overdueCount > 0 ? theme.warning : theme.success, fontWeight: '800', letterSpacing: 1, marginLeft: 8 }}>
                      DEPLOY ({srsDailySummary.dueCount} {srsDailySummary.dueCount === 1 ? 'VERSE' : 'VERSES'})
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {/* Quick Start Section */}
            {verseCount > 0 && (
              <Animated.View style={[styles.sectionWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <View style={styles.sectionHeader}>
                  <ThemedText variant="subheading" style={styles.sectionTitle}>QUICK START</ThemedText>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/train')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <ThemedText variant="caption" style={[styles.seeAllText, { color: theme.accent }]}>
                      VIEW ALL
                    </ThemedText>
                  </TouchableOpacity>
                </View>
                <View style={styles.quickStartRow}>
                  {QUICK_START_ITEMS.map((item) => {
                    const itemColor = item.color === 'accent' ? theme.accent
                      : item.color === 'warning' ? theme.warning
                      : theme.error
                    const handlePress = item.key === 'battle' ? handleBattle : () => handleQuickStart(item.mode)

                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[styles.quickCard, { backgroundColor: theme.surface, borderColor: isDark ? `${itemColor}30` : theme.border }]}
                        onPress={handlePress}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.quickCardIconBg, { backgroundColor: `${itemColor}18` }]}>
                          {'iconSet' in item && item.iconSet === 'fontawesome' ? (
                            <FontAwesome5 name={item.icon as any} size={20} color={itemColor} />
                          ) : (
                            <Ionicons name={item.icon as any} size={22} color={itemColor} />
                          )}
                        </View>
                        <Text style={[styles.quickCardLabel, { color: theme.text }]}>{item.label}</Text>
                        <Text style={[styles.quickCardSubtitle, { color: theme.textSecondary }]}>{item.subtitle}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </Animated.View>
            )}

            {/* Collections Preview */}
            {collectionCount > 0 && (
              <Animated.View style={[styles.sectionWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <TouchableOpacity
                  style={[styles.collectionsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => router.push('/(tabs)/arsenal')}
                  activeOpacity={0.7}
                >
                  <View style={styles.collectionsContent}>
                    <View style={[styles.collectionsIconBg, { backgroundColor: `${theme.accent}15` }]}>
                      <FontAwesome5 name="folder" size={18} color={theme.accent} solid />
                    </View>
                    <View style={styles.collectionsText}>
                      <Text style={[styles.collectionsTitle, { color: theme.text }]}>Your Collections</Text>
                      <Text style={[styles.collectionsSubtitle, { color: theme.textSecondary }]}>
                        {collectionCount} {collectionCount === 1 ? 'collection' : 'collections'} · {verseCount} {verseCount === 1 ? 'verse' : 'verses'}
                      </Text>
                    </View>
                  </View>
                  <FontAwesome5 name="chevron-right" size={14} color={theme.textSecondary} />
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Arsenal CTA for new users */}
            {verseCount === 0 && (
              <Animated.View style={[styles.sectionWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <TouchableOpacity
                  style={[styles.arsenalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => router.push('/(tabs)/arsenal')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.arsenalIconBg, { backgroundColor: `${theme.accent}18` }]}>
                    <FontAwesome5 name="shield-alt" size={28} color={theme.accent} />
                  </View>
                  <Text style={[styles.arsenalTitle, { color: theme.text }]}>Open Your Arsenal</Text>
                  <Text style={[styles.arsenalSubtitle, { color: theme.textSecondary }]}>
                    Add verses to begin your training. Build your spiritual arsenal one verse at a time.
                  </Text>
                  <View style={[styles.arsenalButton, { backgroundColor: `${theme.accent}20` }]}>
                    <FontAwesome5 name="plus" size={12} color={theme.accent} />
                    <Text style={[styles.arsenalButtonText, { color: theme.accent }]}>ADD VERSES</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>

      <WelcomeModal isVisible={showWelcome} onClose={(completedOnboarding) => {
        setShowWelcome(false)
        if (completedOnboarding && verseCount > 0) {
          setTimeout(() => {
            startTraining('single')
            router.push('/(tabs)/train')
          }, 300)
        }
      }} />
      <LoadingOverlay visible={isLoading} message="Mobilizing forces..." showTips />
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
    marginTop: 12,
    marginBottom: 20,
  },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontSize: 26, fontWeight: '900', letterSpacing: 1 },
  headerUnderline: { height: 3, width: 32, marginTop: 4, borderRadius: 2, marginBottom: 6 },
  headerSubtext: { fontSize: 13, fontWeight: '500', letterSpacing: 0.3, marginTop: 2 },
  avatarWrapper: { position: 'relative' },
  avatarFrame: { padding: 3, borderRadius: 30, borderWidth: 1.5, borderStyle: 'dashed' },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  rankPlate: { position: 'absolute', bottom: -4, right: -4, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  rankPlateText: { fontSize: 8, fontWeight: '900' },

  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  statValue: { fontSize: 17, fontWeight: '900', letterSpacing: -0.3 },
  statLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },

  // Primary CTA
  ctaWrapper: { marginBottom: 24, borderRadius: 18 },
  ctaGradient: {
    borderRadius: 18,
    paddingVertical: 0,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  ctaLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  ctaIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTextBox: { marginLeft: 16, flex: 1 },
  ctaTitle: { color: '#FFF', fontSize: 17, fontWeight: '900', letterSpacing: 1, marginBottom: 2 },
  ctaSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '500', lineHeight: 17 },
  ctaChevron: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Briefing Card
  briefingDeck: { marginBottom: 16 },
  briefingCard: {
    padding: 22,
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
  briefingTextContainer: { minHeight: 45, marginBottom: 20 },
  briefingText: { fontSize: 14, lineHeight: 22, fontWeight: '500' },
  goalSection: { marginBottom: 4 },
  goalInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  goalTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1, opacity: 0.6 },
  goalProgress: { fontSize: 11, fontWeight: '900' },
  goalProgressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  goalProgressBar: { height: '100%', borderRadius: 3 },
  missionDeployButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1.5, marginTop: 16 },

  // Section wrappers
  sectionWrap: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingHorizontal: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  seeAllText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },

  // Quick Start
  quickStartRow: { flexDirection: 'row', gap: 10 },
  quickCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  quickCardIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  quickCardLabel: { fontWeight: '800', fontSize: 13, letterSpacing: 0.3 },
  quickCardSubtitle: { fontSize: 10, fontWeight: '500', opacity: 0.7 },

  // Collections
  collectionsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
  },
  collectionsContent: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  collectionsIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectionsText: { flex: 1 },
  collectionsTitle: { fontSize: 15, fontWeight: '800', letterSpacing: 0.3, marginBottom: 1 },
  collectionsSubtitle: { fontSize: 12, fontWeight: '500', opacity: 0.65 },

  // Arsenal CTA for new users
  arsenalCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
  },
  arsenalIconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arsenalTitle: { fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
  arsenalSubtitle: { fontSize: 13, fontWeight: '500', textAlign: 'center', lineHeight: 19, opacity: 0.7 },
  arsenalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    marginTop: 4,
  },
  arsenalButtonText: { fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
})