import { BundleInspector } from '../.rorkai/inspector';
import { RorkErrorBoundary } from '../.rorkai/rork-error-boundary';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppStoreProvider, useAppStore } from "@/hooks/useAppStore";
import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo'
import { tokenCache } from '@/utils/cache'
import * as Linking from 'expo-linking'
import "../global.css";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!

if (!publishableKey) {
  console.error(
    'Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env',
  )
}

// TACTICAL_THEME import removed
import { useZustandStore } from '@/hooks/zustandStore'

function RootLayoutNav() {
  const { theme } = useAppStore();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
        animation: 'fade', // Smooth fading for native feel
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="auth"
        options={{
          presentation: 'transparentModal',
          animation: 'fade',
          headerShown: false
        }}
      />
    </Stack>
  );
}



// ... existing code ...

export default function RootLayout() {
  // Access store directly for deep link handling outside react tree if needed
  // or inside useEffect

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

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
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <ClerkLoaded>
        <QueryClientProvider client={queryClient}>
          <AppStoreProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <BundleInspector><RorkErrorBoundary><RootLayoutNav /></RorkErrorBoundary></BundleInspector>
            </GestureHandlerRootView>
          </AppStoreProvider>
        </QueryClientProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}