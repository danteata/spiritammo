import { BundleInspector } from '../.rorkai/inspector';
import { RorkErrorBoundary } from '../.rorkai/rork-error-boundary';
// TEMPORARY: Conditional React Query import to fix Metro bundler compatibility
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppStoreProvider } from "@/hooks/useAppStore";
import AppWrapper from "@/components/AppWrapper";

// Conditional React Query setup for Metro bundler compatibility
let QueryClient: any;
let QueryClientProvider: any;

if (Platform.OS === 'web') {
  try {
    const reactQuery = require('@tanstack/react-query');
    QueryClient = reactQuery.QueryClient;
    QueryClientProvider = reactQuery.QueryClientProvider;
    console.log('✅ React Query loaded successfully for web');
  } catch (error) {
    console.warn('⚠️ React Query failed to load, using mock provider:', error);
    // Mock provider for compatibility
    QueryClient = class MockQueryClient {};
    QueryClientProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  }
} else {
  // For mobile, use direct import (should work fine)
  const reactQuery = require('@tanstack/react-query');
  QueryClient = reactQuery.QueryClient;
  QueryClientProvider = reactQuery.QueryClientProvider;
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Create QueryClient instance with error handling
let queryClient: any;
try {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    },
  });
} catch (error) {
  console.warn('Failed to create QueryClient, using mock:', error);
  queryClient = null;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  // Conditional provider based on QueryClient availability
  const content = (
    <AppStoreProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppWrapper>
          <BundleInspector>
            <RorkErrorBoundary>
              <RootLayoutNav />
            </RorkErrorBoundary>
          </BundleInspector>
        </AppWrapper>
      </GestureHandlerRootView>
    </AppStoreProvider>
  );

  // Wrap with QueryClientProvider only if available
  if (queryClient && QueryClientProvider) {
    return (
      <QueryClientProvider client={queryClient}>
        {content}
      </QueryClientProvider>
    );
  }

  // Fallback without React Query
  return content;
}