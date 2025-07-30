import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import {
  Target,
  Award,
  TrendingUp,
  Calendar,
  Star,
  Shield,
  Zap,
  Trophy,
} from 'lucide-react-native'
import {
  GRADIENTS,
  TACTICAL_THEME,
  MILITARY_TYPOGRAPHY,
} from '@/constants/colors'
import { useAppStore } from '@/hooks/useAppStore'
import RankBadge from '@/components/RankBadge'
import AccuracyMeter from '@/components/AccuracyMeter'
import { militaryRankingService } from '@/services/militaryRanking'

export default function MissionReportScreen() {
  const { isDark, userStats } = useAppStore()
  const [militaryProfile, setMilitaryProfile] = useState<any>(null)
  const [selectedTab, setSelectedTab] = useState<
    'overview' | 'achievements' | 'history'
  >('overview')

  useEffect(() => {
    loadMilitaryProfile()
  }, [])

  const loadMilitaryProfile = async () => {
    try {
      const profile = await militaryRankingService.getProfile()
      setMilitaryProfile(profile)
    } catch (error) {
      console.error('Failed to load military profile:', error)
    }
  }

  const backgroundColors = isDark
    ? GRADIENTS.tactical.background
    : GRADIENTS.primary.light

  const renderOverview = () => (
    <View style={styles.tabContent}>
      {/* Rank Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, MILITARY_TYPOGRAPHY.subheading]}>
          CURRENT RANK
        </Text>
        <View style={styles.rankContainer}>
          {militaryProfile && (
            <RankBadge
              rank={militaryProfile.currentRank}
              size="large"
              showLabel={true}
            />
          )}
        </View>
      </View>

      {/* Progress to Next Rank */}
      {militaryProfile && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, MILITARY_TYPOGRAPHY.subheading]}>
            PROMOTION PROGRESS
          </Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${militaryProfile.nextRankProgress}%` },
                ]}
              />
            </View>
            <Text style={[styles.progressText, MILITARY_TYPOGRAPHY.caption]}>
              {militaryProfile.nextRankProgress.toFixed(1)}% TO NEXT RANK
            </Text>
          </View>
        </View>
      )}

      {/* Combat Statistics */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, MILITARY_TYPOGRAPHY.subheading]}>
          COMBAT STATISTICS
        </Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Target size={24} color={TACTICAL_THEME.accent} />
            <Text style={[styles.statValue, MILITARY_TYPOGRAPHY.body]}>
              {userStats.totalPracticed}
            </Text>
            <Text style={[styles.statLabel, MILITARY_TYPOGRAPHY.caption]}>
              ROUNDS FIRED
            </Text>
          </View>

          <View style={styles.statCard}>
            <Award size={24} color={TACTICAL_THEME.success} />
            <Text style={[styles.statValue, MILITARY_TYPOGRAPHY.body]}>
              {userStats.averageAccuracy.toFixed(1)}%
            </Text>
            <Text style={[styles.statLabel, MILITARY_TYPOGRAPHY.caption]}>
              AVG ACCURACY
            </Text>
          </View>

          <View style={styles.statCard}>
            <TrendingUp size={24} color={TACTICAL_THEME.warning} />
            <Text style={[styles.statValue, MILITARY_TYPOGRAPHY.body]}>
              {userStats.streak}
            </Text>
            <Text style={[styles.statLabel, MILITARY_TYPOGRAPHY.caption]}>
              DAY STREAK
            </Text>
          </View>

          <View style={styles.statCard}>
            <Calendar size={24} color={TACTICAL_THEME.textSecondary} />
            <Text style={[styles.statValue, MILITARY_TYPOGRAPHY.body]}>
              {userStats.lastPracticeDate
                ? new Date(userStats.lastPracticeDate).toLocaleDateString()
                : 'Never'}
            </Text>
            <Text style={[styles.statLabel, MILITARY_TYPOGRAPHY.caption]}>
              LAST MISSION
            </Text>
          </View>
        </View>
      </View>

      {/* Accuracy Analysis */}
      <View style={styles.section}>
        <AccuracyMeter
          accuracy={userStats.averageAccuracy}
          label="OVERALL MARKSMANSHIP"
          size="large"
          animated={true}
        />
      </View>
    </View>
  )

  const renderAchievements = () => (
    <View style={styles.tabContent}>
      {/* Specializations */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, MILITARY_TYPOGRAPHY.subheading]}>
          SPECIALIZATIONS
        </Text>
        <View style={styles.achievementGrid}>
          {militaryProfile?.specializations?.map((spec: any) => (
            <View
              key={spec.id}
              style={[
                styles.achievementCard,
                spec.unlocked && styles.unlockedAchievement,
              ]}
            >
              <Text style={styles.achievementBadge}>{spec.badge}</Text>
              <Text
                style={[styles.achievementName, MILITARY_TYPOGRAPHY.caption]}
              >
                {spec.name}
              </Text>
              <Text
                style={[styles.achievementDesc, MILITARY_TYPOGRAPHY.caption]}
              >
                {spec.description}
              </Text>
              {spec.unlocked && (
                <View style={styles.unlockedIndicator}>
                  <Star size={16} color={TACTICAL_THEME.warning} />
                </View>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Commendations */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, MILITARY_TYPOGRAPHY.subheading]}>
          COMMENDATIONS
        </Text>
        <View style={styles.achievementGrid}>
          {militaryProfile?.commendations?.map((comm: any) => (
            <View
              key={comm.id}
              style={[
                styles.achievementCard,
                comm.unlocked && styles.unlockedAchievement,
              ]}
            >
              <Text style={styles.achievementBadge}>{comm.medal}</Text>
              <Text
                style={[styles.achievementName, MILITARY_TYPOGRAPHY.caption]}
              >
                {comm.name}
              </Text>
              <Text
                style={[styles.achievementDesc, MILITARY_TYPOGRAPHY.caption]}
              >
                {comm.description}
              </Text>
              {comm.unlocked && (
                <View style={styles.unlockedIndicator}>
                  <Trophy size={16} color={TACTICAL_THEME.success} />
                </View>
              )}
            </View>
          ))}
        </View>
      </View>
    </View>
  )

  const renderHistory = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, MILITARY_TYPOGRAPHY.subheading]}>
          MISSION HISTORY
        </Text>
        <Text style={[styles.comingSoon, MILITARY_TYPOGRAPHY.body]}>
          Detailed mission history coming soon...
        </Text>
      </View>
    </View>
  )

  return (
    <LinearGradient
      colors={backgroundColors}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <View style={styles.header}>
        <Text style={[styles.title, MILITARY_TYPOGRAPHY.heading]}>
          MISSION REPORT
        </Text>
        <Text style={[styles.subtitle, MILITARY_TYPOGRAPHY.caption]}>
          OPERATIONAL STATUS & ACHIEVEMENTS
        </Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        {[
          { key: 'overview', label: 'OVERVIEW', icon: Shield },
          { key: 'achievements', label: 'ACHIEVEMENTS', icon: Award },
          { key: 'history', label: 'HISTORY', icon: Calendar },
        ].map(({ key, label, icon: Icon }) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.tabButton,
              selectedTab === key && styles.activeTabButton,
            ]}
            onPress={() => setSelectedTab(key as any)}
          >
            <Icon
              size={20}
              color={
                selectedTab === key
                  ? TACTICAL_THEME.text
                  : TACTICAL_THEME.textSecondary
              }
            />
            <Text
              style={[
                styles.tabLabel,
                MILITARY_TYPOGRAPHY.caption,
                {
                  color:
                    selectedTab === key
                      ? TACTICAL_THEME.text
                      : TACTICAL_THEME.textSecondary,
                },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView}>
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'achievements' && renderAchievements()}
        {selectedTab === 'history' && renderHistory()}
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    color: TACTICAL_THEME.text,
    marginBottom: 8,
  },
  subtitle: {
    color: TACTICAL_THEME.textSecondary,
  },
  tabNavigation: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: TACTICAL_THEME.surface,
    gap: 8,
  },
  activeTabButton: {
    backgroundColor: TACTICAL_THEME.accent,
  },
  tabLabel: {
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  tabContent: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: TACTICAL_THEME.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  rankContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: TACTICAL_THEME.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: TACTICAL_THEME.accent,
    borderRadius: 4,
  },
  progressText: {
    color: TACTICAL_THEME.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: TACTICAL_THEME.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TACTICAL_THEME.border,
  },
  statValue: {
    color: TACTICAL_THEME.text,
    marginVertical: 8,
    fontWeight: 'bold',
  },
  statLabel: {
    color: TACTICAL_THEME.textSecondary,
    textAlign: 'center',
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  achievementCard: {
    width: '48%',
    backgroundColor: TACTICAL_THEME.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TACTICAL_THEME.border,
    opacity: 0.5,
    position: 'relative',
  },
  unlockedAchievement: {
    opacity: 1,
    borderColor: TACTICAL_THEME.accent,
  },
  achievementBadge: {
    fontSize: 32,
    marginBottom: 8,
  },
  achievementName: {
    color: TACTICAL_THEME.text,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  achievementDesc: {
    color: TACTICAL_THEME.textSecondary,
    textAlign: 'center',
    fontSize: 10,
  },
  unlockedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  comingSoon: {
    color: TACTICAL_THEME.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 40,
  },
})
