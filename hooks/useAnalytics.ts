import React, { useCallback, useEffect, useRef } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { analytics, AnalyticsEvents, AnalyticsEventType } from '@/services/analytics'
import { useAppStore } from './useAppStore'

// Performance timing helper
const usePerformanceTimer = () => {
    const startTimeRef = useRef<number | undefined>(undefined)

    const start = useCallback(() => {
        startTimeRef.current = Date.now()
    }, [])

    const end = useCallback((operationName: string, additionalProps?: Record<string, any>) => {
        if (startTimeRef.current !== undefined) {
            const duration = Date.now() - startTimeRef.current
            analytics.track(AnalyticsEvents.performanceTiming({
                operation_name: operationName,
                duration_ms: duration,
                success: true,
                ...additionalProps
            }))
            startTimeRef.current = undefined
        }
    }, [])

    return { start, end }
}

// Main analytics hook
export const useAnalytics = () => {
    const { userStats } = useAppStore()
    const performanceTimer = usePerformanceTimer()
    const currentScreenRef = useRef<string | undefined>(undefined)

    // Update user properties when user stats change
    useEffect(() => {
        if (userStats) {
            analytics.updateUserProfile({
                rank: userStats.rank,
                totalVerses: userStats.totalPracticed,
                averageAccuracy: userStats.averageAccuracy,
                streak: userStats.streak
                // Note: valorPoints not available in current UserStats, will be added later
            })
        }
    }, [userStats])

    // Track screen views automatically
    useFocusEffect(
        useCallback(() => {
            const screenName = getCurrentScreenName()
            if (screenName && screenName !== currentScreenRef.current) {
                currentScreenRef.current = screenName
                analytics.track(AnalyticsEvents.screenView(screenName))
            }
        }, [])
    )

    // Core tracking methods
    const trackEvent = useCallback((eventName: AnalyticsEventType, properties?: Record<string, any>) => {
        analytics.track({ name: eventName, properties })
    }, [])

    const trackPracticeStart = useCallback((properties?: Record<string, any>) => {
        analytics.track(AnalyticsEvents.practiceStart(properties))
    }, [])

    const trackPracticeComplete = useCallback((properties?: Record<string, any>) => {
        analytics.track(AnalyticsEvents.practiceComplete(properties))
    }, [])

    const trackVoiceRecordingStart = useCallback((properties?: Record<string, any>) => {
        analytics.track(AnalyticsEvents.voiceRecordingStart(properties))
    }, [])

    const trackVoiceRecordingComplete = useCallback((properties?: Record<string, any>) => {
        analytics.track(AnalyticsEvents.voiceRecordingComplete(properties))
    }, [])

    const trackCampaignStart = useCallback((properties?: Record<string, any>) => {
        analytics.track(AnalyticsEvents.campaignStart(properties))
    }, [])

    const trackCampaignComplete = useCallback((properties?: Record<string, any>) => {
        analytics.track(AnalyticsEvents.campaignComplete(properties))
    }, [])

    const trackError = useCallback((error: Error, componentName?: string, additionalProps?: Record<string, any>) => {
        analytics.track(AnalyticsEvents.errorOccurred({
            error_message: error.message,
            error_code: error.name,
            component_name: componentName,
            stack_trace: error.stack,
            ...additionalProps
        }))
    }, [])

    const trackTabSwitch = useCallback((fromTab: string, toTab: string, properties?: Record<string, any>) => {
        analytics.track(AnalyticsEvents.tabSwitch(fromTab, toTab, properties))
    }, [])

    const trackUserInteraction = useCallback((action: string, element: string, properties?: Record<string, any>) => {
        analytics.trackInteraction(action, element, properties)
    }, [])

    const trackTiming = useCallback((name: string, value: number, properties?: Record<string, any>) => {
        analytics.trackTiming(name, value, properties)
    }, [])

    const trackPurchase = useCallback((item: { id: string; name: string; category: string; cost: number; currency?: string }) => {
        analytics.trackPurchase({
            ...item,
            currency: item.currency || 'VP'
        })
    }, [])

    const trackAchievement = useCallback((achievement: { id: string; name: string; type: string; rarity?: string }) => {
        analytics.trackAchievement(achievement)
    }, [])

    // Performance tracking helpers
    const startPerformanceTimer = useCallback((operationName: string) => {
        performanceTimer.start()
    }, [performanceTimer])

    const endPerformanceTimer = useCallback((operationName: string, additionalProps?: Record<string, any>) => {
        performanceTimer.end(operationName, additionalProps)
    }, [performanceTimer])

    // Equipment & Arsenal Analytics
    const trackArsenalOpened = useCallback((properties?: Record<string, any>) => {
        analytics.track(AnalyticsEvents.arsenalOpened(properties))
    }, [])

    const trackEquipmentItemViewed = useCallback((properties: { item_id: string; item_name: string; category: string; equipped?: boolean }) => {
        analytics.track(AnalyticsEvents.equipmentItemViewed(properties))
    }, [])

    const trackEquipmentSlotChanged = useCallback((properties: { slot: string; old_item_id?: string; new_item_id: string; item_name: string }) => {
        analytics.track(AnalyticsEvents.equipmentSlotChanged(properties))
    }, [])

    const trackArsenalTabSwitched = useCallback((fromTab: string, toTab: string, properties?: Record<string, any>) => {
        analytics.track(AnalyticsEvents.arsenalTabSwitched({ from_tab: fromTab, to_tab: toTab, ...properties }))
    }, [])

    // Training & Campaign Analytics
    const trackTrainingModeChanged = useCallback((oldMode: string, newMode: string, properties?: Record<string, any>) => {
        analytics.track(AnalyticsEvents.trainingModeChanged({ old_mode: oldMode, new_mode: newMode, ...properties }))
    }, [])

    const trackStealthDrillSelected = useCallback((properties?: Record<string, any>) => {
        analytics.track(AnalyticsEvents.stealthDrillSelected(properties))
    }, [])

    const trackTargetPracticeSelected = useCallback((properties?: Record<string, any>) => {
        analytics.track(AnalyticsEvents.targetPracticeSelected(properties))
    }, [])

    // Content Management Analytics
    const trackChapterSelected = useCallback((properties: { chapter_id: string; collection_id: string; verse_count?: number }) => {
        analytics.track(AnalyticsEvents.chapterSelected(properties))
    }, [])

    const trackScriptureViewed = useCallback((properties: { scripture_id: string; reference: string; context?: string }) => {
        analytics.track(AnalyticsEvents.scriptureViewed(properties))
    }, [])

    const trackIntelGenerated = useCallback((properties: { scripture_id: string; intel_type: string; success: boolean }) => {
        analytics.track(AnalyticsEvents.intelGenerated(properties))
    }, [])

    const trackFileUploaded = useCallback((properties: { file_type: string; file_size: number; verse_count?: number }) => {
        analytics.track(AnalyticsEvents.fileUploaded(properties))
    }, [])

    // Session & App Lifecycle Analytics
    const trackSessionStart = useCallback((properties: { session_id: string; platform: string; version: string }) => {
        analytics.track(AnalyticsEvents.sessionStart(properties))
    }, [])

    const trackSessionEnd = useCallback((properties: { session_id: string; duration_ms: number }) => {
        analytics.track(AnalyticsEvents.sessionEnd(properties))
    }, [])

    // Social & Squad Features Analytics
    const trackSquadChallengeCreated = useCallback((properties: { challenge_id: string; challenge_type: string; participant_count: number }) => {
        analytics.track(AnalyticsEvents.squadChallengeCreated(properties))
    }, [])

    const trackSquadInvitationSent = useCallback((properties: { invitation_type: string; recipient_count: number }) => {
        analytics.track(AnalyticsEvents.squadInvitationSent(properties))
    }, [])

    const trackSquadChallengeCompleted = useCallback((properties: { challenge_id: string; success: boolean; participant_count: number }) => {
        analytics.track(AnalyticsEvents.squadChallengeCompleted(properties))
    }, [])

    return {
        // Event tracking
        trackEvent,
        trackPracticeStart,
        trackPracticeComplete,
        trackVoiceRecordingStart,
        trackVoiceRecordingComplete,
        trackCampaignStart,
        trackCampaignComplete,
        trackError,
        trackTabSwitch,
        trackUserInteraction,
        trackTiming,
        trackPurchase,
        trackAchievement,

        // Training & Campaign tracking
        trainingModeChanged: trackTrainingModeChanged,
        stealthDrillSelected: trackStealthDrillSelected,
        targetPracticeSelected: trackTargetPracticeSelected,

        // Content Management tracking
        chapterSelected: trackChapterSelected,
        scriptureViewed: trackScriptureViewed,
        intelGenerated: trackIntelGenerated,
        fileUploaded: trackFileUploaded,

        // Session & App Lifecycle tracking
        sessionStart: trackSessionStart,
        sessionEnd: trackSessionEnd,

        // Social & Squad Features tracking
        squadChallengeCreated: trackSquadChallengeCreated,
        squadInvitationSent: trackSquadInvitationSent,
        squadChallengeCompleted: trackSquadChallengeCompleted,

        // Equipment & Arsenal tracking
        arsenalOpened: trackArsenalOpened,
        equipmentItemViewed: trackEquipmentItemViewed,
        equipmentSlotChanged: trackEquipmentSlotChanged,
        arsenalTabSwitched: trackArsenalTabSwitched,

        // Performance tracking
        startPerformanceTimer,
        endPerformanceTimer,

        // Direct analytics access
        analytics
    }
}

// Helper to get current screen name from navigation
function getCurrentScreenName(): string | null {
    // This would need to be implemented based on your navigation setup
    // For now, return null and let individual screens handle their own tracking
    return null
}

// Screen tracking hook for individual components
export const useScreenTracking = (screenName: string) => {
    const { trackEvent } = useAnalytics()

    useFocusEffect(
        useCallback(() => {
            trackEvent(AnalyticsEventType.SCREEN_VIEW, { screen_name: screenName })
        }, [trackEvent, screenName])
    )
}

// Hook for tracking user interactions with retry logic
export const useInteractionTracker = () => {
    const trackInteraction = useCallback(async (
        action: string,
        element: string,
        properties?: Record<string, any>,
        retryCount: number = 3
    ) => {
        for (let i = 0; i < retryCount; i++) {
            try {
                await analytics.trackInteraction(action, element, properties)
                return
            } catch (error) {
                if (i === retryCount - 1) {
                    console.error('Failed to track interaction after retries:', error)
                }
                // Wait a bit before retrying
                await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)))
            }
        }
    }, [])

    return { trackInteraction }
}

export default useAnalytics
