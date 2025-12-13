import React, { useState, useEffect } from 'react'
import {
    View,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Text,
    Alert,
    ActivityIndicator
} from 'react-native'
import { FontAwesome5 } from '@expo/vector-icons'
import { ThemedText, ThemedCard } from './Themed'
import { useAppStore } from '@/hooks/useAppStore'
import VoiceRecordingService from '@/services/voiceRecording'
import { VoiceRecording, VoiceRecordingStats } from '@/types/scripture'

interface VoiceLibraryProps {
    isDark: boolean
    theme: any
}

export const VoiceLibrary: React.FC<VoiceLibraryProps> = ({ isDark, theme }) => {
    const [recordings, setRecordings] = useState<VoiceRecording[]>([])
    const [stats, setStats] = useState<VoiceRecordingStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [playingId, setPlayingId] = useState<string | null>(null)

    useEffect(() => {
        loadRecordings()
    }, [])

    const loadRecordings = async () => {
        try {
            setLoading(true)
            const [allRecordings, storageStats] = await Promise.all([
                VoiceRecordingService.getAllRecordings(),
                VoiceRecordingService.getStorageStats()
            ])
            setRecordings(allRecordings)
            setStats(storageStats)
        } catch (error) {
            console.error('Failed to load recordings:', error)
        } finally {
            setLoading(false)
        }
    }

    const playRecording = async (recording: VoiceRecording) => {
        try {
            if (playingId === recording.id) {
                setPlayingId(null)
                return
            }

            setPlayingId(recording.id)
            const sound = await VoiceRecordingService.playRecording(recording.fileUri)

            // Handle playback completion
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    setPlayingId(null)
                }
            })
        } catch (error) {
            console.error('Failed to play recording:', error)
            setPlayingId(null)
        }
    }

    const deleteRecording = async (recording: VoiceRecording) => {
        Alert.alert(
            'Delete Recording',
            `Delete "${recording.scriptureRef}" recording?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await VoiceRecordingService.deleteRecording(recording.id)
                            await loadRecordings() // Refresh list
                        } catch (error) {
                            console.error('Failed to delete recording:', error)
                        }
                    }
                }
            ]
        )
    }

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString()
    }

    const renderRecordingItem = ({ item }: { item: VoiceRecording }) => (
        <ThemedCard style={styles.recordingItem}>
            <View style={styles.recordingHeader}>
                <View style={styles.recordingInfo}>
                    <ThemedText style={styles.scriptureRef} numberOfLines={1}>
                        {item.scriptureRef}
                    </ThemedText>
                    <View style={styles.recordingMeta}>
                        <ThemedText style={styles.accuracyText}>
                            {item.accuracy}% accuracy
                        </ThemedText>
                        <ThemedText style={styles.dateText}>
                            {formatDate(item.timestamp)}
                        </ThemedText>
                    </View>
                </View>

                <View style={styles.recordingActions}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.accent }]}
                        onPress={() => playRecording(item)}
                    >
                        <FontAwesome5
                            name={playingId === item.id ? 'pause' : 'play'}
                            size={12}
                            color="white"
                        />
                        <Text style={styles.actionButtonText}>
                            {playingId === item.id ? 'PAUSE' : 'PLAY'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
                        onPress={() => deleteRecording(item)}
                    >
                        <FontAwesome5 name="trash" size={12} color="white" />
                        <Text style={styles.actionButtonText}>DELETE</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.recordingFooter}>
                <ThemedText style={styles.fileSize}>
                    {formatFileSize(item.fileSize || 0)}
                </ThemedText>
                {item.tags?.includes('high-accuracy') && (
                    <View style={[styles.tag, { backgroundColor: theme.accent }]}>
                        <FontAwesome5 name="star" size={10} color="white" />
                        <Text style={styles.tagText}>HIGH ACCURACY</Text>
                    </View>
                )}
            </View>
        </ThemedCard>
    )

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.accent} />
                <ThemedText style={styles.loadingText}>Loading voice library...</ThemedText>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            {/* Stats Header */}
            {stats && (
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <ThemedText style={styles.statNumber}>{stats.totalRecordings}</ThemedText>
                        <ThemedText style={styles.statLabel}>Recordings</ThemedText>
                    </View>
                    <View style={styles.statItem}>
                        <ThemedText style={styles.statNumber}>
                            {formatFileSize(stats.totalStorageUsed)}
                        </ThemedText>
                        <ThemedText style={styles.statLabel}>Storage Used</ThemedText>
                    </View>
                    <View style={styles.statItem}>
                        <ThemedText style={styles.statNumber}>{Math.round(stats.averageAccuracy)}%</ThemedText>
                        <ThemedText style={styles.statLabel}>Avg Accuracy</ThemedText>
                    </View>
                </View>
            )}

            {/* Recordings List */}
            {recordings.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <FontAwesome5 name="microphone-slash" size={48} color={theme.textSecondary} />
                    <ThemedText style={styles.emptyTitle}>No Voice Recordings</ThemedText>
                    <ThemedText style={styles.emptyText}>
                        High-accuracy recordings (90%+) will be automatically saved here.
                    </ThemedText>
                </View>
            ) : (
                <FlatList
                    data={recordings}
                    keyExtractor={(item) => item.id}
                    renderItem={renderRecordingItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        opacity: 0.7,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginVertical: 20,
        paddingVertical: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        marginHorizontal: 16,
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        opacity: 0.7,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
        opacity: 0.7,
        paddingHorizontal: 32,
    },
    listContainer: {
        paddingBottom: 100,
    },
    recordingItem: {
        marginHorizontal: 0,
        marginVertical: 4,
        padding: 16,
    },
    recordingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    recordingInfo: {
        flex: 1,
        marginRight: 12,
    },
    scriptureRef: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    recordingMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    accuracyText: {
        fontSize: 12,
        opacity: 0.8,
    },
    dateText: {
        fontSize: 12,
        opacity: 0.6,
    },
    recordingActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        gap: 4,
    },
    actionButtonText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    recordingFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    fileSize: {
        fontSize: 12,
        opacity: 0.6,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    tagText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
})
