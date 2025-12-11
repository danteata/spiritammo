import React, { useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { FontAwesome } from '@expo/vector-icons';
import { Scripture } from '@/types/scripture'
import { useAppStore } from '@/hooks/useAppStore'
import ScriptureText from './ScriptureText'

interface ScriptureCardProps {
  scripture: Scripture
  onReveal?: () => void
  onNext?: () => void
}

export default function ScriptureCard({
  scripture,
  onReveal,
  onNext,
}: ScriptureCardProps) {
  const { theme } = useAppStore()
  const [revealed, setRevealed] = useState(false)

  const handleReveal = () => {
    setRevealed(true)
    if (onReveal) onReveal()
  }

  const handleNext = () => {
    setRevealed(false)
    if (onNext) onNext()
  }

  const textColor = theme.text

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.header}>
        <View style={styles.referenceContainer}>
          <Text style={[styles.reference, { color: textColor }]}>
            {scripture.reference}
          </Text>
        </View>

        <View style={styles.iconContainer}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={revealed ? () => setRevealed(false) : handleReveal}
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
        <View style={styles.hiddenTextContainer}>
          <ScriptureText
            text={scripture.text}
            isJesusWords={scripture.isJesusWords}
            style={[styles.text, styles.hiddenText, { color: textColor }]}
          />
          <BlurView
            intensity={Platform.OS === 'ios' ? 25 : 20}
            experimentalBlurMethod="dimezisBlurView"
            style={styles.blurOverlay}
            tint="light"
          />
        </View>
      )}
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
  hiddenTextContainer: {
    flex: 1,
    justifyContent: 'center',
    position: 'relative',
  },
  hiddenText: {
    fontSize: 18,
    lineHeight: 26,
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
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
