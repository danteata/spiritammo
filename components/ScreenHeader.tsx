import * as React from 'react'
import { StyleSheet, View, TouchableOpacity, ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ThemedText } from '@/components/Themed'
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
    const { isDark, theme } = useAppStore()

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
                                style={[styles.dash, { color: theme.accent }]}
                            >
                                —
                            </ThemedText>
                            <ThemedText
                                variant="caption"
                                style={[styles.subtitle, { color: theme.accent }]}
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
        paddingHorizontal: 24, // Wider padding
        paddingBottom: 16,
        marginBottom: 8,
        // Optional: Add bottom border for separation if not glass
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    content: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end', // Align text baseline
    },
    textContainer: {
        flex: 1,
    },
    title: {
        marginBottom: 2,
        textAlign: 'left',
        fontSize: 32, // Larger
        letterSpacing: 0.5,
    },
    subtitle: {
        opacity: 0.7,
        letterSpacing: 2, // Wider spacing for "technical" feel
        fontWeight: '500',
        textTransform: 'uppercase',
        fontSize: 12,
    },
    subtitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dash: {
        fontWeight: '900',
        fontSize: 12,
        opacity: 0.5,
    },
    rightAction: {
        marginLeft: 16,
        marginBottom: 4,
    },
})
