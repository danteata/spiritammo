import { useQuery, useMutation } from 'convex/react'
import { api } from '../convex/_generated/api'
import * as React from 'react'
import { useAuth } from '@clerk/clerk-expo'
import { useAppStore } from './useAppStore'

// User hooks
export function useConvexUser() {
    const { isSignedIn } = useAuth()
    const user = useQuery(api.users.getCurrentUser)
    const upsertUser = useMutation(api.users.upsertUser)
    const updateStats = useMutation(api.users.updateStats)

    const syncLocalUserToConvex = React.useCallback(async () => {
        if (!isSignedIn) return

        const localStats = useAppStore.getState()
        await upsertUser({
            displayName: localStats.userStats?.displayName || 'Soldier',
            rank: localStats.userStats?.rank || 'Recruit',
            valorPoints: localStats.userStats?.valorPoints || 0,
            streak: localStats.userStats?.streak || 0,
            totalPracticed: localStats.userStats?.totalPracticed || 0,
            averageAccuracy: localStats.userStats?.averageAccuracy,
            avatar: localStats.userStats?.avatar,
        })
    }, [isSignedIn, upsertUser])

    return {
        user,
        syncLocalUserToConvex,
        updateStats,
        isLoading: user === undefined,
    }
}

// Squad hooks
export function useSquads() {
    const { isSignedIn } = useAuth()
    const mySquads = useQuery(api.squads.getMySquads)
    const createSquad = useMutation(api.squads.create)
    const joinSquad = useMutation(api.squads.joinByCode)
    const leaveSquad = useMutation(api.squads.leave)

    return {
        squads: mySquads || [],
        createSquad,
        joinSquad,
        leaveSquad,
        isLoading: mySquads === undefined,
    }
}

export function useSquad(squadId: string) {
    const squad = useQuery(api.squads.getById, { squadId: squadId as any })
    const members = useQuery(api.squads.getMembersWithPresence, { squadId: squadId as any })
    const regenerateCode = useMutation(api.squads.regenerateInviteCode)

    return {
        squad,
        members: members || [],
        regenerateCode,
        isLoading: squad === undefined,
    }
}

// Challenge hooks
export function useSquadChallenges(squadId: string) {
    const challenges = useQuery(api.challenges.getBySquad, { squadId: squadId as any })
    const createChallenge = useMutation(api.challenges.create)
    const joinChallenge = useMutation(api.challenges.join)
    const updateProgress = useMutation(api.challenges.updateProgress)

    return {
        challenges: challenges || [],
        createChallenge,
        joinChallenge,
        updateProgress,
        isLoading: challenges === undefined,
    }
}

export function useMyActiveChallenges() {
    const challenges = useQuery(api.challenges.getMyActiveChallenges)

    return {
        challenges: challenges || [],
        isLoading: challenges === undefined,
    }
}

export function useChallengeLeaderboard(challengeId: string) {
    const leaderboard = useQuery(api.challenges.getLeaderboard, { challengeId: challengeId as any })

    return {
        leaderboard: leaderboard || [],
        isLoading: leaderboard === undefined,
    }
}

// Presence hooks
export function usePresence(squadId?: string) {
    const { isSignedIn } = useAuth()
    const myPresence = useQuery(api.presence.getMyPresence)
    const squadPresence = useQuery(
        api.presence.getBySquad,
        squadId ? { squadId: squadId as any } : 'skip'
    )
    const onlineCount = useQuery(
        api.presence.getOnlineCount,
        squadId ? { squadId: squadId as any } : 'skip'
    )
    const updatePresence = useMutation(api.presence.update)
    const setOffline = useMutation(api.presence.setOffline)

    // Update presence when screen changes
    const setActivity = React.useCallback(
        async (
            status: 'online' | 'training' | 'battle' | 'arsenal' | 'offline',
            currentActivity?: string
        ) => {
            if (!isSignedIn) return
            await updatePresence({
                squadId: squadId as any,
                status,
                currentActivity,
            })
        },
        [isSignedIn, squadId, updatePresence]
    )

    // Set offline on unmount
    React.useEffect(() => {
        return () => {
            if (isSignedIn) {
                setOffline()
            }
        }
    }, [isSignedIn, setOffline])

    return {
        myPresence,
        squadPresence: squadPresence || [],
        onlineCount: onlineCount || 0,
        setActivity,
        setOffline,
    }
}

// Leaderboard hooks
export function useLeaderboard(
    type: 'valor' | 'streak' | 'accuracy' | 'weekly',
    limit?: number
) {
    const leaderboard = useQuery(api.users.getLeaderboard, { type, limit })

    return {
        leaderboard: leaderboard || [],
        isLoading: leaderboard === undefined,
    }
}

// Combined hook for squad screen
export function useSquadScreen(squadId: string) {
    const { squad, members, isLoading: squadLoading } = useSquad(squadId)
    const { challenges, isLoading: challengesLoading } = useSquadChallenges(squadId)
    const { squadPresence, onlineCount, setActivity } = usePresence(squadId)

    // Set presence to online when viewing squad
    React.useEffect(() => {
        if (squadId) {
            setActivity('online', 'Viewing squad')
        }
    }, [squadId, setActivity])

    return {
        squad,
        members,
        challenges,
        onlineMembers: squadPresence,
        onlineCount,
        isLoading: squadLoading || challengesLoading,
    }
}
