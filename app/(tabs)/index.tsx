import React from 'react'
import { StyleSheet, Text, ScrollView, View, TouchableOpacity } from 'react-native'
import { FontAwesome5, FontAwesome, Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'
import ScreenHeader from '@/components/ScreenHeader'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import StreakChallenge from '@/components/StreakChallenge'
import SoldierAvatar from '@/components/SoldierAvatar'

export default function HomeScreen() {
  const { isLoading, theme, isDark } = useAppStore()
  const router = useRouter()

  return (
    <ThemedContainer style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Command Center Header */}
        <ScreenHeader
          title="COMMAND CENTER"
          subtitle="COORDINATE YOUR MISSION"
        />

        {/* Operations - Mission Flows */}
        <View style={styles.operationsSection}>
          <ThemedText variant="heading" style={styles.sectionTitle}>OPERATIONS</ThemedText>
          <ThemedText variant="caption" style={styles.sectionSubtitle}>
            Select your mission type and lead your troops to victory
          </ThemedText>

          {/* Primary Mission Cards */}
          <TouchableOpacity
            style={styles.missionCardWrapper}
            onPress={() => router.push({ pathname: '/(tabs)/campaign', params: { mode: 'campaign' } })}
            activeOpacity={0.9}
          >
            <View style={[styles.missionCard, styles.conquestCard]}>
              <View style={styles.missionCardLeft}>
                <Ionicons name="trophy" size={32} color="#FFF" />
                <View style={styles.missionCardContent}>
                  <Text style={[styles.missionCardTitle, { color: '#FFF', fontWeight: 'bold' }]}>CONQUEST MODE</Text>
                  <Text style={[styles.missionCardSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>
                    Campaign challenges and progressive missions
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.6)" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.missionCardWrapper}
            onPress={() => router.push({ pathname: '/(tabs)/campaign', params: { mode: 'collection' } })}
            activeOpacity={0.9}
          >
            <View style={[styles.missionCard, styles.challengeCard]}>
              <View style={styles.missionCardLeft}>
                <Ionicons name="book" size={32} color="#FFF" />
                <View style={styles.missionCardContent}>
                  <Text style={[styles.missionCardTitle, { color: '#FFF', fontWeight: 'bold' }]}>COLLECTION TESTING</Text>
                  <Text style={[styles.missionCardSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>
                    Practice verses from your saved collections
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.6)" />
            </View>
          </TouchableOpacity>

          {/* Secondary Mission Cards */}
          <TouchableOpacity
            style={styles.missionCardWrapper}
            onPress={() => router.replace('/(tabs)/squad')}
            activeOpacity={0.9}
          >
            <ThemedCard variant="glass" style={styles.missionCard}>
              <View style={styles.missionCardLeft}>
                <View style={[
                  styles.iconBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.05)'
                      : 'rgba(0,0,0,0.05)'
                  }
                ]}>
                  <FontAwesome5 name="users" size={28} color={theme.accent} />
                </View>
                <View style={styles.missionCardContent}>
                  <ThemedText variant="heading" style={styles.missionCardTitle}>SQUAD MISSIONS</ThemedText>
                  <ThemedText variant="body" numberOfLines={2} style={styles.missionCardSubtitle}>
                    Team-based challenges and multiplayer mode
                  </ThemedText>
                </View>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color={theme.textSecondary} style={{ opacity: 0.5 }} />
            </ThemedCard>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.missionCardWrapper}
            onPress={() => router.replace('/(tabs)/arsenal')}
            activeOpacity={0.9}
          >
            <ThemedCard variant="glass" style={styles.missionCard}>
              <View style={styles.missionCardLeft}>
                <View style={[
                  styles.iconBox,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.05)'
                      : 'rgba(0,0,0,0.05)'
                  }
                ]}>
                  <FontAwesome name="cubes" size={28} color={theme.accent} />
                </View>
                <View style={styles.missionCardContent}>
                  <ThemedText variant="heading" style={styles.missionCardTitle}>EQUIP ARSENAL</ThemedText>
                  <ThemedText variant="body" numberOfLines={2} style={styles.missionCardSubtitle}>
                    Armor, weapons, and scripture management
                  </ThemedText>
                </View>
              </View>
              <FontAwesome5 name="chevron-right" size={14} color={theme.textSecondary} style={{ opacity: 0.5 }} />
            </ThemedCard>
          </TouchableOpacity>
        </View>

        {/* Daily Goals & Progress - Subordinate Information */}
        <View style={styles.statusSection}>
          <View style={styles.miniAvatarContainer}>
            <SoldierAvatar size="small" showStats={true} />
          </View>

          <StreakChallenge compact={true} />

          {/* Quick Actions - Small, inline */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: theme.surface }]}
              onPress={() => router.replace('/(tabs)/mission-report')}
            >
              <Ionicons name="document-text-outline" size={20} color={theme.accent} />
              <Text style={[styles.quickActionText, { color: theme.text }]}>Reports</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: theme.surface }]}
              onPress={() => router.replace('/(tabs)/settings')}
            >
              <Ionicons name="settings-outline" size={20} color={theme.accent} />
              <Text style={[styles.quickActionText, { color: theme.text }]}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <LoadingOverlay visible={isLoading} message="Mobilizing forces..." />
    </ThemedContainer>
  )
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
    paddingHorizontal: 20,
  },
  sectionSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.7,
    letterSpacing: 0.5,
  },

  // Major Operations Section
  operationsSection: {
    marginTop: 32,
  },

  // Mission Section - Primary Focus
  missionSection: {
    marginTop: 20,
  },
  missionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  missionCardWrapper: {
    marginBottom: 16,
  },
  missionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 20,
    minHeight: 80,
  },
  conquestCard: {
    backgroundColor: '#1a4f82',
  },
  challengeCard: {
    backgroundColor: '#2a69ac',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },

  secondaryMissionCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'transparent',
  },
  missionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  missionCardContent: {
    flex: 1,
  },
  missionCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  missionCardSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },

  // Status Section - Progress & Quick Actions
  statusSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  miniAvatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Legacy styles (keep for compatibility)
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: '80%',
  },
  tacticalActions: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  tacticalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 8,
    minWidth: 80,
  },
  tacticalButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  loadingIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
