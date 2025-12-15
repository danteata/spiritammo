/**
 * Service-Agnostic Analytics System
 * Provides a unified interface for analytics tracking that can easily switch
 * between different analytics providers (PostHog, Amplitude, Mixpanel, etc.)
 */

export interface AnalyticsEvent {
    name: string
    properties?: Record<string, any>
    timestamp?: Date
}

export interface AnalyticsUserProperties {
    [key: string]: any
}

export interface AnalyticsProvider {
    /**
     * Initialize the analytics provider
     */
    initialize(config: any): Promise<void>

    /**
     * Track an event
     */
    track(event: AnalyticsEvent): Promise<void>

    /**
     * Set user properties
     */
    setUserProperties(properties: AnalyticsUserProperties): Promise<void>

    /**
     * Set user ID
     */
    setUserId(userId: string): Promise<void>

    /**
     * Track screen view
     */
    trackScreen(screenName: string, properties?: Record<string, any>): Promise<void>

    /**
     * Track timing/performance metrics
     */
    trackTiming(name: string, value: number, properties?: Record<string, any>): Promise<void>

    /**
     * Flush pending events (for batching providers)
     */
    flush?(): Promise<void>

    /**
     * Reset user data (for privacy/GDPR compliance)
     */
    reset(): Promise<void>

    /**
     * Enable/disable analytics collection
     */
    setEnabled(enabled: boolean): Promise<void>
}

export enum AnalyticsProviderType {
    POSTHOG = 'posthog',
    AMPLITUDE = 'amplitude',
    MIXPANEL = 'mixpanel',
    FIREBASE = 'firebase',
    SEGMENT = 'segment',
    CONSOLE = 'console', // For development/debugging
    NONE = 'none' // Disabled
}

// Type-safe event definitions
export enum AnalyticsEventType {
    // App Lifecycle
    APP_OPEN = 'app_open',
    APP_BACKGROUND = 'app_background',
    APP_FOREGROUND = 'app_foreground',
    APP_CLOSE = 'app_close',

    // Navigation
    SCREEN_VIEW = 'screen_view',
    TAB_SWITCH = 'tab_switch',

    // Practice & Training
    PRACTICE_START = 'practice_start',
    PRACTICE_COMPLETE = 'practice_complete',
    TARGET_PRACTICE_START = 'target_practice_start',
    TARGET_PRACTICE_COMPLETE = 'target_practice_complete',
    STEALTH_DRILL_START = 'stealth_drill_start',
    STEALTH_DRILL_COMPLETE = 'stealth_drill_complete',
    VOICE_RECORDING_START = 'voice_recording_start',
    VOICE_RECORDING_COMPLETE = 'voice_recording_complete',
    VOICE_PLAYBACK_START = 'voice_playback_start',
    VOICE_PLAYBACK_COMPLETE = 'voice_playback_complete',

    // Collections & Content
    COLLECTION_SELECTED = 'collection_selected',
    CHAPTER_SELECTED = 'chapter_selected',
    SCRIPTURE_VIEWED = 'scripture_viewed',
    INTEL_GENERATED = 'intel_generated',
    FILE_UPLOADED = 'file_uploaded',

    // Campaigns & Missions
    CAMPAIGN_START = 'campaign_start',
    CAMPAIGN_COMPLETE = 'campaign_complete',
    MISSION_START = 'mission_start',
    MISSION_COMPLETE = 'mission_complete',
    NODE_UNLOCKED = 'node_unlocked',
    BRIEFING_VIEWED = 'briefing_viewed',

    // Valor Points & Economy
    VP_EARNED = 'valor_points_earned',
    VP_SPENT = 'valor_points_spent',
    ITEM_PURCHASED = 'item_purchased',
    ITEM_EQUIPPED = 'item_equipped',

    // User Progression
    RANK_ADVANCED = 'rank_advanced',
    ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
    STREAK_MAINTAINED = 'streak_maintained',
    STREAK_BROKEN = 'streak_broken',

    // Settings & Preferences
    SETTING_CHANGED = 'setting_changed',
    THEME_CHANGED = 'theme_changed',
    VOICE_ENGINE_CHANGED = 'voice_engine_changed',

    // Performance & Errors
    ERROR_OCCURRED = 'error_occurred',
    PERFORMANCE_TIMING = 'performance_timing',
    LOADING_TIME = 'loading_time',

    // Social & Sharing
    DEEP_LINK_RECEIVED = 'deep_link_received',
    SHARE_INITIATED = 'share_initiated',

    // Voice Features
    WHISPER_MODEL_LOADED = 'whisper_model_loaded',
    VOICE_LIBRARY_OPENED = 'voice_library_opened',
    RECORDING_DELETED = 'recording_deleted',
    TTS_VOICE_CHANGED = 'tts_voice_changed'
}

// Typed event properties interfaces
export interface BaseEventProperties {
    screen_name?: string
    context?: string
    timestamp?: Date
}

export interface PracticeEventProperties extends BaseEventProperties {
    duration_seconds?: number
    verses_practiced?: number
    average_accuracy?: number
    practice_mode?: string
    collection?: string
}

export interface VoiceEventProperties extends BaseEventProperties {
    recording_duration?: number
    transcription_success?: boolean
    accuracy_score?: number
    voice_engine?: string
}

export interface CampaignEventProperties extends BaseEventProperties {
    campaign_id?: string
    mission_id?: string
    node_id?: string
    difficulty?: string
}

export interface ErrorEventProperties extends BaseEventProperties {
    error_message?: string
    error_code?: string
    component_name?: string
    stack_trace?: string
}

export interface PerformanceEventProperties extends BaseEventProperties {
    operation_name?: string
    duration_ms?: number
    success?: boolean
}

// Typed event helper functions
export const AnalyticsEvents = {
    // Practice & Training
    practiceStart: (properties: PracticeEventProperties = {}) => ({
        name: AnalyticsEventType.PRACTICE_START,
        properties
    }),

    practiceComplete: (properties: PracticeEventProperties = {}) => ({
        name: AnalyticsEventType.PRACTICE_COMPLETE,
        properties
    }),

    // Voice Events
    voiceRecordingStart: (properties: VoiceEventProperties = {}) => ({
        name: AnalyticsEventType.VOICE_RECORDING_START,
        properties
    }),

    voiceRecordingComplete: (properties: VoiceEventProperties = {}) => ({
        name: AnalyticsEventType.VOICE_RECORDING_COMPLETE,
        properties
    }),

    // Campaign Events
    campaignStart: (properties: CampaignEventProperties = {}) => ({
        name: AnalyticsEventType.CAMPAIGN_START,
        properties
    }),

    campaignComplete: (properties: CampaignEventProperties = {}) => ({
        name: AnalyticsEventType.CAMPAIGN_COMPLETE,
        properties
    }),

    // Error Events
    errorOccurred: (properties: ErrorEventProperties = {}) => ({
        name: AnalyticsEventType.ERROR_OCCURRED,
        properties
    }),

    // Performance Events
    performanceTiming: (properties: PerformanceEventProperties = {}) => ({
        name: AnalyticsEventType.PERFORMANCE_TIMING,
        properties
    }),

    // Screen Views
    screenView: (screenName: string, properties: BaseEventProperties = {}) => ({
        name: AnalyticsEventType.SCREEN_VIEW,
        properties: { screen_name: screenName, ...properties }
    }),

    // Tab Switches
    tabSwitch: (fromTab: string, toTab: string, properties: BaseEventProperties = {}) => ({
        name: AnalyticsEventType.TAB_SWITCH,
        properties: { from_tab: fromTab, to_tab: toTab, ...properties }
    }),

    // Rank Advancement
    rankAdvanced: (properties: { new_rank: string; old_rank: string } & BaseEventProperties = { new_rank: '', old_rank: '' }) => ({
        name: AnalyticsEventType.RANK_ADVANCED,
        properties
    })
}

export class AnalyticsService {
    private static instance: AnalyticsService
    private currentProvider: AnalyticsProvider | null = null
    private enabled: boolean = true
    private userId: string | null = null

    private constructor() { }

    static getInstance(): AnalyticsService {
        if (!AnalyticsService.instance) {
            AnalyticsService.instance = new AnalyticsService()
        }
        return AnalyticsService.instance
    }

    /**
     * Initialize analytics with a specific provider
     */
    async initialize(providerType: AnalyticsProviderType, config: any = {}): Promise<void> {
        try {
            // Create provider instance
            const provider = AnalyticsProviderFactory.createProvider(providerType)

            // Initialize provider
            await provider.initialize(config)

            // Set enabled state from config or default
            this.enabled = config.enabled !== false

            this.currentProvider = provider

            console.log(`🎯 Analytics initialized with provider: ${providerType}`)

            // Track app initialization
            await this.track({
                name: 'app_initialized',
                properties: {
                    provider: providerType,
                    platform: config.platform || 'unknown',
                    version: config.version || 'unknown'
                }
            })

        } catch (error) {
            console.error('Failed to initialize analytics:', error)
            // Fallback to console provider for debugging
            this.currentProvider = AnalyticsProviderFactory.createProvider(AnalyticsProviderType.CONSOLE)
            await this.currentProvider.initialize({})
        }
    }

    /**
     * Track an event
     */
    async track(event: AnalyticsEvent): Promise<void> {
        if (!this.enabled || !this.currentProvider) return

        try {
            await this.currentProvider.track({
                ...event,
                timestamp: event.timestamp || new Date()
            })
        } catch (error) {
            console.error('Analytics tracking error:', error)
        }
    }

    /**
     * Track screen view
     */
    async trackScreen(screenName: string, properties: Record<string, any> = {}): Promise<void> {
        await this.track({
            name: 'screen_view',
            properties: {
                screen_name: screenName,
                ...properties
            }
        })
    }

    /**
     * Track user interaction
     */
    async trackInteraction(action: string, element: string, properties: Record<string, any> = {}): Promise<void> {
        await this.track({
            name: 'user_interaction',
            properties: {
                action,
                element,
                ...properties
            }
        })
    }

    /**
     * Track performance metrics
     */
    async trackTiming(name: string, value: number, properties: Record<string, any> = {}): Promise<void> {
        if (!this.enabled || !this.currentProvider) return

        try {
            if (this.currentProvider.trackTiming) {
                await this.currentProvider.trackTiming(name, value, properties)
            } else {
                // Fallback to regular event tracking
                await this.track({
                    name: 'timing',
                    properties: {
                        name,
                        value,
                        ...properties
                    }
                })
            }
        } catch (error) {
            console.error('Analytics timing tracking error:', error)
        }
    }

    /**
     * Set user properties
     */
    async setUserProperties(properties: AnalyticsUserProperties): Promise<void> {
        if (!this.enabled || !this.currentProvider) return

        try {
            await this.currentProvider.setUserProperties(properties)
        } catch (error) {
            console.error('Analytics user properties error:', error)
        }
    }

    /**
     * Set user ID
     */
    async setUserId(userId: string): Promise<void> {
        this.userId = userId

        if (!this.enabled || !this.currentProvider) return

        try {
            await this.currentProvider.setUserId(userId)
        } catch (error) {
            console.error('Analytics user ID error:', error)
        }
    }

    /**
     * Update user profile with app-specific data
     */
    async updateUserProfile(profile: {
        rank?: string
        totalVerses?: number
        averageAccuracy?: number
        streak?: number
        valorPoints?: number
    }): Promise<void> {
        await this.setUserProperties({
            user_rank: profile.rank,
            total_verses_memorized: profile.totalVerses,
            average_accuracy: profile.averageAccuracy,
            current_streak: profile.streak,
            valor_points: profile.valorPoints
        })
    }

    /**
     * Track practice session
     */
    async trackPracticeSession(session: {
        duration: number
        versesPracticed: number
        averageAccuracy: number
        mode: string
        collection?: string
    }): Promise<void> {
        await this.track({
            name: 'practice_session_completed',
            properties: {
                duration_seconds: session.duration,
                verses_practiced: session.versesPracticed,
                average_accuracy: session.averageAccuracy,
                practice_mode: session.mode,
                collection: session.collection
            }
        })
    }

    /**
     * Track achievement unlocked
     */
    async trackAchievement(achievement: {
        id: string
        name: string
        type: string
        rarity?: string
    }): Promise<void> {
        await this.track({
            name: 'achievement_unlocked',
            properties: {
                achievement_id: achievement.id,
                achievement_name: achievement.name,
                achievement_type: achievement.type,
                achievement_rarity: achievement.rarity
            }
        })
    }

    /**
     * Track purchase/conversion
     */
    async trackPurchase(item: {
        id: string
        name: string
        category: string
        cost: number
        currency: string
    }): Promise<void> {
        await this.track({
            name: 'item_purchased',
            properties: {
                item_id: item.id,
                item_name: item.name,
                item_category: item.category,
                cost: item.cost,
                currency: item.currency
            }
        })
    }

    /**
     * Flush events (for batching providers)
     */
    async flush(): Promise<void> {
        if (!this.enabled || !this.currentProvider) return

        try {
            if (this.currentProvider.flush) {
                await this.currentProvider.flush()
            }
        } catch (error) {
            console.error('Analytics flush error:', error)
        }
    }

    /**
     * Reset analytics data (GDPR compliance)
     */
    async reset(): Promise<void> {
        this.userId = null

        if (!this.currentProvider) return

        try {
            await this.currentProvider.reset()
        } catch (error) {
            console.error('Analytics reset error:', error)
        }
    }

    /**
     * Enable/disable analytics
     */
    async setEnabled(enabled: boolean): Promise<void> {
        this.enabled = enabled

        if (!this.currentProvider) return

        try {
            await this.currentProvider.setEnabled(enabled)
        } catch (error) {
            console.error('Analytics setEnabled error:', error)
        }
    }

    /**
     * Get current provider type
     */
    getCurrentProviderType(): AnalyticsProviderType | null {
        if (!this.currentProvider) return null

        // This is a bit hacky but works for our factory pattern
        if (this.currentProvider.constructor.name.includes('PostHog')) {
            return AnalyticsProviderType.POSTHOG
        } else if (this.currentProvider.constructor.name.includes('Amplitude')) {
            return AnalyticsProviderType.AMPLITUDE
        } else if (this.currentProvider.constructor.name.includes('Mixpanel')) {
            return AnalyticsProviderType.MIXPANEL
        } else if (this.currentProvider.constructor.name.includes('Console')) {
            return AnalyticsProviderType.CONSOLE
        }

        return AnalyticsProviderType.NONE
    }

    /**
     * Check if analytics is enabled
     */
    isEnabled(): boolean {
        return this.enabled
    }
}

/**
 * Factory for creating analytics providers
 */
export class AnalyticsProviderFactory {
    static createProvider(type: AnalyticsProviderType): AnalyticsProvider {
        switch (type) {
            case AnalyticsProviderType.POSTHOG:
                return new PostHogProvider()
            case AnalyticsProviderType.AMPLITUDE:
                return new AmplitudeProvider()
            case AnalyticsProviderType.MIXPANEL:
                return new MixpanelProvider()
            case AnalyticsProviderType.FIREBASE:
                return new FirebaseProvider()
            case AnalyticsProviderType.SEGMENT:
                return new SegmentProvider()
            case AnalyticsProviderType.CONSOLE:
                return new ConsoleProvider()
            case AnalyticsProviderType.NONE:
            default:
                return new NoOpProvider()
        }
    }
}

// Provider Implementations

class PostHogProvider implements AnalyticsProvider {
    async initialize(config: any): Promise<void> {
        // Initialize PostHog SDK
        // This would require installing @posthog/react-native
        console.log('📊 Initializing PostHog analytics with config:', config)
        // PostHog.init(config.apiKey, config.options)
    }

    async track(event: AnalyticsEvent): Promise<void> {
        console.log('📊 PostHog track:', event.name, event.properties)
        // PostHog.capture(event.name, event.properties)
    }

    async setUserProperties(properties: AnalyticsUserProperties): Promise<void> {
        console.log('📊 PostHog setUserProperties:', properties)
        // PostHog.identify(null, properties)
    }

    async setUserId(userId: string): Promise<void> {
        console.log('📊 PostHog setUserId:', userId)
        // PostHog.identify(userId)
    }

    async trackScreen(screenName: string, properties?: Record<string, any>): Promise<void> {
        console.log('📊 PostHog trackScreen:', screenName, properties)
        // PostHog.screen(screenName, properties)
    }

    async trackTiming(name: string, value: number, properties?: Record<string, any>): Promise<void> {
        console.log('📊 PostHog trackTiming:', name, value, properties)
        // PostHog.capture('$performance', { name, value, ...properties })
    }

    async reset(): Promise<void> {
        console.log('📊 PostHog reset')
        // PostHog.reset()
    }

    async setEnabled(enabled: boolean): Promise<void> {
        console.log('📊 PostHog setEnabled:', enabled)
        // PostHog.setEnabled(enabled)
    }
}

// Import Amplitude SDK
let amplitude: any = null
let SessionReplayPlugin: any = null

// Dynamically import Amplitude to avoid issues if not installed
try {
    const amplitudeModule = require('@amplitude/analytics-react-native')
    const sessionReplayModule = require('@amplitude/plugin-session-replay-react-native')
    amplitude = amplitudeModule
    SessionReplayPlugin = sessionReplayModule.SessionReplayPlugin
} catch (error) {
    console.warn('Amplitude SDK not available, using mock implementation')
}

class AmplitudeProvider implements AnalyticsProvider {
    async initialize(config: any): Promise<void> {
        console.log('📊 Initializing Amplitude analytics with config:', config)

        if (!amplitude) {
            console.warn('📊 Amplitude SDK not installed, using console fallback')
            return
        }

        try {
            // Initialize Amplitude with React Native specific configuration
            await amplitude.init(config.apiKey, {
                // Disable automatic tracking that might cause issues
                autocapture: false,
                // Use React Native compatible storage
                storageProvider: {
                    isEnabled: true,
                    get: async (key: string) => {
                        const AsyncStorage = require('@react-native-async-storage/async-storage')
                        try {
                            return await AsyncStorage.getItem(key)
                        } catch {
                            return null
                        }
                    },
                    set: async (key: string, value: string) => {
                        const AsyncStorage = require('@react-native-async-storage/async-storage')
                        try {
                            await AsyncStorage.setItem(key, value)
                        } catch {
                            // Ignore storage errors
                        }
                    },
                    remove: async (key: string) => {
                        const AsyncStorage = require('@react-native-async-storage/async-storage')
                        try {
                            await AsyncStorage.removeItem(key)
                        } catch {
                            // Ignore storage errors
                        }
                    },
                    reset: async () => {
                        // Reset not needed for AsyncStorage
                    }
                },
                // Disable cookie-based storage which doesn't work in RN
                cookieStorage: null,
                // Disable server-side rendering features
                serverSideTracking: false,
                // Disable all cookie-related functionality
                disableCookies: true,
                // Force device ID generation to avoid cookie fallback
                deviceId: `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            }).promise

            // Add Session Replay if available
            if (SessionReplayPlugin) {
                await amplitude.add(new SessionReplayPlugin()).promise
                console.log('📊 Amplitude Session Replay enabled')
            }

            console.log('📊 Amplitude initialized successfully')
        } catch (error) {
            console.error('📊 Failed to initialize Amplitude:', error)
            throw error
        }
    }

    async track(event: AnalyticsEvent): Promise<void> {
        if (!amplitude) {
            console.log('📊 Amplitude track (mock):', event.name, event.properties)
            return
        }

        try {
            await amplitude.track(event.name, event.properties).promise
        } catch (error) {
            console.error('📊 Amplitude track error:', error)
        }
    }

    async setUserProperties(properties: AnalyticsUserProperties): Promise<void> {
        if (!amplitude) {
            console.log('📊 Amplitude setUserProperties (mock):', properties)
            return
        }

        try {
            // Use identify() to set user properties in Amplitude
            const identify = new amplitude.Identify()
            Object.entries(properties).forEach(([key, value]) => {
                identify.set(key, value)
            })
            await amplitude.identify(identify).promise
        } catch (error) {
            console.error('📊 Amplitude setUserProperties error:', error)
        }
    }

    async setUserId(userId: string): Promise<void> {
        if (!amplitude) {
            console.log('📊 Amplitude setUserId (mock):', userId)
            return
        }

        try {
            await amplitude.setUserId(userId).promise
        } catch (error) {
            console.error('📊 Amplitude setUserId error:', error)
        }
    }

    async trackScreen(screenName: string, properties?: Record<string, any>): Promise<void> {
        if (!amplitude) {
            console.log('📊 Amplitude trackScreen (mock):', screenName, properties)
            return
        }

        try {
            await amplitude.track('Viewed Screen', { screen_name: screenName, ...properties }).promise
        } catch (error) {
            console.error('📊 Amplitude trackScreen error:', error)
        }
    }

    async trackTiming(name: string, value: number, properties?: Record<string, any>): Promise<void> {
        if (!amplitude) {
            console.log('📊 Amplitude trackTiming (mock):', name, value, properties)
            return
        }

        try {
            await amplitude.track('Timing', { name, value, ...properties }).promise
        } catch (error) {
            console.error('📊 Amplitude trackTiming error:', error)
        }
    }

    async reset(): Promise<void> {
        if (!amplitude) {
            console.log('📊 Amplitude reset (mock)')
            return
        }

        try {
            await amplitude.clearUserProperties().promise
        } catch (error) {
            console.error('📊 Amplitude reset error:', error)
        }
    }

    async setEnabled(enabled: boolean): Promise<void> {
        if (!amplitude) {
            console.log('📊 Amplitude setEnabled (mock):', enabled)
            return
        }

        try {
            await amplitude.setTrackingOptions({ disabled: !enabled }).promise
        } catch (error) {
            console.error('📊 Amplitude setEnabled error:', error)
        }
    }
}

class MixpanelProvider implements AnalyticsProvider {
    async initialize(config: any): Promise<void> {
        console.log('📊 Initializing Mixpanel analytics with config:', config)
        // Mixpanel.init(config.token)
    }

    async track(event: AnalyticsEvent): Promise<void> {
        console.log('📊 Mixpanel track:', event.name, event.properties)
        // Mixpanel.track(event.name, event.properties)
    }

    async setUserProperties(properties: AnalyticsUserProperties): Promise<void> {
        console.log('📊 Mixpanel setUserProperties:', properties)
        // Mixpanel.set(properties)
    }

    async setUserId(userId: string): Promise<void> {
        console.log('📊 Mixpanel setUserId:', userId)
        // Mixpanel.identify(userId)
    }

    async trackScreen(screenName: string, properties?: Record<string, any>): Promise<void> {
        console.log('📊 Mixpanel trackScreen:', screenName, properties)
        // Mixpanel.track('Screen View', { screen_name: screenName, ...properties })
    }

    async trackTiming(name: string, value: number, properties?: Record<string, any>): Promise<void> {
        console.log('📊 Mixpanel trackTiming:', name, value, properties)
        // Mixpanel.track('Timing', { name, value, ...properties })
    }

    async flush(): Promise<void> {
        console.log('📊 Mixpanel flush')
        // Mixpanel.flush()
    }

    async reset(): Promise<void> {
        console.log('📊 Mixpanel reset')
        // Mixpanel.reset()
    }

    async setEnabled(enabled: boolean): Promise<void> {
        console.log('📊 Mixpanel setEnabled:', enabled)
        // Mixpanel.setOptOut(!enabled)
    }
}

class FirebaseProvider implements AnalyticsProvider {
    async initialize(config: any): Promise<void> {
        console.log('📊 Initializing Firebase analytics with config:', config)
        // Firebase.analytics()
    }

    async track(event: AnalyticsEvent): Promise<void> {
        console.log('📊 Firebase track:', event.name, event.properties)
        // FirebaseAnalytics.logEvent(event.name, event.properties)
    }

    async setUserProperties(properties: AnalyticsUserProperties): Promise<void> {
        console.log('📊 Firebase setUserProperties:', properties)
        // Object.entries(properties).forEach(([key, value]) => {
        //   FirebaseAnalytics.setUserProperty(key, value)
        // })
    }

    async setUserId(userId: string): Promise<void> {
        console.log('📊 Firebase setUserId:', userId)
        // FirebaseAnalytics.setUserId(userId)
    }

    async trackScreen(screenName: string, properties?: Record<string, any>): Promise<void> {
        console.log('📊 Firebase trackScreen:', screenName, properties)
        // FirebaseAnalytics.logScreenView({ screen_name: screenName, ...properties })
    }

    async trackTiming(name: string, value: number, properties?: Record<string, any>): Promise<void> {
        console.log('📊 Firebase trackTiming:', name, value, properties)
        // FirebaseAnalytics.logEvent('timing_complete', { name, value_millis: value, ...properties })
    }

    async reset(): Promise<void> {
        console.log('📊 Firebase reset')
        // FirebaseAnalytics.resetAnalyticsData()
    }

    async setEnabled(enabled: boolean): Promise<void> {
        console.log('📊 Firebase setEnabled:', enabled)
        // FirebaseAnalytics.setAnalyticsCollectionEnabled(enabled)
    }
}

class SegmentProvider implements AnalyticsProvider {
    async initialize(config: any): Promise<void> {
        console.log('📊 Initializing Segment analytics with config:', config)
        // Segment.initialize(config.writeKey)
    }

    async track(event: AnalyticsEvent): Promise<void> {
        console.log('📊 Segment track:', event.name, event.properties)
        // Segment.track(event.name, event.properties)
    }

    async setUserProperties(properties: AnalyticsUserProperties): Promise<void> {
        console.log('📊 Segment setUserProperties:', properties)
        // Segment.identify(null, properties)
    }

    async setUserId(userId: string): Promise<void> {
        console.log('📊 Segment setUserId:', userId)
        // Segment.identify(userId)
    }

    async trackScreen(screenName: string, properties?: Record<string, any>): Promise<void> {
        console.log('📊 Segment trackScreen:', screenName, properties)
        // Segment.screen(screenName, properties)
    }

    async trackTiming(name: string, value: number, properties?: Record<string, any>): Promise<void> {
        console.log('📊 Segment trackTiming:', name, value, properties)
        // Segment.track('Timing', { name, value, ...properties })
    }

    async flush(): Promise<void> {
        console.log('📊 Segment flush')
        // Segment.flush()
    }

    async reset(): Promise<void> {
        console.log('📊 Segment reset')
        // Segment.reset()
    }

    async setEnabled(enabled: boolean): Promise<void> {
        console.log('📊 Segment setEnabled:', enabled)
        // Segment.setEnabled(enabled)
    }
}

class ConsoleProvider implements AnalyticsProvider {
    async initialize(config: any): Promise<void> {
        console.log('📊 Console analytics initialized (development mode)')
    }

    async track(event: AnalyticsEvent): Promise<void> {
        console.log(`📊 [ANALYTICS] Event: ${event.name}`, {
            properties: event.properties,
            timestamp: event.timestamp
        })
    }

    async setUserProperties(properties: AnalyticsUserProperties): Promise<void> {
        console.log('📊 [ANALYTICS] User Properties:', properties)
    }

    async setUserId(userId: string): Promise<void> {
        console.log('📊 [ANALYTICS] User ID:', userId)
    }

    async trackScreen(screenName: string, properties?: Record<string, any>): Promise<void> {
        console.log(`📊 [ANALYTICS] Screen View: ${screenName}`, properties)
    }

    async trackTiming(name: string, value: number, properties?: Record<string, any>): Promise<void> {
        console.log(`📊 [ANALYTICS] Timing: ${name} = ${value}ms`, properties)
    }

    async reset(): Promise<void> {
        console.log('📊 [ANALYTICS] Reset')
    }

    async setEnabled(enabled: boolean): Promise<void> {
        console.log(`📊 [ANALYTICS] Enabled: ${enabled}`)
    }
}

class NoOpProvider implements AnalyticsProvider {
    async initialize(config: any): Promise<void> {
        // No-op
    }

    async track(event: AnalyticsEvent): Promise<void> {
        // No-op
    }

    async setUserProperties(properties: AnalyticsUserProperties): Promise<void> {
        // No-op
    }

    async setUserId(userId: string): Promise<void> {
        // No-op
    }

    async trackScreen(screenName: string, properties?: Record<string, any>): Promise<void> {
        // No-op
    }

    async trackTiming(name: string, value: number, properties?: Record<string, any>): Promise<void> {
        // No-op
    }

    async reset(): Promise<void> {
        // No-op
    }

    async setEnabled(enabled: boolean): Promise<void> {
        // No-op
    }
}

// Export singleton instance
export const analytics = AnalyticsService.getInstance()

// Convenience functions for common analytics operations
export const Analytics = {
    // Initialize with environment-based provider
    initialize: async () => {
        const providerType = (process.env.EXPO_PUBLIC_ANALYTICS_PROVIDER as AnalyticsProviderType) || AnalyticsProviderType.CONSOLE
        const config: any = {
            enabled: process.env.EXPO_PUBLIC_ANALYTICS_ENABLED !== 'false',
            version: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
            platform: 'mobile'
        }

        // Provider-specific config from environment
        switch (providerType) {
            case AnalyticsProviderType.POSTHOG:
                config.apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY
                config.host = process.env.EXPO_PUBLIC_POSTHOG_HOST
                break
            case AnalyticsProviderType.AMPLITUDE:
                config.apiKey = process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY
                break
            case AnalyticsProviderType.MIXPANEL:
                config.token = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN
                break
            // Add other provider configs as needed
        }

        await analytics.initialize(providerType, config)
    },

    // Quick access to common events
    Events: {
        // App Lifecycle
        APP_OPEN: 'app_open',
        APP_BACKGROUND: 'app_background',
        APP_FOREGROUND: 'app_foreground',
        APP_CLOSE: 'app_close',

        // Navigation
        SCREEN_VIEW: 'screen_view',
        TAB_SWITCH: 'tab_switch',

        // Practice & Training
        PRACTICE_START: 'practice_start',
        PRACTICE_COMPLETE: 'practice_complete',
        TARGET_PRACTICE_START: 'target_practice_start',
        TARGET_PRACTICE_COMPLETE: 'target_practice_complete',
        STEALTH_DRILL_START: 'stealth_drill_start',
        STEALTH_DRILL_COMPLETE: 'stealth_drill_complete',
        VOICE_RECORDING_START: 'voice_recording_start',
        VOICE_RECORDING_COMPLETE: 'voice_recording_complete',
        VOICE_PLAYBACK_START: 'voice_playback_start',
        VOICE_PLAYBACK_COMPLETE: 'voice_playback_complete',

        // Collections & Content
        COLLECTION_SELECTED: 'collection_selected',
        CHAPTER_SELECTED: 'chapter_selected',
        SCRIPTURE_VIEWED: 'scripture_viewed',
        INTEL_GENERATED: 'intel_generated',
        FILE_UPLOADED: 'file_uploaded',

        // Campaigns & Missions
        CAMPAIGN_START: 'campaign_start',
        CAMPAIGN_COMPLETE: 'campaign_complete',
        MISSION_START: 'mission_start',
        MISSION_COMPLETE: 'mission_complete',
        NODE_UNLOCKED: 'node_unlocked',
        BRIEFING_VIEWED: 'briefing_viewed',

        // Valor Points & Economy
        VP_EARNED: 'valor_points_earned',
        VP_SPENT: 'valor_points_spent',
        ITEM_PURCHASED: 'item_purchased',
        ITEM_EQUIPPED: 'item_equipped',

        // User Progression
        RANK_ADVANCED: 'rank_advanced',
        ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
        STREAK_MAINTAINED: 'streak_maintained',
        STREAK_BROKEN: 'streak_broken',

        // Settings & Preferences
        SETTING_CHANGED: 'setting_changed',
        THEME_CHANGED: 'theme_changed',
        VOICE_ENGINE_CHANGED: 'voice_engine_changed',

        // Performance & Errors
        ERROR_OCCURRED: 'error_occurred',
        PERFORMANCE_TIMING: 'performance_timing',
        LOADING_TIME: 'loading_time',

        // Social & Sharing
        DEEP_LINK_RECEIVED: 'deep_link_received',
        SHARE_INITIATED: 'share_initiated',

        // Voice Features
        WHISPER_MODEL_LOADED: 'whisper_model_loaded',
        VOICE_LIBRARY_OPENED: 'voice_library_opened',
        RECORDING_DELETED: 'recording_deleted',
        TTS_VOICE_CHANGED: 'tts_voice_changed'
    }
}
