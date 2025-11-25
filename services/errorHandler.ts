import { Alert } from 'react-native'

// Error types for categorization
export enum ErrorType {
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  AUTHENTICATION = 'AUTH',
  VALIDATION = 'VALIDATION',
  PERMISSION = 'PERMISSION',
  UNKNOWN = 'UNKNOWN',
}

// User-friendly error messages with military theme
const ERROR_MESSAGES: Record<ErrorType, { title: string; message: string }> = {
  [ErrorType.NETWORK]: {
    title: 'Communication Failure',
    message: 'Unable to establish connection with command center. Check your network and retry mission.',
  },
  [ErrorType.DATABASE]: {
    title: 'Arsenal Malfunction',
    message: 'Problem accessing ammunition depot. Restart the app and re-engage.',
  },
  [ErrorType.AUTHENTICATION]: {
    title: 'Authorization Required',
    message: 'Your security clearance has expired. Please re-authenticate, soldier.',
  },
  [ErrorType.VALIDATION]: {
    title: 'Invalid Input',
    message: 'Mission parameters invalid. Verify your input and try again.',
  },
  [ErrorType.PERMISSION]: {
    title: 'Clearance Required',
    message: 'This operation requires additional permissions. Enable them in device settings.',
  },
  [ErrorType.UNKNOWN]: {
    title: 'Mission Failed',
    message: 'Unexpected error encountered. Regroup and retry operation.',
  },
}

export interface ErrorHandlerOptions {
  showAlert?: boolean
  retry?: () => Promise<void> | Promise<boolean> | Promise<any>
  customMessage?: string
  logToService?: boolean
  silent?: boolean
}

class ErrorHandlerService {
  // Determine error type from error object
  private categorizeError(error: any): ErrorType {
    if (!error) return ErrorType.UNKNOWN

    const errorMessage = error.message?.toLowerCase() || ''
    const errorString = error.toString().toLowerCase()

    // Network errors
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('timeout') ||
      errorString.includes('network')
    ) {
      return ErrorType.NETWORK
    }

    // Database errors
    if (
      errorMessage.includes('database') ||
      errorMessage.includes('sqlite') ||
      errorMessage.includes('db')
    ) {
      return ErrorType.DATABASE
    }

    // Permission errors
    if (
      errorMessage.includes('permission') ||
      errorMessage.includes('denied') ||
      errorMessage.includes('unauthorized')
    ) {
      return ErrorType.PERMISSION
    }

    return ErrorType.UNKNOWN
  }

  // Handle error with user feedback
  async handleError(
    error: any,
    context: string,
    options: ErrorHandlerOptions = {}
  ): Promise<void> {
    const {
      showAlert = true,
      retry,
      customMessage,
      logToService = true,
      silent = false,
    } = options

    // Always log to console for debugging
    console.error(`[${context}]`, error)

    // TODO: Log to external service (Sentry, Bugsnag, etc.)
    if (logToService) {
      this.logToExternalService(error, context)
    }

    // Don't show alert if silent mode
    if (silent) return

    // Show user-friendly alert
    if (showAlert) {
      const errorType = this.categorizeError(error)
      const errorInfo = ERROR_MESSAGES[errorType]

      const buttons: any[] = [{ text: 'OK', style: 'cancel' }]

      if (retry) {
        buttons.push({
          text: 'Retry',
          onPress: async () => {
            try {
              await retry()
            } catch (retryError) {
              this.handleError(retryError, `${context} (Retry)`, { retry })
            }
          },
        })
      }

      Alert.alert(
        errorInfo.title,
        customMessage || errorInfo.message,
        buttons
      )
    }
  }

  // Log to external error tracking service
  private logToExternalService(error: any, context: string): void {
    // TODO: Integrate with Sentry, Bugsnag, or similar
    // Example: Sentry.captureException(error, { tags: { context } })
    
    // For now, just structure the error data
    const errorData = {
      message: error.message || error.toString(),
      context,
      timestamp: new Date().toISOString(),
      stack: error.stack,
    }

    // In production, send to error tracking service
    if (__DEV__) {
      console.log('📊 Error logged:', errorData)
    }
  }

  // Retry wrapper for async operations
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    context: string = 'Operation'
  ): Promise<T> {
    let lastError: any
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        console.warn(`[${context}] Attempt ${attempt}/${maxRetries} failed:`, error)
        
        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        }
      }
    }

    throw lastError
  }

  // Show success message with military theme
  showSuccess(message: string, title: string = 'Mission Accomplished'): void {
    Alert.alert(title, message)
  }

  // Show confirmation dialog with military theme
  async confirm(
    message: string,
    title: string = 'Confirm Mission',
    confirmText: string = 'Execute',
    cancelText: string = 'Abort'
  ): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        title,
        message,
        [
          { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
          { text: confirmText, onPress: () => resolve(true) },
        ]
      )
    })
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandlerService()
