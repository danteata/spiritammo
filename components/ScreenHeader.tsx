import React from 'react'
import { StyleSheet, View, TouchableOpacity, ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ThemedText } from '@/components/Themed'
import { TACTICAL_THEME, GARRISON_THEME } from '@/constants/colors'
import { useAppStore } from '@/hooks/useAppStore'

interface ScreenHeaderProps {
    title: string
    subtitle?: string
    rightAction?: React.ReactNode
    style?: ViewStyle
}

export default function ScreenHeader({
    title,
    subtitle,
    rightAction,
    style,
}: ScreenHeaderProps) {
    const insets = useSafeAreaInsets()
    const { isDark } = useAppStore()

    return (
        <View
            style={[
                styles.container,
                {
                    paddingTop: insets.top,
                },
                style,
            ]}
        >
            <View style={styles.content}>
                <View style={styles.textContainer}>
                    <ThemedText variant="heading" style={styles.title}>
                        {title}
                    </ThemedText>
                    {subtitle && (
                        <View style={styles.subtitleContainer}>
                            <ThemedText
                                variant="caption"
                                style={[styles.dash, { color: TACTICAL_THEME.accent }]}
                            >
                                —
                            </ThemedText>
                            <ThemedText
                                variant="caption"
                                style={[styles.subtitle, { color: TACTICAL_THEME.accent }]}
                            >
                                {subtitle}
                            </ThemedText>
                        </View>
                    )}
                </View>
                {rightAction && <View style={styles.rightAction}>{rightAction}</View>}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingBottom: 12,
        marginBottom: 0,
    },
    content: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        marginBottom: 4,
        textAlign: 'left',
    },
    subtitle: {
        opacity: 0.9,
        letterSpacing: 0.5,
        fontWeight: '600',
        textTransform: 'uppercase',
        textAlign: 'left',
    },
    subtitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dash: {
        fontWeight: '900',
        fontSize: 16,
    },
    rightAction: {
        marginLeft: 16,
    },
})
