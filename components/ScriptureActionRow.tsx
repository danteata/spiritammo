import React from 'react'
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native'
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useAppStore } from '@/hooks/useAppStore'
import { MILITARY_TYPOGRAPHY } from '@/constants/colors'

interface ScriptureActionRowProps {
  onStealth?: () => void
  onIntel?: () => void
  isLoadingIntel?: boolean
  accentColor?: string
}

export default function ScriptureActionRow({
    onStealth,
    onIntel,
    isLoadingIntel = false,
    accentColor,
}: ScriptureActionRowProps) {
    const { theme, isDark } = useAppStore()

    const hasStealth = Boolean(onStealth)
    const hasIntel = Boolean(onIntel)

    if (!hasStealth && !hasIntel) return null

    const buttonColor = accentColor || theme.accent
    const subtleBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'

    return (
        <View style={styles.container}>
            {hasStealth && (
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: subtleBg, borderColor: theme.border }]}
                    onPress={onStealth}
                >
                    <MaterialCommunityIcons name="incognito" size={18} color={theme.text} />
                    <Text style={[styles.buttonText, MILITARY_TYPOGRAPHY.caption, { color: theme.text }]}>STEALTH DRILL</Text>
                </TouchableOpacity>
            )}
            {hasIntel && (
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: buttonColor, borderColor: buttonColor }]}
                    onPress={onIntel}
                    disabled={isLoadingIntel}
                >
                    {isLoadingIntel ? (
                        <ActivityIndicator size="small" color={theme.accentContrastText} />
                    ) : (
                        <FontAwesome5 name="brain" size={16} color={theme.accentContrastText} />
                    )}
                    <Text style={[styles.buttonText, MILITARY_TYPOGRAPHY.caption, { color: theme.accentContrastText }]}>TACTICAL INTEL</Text>
                </TouchableOpacity>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
        paddingHorizontal: 16,
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    buttonText: {
        letterSpacing: 1,
        fontWeight: 'bold',
    },
})
