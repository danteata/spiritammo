import React from 'react'
import { StyleSheet, View, Text, TouchableOpacity, Modal } from 'react-native'
import { FontAwesome5 } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'

interface AccessDeniedModalProps {
    visible: boolean
    onClose: () => void
    type: 'rank' | 'funds' | 'operation' | 'security'
    requiredRank?: string
    cost?: number
    itemName?: string
    isDark: boolean
    theme: any
}

export const AccessDeniedModal: React.FC<AccessDeniedModalProps> = ({
    visible,
    onClose,
    type,
    requiredRank,
    cost,
    itemName,
    isDark,
    theme,
}) => {
    const isRank = type === 'rank'
    const isOperation = type === 'operation'
    const isSecurity = type === 'security'
    const title = isRank ? 'ACCESS DENIED' : isOperation ? 'MISSION LOCKED' : isSecurity ? 'INTEL COMPROMISED' : 'INSUFFICIENT FUNDS'
    const icon = isRank || isOperation ? 'lock' : isSecurity ? 'shield-alt' : 'coins'
    const color = isRank || isOperation || isSecurity ? '#ef4444' : '#FFD700'

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />

                <View style={[{ width: '100%', maxWidth: 320, backgroundColor: isDark ? '#0f172a' : '#ffffff', borderWidth: 1, borderRadius: 4, alignItems: 'center', paddingBottom: 24, overflow: 'hidden' }, { borderColor: color }]}>
                    {/* Header Bar */}
                    <View style={[styles.headerBar, { backgroundColor: color }]}>
                        <FontAwesome5 name="exclamation-triangle" size={14} color="#000" />
                        <Text style={styles.headerText}>RESTRICTED ASSET</Text>
                        <FontAwesome5 name="exclamation-triangle" size={14} color="#000" />
                    </View>

                    {/* Main Icon */}
                    <View style={[styles.iconContainer, { backgroundColor: `${color}20`, borderColor: color }]}>
                        <FontAwesome5 name={icon} size={32} color={color} />
                    </View>

                    {/* Title */}
                    <Text style={[styles.title, { color }]}>{title}</Text>

                    {/* Message */}
                    <View style={styles.messageContainer}>
                        {isRank ? (
                            <>
                                <Text style={[styles.message, { color: theme.textSecondary }]}>
                                    Clearance level insufficient for:
                                </Text>
                                <Text style={[styles.itemName, { color: theme.text }]}>{itemName}</Text>
                                <View style={[styles.requirementBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                                    <Text style={[styles.reqLabel, { color: theme.textSecondary }]}>REQUIRED RANK</Text>
                                    <Text style={[styles.reqValue, { color: theme.accent }]}>{requiredRank}</Text>
                                </View>
                            </>
                        ) : isOperation ? (
                            <>
                                <Text style={[styles.message, { color: theme.textSecondary }]}>
                                    Operation Status: RESTRICTED
                                </Text>
                                <Text style={[styles.itemName, { color: theme.text }]}>{itemName}</Text>
                                <View style={[styles.requirementBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                                    <Text style={[styles.reqLabel, { color: theme.textSecondary }]}>MISSION REQUIREMENT</Text>
                                    <Text style={[styles.reqValue, { color: theme.accent, fontSize: 14 }]}>
                                        COMPLETE PREVIOUS SECTOR
                                    </Text>
                                </View>
                            </>
                        ) : isSecurity ? (
                            <>
                                <Text style={[styles.message, { color: theme.textSecondary }]}>
                                    Revealing hidden scripture text in collection mode violates collection testing protocol.
                                </Text>
                                <Text style={[styles.itemName, { color: theme.text }]}>COMPROMISED INTEL</Text>
                                <View style={[styles.requirementBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                                    <Text style={[styles.reqLabel, { color: theme.textSecondary }]}>SECURITY PROTOCOL</Text>
                                    <Text style={[styles.reqValue, { color: theme.accent, fontSize: 14 }]}>
                                        RETURN TO COVER IMMEDIATELY
                                    </Text>
                                </View>
                            </>
                        ) : (
                            <>
                                <Text style={[styles.message, { color: theme.textSecondary }]}>
                                    Insufficient resource allocation for:
                                </Text>
                                <Text style={[styles.itemName, { color: theme.text }]}>{itemName}</Text>
                                <View style={[styles.requirementBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                                    <Text style={[styles.reqLabel, { color: theme.textSecondary }]}>REQUIRED FUNDS</Text>
                                    <View style={styles.costRow}>
                                        <FontAwesome5 name="coins" size={12} color="#FFD700" />
                                        <Text style={[styles.reqValue, { color: '#FFD700' }]}>{cost}</Text>
                                    </View>
                                </View>
                            </>
                        )}
                    </View>

                    {/* Action Button */}
                    <TouchableOpacity
                        style={[styles.dismissButton, { borderColor: theme.border }]}
                        onPress={onClose}
                    >
                        <Text style={[styles.dismissText, { color: theme.text }]}>AFFIRMATIVE!</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 320,
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderRadius: 4,
        alignItems: 'center',
        paddingBottom: 24,
        overflow: 'hidden',
    },
    headerBar: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        gap: 8,
    },
    headerText: {
        color: '#000',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        marginVertical: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 16,
    },
    messageContainer: {
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 24,
    },
    message: {
        fontSize: 12,
        marginBottom: 4,
        textAlign: 'center',
    },
    itemName: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 16,
        textAlign: 'center',
    },
    requirementBox: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 12,
        borderRadius: 4,
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    reqLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 4,
    },
    reqValue: {
        fontSize: 18,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    costRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dismissButton: {
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderWidth: 1,
        borderRadius: 2,
    },
    dismissText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
})
