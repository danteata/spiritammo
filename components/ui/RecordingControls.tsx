import * as React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/hooks/useAppStore';
import { COLORS } from '@/constants/colors';

interface RecordingControlsProps {
    isRecording: boolean;
    isRecognizing: boolean;
    isLoading: boolean;
    onSpeakIntel: () => void;
    onToggleRecording: () => void;
    textColor: string;
    hasRecording?: boolean;
    isPlaying?: boolean;
    onTogglePlayback?: () => void;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
    isRecording,
    isRecognizing,
    isLoading,
    onSpeakIntel,
    onToggleRecording,
    textColor,
    hasRecording = false,
    isPlaying = false,
    onTogglePlayback
}) => {
    return (
        <View style={styles.controlsContainer}>
            <View style={styles.leftControls}>
                <TouchableOpacity
                    style={[styles.secondaryButton, { borderColor: textColor }]}
                    onPress={onSpeakIntel}
                    disabled={isLoading}
                    testID="speak-intel-button"
                >
                    <FontAwesome name="volume-up" size={16} color={textColor} />
                    <Text style={[styles.secondaryButtonText, { color: textColor }]}>PLAY INTEL</Text>
                </TouchableOpacity>

                {hasRecording && onTogglePlayback && (
                    <TouchableOpacity
                        style={[styles.secondaryButton, { borderColor: textColor, marginLeft: 8 }]}
                        onPress={onTogglePlayback}
                        disabled={isLoading}
                        testID="toggle-playback-button"
                    >
                        <FontAwesome name={isPlaying ? "pause" : "play"} size={14} color={textColor} />
                        <Text style={[styles.secondaryButtonText, { color: textColor }]}>
                            {isPlaying ? "PAUSE" : "REPLAY"}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            <TouchableOpacity
                style={[
                    styles.recordButton,
                    isRecording && styles.stopButton,
                    isRecognizing && styles.listeningButton
                ]}
                onPress={onToggleRecording}
                disabled={isLoading}
                testID={isRecording ? "stop-recording-button" : "start-recording-button"}
            >
                <FontAwesome
                    name={isRecording || isRecognizing ? "stop" : "microphone"}
                    size={24}
                    color="white"
                />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    controlsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    leftControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    recordButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.error,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    stopButton: {
        backgroundColor: '#333',
        borderWidth: 2,
        borderColor: COLORS.error,
    },
    listeningButton: {
        backgroundColor: COLORS.warning,
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        opacity: 0.8,
    },
    secondaryButtonText: {
        marginLeft: 8,
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
});
