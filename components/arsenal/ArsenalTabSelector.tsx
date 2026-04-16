import React from 'react'
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import { FontAwesome5, FontAwesome } from '@expo/vector-icons'
import { useTheme } from '@/hooks/useTheme'

type ArsenalTab = 'ammunition' | 'equipment' | 'voice'

type ArsenalTabSelectorProps = {
    activeTab: ArsenalTab
    onTabChange: (tab: ArsenalTab) => void
}

export const ArsenalTabSelector: React.FC<ArsenalTabSelectorProps> = ({
    activeTab,
    onTabChange
}) => {
    const { isDark, theme } = useTheme()

    return (
        <View style={
            [
                styles.tabSelector,
                {
                    marginBottom: activeTab === 'equipment' ? 95 : 20,
                    backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.05)',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                }
            ]} >
            <TouchableOpacity
                style={[
                    styles.tabButton,
                    activeTab === 'equipment' && { backgroundColor: theme.accent, borderColor: theme.accent },
                ]}
                onPress={() => onTabChange('equipment')}
            >
                <FontAwesome5 name="shield-alt" size={20} color={activeTab === 'equipment' ? theme.accentContrastText : (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)')} />
                <Text style={[
                    styles.tabButtonText,
                    { color: activeTab === 'equipment' ? theme.accentContrastText : (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)') }
                ]}>
                    ARMORY
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.tabButton,
                    activeTab === 'ammunition' && { backgroundColor: theme.accent, borderColor: theme.accent },
                ]}
                onPress={() => onTabChange('ammunition')}
            >
                <FontAwesome name="book" size={20} color={activeTab === 'ammunition' ? theme.accentContrastText : (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)')} />
                <Text style={[
                    styles.tabButtonText,
                    { color: activeTab === 'ammunition' ? theme.accentContrastText : (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)') }
                ]}>
                    AMMO BANK
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.tabButton,
                    activeTab === 'voice' && { backgroundColor: theme.accent, borderColor: theme.accent },
                ]}
                onPress={() => onTabChange('voice')}
            >
                <FontAwesome5 name="microphone-alt" size={20} color={activeTab === 'voice' ? theme.accentContrastText : (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)')} />
                <Text style={[
                    styles.tabButtonText,
                    { color: activeTab === 'voice' ? theme.accentContrastText : (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)') }
                ]}>
                    VOICE
                </Text>
            </TouchableOpacity>
        </View >
    )
}

const styles = StyleSheet.create({
    tabSelector: {
        flexDirection: 'row',
        borderRadius: 10,
        padding: 4,
        alignSelf: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginTop: 10,
        width: '90%',
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    tabButtonText: {
        fontWeight: 'bold',
        fontSize: 13,
        letterSpacing: 1,
    },
})
