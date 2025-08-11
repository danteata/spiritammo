import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import {
  Trophy,
  Users,
  Target,
  Award,
  Activity,
  Settings,
  TrendingUp,
  Calendar
} from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayerStore } from '@/hooks/usePlayerStore';

interface SocialHubProps {
  onNavigate: (screen: string) => void;
}

export default function SocialHub({ onNavigate }: SocialHubProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'leaderboards' | 'challenges' | 'friends'>('overview');
  const { player, getPlayerStats } = usePlayerStore();

  // Get real player data
  const playerStats = getPlayerStats();
  const userStats = {
    rank: playerStats.level, // Use level as rank number for display
    totalVerses: player?.totalVerses || 0,
    accuracy: player?.averageAccuracy || 0,
    streak: player?.currentStreak || 0,
    level: playerStats.level,
    experience: playerStats.experience,
    experienceToNext: playerStats.experienceToNext,
  };

  const quickStats = [
    { label: 'Global Rank', value: `#${userStats.rank}`, icon: Trophy, color: COLORS.warning },
    { label: 'Verses Memorized', value: userStats.totalVerses.toString(), icon: Award, color: COLORS.primary.main },
    { label: 'Avg. Accuracy', value: `${userStats.accuracy}%`, icon: Target, color: COLORS.success },
    { label: 'Current Streak', value: `${userStats.streak} days`, icon: TrendingUp, color: COLORS.secondary.main },
  ];

  const featuredChallenges = [
    {
      id: '1',
      title: 'Weekly Scripture Sprint',
      description: 'Memorize 5 verses this week',
      participants: 234,
      timeLeft: '3 days',
      reward: '100 XP',
    },
    {
      id: '2',
      title: 'Psalm 23 Perfect Recitation',
      description: 'Achieve 100% accuracy on Psalm 23',
      participants: 89,
      timeLeft: '5 days',
      reward: 'Golden Voice Badge',
    },
  ];

  const recentActivity = [
    { user: 'Sarah M.', action: 'completed', target: 'John 3:16', time: '2h ago' },
    { user: 'Mike R.', action: 'earned', target: 'Consistency Badge', time: '4h ago' },
    { user: 'Emma L.', action: 'reached', target: '50-day streak', time: '6h ago' },
  ];

  const renderOverview = () => (
    <ScrollView style={styles.tabContent}>
      {/* User Level Progress */}
      <View style={styles.levelCard}>
        <View style={styles.levelHeader}>
          <Text style={styles.levelTitle}>Level {userStats.level}</Text>
          <Text style={styles.experienceText}>
            {userStats.experience} / {userStats.experience + userStats.experienceToNext} XP
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(userStats.experience / (userStats.experience + userStats.experienceToNext)) * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {userStats.experienceToNext} XP to Level {userStats.level + 1}
        </Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsGrid}>
        {quickStats.map((stat, index) => (
          <View key={index} style={styles.statCard}>
            <stat.icon size={24} color={stat.color} />
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Featured Challenges */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Challenges</Text>
          <TouchableOpacity onPress={() => setActiveTab('challenges')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        {featuredChallenges.map((challenge) => (
          <TouchableOpacity key={challenge.id} style={styles.challengeCard}>
            <View style={styles.challengeHeader}>
              <Text style={styles.challengeTitle}>{challenge.title}</Text>
              <Text style={styles.challengeTime}>{challenge.timeLeft}</Text>
            </View>
            <Text style={styles.challengeDescription}>{challenge.description}</Text>
            <View style={styles.challengeFooter}>
              <Text style={styles.challengeParticipants}>
                {challenge.participants} participants
              </Text>
              <Text style={styles.challengeReward}>{challenge.reward}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Friend Activity</Text>
        {recentActivity.map((activity, index) => (
          <View key={index} style={styles.activityItem}>
            <View style={styles.activityDot} />
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>
                <Text style={styles.activityUser}>{activity.user}</Text>
                {' '}{activity.action} {activity.target}
              </Text>
              <Text style={styles.activityTime}>{activity.time}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'leaderboards':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.comingSoonText}>Leaderboards Coming Soon!</Text>
            <Text style={styles.comingSoonSubtext}>
              Compete with friends and see how you rank globally
            </Text>
          </View>
        );
      case 'challenges':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.comingSoonText}>Challenges Coming Soon!</Text>
            <Text style={styles.comingSoonSubtext}>
              Join daily, weekly, and custom challenges
            </Text>
          </View>
        );
      case 'friends':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.comingSoonText}>Friends Coming Soon!</Text>
            <Text style={styles.comingSoonSubtext}>
              Connect with friends and practice together
            </Text>
          </View>
        );
      default:
        return renderOverview();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary.main, COLORS.primary.dark]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>
          {player?.callSign ? `${player.callSign} - ` : ''}{player?.name || 'Soldier'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {playerStats.rank.toUpperCase()} • Connect, Compete, and Grow Together
        </Text>
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Activity size={20} color={activeTab === 'overview' ? COLORS.primary.main : COLORS.text.light} />
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'leaderboards' && styles.activeTab]}
          onPress={() => setActiveTab('leaderboards')}
        >
          <Trophy size={20} color={activeTab === 'leaderboards' ? COLORS.primary.main : COLORS.text.light} />
          <Text style={[styles.tabText, activeTab === 'leaderboards' && styles.activeTabText]}>
            Rankings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'challenges' && styles.activeTab]}
          onPress={() => setActiveTab('challenges')}
        >
          <Target size={20} color={activeTab === 'challenges' ? COLORS.primary.main : COLORS.text.light} />
          <Text style={[styles.tabText, activeTab === 'challenges' && styles.activeTabText]}>
            Challenges
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Users size={20} color={activeTab === 'friends' ? COLORS.primary.main : COLORS.text.light} />
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {renderTabContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary.main,
  },
  tabText: {
    fontSize: 12,
    color: COLORS.text.light,
    marginTop: 4,
  },
  activeTabText: {
    color: COLORS.primary.main,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  levelCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.light,
  },
  experienceText: {
    fontSize: 14,
    color: COLORS.text.light,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary.main,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.text.light,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '47%',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.light,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.text.light,
    textAlign: 'center',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.light,
  },
  seeAllText: {
    fontSize: 14,
    color: COLORS.primary.main,
    fontWeight: '500',
  },
  challengeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.light,
    flex: 1,
  },
  challengeTime: {
    fontSize: 12,
    color: COLORS.warning,
    fontWeight: '500',
  },
  challengeDescription: {
    fontSize: 14,
    color: COLORS.text.light,
    marginBottom: 12,
  },
  challengeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  challengeParticipants: {
    fontSize: 12,
    color: COLORS.text.light,
  },
  challengeReward: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '500',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary.main,
    marginTop: 6,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: COLORS.text.light,
    marginBottom: 2,
  },
  activityUser: {
    fontWeight: '600',
  },
  activityTime: {
    fontSize: 12,
    color: COLORS.text.light,
  },
  comingSoonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text.light,
    textAlign: 'center',
    marginTop: 60,
    marginBottom: 12,
  },
  comingSoonSubtext: {
    fontSize: 16,
    color: COLORS.text.light,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
