import React, { useState, useEffect, useRef } from 'react'
import { StyleSheet, Text, ScrollView, View, TouchableOpacity, Dimensions } from 'react-native'
import { FontAwesome5, FontAwesome, Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
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

export default function HomeScreen() {
  const { isLoading, theme, isDark, userStats, scriptures, collections } = useAppStore()
  const router = useRouter()
  const [showWelcome, setShowWelcome] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)
  const { trackEvent } = useAnalytics()

  // Track screen view
  useScreenTracking('home')

  useEffect(() => {
    checkFirstLaunch()
  }, [])

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
    trackEvent(AnalyticsEventType.PRACTICE_START, { source: 'home_quick_start' })
    router.push({ pathname: '/(tabs)/campaign', params: { mode: 'collection' } })
  }

  const verseCount = scriptures?.length || 0
  const collectionCount = collections?.length || 0

  return (
    <ThemedContainer style={styles.container}>
      <ScreenHeader
        title="COMMAND CENTER"
        subtitle="YOUR DAILY MISSION"
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Quick Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <Ionicons name="flame" size={20} color="#FF6B35" />
            <ThemedText variant="heading" style={styles.statNumber}>{userStats?.streak || 0}</ThemedText>
            <ThemedText variant="caption" style={styles.statLabel}>Streak</ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <FontAwesome5 name="book" size={20} color={theme.accent} />
            <ThemedText variant="heading" style={styles.statNumber}>{verseCount}</ThemedText>
            <ThemedText variant="caption" style={styles.statLabel}>Verses</ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <FontAwesome name="folder" size={20} color={theme.accent} />
            <ThemedText variant="heading" style={styles.statNumber}>{collectionCount}</ThemedText>
            <ThemedText variant="caption" style={styles.statLabel}>Collections</ThemedText>
          </View>
        </View>

        {/* Primary CTA - Start Daily Drill */}
        <TouchableOpacity
          style={styles.primaryCTA}
          onPress={handleStartDrill}
          activeOpacity={0.9}
        >
          <ThemedCard variant="glass" style={styles.primaryCTACard}>
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

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <SoldierAvatar size="medium" showStats={true} />
        </View>

        {/* Streak Challenge */}
        <View style={styles.streakSection}>
          <StreakChallenge compact={true} />
        </View>

        {/* Quick Links */}
        <View style={styles.quickLinksSection}>
          <ThemedText variant="caption" style={styles.sectionTitle}>
            QUICK ACCESS
          </ThemedText>

          <View style={styles.quickLinksRow}>
            <TouchableOpacity
              style={[styles.quickLinkCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
              onPress={() => router.replace('/(tabs)/arsenal' as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="book-outline" size={24} color={theme.accent} />
              <ThemedText variant="body" style={styles.quickLinkText}>Arsenal</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickLinkCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
              onPress={() => router.replace('/(tabs)/train' as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="fitness-outline" size={24} color={theme.accent} />
              <ThemedText variant="body" style={styles.quickLinkText}>Training</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickLinkCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
              onPress={() => router.replace('/(tabs)/profile' as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="person-outline" size={24} color={theme.accent} />
              <ThemedText variant="body" style={styles.quickLinkText}>Profile</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statNumber: {
    fontSize: 22,
    marginTop: 8,
  },
  statLabel: {
    marginTop: 4,
    opacity: 0.7,
  },
  primaryCTA: {
    marginBottom: 20,
  },
  primaryCTACard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  streakSection: {
    marginBottom: 20,
  },
  quickLinksSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 12,
    opacity: 0.7,
    letterSpacing: 1,
  },
  quickLinksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickLinkCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 12,
  },
  quickLinkText: {
    marginTop: 8,
    fontSize: 13,
  },
})
