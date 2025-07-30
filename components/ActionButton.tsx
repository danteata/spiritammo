import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native'
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
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    marginHorizontal: 16,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.8,
  },
})
