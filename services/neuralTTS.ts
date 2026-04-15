import TTSEngine, { TTSOptions } from './ttsEngine'

export interface TTSProgress {
    status: 'idle' | 'downloading' | 'initializing' | 'ready' | 'playing' | 'error';
    progress: number;
    message?: string;
}

export interface TTSCallbacks {
    onProgress?: (progress: TTSProgress) => void;
    onStart?: () => void;
    onDone?: () => void;
    onError?: (error: Error) => void;
}

class NeuralTTSService {
    private currentCallbacks: TTSCallbacks | null = null;

    isNativeModuleAvailable(): boolean {
        return false;
    }

    async areModelsDownloaded(): Promise<boolean> {
        return true;
    }

    async initialize(callbacks?: TTSCallbacks): Promise<boolean> {
        this.currentCallbacks = callbacks || null;
        this.notifyProgress('ready', 100, 'Standard TTS Ready');
        return true;
    }

    async speak(
        text: string,
        options?: {
            speed?: number;
            sid?: number;
            ttsEngine?: 'native' | 'elevenlabs';
            voiceId?: string;
            apiKey?: string;
            scriptureId?: string;
        }
    ): Promise<void> {
        const rate = options?.speed ?? 0.85;

        try {
            this.notifyProgress('playing', 0, 'Playing...');
            this.currentCallbacks?.onStart?.();

            const ttsOptions: TTSOptions = {
                text,
                rate,
                ttsEngine: options?.ttsEngine ?? 'native',
                voiceId: options?.voiceId,
                elevenLabsApiKey: options?.apiKey,
                scriptureId: options?.scriptureId,
                onDone: () => {
                    this.notifyProgress('ready', 100);
                    this.currentCallbacks?.onDone?.();
                },
                onError: (error: Error) => {
                    this.notifyError(error);
                },
            };

            await TTSEngine.speak(ttsOptions);
        } catch (e: any) {
            console.error('TTS playback error:', e);
            this.notifyError(new Error(e?.message || 'TTS playback failed'));
        }
    }

    async generateAndSave(_text: string, _savePath?: string): Promise<string | null> {
        console.warn('generateAndSave is not supported with standard TTS');
        return null;
    }

    async stop(): Promise<void> {
        try {
            await TTSEngine.stop();
        } catch (e) {
            console.error('Error stopping speech:', e);
        }
    }

    async deinitialize(): Promise<void> {
        await this.stop();
    }

    getStatus(): { isInitialized: boolean; isDownloading: boolean } {
        return {
            isInitialized: true,
            isDownloading: false,
        };
    }

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

const neuralTTSService = new NeuralTTSService();

export default neuralTTSService;

export async function speakWithNeuralTTS(
    text: string,
    callbacks?: TTSCallbacks,
    options?: {
        ttsEngine?: 'native' | 'elevenlabs';
        voiceId?: string;
        apiKey?: string;
        scriptureId?: string;
    }
): Promise<void> {
    await neuralTTSService.speak(text, {
        speed: 0.85,
        ...options,
    });
}