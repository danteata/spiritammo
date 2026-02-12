/**
 * User Journey Service
 * Tracks user progression and manages feature unlocking based on engagement
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserLevel = 'new' | 'active' | 'engaged';

export interface UserJourney {
    firstLaunchDate: string | null;
    daysSinceFirstLaunch: number;
    level: UserLevel;
    drillsCompleted: number;
    lastDrillDate: string | null;
    featuresUnlocked: string[];
}

const USER_JOURNEY_KEY = '@spiritammo_user_journey';

// Feature unlock thresholds
interface FeatureThreshold {
    level: UserLevel;
    minDrills?: number;
}

const FEATURE_THRESHOLDS: Record<string, FeatureThreshold> = {
    // Level 1 (New Users - 0-2 days)
    quick_drill: { level: 'new' },
    basic_stats: { level: 'new' },

    // Level 2 (Active Users - 3-6 days)
    collections: { level: 'active', minDrills: 3 },
    custom_verses: { level: 'active', minDrills: 5 },
    detailed_stats: { level: 'active' },

    // Level 3 (Engaged Users - 7+ days)
    campaigns: { level: 'engaged', minDrills: 10 },
    voice_recording: { level: 'engaged' },
    avatar_customization: { level: 'engaged' },
    squad_features: { level: 'engaged' },
};

class UserJourneyService {
    private journey: UserJourney | null = null;

    async initialize(): Promise<UserJourney> {
        try {
            const stored = await AsyncStorage.getItem(USER_JOURNEY_KEY);
            if (stored) {
                this.journey = JSON.parse(stored);
                // Update days since first launch
                if (this.journey?.firstLaunchDate) {
                    this.journey.daysSinceFirstLaunch = this.calculateDaysSince(this.journey.firstLaunchDate);
                    this.journey.level = this.calculateLevel(this.journey);
                    await this.saveJourney();
                }
            } else {
                // First time user
                this.journey = this.createNewJourney();
                await this.saveJourney();
            }
            return this.journey!;
        } catch (error) {
            console.error('Failed to initialize user journey:', error);
            this.journey = this.createNewJourney();
            return this.journey;
        }
    }

    private createNewJourney(): UserJourney {
        return {
            firstLaunchDate: new Date().toISOString(),
            daysSinceFirstLaunch: 0,
            level: 'new',
            drillsCompleted: 0,
            lastDrillDate: null,
            featuresUnlocked: ['quick_drill', 'basic_stats'],
        };
    }

    private calculateDaysSince(dateString: string): number {
        const firstLaunch = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - firstLaunch.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    private calculateLevel(journey: UserJourney): UserLevel {
        if (journey.daysSinceFirstLaunch >= 7 && journey.drillsCompleted >= 10) {
            return 'engaged';
        } else if (journey.daysSinceFirstLaunch >= 3 || journey.drillsCompleted >= 3) {
            return 'active';
        }
        return 'new';
    }

    private async saveJourney(): Promise<void> {
        try {
            if (this.journey) {
                await AsyncStorage.setItem(USER_JOURNEY_KEY, JSON.stringify(this.journey));
            }
        } catch (error) {
            console.error('Failed to save user journey:', error);
        }
    }

    async recordDrillCompleted(): Promise<UserJourney> {
        if (!this.journey) {
            await this.initialize();
        }

        const today = new Date().toISOString().split('T')[0];
        const lastDrillDay = this.journey?.lastDrillDate?.split('T')[0];

        // Only count one drill per day for progression
        if (lastDrillDay !== today) {
            this.journey!.drillsCompleted += 1;
        }

        this.journey!.lastDrillDate = new Date().toISOString();
        this.journey!.level = this.calculateLevel(this.journey!);

        // Check for newly unlocked features
        await this.checkFeatureUnlocks();
        await this.saveJourney();

        return this.journey!;
    }

    private async checkFeatureUnlocks(): Promise<void> {
        if (!this.journey) return;

        const newFeatures: string[] = [];

        for (const [feature, threshold] of Object.entries(FEATURE_THRESHOLDS)) {
            if (this.journey.featuresUnlocked.includes(feature)) continue;

            let unlocked = false;

            // Check level requirement
            const levels: UserLevel[] = ['new', 'active', 'engaged'];
            const currentLevelIndex = levels.indexOf(this.journey.level);
            const requiredLevelIndex = levels.indexOf(threshold.level);

            if (currentLevelIndex >= requiredLevelIndex) {
                unlocked = true;
            }

            // Check minimum drills if required
            if (threshold.minDrills && this.journey.drillsCompleted < threshold.minDrills) {
                unlocked = false;
            }

            if (unlocked) {
                newFeatures.push(feature);
            }
        }

        if (newFeatures.length > 0) {
            this.journey.featuresUnlocked.push(...newFeatures);
        }
    }

    isFeatureUnlocked(feature: string): boolean {
        return this.journey?.featuresUnlocked.includes(feature) ?? false;
    }

    getJourney(): UserJourney | null {
        return this.journey;
    }

    getLevel(): UserLevel {
        return this.journey?.level ?? 'new';
    }

    // Get features that should be visible but locked (for progressive disclosure hints)
    getLockedFeatures(): string[] {
        const allFeatures = Object.keys(FEATURE_THRESHOLDS);
        return allFeatures.filter(f => !this.isFeatureUnlocked(f));
    }

    // Get next milestone for user
    getNextMilestone(): { feature: string; requirement: string } | null {
        const level = this.getLevel();

        if (level === 'new') {
            if ((this.journey?.drillsCompleted ?? 0) < 3) {
                return {
                    feature: 'Collections',
                    requirement: 'Complete 3 drills to unlock',
                };
            }
            return {
                feature: 'Active Status',
                requirement: 'Use the app for 3 days to unlock more features',
            };
        }

        if (level === 'active') {
            if ((this.journey?.drillsCompleted ?? 0) < 10) {
                return {
                    feature: 'Campaigns',
                    requirement: `Complete ${10 - (this.journey?.drillsCompleted ?? 0)} more drills to unlock`,
                };
            }
            return {
                feature: 'Full Access',
                requirement: 'Use the app for 7 days to unlock all features',
            };
        }

        return null; // All features unlocked
    }

    // Reset journey (for testing)
    async resetJourney(): Promise<void> {
        try {
            await AsyncStorage.removeItem(USER_JOURNEY_KEY);
            this.journey = null;
        } catch (error) {
            console.error('Failed to reset user journey:', error);
        }
    }
}

export const userJourneyService = new UserJourneyService();
export default userJourneyService;
