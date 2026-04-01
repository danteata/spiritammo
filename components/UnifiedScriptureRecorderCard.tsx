import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
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
}

export default function UnifiedScriptureRecorderCard({
  scripture,
  isBattleMode = false,
  onRecordingComplete,
  intelText,
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
})
