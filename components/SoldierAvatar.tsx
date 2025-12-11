// Soldier Avatar Component - Layered paper doll system for The Barracks

import React from 'react'
import {
    View,
    StyleSheet,
    Image,
    Dimensions,
    Text,
} from 'react-native'
import { useAppStore } from '@/hooks/useAppStore'
import { getItemById } from '@/constants/avatarItems'
import { EquipmentSlot } from '@/types/avatar'

const { width } = Dimensions.get('window')
const AVATAR_SIZE = 120 // Main avatar size
const LAYER_OFFSET = 2 // Small offset between layers

interface SoldierAvatarProps {
    size?: 'small' | 'medium' | 'large' // Default medium
    showStats?: boolean
    style?: any
}

export default function SoldierAvatar({
    size = 'medium',
    showStats = false,
    style
}: SoldierAvatarProps) {

    const { avatarInventory, isLoadingAvatar } = useAppStore()

    // Size mappings
    const getSize = () => {
        switch (size) {
            case 'small': return 80
            case 'large': return 160
            default: return AVATAR_SIZE // medium
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

    // Get equipped items with fallback for when avatar data is not loaded yet
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

    // Background layer (bottom)
    const renderBackground = () => {
        if (!backgroundItem) {
            return (
                <View style={[styles.defaultLayer, {
                    width: avatarSize,
                    height: avatarSize,
                    backgroundColor: 'rgba(0,100,0,0.3)', // Forest green background
                    borderRadius: avatarSize / 2,
                }]} />
            )
        }

        return (
            <View style={[styles.layerContainer, {
                width: avatarSize,
                height: avatarSize,
            }]}>
                <View style={[styles.placeholderGear, {
                    backgroundColor: '#4a90e2', // Blue background environment
                    borderColor: '#357abd',
                    borderWidth: 2,
                    borderRadius: avatarSize / 2,
                }]} />
            </View>
        )
    }

    // Body base (mannequin image)
    const renderBodyBase = () => {
        return (
            <View style={[styles.layerContainer, {
                width: avatarSize,
                height: avatarSize,
            }]}>
                <Image
                    source={require('@/assets/images/barracks/mannequin.png')}
                    style={[styles.mannequinImage, {
                        width: avatarSize,
                        height: avatarSize,
                    }]}
                    resizeMode="contain"
                />
            </View>
        )
    }

    // Legs layer
    const renderLegsLayer = () => {
        if (!legsItem) return null

        return (
            <View style={[styles.layerContainer, {
                width: avatarSize - LAYER_OFFSET * 4,
                height: avatarSize,
                left: LAYER_OFFSET * 2,
            }]}>
                <View style={[styles.placeholderGear, {
                    backgroundColor: legsItem.id.includes('cargo') ? '#654321' : '#2F4F4F', // Saddle brown for cargo pants, dark slate for others
                    borderColor: '#8B4513',
                    borderWidth: 2,
                    borderRadius: 4,
                }]} />
            </View>
        )
    }

    // Body layer
    const renderBodyLayer = () => {
        if (!bodyItem) return null

        return (
            <View style={[styles.layerContainer, {
                width: avatarSize - LAYER_OFFSET * 3,
                height: avatarSize * 0.8,
                left: LAYER_OFFSET * 1.5,
                top: LAYER_OFFSET,
            }]}>
                <View style={[styles.placeholderGear, {
                    backgroundColor: bodyItem.id.includes('plate') ? '#2F4F4F' : '#696969', // Dark slate for plates, dim gray for vests
                    borderColor: '#8B4513',
                    borderWidth: 2,
                    borderRadius: 4,
                }]} />
            </View>
        )
    }

    // Head layer
    const renderHeadLayer = () => {
        if (!headItem) return null

        return (
            <View style={[styles.layerContainer, {
                width: avatarSize * 0.4,
                height: avatarSize * 0.35,
                left: avatarSize * 0.3,
                top: LAYER_OFFSET * 2,
            }]}>
                <View style={[styles.placeholderGear, {
                    backgroundColor: headItem.id.includes('salvation') ? '#FFD700' : '#708090', // Gold for salvation, slate gray for others
                    borderColor: '#DAA520',
                    borderWidth: 2,
                    borderTopLeftRadius: avatarSize * 0.15,
                    borderTopRightRadius: avatarSize * 0.15,
                    borderBottomLeftRadius: avatarSize * 0.1,
                    borderBottomRightRadius: avatarSize * 0.1,
                }]} />
            </View>
        )
    }

    // Primary weapon layer
    const renderPrimaryLayer = () => {
        if (!primaryItem) return null

        const isSword = primaryItem.id.includes('sword')

        return (
            <View style={[styles.layerContainer, {
                width: avatarSize * (isSword ? 0.6 : 0.8),
                height: avatarSize * (isSword ? 0.4 : 0.15),
                right: LAYER_OFFSET,
                top: avatarSize * 0.35,
                transform: [{ rotate: isSword ? '-15deg' : '-5deg' }],
            }]}>
                <View style={[styles.placeholderGear, {
                    backgroundColor: isSword ? '#FFD700' : '#2F4F4F', // Gold for sword, dark slate for rifle
                    borderColor: isSword ? '#FFA500' : '#8B4513',
                    borderWidth: 1,
                    borderRadius: isSword ? 2 : 4,
                }]}>
                    {isSword && (
                        <View style={styles.swordHilt}>
                            <View style={[styles.hilt, { width: '30%', height: '100%', backgroundColor: '#8B4513' }]} />
                        </View>
                    )}
                </View>
            </View>
        )
    }

    // Valor Points badge
    const renderVPBadge = () => {
        if (size === 'small' || !showStats) return null

        const valorPoints = avatarInventory?.valorPoints || 100 // Default starting VP

        return (
            <View style={[styles.vpBadge, { right: -10, top: -10 }]}>
                <View style={styles.vpCoin}>
                    <Text style={styles.vpText}>{valorPoints}</Text>
                </View>
            </View>
        )
    }

    return (
        <View style={[styles.container, style]}>
            {/* Main avatar layers */}
            <View style={[styles.avatarFrame, { width: avatarSize, height: avatarSize }]}>

                {/* Background (Bottom layer) */}
                {renderBackground()}

                {/* Body Base (Soldier silhouette) */}
                <View style={styles.overlayContainer}>
                    {renderBodyBase()}
                </View>

                {/* Equipment Layers (in stacking order) */}
                <View style={styles.overlayContainer}>
                    {renderLegsLayer()}
                    {renderBodyLayer()}
                    {renderHeadLayer()}
                    {renderPrimaryLayer()}
                </View>

                {/* Border frame */}
                <View style={[styles.avatarBorder, { width: avatarSize, height: avatarSize }]}>
                    <View style={[styles.avatarBorderInner, { borderRadius: avatarSize / 2 }]} />
                </View>
            </View>

            {/* VP Badge */}
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
    avatarBorder: {
        position: 'absolute',
        top: 0,
        left: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarBorderInner: {
        width: '98%',
        height: '98%',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        backgroundColor: 'transparent',
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
    layerContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    defaultLayer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderGear: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    soldierSilhouette: {
        alignItems: 'center',
        position: 'relative',
    },
    soldierHead: {
        backgroundColor: '#F5DEB3', // Wheat color for skin
        borderWidth: 1,
        borderColor: '#D2B48C',
    },
    soldierBody: {
        backgroundColor: '#8B4513', // Saddle brown for uniform
        borderWidth: 1,
        borderColor: '#654321',
        position: 'absolute',
        left: '50%',
        marginLeft: -10,
        top: 30,
    },
    soldierLegs: {
        position: 'absolute',
        bottom: 0,
    },
    leg: {
        backgroundColor: '#654321',
        borderWidth: 1,
        borderColor: '#4B0000',
        borderRadius: 1,
    },
    soldierArms: {
        position: 'relative',
    },
    arm: {
        backgroundColor: '#F5DEB3',
        borderRadius: 2,
        position: 'absolute',
        left: 0,
    },
    weaponHand: {
        backgroundColor: '#F5DEB3',
        borderWidth: 1,
        borderColor: '#D2B48C',
        position: 'absolute',
        right: 0,
    },
    swordHilt: {
        position: 'absolute',
        right: -5,
        height: '60%',
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    hilt: {
        borderRadius: 1,
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
    },
    vpText: {
        color: '#000',
        fontSize: 12,
        fontWeight: 'bold',
    },
    mannequinImage: {
        borderRadius: 10,
    },
    equipmentImage: {
        position: 'absolute',
        borderRadius: 5,
    }
})
