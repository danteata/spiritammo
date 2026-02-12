import React, { useState, useEffect } from 'react'
import { StyleSheet, Text, View, ScrollView, Switch, TouchableOpacity, TextInput, Modal, Alert } from 'react-native'
import { GARRISON_THEME, MILITARY_TYPOGRAPHY } from '@/constants/colors'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'
import { useAppStore } from '@/hooks/useAppStore'
import { FontAwesome, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { VoicePlaybackToggle } from '@/components/ui/VoicePlaybackToggle'
import ScreenHeader from '@/components/ScreenHeader'

import { useAuth } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'
import { AnalyticsEventType } from '@/services/analytics'

export default function SettingsScreen() {
  const { isDark, setTheme, setThemeColor, themeColor, userSettings, saveUserSettings, theme } = useAppStore()
  const { trackEvent } = useAnalytics()
  const [showNameModal, setShowNameModal] = useState(false)
  const [tempName, setTempName] = useState('')
  const styles = getStyles(theme)

  // Track screen view
  useScreenTracking('settings')

  const handleThemeChange = (value: boolean) => {
    const oldTheme = isDark ? 'dark' : 'light'
    const newTheme = value ? 'dark' : 'light'
    setTheme(newTheme)

    // Track theme change
    trackEvent(AnalyticsEventType.SETTING_CHANGED, {
      setting_name: 'theme',
      old_value: oldTheme,
      new_value: newTheme
    })
  }

  const handleThemeColorChange = (color: string) => {
    const oldColor = themeColor
    setThemeColor(color as any) // Type assertion since we know it's valid

    // Track theme color change
    trackEvent(AnalyticsEventType.SETTING_CHANGED, {
      setting_name: 'theme_color',
      old_value: oldColor,
      new_value: color
    })
  }

  const handleVoiceEngineChange = (engine: 'whisper' | 'native') => {
    const oldEngine = userSettings.voiceEngine
    saveUserSettings({
      ...userSettings,
      voiceEngine: engine,
    })

    // Track voice engine change
    trackEvent(AnalyticsEventType.VOICE_SETTINGS_CHANGED, {
      setting: 'voice_engine',
      old_value: oldEngine,
      new_value: engine
    })
  }

  const handleSaveSoldierName = async () => {
    const trimmedName = tempName.trim()
    if (trimmedName.length > 20) {
      Alert.alert('Call Sign Too Long', 'Please keep your call sign under 20 characters.')
      return
    }
    if (trimmedName.length > 0) {
      const success = await saveUserSettings({
        ...userSettings,
        soldierName: trimmedName,
      })
      if (success) {
        setShowNameModal(false)
        setTempName('')
      }
    } else {
      Alert.alert('Invalid Call Sign', 'Please enter a valid call sign.')
    }
  }

  const handleCancelName = () => {
    setShowNameModal(false)
    setTempName('')
  }

  useEffect(() => {
    if (showNameModal && userSettings.soldierName) {
      setTempName(userSettings.soldierName)
    }
  }, [showNameModal, userSettings.soldierName])

  return (
    <ThemedContainer style={styles.container}>
      <ScreenHeader
        title="COMMAND POST"
        subtitle="SYSTEM CONFIGURATION"
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 104 }}>

        {/* Display Settings */}
        <ThemedCard style={styles.card} variant="default">
          <View style={styles.cardHeader}>
            <Feather name="monitor" size={18} color={theme.accent} />
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
              thumbColor={isDark ? theme.accent : '#f4f3f4'}
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText variant="body" style={styles.settingLabel}>
                Operational Theme
              </ThemedText>
              <ThemedText variant="caption" style={styles.settingDescription}>
                Select interface camouflage pattern
              </ThemedText>
            </View>
          </View>

          <View style={styles.themeSelector}>
            <TouchableOpacity
              style={[
                styles.themeOption,
                themeColor !== 'jungle' && styles.activeThemeOption,
                { borderColor: themeColor !== 'jungle' ? theme.accent : 'transparent' }
              ]}
              onPress={() => setThemeColor('slate')}
              disabled={!isDark}
            >
              <View style={[styles.colorPreview, { backgroundColor: '#0F172A' }]} />
              <ThemedText style={{ opacity: isDark ? 1 : 0.5 }}>Tactical Slate</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                themeColor === 'jungle' && styles.activeThemeOption,
                { borderColor: themeColor === 'jungle' ? theme.accent : 'transparent' }
              ]}
              onPress={() => setThemeColor('jungle')}
              disabled={!isDark}
            >
              <View style={[styles.colorPreview, { backgroundColor: '#13180D' }]} />
              <ThemedText style={{ opacity: isDark ? 1 : 0.5 }}>Jungle Green</ThemedText>
            </TouchableOpacity>
          </View>
          {!isDark && (
            <ThemedText variant="caption" style={{ marginTop: 8, fontStyle: 'italic', opacity: 0.6 }}>
              * Camouflage patterns are only available in Night Vision mode.
            </ThemedText>
          )}
        </ThemedCard>

        {/* Soldier Identity */}
        <ThemedCard style={styles.card} variant="default">
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="account-star" size={20} color={theme.accent} />
            <ThemedText variant="subheading" style={styles.cardTitle}>
              SOLDIER IDENTITY
            </ThemedText>
          </View>

          <ThemedText variant="body" style={styles.sectionDescription}>
            Establish your call sign for multiplayer operations and personal recognition.
          </ThemedText>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText variant="body" style={styles.settingLabel}>
                Call Sign
              </ThemedText>
              <ThemedText variant="caption" style={styles.settingDescription}>
                Your soldier name displayed in battles and leaderboards
              </ThemedText>
            </View>
          </View>

          <TouchableOpacity
            style={styles.nameInputContainer}
            onPress={() => setShowNameModal(true)}
          >
            <ThemedText
              variant="body"
              style={[
                styles.nameDisplay,
                { color: userSettings.soldierName ? theme.text : theme.textSecondary }
              ]}
            >
              {userSettings.soldierName || 'SET CALL SIGN'}
            </ThemedText>
            <Feather name="edit-2" size={16} color={theme.accent} />
          </TouchableOpacity>
        </ThemedCard>

        {/* Audio Intelligence */}
        <ThemedCard style={styles.card} variant="default">
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="waveform" size={20} color={theme.accent} />
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
              { borderColor: userSettings.voiceEngine === 'whisper' ? theme.accent : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'), backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)' }
            ]}
            onPress={() => handleVoiceEngineChange('whisper')}
          >
            <View style={styles.optionHeader}>
              <View style={styles.optionTitleRow}>
                <MaterialCommunityIcons name="brain" size={18} color={userSettings.voiceEngine === 'whisper' ? theme.accent : (isDark ? '#888' : '#666')} />
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
              { borderColor: userSettings.voiceEngine === 'native' ? theme.accent : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'), backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)' }
            ]}
            onPress={() => handleVoiceEngineChange('native')}
          >
            <View style={styles.optionHeader}>
              <View style={styles.optionTitleRow}>
                <Feather name="mic" size={18} color={userSettings.voiceEngine === 'native' ? theme.accent : (isDark ? '#888' : '#666')} />
                <ThemedText variant="body" style={styles.optionTitle}>Standard Comms (Native)</ThemedText>
              </View>
              {userSettings.voiceEngine === 'native' && <View style={styles.activeDot} />}
            </View>
            <ThemedText variant="caption" style={styles.optionDescription}>
              On-device speech recognition. Faster response time, works offline. Good for quick drills.
            </ThemedText>
          </TouchableOpacity>
        </ThemedCard>

        {/* Voice Playback Toggle */}
        <ThemedCard style={styles.card} variant="default">
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="volume-high" size={20} color={theme.accent} />
            <ThemedText variant="subheading" style={styles.cardTitle}>
              VOICE PLAYBACK
            </ThemedText>
          </View>

          <ThemedText variant="body" style={styles.sectionDescription}>
            Choose between your recorded voice or text-to-speech for scripture playback.
          </ThemedText>

          <VoicePlaybackToggle isDark={isDark} theme={theme} />
        </ThemedCard>


        {/* About */}
        <ThemedCard style={styles.card} variant="default">
          <View style={styles.cardHeader}>
            <FontAwesome name="info-circle" size={18} color={theme.accent} />
            <ThemedText variant="subheading" style={styles.cardTitle}>
              MISSION BRIEF
            </ThemedText>
          </View>

          <View style={styles.aboutContent}>
            <Text style={[styles.aboutLabel, { color: theme.accent }]}>VERSION</Text>
            <ThemedText variant="body" style={styles.aboutValue}>1.0.0 (Alpha)</ThemedText>

            <Text style={[styles.aboutLabel, { color: theme.accent, marginTop: 12 }]}>OBJECTIVE</Text>
            <ThemedText variant="body" style={styles.aboutValue}>
              To equip the saints with the Sword of the Spirit through tactical memorization and rigorous training.
            </ThemedText>
          </View>

          <ThemedText variant="caption" style={styles.copyright}>
            © 2025 SpiritAmmo Defense Systems
          </ThemedText>
        </ThemedCard>

        {/* Account / Sign Out */}
        <SignOutSection styles={styles} theme={theme} />

      </ScrollView>

      {/* Soldier Name Modal */}
      <Modal
        visible={showNameModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelName}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff' }]}>
            <View style={styles.modalHeader}>
              <ThemedText variant="heading" style={{ fontSize: 18 }}>
                SET CALL SIGN
              </ThemedText>
              <TouchableOpacity onPress={handleCancelName}>
                <Feather name="x" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ThemedText variant="body" style={styles.modalDescription}>
              Choose a tactical call sign for your soldier. This will be displayed in multiplayer operations and leaderboards.
            </ThemedText>

            <TextInput
              style={[
                styles.nameInput,
                {
                  backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
                  color: theme.text,
                  borderColor: theme.border
                }
              ]}
              value={tempName}
              onChangeText={setTempName}
              placeholder="Enter your call sign..."
              placeholderTextColor={theme.textSecondary}
              maxLength={20}
              autoCapitalize="words"
              autoFocus={true}
            />

            <View style={styles.characterCount}>
              <ThemedText variant="caption" style={{ color: theme.textSecondary }}>
                {tempName.length}/20 characters
              </ThemedText>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancelName}
              >
                <ThemedText variant="body" style={styles.cancelButtonText}>CANCEL</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.accent }]}
                onPress={handleSaveSoldierName}
              >
                <ThemedText variant="body" style={styles.saveButtonText}>CONFIRM</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedContainer>
  )
}

function SignOutSection({ styles, theme }: { styles: any, theme: any }) {
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
    <ThemedCard style={[styles.card, { borderColor: theme.warning, borderWidth: 1 }]} variant="default">
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons name="account-alert" size={20} color={theme.warning} />
        <ThemedText variant="subheading" style={[styles.cardTitle, { color: theme.warning }]}>
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

const getStyles = (theme: any) => StyleSheet.create({
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
    backgroundColor: theme.accent,
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
  themeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    gap: 8,
  },
  activeThemeOption: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 16,
  },
  nameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  nameDisplay: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalDescription: {
    marginBottom: 20,
    lineHeight: 20,
    opacity: 0.8,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 8,
  },
  characterCount: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  saveButton: {
    // backgroundColor set inline
  },
  cancelButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#000000',
    fontWeight: '600',
  },
})
