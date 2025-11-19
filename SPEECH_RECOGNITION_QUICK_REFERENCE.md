# 🎙️ Quick Reference: expo-speech-recognition

## Installation Status
✅ Package installed: `expo-speech-recognition@^2.1.5`  
✅ Plugin configured in `app.json`  
✅ Permissions configured for iOS & Android  

## 🚀 Quick Start

### Using the Hook (Easiest)
```typescript
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

const { start, stop, isRecognizing, transcript } = useSpeechRecognition({
  lang: 'en-US',
  onResult: (text, isFinal) => console.log(text)
});

// In your component:
<Button onPress={start} title="Start" />
<Text>{transcript}</Text>
```

### Using the Module Directly
```typescript
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

useSpeechRecognitionEvent('result', (event) => {
  console.log(event.results[0].transcript);
});

ExpoSpeechRecognitionModule.start({ lang: 'en-US' });
```

## 📱 Implementation Files

### Core Implementation
- ✅ `hooks/useSpeechRecognition.ts` - **Use this for new features**
- ✅ `services/speechRecognition.ts` - Service wrapper (advanced use)

### Components Using Speech Recognition
- ✅ `components/VoiceRecorder.tsx` - Voice recording UI with accuracy
- ✅ `components/TargetPractice.tsx` - Target practice modal
- ✅ `components/__tests__/SpeechRecognitionTest.tsx` - Test component

### Documentation
- 📖 `SPEECH_RECOGNITION_GUIDE.md` - Full usage guide
- 📖 `SPEECH_RECOGNITION_IMPLEMENTATION.md` - Implementation details
- 📖 `README.md` - Project overview

## 🔑 Key Methods

### Hook Methods
```typescript
const {
  start,              // () => Promise<boolean>
  stop,               // () => void
  abort,              // () => void
  resetTranscript,    // () => void
  requestPermissions, // () => Promise<boolean>
  
  // State
  isRecognizing,      // boolean
  transcript,         // string (final)
  interimTranscript,  // string (real-time)
  error,              // string | null
  isAvailable,        // boolean
  hasPermission,      // boolean
} = useSpeechRecognition(options);
```

### Module Methods
```typescript
// Start recognition
ExpoSpeechRecognitionModule.start({
  lang: 'en-US',
  interimResults: true,
  continuous: false,
  maxAlternatives: 1,
});

// Stop recognition
ExpoSpeechRecognitionModule.stop();

// Abort recognition
ExpoSpeechRecognitionModule.abort();

// Check availability
await ExpoSpeechRecognitionModule.isRecognitionAvailable();

// Request permissions
await ExpoSpeechRecognitionModule.requestPermissionsAsync();
```

## 📋 Common Options

```typescript
{
  lang: 'en-US',              // Language code
  interimResults: true,        // Real-time results
  continuous: false,           // Continue after result
  maxAlternatives: 1,          // Number of alternatives
  requiresOnDeviceRecognition: false,  // On-device only
  addsPunctuation: false,      // Add punctuation
  contextualStrings: [],       // Custom vocabulary
}
```

## 🎯 Events

```typescript
useSpeechRecognitionEvent('start', () => {});
useSpeechRecognitionEvent('end', () => {});
useSpeechRecognitionEvent('result', (event) => {
  event.results[0].transcript  // string
  event.results[0].confidence  // number
  event.isFinal                // boolean
});
useSpeechRecognitionEvent('error', (event) => {
  event.error    // error code
  event.message  // error message
});
```

## ⚠️ Common Errors

| Error Code | Meaning | Solution |
|------------|---------|----------|
| `not-allowed` | No permissions | Request permissions |
| `no-speech` | No speech detected | Speak louder/clearer |
| `audio` | Audio capture failed | Check microphone |
| `network` | Network error | Enable internet or on-device |
| `aborted` | Recognition aborted | Normal, no action needed |

## 🧪 Testing

### Quick Test
```typescript
import SpeechRecognitionTest from '@/components/__tests__/SpeechRecognitionTest';

// Add to any screen:
<SpeechRecognitionTest />
```

### Console Test
```typescript
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

// Check if available
const available = await ExpoSpeechRecognitionModule.isRecognitionAvailable();
console.log('Available:', available);

// Request permissions
const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
console.log('Granted:', result.granted);

// Start (after setting up event listeners)
ExpoSpeechRecognitionModule.start({ lang: 'en-US' });
```

## 🔍 Debugging

### Enable Logging
```typescript
useSpeechRecognition({
  onStart: () => console.log('🎤 Started'),
  onEnd: () => console.log('🛑 Ended'),
  onResult: (text, isFinal) => console.log('📝', text, isFinal),
  onError: (err) => console.error('❌', err),
});
```

### Check State
```typescript
const { isAvailable, hasPermission, error } = useSpeechRecognition();

console.log({
  available: isAvailable,
  permission: hasPermission,
  error: error,
});
```

## 📱 Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| iOS | ✅ | SFSpeechRecognizer |
| Android | ✅ | SpeechRecognizer |
| Web | ✅ | Web Speech API (Chrome) |

## 🎯 Best Practices

1. **Always check availability** before starting
2. **Request permissions** early in the app flow
3. **Handle errors** gracefully with user feedback
4. **Use interim results** for better UX
5. **Add contextual strings** for better accuracy
6. **Test on real devices** for best results

## 📞 Where to Get Help

1. **Documentation**: `SPEECH_RECOGNITION_GUIDE.md`
2. **Implementation Details**: `SPEECH_RECOGNITION_IMPLEMENTATION.md`
3. **Official Repo**: https://github.com/jamsch/expo-speech-recognition
4. **Test Component**: `components/__tests__/SpeechRecognitionTest.tsx`

---

**Last Updated**: 2025-10-22  
**Version**: expo-speech-recognition@^2.1.5
