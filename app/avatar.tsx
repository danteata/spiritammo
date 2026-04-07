import React, { useState } from 'react'
import {
    StyleSheet,
    View,
    ScrollView,
    Text,
    Alert,
} from 'react-native'
import { FontAwesome5 } from '@expo/vector-icons'
import { useTheme } from '@/hooks/useTheme'
import useZustandStore from '@/hooks/zustandStore'
import { ThemedContainer, ThemedText } from '@/components/Themed'
import ScreenHeader from '@/components/ScreenHeader'
import { useScreenTracking } from '@/hooks/useAnalytics'
import { ArsenalEquipment } from '@/components/arsenal/ArsenalEquipment'
import { EquipmentSlot } from '@/types/avatar'

export default function AvatarScreen() {
    const { isDark, theme } = useTheme()
    const avatarInventory = useZustandStore((s) => s.avatarInventory)
    const userSettings = useZustandStore((s) => s.userSettings)
    const equipItem = useZustandStore((s) => s.equipItem)
    // Track screen view
    useScreenTracking('avatar')

    const valorPoints = avatarInventory?.valorPoints || 0
    const [selectedSlot, setSelectedSlot] = useState<EquipmentSlot>('primary')

    const handleSlotPress = (slot: EquipmentSlot) => {
        setSelectedSlot(prev => (prev === slot ? null : slot))
    }

    const handleItemPress = async (itemId: string) => {
        if (!selectedSlot) return

        const success = await equipItem(selectedSlot, itemId)
        if (!success) {
            Alert.alert(
                'Locked Equipment',
                'This item is not unlocked yet. Earn more Valor Points to access it.',
                [{ text: 'OK' }]
            )
        }
    }

    return (
        <ThemedContainer style={styles.container}>
            <ScreenHeader
                title="THE BARRACKS"
                subtitle="AVATAR CUSTOMIZATION"
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.sectionHeader}>
                    <ThemedText variant="caption" style={styles.sectionTitle}>
                        EQUIPMENT BAY
                    </ThemedText>
                </View>

                <ArsenalEquipment
                    selectedSlot={selectedSlot}
                    onSlotPress={handleSlotPress}
                    onItemPress={handleItemPress}
                    avatarInventory={avatarInventory}
                    isDark={isDark}
                    theme={theme}
                    valorPoints={valorPoints}
                    soldierName={userSettings?.soldierName}
                />
            </ScrollView>
        </ThemedContainer>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    sectionTitle: {
        letterSpacing: 1.5,
        opacity: 0.7,
    },
})
