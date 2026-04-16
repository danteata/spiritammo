import React, { useState, useEffect, useCallback, useRef } from 'react'
import { StyleSheet, Text, View, TouchableOpacity, Platform, ActivityIndicator, Animated } from 'react-native'
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
  onIntel?: () => void
  onReadIntelAloud?: () => void
  onClose?: () => void
  isListening?: boolean
  isListeningIntel?: boolean
  isLoadingIntel?: boolean
  showViewInContext?: boolean
  fadeAnim?: Animated.Value
  isLooping?: boolean
  onToggleLoop?: () => void
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
  isLoadingIntel = false,
  showViewInContext = true,
  fadeAnim,
  isLooping = false,
  onToggleLoop,
}: UnifiedScriptureRecorderCardProps) {
  const { theme, isDark } = useAppStore()
  const [isRecording, setIsRecording] = useState(false)
  const [showIntel, setShowIntel] = useState(false)
  const wasListeningRef = useRef(false)

  useEffect(() => {
    if (wasListeningRef.current && !isListening && isLooping && onListen) {
      onListen()
    }
    wasListeningRef.current = isListening
  }, [isListening])

  useEffect(() => {
    wasListeningRef.current = false
  }, [scripture.id])

  // Auto-show intel section when intelText becomes available
  // Auto-hide when intelText is cleared (scripture changed)
  useEffect(() => {
    if (intelText) {
      setShowIntel(true)
    } else {
      setShowIntel(false)
    }
  }, [intelText])

  const handleViewInContext = useCallback(() => {
    try {
      const bibleTab = require('@/app/(tabs)/bible')
      bibleTab.navigateToBibleVerse?.({
        book: scripture.book,
        chapter: scripture.chapter,
        verse: scripture.verse,
      })
    } catch (e) {
      console.warn('Bible tab not available for deep link:', e)
    }
  }, [scripture])

  const scriptureCard = (
    <ScriptureCard
      scripture={scripture}
      isBattleMode={isBattleMode}
      isRecording={isRecording}
      embedded
      onViewInContext={showViewInContext ? handleViewInContext : undefined}
    />
  )

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {fadeAnim ? (
        <Animated.View style={{ opacity: fadeAnim }}>
          {scriptureCard}
        </Animated.View>
      ) : (
        scriptureCard
      )}

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
                onPress={() => {
                  if (!showIntel) {
                    setShowIntel(true)
                    if (!intelText) {
                      onIntel()
                    }
                  } else {
                    setShowIntel(false)
                  }
                }}
                disabled={isLoadingIntel}
              >
                {isLoadingIntel && showIntel ? (
                  <ActivityIndicator size="small" color={theme.accent} />
                ) : (
                  <Ionicons 
                    name={showIntel ? "bulb" : "bulb-outline"} 
                    size={14} 
                    color={showIntel ? theme.accent : theme.textSecondary} 
                  />
                )}
              </TouchableOpacity>
            )}
            
            <View style={styles.rightActions}>
              {onToggleLoop && (
                <TouchableOpacity 
                  style={[styles.listenBtn, { borderColor: theme.border, backgroundColor: isLooping ? `${theme.accent}15` : 'transparent' }]} 
                  onPress={onToggleLoop}
                >
                  <Ionicons 
                    name={isLooping ? "repeat" : "repeat-outline"} 
                    size={14} 
                    color={isLooping ? theme.accent : theme.textSecondary} 
                  />
                </TouchableOpacity>
              )}
              {onListen && (
                <TouchableOpacity 
                  style={[styles.listenBtn, { borderColor: theme.border }]} 
                  onPress={onListen}
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
              {onReadIntelAloud && intelText && (
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
            {isLoadingIntel && !intelText ? (
              <View style={styles.intelLoadingContainer}>
                <ActivityIndicator size="small" color={theme.accent} />
                <Text style={[styles.intelText, { color: theme.textSecondary, fontStyle: 'normal' }]}>
                  Retrieving tactical intel...
                </Text>
              </View>
            ) : (
              <Text style={[styles.intelText, { color: theme.textSecondary }]}>
                {intelText || scripture.mnemonic || "No additional intel available."}
              </Text>
            )}
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
    gap: 10,
  },
  recorderTitle: {
    letterSpacing: 1,
  },
  listenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 28,
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
  intelLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
})
