import React, { useState, useEffect } from 'react'
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { MILITARY_TYPOGRAPHY } from '@/constants/colors'
import { Scripture } from '@/types/scripture'
import { useTheme } from '@/hooks/useTheme'
import ScriptureCard from './ScriptureCard'
import VoiceRecorder from './VoiceRecorder'

interface UnifiedScriptureRecorderCardProps {
  scripture: Scripture
  isBattleMode?: boolean
  onRecordingComplete: (accuracy: number) => void
  intelText?: string
  onListen?: () => void
  onIntel?: () => void
  onReadIntelAloud?: () => void
  onClose?: () => void
  isListening?: boolean
  isListeningIntel?: boolean
}

export default function UnifiedScriptureRecorderCard({
  scripture,
  isBattleMode = false,
  onRecordingComplete,
  intelText,
  onListen,
  onIntel,
  onReadIntelAloud,
  onClose,
  isListening = false,
  isListeningIntel = false,
}: UnifiedScriptureRecorderCardProps) {
  const { theme, isDark } = useTheme()
  const [isRecording, setIsRecording] = useState(false)
  const [showIntel, setShowIntel] = useState(false)

  // Auto-show intel section when intelText becomes available
  // Auto-hide when intelText is cleared (scripture changed)
  useEffect(() => {
    if (intelText) {
      setShowIntel(true)
    } else {
      setShowIntel(false)
    }
  }, [intelText])

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <ScriptureCard
        scripture={scripture}
        isBattleMode={isBattleMode}
        isRecording={isRecording}
        embedded
      />

      {onClose && (
        <TouchableOpacity 
          style={styles.absoluteCloseBtn} 
          onPress={onClose}
        >
          <Ionicons 
            name="close-circle" 
            size={28} 
            color={theme.textSecondary} 
          />
        </TouchableOpacity>
      )}

      <View style={[styles.recorderSection, { borderTopColor: theme.border }]}>
        <View style={styles.recorderHeader}>
          <Text style={[styles.recorderTitle, MILITARY_TYPOGRAPHY.caption, { color: theme.textSecondary }]}>
            LIVE RECORDING
          </Text>
          <View style={styles.headerActions}>
            {onIntel && (
              <TouchableOpacity 
                style={[styles.listenBtn, { borderColor: theme.border, backgroundColor: showIntel ? `${theme.accent}15` : 'transparent' }]} 
                onPress={() => setShowIntel(!showIntel)}
              >
                <Ionicons 
                  name={showIntel ? "bulb" : "bulb-outline"} 
                  size={14} 
                  color={showIntel ? theme.accent : theme.textSecondary} 
                />
              </TouchableOpacity>
            )}
            
            <View style={styles.rightActions}>
              {onListen && (
                <TouchableOpacity 
                  style={[styles.listenBtn, { borderColor: theme.border }]} 
                  onPress={onListen}
                  disabled={isListening}
                >
                  <Ionicons 
                    name={isListening ? "radio" : "volume-high"} 
                    size={14} 
                    color={isListening ? theme.accent : theme.textSecondary} 
                  />
                  <Text style={[styles.listenBtnText, MILITARY_TYPOGRAPHY.caption, { color: isListening ? theme.accent : theme.textSecondary }]}>
                    {isListening ? 'RECEIVING...' : 'LISTEN'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {showIntel && (
          <View style={[styles.intelContainer, { backgroundColor: `${theme.accent}05`, borderColor: theme.accent + '20' }]}>
            <View style={styles.intelHeader}>
              <View style={styles.intelHeaderTitleRow}>
                <Ionicons name="shield-checkmark" size={14} color={theme.accent} />
                <Text style={[styles.intelTitle, MILITARY_TYPOGRAPHY.caption, { color: theme.accent }]}>TACTICAL INTEL</Text>
              </View>
              {onReadIntelAloud && (
                <TouchableOpacity 
                  onPress={onReadIntelAloud} 
                  disabled={isListeningIntel}
                  style={styles.intelSpeakBtn}
                >
                  <Ionicons 
                    name={isListeningIntel ? "radio" : "volume-medium"} 
                    size={16} 
                    color={theme.accent} 
                  />
                  <Text style={[styles.intelSpeakText, { color: theme.accent }]}>
                    {isListeningIntel ? 'READING...' : 'READ ALOUD'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.intelText, { color: theme.textSecondary }]}>
              {intelText || scripture.mnemonic || "No additional intel available."}
            </Text>
          </View>
        )}

        <VoiceRecorder
          scriptureText={scripture.text}
          scriptureId={scripture.id}
          scriptureRef={scripture.reference}
          intelText={intelText || scripture.mnemonic || `Reference: ${scripture.reference}`}
          onRecordingComplete={onRecordingComplete}
          onRecordingStateChange={setIsRecording}
          variant="embedded"
          hideListen={true}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 10,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  recorderSection: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  recorderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingTop: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recorderTitle: {
    letterSpacing: 1,
  },
  listenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  listenBtnText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  absoluteCloseBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 100,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intelContainer: {
    marginVertical: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  intelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  intelHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  intelTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  intelSpeakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  intelSpeakText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  intelText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontStyle: 'italic',
  },
})
