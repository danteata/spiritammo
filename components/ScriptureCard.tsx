import { useState, useEffect } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
} from 'react-native'
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { Scripture } from '@/types/scripture'
import { useTheme } from '@/hooks/useTheme'
import ScriptureText from './ScriptureText'
import BlurredTextOverlay from './ui/BlurredTextOverlay'

interface ScriptureCardProps {
  scripture: Scripture
  onReveal?: () => void
  onNext?: () => void
  isBattleMode?: boolean
  isRecording?: boolean
  embedded?: boolean
  onViewInContext?: () => void
}

export default function ScriptureCard({
  scripture,
  onReveal,
  onNext,
  isBattleMode = false,
  isRecording = false,
  embedded = false,
  onViewInContext,
}: ScriptureCardProps) {
  const { theme, isDark } = useTheme()
  const [revealed, setRevealed] = useState(false)
  const [showPeekBanner, setShowPeekBanner] = useState(false)

  useEffect(() => {
    if (isBattleMode && isRecording && revealed) {
      setRevealed(false)
    }
  }, [isRecording, isBattleMode])

  useEffect(() => {
    if (showPeekBanner) {
      const timer = setTimeout(() => setShowPeekBanner(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [showPeekBanner])

  const handleReveal = () => {
    setRevealed(true)
    if (onReveal) onReveal()
  }

  const handleNext = () => {
    setRevealed(false)
    setShowPeekBanner(false)
    if (onNext) onNext()
  }

  const handleToggleReveal = () => {
    if (revealed) {
      setRevealed(false)
      setShowPeekBanner(false)
    } else {
      if (isBattleMode && !showPeekBanner) {
        setShowPeekBanner(true)
      } else {
        handleReveal()
      }
    }
  }

  const textColor = theme.text

  const content = (
    <>
      <View style={styles.header}>
        <View style={styles.referenceContainer}>
          <Text style={[styles.reference, { color: textColor }]}>
            {scripture.reference}
          </Text>
          {onViewInContext && (
            <TouchableOpacity
              onPress={onViewInContext}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              style={[styles.bibleIconBtn, { borderColor: theme.border }]}
            >
              <FontAwesome5 name="bible" size={12} color={theme.textSecondary} />
              <Ionicons name="chevron-forward" size={10} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.iconContainer}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleToggleReveal}
            testID="toggle-reveal-button"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {revealed ? (
              <FontAwesome name="eye-slash" size={18} color={textColor} />
            ) : (
              <FontAwesome name="eye" size={18} color={theme.accent} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {showPeekBanner && isBattleMode && !revealed && (
        <View style={[styles.peekBanner, { backgroundColor: `${theme.warning}15`, borderColor: `${theme.warning}40` }]}>
          <FontAwesome name="exclamation-triangle" size={12} color={theme.warning} />
          <Text style={[styles.peekBannerText, { color: theme.warning }]}>
            Peek penalty: 0 VP for this verse. Tap again to reveal.
          </Text>
        </View>
      )}

      {isBattleMode && revealed && (
        <TouchableOpacity
          style={[styles.proceedButton, { borderColor: theme.accent }]}
          onPress={handleNext}
        >
          <Text style={[styles.proceedButtonText, { color: theme.accent }]}>
            PROCEED
          </Text>
        </TouchableOpacity>
      )}

      {revealed ? (
        <ScriptureText
          text={scripture.text}
          isJesusWords={scripture.isJesusWords}
          style={[styles.text, { color: textColor }]}
        />
      ) : (
        <BlurredTextOverlay>
          <ScriptureText
            text={scripture.text}
            isJesusWords={scripture.isJesusWords}
            style={[styles.text, styles.hiddenText, { color: textColor }]}
          />
        </BlurredTextOverlay>
      )}
    </>
  )

  if (embedded) {
    return (
      <View style={styles.embeddedContainer}>
        {content}
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      {content}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginVertical: 10,
    marginHorizontal: 16,
    minHeight: 200,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  embeddedContainer: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  referenceContainer: {
    flex: 1,
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    alignItems: 'flex-end',
  },
  reference: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  bibleIconBtn: {
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  text: {
    fontSize: 18,
    lineHeight: 26,
    flex: 1,
  },
  verseNumber: {
    fontWeight: 'bold',
    marginRight: 4,
  },
  hiddenText: {
    fontSize: 18,
    lineHeight: 26,
    userSelect: 'none',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  peekBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  peekBannerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  proceedButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  proceedButtonText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
})
