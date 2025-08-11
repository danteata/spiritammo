import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Share,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Users, 
  MessageCircle, 
  Mail, 
  Share2, 
  UserPlus,
  Shield,
  Target,
  Award
} from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { usePlayerStore } from '@/hooks/usePlayerStore';

interface ContactInvitationProps {
  onClose: () => void;
}

export default function ContactInvitation({ onClose }: ContactInvitationProps) {
  const { player } = usePlayerStore();
  const [selectedMethod, setSelectedMethod] = useState<'sms' | 'email' | 'share' | null>(null);

  const inviteMessage = `🎯 Join me in Spirit Ammo! 

I'm building my spiritual army and want you on my squad! 

Spirit Ammo is an epic scripture memorization app where we:
⚔️ Battle through Bible verses with voice recognition
🏆 Compete in challenges and climb military ranks  
👥 Build squads and encourage each other
🎖️ Earn badges and track our progress

${player?.name ? `${player.name} has invited you to join their squad!` : 'Download now and let\'s memorize God\'s Word together!'}

Download Spirit Ammo and start your spiritual warfare training:
📱 [App Store/Play Store Link]

Ready to lock and load with Scripture? 💪`;

  const handleInviteMethod = async (method: 'sms' | 'email' | 'share') => {
    setSelectedMethod(method);

    switch (method) {
      case 'sms':
        try {
          const url = `sms:?body=${encodeURIComponent(inviteMessage)}`;
          const supported = await Linking.canOpenURL(url);
          if (supported) {
            await Linking.openURL(url);
          } else {
            Alert.alert('Error', 'SMS not available on this device');
          }
        } catch (error) {
          Alert.alert('Error', 'Failed to open SMS');
        }
        break;

      case 'email':
        try {
          const subject = `Join my Spirit Ammo squad! 🎯`;
          const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(inviteMessage)}`;
          const supported = await Linking.canOpenURL(url);
          if (supported) {
            await Linking.openURL(url);
          } else {
            Alert.alert('Error', 'Email not available on this device');
          }
        } catch (error) {
          Alert.alert('Error', 'Failed to open email');
        }
        break;

      case 'share':
        try {
          await Share.share({
            message: inviteMessage,
            title: 'Join my Spirit Ammo squad!',
          });
        } catch (error) {
          Alert.alert('Error', 'Failed to share invitation');
        }
        break;
    }

    setSelectedMethod(null);
  };

  const handleCopyInviteCode = () => {
    // TODO: Implement invite code system
    Alert.alert(
      'Invite Code',
      'Feature coming soon! For now, use the share options above to invite friends.',
      [{ text: 'Got it!' }]
    );
  };

  return (
    <LinearGradient
      colors={[COLORS.background.light, COLORS.background.secondary]}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Users size={64} color={COLORS.primary.main} />
          <Text style={styles.title}>Build Your Squad</Text>
          <Text style={styles.subtitle}>
            No soldier fights alone. Invite friends and family to join your spiritual army!
          </Text>
        </View>

        {/* Benefits section */}
        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>Why invite friends?</Text>
          
          <View style={styles.benefit}>
            <Shield size={24} color={COLORS.primary.main} />
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>Mutual Encouragement</Text>
              <Text style={styles.benefitDesc}>Support each other in memorizing God's Word</Text>
            </View>
          </View>

          <View style={styles.benefit}>
            <Target size={24} color={COLORS.primary.main} />
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>Friendly Competition</Text>
              <Text style={styles.benefitDesc}>Challenge each other and climb the ranks together</Text>
            </View>
          </View>

          <View style={styles.benefit}>
            <Award size={24} color={COLORS.primary.main} />
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>Squad Rewards</Text>
              <Text style={styles.benefitDesc}>Unlock special badges and achievements as a team</Text>
            </View>
          </View>
        </View>

        {/* Invitation methods */}
        <View style={styles.methodsContainer}>
          <Text style={styles.methodsTitle}>Choose your recruitment method:</Text>

          <TouchableOpacity
            style={[styles.methodButton, selectedMethod === 'sms' && styles.selectedMethod]}
            onPress={() => handleInviteMethod('sms')}
            disabled={selectedMethod !== null}
          >
            <MessageCircle size={24} color="white" />
            <View style={styles.methodContent}>
              <Text style={styles.methodTitle}>Text Message</Text>
              <Text style={styles.methodDesc}>Send via SMS to contacts</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodButton, selectedMethod === 'email' && styles.selectedMethod]}
            onPress={() => handleInviteMethod('email')}
            disabled={selectedMethod !== null}
          >
            <Mail size={24} color="white" />
            <View style={styles.methodContent}>
              <Text style={styles.methodTitle}>Email</Text>
              <Text style={styles.methodDesc}>Send detailed invitation via email</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodButton, selectedMethod === 'share' && styles.selectedMethod]}
            onPress={() => handleInviteMethod('share')}
            disabled={selectedMethod !== null}
          >
            <Share2 size={24} color="white" />
            <View style={styles.methodContent}>
              <Text style={styles.methodTitle}>Share</Text>
              <Text style={styles.methodDesc}>Share via any app (WhatsApp, Facebook, etc.)</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Invite code section */}
        <View style={styles.inviteCodeContainer}>
          <Text style={styles.inviteCodeTitle}>Personal Invite Code</Text>
          <Text style={styles.inviteCodeDesc}>
            Share your personal code for friends to join your squad directly
          </Text>
          
          <TouchableOpacity style={styles.inviteCodeButton} onPress={handleCopyInviteCode}>
            <UserPlus size={20} color={COLORS.primary.main} />
            <Text style={styles.inviteCodeButtonText}>Get Invite Code</Text>
          </TouchableOpacity>
        </View>

        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Maybe Later</Text>
        </TouchableOpacity>
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
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text.light,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text.light,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 24,
  },
  benefitsContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
  },
  benefitsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.light,
    marginBottom: 20,
    textAlign: 'center',
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  benefitText: {
    flex: 1,
    marginLeft: 16,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.light,
    marginBottom: 4,
  },
  benefitDesc: {
    fontSize: 14,
    color: COLORS.text.light,
    opacity: 0.8,
  },
  methodsContainer: {
    marginBottom: 30,
  },
  methodsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.light,
    marginBottom: 20,
    textAlign: 'center',
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary.main,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  selectedMethod: {
    backgroundColor: COLORS.primary.dark,
    opacity: 0.7,
  },
  methodContent: {
    flex: 1,
    marginLeft: 16,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  methodDesc: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
  },
  inviteCodeContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 30,
  },
  inviteCodeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.light,
    marginBottom: 8,
  },
  inviteCodeDesc: {
    fontSize: 14,
    color: COLORS.text.light,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 16,
  },
  inviteCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  inviteCodeButtonText: {
    color: COLORS.primary.main,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  closeButtonText: {
    color: COLORS.text.light,
    fontSize: 16,
    opacity: 0.7,
  },
});
