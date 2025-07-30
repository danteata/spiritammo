import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Switch, Slider } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '@/constants/colors';
import { useAppStore } from '@/hooks/useAppStore';
import { Moon, Sun, Volume2, VolumeX } from 'lucide-react-native';

export default function SettingsScreen() {
  const { 
    isDark, 
    setTheme,
    userSettings,
    saveUserSettings
  } = useAppStore();
  
  const [localSettings, setLocalSettings] = useState(userSettings);
  
  const handleThemeChange = (value: boolean) => {
    setTheme(value ? 'dark' : 'light');
  };
  
  const handleVoiceRateChange = (value: number) => {
    setLocalSettings(prev => ({
      ...prev,
      voiceRate: value
    }));
    
    saveUserSettings({
      ...localSettings,
      voiceRate: value
    });
  };
  
  const handleVoicePitchChange = (value: number) => {
    setLocalSettings(prev => ({
      ...prev,
      voicePitch: value
    }));
    
    saveUserSettings({
      ...localSettings,
      voicePitch: value
    });
  };
  
  const backgroundColors = isDark ? GRADIENTS.primary.dark : GRADIENTS.primary.light;
  const textColor = isDark ? COLORS.text.dark : COLORS.text.light;
  const cardBackground = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
  
  return (
    <LinearGradient
      colors={backgroundColors}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <ScrollView style={styles.scrollView}>
        <Text style={[styles.sectionTitle, { color: 'white' }]}>
          Command Center
        </Text>
        
        <View style={[styles.card, { backgroundColor: cardBackground }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            Display Settings
          </Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingLabelContainer}>
              <Text style={[styles.settingLabel, { color: textColor }]}>
                Dark Mode
              </Text>
              {isDark ? (
                <Moon size={20} color={textColor} />
              ) : (
                <Sun size={20} color={textColor} />
              )}
            </View>
            
            <Switch
              value={isDark}
              onValueChange={handleThemeChange}
              trackColor={{ false: '#767577', true: COLORS.primary.light }}
              thumbColor={isDark ? COLORS.primary.main : '#f4f3f4'}
              testID="dark-mode-switch"
            />
          </View>
        </View>
        
        <View style={[styles.card, { backgroundColor: cardBackground }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            Voice Settings
          </Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingLabelContainer}>
              <Text style={[styles.settingLabel, { color: textColor }]}>
                Speech Rate
              </Text>
              <Volume2 size={20} color={textColor} />
            </View>
            
            <View style={styles.sliderContainer}>
              <VolumeX size={16} color={textColor} />
              <Slider
                style={styles.slider}
                minimumValue={0.5}
                maximumValue={2.0}
                step={0.1}
                value={localSettings.voiceRate}
                onValueChange={handleVoiceRateChange}
                minimumTrackTintColor={COLORS.primary.main}
                maximumTrackTintColor={isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'}
                thumbTintColor={COLORS.primary.main}
                testID="voice-rate-slider"
              />
              <Volume2 size={16} color={textColor} />
            </View>
            <Text style={[styles.sliderValue, { color: textColor }]}>
              {localSettings.voiceRate.toFixed(1)}x
            </Text>
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingLabelContainer}>
              <Text style={[styles.settingLabel, { color: textColor }]}>
                Speech Pitch
              </Text>
              <Volume2 size={20} color={textColor} />
            </View>
            
            <View style={styles.sliderContainer}>
              <Text style={{ color: textColor }}>Low</Text>
              <Slider
                style={styles.slider}
                minimumValue={0.5}
                maximumValue={2.0}
                step={0.1}
                value={localSettings.voicePitch}
                onValueChange={handleVoicePitchChange}
                minimumTrackTintColor={COLORS.primary.main}
                maximumTrackTintColor={isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'}
                thumbTintColor={COLORS.primary.main}
                testID="voice-pitch-slider"
              />
              <Text style={{ color: textColor }}>High</Text>
            </View>
            <Text style={[styles.sliderValue, { color: textColor }]}>
              {localSettings.voicePitch.toFixed(1)}x
            </Text>
          </View>
        </View>
        
        <View style={[styles.card, { backgroundColor: cardBackground }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>
            About
          </Text>
          
          <Text style={[styles.aboutText, { color: textColor }]}>
            SpiritAmmo v1.0.0
          </Text>
          
          <Text style={[styles.aboutText, { color: textColor }]}>
            Your spiritual armory for scripture memorization
          </Text>
          
          <Text style={[styles.copyright, { color: textColor }]}>
            © 2025 SpiritAmmo
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    marginRight: 8,
  },
  sliderContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  slider: {
    flex: 1,
    marginHorizontal: 8,
  },
  sliderValue: {
    width: 40,
    textAlign: 'right',
    fontSize: 14,
  },
  aboutText: {
    fontSize: 14,
    marginBottom: 8,
  },
  copyright: {
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
  },
});