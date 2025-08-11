// Player profile and onboarding types

export interface PlayerProfile {
  id: string;
  name: string;
  callSign?: string; // Military call sign
  rank: PlayerRank;
  joinDate: Date;
  lastActive: Date;
  
  // Stats
  totalVerses: number;
  averageAccuracy: number;
  currentStreak: number;
  longestStreak: number;
  totalPracticeTime: number; // in minutes
  
  // Social
  friendsCount: number;
  isPublic: boolean;
  allowInvites: boolean;
  
  // Onboarding
  hasCompletedOnboarding: boolean;
  onboardingStep: number;
  
  // Preferences
  preferredDifficulty: 'recruit' | 'soldier' | 'veteran' | 'elite';
  notifications: {
    dailyReminders: boolean;
    friendActivity: boolean;
    challenges: boolean;
  };
}

export type PlayerRank = 
  | 'recruit'
  | 'private'
  | 'corporal'
  | 'sergeant'
  | 'lieutenant'
  | 'captain'
  | 'major'
  | 'colonel'
  | 'general';

export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  component: 'name' | 'callsign' | 'difficulty' | 'tutorial' | 'social';
  isRequired: boolean;
  militaryContext: string;
}

export interface ContactInvite {
  id: string;
  playerName: string;
  contactName: string;
  contactPhone?: string;
  contactEmail?: string;
  inviteMethod: 'sms' | 'email' | 'share';
  status: 'pending' | 'sent' | 'joined' | 'declined';
  sentAt: Date;
  joinedAt?: Date;
}

export interface PlayerStats {
  rank: PlayerRank;
  experience: number;
  experienceToNext: number;
  level: number;
  
  // Performance metrics
  accuracy: {
    overall: number;
    last7Days: number;
    last30Days: number;
  };
  
  // Activity metrics
  streaks: {
    current: number;
    longest: number;
    lastPracticeDate: Date;
  };
  
  // Social metrics
  friends: number;
  challenges: {
    completed: number;
    won: number;
    active: number;
  };
}

export interface RankRequirements {
  rank: PlayerRank;
  experienceRequired: number;
  versesRequired: number;
  accuracyRequired: number;
  streakRequired: number;
  description: string;
  benefits: string[];
}

// Military rank progression system
export const RANK_PROGRESSION: RankRequirements[] = [
  {
    rank: 'recruit',
    experienceRequired: 0,
    versesRequired: 0,
    accuracyRequired: 0,
    streakRequired: 0,
    description: 'New to the battlefield',
    benefits: ['Basic training access', 'Scripture library']
  },
  {
    rank: 'private',
    experienceRequired: 100,
    versesRequired: 5,
    accuracyRequired: 60,
    streakRequired: 3,
    description: 'Completed basic training',
    benefits: ['Target practice', 'Daily challenges']
  },
  {
    rank: 'corporal',
    experienceRequired: 300,
    versesRequired: 15,
    accuracyRequired: 70,
    streakRequired: 7,
    description: 'Showing leadership potential',
    benefits: ['Advanced training', 'Friend system']
  },
  {
    rank: 'sergeant',
    experienceRequired: 600,
    versesRequired: 30,
    accuracyRequired: 75,
    streakRequired: 14,
    description: 'Experienced warrior',
    benefits: ['Group challenges', 'Mentoring recruits']
  },
  {
    rank: 'lieutenant',
    experienceRequired: 1000,
    versesRequired: 50,
    accuracyRequired: 80,
    streakRequired: 21,
    description: 'Tactical expertise',
    benefits: ['Create challenges', 'Advanced analytics']
  },
  {
    rank: 'captain',
    experienceRequired: 1500,
    versesRequired: 75,
    accuracyRequired: 85,
    streakRequired: 30,
    description: 'Command authority',
    benefits: ['Lead squads', 'Custom training']
  },
  {
    rank: 'major',
    experienceRequired: 2200,
    versesRequired: 100,
    accuracyRequired: 88,
    streakRequired: 45,
    description: 'Strategic commander',
    benefits: ['Battalion access', 'Elite challenges']
  },
  {
    rank: 'colonel',
    experienceRequired: 3000,
    versesRequired: 150,
    accuracyRequired: 92,
    streakRequired: 60,
    description: 'Elite warrior',
    benefits: ['Special operations', 'Leaderboards']
  },
  {
    rank: 'general',
    experienceRequired: 5000,
    versesRequired: 200,
    accuracyRequired: 95,
    streakRequired: 100,
    description: 'Master of scripture warfare',
    benefits: ['All features', 'Hall of fame', 'Mentor status']
  }
];

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 1,
    title: 'Welcome to Spirit Ammo',
    description: 'Enter your name to begin your spiritual warfare training',
    component: 'name',
    isRequired: true,
    militaryContext: 'Every soldier needs identification. What should we call you, recruit?'
  },
  {
    id: 2,
    title: 'Choose Your Call Sign',
    description: 'Select a unique military call sign for the battlefield',
    component: 'callsign',
    isRequired: false,
    militaryContext: 'In the field, you need a call sign. Choose wisely - this is how your squad will know you.'
  },
  {
    id: 3,
    title: 'Select Training Difficulty',
    description: 'Choose your initial training intensity',
    component: 'difficulty',
    isRequired: true,
    militaryContext: 'Every recruit starts somewhere. Choose your training level - you can always advance through the ranks.'
  },
  {
    id: 4,
    title: 'Basic Training',
    description: 'Learn the fundamentals of scripture memorization warfare',
    component: 'tutorial',
    isRequired: true,
    militaryContext: 'Time for basic training, soldier. Learn your weapons and tactics.'
  },
  {
    id: 5,
    title: 'Build Your Squad',
    description: 'Invite friends and family to join your spiritual army',
    component: 'social',
    isRequired: false,
    militaryContext: 'No soldier fights alone. Build your squad and strengthen each other in the Word.'
  }
];
