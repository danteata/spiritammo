import React from 'react'
import { StyleSheet, View, ActivityIndicator, Modal, Text } from 'react-native'
import { } from '@/constants/colors'
import { useAppStore } from '@/hooks/useAppStore'

interface LoadingOverlayProps {
  visible: boolean
  message?: string
  transparent?: boolean
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = 'Mission in progress...',
  transparent = false,
}) => {
  const { isDark, theme } = useAppStore()

  if (!visible) return null

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={[
        styles.overlay,
        {
          backgroundColor: transparent
            ? 'rgba(0, 0, 0, 0.5)'
            : isDark
              ? 'rgba(0, 0, 0, 0.8)'
              : 'rgba(255, 255, 255, 0.9)'
        }
      ]}>
        <View style={[
          styles.container,
          {
            backgroundColor: isDark ? theme.surface : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
          }
        ]}>
          <ActivityIndicator size="large" color={theme.accent} />
          {message && (
            <Text style={[styles.message, { color: theme.text }]}>
              {message}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 150,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  message: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
})
