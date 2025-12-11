import { Tabs } from 'expo-router'
import * as React from 'react';
import { Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome, Ionicons, FontAwesome5 } from '@expo/vector-icons';

import { COLORS } from '@/constants/colors'
import { useAppStore } from '@/hooks/useAppStore'
import TabBar from '@/components/TabBar';

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
        <Tabs.Screen
          name="index"
          options={{
            title: 'SpiritAmmo',
            tabBarLabel: 'Home',
            tabBarIcon: ({ color }) => <FontAwesome name="home" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="arsenal"
          options={{
            title: 'Arsenal',
            tabBarIcon: ({ color }) => <FontAwesome5 name="shield-alt" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="training"
          options={{
            title: 'Training',
            tabBarIcon: ({ color }) => <Ionicons name="fitness" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="campaign"
          options={{
            title: 'Conquest',
            tabBarIcon: ({ color }) => <FontAwesome name="map-marker" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="squad"
          options={{
            title: 'Squad',
            tabBarIcon: ({ color }) => <Ionicons name="people" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="mission-report"
          options={{
            title: 'Report',
            tabBarIcon: ({ color }) => <Ionicons name="document-text" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Command Post',
            tabBarIcon: ({ color }) => <Ionicons name="shield" size={24} color={color} />,
          }}
        />
      </Tabs>
    </SafeAreaView>
  )
}
