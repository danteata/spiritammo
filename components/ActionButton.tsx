import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { FontAwesome } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { COLORS } from '@/constants/colors'
import { useTheme } from '@/hooks/useTheme'

interface ActionButtonProps {
  title: string
  subtitle?: string
  onPress: () => void | Promise<void>
  testID?: string
  size?: 'small' | 'medium' | 'large'
  animated?: boolean
  textStyle?: any
  style?: any
  accessibilityRole?: 'button' | 'link' | 'image' | 'text' | 'none'
  accessibilityLabel?: string
  /** Show loading spinner and disable the button */
  isLoading?: boolean
  /** Disable the button without loading spinner */
  disabled?: boolean
  /** Debounce interval in ms to prevent double-taps (default: 400) */
  debounceMs?: number
  /** Custom loading text (replaces title while loading) */
  loadingText?: string
  /** Icon name from FontAwesome (default: crosshairs) */
  icon?: string
  /** Variant style */
  variant?: 'primary' | 'success' | 'danger' | 'ghost'
}

export default function ActionButton({
  title,
  subtitle,
  onPress,
  testID,
  size = 'medium',
  animated = false,
  style,
  textStyle,
  accessibilityRole = 'button',
  accessibilityLabel,
  isLoading = false,
  disabled = false,
  debounceMs = 400,
  loadingText,
  icon = 'crosshairs',
  variant = 'primary',
}: ActionButtonProps) {
  const { isDark, theme } = useTheme()
  const [pulseAnimation] = useState(new Animated.Value(1))
  const scaleAnim = useRef(new Animated.Value(1)).current
  const lastPressTime = useRef(0)
  const isProcessing = useRef(false)

  const isDisabled = disabled || isLoading

  // Variant colors
  const getVariantColors = () => {
    switch (variant) {
      case 'success':
        return {
          bg: isDark ? theme.success : '#4A7C2E',
          text: '#FFFFFF',
        }
      case 'danger':
        return {
          bg: isDark ? theme.error : '#B91C1C',
          text: '#FFFFFF',
        }
      case 'ghost':
        return {
          bg: 'transparent',
          text: isDark ? theme.textSecondary : '#6B7B3A',
        }
      default:
        return {
          bg: isDark ? theme.accent : '#4A5D23',
          text: '#FFFFFF',
        }
    }
  }

  const variantColors = getVariantColors()

  useEffect(() => {
    if (animated && !isDisabled) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.03,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ).start()
    }
  }, [animated, isDisabled])

  // Press animation
  const handlePressIn = useCallback(() => {
    if (isDisabled) return
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start()
  }, [isDisabled])

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start()
  }, [])

  const handlePress = useCallback(async () => {
    // Debounce check
    const now = Date.now()
    if (now - lastPressTime.current < debounceMs || isProcessing.current) {
      return
    }
    lastPressTime.current = now

    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(
        size === 'large'
          ? Haptics.ImpactFeedbackStyle.Heavy
          : Haptics.ImpactFeedbackStyle.Medium
      ).catch(() => {})
    }

    try {
      isProcessing.current = true
      await onPress()
    } finally {
      isProcessing.current = false
    }
  }, [onPress, debounceMs, size])

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          button: {
            paddingVertical: 8,
            paddingHorizontal: 16,
            marginVertical: 4,
            marginHorizontal: 4,
            minHeight: 40,
          },
          title: { fontSize: 12, letterSpacing: 0.5 },
          subtitle: { fontSize: 10 },
          iconSize: 14,
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
          iconSize: 24,
        }
      default:
        return {
          button: {
            paddingVertical: 12,
            paddingHorizontal: 24,
            marginVertical: 8,
          },
          title: { fontSize: 18 },
          subtitle: { fontSize: 14 },
          iconSize: 20,
        }
    }
  }

  const sizeStyles = getSizeStyles()

  const buttonContent = (
    <TouchableOpacity
      style={[
        styles.button,
        sizeStyles.button,
        {
          backgroundColor: variantColors.bg,
          opacity: isDisabled ? 0.55 : 1,
          borderWidth: variant === 'ghost' ? 1.5 : 0,
          borderColor: variant === 'ghost' ? (isDark ? 'rgba(255,255,255,0.12)' : '#D4CBAB') : 'transparent',
        },
        style,
      ]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      testID={testID}
      accessibilityRole={accessibilityRole as any}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      activeOpacity={0.8}
    >
      <View style={styles.textContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="small"
              color={variantColors.text}
              style={{ marginRight: 8 }}
            />
            <Text
              style={[
                styles.title,
                sizeStyles.title,
                { color: variantColors.text },
                textStyle,
              ]}
            >
              {loadingText || title}
            </Text>
          </View>
        ) : (
          <>
            {size !== 'small' && (
              <FontAwesome
                name={icon as any}
                size={sizeStyles.iconSize}
                color={variantColors.text}
                style={{ marginBottom: 4 }}
              />
            )}
            <Text
              style={[
                styles.title,
                sizeStyles.title,
                { color: variantColors.text },
                textStyle,
              ]}
            >
              {title}
            </Text>
            {subtitle && (
              <Text
                style={[
                  styles.subtitle,
                  sizeStyles.subtitle,
                  { color: variantColors.text },
                ]}
              >
                {subtitle}
              </Text>
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  )

  return (
    <Animated.View
      style={{
        transform: [
          { scale: animated && !isDisabled ? pulseAnimation : scaleAnim },
        ],
      }}
    >
      {buttonContent}
    </Animated.View>
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
        shadowOpacity: 0.25,
        shadowRadius: 6,
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
