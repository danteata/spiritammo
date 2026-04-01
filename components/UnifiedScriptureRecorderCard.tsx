import React, { useState } from 'react'
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { MILITARY_TYPOGRAPHY } from '@/constants/colors'
import { Scripture } from '@/types/scripture'
import { useAppStore } from '@/hooks/useAppStore'
import ScriptureCard from './ScriptureCard'
import VoiceRecorder from './VoiceRecorder'

interface UnifiedScriptureRecorderCardProps {
  scripture: Scripture
  isBattleMode?: boolean
  onRecordingComplete: (accuracy: number) => void
  intelText?: string
  onListen?: () => void
  isListening?: boolean
}

export default function UnifiedScriptureRecorderCard({
  scripture,
  isBattleMode = false,
  onRecordingComplete,
  intelText,
  onListen,
  isListening = false,
}: UnifiedScriptureRecorderCardProps) {
  const { theme } = useAppStore()
  const [isRecording, setIsRecording] = useState(false)

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <ScriptureCard
        scripture={scripture}
        isBattleMode={isBattleMode}
        isRecording={isRecording}
        embedded
      />

      <View style={[styles.recorderSection, { borderTopColor: theme.border }]}>
        <View style={styles.recorderHeader}>
          <Text style={[styles.recorderTitle, MILITARY_TYPOGRAPHY.caption, { color: theme.textSecondary }]}>
            LIVE RECORDING
          </Text>
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
})
