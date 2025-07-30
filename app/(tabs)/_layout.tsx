import { Tabs } from 'expo-router'
import { Book, Target, Settings, Home, FileText } from 'lucide-react-native'
import React from 'react'
import { COLORS } from '@/constants/colors'
import { useAppStore } from '@/hooks/useAppStore'

export default function TabLayout() {
  const { isDark } = useAppStore()

  const activeColor = COLORS.primary.main
  const inactiveColor = isDark ? COLORS.disabled : COLORS.disabled

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor: isDark ? COLORS.surface.dark : COLORS.surface.light,
          borderTopColor: isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.1)',
        },
        headerStyle: {
          backgroundColor: isDark ? COLORS.primary.dark : COLORS.primary.main,
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'SpiritAmmo',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Home color={color} />,
        }}
      />
      <Tabs.Screen
        name="armory"
        options={{
          title: 'Armory',
          tabBarIcon: ({ color }) => <Book color={color} />,
        }}
      />
      <Tabs.Screen
        name="training"
        options={{
          title: 'Training Range',
          tabBarIcon: ({ color }) => <Target color={color} />,
        }}
      />
      <Tabs.Screen
        name="mission-report"
        options={{
          title: 'Mission Report',
          tabBarIcon: ({ color }) => <FileText color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Command Center',
          tabBarIcon: ({ color }) => <Settings color={color} />,
        }}
      />
    </Tabs>
  )
}
