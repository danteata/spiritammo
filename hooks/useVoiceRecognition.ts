import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VOICE_SETTINGS_KEY = '@spiritammo_voice_settings';

interface VoiceSettings {
  rate: number;
  pitch: number;
  language: string;
}

const DEFAULT_SETTINGS: VoiceSettings = {
  rate: 0.9,
  pitch: 1.0,
  language: 'en-US'
};

export function useVoiceRecognition() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [accuracy, setAccuracy] = useState(0);
  const [settings, setSettings] = useState<VoiceSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load voice settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedSettings = await AsyncStorage.getItem(VOICE_SETTINGS_KEY);
        if (storedSettings) {
          setSettings(JSON.parse(storedSettings));
        }
      } catch (error) {
        console.error('Failed to load voice settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Save voice settings
  const saveSettings = async (newSettings: VoiceSettings) => {
    try {
      await AsyncStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
      return true;
    } catch (error) {
      console.error('Failed to save voice settings:', error);
      return false;
    }
  };

  // Speak text using text-to-speech
  const speak = async (text: string) => {
    try {
      const options = {
        rate: settings.rate,
        pitch: settings.pitch,
        language: settings.language
      };
      
      await Speech.speak(text, options);
      return true;
    } catch (error) {
      console.error('Failed to speak text:', error);
      return false;
    }
  };

  // Calculate accuracy between original text and transcript
  const calculateAccuracy = (original: string, spoken: string): number => {
    if (!original || !spoken) return 0;
    
    // Normalize both strings for comparison
    const normalizeText = (text: string) => {
      return text
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };
    
    const normalizedOriginal = normalizeText(original);
    const normalizedSpoken = normalizeText(spoken);
    
    // Split into words for comparison
    const originalWords = normalizedOriginal.split(' ');
    const spokenWords = normalizedSpoken.split(' ');
    
    // Count matching words
    let matchCount = 0;
    spokenWords.forEach(word => {
      if (originalWords.includes(word)) {
        matchCount++;
      }
    });
    
    // Calculate percentage
    const maxLength = Math.max(originalWords.length, spokenWords.length);
    return maxLength > 0 ? (matchCount / maxLength) * 100 : 0;
  };

  // Mock implementation for voice recognition (would use react-native-voice in a real app)
  const startRecording = () => {
    if (Platform.OS === 'web') {
      console.log('Voice recognition not fully supported on web');
    }
    
    setIsRecording(true);
    setTranscript('');
    setAccuracy(0);
    
    // In a real app, this would connect to the device's speech recognition
    console.log('Started recording...');
    
    return true;
  };

  const stopRecording = () => {
    setIsRecording(false);
    console.log('Stopped recording');
    return true;
  };

  // Simulate receiving a transcript and calculating accuracy
  const processTranscript = (originalText: string, spokenText: string) => {
    setTranscript(spokenText);
    const calculatedAccuracy = calculateAccuracy(originalText, spokenText);
    setAccuracy(calculatedAccuracy);
    return calculatedAccuracy;
  };

  return {
    isRecording,
    transcript,
    accuracy,
    settings,
    isLoading,
    startRecording,
    stopRecording,
    speak,
    saveSettings,
    processTranscript
  };
}