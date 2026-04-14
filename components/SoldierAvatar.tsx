import React from 'react'
import {
    View,
    StyleSheet,
    Image,
    Dimensions,
    Text,
    Animated,
    Easing,
} from 'react-native'
import { useAppStore } from '@/hooks/useAppStore'
import { getItemById } from '@/constants/avatarItems'
import { EquipmentSlot } from '@/types/avatar'

const { width } = Dimensions.get('window')
const AVATAR_SIZE = 120

const SLOT_COLORS: Record<string, { bg: string; border: string; label: string }> = {
    head: { bg: 'rgba(59, 130, 246, 0.35)', border: '#3B82F6', label: 'H' },
    body: { bg: 'rgba(34, 197, 94, 0.35)', border: '#22C55E', label: 'B' },
    legs: { bg: 'rgba(168, 85, 247, 0.35)', border: '#A855F7', label: 'L' },
    primary: { bg: 'rgba(239, 68, 68, 0.35)', border: '#EF4444', label: 'W' },
    communications: { bg: 'rgba(234, 179, 8, 0.35)', border: '#EAB308', label: 'C' },
    background: { bg: 'rgba(14, 165, 233, 0.25)', border: '#0EA5E9', label: 'BG' },
}

interface SoldierAvatarProps {
    size?: 'small' | 'medium' | 'large'
    showStats?: boolean
    style?: any
}

export default function SoldierAvatar({
    size = 'medium',
    showStats = false,
    style
}: SoldierAvatarProps) {

    const { avatarInventory, isLoadingAvatar, userSettings, isDark, theme } = useAppStore()

    const getSize = () => {
        switch (size) {
            case 'small': return 80
            case 'large': return 160
            default: return AVATAR_SIZE
        }
    }

    const avatarSize = getSize()

    if (isLoadingAvatar) {
        return (
            <View style={[styles.loadingContainer, { width: avatarSize, height: avatarSize }, style]}>
                <View style={[styles.loadingPlaceholder, { width: avatarSize, height: avatarSize }]} />
            </View>
        )
    }

    const equippedItems = avatarInventory?.equippedItems || {
        head: 'helmet_basic',
        body: 'vest_basic',
        legs: 'pants_basic',
        primary: 'rifle_basic',
        background: 'background_basic'
    }

    const headItem = getItemById(equippedItems.head)
    const bodyItem = getItemById(equippedItems.body)
    const legsItem = getItemById(equippedItems.legs)
    const primaryItem = getItemById(equippedItems.primary)
    const backgroundItem = getItemById(equippedItems.background)

    const hasCustomHead = headItem && headItem.id !== 'helmet_basic'
    const hasCustomBody = bodyItem && bodyItem.id !== 'vest_basic'
    const hasCustomLegs = legsItem && legsItem.id !== 'pants_basic'
    const hasCustomPrimary = primaryItem && primaryItem.id !== 'rifle_basic'
    const hasCustomBackground = backgroundItem && backgroundItem.id !== 'background_basic'
    const hasAnyEquipped = hasCustomHead || hasCustomBody || hasCustomLegs || hasCustomPrimary || hasCustomBackground

    const renderBackground = () => {
        const bgColor = hasCustomBackground && backgroundItem
            ? `${SLOT_COLORS.background.bg}`
            : 'rgba(0,100,0,0.3)'

        return (
            <View style={[styles.defaultLayer, {
                width: avatarSize,
                height: avatarSize,
                backgroundColor: bgColor,
                borderRadius: avatarSize / 2,
            }]} />
        )
    }

    const renderEquipmentOverlays = () => {
        if (!hasAnyEquipped) return null

        const overlaySize = avatarSize * 0.35
        const overlays = []

        if (hasCustomHead && headItem) {
            overlays.push(
                <View key="head" style={[styles.equipBadge, {
                    top: avatarSize * 0.05,
                    left: avatarSize * 0.5 - overlaySize / 2,
                    backgroundColor: SLOT_COLORS.head.bg,
                    borderColor: SLOT_COLORS.head.border,
                    width: overlaySize,
                    height: overlaySize * 0.6,
                    borderRadius: overlaySize * 0.15,
                }]}>
                    <Text style={[styles.equipBadgeLabel, { color: SLOT_COLORS.head.border, fontSize: overlaySize * 0.25 }]}>
                        {headItem.name.split(' ').pop()?.charAt(0) || 'H'}
                    </Text>
                </View>
            )
        }

        if (hasCustomBody && bodyItem) {
            overlays.push(
                <View key="body" style={[styles.equipBadge, {
                    top: avatarSize * 0.3,
                    left: avatarSize * 0.5 - overlaySize / 2,
                    backgroundColor: SLOT_COLORS.body.bg,
                    borderColor: SLOT_COLORS.body.border,
                    width: overlaySize,
                    height: overlaySize * 0.7,
                    borderRadius: overlaySize * 0.15,
                }]}>
                    <Text style={[styles.equipBadgeLabel, { color: SLOT_COLORS.body.border, fontSize: overlaySize * 0.2 }]}>
                        {bodyItem.name.split(' ').pop()?.charAt(0) || 'B'}
                    </Text>
                </View>
            )
        }

        if (hasCustomLegs && legsItem) {
            overlays.push(
                <View key="legs" style={[styles.equipBadge, {
                    top: avatarSize * 0.58,
                    left: avatarSize * 0.5 - overlaySize / 2,
                    backgroundColor: SLOT_COLORS.legs.bg,
                    borderColor: SLOT_COLORS.legs.border,
                    width: overlaySize,
                    height: overlaySize * 0.6,
                    borderRadius: overlaySize * 0.15,
                }]}>
                    <Text style={[styles.equipBadgeLabel, { color: SLOT_COLORS.legs.border, fontSize: overlaySize * 0.2 }]}>
                        {legsItem.name.split(' ').pop()?.charAt(0) || 'L'}
                    </Text>
                </View>
            )
        }

        if (hasCustomPrimary && primaryItem) {
            overlays.push(
                <View key="primary" style={[styles.equipBadge, {
                    top: avatarSize * 0.35,
                    right: avatarSize * 0.02,
                    backgroundColor: SLOT_COLORS.primary.bg,
                    borderColor: SLOT_COLORS.primary.border,
                    width: overlaySize * 0.35,
                    height: overlaySize * 0.9,
                    borderRadius: overlaySize * 0.1,
                }]}>
                    <Text style={[styles.equipBadgeLabel, { color: SLOT_COLORS.primary.border, fontSize: overlaySize * 0.2 }]}>
                        {primaryItem.name.split(' ').pop()?.charAt(0) || 'W'}
                    </Text>
                </View>
            )
        }

        return <View style={styles.equipOverlayContainer} pointerEvents="none">{overlays}</View>
    }

    const renderVPBadge = () => {
        if (size === 'small' || !showStats) return null

        const valorPoints = avatarInventory?.valorPoints ?? 0

        return (
            <View style={[styles.vpBadge, { right: -10, top: -10 }]}>
                <View style={styles.vpCoin}>
                    <Text style={[styles.vpText, { color: isDark ? '#000' : theme.text }]}>{valorPoints}</Text>
                </View>
            </View>
        )
    }

    return (
        <View style={[styles.container, style]}>
            <View style={[styles.avatarFrame, { width: avatarSize, height: avatarSize }]}>
                {renderBackground()}
                <View style={styles.overlayContainer}>
                    <Image
                        source={require('@/assets/images/barracks/mannequin.png')}
                        style={[styles.mannequinImage, {
                            width: avatarSize * 0.9,
                            height: avatarSize * 0.9,
                        }]}
                        resizeMode="contain"
                    />
                    {renderEquipmentOverlays()}
                </View>
            </View>

            {userSettings?.soldierName && size !== 'small' && (
                <View style={styles.nameContainer}>
                    <Text style={[styles.soldierName, { color: '#FFD700' }]}>
                        {userSettings.soldierName}
                    </Text>
                </View>
            )}

            {renderVPBadge()}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingPlaceholder: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarFrame: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    overlayContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
    },
    defaultLayer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    mannequinImage: {
        borderRadius: 10,
    },
    equipOverlayContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
    },
    equipBadge: {
        position: 'absolute',
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    equipBadgeLabel: {
        fontWeight: '800',
    },
    vpBadge: {
        position: 'absolute',
        zIndex: 10,
    },
    vpCoin: {
        backgroundColor: '#FFD700',
        borderRadius: 15,
        minWidth: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFA500',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    vpText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    nameContainer: {
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 4,
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,215,0,0.5)',
    },
    soldierName: {
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
        letterSpacing: 1,
        textTransform: 'uppercase',
    }
})
