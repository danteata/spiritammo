import * as React from 'react'
import { useState, useEffect } from 'react'
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
import { useTheme } from '@/hooks/useTheme'
import useZustandStore from '@/hooks/zustandStore'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'
import ScreenHeader from '@/components/ScreenHeader'
import SoldierAvatar from '@/components/SoldierAvatar'
import { VoicePlaybackToggle } from '@/components/ui/VoicePlaybackToggle'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'
import { AnalyticsEventType } from '@/services/analytics'
import { MILITARY_RANKS } from '@/services/militaryRanking'
import { getDb } from '@/db/client'
import { practiceLogs as practiceLogsTable } from '@/db/schema'
import { desc } from 'drizzle-orm'
import { initializeDatabase } from '@/db/init'

type ProfileSection = 'journey' | 'settings'

export default function ProfileScreen() {
    const { isDark, themeColor, theme, setTheme, setThemeColor } = useTheme()
    const userSettings = useZustandStore((s) => s.userSettings)
    const saveUserSettings = useZustandStore((s) => s.saveUserSettings)
    const userStats = useZustandStore((s) => s.userStats)
    const scriptures = useZustandStore((s) => s.scriptures)
    const router = useRouter()
    const { signOut, isSignedIn } = useAuth()
    const { trackEvent } = useAnalytics()

    // Track screen view
    useScreenTracking('profile')

    const [activeSection, setActiveSection] = useState<ProfileSection>('journey')
    const [practiceLogs, setPracticeLogs] = useState<any[]>([])

    useEffect(() => {
        const loadPracticeLogs = async () => {
            try {
                await initializeDatabase()
                const db = await getDb()
                if (!db) return

                const logs = await db
                    .select()
                    .from(practiceLogsTable)
                    .orderBy(desc(practiceLogsTable.date))
                    .limit(5)

                setPracticeLogs(logs)
            } catch (error) {
                console.error('Failed to load practice logs:', error)
            }
        }

        loadPracticeLogs()
    }, [])

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
                <View style={[styles.sectionTabs, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF', borderColor: isDark ? 'transparent' : '#D4CBAB', borderWidth: isDark ? 0 : 1.5 }]}>
                    <TouchableOpacity
                        style={[
                            styles.sectionTab,
                            activeSection === 'journey' && styles.activeTab,
                            activeSection === 'journey' && { backgroundColor: isDark ? theme.accent : '#4A5D23' }
                        ]}
                        onPress={() => setActiveSection('journey')}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name="map"
                            size={16}
                            color={activeSection === 'journey' ? (isDark ? theme.accentContrastText : '#F5F0E1') : (isDark ? theme.textSecondary : '#6B7B3A')}
                        />
                        <ThemedText
                            variant="caption"
                            style={[styles.tabText, activeSection === 'journey' && styles.activeTabText, activeSection === 'journey' && { color: isDark ? theme.accentContrastText : '#F5F0E1' }]}
                        >
                            Journey
                        </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.sectionTab,
                            activeSection === 'settings' && styles.activeTab,
                            activeSection === 'settings' && { backgroundColor: isDark ? theme.accent : '#4A5D23' }
                        ]}
                        onPress={() => setActiveSection('settings')}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name="settings"
                            size={16}
                            color={activeSection === 'settings' ? (isDark ? theme.accentContrastText : '#F5F0E1') : (isDark ? theme.textSecondary : '#6B7B3A')}
                        />
                        <ThemedText
                            variant="caption"
                            style={[styles.tabText, activeSection === 'settings' && styles.activeTabText, activeSection === 'settings' && { color: isDark ? theme.accentContrastText : '#F5F0E1' }]}
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
                            <View style={[styles.statItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#D4CBAB', borderWidth: isDark ? 0 : 1.5 }]}>
                                <View style={[styles.statsAccentBar, { backgroundColor: isDark ? '#FF6B35' : '#B45309' }]} />
                                <Ionicons name="flame" size={22} color={isDark ? '#FF6B35' : '#B45309'} />
                                <ThemedText variant="heading" style={[styles.statValue, { color: isDark ? '#F8FAFC' : '#1A2309' }]}>{userStats?.streak || 0}</ThemedText>
                                <ThemedText variant="caption" style={[styles.statLabel, { color: isDark ? theme.textSecondary : '#6B7B3A' }]}>Day Streak</ThemedText>
                            </View>
                            <View style={[styles.statItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#D4CBAB', borderWidth: isDark ? 0 : 1.5 }]}>
                                <View style={[styles.statsAccentBar, { backgroundColor: isDark ? theme.accent : '#4A5D23' }]} />
                                <FontAwesome5 name="crosshairs" size={22} color={isDark ? theme.accent : '#4A5D23'} />
                                <ThemedText variant="heading" style={[styles.statValue, { color: isDark ? '#F8FAFC' : '#1A2309' }]}>{userStats?.totalPracticed || 0}</ThemedText>
                                <ThemedText variant="caption" style={[styles.statLabel, { color: isDark ? theme.textSecondary : '#6B7B3A' }]}>Drills</ThemedText>
                            </View>
                            <View style={[styles.statItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#D4CBAB', borderWidth: isDark ? 0 : 1.5 }]}>
                                <View style={[styles.statsAccentBar, { backgroundColor: isDark ? '#FFD700' : '#C8A951' }]} />
                                <FontAwesome name="star" size={22} color={isDark ? '#FFD700' : '#C8A951'} />
                                <ThemedText variant="heading" style={[styles.statValue, { color: isDark ? '#F8FAFC' : '#1A2309' }]}>{userStats?.averageAccuracy ? Math.round(userStats.averageAccuracy) : 0}%</ThemedText>
                                <ThemedText variant="caption" style={[styles.statLabel, { color: isDark ? theme.textSecondary : '#6B7B3A' }]}>Accuracy</ThemedText>
                            </View>
                        </View>

                        {/* Mission Report Snapshot */}
                        <View style={[styles.weeklyActivityCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                            <View style={styles.weeklyHeader}>
                                <ThemedText variant="body" style={styles.weeklyTitle}>Mission Reports</ThemedText>
                                <ThemedText variant="caption" style={styles.weeklySubtitle}>Recent performance snapshots</ThemedText>
                            </View>

                            {practiceLogs.length === 0 ? (
                                <View style={styles.emptyLogState}>
                                    <MaterialCommunityIcons name="file-document-outline" size={36} color={theme.textSecondary} />
                                    <ThemedText variant="caption" style={styles.emptyLogText}>
                                        No mission logs yet. Complete a drill to see results here.
                                    </ThemedText>
                                </View>
                            ) : (
                                <View style={styles.logsList}>
                                    {practiceLogs.map((log) => {
                                        const scripture = scriptures.find(s => s.id === log.scriptureId)
                                        const date = new Date(log.date)
                                        const accuracy = Number(log.accuracy || 0)
                                        const accuracyColor = accuracy >= 90
                                            ? theme.success
                                            : accuracy >= 75
                                                ? theme.warning
                                                : theme.error

                                        return (
                                            <View
                                                key={log.id}
                                                style={[
                                                    styles.logItem,
                                                    {
                                                        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
                                                    }
                                                ]}
                                            >
                                                <View style={styles.logHeader}>
                                                    <View style={styles.logDateContainer}>
                                                        <Ionicons name="time-outline" size={12} color={theme.textSecondary} />
                                                        <Text style={[styles.logDate, { color: theme.textSecondary }]}>
                                                            {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                        </Text>
                                                    </View>
                                                    <View style={[styles.accuracyBadge, { backgroundColor: accuracyColor }]}>
                                                        <Text style={styles.accuracyBadgeText}>{accuracy.toFixed(0)}%</Text>
                                                    </View>
                                                </View>
                                                {scripture && (
                                                    <View style={styles.logContent}>
                                                        <Text style={[styles.logReference, { color: theme.accent }]}>
                                                            {scripture.reference}
                                                        </Text>
                                                        <Text style={[styles.logText, { color: theme.textSecondary }]} numberOfLines={2}>
                                                            {scripture.text}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        )
                                    })}
                                </View>
                            )}

                            <TouchableOpacity
                                style={styles.reportLink}
                                onPress={() => router.push('/mission-report')}
                            >
                                <Ionicons name="document-text" size={16} color={theme.accent} />
                                <ThemedText variant="caption" style={styles.reportLinkText}>View Full Report</ThemedText>
                            </TouchableOpacity>
                        </View>
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
        borderRadius: 8,
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
        borderRadius: 8,
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
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    statsAccentBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
    },
    statValue: {
        fontSize: 20,
        marginTop: 8,
    },
    statLabel: {
        marginTop: 4,
        opacity: 0.7,
    },
    weeklyActivityCard: {
        marginTop: 16,
        padding: 16,
        borderRadius: 8,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: '#D4CBAB',
    },
    weeklyHeader: {
        marginBottom: 12,
    },
    weeklyTitle: {
        fontWeight: '600',
        marginBottom: 2,
    },
    weeklySubtitle: {
        opacity: 0.6,
    },
    emptyLogState: {
        alignItems: 'center',
        paddingVertical: 20,
        gap: 8,
    },
    emptyLogText: {
        textAlign: 'center',
        opacity: 0.7,
    },
    logsList: {
        gap: 10,
    },
    logItem: {
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
    },
    logHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    logDateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    logDate: {
        fontSize: 11,
    },
    accuracyBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
    },
    accuracyBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#fff',
    },
    logContent: {
        gap: 4,
    },
    logReference: {
        fontSize: 12,
        fontWeight: '600',
    },
    logText: {
        fontSize: 12,
        lineHeight: 16,
    },
    reportLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 12,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: '#4A5D2340',
    },
    reportLinkText: {
        color: theme.accent,
        fontWeight: '600',
        letterSpacing: 0.6,
    },
    weeklyChart: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 80,
    },
    dayColumn: {
        alignItems: 'center',
        flex: 1,
    },
    dayBar: {
        width: 20,
        height: 60,
        borderRadius: 4,
        overflow: 'hidden',
        justifyContent: 'flex-end',
    },
    dayBarFill: {
        width: '100%',
        borderRadius: 4,
    },
    dayLabel: {
        fontSize: 10,
        marginTop: 4,
        opacity: 0.6,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? theme.surface : '#FFFFFF',
        padding: 16,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: isDark ? 0 : 1.5,
        borderColor: isDark ? 'transparent' : '#D4CBAB',
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
        backgroundColor: (isDark ? theme.accent : '#4A5D23') + '20',
        borderRadius: 6,
    },
    engineToggleText: {
        color: theme.accent,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? theme.surface : '#FFFFFF',
        padding: 16,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: isDark ? 0 : 1.5,
        borderColor: isDark ? 'transparent' : '#D4CBAB',
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
