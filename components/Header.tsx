import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Moon, Sun, User } from 'lucide-react-native';
import { GRADIENTS } from '@/constants/colors';
import { useAppStore } from '@/hooks/useAppStore';
import { LinearGradient } from 'expo-linear-gradient';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { isDark, toggleTheme } = useAppStore();
  
  const gradientColors = isDark 
    ? GRADIENTS.primary.dark
    : GRADIENTS.primary.light;
    
  return (
    <LinearGradient
      colors={gradientColors}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <Text style={styles.title}>{title}</Text>
      
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={toggleTheme}
          testID="theme-toggle-button"
        >
          {isDark ? (
            <Sun size={20} color="white" />
          ) : (
            <Moon size={20} color="white" />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.iconButton}
          testID="user-profile-button"
        >
          <User size={20} color="white" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});