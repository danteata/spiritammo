// Web-compatible FileSystem stub for expo-file-system
// This provides minimal web implementations to prevent import errors

export enum EncodingType {
  Base64 = 'base64',
  UTF8 = 'utf8',
}

export class FileSystem {
  static EncodingType = EncodingType

  // Web implementation of readAsStringAsync
  static async readAsStringAsync(uri: string, options: { encoding: EncodingType }): Promise<string> {
    if (typeof window === 'undefined') {
      throw new Error('FileSystem is not available on this platform')
    }

    try {
      // Handle different URI formats
      let response: Response

      if (uri.startsWith('http://') || uri.startsWith('https://')) {
        // Remote file
        response = await fetch(uri)
      } else if (uri.startsWith('file://')) {
        // Local file (limited support in web)
        throw new Error('Local file reading not supported in web browsers')
      } else {
        // Assume it's a data URL or blob
        if (uri.startsWith('data:')) {
          // Handle data URLs
          const responseText = await this.handleDataUrl(uri, options.encoding)
          return responseText
        } else {
          throw new Error('Unsupported URI format for web platform')
        }
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()

      if (options.encoding === EncodingType.Base64) {
        // Convert ArrayBuffer to base64
        const bytes = new Uint8Array(arrayBuffer)
        let binary = ''
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        return btoa(binary)
      } else {
        // UTF8 decoding
        const decoder = new TextDecoder('utf-8')
        return decoder.decode(arrayBuffer)
      }
    } catch (error) {
      console.error('FileSystem readAsStringAsync error:', error)
      throw error
    }
  }

  private static async handleDataUrl(dataUrl: string, encoding: EncodingType): Promise<string> {
    // Handle data URLs (e.g., from file picker)
    if (encoding === EncodingType.Base64) {
      // Extract base64 part from data URL
      const base64Match = dataUrl.match(/data:[^;]+;base64,(.+)/)
      if (base64Match) {
        return base64Match[1]
      }
    }

    // For UTF8, we need to decode the base64 content first
    const base64Match = dataUrl.match(/data:[^;]+;base64,(.+)/)
    if (base64Match) {
      const base64Data = base64Match[1]
      try {
        // Convert base64 to binary string
        const binaryString = atob(base64Data)
        // Convert binary string to UTF-8
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const decoder = new TextDecoder('utf-8')
        return decoder.decode(bytes)
      } catch (error) {
        console.warn('Failed to decode data URL as UTF-8, returning base64')
        return base64Data
      }
    }

    throw new Error('Invalid data URL format')
  }

  // Stub implementations for other FileSystem methods
  static getInfoAsync(uri: string): Promise<{ exists: boolean; size?: number; modificationTime?: number }> {
    // Basic implementation - in a real scenario, you'd implement proper file info checking
    return Promise.resolve({ exists: true })
  }

  static async writeAsStringAsync(uri: string, content: string, options?: { encoding?: EncodingType }): Promise<void> {
    // Web doesn't support writing files to arbitrary locations for security reasons
    console.warn('FileSystem.writeAsStringAsync: Writing files is not supported in web browsers')
    throw new Error('File writing is not supported in web browsers')
  }

  static async deleteAsync(uri: string): Promise<void> {
    console.warn('FileSystem.deleteAsync: File deletion is not supported in web browsers')
    throw new Error('File deletion is not supported in web browsers')
  }

  static async moveAsync(options: { from: string; to: string }): Promise<void> {
    console.warn('FileSystem.moveAsync: File operations are not supported in web browsers')
    throw new Error('File operations are not supported in web browsers')
  }

  static async copyAsync(options: { from: string; to: string }): Promise<void> {
    console.warn('FileSystem.copyAsync: File operations are not supported in web browsers')
    throw new Error('File operations are not supported in web browsers')
  }

  static documentDirectory: string | null = null
  static cacheDirectory: string | null = null
}

// Export the main module
export default FileSystem
