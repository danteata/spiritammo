import React, { useState, useEffect } from 'react'
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native'
import { FontAwesome5 } from '@expo/vector-icons'
import { ThemedText } from '../Themed'
import VoicePlaybackService from '@/services/voicePlayback'

interface VoicePlaybackToggleProps {
    isDark: boolean
    theme: any
}

export const VoicePlaybackToggle: React.FC<VoicePlaybackToggleProps> = ({ isDark, theme }) => {
    const [isUsingRecordedVoice, setIsUsingRecordedVoice] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const loadSetting = async () => {
            try {
                const setting = await VoicePlaybackService.isUsingRecordedVoice()
                setIsUsingRecordedVoice(setting)
            } catch (error) {
                console.error('Failed to load voice playback setting:', error)
            } finally {
                setIsLoading(false)
            }
        }

        loadSetting()
    }, [])

    const toggleSetting = async () => {
        try {
            const newSetting = await VoicePlaybackService.toggleUseRecordedVoice()
            setIsUsingRecordedVoice(newSetting)
        } catch (error) {
            console.error('Failed to toggle voice playback setting:', error)
        }
    }

    if (isLoading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="small" color={theme.accent} />
                <ThemedText style={styles.loadingText}>Loading...</ThemedText>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[styles.toggleButton, {
                    backgroundColor: isUsingRecordedVoice ? theme.accent : isDark ? '#374151' : '#D1D5DB'
                }]}
                onPress={toggleSetting}
                activeOpacity={0.8}
            >
                <FontAwesome5
                    name={isUsingRecordedVoice ? 'microphone-alt' : 'volume-up'}
                    size={16}
                    color={isUsingRecordedVoice ? 'white' : theme.accent}
                />
                <ThemedText style={[styles.toggleText, {
                    color: isUsingRecordedVoice ? 'white' : theme.text,
                    marginLeft: 8
                }]}>
                    {isUsingRecordedVoice ? 'USING MY VOICE' : 'USING TTS'}
                </ThemedText>
            </TouchableOpacity>
            <ThemedText style={[styles.descriptionText, { color: theme.textSecondary }]}>
                {isUsingRecordedVoice ? 'Playback your recorded voice' : 'Playback text-to-speech'}
            </ThemedText>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginVertical: 16,
    },
    toggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    descriptionText: {
        fontSize: 12,
        marginTop: 8,
        textAlign: 'center',
        opacity: 0.7,
    },
    loadingText: {
        marginLeft: 8,
        fontSize: 14,
        opacity: 0.7,
    }
})