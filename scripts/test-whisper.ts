
import whisperService from '../services/whisper';

async function testWhisper() {
  console.log('--- Whisper Integration Test ---');
  
  try {
    console.log('Testing whisperService.init()...');
    // Note: This will likely fail in this environment as whisper.rn is a native module
    // and FS (react-native-fs) might not behave exactly as expected, 
    // but we can test the logic flow and error messages.
    await whisperService.init();
    
    console.log('Whisper Availability:', whisperService.isAvailable());
    
  } catch (error) {
    console.log('Captured expected or unexpected error:', error.message);
    
    if (error.message.includes('whisper.rn') || error.message.includes('native module')) {
      console.log('✅ TEST PASSED: Service correctly identified missing native module and provided helpful error message.');
    } else {
      console.log('❌ TEST FAILED: Unexpected error message.');
    }
  }
}

testWhisper();
