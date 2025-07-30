import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TACTICAL_THEME, MILITARY_TYPOGRAPHY, RANK_COLORS } from '@/constants/colors';
import { UserStats } from '@/types/scripture';

interface RankBadgeProps {
  rank: UserStats['rank'];
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  animated?: boolean;
}

export default function RankBadge({ 
  rank, 
  size = 'medium', 
  showLabel = true, 
  animated = false 
}: RankBadgeProps) {
  
  const getRankInfo = (rank: UserStats['rank']) => {
    switch (rank) {
      case 'recruit':
        return {
          insignia: '🎖️',
          label: 'RECRUIT',
          description: 'Basic Training',
          requirements: '10 verses, 60% accuracy',
        };
      case 'private':
        return {
          insignia: '🏅',
          label: 'PRIVATE',
          description: 'Infantry Ready',
          requirements: '25 verses, 70% accuracy',
        };
      case 'corporal':
        return {
          insignia: '🎗️',
          label: 'CORPORAL',
          description: 'Squad Leader',
          requirements: '50 verses, 75% accuracy',
        };
      case 'sergeant':
        return {
          insignia: '🏆',
          label: 'SERGEANT',
          description: 'Platoon Leader',
          requirements: '100 verses, 80% accuracy',
        };
      case 'lieutenant':
        return {
          insignia: '🥇',
          label: 'LIEUTENANT',
          description: 'Company Officer',
          requirements: '200 verses, 85% accuracy',
        };
      case 'captain':
        return {
          insignia: '⭐',
          label: 'CAPTAIN',
          description: 'Company Commander',
          requirements: '500 verses, 90% accuracy',
        };
      case 'major':
        return {
          insignia: '🌟',
          label: 'MAJOR',
          description: 'Battalion Officer',
          requirements: '1000 verses, 95% accuracy',
        };
      case 'colonel':
        return {
          insignia: '💫',
          label: 'COLONEL',
          description: 'Regiment Commander',
          requirements: '2000 verses, 98% accuracy',
        };
      case 'general':
        return {
          insignia: '👑',
          label: 'GENERAL',
          description: 'Supreme Commander',
          requirements: '5000 verses, 99% accuracy',
        };
      default:
        return {
          insignia: '🎖️',
          label: 'RECRUIT',
          description: 'Basic Training',
          requirements: '10 verses, 60% accuracy',
        };
    }
  };

  const getSizeStyles = (size: 'small' | 'medium' | 'large') => {
    switch (size) {
      case 'small':
        return {
          container: { width: 60, height: 60 },
          insignia: { fontSize: 20 },
          label: { ...MILITARY_TYPOGRAPHY.caption, fontSize: 10 },
          description: { ...MILITARY_TYPOGRAPHY.caption, fontSize: 8 },
        };
      case 'medium':
        return {
          container: { width: 80, height: 80 },
          insignia: { fontSize: 28 },
          label: { ...MILITARY_TYPOGRAPHY.caption, fontSize: 12 },
          description: { ...MILITARY_TYPOGRAPHY.caption, fontSize: 10 },
        };
      case 'large':
        return {
          container: { width: 120, height: 120 },
          insignia: { fontSize: 40 },
          label: { ...MILITARY_TYPOGRAPHY.body, fontSize: 16 },
          description: { ...MILITARY_TYPOGRAPHY.caption, fontSize: 12 },
        };
    }
  };

  const rankInfo = getRankInfo(rank);
  const sizeStyles = getSizeStyles(size);
  const rankColor = RANK_COLORS[rank];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[rankColor, TACTICAL_THEME.background]}
        style={[styles.badge, sizeStyles.container]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.insigniaContainer}>
          <Text style={[styles.insignia, sizeStyles.insignia]}>
            {rankInfo.insignia}
          </Text>
        </View>
        
        <View style={[styles.border, { borderColor: rankColor }]} />
      </LinearGradient>

      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={[styles.rankLabel, sizeStyles.label, { color: rankColor }]}>
            {rankInfo.label}
          </Text>
          {size === 'large' && (
            <>
              <Text style={[styles.description, sizeStyles.description]}>
                {rankInfo.description}
              </Text>
              <Text style={[styles.requirements, sizeStyles.description]}>
                {rankInfo.requirements}
              </Text>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  badge: {
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: TACTICAL_THEME.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  insigniaContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  insignia: {
    textAlign: 'center',
  },
  border: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: 50,
    borderWidth: 2,
  },
  labelContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  rankLabel: {
    color: TACTICAL_THEME.text,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  description: {
    color: TACTICAL_THEME.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  requirements: {
    color: TACTICAL_THEME.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
