import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserStats } from '@/types/scripture';

// Military Ranking Types
export interface MilitaryRank {
  rank: UserStats['rank'];
  versesRequired: number;
  accuracy: number;
  insignia: string;
  title: string;
  description: string;
}

export interface Specialization {
  id: string;
  name: string;
  description: string;
  requirement: string;
  badge: string;
  unlocked: boolean;
  dateUnlocked?: Date;
}

export interface Commendation {
  id: string;
  name: string;
  description: string;
  requirement: string;
  medal: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  unlocked: boolean;
  dateUnlocked?: Date;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  dateUnlocked?: Date;
  reward?: string;
}

export interface MilitaryProfile {
  currentRank: UserStats['rank'];
  totalVersesMemorized: number;
  averageAccuracy: number;
  consecutiveDays: number;
  specializations: Specialization[];
  commendations: Commendation[];
  achievements: Achievement[];
  totalPoints: number;
  nextRankProgress: number;
}

// Storage keys
const MILITARY_PROFILE_KEY = '@spiritammo_military_profile';
const ACHIEVEMENTS_KEY = '@spiritammo_achievements';

// Military Ranks Configuration
export const MILITARY_RANKS: MilitaryRank[] = [
  {
    rank: 'recruit',
    versesRequired: 10,
    accuracy: 60,
    insignia: '🎖️',
    title: 'RECRUIT',
    description: 'Basic Training Complete',
  },
  {
    rank: 'private',
    versesRequired: 25,
    accuracy: 70,
    insignia: '🏅',
    title: 'PRIVATE',
    description: 'Infantry Ready',
  },
  {
    rank: 'corporal',
    versesRequired: 50,
    accuracy: 75,
    insignia: '🎗️',
    title: 'CORPORAL',
    description: 'Squad Leader',
  },
  {
    rank: 'sergeant',
    versesRequired: 100,
    accuracy: 80,
    insignia: '🏆',
    title: 'SERGEANT',
    description: 'Platoon Leader',
  },
  {
    rank: 'lieutenant',
    versesRequired: 200,
    accuracy: 85,
    insignia: '🥇',
    title: 'LIEUTENANT',
    description: 'Company Officer',
  },
  {
    rank: 'captain',
    versesRequired: 500,
    accuracy: 90,
    insignia: '⭐',
    title: 'CAPTAIN',
    description: 'Company Commander',
  },
  {
    rank: 'major',
    versesRequired: 1000,
    accuracy: 95,
    insignia: '🌟',
    title: 'MAJOR',
    description: 'Battalion Officer',
  },
  {
    rank: 'colonel',
    versesRequired: 2000,
    accuracy: 98,
    insignia: '💫',
    title: 'COLONEL',
    description: 'Regiment Commander',
  },
  {
    rank: 'general',
    versesRequired: 5000,
    accuracy: 99,
    insignia: '👑',
    title: 'GENERAL',
    description: 'Supreme Commander',
  },
];

// Specializations Configuration
export const SPECIALIZATIONS: Specialization[] = [
  {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    description: 'Master of precision',
    requirement: '100% accuracy on 50 consecutive verses',
    badge: '🎯',
    unlocked: false,
  },
  {
    id: 'rapid_fire',
    name: 'Rapid Fire',
    description: 'Speed demon',
    requirement: 'Complete 20 verses in under 5 minutes',
    badge: '⚡',
    unlocked: false,
  },
  {
    id: 'sniper',
    name: 'Sniper',
    description: 'Long-range specialist',
    requirement: 'Master 10 long verses (50+ words) perfectly',
    badge: '🔭',
    unlocked: false,
  },
  {
    id: 'drill_sergeant',
    name: 'Drill Sergeant',
    description: 'Discipline master',
    requirement: 'Maintain 30-day training streak',
    badge: '🗣️',
    unlocked: false,
  },
  {
    id: 'chaplain',
    name: 'Chaplain',
    description: 'Spiritual leader',
    requirement: 'Memorize entire book of the Bible',
    badge: '✝️',
    unlocked: false,
  },
  {
    id: 'intelligence_officer',
    name: 'Intelligence Officer',
    description: 'Master of mnemonics',
    requirement: 'Create 50 custom mnemonics',
    badge: '🧠',
    unlocked: false,
  },
];

// Commendations Configuration
export const COMMENDATIONS: Commendation[] = [
  {
    id: 'distinguished_service',
    name: 'Distinguished Service Medal',
    description: 'For exceptional dedication',
    requirement: '6 months consistent training',
    medal: '🏅',
    rarity: 'uncommon',
    unlocked: false,
  },
  {
    id: 'combat_excellence',
    name: 'Combat Excellence Ribbon',
    description: 'For superior performance',
    requirement: '90%+ average accuracy for 1 month',
    medal: '🎖️',
    rarity: 'rare',
    unlocked: false,
  },
  {
    id: 'leadership',
    name: 'Leadership Commendation',
    description: 'For inspiring others',
    requirement: 'Help 5 other users achieve next rank',
    medal: '⭐',
    rarity: 'rare',
    unlocked: false,
  },
  {
    id: 'innovation',
    name: 'Innovation Award',
    description: 'For creative excellence',
    requirement: 'Create 25 custom mnemonics',
    medal: '💡',
    rarity: 'uncommon',
    unlocked: false,
  },
  {
    id: 'valor',
    name: 'Medal of Valor',
    description: 'For extraordinary courage',
    requirement: 'Complete 100 verses with 95%+ accuracy',
    medal: '🏆',
    rarity: 'legendary',
    unlocked: false,
  },
];

class MilitaryRankingService {
  private profile: MilitaryProfile | null = null;

  constructor() {
    this.loadProfile();
  }

  private async loadProfile() {
    try {
      const stored = await AsyncStorage.getItem(MILITARY_PROFILE_KEY);
      if (stored) {
        this.profile = JSON.parse(stored);
      } else {
        this.profile = this.createDefaultProfile();
        await this.saveProfile();
      }
    } catch (error) {
      console.error('Failed to load military profile:', error);
      this.profile = this.createDefaultProfile();
    }
  }

  private createDefaultProfile(): MilitaryProfile {
    return {
      currentRank: 'recruit',
      totalVersesMemorized: 0,
      averageAccuracy: 0,
      consecutiveDays: 0,
      specializations: SPECIALIZATIONS.map(s => ({ ...s })),
      commendations: COMMENDATIONS.map(c => ({ ...c })),
      achievements: [],
      totalPoints: 0,
      nextRankProgress: 0,
    };
  }

  private async saveProfile() {
    try {
      if (this.profile) {
        await AsyncStorage.setItem(MILITARY_PROFILE_KEY, JSON.stringify(this.profile));
      }
    } catch (error) {
      console.error('Failed to save military profile:', error);
    }
  }

  // Calculate rank based on stats
  calculateRank(versesMemorized: number, averageAccuracy: number): UserStats['rank'] {
    for (let i = MILITARY_RANKS.length - 1; i >= 0; i--) {
      const rank = MILITARY_RANKS[i];
      if (versesMemorized >= rank.versesRequired && averageAccuracy >= rank.accuracy) {
        return rank.rank;
      }
    }
    return 'recruit';
  }

  // Update profile with new stats
  async updateProfile(stats: {
    versesMemorized: number;
    averageAccuracy: number;
    consecutiveDays: number;
  }): Promise<{ rankUp: boolean; newRank?: UserStats['rank']; unlockedAchievements: Achievement[] }> {
    if (!this.profile) {
      await this.loadProfile();
    }

    const oldRank = this.profile!.currentRank;
    const newRank = this.calculateRank(stats.versesMemorized, stats.averageAccuracy);
    const rankUp = newRank !== oldRank;

    // Update profile
    this.profile!.totalVersesMemorized = stats.versesMemorized;
    this.profile!.averageAccuracy = stats.averageAccuracy;
    this.profile!.consecutiveDays = stats.consecutiveDays;
    this.profile!.currentRank = newRank;

    // Calculate next rank progress
    const currentRankIndex = MILITARY_RANKS.findIndex(r => r.rank === newRank);
    const nextRank = MILITARY_RANKS[currentRankIndex + 1];
    if (nextRank) {
      const versesProgress = Math.min(100, (stats.versesMemorized / nextRank.versesRequired) * 100);
      const accuracyProgress = Math.min(100, (stats.averageAccuracy / nextRank.accuracy) * 100);
      this.profile!.nextRankProgress = Math.min(versesProgress, accuracyProgress);
    } else {
      this.profile!.nextRankProgress = 100; // Max rank achieved
    }

    // Check for unlocked achievements
    const unlockedAchievements = await this.checkAchievements();

    // Check specializations
    await this.checkSpecializations();

    // Check commendations
    await this.checkCommendations();

    await this.saveProfile();

    return {
      rankUp,
      newRank: rankUp ? newRank : undefined,
      unlockedAchievements,
    };
  }

  // Check and unlock achievements
  private async checkAchievements(): Promise<Achievement[]> {
    const unlocked: Achievement[] = [];
    
    if (!this.profile) return unlocked;

    // Define achievement checks
    const achievementChecks = [
      {
        id: 'first_verse',
        name: 'First Steps',
        description: 'Memorize your first verse',
        maxProgress: 1,
        check: () => this.profile!.totalVersesMemorized >= 1,
      },
      {
        id: 'ten_verses',
        name: 'Getting Started',
        description: 'Memorize 10 verses',
        maxProgress: 10,
        check: () => this.profile!.totalVersesMemorized >= 10,
      },
      {
        id: 'hundred_verses',
        name: 'Century Club',
        description: 'Memorize 100 verses',
        maxProgress: 100,
        check: () => this.profile!.totalVersesMemorized >= 100,
      },
      {
        id: 'perfect_week',
        name: 'Perfect Week',
        description: 'Train for 7 consecutive days',
        maxProgress: 7,
        check: () => this.profile!.consecutiveDays >= 7,
      },
      {
        id: 'accuracy_master',
        name: 'Accuracy Master',
        description: 'Achieve 95% average accuracy',
        maxProgress: 95,
        check: () => this.profile!.averageAccuracy >= 95,
      },
    ];

    for (const achievementCheck of achievementChecks) {
      const existing = this.profile.achievements.find(a => a.id === achievementCheck.id);
      
      if (!existing) {
        // Create new achievement
        const achievement: Achievement = {
          id: achievementCheck.id,
          name: achievementCheck.name,
          description: achievementCheck.description,
          progress: achievementCheck.check() ? achievementCheck.maxProgress : 0,
          maxProgress: achievementCheck.maxProgress,
          unlocked: achievementCheck.check(),
          dateUnlocked: achievementCheck.check() ? new Date() : undefined,
        };
        
        this.profile.achievements.push(achievement);
        
        if (achievement.unlocked) {
          unlocked.push(achievement);
        }
      } else if (!existing.unlocked && achievementCheck.check()) {
        // Unlock existing achievement
        existing.unlocked = true;
        existing.dateUnlocked = new Date();
        existing.progress = achievementCheck.maxProgress;
        unlocked.push(existing);
      }
    }

    return unlocked;
  }

  // Check and unlock specializations
  private async checkSpecializations() {
    if (!this.profile) return;

    // Implementation would check specific conditions for each specialization
    // For now, we'll implement basic checks
    
    // Drill Sergeant: 30-day streak
    const drillSergeant = this.profile.specializations.find(s => s.id === 'drill_sergeant');
    if (drillSergeant && !drillSergeant.unlocked && this.profile.consecutiveDays >= 30) {
      drillSergeant.unlocked = true;
      drillSergeant.dateUnlocked = new Date();
    }
  }

  // Check and unlock commendations
  private async checkCommendations() {
    if (!this.profile) return;

    // Combat Excellence: 90%+ accuracy
    const combatExcellence = this.profile.commendations.find(c => c.id === 'combat_excellence');
    if (combatExcellence && !combatExcellence.unlocked && this.profile.averageAccuracy >= 90) {
      combatExcellence.unlocked = true;
      combatExcellence.dateUnlocked = new Date();
    }
  }

  // Get current profile
  async getProfile(): Promise<MilitaryProfile> {
    if (!this.profile) {
      await this.loadProfile();
    }
    return this.profile!;
  }

  // Get rank info
  getRankInfo(rank: UserStats['rank']): MilitaryRank {
    return MILITARY_RANKS.find(r => r.rank === rank) || MILITARY_RANKS[0];
  }

  // Get next rank info
  getNextRankInfo(currentRank: UserStats['rank']): MilitaryRank | null {
    const currentIndex = MILITARY_RANKS.findIndex(r => r.rank === currentRank);
    return currentIndex < MILITARY_RANKS.length - 1 ? MILITARY_RANKS[currentIndex + 1] : null;
  }

  // Get unlocked specializations
  getUnlockedSpecializations(): Specialization[] {
    return this.profile?.specializations.filter(s => s.unlocked) || [];
  }

  // Get unlocked commendations
  getUnlockedCommendations(): Commendation[] {
    return this.profile?.commendations.filter(c => c.unlocked) || [];
  }

  // Get achievement progress
  getAchievementProgress(): { completed: number; total: number } {
    const achievements = this.profile?.achievements || [];
    return {
      completed: achievements.filter(a => a.unlocked).length,
      total: achievements.length,
    };
  }
}

// Export singleton instance
export const militaryRankingService = new MilitaryRankingService();
