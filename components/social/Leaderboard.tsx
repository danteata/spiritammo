import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Trophy, Medal, Award, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { LeaderboardEntry } from '@/types/social';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  userRank?: number;
  period: 'daily' | 'weekly' | 'monthly' | 'all-time';
  metric: 'verses' | 'accuracy' | 'streak' | 'experience';
  onPeriodChange: (period: 'daily' | 'weekly' | 'monthly' | 'all-time') => void;
  onMetricChange: (metric: 'verses' | 'accuracy' | 'streak' | 'experience') => void;
}

export default function Leaderboard({
  entries,
  userRank,
  period,
  metric,
  onPeriodChange,
  onMetricChange,
}: LeaderboardProps) {
  const periods = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'all-time', label: 'All Time' },
  ] as const;

  const metrics = [
    { key: 'verses', label: 'Verses', icon: Award },
    { key: 'accuracy', label: 'Accuracy', icon: Trophy },
    { key: 'streak', label: 'Streak', icon: TrendingUp },
    { key: 'experience', label: 'XP', icon: Medal },
  ] as const;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy size={20} color="#FFD700" />;
      case 2:
        return <Medal size={20} color="#C0C0C0" />;
      case 3:
        return <Award size={20} color="#CD7F32" />;
      default:
        return (
          <View style={styles.rankNumber}>
            <Text style={styles.rankText}>{rank}</Text>
          </View>
        );
    }
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) {
      return <TrendingUp size={16} color={COLORS.success} />;
    } else if (change < 0) {
      return <TrendingDown size={16} color={COLORS.error} />;
    } else {
      return <Minus size={16} color={COLORS.text.light} />;
    }
  };

  const formatScore = (score: number, metric: string) => {
    switch (metric) {
      case 'accuracy':
        return `${score.toFixed(1)}%`;
      case 'experience':
        return `${score.toLocaleString()} XP`;
      case 'streak':
        return `${score} days`;
      default:
        return score.toString();
    }
  };

  const getRankStyle = (rank: number) => {
    if (rank <= 3) {
      return [styles.entryCard, styles.topRankCard];
    }
    return styles.entryCard;
  };

  return (
    <View style={styles.container}>
      {/* Period Selector */}
      <View style={styles.selectorContainer}>
        <Text style={styles.selectorLabel}>Period:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selector}>
          {periods.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.selectorButton, period === p.key && styles.activeSelectorButton]}
              onPress={() => onPeriodChange(p.key)}
            >
              <Text style={[styles.selectorText, period === p.key && styles.activeSelectorText]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Metric Selector */}
      <View style={styles.selectorContainer}>
        <Text style={styles.selectorLabel}>Metric:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selector}>
          {metrics.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.selectorButton, metric === m.key && styles.activeSelectorButton]}
              onPress={() => onMetricChange(m.key)}
            >
              <m.icon size={16} color={metric === m.key ? 'white' : COLORS.text.light} />
              <Text style={[styles.selectorText, metric === m.key && styles.activeSelectorText]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* User's Rank (if not in top entries) */}
      {userRank && userRank > entries.length && (
        <View style={styles.userRankCard}>
          <Text style={styles.userRankText}>Your Rank: #{userRank}</Text>
        </View>
      )}

      {/* Leaderboard Entries */}
      <ScrollView style={styles.entriesList} showsVerticalScrollIndicator={false}>
        {entries.map((entry, index) => (
          <View key={entry.userId} style={getRankStyle(entry.rank)}>
            <View style={styles.entryLeft}>
              {getRankIcon(entry.rank)}
              
              {entry.avatar ? (
                <Image source={{ uri: entry.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {entry.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              
              <View style={styles.userInfo}>
                <Text style={styles.displayName}>{entry.displayName}</Text>
                <Text style={styles.username}>@{entry.username}</Text>
                {entry.level && (
                  <Text style={styles.level}>Level {entry.level}</Text>
                )}
              </View>
            </View>

            <View style={styles.entryRight}>
              <Text style={styles.score}>
                {formatScore(entry.score, metric)}
              </Text>
              
              <View style={styles.changeContainer}>
                {getChangeIcon(entry.change)}
                <Text style={[
                  styles.changeText,
                  entry.change > 0 && styles.positiveChange,
                  entry.change < 0 && styles.negativeChange,
                ]}>
                  {entry.change !== 0 && (entry.change > 0 ? '+' : '')}{entry.change}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  selectorContainer: {
    marginBottom: 16,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.light,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  selector: {
    paddingHorizontal: 16,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeSelectorButton: {
    backgroundColor: COLORS.primary.main,
    borderColor: COLORS.primary.main,
  },
  selectorText: {
    fontSize: 14,
    color: COLORS.text.light,
    marginLeft: 4,
  },
  activeSelectorText: {
    color: 'white',
    fontWeight: '500',
  },
  userRankCard: {
    backgroundColor: COLORS.primary.light,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  userRankText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary.main,
  },
  entriesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  topRankCard: {
    borderWidth: 2,
    borderColor: COLORS.warning,
    backgroundColor: '#fffbf0',
  },
  entryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.text.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary.main,
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.light,
  },
  username: {
    fontSize: 12,
    color: COLORS.text.light,
    opacity: 0.7,
  },
  level: {
    fontSize: 12,
    color: COLORS.primary.main,
    fontWeight: '500',
  },
  entryRight: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.light,
    marginBottom: 4,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeText: {
    fontSize: 12,
    marginLeft: 4,
    color: COLORS.text.light,
  },
  positiveChange: {
    color: COLORS.success,
  },
  negativeChange: {
    color: COLORS.error,
  },
});
