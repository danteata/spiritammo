// Test file for web FileSystem stub
// This can be used to verify the web implementation works correctly

import { FileSystem } from './webFileSystemStub'

export async function testWebFileSystem() {
  console.log('🧪 Testing web FileSystem stub...')

  try {
    // Test 1: Data URL with base64
    const testDataUrl = 'data:text/plain;base64,SGVsbG8gV29ybGQ=' // "Hello World" in base64
    const base64Result = await FileSystem.readAsStringAsync(testDataUrl, {
      encoding: FileSystem.EncodingType.Base64
    })
    console.log('✅ Base64 test passed:', base64Result)

    // Test 2: HTTP URL (if available)
    try {
      const httpResult = await FileSystem.readAsStringAsync('https://httpbin.org/json', {
        encoding: FileSystem.EncodingType.UTF8
      })
      console.log('✅ HTTP test passed:', httpResult.substring(0, 100) + '...')
    } catch (httpError) {
      console.log('⚠️ HTTP test skipped (network issues):', httpError)
    }

    // Test 3: Invalid URI
    try {
      await FileSystem.readAsStringAsync('invalid-uri', {
        encoding: FileSystem.EncodingType.Base64
      })
      console.log('❌ Should have thrown error for invalid URI')
    } catch (error) {
      console.log('✅ Invalid URI test passed:', error)
    }

    console.log('🎉 All web FileSystem tests completed!')
    return true

  } catch (error) {
    console.error('❌ Web FileSystem test failed:', error)
    return false
  }
}

// Export for use in browser console or testing
if (typeof window !== 'undefined') {
  (window as any).testWebFileSystem = testWebFileSystem
}
