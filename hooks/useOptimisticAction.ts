import { useState, useCallback, useRef } from 'react'
import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'

/**
 * useOptimisticAction – wraps any async action with instant UI feedback.
 *
 * Features:
 * - Immediate `isPending` flag for loading indicators
 * - Built-in debounce to prevent double-taps
 * - Optional optimistic state updates (apply immediately, rollback on failure)
 * - Haptic feedback on trigger/success/failure
 * - Error capture for toast display
 */

type ActionStatus = 'idle' | 'pending' | 'success' | 'error'

interface UseOptimisticActionOptions<T> {
  /** The async action to execute */
  action: (...args: any[]) => Promise<T>
  /** Minimum debounce interval in ms (default 300) */
  debounceMs?: number
  /** Called before async action - return optimistic state update */
  onOptimisticUpdate?: () => void
  /** Called on failure to rollback optimistic update */
  onRollback?: () => void
  /** Called on success with the result */
  onSuccess?: (result: T) => void
  /** Called on error */
  onError?: (error: Error) => void
  /** Haptic feedback style on press (default: Medium) */
  hapticStyle?: Haptics.ImpactFeedbackStyle
  /** Minimum time to show pending state to prevent flicker (default 200ms) */
  minPendingMs?: number
}

interface UseOptimisticActionReturn<T> {
  /** Execute the action */
  execute: (...args: any[]) => Promise<T | undefined>
  /** Whether the action is currently executing */
  isPending: boolean
  /** Whether the action completed successfully */
  isSuccess: boolean
  /** Whether the action failed */
  isError: boolean
  /** The current status */
  status: ActionStatus
  /** The last error message */
  errorMessage: string | null
  /** Reset to idle state */
  reset: () => void
}

export function useOptimisticAction<T = boolean>(
  options: UseOptimisticActionOptions<T>
): UseOptimisticActionReturn<T> {
  const {
    action,
    debounceMs = 300,
    onOptimisticUpdate,
    onRollback,
    onSuccess,
    onError,
    hapticStyle = Haptics.ImpactFeedbackStyle.Medium,
    minPendingMs = 200,
  } = options

  const [status, setStatus] = useState<ActionStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const lastExecTime = useRef(0)
  const isMounted = useRef(true)

  const execute = useCallback(
    async (...args: any[]): Promise<T | undefined> => {
      // Debounce check
      const now = Date.now()
      if (now - lastExecTime.current < debounceMs) {
        return undefined
      }
      lastExecTime.current = now

      // Haptic feedback on press
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(hapticStyle).catch(() => {})
      }

      // Set pending immediately for instant feedback
      setStatus('pending')
      setErrorMessage(null)
      const pendingStart = Date.now()

      // Apply optimistic update if provided
      onOptimisticUpdate?.()

      try {
        const result = await action(...args)

        // Ensure minimum pending time to prevent flash
        const elapsed = Date.now() - pendingStart
        if (elapsed < minPendingMs) {
          await new Promise((r) => setTimeout(r, minPendingMs - elapsed))
        }

        if (isMounted.current) {
          setStatus('success')

          // Success haptic
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
          }

          onSuccess?.(result)

          // Auto-reset to idle after brief success display
          setTimeout(() => {
            if (isMounted.current) setStatus('idle')
          }, 1500)
        }

        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))

        if (isMounted.current) {
          setStatus('error')
          setErrorMessage(error.message)

          // Error haptic
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
          }

          // Rollback optimistic update
          onRollback?.()
          onError?.(error)

          // Auto-reset to idle after error display
          setTimeout(() => {
            if (isMounted.current) setStatus('idle')
          }, 3000)
        }

        return undefined
      }
    },
    [action, debounceMs, hapticStyle, minPendingMs, onOptimisticUpdate, onRollback, onSuccess, onError]
  )

  const reset = useCallback(() => {
    setStatus('idle')
    setErrorMessage(null)
  }, [])

  return {
    execute,
    isPending: status === 'pending',
    isSuccess: status === 'success',
    isError: status === 'error',
    status,
    errorMessage,
    reset,
  }
}

/**
 * Convenience: simple version for actions that just need debounce + loading state
 */
export function useDebounceAction(
  action: (...args: any[]) => Promise<any>,
  debounceMs = 300
) {
  return useOptimisticAction({
    action,
    debounceMs,
    hapticStyle: Haptics.ImpactFeedbackStyle.Light,
    minPendingMs: 100,
  })
}
