import React from "react";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useTheme } from "@/hooks/useTheme";

export default function TabsLayout() {
  const { theme, isDark } = useTheme();

  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
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

      <NativeTabs.Trigger name="bible">
        <NativeTabs.Trigger.Label>Bible</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="text.book.closed.fill" md="auto_stories" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="arsenal">
        <NativeTabs.Trigger.Label>Arsenal</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="shield.fill" md="shield" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
