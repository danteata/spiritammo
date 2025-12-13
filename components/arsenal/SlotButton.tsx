import React from 'react'
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import { FontAwesome5 } from '@expo/vector-icons'
import { useAppStore } from '@/hooks/useAppStore'
import { GARRISON_THEME } from '@/constants/colors'

type SlotButtonProps = {
    slot: { id: string; icon: string; label: string }
    position: { top: number; left: number }
    isSelected: boolean
    onPress: () => void
    labelPosition: 'above' | 'below'
    theme: any
}

export const SlotButton: React.FC<SlotButtonProps> = ({
    slot,
    position,
    isSelected,
    onPress,
    labelPosition,
    theme
}) => {

    return (
        <TouchableOpacity
            style={[
                styles.slotButton,
                position,
                isSelected && styles.selectedSlot,
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Outer glow ring for selected state */}
            {isSelected && <View style={[styles.glowRing, { borderColor: theme.accent, backgroundColor: `${theme.accent}20` }]} />}

            {/* Button content */}
            <View style={[
                {
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: theme.surface || '#0f172a',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: theme.border || 'rgba(255,255,255,0.2)',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.5,
                    shadowRadius: 6,
                    elevation: 8,
                },
                isSelected && {
                    backgroundColor: `${theme.isDark ? theme.accent : theme.surface}`,
                    borderColor: `${theme.isDark ? theme.accent : theme.surface}`,
                    borderWidth: 3,
                    shadowColor: theme.accent,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.6,
                    shadowRadius: 8,
                    elevation: 10,
                }
            ]}>
                <FontAwesome5
                    name={slot.icon as any}
                    size={18}
                    color={isSelected ? theme.accent : theme.textSecondary}
                />
            </View>

            {/* Label positioned based on prop */}
            <View style={[
                {
                    position: 'absolute',
                    top: 50,
                    backgroundColor: theme.surface || 'rgba(15,23,42,0.95)',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 10,
                    minWidth: 65,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: theme.border || 'rgba(255,255,255,0.1)',
                },
                isSelected && {
                    backgroundColor: `${theme.isDark ? theme.accent : theme.surface}25`,
                    borderWidth: 1.5,
                    borderColor: `${theme.accent}66`,
                },
                labelPosition === 'above' && { top: -30 }
            ]}>
                <Text style={[
                    styles.slotLabelText,
                    { color: isSelected ? theme.accent : theme.textSecondary }
                ]}>
                    {slot.label}
                </Text>
            </View>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    slotButton: {
        position: 'absolute',
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    selectedSlot: {
        // Handled by inner elements
    },
    glowRing: {
        position: 'absolute',
        width: 54,
        height: 54,
        borderRadius: 27,
        borderWidth: 1,
        opacity: 0.5,
        top: -5,
        left: -5,
    },
    slotLabelText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
})
