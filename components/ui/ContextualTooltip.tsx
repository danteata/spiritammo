import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/hooks/useTheme'

const TOOLTIP_PREFIX = 'tooltip_seen_'

interface ContextualTooltipProps {
    id: string
    title: string
    message: string
}

export default function ContextualTooltip({ id, title, message }: ContextualTooltipProps) {
    const { isDark, theme } = useTheme()
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        AsyncStorage.getItem(`${TOOLTIP_PREFIX}${id}`).then((seen) => {
            if (!seen) setVisible(true)
        })
    }, [id])

    const handleDismiss = async () => {
        setVisible(false)
        await AsyncStorage.setItem(`${TOOLTIP_PREFIX}${id}`, 'true')
    }

    if (!visible) return null

    return (
        <View style={[styles.container, {
            backgroundColor: isDark ? 'rgba(30,41,59,0.95)' : 'rgba(241,245,249,0.95)',
            borderColor: theme.accent,
        }]}>
            <View style={styles.header}>
                <Ionicons name="information-circle" size={18} color={theme.accent} />
                <Text style={[styles.title, { color: theme.accent }]}>{title}</Text>
                <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close" size={16} color={theme.textSecondary} />
                </TouchableOpacity>
            </View>
            <Text style={[styles.message, { color: isDark ? '#cbd5e1' : '#475569' }]}>{message}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginVertical: 8,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    title: {
        flex: 1,
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    message: {
        fontSize: 13,
        lineHeight: 18,
    },
})
