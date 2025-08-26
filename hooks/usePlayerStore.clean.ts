// TEMPORARY SOLUTION: Using mock implementation due to Zustand Metro bundler compatibility issues
// This bypasses the "(0 , _zustand.create) is not a function" error
// The full Zustand implementation will be restored once the compatibility issue is resolved

export * from './usePlayerStore.mock'

// Note: Original Zustand implementation has been moved to usePlayerStore.original.ts
// and will be restored once the Metro bundler compatibility issue is resolved