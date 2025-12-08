import React, { useState } from 'react'
import { Modal, StyleSheet, View, TextInput, TouchableOpacity, ScrollView, Switch, Share } from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import * as Linking from 'expo-linking'
import { useUser } from '@clerk/clerk-expo'

import { } from '@/constants/colors'
import { ThemedText, ThemedCard } from '@/components/Themed'
import ActionButton from '@/components/ActionButton'
import { useAppStore } from '@/hooks/useAppStore'

interface CreateOperationModalProps {
    visible: boolean
    onClose: () => void
}

type OperationType = 'ROUNDS' | 'ACCURACY' | 'STREAK'

export default function CreateOperationModal({ visible, onClose }: CreateOperationModalProps) {
    const { isDark, addSquadChallenge, theme } = useAppStore()
    const { user } = useUser()

    const [title, setTitle] = useState('')
    const [target, setTarget] = useState('')
    const [type, setType] = useState<OperationType>('ROUNDS')
    const [deployImmediately, setDeployImmediately] = useState(false)

    const handleSubmit = async () => {
        if (!title || !target) return

        const newChallenge = {
            id: `chal_${Date.now()}`,
            type,
            title: title.toUpperCase(),
            description: `Squadron goal: Reach ${target} ${type.toLowerCase()}.`,
            targetValue: parseInt(target, 10),
            currentValue: 0,
            reward: 'Custom Badge',
            participants: 1
        }

        addSquadChallenge(newChallenge)

        if (deployImmediately) {
            try {
                const redirectUrl = Linking.createURL('recruit', {
                    queryParams: {
                        commanderId: user?.id || 'unknown',
                        name: user?.firstName || 'Commander',
                        opId: newChallenge.id,
                        opTitle: newChallenge.title,
                        opTarget: newChallenge.targetValue.toString(),
                        opType: newChallenge.type
                    },
                })

                const message = `🚨 ORDERS RECEIVED: Commander ${user?.firstName} has issued a new directive: ${newChallenge.title}.\n\nTarget: ${newChallenge.targetValue} ${newChallenge.type}.\n\nAccept Mission: ${redirectUrl}`

                await Share.share({
                    message: message,
                    title: `Operation: ${newChallenge.title}`,
                    url: redirectUrl
                })
            } catch (error) {
                console.error('Deployment error:', error)
            }
        }

        // Reset
        setTitle('')
        setTarget('')
        setType('ROUNDS')
        setDeployImmediately(false)
        onClose()
    }

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <BlurView intensity={20} style={styles.centeredView}>
                <View style={[styles.modalView, { backgroundColor: isDark ? '#1A1A1A' : '#FFF', borderColor: theme.accent }]}>

                    {/* Header */}
                    <View style={styles.header}>
                        <ThemedText variant="heading" style={{ color: theme.accent }}>NEW OPERATION</ThemedText>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={isDark ? '#FFF' : '#000'} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView>
                        {/* Type Selection */}
                        <ThemedText variant="caption" style={styles.label}>OPERATION TYPE</ThemedText>
                        <View style={styles.row}>
                            {(['ROUNDS', 'ACCURACY', 'STREAK'] as OperationType[]).map((t) => (
                                <TouchableOpacity
                                    key={t}
                                    style={[
                                        styles.typeButton,
                                        type === t && { backgroundColor: theme.accent, borderColor: theme.accent },
                                        { borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }
                                    ]}
                                    onPress={() => setType(t)}
                                >
                                    <ThemedText variant="caption" style={{ color: type === t ? '#000' : (isDark ? '#FFF' : '#000'), fontWeight: 'bold' }}>
                                        {t}
                                    </ThemedText>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Title Input */}
                        <ThemedText variant="caption" style={styles.label}>MISSION CODENAME</ThemedText>
                        <TextInput
                            style={[styles.input, { color: isDark ? '#FFF' : '#000', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }]}
                            placeholder="E.g. OPERATION THUNDER"
                            placeholderTextColor={isDark ? '#666' : '#999'}
                            value={title}
                            onChangeText={setTitle}
                        />

                        {/* Target Input */}
                        <ThemedText variant="caption" style={styles.label}>TARGET VALUE</ThemedText>
                        <TextInput
                            style={[styles.input, { color: isDark ? '#FFF' : '#000', borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }]}
                            placeholder="E.g. 100"
                            placeholderTextColor={isDark ? '#666' : '#999'}
                            value={target}
                            onChangeText={setTarget}
                            keyboardType="numeric"
                        />

                        {/* Mobilize Switch */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 20, padding: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: 8 }}>
                            <View>
                                <ThemedText variant="body" style={{ fontWeight: 'bold' }}>MOBILIZE SQUAD</ThemedText>
                                <ThemedText variant="caption" style={{ opacity: 0.7 }}>Immediately share mission orders.</ThemedText>
                            </View>
                            <Switch
                                trackColor={{ false: "#767577", true: theme.success }}
                                thumbColor={deployImmediately ? "#f4f3f4" : "#f4f3f4"}
                                onValueChange={setDeployImmediately}
                                value={deployImmediately}
                            />
                        </View>

                    </ScrollView>

                    <ActionButton
                        title={deployImmediately ? "AUTHORIZE & DEPLOY" : "AUTHORIZE OPERATION"}
                        subtitle={deployImmediately ? "SEND ORDERS TO SQUAD" : "SAVE TO LOCAL LOGS"}
                        onPress={handleSubmit}
                        style={{ marginTop: 10 }}
                    />
                </View>
            </BlurView>
        </Modal>
    )
}

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        width: '90%',
        borderRadius: 12,
        borderWidth: 1,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    label: {
        marginBottom: 8,
        opacity: 0.7,
        letterSpacing: 1,
    },
    row: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 20,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 6,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 20,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
})
