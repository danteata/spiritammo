import { useState, useEffect, useCallback } from 'react';
import {
  useAudioRecorder,
  useAudioRecorderState,
  AudioModule,
  setAudioModeAsync,
  RecordingPresets,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system';

export interface AudioRecordingResult {
  uri: string;
  duration: number;
  size: number;
}

export interface AudioRecordingOptions {
  quality?: 'LOW' | 'MEDIUM' | 'HIGH';
  format?: 'mp4' | 'wav' | 'm4a';
  sampleRate?: number;
  bitRate?: number;
}

export interface AudioRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  uri?: string;
  error?: string;
}

// Note: expo-audio's useAudioRecorder hook uses RecordingPresets
// Quality presets: LOW_QUALITY, MEDIUM_QUALITY, HIGH_QUALITY

// React hook for audio recording
export function useAudioRecording() {
  const [error, setError] = useState<string | undefined>();
  const [recordingResult, setRecordingResult] = useState<AudioRecordingResult | null>(null);

  // Initialize audio recorder with high quality preset
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  
  // Get recorder state (provides isRecording, isPaused, durationMillis, etc.)
  const recorderState = useAudioRecorderState(audioRecorder);

  // Initialize audio system
  const initializeAudio = useCallback(async () => {
    try {
      // Request recording permissions
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        throw new Error('Recording permission denied');
      }

      // Set audio mode
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
      return true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      setError(error instanceof Error ? error.message : 'Failed to initialize audio system');
      return false;
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async (options: AudioRecordingOptions = {}) => {
    try {
      if (recorderState.isRecording) {
        console.warn('Already recording');
        return false;
      }

      const isInitialized = await initializeAudio();
      if (!isInitialized) return false;

      // Prepare and start recording
      await audioRecorder.prepareToRecordAsync();
      await audioRecorder.record();
      
      setError(undefined);
      setRecordingResult(null);

      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      setError(error instanceof Error ? error.message : 'Failed to start recording');
      return false;
    }
  }, [recorderState.isRecording, initializeAudio, audioRecorder]);

  // Stop recording
  const stopRecording = useCallback(async (): Promise<AudioRecordingResult | null> => {
    try {
      if (!recorderState.isRecording) {
        console.warn('No active recording');
        return null;
      }

      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      
      if (!uri) {
        throw new Error('No recording URI available');
      }

      // Get file info using expo-file-system
      let fileSize = 0;
      try {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (fileInfo.exists && 'size' in fileInfo) {
          fileSize = fileInfo.size;
        }
      } catch (err) {
        console.warn('Could not get file size:', err);
      }

      const result: AudioRecordingResult = {
        uri,
        duration: recorderState.durationMillis || 0,
        size: fileSize
      };

      setRecordingResult(result);
      setError(undefined);

      return result;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setError(error instanceof Error ? error.message : 'Failed to stop recording');
      return null;
    }
  }, [recorderState.isRecording, recorderState.durationMillis, audioRecorder]);

  // Delete recording
  const deleteRecording = useCallback(async (uri: string): Promise<boolean> => {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
      return true;
    } catch (error) {
      console.error('Failed to delete recording:', error);
      return false;
    }
  }, []);

  return {
    startRecording,
    stopRecording,
    deleteRecording,
    isRecording: recorderState.isRecording,
    error,
    duration: recorderState.durationMillis || 0,
    uri: audioRecorder.uri,
    recordingResult,
  };
}
