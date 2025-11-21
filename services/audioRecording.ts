import { useState, useCallback, useEffect } from 'react';
import { useAudioRecorder, RecordingConfig } from '@siteed/expo-audio-stream';
import * as FileSystem from 'expo-file-system/legacy';

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

// React hook for audio recording
export function useAudioRecording() {
  const [error, setError] = useState<string | undefined>();
  const [recordingResult, setRecordingResult] = useState<AudioRecordingResult | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | undefined>();

  // Initialize audio recorder from @siteed/expo-audio-stream
  const {
    startRecording: startStreamRecording,
    stopRecording: stopStreamRecording,
    isRecording,
    durationMs
  } = useAudioRecorder({});

  // Start recording
  const startRecording = useCallback(async (options: AudioRecordingOptions = {}) => {
    try {
      if (isRecording) {
        console.warn('Already recording');
        return false;
      }

      setError(undefined);
      setRecordingResult(null);
      setRecordingUri(undefined);

      // Configure for Whisper: 16kHz, 1 channel, PCM 16-bit
      const config: RecordingConfig = {
        sampleRate: 16000,
        channels: 1,
        encoding: 'pcm_16bit',
        interval: 500, // Update analysis every 500ms
        onAudioStream: async (data) => {
          // Optional: Process live audio stream if needed
        },
      };

      const result = await startStreamRecording(config);
      console.log('Recording started with config:', result);

      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      setError(error instanceof Error ? error.message : 'Failed to start recording');
      return false;
    }
  }, [isRecording, startStreamRecording]);

  // Stop recording
  const stopRecording = useCallback(async (): Promise<AudioRecordingResult | null> => {
    try {
      if (!isRecording) {
        console.warn('No active recording');
        return null;
      }

      const result = await stopStreamRecording();

      if (!result || !result.fileUri) {
        throw new Error('No recording URI returned');
      }

      // The library returns file:/ path, ensure it's file:/// for consistency if needed,
      // but usually expo-file-system handles both.
      const uri = result.fileUri;
      setRecordingUri(uri);

      // Get file info
      let fileSize = result.size || 0;
      if (fileSize === 0) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri);
          if (fileInfo.exists && 'size' in fileInfo) {
            fileSize = fileInfo.size;
          }
        } catch (err) {
          console.warn('Could not get file size:', err);
        }
      }

      const finalResult: AudioRecordingResult = {
        uri,
        duration: result.durationMs || durationMs || 0,
        size: fileSize
      };

      setRecordingResult(finalResult);
      setError(undefined);

      return finalResult;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setError(error instanceof Error ? error.message : 'Failed to stop recording');
      return null;
    }
  }, [isRecording, stopStreamRecording, durationMs]);

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
    isRecording,
    error,
    duration: durationMs || 0,
    uri: recordingUri,
    recordingResult,
  };
}
