import { useState, useRef, useEffect } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native'
import { FontAwesome } from '@expo/vector-icons';
import { BlurView, BlurTargetView } from 'expo-blur'
import { Scripture } from '@/types/scripture'
import { useAppStore } from '@/hooks/useAppStore'
import ScriptureText from './ScriptureText'

interface ScriptureCardProps {
  scripture: Scripture
  onReveal?: () => void
  onNext?: () => void
  isBattleMode?: boolean
  isRecording?: boolean
  embedded?: boolean
}

export default function ScriptureCard({
  scripture,
  onReveal,
  onNext,
  isBattleMode = false,
  isRecording = false,
  embedded = false,
}: ScriptureCardProps) {
  const { theme, isDark } = useAppStore()
  const [revealed, setRevealed] = useState(false)

  // Auto-blur when recording starts in Battle Mode
  useEffect(() => {
    if (isBattleMode && isRecording && revealed) {
      setRevealed(false)
    }
  }, [isRecording, isBattleMode])
  const blurTargetRef = useRef(null)

  const handleReveal = () => {
    setRevealed(true)
    if (onReveal) onReveal()
  }

  const handleNext = () => {
    setRevealed(false)
    if (onNext) onNext()
  }

  const textColor = theme.text

  const content = (
    <>
      <View style={styles.header}>
        <View style={styles.referenceContainer}>
          <Text style={[styles.reference, { color: textColor }]}>
            {scripture.reference}
          </Text>
        </View>

        <View style={styles.iconContainer}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              if (revealed) {
                setRevealed(false)
              } else {
                if (isBattleMode) {
                  Alert.alert(
                    'UNAUTHORIZED DISCLOSURE',
                    'Manual scripture reveal is not encouraged during active combat operations. Do you wish to proceed?',
                    [
                      { text: 'ABORT', style: 'cancel' },
                      { text: 'PROCEED', onPress: handleReveal }
                    ]
                  )
                } else {
                  handleReveal()
                }
              }
            }}
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

      {revealed ? (
        <ScriptureText
          text={scripture.text}
          isJesusWords={scripture.isJesusWords}
          style={[styles.text, { color: textColor }]}
        />
      ) : (
        <View style={styles.hiddenTextWrapper}>
          <BlurTargetView
            ref={blurTargetRef}
            style={styles.hiddenTextContainer}
          >
            <ScriptureText
              text={scripture.text}
              isJesusWords={scripture.isJesusWords}
              style={[styles.text, styles.hiddenText, { color: textColor }]}
            />
          </BlurTargetView>
          <BlurView
            blurTarget={blurTargetRef}
            blurMethod="dimezisBlurViewSdk31Plus"
            style={styles.blurOverlay}
            intensity={Platform.OS === 'ios' ? 15 : 14}
            tint={isDark ? "dark" : "light"}
          />
        </View>
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
  },
  iconContainer: {
    alignItems: 'flex-end',
  },
  reference: {
    fontSize: 20,
    fontWeight: 'bold',
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
  hiddenTextWrapper: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  hiddenTextContainer: {
    padding: 2,
  },
  hiddenText: {
    fontSize: 18,
    lineHeight: 26,
    userSelect: 'none',
    opacity: 0.5,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFill,
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
})
