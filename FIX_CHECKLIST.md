# 🚀 Quick Fix Checklist

## What Was Fixed

✅ **audioRecording.ts**
- Removed undefined `Audio` constants (was causing crash)
- Fixed `prepareToRecordAsync()` call (method doesn't exist)
- Fixed `recorder.durationMillis` access (property doesn't exist)
- Fixed FileSystem usage with proper type guards
- Added better error messages

✅ **fileExtraction.ts**  
- Changed dynamic import to static import (proper practice)
- Removed non-existent `EncodingType` usage
- Simplified file reading logic
- Better error handling

## 🔧 Steps to Fix Your App

### 1. Clean and Rebuild (Required)

```bash
# Navigate to your project
cd /Users/danielabakah/code/mobile/spiritammo

# Clean everything
npx expo prebuild --clean

# Connect your Android device via USB
# Make sure USB debugging is enabled

# Build and install on device
npx expo run:android --device
```

### 2. Wait for Build

The build process will:
1. Generate native Android project
2. Install dependencies
3. Build the APK
4. Install on your connected device
5. Launch the app

**This may take 5-10 minutes on first build.**

### 3. Check for Success

✅ App launches successfully  
✅ No immediate crash  
✅ You see the app UI  

## 🐛 If Still Having Issues

### Check Native Logs

Open a new terminal and run:
```bash
adb logcat | grep -i "error\|crash\|expo"
```

Keep this running while you launch the app to see any errors.

### Verify Device Connection

```bash
adb devices
```

Should show your device listed.

### Clean Everything

If still having issues:
```bash
# Clean node modules
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Clean native build
npx expo prebuild --clean

# Rebuild
npx expo run:android --device
```

## 📱 Testing After Launch

Once the app launches successfully, test these features:

### 1. Voice Recording (VoiceRecorder component)
- Go to Training tab
- Select a scripture
- Tap "ENGAGE TARGET"
- Tap the microphone button
- Speak something
- Should record without crashing

### 2. File Upload (if you use it)
- Go to Armory or wherever file upload is
- Try to upload a .txt file
- Should work without crashing

## ⚠️ Important Notes

### Why You Must Rebuild

**You CANNOT use QR code scanning for this fix!**

The old build on your device has broken code that crashes immediately. You need a new build with the fixed code.

### Why It Was Crashing

The app tried to access undefined constants on module load:
```typescript
// This line crashed your app:
Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4
// ❌ Audio is undefined in expo-audio
```

This happens **before any of your code runs**, which is why:
- No error shows in Metro console
- App just quits immediately
- Native crash logs show the error

### What's Fixed Now

```typescript
// Now using the correct API:
const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
// ✅ RecordingPresets exists in expo-audio
```

## 📋 Summary

| Issue | Before | After |
|-------|--------|-------|
| Audio constants | `Audio.RECORDING_OPTION_*` ❌ | `RecordingPresets.HIGH_QUALITY` ✅ |
| Prepare method | `prepareToRecordAsync()` ❌ | Removed (not needed) ✅ |
| Duration | `recorder.durationMillis` ❌ | Interval-based tracking ✅ |
| FileSystem | Dynamic import ❌ | Static import ✅ |
| Encoding | `EncodingType.UTF8` ❌ | Default encoding ✅ |

## ✅ Success Criteria

After running `npx expo run:android --device`:

1. Build completes without errors
2. App installs on device
3. App launches (doesn't crash)
4. You see the home screen
5. Voice recording works
6. File extraction works (for .txt files)

---

**Next Step**: Run `npx expo run:android --device` now!
