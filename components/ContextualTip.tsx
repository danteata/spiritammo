import React, { useState, useEffect } from 'react'
import { View, TouchableOpacity, StyleSheet, Animated, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Haptics from 'expo-haptics'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedText } from '@/components/Themed'

interface ContextualTipProps {
    id: string // Unique identifier for tracking if tip was seen
    title: string
    message: string
    icon?: keyof typeof Ionicons.glyphMap
    position?: 'top' | 'bottom'
    onDismiss?: () => void
    onAction?: () => void
    actionText?: string
    showOnce?: boolean // If true, only show once per user
}

export const ContextualTip: React.FC<ContextualTipProps> = ({
    id,
    title,
    message,
    icon = 'information-circle',
    position = 'bottom',
    onDismiss,
    onAction,
    actionText,
    showOnce = true,
}) => {
    const { theme, isDark } = useAppStore()
    const [visible, setVisible] = useState(false)
    const [fadeAnim] = useState(new Animated.Value(0))

    useEffect(() => {
        checkVisibility()
    }, [])

    const checkVisibility = async () => {
        if (showOnce) {
            const seenKey = `@tip_seen_${id}`
            const hasSeen = await AsyncStorage.getItem(seenKey)
            if (hasSeen === 'true') {
                return
            }
        }
        setVisible(true)
        animateIn()
    }

    const animateIn = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { })
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start()
    }

    const handleDismiss = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { })

        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setVisible(false)
        })

        if (showOnce) {
            const seenKey = `@tip_seen_${id}`
            await AsyncStorage.setItem(seenKey, 'true')
        }

        onDismiss?.()
    }

    if (!visible) return null

    return (
        <Animated.View
            style={[
                styles.container,
                position === 'top' ? styles.topPosition : styles.bottomPosition,
                { opacity: fadeAnim },
            ]}
        >
            <View
                style={[
                    styles.tipCard,
                    {
                        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                        borderColor: theme.accent + '40',
                    },
                ]}
            >
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <Ionicons name={icon} size={20} color={theme.accent} />
                    </View>
                    <ThemedText variant="body" style={styles.title}>{title}</ThemedText>
                    <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
                        <Ionicons name="close" size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                </View>

                <ThemedText variant="caption" style={styles.message}>{message}</ThemedText>

                {onAction && actionText && (
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.accent + '20' }]}
                        onPress={() => {
                            handleDismiss()
                            onAction()
                        }}
                    >
                        <ThemedText variant="caption" style={[styles.actionText, { color: theme.accent }]}>
                            {actionText}
                        </ThemedText>
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
    )
}

// Hook for managing contextual tips
export const useContextualTip = () => {
    const markTipAsSeen = async (id: string) => {
        const seenKey = `@tip_seen_${id}`
        await AsyncStorage.setItem(seenKey, 'true')
    }

    const hasSeenTip = async (id: string): Promise<boolean> => {
        const seenKey = `@tip_seen_${id}`
        const hasSeen = await AsyncStorage.getItem(seenKey)
        return hasSeen === 'true'
    }

    const resetAllTips = async () => {
        const keys = await AsyncStorage.getAllKeys()
        const tipKeys = keys.filter(key => key.startsWith('@tip_seen_'))
        await AsyncStorage.multiRemove(tipKeys)
    }

    return {
        markTipAsSeen,
        hasSeenTip,
        resetAllTips,
    }
}

// Predefined tips for common scenarios
export const TIPS = {
    FIRST_DRILL: {
        id: 'first_drill',
        title: 'Ready for Battle!',
        message: 'Tap "Start" to begin practicing your verse. Speak clearly for best accuracy.',
        icon: 'fitness' as const,
    },
    VOICE_RECORDING: {
        id: 'voice_recording',
        title: 'Voice Practice',
        message: 'Recite your verse from memory. The AI will check your accuracy.',
        icon: 'mic' as const,
    },
    COLLECTION_SELECT: {
        id: 'collection_select',
        title: 'Choose Your Collection',
        message: 'Select a collection to practice specific verses.',
        icon: 'folder' as const,
    },
    STREAK_INFO: {
        id: 'streak_info',
        title: 'Keep Your Streak!',
        message: 'Practice daily to maintain your streak and earn bonus points.',
        icon: 'flame' as const,
    },
    ARSENAL_IMPORT: {
        id: 'arsenal_import',
        title: 'Import Verses',
        message: 'Extract verses from PDF files or add them manually.',
        icon: 'document-text' as const,
    },
    RANK_PROGRESS: {
        id: 'rank_progress',
        title: 'Climb the Ranks',
        message: 'Complete drills and maintain accuracy to advance your military rank.',
        icon: 'trophy' as const,
    },
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 1000,
    },
    topPosition: {
        top: 80,
    },
    bottomPosition: {
        bottom: 100,
    },
    tipCard: {
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    iconContainer: {
        marginRight: 10,
    },
    title: {
        flex: 1,
        fontWeight: '600',
    },
    closeButton: {
        padding: 4,
    },
    message: {
        opacity: 0.8,
        lineHeight: 20,
    },
    actionButton: {
        marginTop: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    actionText: {
        fontWeight: '600',
    },
})
