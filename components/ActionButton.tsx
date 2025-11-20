import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Platform,
} from 'react-native'
import { FontAwesome } from '@expo/vector-icons'
import { COLORS } from '@/constants/colors'
import { useAppStore } from '@/hooks/useAppStore'

interface ActionButtonProps {
  title: string
  subtitle?: string
  onPress: () => void
  testID?: string
  size?: 'small' | 'medium' | 'large'
  animated?: boolean
}

export default function ActionButton({
  title,
  subtitle,
  onPress,
  testID,
  size = 'medium',
  animated = false,
}: ActionButtonProps) {
  const { isDark } = useAppStore()
  const [pulseAnimation] = useState(new Animated.Value(1))

  const backgroundColor = isDark ? COLORS.primary.dark : COLORS.primary.main
  const textColor = 'white'

  useEffect(() => {
    if (animated) {
      // Start pulsing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start()
    }
  }, [animated])

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          button: {
            paddingVertical: 6,
            paddingHorizontal: 12,
            marginVertical: 4,
          },
          title: { fontSize: 14 },
          subtitle: { fontSize: 12 },
        }
      case 'large':
        return {
          button: {
            paddingVertical: 16,
            paddingHorizontal: 32,
            marginVertical: 12,
          },
          title: { fontSize: 20 },
          subtitle: { fontSize: 16 },
        }
      default: // medium
        return {
          button: {
            paddingVertical: 12,
            paddingHorizontal: 24,
            marginVertical: 8,
          },
          title: { fontSize: 18 },
          subtitle: { fontSize: 14 },
        }
    }
  }

  const sizeStyles = getSizeStyles()

  const buttonContent = (
    <TouchableOpacity
      style={[styles.button, sizeStyles.button, { backgroundColor }]}
      onPress={onPress}
      testID={testID}
    >
      <View style={styles.textContainer}>
        <FontAwesome name="crosshairs" size={24} color={textColor} style={{ marginBottom: 4 }} />
        <Text style={[styles.title, sizeStyles.title, { color: textColor }]}>
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[styles.subtitle, sizeStyles.subtitle, { color: textColor }]}
          >
            {subtitle}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  )

  return animated ? (
    <Animated.View style={{ transform: [{ scale: pulseAnimation }] }}>
      {buttonContent}
    </Animated.View>
  ) : (
    buttonContent
  )
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    marginHorizontal: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.9,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
})
