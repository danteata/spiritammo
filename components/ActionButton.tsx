import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '@/constants/colors';
import { useAppStore } from '@/hooks/useAppStore';

interface ActionButtonProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
  testID?: string;
}

export default function ActionButton({ title, subtitle, onPress, testID }: ActionButtonProps) {
  const { isDark } = useAppStore();
  
  const backgroundColor = isDark ? COLORS.primary.dark : COLORS.primary.main;
  const textColor = 'white';
  
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor }]}
      onPress={onPress}
      testID={testID}
    >
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: textColor }]}>{subtitle}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    marginHorizontal: 16,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.8,
  },
});