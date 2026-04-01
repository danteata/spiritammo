import React from "react";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useTheme } from "@/hooks/useTheme";

export default function TabsLayout() {
  const { theme, isDark } = useTheme();

  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
      tintColor={isDark ? theme.accent : '#4A5D23'}
      barTintColor={isDark ? theme.background : '#F5F0E1'}
      unselectedItemTintColor={isDark ? theme.textSecondary : '#8E9B5A'}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="train">
        <NativeTabs.Trigger.Label>Train</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="figure.run" md="fitness_center" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="battle">
        <NativeTabs.Trigger.Label>Battle</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="scope" md="gps_fixed" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="arsenal">
        <NativeTabs.Trigger.Label>Arsenal</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="book.fill" md="menu_book" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
