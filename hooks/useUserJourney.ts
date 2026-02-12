import { useState, useEffect, useCallback } from 'react';
import userJourneyService, { UserJourney, UserLevel } from '@/services/userJourney';

export function useUserJourney() {
    const [journey, setJourney] = useState<UserJourney | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadJourney();
    }, []);

    const loadJourney = async () => {
        setIsLoading(true);
        try {
            const data = await userJourneyService.initialize();
            setJourney(data);
        } catch (error) {
            console.error('Failed to load user journey:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const recordDrillCompleted = useCallback(async () => {
        const updated = await userJourneyService.recordDrillCompleted();
        setJourney(updated);
        return updated;
    }, []);

    const isFeatureUnlocked = useCallback((feature: string): boolean => {
        return userJourneyService.isFeatureUnlocked(feature);
    }, []);

    const getLevel = useCallback((): UserLevel => {
        return userJourneyService.getLevel();
    }, []);

    const getNextMilestone = useCallback(() => {
        return userJourneyService.getNextMilestone();
    }, []);

    const resetJourney = useCallback(async () => {
        await userJourneyService.resetJourney();
        await loadJourney();
    }, []);

    return {
        journey,
        isLoading,
        recordDrillCompleted,
        isFeatureUnlocked,
        getLevel,
        getNextMilestone,
        resetJourney,
        // Convenience getters
        level: journey?.level ?? 'new',
        daysSinceFirstLaunch: journey?.daysSinceFirstLaunch ?? 0,
        drillsCompleted: journey?.drillsCompleted ?? 0,
        featuresUnlocked: journey?.featuresUnlocked ?? [],
    };
}
