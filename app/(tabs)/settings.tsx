import React, { useState } from 'react'
import { StyleSheet, Text, View, ScrollView, Switch, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { TACTICAL_THEME, MILITARY_TYPOGRAPHY } from '@/constants/colors'
import { useAppStore } from '@/hooks/useAppStore'
import { FontAwesome, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const { isDark, setTheme, userSettings, saveUserSettings } = useAppStore()

  const handleThemeChange = (value: boolean) => {
    setTheme(value ? 'dark' : 'light')
  }

  const handleVoiceEngineChange = (engine: 'whisper' | 'native') => {
    saveUserSettings({
      ...userSettings,
      voiceEngine: engine,
    })
  }

  const backgroundColors = isDark
    ? (['#0a1505', '#1a2f0a', '#0f1a05'] as const)
    : (['#4A6B2A', '#2D5016', '#1a2f0a'] as const)

  const cardBackground = isDark
    ? 'rgba(255, 255, 255, 0.05)'
    : 'rgba(0, 0, 0, 0.03)'

  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'

  return (
    <LinearGradient
      colors={backgroundColors}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <Text
            style={[
              MILITARY_TYPOGRAPHY.heading,
              { color: 'white', fontSize: 28, letterSpacing: 1 },
            ]}
          >
            COMMAND CENTER
          </Text>
          <View style={styles.subtitleContainer}>
            <View style={styles.subtitleLine} />
            <Text
              style={[
                MILITARY_TYPOGRAPHY.caption,
                { color: TACTICAL_THEME.accent, letterSpacing: 2 },
              ]}
            >
              SYSTEM CONFIGURATION
            </Text>
          </View>
        </View>

        {/* Display Settings */}
        <View style={[styles.card, { backgroundColor: cardBackground, borderColor, borderWidth: 1 }]}>
          <View style={styles.cardHeader}>
            <Feather name="monitor" size={18} color={TACTICAL_THEME.accent} />
            <Text style={[styles.cardTitle, { color: isDark ? 'white' : 'black' }]}>
              VISUAL INTERFACE
            </Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: isDark ? 'white' : 'black' }]}>
                Night Vision
              </Text>
              <Text style={[styles.settingDescription, { color: isDark ? '#aaa' : '#666' }]}>
                Tactical dark mode for low-light operations
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={handleThemeChange}
              trackColor={{ false: '#767577', true: 'rgba(255, 165, 0, 0.5)' }}
              thumbColor={isDark ? TACTICAL_THEME.accent : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Audio Intelligence */}
        <View style={[styles.card, { backgroundColor: cardBackground, borderColor, borderWidth: 1 }]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="waveform" size={20} color={TACTICAL_THEME.accent} />
            <Text style={[styles.cardTitle, { color: isDark ? 'white' : 'black' }]}>
              AUDIO INTELLIGENCE
            </Text>
          </View>

          <Text style={[styles.sectionDescription, { color: isDark ? '#aaa' : '#666' }]}>
            Select the protocol for analyzing your recitation accuracy.
          </Text>

          <TouchableOpacity
            style={[
              styles.optionButton,
              userSettings.voiceEngine === 'whisper' && styles.selectedOption,
              { borderColor: userSettings.voiceEngine === 'whisper' ? TACTICAL_THEME.accent : borderColor }
            ]}
            onPress={() => handleVoiceEngineChange('whisper')}
          >
            <View style={styles.optionHeader}>
              <View style={styles.optionTitleRow}>
                <MaterialCommunityIcons name="brain" size={18} color={userSettings.voiceEngine === 'whisper' ? TACTICAL_THEME.accent : (isDark ? '#888' : '#666')} />
                <Text style={[styles.optionTitle, { color: isDark ? 'white' : 'black' }]}>Neural Core (Whisper AI)</Text>
              </View>
              {userSettings.voiceEngine === 'whisper' && <View style={styles.activeDot} />}
            </View>
            <Text style={[styles.optionDescription, { color: isDark ? '#aaa' : '#666' }]}>
              Advanced AI processing. Highest accuracy for complex verses. Requires internet for best results.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionButton,
              userSettings.voiceEngine === 'native' && styles.selectedOption,
              { borderColor: userSettings.voiceEngine === 'native' ? TACTICAL_THEME.accent : borderColor }
            ]}
            onPress={() => handleVoiceEngineChange('native')}
          >
            <View style={styles.optionHeader}>
              <View style={styles.optionTitleRow}>
                <Feather name="mic" size={18} color={userSettings.voiceEngine === 'native' ? TACTICAL_THEME.accent : (isDark ? '#888' : '#666')} />
                <Text style={[styles.optionTitle, { color: isDark ? 'white' : 'black' }]}>Standard Comms (Native)</Text>
              </View>
              {userSettings.voiceEngine === 'native' && <View style={styles.activeDot} />}
            </View>
            <Text style={[styles.optionDescription, { color: isDark ? '#aaa' : '#666' }]}>
              On-device speech recognition. Faster response time, works offline. Good for quick drills.
            </Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={[styles.card, { backgroundColor: cardBackground, borderColor, borderWidth: 1 }]}>
          <View style={styles.cardHeader}>
            <FontAwesome name="info-circle" size={18} color={TACTICAL_THEME.accent} />
            <Text style={[styles.cardTitle, { color: isDark ? 'white' : 'black' }]}>
              MISSION BRIEF
            </Text>
          </View>

          <View style={styles.aboutContent}>
            <Text style={[styles.aboutLabel, { color: TACTICAL_THEME.accent }]}>VERSION</Text>
            <Text style={[styles.aboutValue, { color: isDark ? 'white' : 'black' }]}>1.0.0 (Alpha)</Text>

            <Text style={[styles.aboutLabel, { color: TACTICAL_THEME.accent, marginTop: 12 }]}>OBJECTIVE</Text>
            <Text style={[styles.aboutValue, { color: isDark ? 'white' : 'black' }]}>
              To equip the saints with the Sword of the Spirit through tactical memorization and rigorous training.
            </Text>
          </View>

          <Text style={[styles.copyright, { color: isDark ? '#666' : '#999' }]}>
            © 2025 SpiritAmmo Defense Systems
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 30,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  subtitleLine: {
    width: 20,
    height: 2,
    backgroundColor: TACTICAL_THEME.accent,
    marginRight: 8,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
  },
  sectionDescription: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  optionButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  selectedOption: {
    backgroundColor: 'rgba(255, 165, 0, 0.05)',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TACTICAL_THEME.accent,
  },
  optionDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 26, // Align with text
  },
  aboutContent: {
    marginTop: 4,
  },
  aboutLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  aboutValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  copyright: {
    fontSize: 10,
    marginTop: 20,
    textAlign: 'center',
    opacity: 0.7,
  },
})
