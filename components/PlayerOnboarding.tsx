import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Shield, Target, Users, ChevronRight } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { PlayerProfile, ONBOARDING_STEPS } from '@/types/player';

interface PlayerOnboardingProps {
  onComplete: (profile: Partial<PlayerProfile>) => void;
  onSkip?: () => void;
}

export default function PlayerOnboarding({ onComplete, onSkip }: PlayerOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [playerData, setPlayerData] = useState<Partial<PlayerProfile>>({
    name: '',
    callSign: '',
    preferredDifficulty: 'recruit',
    notifications: {
      dailyReminders: true,
      friendActivity: true,
      challenges: true,
    },
    isPublic: true,
    allowInvites: true,
  });

  const currentStepData = ONBOARDING_STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      onComplete({
        ...playerData,
        hasCompletedOnboarding: true,
        onboardingStep: ONBOARDING_STEPS.length,
        joinDate: new Date(),
        lastActive: new Date(),
        rank: 'recruit',
        totalVerses: 0,
        averageAccuracy: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalPracticeTime: 0,
        friendsCount: 0,
      });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStepData.component) {
      case 'name':
        return playerData.name && playerData.name.trim().length >= 2;
      case 'callsign':
        return true; // Optional step
      case 'difficulty':
        return playerData.preferredDifficulty;
      case 'tutorial':
        return true; // Tutorial completion handled separately
      case 'social':
        return true; // Optional step
      default:
        return true;
    }
  };

  const renderStepContent = () => {
    switch (currentStepData.component) {
      case 'name':
        return (
          <View style={styles.stepContent}>
            <User size={64} color={COLORS.primary.main} style={styles.stepIcon} />
            <Text style={styles.militaryContext}>{currentStepData.militaryContext}</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor={COLORS.text.light + '80'}
              value={playerData.name}
              onChangeText={(text) => setPlayerData({ ...playerData, name: text })}
              maxLength={30}
              autoFocus
            />
            
            <Text style={styles.inputHint}>
              This will be your display name in the app
            </Text>
          </View>
        );

      case 'callsign':
        return (
          <View style={styles.stepContent}>
            <Shield size={64} color={COLORS.primary.main} style={styles.stepIcon} />
            <Text style={styles.militaryContext}>{currentStepData.militaryContext}</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Enter call sign (optional)"
              placeholderTextColor={COLORS.text.light + '80'}
              value={playerData.callSign}
              onChangeText={(text) => setPlayerData({ ...playerData, callSign: text })}
              maxLength={20}
              autoCapitalize="characters"
            />
            
            <Text style={styles.inputHint}>
              Examples: EAGLE, WARRIOR, GUARDIAN (optional)
            </Text>
          </View>
        );

      case 'difficulty':
        return (
          <View style={styles.stepContent}>
            <Target size={64} color={COLORS.primary.main} style={styles.stepIcon} />
            <Text style={styles.militaryContext}>{currentStepData.militaryContext}</Text>
            
            <View style={styles.difficultyOptions}>
              {[
                { key: 'recruit', label: 'Recruit', desc: 'New to scripture memorization' },
                { key: 'soldier', label: 'Soldier', desc: 'Some experience with memorization' },
                { key: 'veteran', label: 'Veteran', desc: 'Experienced in scripture study' },
                { key: 'elite', label: 'Elite', desc: 'Master of scripture memorization' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.difficultyOption,
                    playerData.preferredDifficulty === option.key && styles.selectedOption,
                  ]}
                  onPress={() => setPlayerData({ ...playerData, preferredDifficulty: option.key as any })}
                >
                  <Text style={[
                    styles.optionLabel,
                    playerData.preferredDifficulty === option.key && styles.selectedLabel,
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={[
                    styles.optionDesc,
                    playerData.preferredDifficulty === option.key && styles.selectedDesc,
                  ]}>
                    {option.desc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'tutorial':
        return (
          <View style={styles.stepContent}>
            <Target size={64} color={COLORS.primary.main} style={styles.stepIcon} />
            <Text style={styles.militaryContext}>{currentStepData.militaryContext}</Text>
            
            <View style={styles.tutorialContent}>
              <Text style={styles.tutorialTitle}>Basic Training Overview:</Text>
              <Text style={styles.tutorialPoint}>• Use voice recognition to recite verses</Text>
              <Text style={styles.tutorialPoint}>• Earn accuracy scores and build streaks</Text>
              <Text style={styles.tutorialPoint}>• Advance through military ranks</Text>
              <Text style={styles.tutorialPoint}>• Challenge friends and build your squad</Text>
              
              <TouchableOpacity style={styles.tutorialButton} onPress={() => {
                Alert.alert(
                  'Training Complete!',
                  'You\'re ready for battle, soldier! Time to start your first mission.',
                  [{ text: 'HOOAH!', onPress: handleNext }]
                );
              }}>
                <Text style={styles.tutorialButtonText}>START BASIC TRAINING</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'social':
        return (
          <View style={styles.stepContent}>
            <Users size={64} color={COLORS.primary.main} style={styles.stepIcon} />
            <Text style={styles.militaryContext}>{currentStepData.militaryContext}</Text>
            
            <View style={styles.socialContent}>
              <Text style={styles.socialTitle}>Build Your Squad:</Text>
              <Text style={styles.socialDesc}>
                Invite friends and family to join you in scripture memorization. 
                Together, you'll encourage each other and compete in challenges.
              </Text>
              
              <TouchableOpacity style={styles.socialButton} onPress={() => {
                // TODO: Implement contact invitation
                Alert.alert(
                  'Coming Soon!',
                  'Contact invitation feature will be available soon. For now, share the app with friends manually!',
                  [{ text: 'Got it!' }]
                );
              }}>
                <Users size={20} color="white" />
                <Text style={styles.socialButtonText}>INVITE CONTACTS</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.skipButton} onPress={handleNext}>
                <Text style={styles.skipButtonText}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.background.light, COLORS.background.secondary]}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Step {currentStep + 1} of {ONBOARDING_STEPS.length}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentStep + 1) / ONBOARDING_STEPS.length) * 100}%` }
              ]} 
            />
          </View>
        </View>

        {/* Step header */}
        <View style={styles.header}>
          <Text style={styles.title}>{currentStepData.title}</Text>
          <Text style={styles.description}>{currentStepData.description}</Text>
        </View>

        {/* Step content */}
        {renderStepContent()}

        {/* Navigation buttons */}
        <View style={styles.navigation}>
          {currentStep > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={handlePrevious}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.nextButton, !canProceed() && styles.disabledButton]}
            onPress={handleNext}
            disabled={!canProceed()}
          >
            <Text style={styles.nextButtonText}>
              {currentStep === ONBOARDING_STEPS.length - 1 ? 'Complete' : 'Next'}
            </Text>
            <ChevronRight size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Skip option */}
        {onSkip && (
          <TouchableOpacity style={styles.skipContainer} onPress={onSkip}>
            <Text style={styles.skipText}>Skip onboarding</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
  },
  progressContainer: {
    marginBottom: 30,
  },
  progressText: {
    fontSize: 14,
    color: COLORS.text.light,
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary.main,
    borderRadius: 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text.light,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: COLORS.text.light,
    textAlign: 'center',
    opacity: 0.8,
  },
  stepContent: {
    flex: 1,
    alignItems: 'center',
  },
  stepIcon: {
    marginBottom: 20,
  },
  militaryContext: {
    fontSize: 16,
    color: COLORS.primary.main,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 30,
    fontStyle: 'italic',
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text.light,
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 14,
    color: COLORS.text.light,
    opacity: 0.7,
    textAlign: 'center',
  },
  difficultyOptions: {
    width: '100%',
    gap: 12,
  },
  difficultyOption: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedOption: {
    borderColor: COLORS.primary.main,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.light,
    marginBottom: 4,
  },
  selectedLabel: {
    color: COLORS.primary.main,
  },
  optionDesc: {
    fontSize: 14,
    color: COLORS.text.light,
    opacity: 0.8,
  },
  selectedDesc: {
    opacity: 1,
  },
  tutorialContent: {
    width: '100%',
    alignItems: 'center',
  },
  tutorialTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.light,
    marginBottom: 20,
  },
  tutorialPoint: {
    fontSize: 16,
    color: COLORS.text.light,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  tutorialButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  tutorialButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  socialContent: {
    width: '100%',
    alignItems: 'center',
  },
  socialTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.light,
    marginBottom: 16,
  },
  socialDesc: {
    fontSize: 16,
    color: COLORS.text.light,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  socialButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  skipButton: {
    paddingVertical: 12,
  },
  skipButtonText: {
    color: COLORS.text.light,
    fontSize: 16,
    opacity: 0.7,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButtonText: {
    color: COLORS.text.light,
    fontSize: 16,
    opacity: 0.8,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  disabledButton: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  skipContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  skipText: {
    color: COLORS.text.light,
    fontSize: 14,
    opacity: 0.6,
  },
});
