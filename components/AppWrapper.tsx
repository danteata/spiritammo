import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { usePlayerStore } from '@/hooks/usePlayerStore';
import PlayerOnboarding from './PlayerOnboarding';
import ContactInvitation from './ContactInvitation';
import { PlayerProfile } from '@/types/player';

interface AppWrapperProps {
  children: React.ReactNode;
}

export default function AppWrapper({ children }: AppWrapperProps) {
  const { 
    player, 
    isOnboarding, 
    completeOnboarding, 
    skipOnboarding,
    updatePlayer 
  } = usePlayerStore();
  
  const [showContactInvitation, setShowContactInvitation] = useState(false);
  const [hasShownInvitation, setHasShownInvitation] = useState(false);

  // Check if we should show contact invitation after some engagement
  useEffect(() => {
    if (player && !isOnboarding && !hasShownInvitation) {
      // Show invitation after user has practiced a few verses
      if (player.totalVerses >= 3 && player.friendsCount === 0) {
        const timer = setTimeout(() => {
          setShowContactInvitation(true);
          setHasShownInvitation(true);
        }, 2000); // Show after 2 seconds

        return () => clearTimeout(timer);
      }
    }
  }, [player, isOnboarding, hasShownInvitation]);

  const handleOnboardingComplete = (playerData: Partial<PlayerProfile>) => {
    completeOnboarding(playerData);
  };

  const handleOnboardingSkip = () => {
    skipOnboarding();
  };

  const handleContactInvitationClose = () => {
    setShowContactInvitation(false);
    // Mark that user has seen the invitation
    if (player) {
      updatePlayer({ 
        // Add a custom field to track invitation shown
        // This would need to be added to PlayerProfile type
      });
    }
  };

  // Show onboarding if no player or onboarding not completed
  if (!player || isOnboarding) {
    return (
      <PlayerOnboarding
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    );
  }

  // Show contact invitation modal
  if (showContactInvitation) {
    return (
      <View style={styles.container}>
        {children}
        <View style={styles.modalOverlay}>
          <ContactInvitation onClose={handleContactInvitationClose} />
        </View>
      </View>
    );
  }

  // Show main app
  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 1000,
  },
});
