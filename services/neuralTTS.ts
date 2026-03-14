/**
 * Neural TTS Service using Sherpa-ONNX
 * 
 * This service provides high-quality, natural-sounding speech output using the
 * VITS-Piper neural TTS model downloaded from HuggingFace. This is significantly
 * better than device-native TTS which can sound robotic.
 * 
 * Based on the example: react-native-sherpa-onnx-offline-tts with VITS-Piper en_US-ryan-medium
 */

import { NativeModules, Platform, Alert } from 'react-native';
import RNFS from 'react-native-fs';
import * as Speech from 'expo-speech';

// Try to import the native TTS module - will fail gracefully if not available
let TTSManager: any = null;
try {
    TTSManager = require('react-native-sherpa-onnx-offline-tts').default;
} catch (e) {
    console.log('Sherpa-ONNX TTS not available, will use fallback');
}

// Configuration for the VITS-Piper model
const TTS_CONFIG = {
    // HuggingFace repository for VITS-Piper model
    HF_REPO_ID: 'csukuangfj/vits-piper-en_US-ryan-medium',
    HF_REVISION: 'main',

    // Local storage paths
    get modelDir() {
        return `${RNFS.DocumentDirectoryPath}/extracted/vits-piper-en_US-ryan-medium`;
    },
    get modelPath() {
        return `${this.modelDir}/en_US-ryan-medium.onnx`;
    },
    get tokensPath() {
        return `${this.modelDir}/tokens.txt`;
    },
    get dataDirPath() {
        return `${this.modelDir}/espeak-ng-data`;
    },

    // Default speech parameters
    defaultSpeed: 0.85,
    defaultSid: 0,
};

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
    private isInitialized: boolean = false;
    private isDownloading: boolean = false;
    private downloadJobId: number | null = null;
    private currentCallbacks: TTSCallbacks | null = null;

    /**
     * Check if the sherpa-onnx native module is available
     */
    isNativeModuleAvailable(): boolean {
        return TTSManager !== null;
    }

    /**
     * Check if the model files are already downloaded
     */
    async areModelsDownloaded(): Promise<boolean> {
        try {
            const modelExists = await RNFS.exists(TTS_CONFIG.modelPath);
            const tokensExist = await RNFS.exists(TTS_CONFIG.tokensPath);
            const dataDirExists = await RNFS.exists(TTS_CONFIG.dataDirPath);

            if (!dataDirExists) return false;

            // Check if espeak-ng-data has files
            const dataDirItems = await RNFS.readDir(TTS_CONFIG.dataDirPath);

            return modelExists && tokensExist && dataDirItems.length > 0;
        } catch (e) {
            console.error('Error checking model files:', e);
            return false;
        }
    }

    /**
     * Initialize the TTS engine - downloads model if needed
     */
    async initialize(callbacks?: TTSCallbacks): Promise<boolean> {
        this.currentCallbacks = callbacks || null;

        // Notify progress
        this.notifyProgress('initializing', 0, 'Checking for existing model...');

        // Check if models are already downloaded
        const modelsExist = await this.areModelsDownloaded();

        if (modelsExist) {
            console.log('Models already exist, initializing TTS...');
            this.notifyProgress('initializing', 50, 'Initializing TTS engine...');
            return await this.initializeTTSEngine();
        }

        // Need to download models
        console.log('Downloading TTS models...');
        this.notifyProgress('downloading', 0, 'Starting model download...');
        return await this.downloadAndInitialize();
    }

    /**
     * Initialize the native TTS engine with the model
     */
    private async initializeTTSEngine(): Promise<boolean> {
        if (!TTSManager) {
            console.log('Native module not available, using fallback');
            this.isInitialized = false;
            return false;
        }

        try {
            const modelIdJson = JSON.stringify({
                modelPath: TTS_CONFIG.modelPath,
                tokensPath: TTS_CONFIG.tokensPath,
                dataDirPath: TTS_CONFIG.dataDirPath,
            });

            await TTSManager.initialize(modelIdJson);
            this.isInitialized = true;
            this.notifyProgress('ready', 100, 'TTS ready');
            console.log('TTS Initialized Successfully with VITS-Piper model');
            return true;
        } catch (e: any) {
            console.error('Failed to initialize TTS:', e);
            this.isInitialized = false;
            this.notifyError(new Error(e?.message || 'Failed to initialize TTS'));
            return false;
        }
    }

    /**
     * Download model files from HuggingFace
     */
    private async downloadAndInitialize(): Promise<boolean> {
        if (this.isDownloading) {
            console.log('Download already in progress');
            return false;
        }

        this.isDownloading = true;

        try {
            // Get file list from HuggingFace API
            this.notifyProgress('downloading', 5, 'Fetching model metadata...');

            const hfModelMetaUrl = `https://huggingface.co/api/models/${TTS_CONFIG.HF_REPO_ID}`;
            const metaRes = await fetch(hfModelMetaUrl);

            if (!metaRes.ok) {
                throw new Error(`Failed to fetch HuggingFace metadata: ${metaRes.status}`);
            }

            const metaJson: any = await metaRes.json();
            const siblings: Array<{ rfilename: string; size?: number }> = metaJson?.siblings || [];

            // Build list of files to download
            const requiredFiles = [
                'en_US-ryan-medium.onnx',
                'tokens.txt',
                ...siblings
                    .map((s) => s.rfilename)
                    .filter((name) => name.startsWith('espeak-ng-data/')),
            ];

            // Deduplicate while preserving order
            const seen = new Set<string>();
            const filesToDownload = requiredFiles.filter((f) => {
                if (seen.has(f)) return false;
                seen.add(f);
                return true;
            });

            // Build size map
            const sizeByFile = new Map<string, number>();
            for (const s of siblings) {
                if (s?.rfilename && s?.size) {
                    sizeByFile.set(s.rfilename, s.size);
                }
            }

            const totalBytes = filesToDownload.reduce(
                (sum, f) => sum + (sizeByFile.get(f) ?? 0),
                0
            );

            // Create model directory
            await RNFS.mkdir(TTS_CONFIG.modelDir);

            // Track progress
            let completedBytes = 0;
            const writtenByFile = new Map<string, number>();

            const updateOverallProgress = () => {
                if (totalBytes <= 0) return;
                let writtenSum = completedBytes;
                for (const v of writtenByFile.values()) writtenSum += v;
                const pct = Math.min(100, (writtenSum / totalBytes) * 100);
                this.notifyProgress('downloading', pct, `Downloading: ${pct.toFixed(0)}%`);
            };

            // Check existing files
            for (const repoPath of filesToDownload) {
                const localPath = `${TTS_CONFIG.modelDir}/${repoPath}`;
                if (await RNFS.exists(localPath)) {
                    completedBytes += sizeByFile.get(repoPath) ?? 0;
                }
            }
            updateOverallProgress();

            // Download each file
            for (const repoPath of filesToDownload) {
                const localPath = `${TTS_CONFIG.modelDir}/${repoPath}`;

                // Skip if already exists
                if (await RNFS.exists(localPath)) {
                    console.log('Already exists:', repoPath);
                    continue;
                }

                // Create directory for file
                const dir = localPath.slice(0, localPath.lastIndexOf('/'));
                await RNFS.mkdir(dir);

                const encodePath = (p: string) => p.split('/').map(encodeURIComponent).join('/');
                const fromUrl = `https://huggingface.co/${TTS_CONFIG.HF_REPO_ID}/resolve/${TTS_CONFIG.HF_REVISION}/${encodePath(repoPath)}?download=true`;

                writtenByFile.set(repoPath, 0);

                // Download file
                const result = await RNFS.downloadFile({
                    fromUrl,
                    toFile: localPath,
                    background: true,
                    discretionary: true,
                    progressDivider: 1,
                }).promise;

                if (result.statusCode !== 200) {
                    throw new Error(`Failed to download ${repoPath}. Status: ${result.statusCode}`);
                }

                completedBytes += sizeByFile.get(repoPath) ?? 0;
                writtenByFile.delete(repoPath);
                updateOverallProgress();
                console.log('Downloaded:', repoPath);
            }

            this.notifyProgress('downloading', 95, 'Model downloaded, initializing...');

            // Initialize TTS engine
            return await this.initializeTTSEngine();
        } catch (e: any) {
            console.error('Error downloading TTS models:', e);
            this.notifyError(new Error(e?.message || 'Failed to download TTS models'));
            return false;
        } finally {
            this.isDownloading = false;
        }
    }

    /**
     * Speak text using the neural TTS engine
     */
    async speak(text: string, options?: { speed?: number; sid?: number }): Promise<void> {
        const speed = options?.speed ?? TTS_CONFIG.defaultSpeed;
        const sid = options?.sid ?? TTS_CONFIG.defaultSid;

        // If native module not available or not initialized, use fallback
        if (!TTSManager || !this.isInitialized) {
            console.log('Using expo-speech fallback');
            return await this.speakWithExpoSpeech(text, speed);
        }

        try {
            this.notifyProgress('playing', 0, 'Playing...');
            this.currentCallbacks?.onStart?.();

            await TTSManager.generateAndPlay(text, sid, speed);

            this.notifyProgress('ready', 100);
            this.currentCallbacks?.onDone?.();
        } catch (e: any) {
            console.error('TTS playback error:', e);
            // Fallback to expo-speech on error
            console.log('Falling back to expo-speech');
            return await this.speakWithExpoSpeech(text, speed);
        }
    }

    /**
     * Generate and save audio to file (for caching or replay)
     */
    async generateAndSave(text: string, savePath?: string): Promise<string | null> {
        if (!TTSManager || !this.isInitialized) {
            console.log('Cannot generate audio: TTS not initialized');
            return null;
        }

        try {
            const outPath = await TTSManager.generateAndSave(
                text,
                savePath?.trim() || undefined
            );
            return outPath;
        } catch (e: any) {
            console.error('Error generating audio:', e);
            return null;
        }
    }

    /**
     * Fallback to expo-speech for basic TTS
     */
    private async speakWithExpoSpeech(text: string, rate: number): Promise<void> {
        return new Promise((resolve, reject) => {
            Speech.speak(text, {
                rate,
                pitch: 1.0,
                onDone: () => {
                    this.currentCallbacks?.onDone?.();
                    resolve();
                },
                onError: (error) => {
                    this.currentCallbacks?.onError?.(new Error(String(error)));
                    reject(error);
                },
            });
        });
    }

    /**
     * Stop any ongoing speech
     */
    async stop(): Promise<void> {
        if (TTSManager) {
            try {
                TTSManager.deinitialize();
                this.isInitialized = false;
            } catch (e) {
                console.error('Error stopping TTS:', e);
            }
        }

        // Also stop expo-speech if playing
        try {
            await Speech.stop();
        } catch (e) {
            console.error('Error stopping expo-speech:', e);
        }
    }

    /**
     * Deinitialize and cleanup
     */
    async deinitialize(): Promise<void> {
        await this.stop();
        this.isInitialized = false;
        this.isDownloading = false;
    }

    /**
     * Get current initialization status
     */
    getStatus(): { isInitialized: boolean; isDownloading: boolean } {
        return {
            isInitialized: this.isInitialized,
            isDownloading: this.isDownloading,
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
 * Use this for simple TTS playback
 */
export async function speakWithNeuralTTS(
    text: string,
    callbacks?: TTSCallbacks
): Promise<void> {
    const service = neuralTTSService;

    // Initialize if needed
    const needsInit = !service.getStatus().isInitialized;
    if (needsInit) {
        const success = await service.initialize(callbacks);
        if (!success) {
            // Fallback to expo-speech if initialization fails
            console.log('TTS initialization failed, using expo-speech fallback');
            await Speech.speak(text, {
                rate: 0.9,
                onStart: callbacks?.onStart,
                onDone: callbacks?.onDone,
                onError: (error) => callbacks?.onError?.(new Error(String(error))),
            });
            return;
        }
    }

    await service.speak(text, { speed: 0.85 });
}
