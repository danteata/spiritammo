import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  Animated,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native'
import { FontAwesome5 } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// ─── Toast Types ──────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastConfig {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onPress: () => void
  }
}

// ─── Toast Context (global) ───────────────────────────────────────────────────

type ToastListener = (toast: ToastConfig) => void
let toastListeners: ToastListener[] = []

export const Toast = {
  show(config: Omit<ToastConfig, 'id'>) {
    const toast: ToastConfig = {
      ...config,
      id: `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    }
    toastListeners.forEach((l) => l(toast))
  },

  success(title: string, message?: string) {
    this.show({ type: 'success', title, message, duration: 5000 })
  },

  error(title: string, message?: string) {
    this.show({ type: 'error', title, message, duration: 5500 })
  },

  info(title: string, message?: string) {
    this.show({ type: 'info', title, message, duration: 6000 })
  },

  warning(title: string, message?: string) {
    this.show({ type: 'warning', title, message, duration: 6500 })
  },

  /** Military-flavored success */
  missionSuccess(message: string) {
    this.show({
      type: 'success',
      title: '✅ MISSION ACCOMPLISHED',
      message,
      duration: 10000,
    })
  },

  /** Military-flavored error */
  missionFailed(message: string) {
    this.show({
      type: 'error',
      title: '⚠️ MISSION FAILED',
      message,
      duration: 12000,
    })
  },
}

// ─── Theme Colors ─────────────────────────────────────────────────────────────

const TOAST_COLORS = {
  success: {
    bg: 'rgba(16, 185, 129, 0.95)',
    border: '#10B981',
    icon: 'check-circle' as const,
    iconColor: '#ECFDF5',
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.95)',
    border: '#EF4444',
    icon: 'exclamation-circle' as const,
    iconColor: '#FEF2F2',
  },
  info: {
    bg: 'rgba(59, 130, 246, 0.95)',
    border: '#3B82F6',
    icon: 'info-circle' as const,
    iconColor: '#EFF6FF',
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.95)',
    border: '#F59E0B',
    icon: 'exclamation-triangle' as const,
    iconColor: '#FFFBEB',
  },
}

// ─── Single Toast Item ────────────────────────────────────────────────────────

interface ToastItemProps {
  toast: ToastConfig
  onDismiss: (id: string) => void
  index: number
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss, index }) => {
  const translateY = useRef(new Animated.Value(-100)).current
  const opacity = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(0.9)).current
  const progressWidth = useRef(new Animated.Value(1)).current

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 60,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start()

    // Progress bar countdown
    const duration = toast.duration || 3000
    Animated.timing(progressWidth, {
      toValue: 0,
      duration,
      useNativeDriver: false,
    }).start()

    // Auto dismiss
    const timer = setTimeout(() => {
      dismissToast()
    }, duration)

    return () => clearTimeout(timer)
  }, [])

  const dismissToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(toast.id)
    })
  }

  const colors = TOAST_COLORS[toast.type]

  return (
    <Animated.View
      style={[
        styles.toastItem,
        {
          backgroundColor: colors.bg,
          borderLeftColor: colors.border,
          transform: [
            { translateY },
            { scale },
          ],
          opacity,
          marginTop: index * 4,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.toastContent}
        onPress={dismissToast}
        activeOpacity={0.8}
        accessibilityRole="alert"
      >
        <View style={styles.toastIcon}>
          <FontAwesome5 name={colors.icon} size={18} color={colors.iconColor} />
        </View>
        <View style={styles.toastTextContainer}>
          <Text style={styles.toastTitle} numberOfLines={1}>
            {toast.title}
          </Text>
          {toast.message && (
            <Text style={styles.toastMessage} numberOfLines={2}>
              {toast.message}
            </Text>
          )}
        </View>
        {toast.action && (
          <TouchableOpacity
            style={styles.toastAction}
            onPress={() => {
              toast.action!.onPress()
              dismissToast()
            }}
          >
            <Text style={styles.toastActionText}>{toast.action.label}</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
      {/* Progress bar */}
      <Animated.View
        style={[
          styles.progressBar,
          {
            backgroundColor: colors.iconColor + '40',
            width: progressWidth.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </Animated.View>
  )
}

// ─── Toast Container (mount at root) ──────────────────────────────────────────

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastConfig[]>([])
  const insets = useSafeAreaInsets()

  useEffect(() => {
    const listener = (toast: ToastConfig) => {
      setToasts((prev) => {
        // Max 3 toasts visible
        const updated = [toast, ...prev].slice(0, 3)
        return updated
      })
    }
    toastListeners.push(listener)
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener)
    }
  }, [])

  const handleDismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  if (toasts.length === 0) return null

  return (
    <View
      style={[
        styles.container,
        { top: insets.top + 8 },
      ]}
      pointerEvents="box-none"
    >
      {toasts.map((toast, index) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={handleDismiss}
          index={index}
        />
      ))}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
  },
  toastItem: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: 8,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  toastIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastTextContainer: {
    flex: 1,
  },
  toastTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  toastMessage: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 17,
  },
  toastAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  toastActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  progressBar: {
    height: 2,
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
})
