import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  MILITARY_TYPOGRAPHY,
} from '@/constants/colors'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'
import { useAppStore } from '@/hooks/useAppStore'
import RankBadge from '@/components/RankBadge'
import AccuracyMeter from '@/components/AccuracyMeter'
import { militaryRankingService } from '@/services/militaryRanking'
import { getDb } from '@/db/client'
import { practiceLogs as practiceLogsTable } from '@/db/schema'
import { desc } from 'drizzle-orm'
import ScreenHeader from '@/components/ScreenHeader'

const { width } = Dimensions.get('window')

export default function MissionReportScreen() {
  const { isDark, userStats, scriptures, theme } = useAppStore()
  const [militaryProfile, setMilitaryProfile] = useState<any>(null)
  const [selectedTab, setSelectedTab] = useState<
    'overview' | 'achievements' | 'history'
  >('overview')
  const [practiceLogs, setPracticeLogs] = useState<any[]>([])

  useEffect(() => {
    loadMilitaryProfile()
    loadPracticeLogs()
  }, [])

  const loadMilitaryProfile = async () => {
    try {
      const profile = await militaryRankingService.getProfile()
      setMilitaryProfile(profile)
    } catch (error) {
      console.error('Failed to load military profile:', error)
    }
  }

  const loadPracticeLogs = async () => {
    try {
      const db = await getDb()
      if (!db) return

      const logs = await db
        .select()
        .from(practiceLogsTable)
        .orderBy(desc(practiceLogsTable.date))
        .limit(50)

      setPracticeLogs(logs)
    } catch (error) {
      console.error('Failed to load practice logs:', error)
    }
  }

  const backgroundColors = isDark
    ? (['#0a1505', '#1a2f0a', '#0f1a05'] as const)
    : (['#4A6B2A', '#2D5016', '#1a2f0a'] as const)

  const cardBackground = isDark
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.03)'

  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  const styles = getStyles(theme, isDark)

  const sectionTextStyle = [MILITARY_TYPOGRAPHY.subheading, { color: theme.text }]

  const renderOverview = () => (
    <View style={styles.tabContent}>
      {/* Rank Section - Centered Layout */}
      <View style={styles.section}>
        <ThemedText variant="subheading" style={styles.sectionTitle}>
          CURRENT RANK
        </ThemedText>

        <View style={styles.rankContainer}>
          {/* <View style={styles.rankGlow} /> */}
          {militaryProfile && (
            <RankBadge
              rank={militaryProfile.currentRank}
              size="large"
              showLabel={true}
            />
          )}
        </View>

        {/* Promotion Progress */}
        {militaryProfile && (
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <ThemedText variant="caption" style={styles.progressLabel}>
                PROMOTION PROGRESS
              </ThemedText>
              <Text style={[styles.progressValue, { color: theme.accent }]}>
                {militaryProfile.nextRankProgress.toFixed(0)}%
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${militaryProfile.nextRankProgress}%` },
                ]}
              />
            </View>
            <ThemedText variant="caption" style={styles.nextRankText}>
              {militaryProfile.nextRank ? `Next Rank: ${militaryProfile.nextRank}` : 'Max Rank Achieved'}
            </ThemedText>
          </View>
        )}
      </View>

      {/* Combat Statistics - Darker & Centered */}
      <View style={styles.section}>
        <ThemedText variant="subheading" style={styles.sectionTitle}>
          COMBAT STATISTICS
        </ThemedText>
        <View style={styles.statsGrid}>
          {isDark ? (
            <View
              style={[
                styles.statCard,
                { backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }
              ]}
            >
              <MaterialCommunityIcons name="target" size={28} color={theme.accent} style={{ marginBottom: 8 }} />
              <ThemedText variant="heading" style={styles.statValue}>
                {userStats.totalPracticed}
              </ThemedText>
              <ThemedText variant="caption" style={styles.statLabel}>
                ROUNDS FIRED
              </ThemedText>
            </View>
          ) : (
            <ThemedCard style={styles.statCard} variant="default">
              <MaterialCommunityIcons name="target" size={28} color={theme.accent} style={{ marginBottom: 8 }} />
              <ThemedText variant="heading" style={styles.statValue}>
                {userStats.totalPracticed}
              </ThemedText>
              <ThemedText variant="caption" style={styles.statLabel}>
                ROUNDS FIRED
              </ThemedText>
            </ThemedCard>
          )}

          {isDark ? (
            <View
              style={[
                styles.statCard,
                { backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }
              ]}
            >
              <MaterialCommunityIcons name="crosshairs-gps" size={28} color={theme.success} style={{ marginBottom: 8 }} />
              <ThemedText variant="heading" style={styles.statValue}>
                {userStats.averageAccuracy.toFixed(1)}%
              </ThemedText>
              <ThemedText variant="caption" style={styles.statLabel}>
                AVG ACCURACY
              </ThemedText>
            </View>
          ) : (
            <ThemedCard style={styles.statCard} variant="default">
              <MaterialCommunityIcons name="crosshairs-gps" size={28} color={theme.success} style={{ marginBottom: 8 }} />
              <ThemedText variant="heading" style={styles.statValue}>
                {userStats.averageAccuracy.toFixed(1)}%
              </ThemedText>
              <ThemedText variant="caption" style={styles.statLabel}>
                AVG ACCURACY
              </ThemedText>
            </ThemedCard>
          )}

          {isDark ? (
            <View
              style={[
                styles.statCard,
                { backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }
              ]}
            >
              <MaterialCommunityIcons name="fire" size={28} color={theme.warning} style={{ marginBottom: 8 }} />
              <ThemedText variant="heading" style={styles.statValue}>
                {userStats.streak}
              </ThemedText>
              <ThemedText variant="caption" style={styles.statLabel}>
                DAY STREAK
              </ThemedText>
            </View>
          ) : (
            <ThemedCard style={styles.statCard} variant="default">
              <MaterialCommunityIcons name="fire" size={28} color={theme.warning} style={{ marginBottom: 8 }} />
              <ThemedText variant="heading" style={styles.statValue}>
                {userStats.streak}
              </ThemedText>
              <ThemedText variant="caption" style={styles.statLabel}>
                DAY STREAK
              </ThemedText>
            </ThemedCard>
          )}

          {isDark ? (
            <View
              style={[
                styles.statCard,
                { backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }
              ]}
            >
              <MaterialCommunityIcons name="calendar-clock" size={28} color={isDark ? "#aaa" : "#666"} style={{ marginBottom: 8 }} />
              <ThemedText variant="heading" style={[styles.statValue, { fontSize: 16 }]}>
                {userStats.lastPracticeDate
                  ? new Date(userStats.lastPracticeDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                  : 'N/A'}
              </ThemedText>
              <ThemedText variant="caption" style={styles.statLabel}>
                LAST MISSION
              </ThemedText>
            </View>
          ) : (
            <ThemedCard style={styles.statCard} variant="default">
              <MaterialCommunityIcons name="calendar-clock" size={28} color={isDark ? "#aaa" : "#666"} style={{ marginBottom: 8 }} />
              <ThemedText variant="heading" style={[styles.statValue, { fontSize: 16 }]}>
                {userStats.lastPracticeDate
                  ? new Date(userStats.lastPracticeDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                  : 'N/A'}
              </ThemedText>
              <ThemedText variant="caption" style={styles.statLabel}>
                LAST MISSION
              </ThemedText>
            </ThemedCard>
          )}
        </View>
      </View>

      {/* Accuracy Analysis */}
      <View style={[styles.section, { marginTop: 8 }]}>
        <ThemedText variant="subheading" style={styles.sectionTitle}>
          MARKSMANSHIP ANALYSIS
        </ThemedText>
        <View style={{ width: '100%', paddingVertical: 10 }}>
          <AccuracyMeter
            accuracy={userStats.averageAccuracy}
            label=""
            size="large"
            animated={true}
            transparent={true}
          />
        </View>
      </View>
    </View>
  )

  const renderAchievements = () => (
    <View style={styles.tabContent}>
      {/* Specializations */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, sectionTextStyle]}>
          SPECIALIZATIONS
        </Text>
        <View style={styles.achievementGrid}>
          {militaryProfile?.specializations?.map((spec: any) => {
            // Icon and Color Mapping for Specializations
            let iconName: any = 'target'
            let iconColor = '#32CD32' // Default Green
            let gradientColors = ['rgba(50, 205, 50, 0.15)', 'rgba(50, 205, 50, 0.05)']
            let borderColor = 'rgba(50, 205, 50, 0.3)'

            switch (spec.id) {
              case 'sharpshooter':
                iconName = 'crosshairs-gps'
                iconColor = '#FF4500' // Red Orange
                gradientColors = ['rgba(255, 69, 0, 0.2)', 'rgba(255, 69, 0, 0.05)']
                borderColor = 'rgba(255, 69, 0, 0.4)'
                break
              case 'rapid_fire':
                iconName = 'flash'
                iconColor = '#FFD700' // Gold
                gradientColors = ['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.05)']
                borderColor = 'rgba(255, 215, 0, 0.4)'
                break
              case 'sniper':
                iconName = 'telescope'
                iconColor = '#0A84FF' // Blue
                gradientColors = ['rgba(10, 132, 255, 0.2)', 'rgba(10, 132, 255, 0.05)']
                borderColor = 'rgba(10, 132, 255, 0.4)'
                break
              case 'drill_sergeant':
                iconName = 'account-voice'
                iconColor = '#8B4513' // Brown
                gradientColors = ['rgba(139, 69, 19, 0.2)', 'rgba(139, 69, 19, 0.05)']
                borderColor = 'rgba(139, 69, 19, 0.4)'
                break
              case 'chaplain':
                iconName = 'book-cross'
                iconColor = '#9932CC' // Purple
                gradientColors = ['rgba(153, 50, 204, 0.2)', 'rgba(153, 50, 204, 0.05)']
                borderColor = 'rgba(153, 50, 204, 0.4)'
                break
              case 'intelligence_officer':
                iconName = 'brain'
                iconColor = '#00CED1' // Dark Turquoise
                gradientColors = ['rgba(0, 206, 209, 0.2)', 'rgba(0, 206, 209, 0.05)']
                borderColor = 'rgba(0, 206, 209, 0.4)'
                break
            }

            // Locked State Overrides
            if (!spec.unlocked) {
              iconColor = isDark ? '#444' : '#AAA'
              gradientColors = isDark
                ? ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']
                : ['rgba(0, 0, 0, 0.05)', 'rgba(0, 0, 0, 0.02)']
              borderColor = 'rgba(128, 128, 128, 0.1)'
            }

            return (
              <LinearGradient
                key={spec.id}
                colors={gradientColors as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.achievementCard,
                  {
                    borderColor: borderColor,
                    borderWidth: 1,
                    opacity: spec.unlocked ? 1 : 0.8 // Increased opacity for locked state visibility
                  }
                ]}
              >
                <View style={[
                  styles.iconContainer,
                  !spec.unlocked && {
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    borderColor: 'rgba(128,128,128,0.1)'
                  }
                ]}>
                  <MaterialCommunityIcons
                    name={iconName}
                    size={32}
                    color={iconColor}
                    style={spec.unlocked && {
                      textShadowColor: iconColor,
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: 10
                    }}
                  />
                </View>

                <Text style={[
                  styles.achievementName,
                  {
                    color: theme.text,
                    marginTop: 8
                  }
                ]}>
                  {spec.name.toUpperCase()}
                </Text>

                <Text style={[
                  styles.achievementDesc,
                  { color: isDark ? '#888' : '#666' }
                ]}>
                  {spec.description}
                </Text>

                {spec.unlocked ? (
                  <View style={styles.unlockedIndicator}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.success} />
                  </View>
                ) : (
                  <View style={[styles.unlockedIndicator, { backgroundColor: 'transparent' }]}>
                    <MaterialCommunityIcons name="lock" size={14} color={theme.textSecondary} />
                  </View>
                )}
              </LinearGradient>
            )
          })}
        </View>
      </View>

      {/* Commendations */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, sectionTextStyle]}>
          COMMENDATIONS
        </Text>
        <View style={styles.achievementGrid}>
          {militaryProfile?.commendations?.map((comm: any) => {
            // Icon and Color Mapping
            let iconName: any = 'medal'
            let iconColor = '#FFD700' // Default Gold
            let gradientColors = ['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0.05)'] // Gold Gradient
            let borderColor = 'rgba(255, 215, 0, 0.3)'

            switch (comm.id) {
              case 'distinguished_service':
                iconName = 'medal'
                iconColor = '#FFD700' // Gold
                gradientColors = ['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.05)']
                borderColor = 'rgba(255, 215, 0, 0.4)'
                break
              case 'combat_excellence':
                iconName = 'ribbon' // Or rosette
                iconColor = '#FF4500' // Red/Orange
                gradientColors = ['rgba(255, 69, 0, 0.2)', 'rgba(255, 69, 0, 0.05)']
                borderColor = 'rgba(255, 69, 0, 0.4)'
                break
              case 'strategist':
                iconName = 'chess-knight'
                iconColor = '#0A84FF' // Blue
                gradientColors = ['rgba(10, 132, 255, 0.2)', 'rgba(10, 132, 255, 0.05)']
                borderColor = 'rgba(10, 132, 255, 0.4)'
                break
              case 'innovation':
                iconName = 'lightbulb-on'
                iconColor = '#FFFF00' // Bright Yellow
                gradientColors = ['rgba(255, 255, 0, 0.15)', 'rgba(255, 255, 0, 0.05)']
                borderColor = 'rgba(255, 255, 0, 0.4)'
                break
              case 'valor':
                iconName = 'trophy-award'
                iconColor = '#E5E4E2' // Platinum/Silver
                gradientColors = ['rgba(229, 228, 226, 0.25)', 'rgba(229, 228, 226, 0.1)']
                borderColor = 'rgba(229, 228, 226, 0.5)'
                break
            }

            // Locked State Overrides
            if (!comm.unlocked) {
              iconColor = isDark ? '#555' : '#999'
              gradientColors = isDark
                ? ['rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.01)']
                : ['rgba(0, 0, 0, 0.03)', 'rgba(0, 0, 0, 0.01)']
              borderColor = 'transparent'
            }

            return (
              <LinearGradient
                key={comm.id}
                colors={gradientColors as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.achievementCard,
                  {
                    borderColor: borderColor,
                    borderWidth: 1,
                    opacity: comm.unlocked ? 1 : 0.7
                  }
                ]}
              >
                <View style={[styles.iconContainer, !comm.unlocked && { opacity: 0.5 }]}>
                  <MaterialCommunityIcons
                    name={iconName}
                    size={32}
                    color={iconColor}
                    style={comm.unlocked && {
                      textShadowColor: iconColor,
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: 10
                    }}
                  />
                </View>

                <Text style={[
                  styles.achievementName,
                  {
                    color: comm.unlocked ? theme.text : theme.textSecondary,
                    marginTop: 8
                  }
                ]}>
                  {comm.name.toUpperCase()}
                </Text>

                <Text style={[
                  styles.achievementDesc,
                  { color: isDark ? '#888' : '#666' }
                ]}>
                  {comm.description}
                </Text>

                {comm.unlocked && (
                  <View style={styles.unlockedIndicator}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.success} />
                  </View>
                )}
              </LinearGradient>
            )
          })}
        </View>
      </View>
    </View>
  )

  const renderHistory = () => {
    const getScriptureById = (id: string) => {
      return scriptures.find(s => s.id === id)
    }

    const getAccuracyColor = (accuracy: number) => {
      if (accuracy >= 90) return theme.success
      if (accuracy >= 75) return theme.warning
      return theme.error
    }

    return (
      <View style={styles.tabContent}>
        <View style={[styles.card, { backgroundColor: cardBackground, borderColor, borderWidth: 1 }]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="history" size={18} color={theme.accent} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              MISSION LOGS
            </Text>
          </View>

          {practiceLogs.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="file-document-outline" size={48} color={isDark ? '#444' : '#ccc'} />
              <Text style={[styles.comingSoon, { color: isDark ? '#888' : '#666' }]}>
                No mission history recorded yet.
              </Text>
              <Text style={[styles.comingSoon, { color: isDark ? '#666' : '#999', fontSize: 12, marginTop: 4 }]}>
                Practice some verses to see your history here.
              </Text>
            </View>
          ) : (
            <View style={styles.logsList}>
              {practiceLogs.map((log, index) => {
                const scripture = getScriptureById(log.scriptureId)
                const date = new Date(log.date)
                const isToday = date.toDateString() === new Date().toDateString()

                return (
                  <View
                    key={log.id}
                    style={[
                      styles.logItem,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                        borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                      }
                    ]}
                  >
                    <View style={styles.logHeader}>
                      <View style={styles.logDateContainer}>
                        <MaterialCommunityIcons
                          name={isToday ? "clock-outline" : "calendar"}
                          size={14}
                          color={isDark ? '#888' : '#666'}
                        />
                        <Text style={[styles.logDate, { color: isDark ? '#888' : '#666' }]}>
                          {isToday
                            ? `Today ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
                            : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                          }
                        </Text>
                      </View>
                      <View style={[
                        styles.accuracyBadge,
                        { backgroundColor: getAccuracyColor(log.accuracy) }
                      ]}>
                        <Text style={styles.accuracyBadgeText}>
                          {log.accuracy.toFixed(0)}%
                        </Text>
                      </View>
                    </View>

                    {scripture && (
                      <View style={styles.logContent}>
                        <Text style={[styles.logReference, { color: theme.accent }]}>
                          {scripture.reference}
                        </Text>
                        <Text
                          style={[styles.logText, { color: theme.textSecondary }]}
                          numberOfLines={2}
                        >
                          {scripture.text}
                        </Text>
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
          )}
        </View>
      </View>
    )
  }

  return (
    <ThemedContainer style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 104 }}>
        <ScreenHeader
          title="MISSION REPORT"
          subtitle="PERFORMANCE ANALYSIS"
        />
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {([
            { key: 'overview', label: 'OVERVIEW' },
            { key: 'achievements', label: 'MEDALS' },
            { key: 'history', label: 'LOGS' },
          ] as const).map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.tabButton,
                selectedTab === key && [styles.activeTabButton, {
                  backgroundColor: theme.accent,
                  shadowColor: theme.accent
                }],
              ]}
              onPress={() => setSelectedTab(key as any)}
            >
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color:
                      selectedTab === key
                        ? theme.accentContrastText
                        : theme.textSecondary,
                  },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'achievements' && renderAchievements()}
        {selectedTab === 'history' && renderHistory()}
      </ScrollView>
    </ThemedContainer>
  )
}

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
  },
  activeTabButton: {
    backgroundColor: isDark ? theme.accent : 'rgba(0, 0, 0, 0.1)',
    borderColor: isDark ? theme.accent : 'rgba(0, 0, 0, 0.2)',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  rankContainer: {
    alignItems: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  rankGlow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 100,
    height: 100,
    marginLeft: -50,
    marginTop: -50,
    backgroundColor: theme.accent,
    opacity: 0.15,
    borderRadius: 50,
    zIndex: -1,
  },
  progressContainer: {
    marginTop: 16,
    paddingHorizontal: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  progressValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.accent,
    borderRadius: 3,
  },
  nextRankText: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: (width - 40 - 12) / 2, // (Screen width - padding - gap) / 2
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textAlign: 'center',
    opacity: 0.7,
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  achievementCard: {
    width: (width - 40 - 40 - 12) / 2, // (Screen width - outer padding - card padding - gap) / 2 ... approx
    flexGrow: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  unlockedAchievement: {
    opacity: 1,
  },
  achievementBadge: {
    fontSize: 32,
    marginBottom: 12,
  },
  achievementName: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  achievementDesc: {
    fontSize: 9,
    textAlign: 'center',
    lineHeight: 12,
    opacity: 0.8,
  },
  unlockedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 20,
  },
  comingSoon: {
    marginTop: 12,
    fontSize: 14,
    fontStyle: 'italic',
  },
  logsList: {
    gap: 12,
  },
  logItem: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logDate: {
    fontSize: 11,
    fontWeight: '600',
  },
  accuracyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  accuracyBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  logContent: {
    gap: 6,
  },
  logReference: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  logText: {
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
})
