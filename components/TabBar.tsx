import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Book, Target, Settings, Home } from 'lucide-react-native';
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
    { id: 'home', label: 'Home', icon: Home },
    { id: 'armory', label: 'Armory', icon: Book },
    { id: 'training', label: 'Training', icon: Target },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];
  
  return (
    <View style={[styles.container, { backgroundColor }]}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => onChangeTab(tab.id)}
            testID={`tab-${tab.id}`}
          >
            <Icon
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