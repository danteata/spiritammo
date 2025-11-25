import React, { useState } from 'react'
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Share,
    Image,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome, Ionicons } from '@expo/vector-icons'
import {
    GRADIENTS,
    TACTICAL_THEME,
    GARRISON_THEME,
    MILITARY_TYPOGRAPHY,
} from '@/constants/colors'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'
import { useAppStore } from '@/hooks/useAppStore'
import ActionButton from '@/components/ActionButton'
import ScreenHeader from '@/components/ScreenHeader'

// Mock Data
const SQUAD_MEMBERS = [
    { id: '1', name: 'Cpt. Sarah', rank: 'Captain', status: 'Online', avatar: 'https://i.pravatar.cc/150?u=1' },
    { id: '2', name: 'Lt. Mike', rank: 'Lieutenant', status: 'Training', avatar: 'https://i.pravatar.cc/150?u=2' },
    { id: '3', name: 'Sgt. John', rank: 'Sergeant', status: 'Offline', avatar: 'https://i.pravatar.cc/150?u=3' },
]

const LEADERBOARD = [
    { id: '1', name: 'Cpt. Sarah', score: 9850, rank: 1 },
    { id: '2', name: 'You', score: 8420, rank: 2 },
    { id: '3', name: 'Lt. Mike', score: 7200, rank: 3 },
    { id: '4', name: 'Sgt. John', score: 6500, rank: 4 },
]

export default function SquadScreen() {
    const { isDark } = useAppStore()
    const [activeTab, setActiveTab] = useState<'squad' | 'leaderboard'>('squad')

    const backgroundColors = isDark
        ? (GRADIENTS.tactical.background as [string, string])
        : (GRADIENTS.primary.light as [string, string])

    const handleInvite = async () => {
        try {
            await Share.share({
                message: 'Join my squad in SpiritAmmo! Use code: ALPHA-7',
                title: 'Recruit Soldier',
            })
        } catch (error) {
            console.error('Error sharing:', error)
        }
    }

    return (
        <ThemedContainer style={styles.container}>
            <ScreenHeader
                title="SQUADRON COMMAND"
                subtitle="MANAGE UNIT & ENGAGEMENTS"
            />
            <ScrollView style={styles.content}>

                {/* Tab Switcher */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[
                            styles.tab,
                            activeTab === 'squad' && styles.activeTab,
                            {
                                backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)',
                                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                            }
                        ]}
                        onPress={() => setActiveTab('squad')}
                    >
                        <ThemedText
                            variant="caption"
                            style={[
                                styles.tabText,
                                activeTab === 'squad' && { color: isDark ? TACTICAL_THEME.text : GARRISON_THEME.text },
                            ]}
                        >
                            MY SQUAD
                        </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.tab,
                            activeTab === 'leaderboard' && styles.activeTab,
                            {
                                backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)',
                                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                            }
                        ]}
                        onPress={() => setActiveTab('leaderboard')}
                    >
                        <ThemedText
                            variant="caption"
                            style={[
                                styles.tabText,
                                activeTab === 'leaderboard' && { color: isDark ? TACTICAL_THEME.text : GARRISON_THEME.text },
                            ]}
                        >
                            LEADERBOARD
                        </ThemedText>
                    </TouchableOpacity>
                </View>

                {activeTab === 'squad' ? (
                    <>
                        {/* Active Challenges */}
                        <View style={styles.section}>
                            <ThemedText variant="subheading" style={styles.sectionTitle}>
                                ACTIVE OPERATIONS
                            </ThemedText>
                            <ThemedCard style={styles.challengeCard} variant="default">
                                <View style={styles.challengeHeader}>
                                    <Ionicons name="flag" size={20} color={TACTICAL_THEME.warning} />
                                    <ThemedText variant="heading" style={styles.challengeTitle}>RACE TO 100 ROUNDS</ThemedText>
                                </View>
                                <ThemedText variant="body" style={styles.challengeDesc}>
                                    First to complete 100 perfect rounds wins the "Sharpshooter" badge.
                                </ThemedText>
                                <View style={styles.progressBar}>
                                    <View style={[styles.progressFill, { width: '65%' }]} />
                                </View>
                                <ThemedText variant="caption" style={styles.progressText}>65 / 100 ROUNDS</ThemedText>
                            </ThemedCard>
                        </View>

                        {/* Squad List */}
                        <View style={styles.section}>
                            <ThemedText variant="subheading" style={styles.sectionTitle}>
                                UNIT ROSTER
                            </ThemedText>
                            {SQUAD_MEMBERS.map((member) => (
                                <ThemedCard key={member.id} style={styles.memberCard} variant="flat">
                                    <Image source={{ uri: member.avatar }} style={styles.avatar} />
                                    <View style={styles.memberInfo}>
                                        <ThemedText variant="body" style={styles.memberName}>{member.name}</ThemedText>
                                        <ThemedText variant="caption" style={styles.memberRank}>{member.rank}</ThemedText>
                                    </View>
                                    <View style={styles.statusContainer}>
                                        <View
                                            style={[
                                                styles.statusDot,
                                                {
                                                    backgroundColor:
                                                        member.status === 'Online'
                                                            ? TACTICAL_THEME.success
                                                            : member.status === 'Training'
                                                                ? TACTICAL_THEME.warning
                                                                : (isDark ? TACTICAL_THEME.textSecondary : GARRISON_THEME.textSecondary),
                                                },
                                            ]}
                                        />
                                        <ThemedText variant="caption" style={styles.statusText}>{member.status}</ThemedText>
                                    </View>
                                </ThemedCard>
                            ))}
                        </View>

                        <ActionButton
                            title="RECRUIT SOLDIER"
                            subtitle="INVITE FRIEND"
                            onPress={handleInvite}
                            style={{ marginTop: 20 }}
                        />
                    </>
                ) : (
                    /* Leaderboard */
                    <View style={styles.section}>
                        <View style={[styles.leaderboardHeader, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }]}>
                            <ThemedText variant="caption" style={styles.colRank}>#</ThemedText>
                            <ThemedText variant="caption" style={styles.colName}>SOLDIER</ThemedText>
                            <ThemedText variant="caption" style={styles.colScore}>SCORE</ThemedText>
                        </View>
                        {LEADERBOARD.map((item, index) => (
                            <View
                                key={item.id}
                                style={[
                                    styles.leaderboardRow,
                                    item.name === 'You' && styles.currentUserRow,
                                    { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }
                                ]}
                            >
                                <ThemedText variant="body" style={styles.rankText}>{item.rank}</ThemedText>
                                <ThemedText variant="body" style={styles.nameText}>{item.name}</ThemedText>
                                <ThemedText variant="body" style={styles.scoreText}>{item.score}</ThemedText>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </ThemedContainer>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 20,
        gap: 10,
        marginTop: 10,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
        // Removed hardcoded background
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    activeTab: {
        backgroundColor: TACTICAL_THEME.accent,
        borderColor: TACTICAL_THEME.accent,
    },
    tabText: {
        fontWeight: 'bold',
        fontSize: 12,
        letterSpacing: 1,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        marginBottom: 12,
        letterSpacing: 1,
    },
    challengeCard: {
        padding: 16,
        borderWidth: 1,
        borderColor: TACTICAL_THEME.warning,
    },
    challengeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    challengeTitle: {
        color: TACTICAL_THEME.warning,
        fontWeight: 'bold',
        fontSize: 16,
    },
    challengeDesc: {
        fontSize: 12,
        marginBottom: 12,
    },
    progressBar: {
        height: 6,
        backgroundColor: 'rgba(128, 128, 128, 0.2)', // Visible on both backgrounds
        borderRadius: 3,
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: TACTICAL_THEME.warning,
        borderRadius: 3,
    },
    progressText: {
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'right',
    },
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginBottom: 8,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#333',
    },
    memberInfo: {
        flex: 1,
        marginLeft: 12,
    },
    memberName: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    memberRank: {
        fontSize: 12,
        opacity: 0.7,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 10,
        opacity: 0.7,
    },
    leaderboardHeader: {
        flexDirection: 'row',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        marginBottom: 8,
    },
    colRank: { width: 40, fontWeight: 'bold' },
    colName: { flex: 1, fontWeight: 'bold' },
    colScore: { width: 60, fontWeight: 'bold', textAlign: 'right' },
    leaderboardRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    currentUserRow: {
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        marginHorizontal: -8,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    rankText: { width: 40, fontWeight: 'bold' },
    nameText: { flex: 1 },
    scoreText: { width: 60, color: TACTICAL_THEME.accent, fontWeight: 'bold', textAlign: 'right' },
})
