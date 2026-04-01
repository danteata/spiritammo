/**
 * Neural TTS Service Fallback
 * 
 * This service previously provided high-quality Piper neural TTS.
 * It has been simplified to use standard expo-speech for better stability
 * and reduced bundle size on Android.
 */

import * as Speech from 'expo-speech';

export interface TTSProgress {
    status: 'idle' | 'downloading' | 'initializing' | 'ready' | 'playing' | 'error';
    progress: number; // 0-100
    message?: string;
}

export interface TTSCallbacks {
    onProgress?: (progress: TTSProgress) => void;
    onStart?: () => void;
    onDone?: () => void;
    onError?: (error: Error) => void;
}

class NeuralTTSService {
    private isInitialized: boolean = true;
    private currentCallbacks: TTSCallbacks | null = null;

    /**
     * Check if the native module is available (Always false now)
     */
    isNativeModuleAvailable(): boolean {
        return false;
    }

    /**
     * Check if the model files are already downloaded (Always true now)
     */
    async areModelsDownloaded(): Promise<boolean> {
        return true;
    }

    /**
     * Initialize the TTS engine - Now just a no-op that sets status to ready
     */
    async initialize(callbacks?: TTSCallbacks): Promise<boolean> {
        this.currentCallbacks = callbacks || null;
        this.notifyProgress('ready', 100, 'Standard TTS Ready');
        return true;
    }

    /**
     * Speak text using standard expo-speech
     */
    async speak(text: string, options?: { speed?: number; sid?: number }): Promise<void> {
        const speed = options?.speed ?? 0.85;

        try {
            this.notifyProgress('playing', 0, 'Playing...');
            this.currentCallbacks?.onStart?.();

            await new Promise<void>((resolve, reject) => {
                Speech.speak(text, {
                    rate: speed,
                    pitch: 1.0,
                    onDone: () => {
                        this.notifyProgress('ready', 100);
                        this.currentCallbacks?.onDone?.();
                        resolve();
                    },
                    onError: (error) => {
                        this.notifyError(new Error(String(error)));
                        reject(error);
                    },
                });
            });
        } catch (e: any) {
            console.error('TTS playback error:', e);
            this.notifyError(new Error(e?.message || 'TTS playback failed'));
        }
    }

    /**
     * Generate and save audio to file (Not supported in standard TTS)
     */
    async generateAndSave(text: string, savePath?: string): Promise<string | null> {
        console.warn('generateAndSave is not supported with standard TTS');
        return null;
    }

    /**
     * Stop any ongoing speech
     */
    async stop(): Promise<void> {
        try {
            await Speech.stop();
        } catch (e) {
            console.error('Error stopping speech:', e);
        }
    }

    /**
     * Deinitialize and cleanup
     */
    async deinitialize(): Promise<void> {
        await this.stop();
    }

    /**
     * Get current initialization status
     */
    getStatus(): { isInitialized: boolean; isDownloading: boolean } {
        return {
            isInitialized: true,
            isDownloading: false,
        };
    }

    // Private helper methods
    private notifyProgress(status: TTSProgress['status'], progress: number, message?: string) {
        this.currentCallbacks?.onProgress?.({
            status,
            progress,
            message,
        });
    }

    private notifyError(error: Error) {
        this.notifyProgress('error', 0, error.message);
        this.currentCallbacks?.onError?.(error);
    }
}

// Export singleton instance
const neuralTTSService = new NeuralTTSService();

export default neuralTTSService;

/**
 * Convenience function to speak text with default settings
 */
export async function speakWithNeuralTTS(
    text: string,
    callbacks?: TTSCallbacks
): Promise<void> {
    await neuralTTSService.speak(text);
}
