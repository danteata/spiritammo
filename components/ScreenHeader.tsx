import * as React from 'react'
import { StyleSheet, View, TouchableOpacity, ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ThemedText } from '@/components/Themed'
import { useTheme } from '@/hooks/useTheme'

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
    const { isDark, theme } = useTheme()

    return (
        <View
            style={[
                styles.container,
                {
                    paddingTop: insets.top + 4,
                    borderBottomColor: theme.border,
                },
                style,
            ]}
        >
            {/* Military corner accent - top left */}
            {!isDark && (
                <View style={[styles.cornerAccent, { borderColor: theme.accent }]} />
            )}
            <View style={styles.content}>
                <View style={styles.textContainer}>
                    <ThemedText variant="heading" style={[
                        styles.title,
                        { color: theme.text }
                    ]}>
                        {title}
                    </ThemedText>
                    {subtitle && (
                        <View style={styles.subtitleContainer}>
                            {/* Brass dash accent */}
                            <View style={[
                                styles.accentBar,
                                { backgroundColor: theme.accent }
                            ]} />
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
        paddingHorizontal: 20,
        paddingBottom: 14,
        marginBottom: 4,
        borderBottomWidth: 1,
    },
    cornerAccent: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 24,
        height: 24,
        borderLeftWidth: 3,
        borderTopWidth: 3,
        borderTopLeftRadius: 0,
        opacity: 0.5,
    },
    content: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        marginBottom: 4,
        textAlign: 'left',
        fontSize: 26,
        letterSpacing: 3,
        fontWeight: '900',
    },
    accentBar: {
        width: 20,
        height: 3,
        borderRadius: 2,
    },
    subtitle: {
        opacity: 0.8,
        letterSpacing: 2.5,
        fontWeight: '700',
        textTransform: 'uppercase',
        fontSize: 10,
    },
    subtitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dash: {
        fontWeight: '900',
        fontSize: 14,
        opacity: 0.6,
    },
    rightAction: {
        marginLeft: 16,
        marginBottom: 4,
    },
})
