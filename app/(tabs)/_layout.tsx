import { Tabs } from 'expo-router'
import * as React from 'react';
import { Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome, Ionicons, FontAwesome5 } from '@expo/vector-icons';

import { COLORS } from '@/constants/colors'
import { useAppStore } from '@/hooks/useAppStore'
import TabBar from '@/components/TabBar';
import { analytics, Analytics } from '@/services/analytics'

export default function TabLayout() {
  const { isDark } = useAppStore()

  const activeColor = COLORS.primary.main
  const inactiveColor = COLORS.disabled

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']} >
      <Tabs
        tabBar={(props: BottomTabBarProps) => <TabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* Main 4 Tabs */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'SpiritAmmo',
            tabBarLabel: 'Home',
            tabBarIcon: ({ color }) => <FontAwesome name="home" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="train"
          options={{
            title: 'Train',
            tabBarLabel: 'Train',
            tabBarIcon: ({ color }) => <Ionicons name="fitness" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="arsenal"
          options={{
            title: 'Arsenal',
            tabBarLabel: 'Arsenal',
            tabBarIcon: ({ color }) => <FontAwesome5 name="book" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
          }}
        />

        {/* Hidden screens - accessible via navigation but not in tab bar */}
        <Tabs.Screen
          name="training"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="campaign"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="squad"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="mission-report"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null, // Hide from tab bar
          }}
        />
      </Tabs>
    </SafeAreaView>
  )
}
