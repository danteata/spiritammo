// Social and competitive feature types

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatar?: string;
  createdAt: Date;
  lastActive: Date;
  
  // Privacy settings
  isPublic: boolean;
  allowFriendRequests: boolean;
  showProgress: boolean;
  
  // Profile stats
  totalVerses: number;
  totalAccuracy: number;
  currentStreak: number;
  longestStreak: number;
  level: number;
  experience: number;
  
  // Achievements
  badges: Badge[];
  achievements: Achievement[];
}

export interface UserStats {
  userId: string;
  
  // Daily stats
  dailyVerses: number;
  dailyAccuracy: number;
  dailyTime: number; // minutes
  
  // Weekly stats
  weeklyVerses: number;
  weeklyAccuracy: number;
  weeklyTime: number;
  
  // Monthly stats
  monthlyVerses: number;
  monthlyAccuracy: number;
  monthlyTime: number;
  
  // All-time stats
  totalVerses: number;
  totalAccuracy: number;
  totalTime: number;
  
  // Streaks
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: Date;
  
  // Progress tracking
  versesMemorized: string[]; // verse IDs
  collectionsCompleted: string[]; // collection IDs
  
  updatedAt: Date;
}

export interface Friendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  
  // Challenge criteria
  targetVerses?: number;
  targetAccuracy?: number;
  targetTime?: number; // minutes
  specificVerses?: string[]; // specific verse IDs
  specificCollections?: string[]; // specific collection IDs
  
  // Timing
  startDate: Date;
  endDate: Date;
  
  // Participation
  isPublic: boolean;
  maxParticipants?: number;
  createdBy: string; // user ID
  
  // Rewards
  experienceReward: number;
  badgeReward?: string;
  
  createdAt: Date;
}

export interface ChallengeParticipation {
  id: string;
  challengeId: string;
  userId: string;
  
  // Progress
  versesCompleted: number;
  currentAccuracy: number;
  timeSpent: number; // minutes
  isCompleted: boolean;
  completedAt?: Date;
  
  // Ranking
  rank?: number;
  score: number; // calculated based on challenge criteria
  
  joinedAt: Date;
  updatedAt: Date;
}

export interface Leaderboard {
  id: string;
  name: string;
  type: 'global' | 'friends' | 'challenge';
  period: 'daily' | 'weekly' | 'monthly' | 'all-time';
  
  // Criteria
  metric: 'verses' | 'accuracy' | 'streak' | 'experience' | 'time';
  
  // Entries
  entries: LeaderboardEntry[];
  
  updatedAt: Date;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  
  rank: number;
  score: number;
  change: number; // change from previous period
  
  // Additional context
  versesCount?: number;
  accuracy?: number;
  streak?: number;
  level?: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  
  // Unlock criteria
  criteria: {
    type: 'verses' | 'accuracy' | 'streak' | 'time' | 'challenge' | 'social';
    value: number;
    description: string;
  };
  
  // Rewards
  experienceReward: number;
}

export interface Achievement {
  id: string;
  badgeId: string;
  userId: string;
  unlockedAt: Date;
  
  // Progress tracking
  progress: number;
  maxProgress: number;
  isCompleted: boolean;
}

export interface SocialActivity {
  id: string;
  userId: string;
  type: 'verse_completed' | 'badge_earned' | 'challenge_completed' | 'streak_milestone' | 'level_up';
  
  // Activity data
  data: {
    verseId?: string;
    badgeId?: string;
    challengeId?: string;
    streak?: number;
    level?: number;
    accuracy?: number;
  };
  
  // Visibility
  isPublic: boolean;
  
  createdAt: Date;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  
  // Settings
  isPublic: boolean;
  requireApproval: boolean;
  maxMembers?: number;
  
  // Admin
  createdBy: string;
  admins: string[]; // user IDs
  
  // Members
  memberCount: number;
  
  createdAt: Date;
}

export interface GroupMembership {
  id: string;
  groupId: string;
  userId: string;
  role: 'member' | 'admin' | 'owner';
  status: 'pending' | 'active' | 'banned';
  
  joinedAt: Date;
}

export interface GroupChallenge {
  id: string;
  groupId: string;
  challengeId: string;
  
  // Group-specific settings
  isGroupExclusive: boolean;
  groupRewards?: {
    experienceBonus: number;
    specialBadge?: string;
  };
  
  createdAt: Date;
}

// API Response types
export interface LeaderboardResponse {
  leaderboard: Leaderboard;
  userRank?: number;
  userEntry?: LeaderboardEntry;
}

export interface ChallengeResponse {
  challenge: Challenge;
  participation?: ChallengeParticipation;
  leaderboard: LeaderboardEntry[];
}

export interface SocialFeedResponse {
  activities: (SocialActivity & {
    user: Pick<User, 'username' | 'displayName' | 'avatar'>;
  })[];
  hasMore: boolean;
  nextCursor?: string;
}

// Social feature settings
export interface SocialSettings {
  isPublic: boolean;
  allowFriendRequests: boolean;
  showProgress: boolean;
  showActivity: boolean;
  allowGroupInvites: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}
