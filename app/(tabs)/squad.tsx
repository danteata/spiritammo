import React, { useState, useEffect } from 'react'
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Share,
    Image,
    Dimensions
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
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

import { useAuth, useUser } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'

import CreateOperationModal from '@/components/CreateOperationModal'
import * as Linking from 'expo-linking'

const { width } = Dimensions.get('window')

export default function SquadScreen() {
    const { isDark, squadMembers = [], squadChallenges = [], loadSquadData, userStats } = useAppStore()
    const { isSignedIn, isLoaded } = useAuth()
    const { user } = useUser()
    const router = useRouter()

    const [activeTab, setActiveTab] = useState<'squad' | 'leaderboard'>('squad')

    const [showCreateOp, setShowCreateOp] = useState(false)

    useEffect(() => {
        if (isSignedIn) {
            loadSquadData()
        }
    }, [isSignedIn])

    if (!isLoaded) return <View style={{ flex: 1 }} />

    if (!isSignedIn) {
        // ... existing gated code handles this ...
        return (
            <ThemedContainer style={styles.container}>
                <ScreenHeader
                    title="CLASSIFIED ACCESS"
                    subtitle="AUTHENTICATION REQUIRED"
                />
                <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="lock-closed" size={64} color={TACTICAL_THEME.warning} style={{ marginBottom: 20 }} />
                    <ThemedText variant="heading" style={{ textAlign: 'center', marginBottom: 12 }}>
                        IDENTIFICATION REQUIRED
                    </ThemedText>
                    <ThemedText variant="body" style={{ textAlign: 'center', opacity: 0.7, marginBottom: 30 }}>
                        Squadron features including Leaderboards, Challenges, and Data Sync are restricted to authorized personnel.
                    </ThemedText>
                    <ActionButton
                        title="JOIN THE CORPS"
                        subtitle="CREATE ACCOUNT / SIGN IN"
                        onPress={() => router.push('/auth')}
                    />
                </View>
            </ThemedContainer>
        )
    }

    // Sort updated rankings
    const leaderboard = [
        ...squadMembers.map(m => ({ ...m, isUser: false })),
        {
            id: user?.id || 'user',
            name: user?.firstName || 'You',
            rank: userStats.rank.toUpperCase(),
            status: 'Online',
            avatar: user?.imageUrl || '',
            score: userStats.totalPracticed * 10,
            isUser: true
        }
    ].sort((a, b) => (b.score || 0) - (a.score || 0))
        .map((item, index) => ({ ...item, listRank: index + 1 }))

    const handleInvite = async () => {
        try {
            // Create a deep link: spiritammo://recruit?commanderId=...
            const redirectUrl = Linking.createURL('recruit', {
                queryParams: {
                    commanderId: user?.id || 'unknown',
                    name: user?.firstName || 'Commander'
                },
            })

            const message = `⚠️ MISSION BRIEF: You have been drafted by Commander ${user?.firstName || 'SpiritAmmo'}.\n\nJoin the squad: ${redirectUrl}`

            await Share.share({
                message: message,
                title: 'SpiritAmmo Recruitment',
                url: redirectUrl // iOS often uses this
            })
        } catch (error) {
            console.error('Error sharing:', error)
        }
    }

    const handleShareOperation = async (challenge: any) => {
        try {
            const redirectUrl = Linking.createURL('recruit', {
                queryParams: {
                    commanderId: user?.id || 'unknown',
                    name: user?.firstName || 'Commander',
                    opId: challenge.id,
                    opTitle: challenge.title,
                    opTarget: challenge.targetValue.toString(),
                    opType: challenge.type
                },
            })

            const message = `🚨 ORDERS RECEIVED: Commander ${user?.firstName} has issued a new directive: ${challenge.title}.\n\nTarget: ${challenge.targetValue} ${challenge.type}.\n\nAccept Mission: ${redirectUrl}`

            await Share.share({
                message: message,
                title: `Operation: ${challenge.title}`,
                url: redirectUrl
            })
        } catch (error) {
            console.error('Share error:', error)
        }
    }

    const renderChallenge = (challenge: any) => {
        const progressPercent = Math.min((challenge.currentValue / challenge.targetValue) * 100, 100)

        return (
            <ThemedCard key={challenge.id} style={styles.challengeCard} variant="default">
                <View style={styles.challengeHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="flag" size={20} color={TACTICAL_THEME.warning} />
                        <ThemedText variant="heading" style={styles.challengeTitle}>{challenge.title}</ThemedText>
                    </View>
                    <TouchableOpacity onPress={() => handleShareOperation(challenge)} style={{ padding: 4 }}>
                        <Ionicons name="share-outline" size={20} color={TACTICAL_THEME.accent} />
                    </TouchableOpacity>
                </View>
                <ThemedText variant="body" style={styles.challengeDesc}>
                    {challenge.description}
                </ThemedText>
                <View style={[styles.progressBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                    <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                </View>
                <View style={styles.challengeStats}>
                    <ThemedText variant="caption" style={styles.progressText}>
                        {challenge.currentValue} / {challenge.targetValue} {challenge.type}
                    </ThemedText>
                    <ThemedText variant="caption" style={styles.rewardText}>
                        REWARD: {challenge.reward}
                    </ThemedText>
                </View>
            </ThemedCard>
        )
    }

    return (
        <ThemedContainer style={styles.container}>
            <ScreenHeader
                title="SQUADRON COMMAND"
                subtitle="MANAGE UNIT & ENGAGEMENTS"
            />

            {/* Create Operation Modal */}
            <CreateOperationModal
                visible={showCreateOp}
                onClose={() => setShowCreateOp(false)}
            />

            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>

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
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <ThemedText variant="subheading" style={{ letterSpacing: 1 }}>
                                    ACTIVE OPERATIONS
                                </ThemedText>
                                <TouchableOpacity onPress={() => setShowCreateOp(true)}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Ionicons name="add-circle" size={18} color={TACTICAL_THEME.accent} />
                                        <ThemedText variant="caption" style={{ color: TACTICAL_THEME.accent, fontWeight: 'bold' }}>NEW ORDER</ThemedText>
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {squadChallenges.length > 0 ? (
                                squadChallenges.map(renderChallenge)
                            ) : (
                                <ThemedCard style={{ padding: 20, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(128,128,128,0.3)' }} variant="flat">
                                    <ThemedText variant="body" style={{ opacity: 0.6 }}>No active directives.</ThemedText>
                                    <ThemedText variant="caption" style={{ opacity: 0.4, marginTop: 4 }}>Press "NEW ORDER" to issue commands.</ThemedText>
                                </ThemedCard>
                            )}
                        </View>

                        {/* Squad List */}
                        <View style={styles.section}>
                            <ThemedText variant="subheading" style={styles.sectionTitle}>
                                UNIT ROSTER
                            </ThemedText>

                            {/* ME Card */}
                            <ThemedCard style={styles.memberCard} variant="flat">
                                <Image source={{ uri: user?.imageUrl }} style={styles.avatar} />
                                <View style={styles.memberInfo}>
                                    <ThemedText variant="body" style={styles.memberName}>{user?.fullName || 'You'} (Cmdr)</ThemedText>
                                    <ThemedText variant="caption" style={styles.memberRank}>{userStats.rank.toUpperCase()}</ThemedText>
                                </View>
                                <View style={styles.statusContainer}>
                                    <View style={[styles.statusDot, { backgroundColor: TACTICAL_THEME.success }]} />
                                    <ThemedText variant="caption" style={styles.statusText}>Online</ThemedText>
                                </View>
                            </ThemedCard>

                            {squadMembers.map((member) => (
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

                            {squadMembers.length === 0 && (
                                <View style={{ padding: 20, backgroundColor: 'rgba(255,165,0,0.05)', borderRadius: 8, marginBottom: 12, alignItems: 'center' }}>
                                    <Ionicons name="people-outline" size={32} color={TACTICAL_THEME.warning} style={{ opacity: 0.5 }} />
                                    <ThemedText variant="body" style={{ textAlign: 'center', marginTop: 8, opacity: 0.8 }}>Unit Strength: 1 (You)</ThemedText>
                                    <ThemedText variant="caption" style={{ textAlign: 'center', marginTop: 4, opacity: 0.6 }}>Recruit soldiers to build your fireteam.</ThemedText>
                                </View>
                            )}
                        </View>

                        <ActionButton
                            title="RECRUIT SOLDIER"
                            subtitle="SEND ENLISTMENT LINK"
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
                        {leaderboard.map((item) => (
                            <View
                                key={item.id}
                                style={[
                                    styles.leaderboardRow,
                                    item.isUser && styles.currentUserRow,
                                    { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }
                                ]}
                            >
                                <ThemedText variant="body" style={styles.rankText}>{item.listRank}</ThemedText>
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
        marginBottom: 12,
    },
    challengeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    challengeTitle: {
        color: TACTICAL_THEME.warning,
        fontWeight: 'bold',
        fontSize: 14,
    },
    challengeDesc: {
        fontSize: 12,
        marginBottom: 12,
        opacity: 0.8,
    },
    progressBarBg: {
        height: 6,
        borderRadius: 3,
        marginBottom: 8,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: TACTICAL_THEME.warning,
        borderRadius: 3,
    },
    challengeStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    rewardText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: TACTICAL_THEME.accent,
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
