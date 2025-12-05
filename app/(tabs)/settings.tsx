import React, { useState } from 'react'
import { StyleSheet, Text, View, ScrollView, Switch, TouchableOpacity } from 'react-native'
import { TACTICAL_THEME, GARRISON_THEME, MILITARY_TYPOGRAPHY } from '@/constants/colors'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'
import { useAppStore } from '@/hooks/useAppStore'
import { FontAwesome, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenHeader from '@/components/ScreenHeader'

import { useAuth } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'

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

  return (
    <ThemedContainer style={styles.container}>
      <ScreenHeader
        title="COMMAND CENTER"
        subtitle="SYSTEM CONFIGURATION"
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Display Settings */}
        <ThemedCard style={styles.card} variant="default">
          <View style={styles.cardHeader}>
            <Feather name="monitor" size={18} color={TACTICAL_THEME.accent} />
            <ThemedText variant="subheading" style={styles.cardTitle}>
              VISUAL INTERFACE
            </ThemedText>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText variant="body" style={styles.settingLabel}>
                Night Vision
              </ThemedText>
              <ThemedText variant="caption" style={styles.settingDescription}>
                Tactical dark mode for low-light operations
              </ThemedText>
            </View>
            <Switch
              value={isDark}
              onValueChange={handleThemeChange}
              trackColor={{ false: '#767577', true: 'rgba(255, 165, 0, 0.5)' }}
              thumbColor={isDark ? TACTICAL_THEME.accent : '#f4f3f4'}
            />
          </View>
        </ThemedCard>

        {/* Audio Intelligence */}
        <ThemedCard style={styles.card} variant="default">
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="waveform" size={20} color={TACTICAL_THEME.accent} />
            <ThemedText variant="subheading" style={styles.cardTitle}>
              AUDIO INTELLIGENCE
            </ThemedText>
          </View>

          <ThemedText variant="body" style={styles.sectionDescription}>
            Select the protocol for analyzing your recitation accuracy.
          </ThemedText>

          <TouchableOpacity
            style={[
              styles.optionButton,
              userSettings.voiceEngine === 'whisper' && styles.selectedOption,
              { borderColor: userSettings.voiceEngine === 'whisper' ? TACTICAL_THEME.accent : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'), backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)' }
            ]}
            onPress={() => handleVoiceEngineChange('whisper')}
          >
            <View style={styles.optionHeader}>
              <View style={styles.optionTitleRow}>
                <MaterialCommunityIcons name="brain" size={18} color={userSettings.voiceEngine === 'whisper' ? TACTICAL_THEME.accent : (isDark ? '#888' : '#666')} />
                <ThemedText variant="body" style={styles.optionTitle}>Neural Core (Whisper AI)</ThemedText>
              </View>
              {userSettings.voiceEngine === 'whisper' && <View style={styles.activeDot} />}
            </View>
            <ThemedText variant="caption" style={styles.optionDescription}>
              Advanced AI processing. Highest accuracy for complex verses. Requires internet for best results.
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionButton,
              userSettings.voiceEngine === 'native' && styles.selectedOption,
              { borderColor: userSettings.voiceEngine === 'native' ? TACTICAL_THEME.accent : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'), backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)' }
            ]}
            onPress={() => handleVoiceEngineChange('native')}
          >
            <View style={styles.optionHeader}>
              <View style={styles.optionTitleRow}>
                <Feather name="mic" size={18} color={userSettings.voiceEngine === 'native' ? TACTICAL_THEME.accent : (isDark ? '#888' : '#666')} />
                <ThemedText variant="body" style={styles.optionTitle}>Standard Comms (Native)</ThemedText>
              </View>
              {userSettings.voiceEngine === 'native' && <View style={styles.activeDot} />}
            </View>
            <ThemedText variant="caption" style={styles.optionDescription}>
              On-device speech recognition. Faster response time, works offline. Good for quick drills.
            </ThemedText>
          </TouchableOpacity>
        </ThemedCard>

        {/* About */}
        <ThemedCard style={styles.card} variant="default">
          <View style={styles.cardHeader}>
            <FontAwesome name="info-circle" size={18} color={TACTICAL_THEME.accent} />
            <ThemedText variant="subheading" style={styles.cardTitle}>
              MISSION BRIEF
            </ThemedText>
          </View>

          <View style={styles.aboutContent}>
            <Text style={[styles.aboutLabel, { color: TACTICAL_THEME.accent }]}>VERSION</Text>
            <ThemedText variant="body" style={styles.aboutValue}>1.0.0 (Alpha)</ThemedText>

            <Text style={[styles.aboutLabel, { color: TACTICAL_THEME.accent, marginTop: 12 }]}>OBJECTIVE</Text>
            <ThemedText variant="body" style={styles.aboutValue}>
              To equip the saints with the Sword of the Spirit through tactical memorization and rigorous training.
            </ThemedText>
          </View>

          <ThemedText variant="caption" style={styles.copyright}>
            © 2025 SpiritAmmo Defense Systems
          </ThemedText>
        </ThemedCard>

        {/* Account / Sign Out */}
        <SignOutSection />

      </ScrollView>
    </ThemedContainer>
  )
}

function SignOutSection() {
  const { signOut, isSignedIn } = useAuth()
  const router = useRouter()

  if (!isSignedIn) return null

  const handleSignOut = async () => {
    try {
      await signOut()
      // Router will auto-update or we can push
      router.replace('/')
    } catch (err) {
      console.error('Sign out error', err)
    }
  }

  return (
    <ThemedCard style={[styles.card, { borderColor: TACTICAL_THEME.warning, borderWidth: 1 }]} variant="default">
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons name="account-alert" size={20} color={TACTICAL_THEME.warning} />
        <ThemedText variant="subheading" style={[styles.cardTitle, { color: TACTICAL_THEME.warning }]}>
          PERSONNEL FILE
        </ThemedText>
      </View>

      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
      >
        <ThemedText variant="body" style={styles.signOutText}>SIGN OUT</ThemedText>
      </TouchableOpacity>
    </ThemedCard>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
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
    opacity: 0.7,
  },
  sectionDescription: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
    opacity: 0.7,
  },
  optionButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
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
    opacity: 0.7,
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
    opacity: 0.5,
  },
  signOutButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'red',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutText: {
    color: 'red',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
})
