import * as React from 'react'
import { useState } from 'react'
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Text,
    Switch,
    Alert,
} from 'react-native'
import { FontAwesome, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'
import ScreenHeader from '@/components/ScreenHeader'
import SoldierAvatar from '@/components/SoldierAvatar'
import { VoicePlaybackToggle } from '@/components/ui/VoicePlaybackToggle'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'
import { AnalyticsEventType } from '@/services/analytics'
import { MILITARY_RANKS } from '@/services/militaryRanking'

type ProfileSection = 'journey' | 'settings'

export default function ProfileScreen() {
    const {
        isDark,
        setTheme,
        themeColor,
        setThemeColor,
        userSettings,
        saveUserSettings,
        userStats,
        theme,
    } = useAppStore()
    const router = useRouter()
    const { signOut, isSignedIn } = useAuth()
    const { trackEvent } = useAnalytics()

    // Track screen view
    useScreenTracking('profile')

    const [activeSection, setActiveSection] = useState<ProfileSection>('journey')

    const handleThemeChange = (value: boolean) => {
        const oldTheme = isDark ? 'dark' : 'light'
        const newTheme = value ? 'dark' : 'light'
        setTheme(newTheme)

        trackEvent(AnalyticsEventType.THEME_CHANGED, {
            old_value: oldTheme,
            new_value: newTheme
        })
    }

    const handleVoiceEngineChange = (engine: 'whisper' | 'native') => {
        const oldEngine = userSettings.voiceEngine
        saveUserSettings({
            ...userSettings,
            voiceEngine: engine,
        })

        trackEvent(AnalyticsEventType.VOICE_ENGINE_CHANGED, {
            old_value: oldEngine,
            new_value: engine
        })
    }

    const handleSignOut = async () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await signOut()
                        } catch (error) {
                            console.error('Sign out error:', error)
                        }
                    }
                }
            ]
        )
    }

    const handleCustomizeAvatar = () => {
        console.log('Navigating to avatar screen')
        // Use push to navigate to avatar as a modal/screen
        router.push('/avatar')
    }

    // Get current rank info
    const currentRank = userStats?.rank || 'recruit'
    const rankInfo = MILITARY_RANKS.find(r => r.rank === currentRank) || MILITARY_RANKS[0]

    const styles = getStyles(theme, isDark)

    return (
        <ThemedContainer style={styles.container}>
            <ScreenHeader
                title="PROFILE"
                subtitle="YOUR SPIRITUAL JOURNEY"
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Section Tabs - At the top for easy access */}
                <View style={[styles.sectionTabs, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                    <TouchableOpacity
                        style={[
                            styles.sectionTab,
                            activeSection === 'journey' && styles.activeTab,
                            activeSection === 'journey' && { backgroundColor: theme.accent }
                        ]}
                        onPress={() => setActiveSection('journey')}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name="map"
                            size={16}
                            color={activeSection === 'journey' ? (theme.accentContrastText || '#FFFFFF') : theme.textSecondary}
                        />
                        <ThemedText
                            variant="caption"
                            style={[styles.tabText, activeSection === 'journey' && { color: theme.accentContrastText || '#FFFFFF' }]}
                        >
                            Journey
                        </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.sectionTab,
                            activeSection === 'settings' && styles.activeTab,
                            activeSection === 'settings' && { backgroundColor: theme.accent }
                        ]}
                        onPress={() => setActiveSection('settings')}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name="settings"
                            size={16}
                            color={activeSection === 'settings' ? (theme.accentContrastText || '#FFFFFF') : theme.textSecondary}
                        />
                        <ThemedText
                            variant="caption"
                            style={[styles.tabText, activeSection === 'settings' && { color: theme.accentContrastText || '#FFFFFF' }]}
                        >
                            Settings
                        </ThemedText>
                    </TouchableOpacity>
                </View>

                {/* Journey Section */}
                {activeSection === 'journey' && (
                    <View style={styles.sectionContent}>
                        {/* Avatar and Rank Section */}
                        <View style={styles.avatarSection}>
                            <SoldierAvatar size="large" showStats={true} />
                            <View style={styles.rankInfo}>
                                <ThemedText variant="heading" style={styles.rankTitle}>{rankInfo.title}</ThemedText>
                                <ThemedText variant="caption" style={styles.rankXP}>
                                    {rankInfo.insignia} {rankInfo.description}
                                </ThemedText>
                            </View>
                            <TouchableOpacity
                                style={StyleSheet.flatten([styles.customizeButton, { backgroundColor: theme.accent }])}
                                activeOpacity={0.8}
                                onPress={() => router.push('/avatar')}
                            >
                                <Ionicons name="create-outline" size={16} color={theme.accentContrastText || '#FFFFFF'} />
                                <Text style={[styles.customizeButtonText, { color: theme.accentContrastText || '#FFFFFF' }]}>Customize Avatar</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Quick Stats */}
                        <View style={styles.statsGrid}>
                            <View style={[styles.statItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                <Ionicons name="flame" size={24} color="#FF6B35" />
                                <ThemedText variant="heading" style={styles.statValue}>{userStats?.streak || 0}</ThemedText>
                                <ThemedText variant="caption" style={styles.statLabel}>Day Streak</ThemedText>
                            </View>
                            <View style={[styles.statItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                <FontAwesome5 name="crosshairs" size={24} color={theme.accent} />
                                <ThemedText variant="heading" style={styles.statValue}>{userStats?.totalPracticed || 0}</ThemedText>
                                <ThemedText variant="caption" style={styles.statLabel}>Drills</ThemedText>
                            </View>
                            <View style={[styles.statItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                <FontAwesome name="star" size={24} color="#FFD700" />
                                <ThemedText variant="heading" style={styles.statValue}>{userStats?.averageAccuracy ? Math.round(userStats.averageAccuracy) : 0}%</ThemedText>
                                <ThemedText variant="caption" style={styles.statLabel}>Accuracy</ThemedText>
                            </View>
                        </View>

                        {/* Mission Reports Link */}
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => router.push('/mission-report')}
                        >
                            <View style={styles.menuIcon}>
                                <Ionicons name="document-text" size={22} color={theme.accent} />
                            </View>
                            <View style={styles.menuContent}>
                                <ThemedText variant="body">Mission Reports</ThemedText>
                                <ThemedText variant="caption" style={styles.menuSubtitle}>View your detailed progress</ThemedText>
                            </View>
                            <FontAwesome5 name="chevron-right" size={14} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Settings Section */}
                {activeSection === 'settings' && (
                    <View style={styles.sectionContent}>
                        {/* Dark Mode Toggle */}
                        <View style={styles.settingItem}>
                            <View style={styles.settingIcon}>
                                <Ionicons name="moon" size={22} color={theme.accent} />
                            </View>
                            <View style={styles.settingContent}>
                                <ThemedText variant="body">Dark Mode</ThemedText>
                            </View>
                            <Switch
                                value={isDark}
                                onValueChange={handleThemeChange}
                                trackColor={{ false: '#767577', true: theme.accent }}
                                thumbColor={isDark ? '#fff' : '#f4f3f4'}
                            />
                        </View>

                        {/* Voice Engine */}
                        <View style={styles.settingItem}>
                            <View style={styles.settingIcon}>
                                <FontAwesome name="microphone" size={22} color={theme.accent} />
                            </View>
                            <View style={styles.settingContent}>
                                <ThemedText variant="body">Voice Engine</ThemedText>
                                <ThemedText variant="caption" style={styles.settingSubtitle}>
                                    {userSettings.voiceEngine === 'whisper' ? 'Whisper (AI)' : 'Native'}
                                </ThemedText>
                            </View>
                            <TouchableOpacity
                                style={styles.engineToggle}
                                onPress={() => handleVoiceEngineChange(userSettings.voiceEngine === 'whisper' ? 'native' : 'whisper')}
                            >
                                <ThemedText variant="caption" style={styles.engineToggleText}>
                                    Switch
                                </ThemedText>
                            </TouchableOpacity>
                        </View>

                        {/* Voice Playback */}
                        <View style={styles.settingItem}>
                            <View style={styles.settingIcon}>
                                <Ionicons name="volume-high" size={22} color={theme.accent} />
                            </View>
                            <View style={styles.settingContent}>
                                <ThemedText variant="body">Voice Playback</ThemedText>
                            </View>
                            <VoicePlaybackToggle isDark={isDark} theme={theme} />
                        </View>

                        {/* Full Settings Link */}
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => router.push('/settings')}
                        >
                            <View style={styles.menuIcon}>
                                <Ionicons name="settings-outline" size={22} color={theme.accent} />
                            </View>
                            <View style={styles.menuContent}>
                                <ThemedText variant="body">Advanced Settings</ThemedText>
                                <ThemedText variant="caption" style={styles.menuSubtitle}>Theme colors, notifications & more</ThemedText>
                            </View>
                            <FontAwesome5 name="chevron-right" size={14} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Sign Out Button */}
                {isSignedIn && (
                    <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                        <Text style={styles.signOutText}>Sign Out</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </ThemedContainer>
    )
}

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 100,
    },
    sectionTabs: {
        flexDirection: 'row',
        borderRadius: 14,
        padding: 4,
        marginBottom: 20,
        marginTop: 8,
    },
    sectionTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
    },
    activeTab: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    tabText: {
        fontSize: 12,
        fontWeight: '600',
        opacity: 0.6,
    },
    activeTabText: {
        opacity: 1,
    },
    sectionContent: {
        marginBottom: 24,
    },
    avatarSection: {
        alignItems: 'center',
        paddingVertical: 16,
        marginBottom: 16,
    },
    rankInfo: {
        alignItems: 'center',
        marginTop: 12,
    },
    rankTitle: {
        fontSize: 24,
    },
    rankXP: {
        marginTop: 4,
        opacity: 0.7,
    },
    customizeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginTop: 16,
        gap: 6,
    },
    customizeButtonText: {
        fontWeight: '600',
        fontSize: 14,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
        gap: 12,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        borderRadius: 12,
    },
    statValue: {
        fontSize: 20,
        marginTop: 8,
    },
    statLabel: {
        marginTop: 4,
        opacity: 0.7,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.surface,
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    settingIcon: {
        marginRight: 12,
    },
    settingContent: {
        flex: 1,
    },
    settingSubtitle: {
        opacity: 0.6,
        marginTop: 2,
    },
    engineToggle: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: theme.accent + '20',
        borderRadius: 6,
    },
    engineToggleText: {
        color: theme.accent,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.surface,
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    menuIcon: {
        marginRight: 12,
    },
    menuContent: {
        flex: 1,
    },
    menuSubtitle: {
        opacity: 0.6,
        marginTop: 2,
    },
    comingSoonCard: {
        alignItems: 'center',
        backgroundColor: theme.surface,
        padding: 32,
        borderRadius: 16,
    },
    comingSoonTitle: {
        marginTop: 16,
        marginBottom: 8,
    },
    comingSoonText: {
        textAlign: 'center',
        opacity: 0.7,
        lineHeight: 22,
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        marginTop: 16,
    },
    signOutText: {
        color: '#ef4444',
        marginLeft: 8,
        fontSize: 16,
    },
})
