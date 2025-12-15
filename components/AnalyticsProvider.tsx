import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { analytics, AnalyticsEventType } from '@/services/analytics'
import * as Linking from 'expo-linking'

interface AnalyticsContextType {
    isInitialized: boolean
    trackDeepLink: (url: string) => void
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null)

interface AnalyticsProviderProps {
    children: ReactNode
}

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ children }) => {
    const [isInitialized, setIsInitialized] = useState(false)
    const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState)

    // Initialize analytics on mount
    useEffect(() => {
        const initializeAnalytics = async () => {
            try {
                await analytics.initialize()
                setIsInitialized(true)
                console.log('🎯 AnalyticsProvider: Analytics initialized successfully')
            } catch (error) {
                console.error('Failed to initialize analytics:', error)
            }
        }

        initializeAnalytics()
    }, [])

    // Track app lifecycle events
    useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (appState.match(/inactive|background/) && nextAppState === 'active') {
                // App came to foreground
                analytics.track({
                    name: AnalyticsEventType.APP_FOREGROUND,
                    properties: {
                        timestamp: new Date().toISOString()
                    }
                })
            } else if (appState === 'active' && nextAppState.match(/inactive|background/)) {
                // App went to background
                analytics.track({
                    name: AnalyticsEventType.APP_BACKGROUND,
                    properties: {
                        timestamp: new Date().toISOString()
                    }
                })
            }
            setAppState(nextAppState)
        }

        const subscription = AppState.addEventListener('change', handleAppStateChange)

        return () => {
            subscription?.remove()
        }
    }, [appState])

    // Track deep links
    useEffect(() => {
        const handleDeepLink = (event: { url: string }) => {
            trackDeepLink(event.url)
        }

        const subscription = Linking.addEventListener('url', handleDeepLink)

        // Check for initial URL
        const getInitialURL = async () => {
            try {
                const initialUrl = await Linking.getInitialURL()
                if (initialUrl) {
                    trackDeepLink(initialUrl)
                }
            } catch (error) {
                console.error('Error getting initial URL:', error)
            }
        }

        getInitialURL()

        return () => {
            subscription?.remove()
        }
    }, [])

    const trackDeepLink = (url: string) => {
        analytics.track({
            name: AnalyticsEventType.DEEP_LINK_RECEIVED,
            properties: {
                url,
                timestamp: new Date().toISOString()
            }
        })
    }

    const contextValue: AnalyticsContextType = {
        isInitialized,
        trackDeepLink
    }

    return (
        <AnalyticsContext.Provider value={contextValue}>
            {children}
        </AnalyticsContext.Provider>
    )
}

export const useAnalyticsContext = () => {
    const context = useContext(AnalyticsContext)
    if (!context) {
        throw new Error('useAnalyticsContext must be used within an AnalyticsProvider')
    }
    return context
}

export default AnalyticsProvider
