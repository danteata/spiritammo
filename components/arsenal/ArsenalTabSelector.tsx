import React from 'react'
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import { FontAwesome5, FontAwesome } from '@expo/vector-icons'
import { useAppStore } from '@/hooks/useAppStore'

type ArsenalTab = 'ammunition' | 'equipment'

type ArsenalTabSelectorProps = {
    activeTab: ArsenalTab
    onTabChange: (tab: ArsenalTab) => void
}

export const ArsenalTabSelector: React.FC<ArsenalTabSelectorProps> = ({
    activeTab,
    onTabChange
}) => {
    // Use app store for dynamic theming
    const { isDark } = useAppStore()

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
                    activeTab === 'equipment' && styles.activeMainTab,
                    activeTab === 'equipment' && { backgroundColor: '#FFD700', borderColor: '#FFD700' },
                ]}
                onPress={() => onTabChange('equipment')}
            >
                <FontAwesome5 name="shield-alt" size={20} color={activeTab === 'equipment' ? '#000' : isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'} />
                <Text style={[
                    styles.tabButtonText,
                    { color: activeTab === 'equipment' ? '#000' : isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }
                ]}>
                    ARMORY
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.tabButton,
                    activeTab === 'ammunition' && styles.activeMainTab,
                    activeTab === 'ammunition' && { backgroundColor: '#FFD700', borderColor: '#FFD700' },
                ]}
                onPress={() => onTabChange('ammunition')}
            >
                <FontAwesome name="book" size={20} color={activeTab === 'ammunition' ? '#000' : isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'} />
                <Text style={[
                    styles.tabButtonText,
                    { color: activeTab === 'ammunition' ? '#000' : isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }
                ]}>
                    AMMUNITION
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
    activeMainTab: {
        backgroundColor: '#FFD700',
        borderColor: '#FFD700',
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    tabButtonText: {
        fontWeight: 'bold',
        fontSize: 13,
        letterSpacing: 1,
    },
})
