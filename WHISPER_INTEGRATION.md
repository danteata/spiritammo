# Integrating whisper.cpp into SpiritAmmo

This document explains three practical ways to integrate whisper.cpp (https://github.com/ggerganov/whisper.cpp) into this React Native / Expo project and provides actionable steps for each approach.

Summary of approaches
- WASM (recommended for a fully on-device JS approach): compile whisper.cpp to WebAssembly and use it via a JS wrapper. Works on web and React Native (with extra bundling). No native modules required but models can be large and CPU-bound.
- Native (best performance on iOS/Android): build a native module around whisper.cpp using NDK for Android and a static lib for iOS. Requires a custom dev client and EAS build or prebuilt binaries.
- Remote server (easiest): run whisper.cpp on a server (or local machine) and call it over HTTP. Offloads CPU and model storage, adds network latency and privacy considerations.

Important constraints in this repo
- Project uses Expo with `expo-dev-client` and `expo` SDK ~53. The app currently uses `@react-native-voice/voice` (native) for speech recognition.
- Because this is an Expo-managed app, deep native work requires either ejecting to the bare workflow or using EAS builds with a custom dev client.

Option A — WASM (good tradeoff, easier to prototype)

1) What it is
   - Build whisper.cpp to WebAssembly (wasm) using the CMake/emscripten build from the repo or use community wasm builds.
   - Use a JS wrapper like the browser example in whisper.cpp to load the model and run transcriptions in the JS thread or a WebWorker.

2) Pros
   - Cross-platform (web + native via JS).
   - No native modules required; can work in Expo Web and potentially in React Native using Hermes or JSI if careful.

3) Cons
   - Large model downloads (100s of MBs for larger models).
   - Heavy CPU usage; on-device performance may be slow on low-end phones.
   - For react-native (non-web), you may need to bundle the wasm and use react-native-fs or similar to load it from file://.

4) Steps (prototype, non-exhaustive)
   - Build or obtain a whisper.cpp wasm bundle (libwhisper.wasm + JS glue). The repo's `examples/js` shows a starting point.
   - Add the wasm bundle to the `assets/` folder or download it at runtime and store with `expo-file-system`.
   - Use a wrapper service (see `services/whisper.ts`) that loads the wasm module and exposes `transcribeFromFile`.
   - For React Native, consider running the heavy computation in a separate thread (`react-native-threads`) or offload to a WebWorker-like environment (Hermes engines support some worker-like APIs).

Option B — Native module (best performance, more work)

1) What it is
   - Build whisper.cpp as a native library and expose a React Native Native Module (Java/Kotlin + ObjC/Swift) that accepts audio and returns transcription.

2) Pros
   - Best performance and ability to use platform-optimized code.
   - Can use CPU SIMD intrinsics or Metal/NEON builds.

3) Cons
   - Requires ejecting or using EAS custom dev clients. More complex CI and build setup.

4) Steps
   - Convert the project to a bare workflow or use EAS with a custom dev client (this repo already includes `expo-dev-client` in package.json, which helps but you'll still need EAS builds).
   - Add native modules: create an Android NDK build using CMake and include whisper.cpp sources in `android/` native code. On iOS add whisper.cpp sources to the Xcode project and build as a static library or compile as part of the RN module.
   - Create a React Native bridge exposing methods like `init(modelPath)`, `transcribeFile(path)`, and event callbacks for partial results.
   - Update `services/whisper.ts` to call the native module via `NativeModules` or a typed TypeScript wrapper.

Option C — Remote server (fastest to ship)

1) What it is
   - Run whisper.cpp on a server (or local machine) exposing a HTTP API that accepts audio and returns transcriptions.

2) Pros
   - No app binary changes required.
   - Server can run on powerful hardware; no device CPU constraints.

3) Cons
   - Network latency and privacy concerns.
   - Requires a backend and model hosting.

4) Steps
   - Use the official `whisper.cpp` repo and its examples to create a microservice. There are community server wrappers that spawn the native process and expose an endpoint.
   - Implement `whisperService.transcribeRemote` in `services/whisper.ts` to upload audio and receive JSON results.
   - Secure the endpoint (auth) and consider transcribing short clips only.

Model management and storage
- Small models (tiny, base) are tens of MB and may be usable on-device. Larger models (small, medium, large) quickly become hundreds of MBs.
- For WASM/native, download models on first-run and store them in app-specific storage. On iOS use the app bundle or Library/Application Support; on Android use internal storage. Consider letting users delete models.

Privacy and permissions
- On-device: no user audio leaves the device unless you explicitly upload it. Still show clear permissions and privacy info.
- Remote: always obtain consent before uploading audio.

Expo / EAS specifics
- Using native modules means you must build custom dev clients via EAS Build. See:
  - https://docs.expo.dev/development/introduction/
  - https://docs.expo.dev/eas/build-reference/

- For a native module, add the native code under `android/` and `ios/`, then add appropriate entries to `app.json` and `eas.json` if you need custom configuration.

Next steps — recommended order
1. Prototype a remote-server approach to validate UX quickly.
2. If on-device transcription is required, prototype WASM in a web version or a React Native playground to measure performance.
3. For production on-device transcription, implement a native module and use EAS builds to produce custom clients.

Where to implement in this repo
- `services/whisper.ts`: adapter stub already added. Implement concrete backends here.
- `services/voiceRecognition.ts`: can be left as a higher-level abstraction for live voice recognition. Wire `voiceRecognitionService` to call `whisperService` for offline transcription as needed.
- `hooks/useVoiceRecognition.ts` and `components/VoiceRecorder.tsx`: update to call `whisperService.transcribeFromFile` when you have an audio file or buffer.

Helpful resources and examples
- whisper.cpp repo: https://github.com/ggerganov/whisper.cpp
- JS/WASM demo in whisper.cpp examples: check `examples/browser` and `examples/js` folders
- Community wasm builds and NPM packages may exist; evaluate their license and maintenance.

Troubleshooting
- If WASM is slow on device, try smaller models or native builds.
- If packaging large model assets in the app, prefer downloading models on demand rather than bundling in the binary.

Contact
- If you'd like, I can implement a skeleton remote-server client and wire it into `VoiceRecorder` so you can test end-to-end quickly. Ask me to proceed and I'll make the changes and run quick checks.
