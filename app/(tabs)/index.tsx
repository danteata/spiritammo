import React, { useState, useEffect, useRef } from 'react'
import { StyleSheet, Text, ScrollView, View, TouchableOpacity } from 'react-native'
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

export default function HomeScreen() {
  const { isLoading, theme, isDark } = useAppStore()
  const router = useRouter()
  const [showWelcome, setShowWelcome] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)
  const collectionDrillsRef = useRef(null)
  const { trackEvent } = useAnalytics()

  // Track screen view
  useScreenTracking('command_center')

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
      id: 'choose-mission',
      title: 'Choose Your First Mission',
      description: 'Start with Collection Drills to learn the basics of scripture memorization.',
      targetRef: collectionDrillsRef,
      position: 'bottom',
      highlightPadding: 8,
      actionText: 'Tap the blue COLLECTION DRILLS card to continue',
      canSkip: true,
    },
  ]

  const checkFirstLaunch = async () => {
    try {
      const hasSeenWelcome = await AsyncStorage.getItem('hasSeenWelcome')
      if (!hasSeenWelcome) {
        setShowWelcome(true) // Always show for review
      }
    } catch (error) {
      console.error('Failed to check welcome status:', error)
    }
  }

  return (
    <ThemedContainer style={styles.container}>
      {/* Command Center Header */}
      <ScreenHeader
        title="COMMAND CENTER"
        subtitle="COORDINATE YOUR MISSION"
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Operations - Mission Flows */}
        <View style={styles.operationsSection}>
          <ThemedText variant="caption" style={styles.sectionSubtitle}>
            Select your mission type and lead your troops to victory
          </ThemedText>

          {/* Primary Mission Cards */}
          <TouchableOpacity
            style={styles.missionCardWrapper}
            onPress={() => {
              analytics.trackInteraction('tap', 'mission_card', { mission_type: 'conquest_mode' })
              router.push({ pathname: '/(tabs)/campaign', params: { mode: 'campaign' } })
            }}
            activeOpacity={0.9}
          >
            <ThemedCard variant="glass" style={[styles.missionCard, styles.primaryMissionCard]}>
              <View style={styles.missionCardLeft}>
                <View style={[
                  styles.iconBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,215,0,0.15)'
                      : 'rgba(255,215,0,0.1)',
                    borderColor: '#FFD700'
                  }
                ]}>
                  <Ionicons name="trophy" size={28} color="#c4a912ff" />
                </View>
                <View style={styles.missionCardContent}>
                  <ThemedText variant="heading" style={styles.missionCardTitle}>CONQUEST MODE</ThemedText>
                  <ThemedText variant="body" numberOfLines={2} style={styles.missionCardSubtitle}>
                    Embark on epic scripture challenges. Complete missions to unlock rewards and advance your spiritual journey.
                  </ThemedText>
                </View>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color={theme.textSecondary} style={{ opacity: 0.5 }} />
            </ThemedCard>
          </TouchableOpacity>

          <TouchableOpacity
            ref={collectionDrillsRef}
            style={styles.missionCardWrapper}
            onPress={() => {
              analytics.trackInteraction('tap', 'mission_card', { mission_type: 'collection_drills' })
              router.push({ pathname: '/(tabs)/campaign', params: { mode: 'collection' } })
            }}
            activeOpacity={0.9}
          >
            <ThemedCard variant="glass" style={[styles.missionCard, styles.primaryMissionCard]}>
              <View style={styles.missionCardLeft}>
                <View style={[
                  styles.iconBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(59, 130, 246, 0.15)'
                      : 'rgba(59, 130, 246, 0.1)',
                    borderColor: '#545c69ff'
                  }
                ]}>
                  <Ionicons name="book" size={28} color="#4f555eff" />
                </View>
                <View style={styles.missionCardContent}>
                  <ThemedText variant="heading" style={styles.missionCardTitle}>COLLECTION DRILLS</ThemedText>
                  <ThemedText variant="body" numberOfLines={2} style={styles.missionCardSubtitle}>
                    Master specific verses from your personal collections. Perfect for focused memorization and review sessions.
                  </ThemedText>
                </View>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color={theme.textSecondary} style={{ opacity: 0.5 }} />
            </ThemedCard>
          </TouchableOpacity>

        </View>

        {/* Quick Actions - Import & Squad */}
        <View style={styles.quickActionsSection}>
          <TouchableOpacity
            style={[styles.quickActionButton, isDark ? styles.quickActionDark : styles.quickActionLight]}
            onPress={() => {
              analytics.trackInteraction('tap', 'quick_action', { action: 'import_intel' })
              router.push({ pathname: '/(tabs)/arsenal', params: { action: 'import' } })
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(255, 107, 53, 0.15)', borderColor: '#FF6B35' }]}>
              <FontAwesome name="cloud-upload" size={20} color="#FF6B35" />
            </View>
            <View>
              <ThemedText variant="body" style={styles.quickActionTitle}>IMPORT INTEL</ThemedText>
              <ThemedText variant="caption" style={styles.quickActionSubtitle}>Extract verses from PDF/EPUB</ThemedText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionButton, isDark ? styles.quickActionDark : styles.quickActionLight]}
            onPress={() => router.replace('/(tabs)/squad')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(255, 215, 0, 0.15)', borderColor: '#FFD700' }]}>
              <FontAwesome5 name="users" size={20} color="#FFD700" />
            </View>
            <View>
              <ThemedText variant="body" style={styles.quickActionTitle}>SQUAD OPS</ThemedText>
              <ThemedText variant="caption" style={styles.quickActionSubtitle}>Team Challenges (Soon)</ThemedText>
            </View>
          </TouchableOpacity>
        </View>

        {/* Secondary Mission Card - Arsenal */}
        <TouchableOpacity
          style={styles.missionCardWrapper}
          onPress={() => router.replace('/(tabs)/arsenal')}
          activeOpacity={0.9}
        >
          <ThemedCard variant="glass" style={styles.missionCard}>
            <View style={styles.missionCardLeft}>
              <View style={[
                styles.iconBox,
                {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(0,0,0,0.05)'
                }
              ]}>
                <FontAwesome name="cubes" size={28} color={theme.accent} />
              </View>
              <View style={styles.missionCardContent}>
                <ThemedText variant="heading" style={styles.missionCardTitle}>EQUIP ARSENAL</ThemedText>
                <ThemedText variant="body" numberOfLines={2} style={styles.missionCardSubtitle}>
                  Customize your soldier avatar with gear earned from missions. Manage your scripture arsenal and unlock powerful items.
                </ThemedText>
              </View>
            </View>
            <FontAwesome5 name="chevron-right" size={14} color={theme.textSecondary} style={{ opacity: 0.5 }} />
          </ThemedCard>
        </TouchableOpacity>

        {/* Daily Goals & Progress - Subordinate Information */}
        <View style={styles.statusSection}>
          <View style={styles.miniAvatarContainer}>
            <SoldierAvatar size="small" showStats={true} />
          </View>

          <StreakChallenge compact={true} />
        </View>
      </ScrollView>

      {/* Welcome Modal */}
      <WelcomeModal
        isVisible={showWelcome}
        onClose={() => {
          setShowWelcome(false)
          // Start tutorial after welcome modal closes
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
    paddingBottom: 120,
    paddingHorizontal: 20,
  },
  sectionSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.7,
    letterSpacing: 0.5,
  },

  // Major Operations Section
  operationsSection: {
    marginTop: 16,
  },

  // Mission Section - Primary Focus
  missionSection: {
    marginTop: 20,
  },
  missionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  missionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 20,
    minHeight: 80,
  },
  primaryMissionCard: {
    // Additional styles for primary mission cards that use ThemedCard
  },
  conquestCard: {
    backgroundColor: '#1a4f82',
  },
  challengeCard: {
    backgroundColor: '#2a69ac',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  missionCardWrapper: {
    marginBottom: 12,
  },

  secondaryMissionCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'transparent',
  },
  missionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  missionCardContent: {
    flex: 1,
  },
  missionCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  missionCardSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },

  // Status Section - Progress & Quick Actions
  statusSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  miniAvatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Legacy styles (keep for compatibility)
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: '80%',
  },
  tacticalActions: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  tacticalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 8,
    minWidth: 80,
  },
  tacticalButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  loadingIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionsSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  quickActionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'column',
    gap: 12,
  },
  quickActionDark: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quickActionLight: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderColor: 'rgba(0,0,0,0.05)',
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  quickActionSubtitle: {
    fontSize: 11,
    opacity: 0.7,
  },
})
