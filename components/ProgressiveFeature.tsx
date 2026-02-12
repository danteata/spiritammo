import React from 'react'
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedText } from '@/components/Themed'
import { useUserJourney } from '@/hooks/useUserJourney'

interface ProgressiveFeatureProps {
    feature: string
    children: React.ReactNode
    fallback?: React.ReactNode
    showLocked?: boolean
    lockedMessage?: string
    onPressLocked?: () => void
}

export const ProgressiveFeature: React.FC<ProgressiveFeatureProps> = ({
    feature,
    children,
    fallback = null,
    showLocked = true,
    lockedMessage,
    onPressLocked,
}) => {
    const { theme, isDark } = useAppStore()
    const { isFeatureUnlocked } = useUserJourney()

    const isUnlocked = isFeatureUnlocked(feature)

    if (isUnlocked) {
        return <>{children}</>
    }

    if (!showLocked) {
        return <>{fallback}</>
    }

    return (
        <TouchableOpacity
            style={[styles.lockedContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}
            onPress={onPressLocked}
            disabled={!onPressLocked}
        >
            <View style={styles.lockedContent}>
                <View style={[styles.lockIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                    <Ionicons name="lock-closed" size={20} color={theme.textSecondary} />
                </View>
                <View style={styles.lockedText}>
                    <ThemedText variant="body" style={styles.lockedTitle}>
                        {feature.charAt(0).toUpperCase() + feature.slice(1).replace(/_/g, ' ')}
                    </ThemedText>
                    {lockedMessage && (
                        <ThemedText variant="caption" style={styles.lockedSubtitle}>
                            {lockedMessage}
                        </ThemedText>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    )
}

interface FeatureBadgeProps {
    feature: string
    isNew?: boolean
    isLocked?: boolean
}

export const FeatureBadge: React.FC<FeatureBadgeProps> = ({ feature, isNew, isLocked }) => {
    const { theme } = useAppStore()

    if (isLocked) {
        return (
            <View style={[styles.badge, { backgroundColor: 'rgba(128,128,128,0.2)' }]}>
                <Ionicons name="lock-closed" size={10} color={theme.textSecondary} />
            </View>
        )
    }

    if (isNew) {
        return (
            <View style={[styles.badge, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                <Text style={styles.badgeText}>NEW</Text>
            </View>
        )
    }

    return null
}

const styles = StyleSheet.create({
    lockedContainer: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(128,128,128,0.2)',
        borderStyle: 'dashed',
    },
    lockedContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    lockIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    lockedText: {
        flex: 1,
    },
    lockedTitle: {
        opacity: 0.5,
    },
    lockedSubtitle: {
        opacity: 0.4,
        marginTop: 2,
    },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#22C55E',
    },
})
