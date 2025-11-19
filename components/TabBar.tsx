import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { COLORS } from '@/constants/colors';
import { useAppStore } from '@/hooks/useAppStore';

interface TabBarProps {
  activeTab: string;
  onChangeTab: (tab: string) => void;
}

export default function TabBar({ activeTab, onChangeTab }: TabBarProps) {
  const { isDark } = useAppStore();
  
  const backgroundColor = isDark ? COLORS.surface.dark : COLORS.surface.light;
  const textColor = isDark ? COLORS.text.dark : COLORS.text.light;
  const activeColor = COLORS.primary.main;
  
  const tabs = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'armory', label: 'Armory', icon: 'book' },
    { id: 'training', label: 'Training', icon: 'bullseye' },
    { id: 'settings', label: 'Settings', icon: 'cog' },
  ];
  
  return (
    <View style={[styles.container, { backgroundColor }]}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => onChangeTab(tab.id)}
            testID={`tab-${tab.id}`}
          >
            <FontAwesome
              name={tab.icon as any}
              size={24}
              color={isActive ? activeColor : textColor}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? activeColor : textColor }
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});