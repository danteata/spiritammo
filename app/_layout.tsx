import { BundleInspector } from '../.rorkai/inspector';
import { RorkErrorBoundary } from '../.rorkai/rork-error-boundary';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTheme } from '@/hooks/useTheme';
import { ConvexClientProvider } from '@/providers/ConvexProvider';
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

function RootLayoutNav() {
  const { theme, isDark } = useTheme();

  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
      tintColor={isDark ? theme.accent : "#007AFF"}
      barTintColor={isDark ? theme.background : "#FFFFFF"}
      unselectedItemTintColor={isDark ? theme.textSecondary : "#999999"}
    >
      {/* Home Tab */}
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>

      {/* Train Tab - Practice without scoring */}
      <NativeTabs.Trigger name="train">
        <NativeTabs.Trigger.Label>Train</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="figure.run" md="fitness_center" />
      </NativeTabs.Trigger>

      {/* Battle Tab - Scored challenges with VP */}
      <NativeTabs.Trigger name="battle">
        <NativeTabs.Trigger.Label>Battle</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="scope" md="gps_fixed" />
      </NativeTabs.Trigger>

      {/* Arsenal Tab */}
      <NativeTabs.Trigger name="arsenal">
        <NativeTabs.Trigger.Label>Arsenal</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="book.fill" md="menu_book" />
      </NativeTabs.Trigger>

      {/* Profile Tab */}
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

export default function RootLayout() {
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
    <AnalyticsProvider>
      <SafeAreaProvider>
        <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
          <ClerkLoaded>
            <ConvexClientProvider>
              <QueryClientProvider client={queryClient}>
                <AppStoreProvider>
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <BundleInspector>
                      <RorkErrorBoundary>
                        <RootLayoutNav />
                      </RorkErrorBoundary>
                    </BundleInspector>
                  </GestureHandlerRootView>
                </AppStoreProvider>
              </QueryClientProvider>
            </ConvexClientProvider>
          </ClerkLoaded>
        </ClerkProvider>
      </SafeAreaProvider>
    </AnalyticsProvider>
  );
}
