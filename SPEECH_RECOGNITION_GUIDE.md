# Speech Recognition Implementation Guide

This guide explains how to use `expo-speech-recognition` in the Spirit Ammo app.

## Overview

The app now uses the official `expo-speech-recognition` library for cross-platform speech-to-text functionality. The implementation supports:

- ✅ iOS (SFSpeechRecognizer)
- ✅ Android (SpeechRecognizer)
- ✅ Web (Web Speech API)
- ✅ Interim results (real-time transcription)
- ✅ Continuous and single-shot recognition
- ✅ Proper permission handling

## Quick Start

### Using the Hook (Recommended)

The easiest way to use speech recognition is with the `useSpeechRecognition` hook:

```typescript
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

function MyComponent() {
  const {
    isRecognizing,
    transcript,
    interimTranscript,
    error,
    isAvailable,
    hasPermission,
    start,
    stop,
    resetTranscript,
  } = useSpeechRecognition({
    lang: 'en-US',
    interimResults: true,
    continuous: false,
    onResult: (text, isFinal) => {
      console.log('Transcript:', text, 'Final:', isFinal);
    },
    onError: (error) => {
      console.error('Error:', error);
    },
  });

  const handleStart = async () => {
    const started = await start();
    if (!started) {
      console.log('Failed to start - check permissions and availability');
    }
  };

  return (
    <View>
      <Button
        title={isRecognizing ? 'Stop' : 'Start'}
        onPress={isRecognizing ? stop : handleStart}
      />
      <Text>Interim: {interimTranscript}</Text>
      <Text>Final: {transcript}</Text>
      {error && <Text>Error: {error}</Text>}
    </View>
  );
}
```

### Using the Module Directly

You can also use the `ExpoSpeechRecognitionModule` directly for more control:

```typescript
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

function MyComponent() {
  const [transcript, setTranscript] = useState('');

  // Event listeners
  useSpeechRecognitionEvent('start', () => {
    console.log('Started listening');
  });

  useSpeechRecognitionEvent('result', (event) => {
    if (event.results && event.results.length > 0) {
      setTranscript(event.results[0].transcript);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.error('Error:', event.error, event.message);
  });

  useSpeechRecognitionEvent('end', () => {
    console.log('Stopped listening');
  });

  const handleStart = async () => {
    // Request permissions first
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      console.warn('Permissions not granted');
      return;
    }

    // Start recognition
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: false,
      maxAlternatives: 1,
    });
  };

  const handleStop = () => {
    ExpoSpeechRecognitionModule.stop();
  };

  return (
    <View>
      <Button title="Start" onPress={handleStart} />
      <Button title="Stop" onPress={handleStop} />
      <Text>{transcript}</Text>
    </View>
  );
}
```

## Configuration Options

### Recognition Options

```typescript
interface ExpoSpeechRecognitionOptions {
  // Language code (e.g., 'en-US', 'es-ES')
  lang?: string;
  
  // Return interim results as they come in
  interimResults?: boolean;
  
  // Continue recognition after results
  continuous?: boolean;
  
  // Maximum number of alternative transcriptions
  maxAlternatives?: number;
  
  // Use on-device recognition only (iOS/Android)
  requiresOnDeviceRecognition?: boolean;
  
  // Add punctuation to results
  addsPunctuation?: boolean;
  
  // Custom phrases to improve recognition
  contextualStrings?: string[];
  
  // Android-specific options
  androidIntentOptions?: {
    EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS?: number;
    EXTRA_MASK_OFFENSIVE_WORDS?: boolean;
  };
  
  // iOS-specific options
  iosTaskHint?: 'unspecified' | 'dictation' | 'search' | 'confirmation';
  iosCategory?: {
    category: string;
    categoryOptions?: string[];
    mode?: string;
  };
}
```

## Permission Handling

Always request permissions before starting recognition:

```typescript
// Check if permissions are granted
const permissions = await ExpoSpeechRecognitionModule.getPermissionsAsync();
console.log('Granted:', permissions.granted);

// Request permissions
const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
if (result.granted) {
  // Start recognition
  ExpoSpeechRecognitionModule.start({ lang: 'en-US' });
}
```

## Events

The library emits the following events:

- `start`: Recognition has started
- `end`: Recognition has ended
- `result`: Transcription result received
- `error`: An error occurred

### Result Event Structure

```typescript
{
  results: [
    {
      transcript: string;
      confidence: number;
      segments?: Array<{ segment: string; timestamp: number }>;
    }
  ];
  isFinal: boolean;
}
```

### Error Event Structure

```typescript
{
  error: string; // Error code
  message: string; // Error description
}
```

## Common Error Codes

- `not-allowed`: Permissions not granted
- `network`: Network error (on-device recognition not available)
- `aborted`: Recognition was aborted
- `no-speech`: No speech was detected
- `audio`: Audio capture failed
- `service-not-allowed`: Recognition service not available

## Components Using Speech Recognition

### VoiceRecorder Component

Located at `/components/VoiceRecorder.tsx`, this component provides a UI for recording and transcribing speech with accuracy calculation.

Usage:
```typescript
<VoiceRecorder
  scriptureText="For God so loved the world..."
  onRecordingComplete={(accuracy) => {
    console.log('Recording complete with accuracy:', accuracy);
  }}
/>
```

### TargetPractice Component

Located at `/components/TargetPractice.tsx`, this component uses VoiceRecorder for scripture memorization practice.

## Platform-Specific Notes

### iOS
- Requires microphone and speech recognition permissions
- First use requires user authorization
- On-device recognition available on iOS 13+

### Android
- Requires RECORD_AUDIO permission
- May require internet connection for some services
- On-device recognition varies by device

### Web
- Uses Web Speech API (Chromium browsers only)
- Requires HTTPS in production
- No installation or permissions needed

## Troubleshooting

### "Speech recognition not available"
- Check that the device supports speech recognition
- On Android, ensure Google app is installed
- On iOS, check that Siri is enabled

### "Permissions not granted"
- Request permissions before starting
- Check app settings if previously denied

### No transcription results
- Check microphone permissions
- Ensure device volume is up
- Check for background noise
- Verify language code is correct

### Interim results not working
- Set `interimResults: true` in options
- Some devices may not support interim results

## Additional Resources

- [expo-speech-recognition GitHub](https://github.com/jamsch/expo-speech-recognition)
- [Official Documentation](https://github.com/jamsch/expo-speech-recognition#readme)
- [Web Speech API Reference](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
