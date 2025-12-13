import React, { useRef, useEffect } from 'react'
import {
    View,
    StyleSheet,
    Animated,
    Easing,
    FlatList,
    TouchableOpacity, Image
} from 'react-native'
import Svg, { Circle, Line, G } from 'react-native-svg'
import { EquipmentSlot } from '@/types/avatar'
import SoldierAvatar from '@/components/SoldierAvatar'
import { SlotButton } from './SlotButton'
import { useAppStore } from '@/hooks/useAppStore'
import { getItemsBySlot, getItemById } from '@/constants/avatarItems'
import { ThemedText } from '@/components/Themed'
import { FontAwesome5 } from '@expo/vector-icons'

interface ArsenalEquipmentProps {
    selectedSlot: EquipmentSlot | null
    onSlotPress: (slotId: EquipmentSlot) => void
    onItemPress: (itemId: string) => void
    avatarInventory: any
    isDark: boolean
    theme: any
}

// Layout Constants
const CONTAINER_SIZE = 300 // Reduced for better vertical fit
const CENTER = CONTAINER_SIZE / 2
const AVATAR_RADIUS = 55
const INNER_ORBIT_RADIUS = 110 // Tightened orbit
const OUTER_ORBIT_RADIUS = 140 // Tightened decoration

const SLOT_DATA = [
    { id: 'head', icon: 'hard-hat', label: 'HEAD', angle: 270 },
    { id: 'communications', icon: 'broadcast-tower', label: 'COMMS', angle: 330 },
    { id: 'background', icon: 'image', label: 'SCENE', angle: 30 },
    { id: 'primary', icon: 'crosshairs', label: 'WEAPON', angle: 90 },
    { id: 'body', icon: 'shield-alt', label: 'BODY', angle: 150 },
    { id: 'legs', icon: 'shoe-prints', label: 'LEGS', angle: 210 },
] as const

export const ArsenalEquipment: React.FC<ArsenalEquipmentProps> = ({
    selectedSlot,
    onSlotPress,
    onItemPress,
    avatarInventory,
    isDark,
    theme,
}) => {
    // Animation for rotation
    const rotateAnim = useRef(new Animated.Value(0)).current

    useEffect(() => {
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 60000, // Very slow rotation for the rings
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start()
    }, [])

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    })

    const reverseSpin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['360deg', '0deg'],
    })

    // Calculate position for a given angle and radius
    const getPosition = (angleDeg: number, radius: number) => {
        const rad = (angleDeg * Math.PI) / 180
        return {
            x: CENTER + radius * Math.cos(rad),
            y: CENTER + radius * Math.sin(rad),
        }
    }

    // Helper to check if item is equipped
    const isSlotEquipped = (slotId: string) => {
        return avatarInventory?.equippedItems?.[slotId] &&
            !avatarInventory.equippedItems[slotId].includes('basic')
    }

    return (
        <View style={styles.container}>
            {/* Upper Section: Orbital Layout (Fixed Height) */}
            <View style={styles.orbitalContainer}>
                {/* SVG Layer for Rings and Connectors */}
                <View style={styles.svgContainer}>
                    <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: spin }] }]}>
                        <Svg height={CONTAINER_SIZE} width={CONTAINER_SIZE}>
                            {/* Outer Decorative Ring */}
                            <Circle
                                cx={CENTER}
                                cy={CENTER}
                                r={OUTER_ORBIT_RADIUS}
                                stroke={theme.border}
                                strokeWidth="1"
                                strokeDasharray="4, 8"
                                opacity={0.3}
                            />

                            {/* Main Orbit Ring */}
                            <Circle
                                cx={CENTER}
                                cy={CENTER}
                                r={INNER_ORBIT_RADIUS}
                                stroke={theme.accent}
                                strokeWidth="1"
                                strokeDasharray="10, 10"
                                opacity={0.2}
                            />

                            {/* Planetary decorative dots on outer ring */}
                            {[0, 90, 180, 270].map((angle, i) => {
                                const pos = getPosition(angle, OUTER_ORBIT_RADIUS)
                                return (
                                    <Circle
                                        key={`dot-${i}`}
                                        cx={pos.x}
                                        cy={pos.y}
                                        r={2}
                                        fill={theme.textSecondary}
                                        opacity={0.5}
                                    />
                                )
                            })}
                        </Svg>
                    </Animated.View>

                    {/* Static Connectors Layer (Doesn't rotate) */}
                    <Svg height={CONTAINER_SIZE} width={CONTAINER_SIZE} style={StyleSheet.absoluteFill}>
                        {SLOT_DATA.map((slot) => {
                            const btnPos = getPosition(slot.angle, INNER_ORBIT_RADIUS)
                            const isActive = selectedSlot === slot.id

                            // Calculate start point on avatar circle edge
                            const avatarEdgePos = getPosition(slot.angle, AVATAR_RADIUS + 5) // +5 gap

                            return (
                                <G key={`connector-${slot.id}`}>
                                    <Line
                                        x1={avatarEdgePos.x}
                                        y1={avatarEdgePos.y}
                                        x2={btnPos.x}
                                        y2={btnPos.y}
                                        stroke={isActive ? theme.accent : theme.border}
                                        strokeWidth={isActive ? 2 : 1}
                                        opacity={isActive ? 0.8 : 0.3}
                                    />
                                    {isActive && (
                                        <Circle
                                            cx={avatarEdgePos.x}
                                            cy={avatarEdgePos.y}
                                            r={3}
                                            fill={theme.accent}
                                        />
                                    )}
                                </G>
                            )
                        })}
                    </Svg>
                </View>

                {/* Central Avatar */}
                <View style={styles.avatarContainer}>
                    <SoldierAvatar size="medium" />
                </View>

                {/* Orbital Buttons */}
                {SLOT_DATA.map((slot) => {
                    const pos = getPosition(slot.angle, INNER_ORBIT_RADIUS)
                    // Offset by button radius (approx 22px) + padding
                    const btnSize = 44
                    const left = pos.x - btnSize / 2
                    const top = pos.y - btnSize / 2

                    return (
                        <SlotButton
                            key={slot.id}
                            slot={slot}
                            position={{ left, top }}
                            isSelected={selectedSlot === slot.id}
                            onPress={() => onSlotPress(slot.id as EquipmentSlot)}
                            labelPosition={slot.id === 'head' ? 'above' : 'below'}
                            theme={theme}
                        />
                    )
                })}
            </View>

            {/* Gear Selection List */}
            {selectedSlot && (
                <Animated.View style={[styles.itemsContainer, { opacity: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1] }) }]}>
                    <View style={styles.itemsHeader}>
                        <ThemedText style={styles.itemsTitle}>
                            {SLOT_DATA.find(s => s.id === selectedSlot)?.label} GEAR
                        </ThemedText>
                        <View style={[styles.headerLine, { backgroundColor: theme.border || 'rgba(255,255,255,0.1)' }]} />
                    </View>

                    <FlatList
                        data={getItemsBySlot(selectedSlot as EquipmentSlot)}
                        keyExtractor={(item) => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.itemsListContent}
                        renderItem={({ item }) => {
                            const isOwned = avatarInventory?.ownedItems?.includes(item.id)
                            const isEquipped = avatarInventory?.equippedItems?.[selectedSlot] === item.id

                            return (
                                <TouchableOpacity
                                    style={[
                                        styles.itemCard,
                                        isEquipped && styles.equippedItemCard,
                                        { borderColor: isEquipped ? theme.accent : (theme.border || 'rgba(255,255,255,0.1)') }
                                    ]}
                                    onPress={() => onItemPress(item.id)}
                                >
                                    <View style={styles.itemIconContainer}>
                                        <FontAwesome5
                                            name={(item as any).icon || 'box'}
                                            size={24}
                                            color={isEquipped ? theme.accent : theme.text}
                                        />
                                    </View>

                                    <ThemedText numberOfLines={1} style={styles.itemName}>
                                        {item.name}
                                    </ThemedText>

                                    <View style={styles.itemFooter}>
                                        {isEquipped ? (
                                            <View style={[styles.badge, { backgroundColor: theme.accent }]}>
                                                <ThemedText style={styles.badgeText}>EQUIPPED</ThemedText>
                                            </View>
                                        ) : isOwned ? (
                                            <View style={[styles.badge, { backgroundColor: theme.surfaceHighlight || 'rgba(255,255,255,0.1)' }]}>
                                                <ThemedText style={styles.badgeText}>OWNED</ThemedText>
                                            </View>
                                        ) : (
                                            <View style={styles.costBadge}>
                                                <FontAwesome5 name="coins" size={10} color="#FFD700" />
                                                <ThemedText style={styles.costText}>{item.cost}</ThemedText>
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            )
                        }}
                    />
                </Animated.View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 0,
    },
    orbitalContainer: {
        width: CONTAINER_SIZE,
        height: CONTAINER_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -40, // Pull up solar system significantly
    },
    svgContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarContainer: {
        zIndex: 10,
        elevation: 10,
    },
    itemsContainer: {
        marginTop: 0, // Reduced margin
        width: '100%',
        paddingHorizontal: 20,
        flex: 1, // Allow list to take remaining space
    },
    itemsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    itemsTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1.5,
        opacity: 0.8,
    },
    headerLine: {
        flex: 1,
        height: 1,
        // backgroundColor handled inline
    },
    itemsListContent: {
        paddingRight: 20,
        gap: 12,
        paddingBottom: 100, // Ample space for bottom nav
    },
    itemCard: {
        width: 100,
        height: 140, // Fixed taller height
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 8,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'space-between', // Distribute content
    },
    equippedItemCard: {
        backgroundColor: 'rgba(6, 182, 212, 0.1)', // Cyan tint
    },
    itemIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 4,
    },
    itemName: {
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
    },
    itemFooter: {
        marginTop: 4,
        width: '100%',
        alignItems: 'center',
    },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#000',
    },
    costBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    costText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#FFD700',
    },
})
