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
const WHISPER_ENABLED = process.env.EXPO_PUBLIC_ENABLE_WHISPER === 'true';

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
        if (!WHISPER_ENABLED) {
          console.warn('Whisper init skipped: EXPO_PUBLIC_ENABLE_WHISPER is not enabled');
          return;
        }

        this.isInitializing = true;
        console.log('Initializing Whisper Service...');

        // Dynamically require whisper.rn
        let whisperModule;
        try {
          console.log('Attempting to load whisper.rn native module...');
          whisperModule = require('whisper.rn');
          this.whisperModule = whisperModule;
          console.log('Whisper module loaded successfully. Exported keys:', Object.keys(whisperModule));
        } catch (e) {
          console.error('CRITICAL: Failed to load whisper.rn module:', e);
          const errorMessage = Platform.OS === 'web' 
            ? 'Whisper native module is not available on web. Please use a browser-compatible speech recognition engine.'
            : 'Whisper native module (whisper.rn) was not found in the app bundle. This usually means the native code hasn\'t been linked or the dev client needs to be rebuilt (npx expo run:android/ios).';
          throw new Error(errorMessage);
        }

        const { initWhisper } = whisperModule;

        if (!initWhisper) {
          throw new Error('Whisper module loaded but initWhisper function is missing. Check your whisper.rn version.');
        }

        // Check if model exists
        const modelExists = await FS.exists(MODEL_PATH);
        if (!modelExists) {
          console.log(`Model not found at ${MODEL_PATH}. Initiating download from ${MODEL_URL}...`);
          
          // Ensure directory exists (DocumentDirectoryPath usually exists, but good to be safe)
          const dirPath = MODEL_PATH.substring(0, MODEL_PATH.lastIndexOf('/'));
          const dirExists = await FS.exists(dirPath);
          if (!dirExists) {
            await FS.mkdir(dirPath);
          }

          const download = FS.downloadFile({
            fromUrl: MODEL_URL,
            toFile: MODEL_PATH,
            progress: (res) => {
              const progress = (res.bytesWritten / res.contentLength) * 100;
              if (Math.round(progress) % 10 === 0) { // Log every 10%
                console.log(`Downloading Whisper model: ${progress.toFixed(0)}%`);
              }
            },
          });

          const result = await download.promise;
          if (result.statusCode !== 200) {
            throw new Error(`Failed to download Whisper model: Server returned status ${result.statusCode}`);
          }
          console.log('Whisper model downloaded successfully to:', MODEL_PATH);
        } else {
          console.log('Whisper model already exists at:', MODEL_PATH);
        }

        // Initialize Whisper Context
        console.log('Initializing Whisper context with model...');
        this.context = await initWhisper({
          filePath: MODEL_PATH,
        });

        console.log('✅ Whisper Service successfully initialized and ready!');
      } catch (error) {
        console.error('❌ Whisper Service failed to initialize:', error);
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
