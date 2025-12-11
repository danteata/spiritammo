import * as FS from 'react-native-fs';
/*
// Temporarily commented out expo-file-system until we can properly migrate
// import * as FS from 'expo-file-system';
*/

// Define types locally to avoid importing from the library at top level
// These match the types from whisper.rn
interface WhisperContext {
  transcribe: (
    audioFilePath: string,
    options?: {
      language?: string;
      maxLen?: number;
      tokenTimestamps?: boolean;
    }
  ) => Promise<{ promise: Promise<{ result: string; text?: string }> }>;
}

// Check if decodeAudio is available in the module
interface WhisperModule {
  initWhisper: (options: { filePath: string }) => Promise<WhisperContext>;
  decodeAudio?: (filePath: string) => Promise<{ result: number[] }>; // PCM data
}

export interface TranscriptionResult {
  text: string;
  confidence?: number;
  language?: string;
}

// Model configuration
const MODEL_NAME = 'ggml-base.en.bin';
const MODEL_URL = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${MODEL_NAME}`;
const MODEL_PATH = `${FS.DocumentDirectoryPath}/${MODEL_NAME}`;

class WhisperService {
  private context: WhisperContext | null = null;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;
  private whisperModule: any = null;

  constructor() { }

  /**
   * Initialize the Whisper service.
   * This will download the model if it doesn't exist.
   */
  async init(): Promise<void> {
    if (this.context) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        this.isInitializing = true;
        console.log('Initializing Whisper Service...');

        // Dynamically require whisper.rn
        let whisperModule;
        try {
          whisperModule = require('whisper.rn');
          this.whisperModule = whisperModule;
          console.log('Whisper module loaded. Available keys:', Object.keys(whisperModule));
        } catch (e) {
          console.error('Failed to load whisper.rn module:', e);
          throw new Error('Whisper native module not found. Please rebuild the app.');
        }

        const { initWhisper } = whisperModule;

        // Check if model exists
        const modelExists = await FS.exists(MODEL_PATH);
        if (!modelExists) {
          console.log('Model not found. Downloading...', MODEL_URL);
          const download = FS.downloadFile({
            fromUrl: MODEL_URL,
            toFile: MODEL_PATH,
            progress: (res) => {
              const progress = (res.bytesWritten / res.contentLength) * 100;
              console.log(`Downloading model: ${progress.toFixed(0)}%`);
            },
          });

          const result = await download.promise;
          if (result.statusCode !== 200) {
            throw new Error(`Failed to download model: Status ${result.statusCode}`);
          }
          console.log('Model downloaded successfully to:', MODEL_PATH);
        } else {
          console.log('Model found at:', MODEL_PATH);
        }

        // Initialize Whisper Context
        this.context = await initWhisper({
          filePath: MODEL_PATH,
        });

        console.log('Whisper Context Initialized!');
      } catch (error) {
        console.error('Failed to initialize Whisper:', error);
        this.initPromise = null;
        throw error;
      } finally {
        this.isInitializing = false;
      }
    })();

    return this.initPromise;
  }

  isAvailable(): boolean {
    return !!this.context;
  }

  /**
   * Transcribe an audio file using the local Whisper model.
   */
  async transcribeFromFile(path: string): Promise<TranscriptionResult> {
    if (!this.context) {
      // Try to init if not ready
      await this.init();
      if (!this.context) {
        throw new Error('Whisper service not initialized');
      }
    }

    try {
      // Clean path for Android (remove file:// or file:/ prefix)
      let cleanPath = path;
      if (cleanPath.startsWith('file://')) {
        cleanPath = cleanPath.slice(7);
      } else if (cleanPath.startsWith('file:')) {
        cleanPath = cleanPath.slice(5);
      }
      console.log('Transcribing file:', cleanPath);
      const start = Date.now();

      let response;


      // Try standard transcription
      const { promise } = await this.context.transcribe(cleanPath, {
        language: 'en',
        maxLen: 0,
        tokenTimestamps: false,
      });
      response = await promise;

      const duration = Date.now() - start;
      console.log(`Transcription complete in ${duration}ms. Full response:`, JSON.stringify(response));

      // Handle potential different response structures or failures
      if (!response || typeof response !== 'object') {
        throw new Error(`Invalid response from Whisper: ${JSON.stringify(response)}`);
      }

      // @ts-ignore
      const finalText = response.result || response.text || '';

      return {
        text: finalText.trim(),
        confidence: 90,
        language: 'en',
      };
    } catch (error) {
      console.error('Transcription failed:', error);
      throw error;
    }
  }
}

export const whisperService = new WhisperService();
export default whisperService;
