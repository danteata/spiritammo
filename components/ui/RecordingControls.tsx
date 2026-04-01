import * as React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/hooks/useAppStore';
import { COLORS } from '@/constants/colors';

interface RecordingControlsProps {
    isRecording: boolean;
    isRecognizing: boolean;
    isLoading: boolean;
    onListen?: () => void;
    onToggleRecording: () => void;
    textColor: string;
    hasRecording?: boolean;
    isPlaying?: boolean;
    onTogglePlayback?: () => void;
    isProcessing?: boolean;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
    isRecording,
    isRecognizing,
    isLoading,
    onListen,
    onToggleRecording,
    textColor,
    hasRecording = false,
    isPlaying = false,
    onTogglePlayback,
    isProcessing = false
}) => {
    return (
        <View style={styles.controlsContainer}>
            <View style={styles.leftControls}>
                {onListen && (
                    <TouchableOpacity
                        style={[styles.secondaryButton, { borderColor: textColor }]}
                        onPress={onListen}
                        disabled={isLoading || isProcessing}
                        testID="listen-verse-button"
                    >
                        <Ionicons name="volume-high" size={18} color={textColor} />
                        <Text style={[styles.secondaryButtonText, { color: textColor }]}>LISTEN</Text>
                    </TouchableOpacity>
                )}

                {hasRecording && onTogglePlayback && (
                    <TouchableOpacity
                        style={[styles.secondaryButton, { borderColor: textColor, marginLeft: 8 }]}
                        onPress={onTogglePlayback}
                        disabled={isLoading || isProcessing}
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
                    isRecognizing && styles.listeningButton,
                    isProcessing && styles.processingButton
                ]}
                onPress={onToggleRecording}
                disabled={isLoading || isProcessing}
                testID={isRecording ? "stop-recording-button" : "start-recording-button"}
            >
                {isProcessing ? (
                    <ActivityIndicator size="small" color="white" />
                ) : (
                    <FontAwesome
                        name={isRecording || isRecognizing ? "stop" : "microphone"}
                        size={24}
                        color="white"
                    />
                )}
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
    processingButton: {
        backgroundColor: COLORS.warning,
        opacity: 0.8,
    },
});
