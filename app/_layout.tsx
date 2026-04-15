import { BundleInspector } from '../.rorkai/inspector';
import { RorkErrorBoundary } from '../.rorkai/rork-error-boundary';
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStoreProvider } from "@/hooks/useAppStore";
import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo'
import { tokenCache } from '@/utils/cache'
import * as Linking from 'expo-linking'
import { useZustandStore } from '@/hooks/zustandStore'
import AnalyticsProvider from '@/components/AnalyticsProvider'
import { ConvexClientProvider } from '@/providers/ConvexProvider';
import { ToastContainer } from '@/components/ui/Toast';
import { Stack } from 'expo-router';
import "../global.css";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!

if (!publishableKey) {
  console.error(
    'Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env',
  )
}

export default function RootLayout() {
  // Hide splash screen immediately — screens show skeletons while data streams in
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {
      // Splash may already be hidden, ignore errors
    })
  }, [])

  // Handle Deep Links
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const { path, queryParams } = Linking.parse(event.url)
      if (path === 'recruit' && queryParams?.commanderId) {
        console.log('Recruit Link Detected:', queryParams)

        // 1. Add commander as friend
        useZustandStore.getState().addSquadMember({
          id: queryParams.commanderId as string,
          name: (queryParams.name as string) || 'Ally',
          rank: 'Ally',
          status: 'Online',
          avatar: 'https://ui-avatars.com/api/?name=' + ((queryParams.name as string) || 'Ally') + '&background=random',
          score: 0
        })

        // 2. If Operation ID is present, add the challenge
        if (queryParams?.opId) {
          useZustandStore.getState().addSquadChallenge({
            id: queryParams.opId as string,
            type: (queryParams.opType as any) || 'ROUNDS',
            title: (queryParams.opTitle as string) || 'SQUAD OP',
            description: `Orders from ${queryParams.name}: ${queryParams.opTitle}`,
            targetValue: parseInt((queryParams.opTarget as string) || '100', 10),
            currentValue: 0,
            reward: 'Mission Badge',
            participants: 2
          })
          alert(`Mission Accepted: ${queryParams.opTitle}\n\nYou have joined ${queryParams.name}'s operation.`)
        } else {
          alert(`You have joined ${queryParams.name}'s Squad!`)
        }
      }
    }

    // Check initial URL
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url })
    })

    // Listen for incoming
    const subscription = Linking.addEventListener('url', handleDeepLink)
    return () => subscription.remove()
  }, [])

  return (
    <SafeAreaProvider>
      <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
        <ClerkLoaded>
          <AnalyticsProvider>
            <ConvexClientProvider>
              <AppStoreProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <BundleInspector>
                    <RorkErrorBoundary>
                      <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
                      </Stack>
                      <ToastContainer />
                    </RorkErrorBoundary>
                  </BundleInspector>
                </GestureHandlerRootView>
              </AppStoreProvider>
            </ConvexClientProvider>
          </AnalyticsProvider>
        </ClerkLoaded>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}
