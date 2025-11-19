/**
 * Minimal TypeScript wrapper for integrating whisper.cpp.
 *
 * This file intentionally does not include heavy native or WASM bindings.
 * Instead it provides a typed adapter and safe fallbacks so the app can
 * be wired to a future local whisper implementation (WASM/native) or a
 * remote whisper.cpp server.
 *
 * Implementation approaches are documented in WHISPER_INTEGRATION.md.
 */

export type WhisperBackend = 'wasm' | 'native' | 'remote' | 'none';

export interface TranscriptionResult {
  text: string;
  confidence?: number; // optional, whisper.cpp may not provide this for all builds
  language?: string;
}

export interface WhisperOptions {
  backend?: WhisperBackend;
  modelPath?: string; // local path or URL depending on backend
}

class WhisperService {
  private backend: WhisperBackend = 'none';
  private modelPath?: string;
  private initialized = false;
  // Optional remote endpoint used when backend === 'remote'
  private remoteEndpoint?: string;

  constructor() {}

  /** Initialize whisper with options. This is intentionally lightweight and
   * does not load models. Use `downloadModel` or a native/WASM loader in a
   * concrete implementation. */
  async init(opts: WhisperOptions = {}): Promise<void> {
    this.backend = opts.backend || 'none';
    this.modelPath = opts.modelPath;
    if (opts && (opts as any).remoteEndpoint) {
      this.remoteEndpoint = (opts as any).remoteEndpoint;
    }
    // real implementations would load or prepare model files here
    this.initialized = true;
  }

  isAvailable(): boolean {
    return this.backend !== 'none' && this.initialized;
  }

  /**
   * Transcribe an audio file at a local filesystem path (native) or a URL (web/remote).
   * Concrete backends should override this behavior. The default implementation
   * throws a helpful error describing integration options.
   */
  async transcribeFromFile(path: string): Promise<TranscriptionResult> {
    if (this.backend === 'remote') {
      if (!this.remoteEndpoint) throw new Error('remoteEndpoint not configured for remote backend');

      // In React Native we can use `fetch` with FormData and `react-native-fs` to read files.
      // For simplicity this implementation expects `path` to be a blob URL or file URI that `fetch` can handle.
      try {
        const fd = new FormData();
        // @ts-ignore - FormData accepts Blobs in RN environments
        fd.append('file', {
          uri: path,
          name: 'audio.wav',
          type: 'audio/wav',
        } as any);

        const resp = await fetch(this.remoteEndpoint, {
          method: 'POST',
          body: fd,
          headers: {
            // Let fetch set multipart boundary
          } as any,
        });

        if (!resp.ok) {
          throw new Error(`Remote transcription failed: ${resp.status} ${resp.statusText}`);
        }

        const json = await resp.json();
        return {
          text: json.text || '',
          confidence: json.confidence,
          language: json.language,
        };
      } catch (err: any) {
        throw new Error(`Remote transcription error: ${err?.message || String(err)}`);
      }
    }

    throw new Error(
      `Whisper backend not implemented. Callers should configure a backend (wasm|native|remote) and implement transcription. See WHISPER_INTEGRATION.md for integration steps.`
    );
  }

  /**
   * Transcribe from a raw audio buffer. Buffer format expectations (PCM16, sample rate) must
   * be documented and normalized by the caller or the backend implementation.
   */
  async transcribeFromBuffer(_buffer: ArrayBuffer | Uint8Array): Promise<TranscriptionResult> {
    throw new Error('transcribeFromBuffer not implemented for the chosen backend');
  }

  /**
   * Helper for remote-backend: send audio to a remote whisper.cpp service and receive result.
   * This default implementation is a no-op; adapt to your server API.
   */
  async transcribeRemote(_uploadUrl: string, _audioData: ArrayBuffer): Promise<TranscriptionResult> {
    // Basic implementation: POST audioData as octet-stream to the provided uploadUrl
    try {
      const resp = await fetch(_uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: _audioData as any,
      });

      if (!resp.ok) throw new Error(`Remote transcription failed: ${resp.status}`);
      const json = await resp.json();
      return {
        text: json.text || '',
        confidence: json.confidence,
        language: json.language,
      };
    } catch (err: any) {
      throw new Error(`transcribeRemote error: ${err?.message || String(err)}`);
    }
  }

  /**
   * Optional helper for downloading model files to device storage. Native/WASM
   * integrations may need different placement for models.
   */
  async downloadModel(_url: string, _destinationPath: string): Promise<string> {
    throw new Error('downloadModel not implemented - see WHISPER_INTEGRATION.md for guidance');
  }
}

export const whisperService = new WhisperService();

export default whisperService;
