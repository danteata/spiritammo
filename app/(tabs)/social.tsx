import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import SocialHub from '@/components/social/SocialHub';
import { COLORS } from '@/constants/colors';

export default function SocialScreen() {
  const backgroundColors = [
    COLORS.background.light,
    COLORS.background.secondary,
  ] as const;

  const handleNavigate = (screen: string) => {
    // Handle navigation to different social screens
    console.log('Navigate to:', screen);
    // You can implement navigation logic here
  };

  return (
    <LinearGradient colors={backgroundColors} style={styles.container}>
      <SocialHub onNavigate={handleNavigate} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
