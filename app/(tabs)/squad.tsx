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
    MILITARY_TYPOGRAPHY,
} from '@/constants/colors'
import { useAppStore } from '@/hooks/useAppStore'
import ActionButton from '@/components/ActionButton'

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
        <LinearGradient
            colors={backgroundColors}
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
        >
            <View style={styles.header}>
                <Text style={[styles.title, MILITARY_TYPOGRAPHY.heading]}>
                    SQUADRON COMMAND
                </Text>
                <Text style={[styles.subtitle, MILITARY_TYPOGRAPHY.caption]}>
                    MANAGE UNIT & ENGAGEMENTS
                </Text>
            </View>

            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'squad' && styles.activeTab]}
                    onPress={() => setActiveTab('squad')}
                >
                    <Text
                        style={[
                            styles.tabText,
                            activeTab === 'squad' && styles.activeTabText,
                        ]}
                    >
                        MY SQUAD
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'leaderboard' && styles.activeTab]}
                    onPress={() => setActiveTab('leaderboard')}
                >
                    <Text
                        style={[
                            styles.tabText,
                            activeTab === 'leaderboard' && styles.activeTabText,
                        ]}
                    >
                        LEADERBOARD
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                {activeTab === 'squad' ? (
                    <>
                        {/* Active Challenges */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, MILITARY_TYPOGRAPHY.subheading]}>
                                ACTIVE OPERATIONS
                            </Text>
                            <View style={styles.challengeCard}>
                                <View style={styles.challengeHeader}>
                                    <Ionicons name="flag" size={20} color={TACTICAL_THEME.warning} />
                                    <Text style={styles.challengeTitle}>RACE TO 100 ROUNDS</Text>
                                </View>
                                <Text style={styles.challengeDesc}>
                                    First to complete 100 perfect rounds wins the "Sharpshooter" badge.
                                </Text>
                                <View style={styles.progressBar}>
                                    <View style={[styles.progressFill, { width: '65%' }]} />
                                </View>
                                <Text style={styles.progressText}>65 / 100 ROUNDS</Text>
                            </View>
                        </View>

                        {/* Squad List */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, MILITARY_TYPOGRAPHY.subheading]}>
                                UNIT ROSTER
                            </Text>
                            {SQUAD_MEMBERS.map((member) => (
                                <View key={member.id} style={styles.memberCard}>
                                    <Image source={{ uri: member.avatar }} style={styles.avatar} />
                                    <View style={styles.memberInfo}>
                                        <Text style={styles.memberName}>{member.name}</Text>
                                        <Text style={styles.memberRank}>{member.rank}</Text>
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
                                                                : TACTICAL_THEME.textSecondary,
                                                },
                                            ]}
                                        />
                                        <Text style={styles.statusText}>{member.status}</Text>
                                    </View>
                                </View>
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
                        <View style={styles.leaderboardHeader}>
                            <Text style={styles.colRank}>#</Text>
                            <Text style={styles.colName}>SOLDIER</Text>
                            <Text style={styles.colScore}>SCORE</Text>
                        </View>
                        {LEADERBOARD.map((item, index) => (
                            <View
                                key={item.id}
                                style={[
                                    styles.leaderboardRow,
                                    item.name === 'You' && styles.currentUserRow,
                                ]}
                            >
                                <Text style={styles.rankText}>{item.rank}</Text>
                                <Text style={styles.nameText}>{item.name}</Text>
                                <Text style={styles.scoreText}>{item.score}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </LinearGradient>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 20,
        paddingTop: 60,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    title: {
        color: TACTICAL_THEME.text,
        marginBottom: 4,
    },
    subtitle: {
        color: TACTICAL_THEME.textSecondary,
    },
    tabContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    activeTab: {
        backgroundColor: TACTICAL_THEME.accent,
        borderColor: TACTICAL_THEME.accent,
    },
    tabText: {
        color: TACTICAL_THEME.textSecondary,
        fontWeight: 'bold',
        fontSize: 12,
        letterSpacing: 1,
    },
    activeTabText: {
        color: TACTICAL_THEME.text,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        color: TACTICAL_THEME.text,
        marginBottom: 12,
        letterSpacing: 1,
    },
    challengeCard: {
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderRadius: 12,
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
        color: TACTICAL_THEME.textSecondary,
        fontSize: 12,
        marginBottom: 12,
    },
    progressBar: {
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 3,
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: TACTICAL_THEME.warning,
        borderRadius: 3,
    },
    progressText: {
        color: TACTICAL_THEME.text,
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'right',
    },
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: 12,
        borderRadius: 12,
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
        color: TACTICAL_THEME.text,
        fontWeight: 'bold',
        fontSize: 14,
    },
    memberRank: {
        color: TACTICAL_THEME.textSecondary,
        fontSize: 12,
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
        color: TACTICAL_THEME.textSecondary,
        fontSize: 10,
    },
    leaderboardHeader: {
        flexDirection: 'row',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        marginBottom: 8,
    },
    colRank: { width: 40, color: TACTICAL_THEME.textSecondary, fontWeight: 'bold' },
    colName: { flex: 1, color: TACTICAL_THEME.textSecondary, fontWeight: 'bold' },
    colScore: { width: 60, color: TACTICAL_THEME.textSecondary, fontWeight: 'bold', textAlign: 'right' },
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
    rankText: { width: 40, color: TACTICAL_THEME.text, fontWeight: 'bold' },
    nameText: { flex: 1, color: TACTICAL_THEME.text },
    scoreText: { width: 60, color: TACTICAL_THEME.accent, fontWeight: 'bold', textAlign: 'right' },
})
