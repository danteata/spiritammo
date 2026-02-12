import React from 'react'
import { View, StyleSheet, Text, Modal, TouchableOpacity } from 'react-native'
import { FontAwesome } from '@expo/vector-icons'
import { useAppStore } from '@/hooks/useAppStore'
import { Collection } from '@/types/scripture'

type DeleteCollectionModalProps = {
    visible: boolean
    collection: Collection | null
    onClose: () => void
    onConfirm: () => void
}

export const DeleteCollectionModal: React.FC<DeleteCollectionModalProps> = ({
    visible,
    collection,
    onClose,
    onConfirm
}) => {
    const { theme, isDark } = useAppStore()

    if (!collection) return null

    const isSystemCollection = collection.isSystem || false

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
                <View style={[styles.modalContent, {
                    backgroundColor: isDark ? 'rgba(20,20,30,0.95)' : theme.surface,
                    borderColor: theme.border || 'rgba(255,255,255,0.1)'
                }]}>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={[styles.iconContainer, {
                            backgroundColor: isSystemCollection ? theme.error || '#ef4444' : theme.warning || '#f59e0b'
                        }]}>
                            <FontAwesome
                                name={isSystemCollection ? "shield" : "trash"}
                                size={24}
                                color="white"
                            />
                        </View>
                        <Text style={[styles.title, { color: theme.text }]}>
                            {isSystemCollection ? 'UNAUTHORIZED ACCESS' : 'DECOMMISSION ARSENAL'}
                        </Text>
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        <Text style={[styles.message, { color: theme.textSecondary }]}>
                            {isSystemCollection ? (
                                <>
                                    <Text style={[styles.bold, { color: theme.error || '#ef4444' }]}>UNAUTHORIZED: System arsenals cannot be decommissioned.</Text>
                                    {'\n\n'}
                                    "{collection.name}" is a default arsenal provided for training operations and cannot be dismantled.
                                </>
                            ) : (
                                <>
                                    CONFIRM OPERATION: Dismantle arsenal <Text style={styles.bold}>"{collection.name}"</Text>?
                                    {'\n\n'}
                                    This will permanently eliminate:
                                    {'\n'}• {collection.scriptures?.length || 0} ammunition rounds
                                    {'\n'}• All combat performance data
                                    {'\n'}• Arsenal specifications and deployment history
                                    {'\n\n'}
                                    <Text style={[styles.warning, { color: theme.error || '#ef4444' }]}>
                                        ⚠️ MISSION IRREVERSIBLE: Operation cannot be aborted once executed.
                                    </Text>
                                </>
                            )}
                        </Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton, {
                                backgroundColor: 'transparent',
                                borderColor: theme.border || 'rgba(255,255,255,0.1)',
                                borderWidth: 1
                            }]}
                            onPress={onClose}
                        >
                            <Text style={[styles.buttonText, { color: theme.textSecondary }]}>ABORT</Text>
                        </TouchableOpacity>
                        {!isSystemCollection && (
                            <TouchableOpacity
                                style={[styles.button, styles.deleteButton, {
                                    backgroundColor: theme.error || '#ef4444'
                                }]}
                                onPress={onConfirm}
                            >
                                <Text style={[styles.buttonText, { color: 'white' }]}>EXECUTE</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                </View>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        maxWidth: 400,
        borderRadius: 16,
        borderWidth: 1,
        padding: 24,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
    },
    content: {
        marginBottom: 24,
    },
    message: {
        fontSize: 14,
        lineHeight: 20,
    },
    bold: {
        fontWeight: 'bold',
    },
    warning: {
        fontWeight: '600',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        minWidth: 80,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: 'transparent',
    },
    deleteButton: {
        backgroundColor: '#ef4444',
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '600',
    },
})
