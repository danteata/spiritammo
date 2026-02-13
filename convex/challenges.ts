import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get challenges for a squad
export const getBySquad = query({
    args: {
        squadId: v.id("squads"),
        status: v.optional(v.union(
            v.literal("pending"),
            v.literal("active"),
            v.literal("completed"),
            v.literal("expired")
        )),
    },
    handler: async (ctx, args) => {
        const challenges = await ctx.db
            .query("squadChallenges")
            .withIndex("bySquad", (q) => q.eq("squadId", args.squadId))
            .filter((q) =>
                args.status ? q.eq(q.field("status"), args.status) : true
            )
            .order("desc")
            .collect();

        // Fetch creator details for each challenge
        const challengesWithCreators = await Promise.all(
            challenges.map(async (challenge) => {
                const creator = await ctx.db.get(challenge.creatorId);
                return {
                    ...challenge,
                    creator: creator ? {
                        displayName: creator.displayName,
                        rank: creator.rank,
                        avatar: creator.avatar,
                    } : null,
                };
            })
        );

        return challengesWithCreators;
    },
});

// Get active challenges for current user
export const getMyActiveChallenges = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const user = await ctx.db
            .query("users")
            .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
            .first();

        if (!user) return [];

        // Get all active challenges
        const allChallenges = await ctx.db
            .query("squadChallenges")
            .withIndex("byStatus", (q) => q.eq("status", "active"))
            .collect();

        // Filter to only include challenges where user is a participant
        const challenges = allChallenges.filter((challenge) =>
            challenge.participants.some((p) => p.userId === user._id)
        );

        return challenges;
    },
});

// Create a new challenge
export const create = mutation({
    args: {
        squadId: v.id("squads"),
        title: v.string(),
        description: v.string(),
        type: v.union(
            v.object({ kind: v.literal("rounds"), target: v.number() }),
            v.object({ kind: v.literal("accuracy"), target: v.number() }),
            v.object({ kind: v.literal("streak"), target: v.number() }),
            v.object({ kind: v.literal("verses"), target: v.number() })
        ),
        endDate: v.number(),
        reward: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
            .first();

        if (!user) {
            throw new Error("User not found");
        }

        // Verify user is a member of the squad
        const squad = await ctx.db.get(args.squadId);
        if (!squad || !squad.memberIds.includes(user._id)) {
            throw new Error("Not a member of this squad");
        }

        const now = Date.now();

        const challengeId = await ctx.db.insert("squadChallenges", {
            squadId: args.squadId,
            creatorId: user._id,
            title: args.title,
            description: args.description,
            type: args.type,
            participants: [{
                userId: user._id,
                currentValue: 0,
            }],
            reward: args.reward,
            startDate: now,
            endDate: args.endDate,
            status: "active",
            createdAt: now,
            updatedAt: now,
        });

        return challengeId;
    },
});

// Join a challenge
export const join = mutation({
    args: {
        challengeId: v.id("squadChallenges"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
            .first();

        if (!user) {
            throw new Error("User not found");
        }

        const challenge = await ctx.db.get(args.challengeId);
        if (!challenge) {
            throw new Error("Challenge not found");
        }

        if (challenge.status !== "active") {
            throw new Error("Challenge is not active");
        }

        // Check if already participating
        const isParticipating = challenge.participants.some(
            (p) => p.userId === user._id
        );

        if (isParticipating) {
            throw new Error("Already participating in this challenge");
        }

        // Add user to participants
        await ctx.db.patch(args.challengeId, {
            participants: [
                ...challenge.participants,
                { userId: user._id, currentValue: 0 },
            ],
            updatedAt: Date.now(),
        });

        return true;
    },
});

// Update progress on a challenge
export const updateProgress = mutation({
    args: {
        challengeId: v.id("squadChallenges"),
        value: v.number(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
            .first();

        if (!user) {
            throw new Error("User not found");
        }

        const challenge = await ctx.db.get(args.challengeId);
        if (!challenge) {
            throw new Error("Challenge not found");
        }

        if (challenge.status !== "active") {
            throw new Error("Challenge is not active");
        }

        // Find participant index
        const participantIndex = challenge.participants.findIndex(
            (p) => p.userId === user._id
        );

        if (participantIndex === -1) {
            throw new Error("Not participating in this challenge");
        }

        // Update progress
        const participants = [...challenge.participants];
        const target = challenge.type.target;
        const newValue = participants[participantIndex].currentValue + args.value;

        participants[participantIndex] = {
            ...participants[participantIndex],
            currentValue: newValue,
            completedAt: newValue >= target ? Date.now() : undefined,
        };

        // Check if all participants completed
        const allCompleted = participants.every((p) => p.completedAt);

        await ctx.db.patch(args.challengeId, {
            participants,
            status: allCompleted ? "completed" : "active",
            updatedAt: Date.now(),
        });

        return {
            currentValue: newValue,
            completed: newValue >= target,
        };
    },
});

// Complete a challenge (mark as completed)
export const complete = mutation({
    args: {
        challengeId: v.id("squadChallenges"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const challenge = await ctx.db.get(args.challengeId);
        if (!challenge) {
            throw new Error("Challenge not found");
        }

        await ctx.db.patch(args.challengeId, {
            status: "completed",
            updatedAt: Date.now(),
        });

        return true;
    },
});

// Get challenge leaderboard
export const getLeaderboard = query({
    args: {
        challengeId: v.id("squadChallenges"),
    },
    handler: async (ctx, args) => {
        const challenge = await ctx.db.get(args.challengeId);
        if (!challenge) return [];

        const leaderboard = await Promise.all(
            challenge.participants.map(async (participant) => {
                const user = await ctx.db.get(participant.userId);
                return {
                    user: user ? {
                        _id: user._id,
                        displayName: user.displayName,
                        rank: user.rank,
                        avatar: user.avatar,
                    } : null,
                    currentValue: participant.currentValue,
                    completedAt: participant.completedAt,
                    progress: challenge.type.target > 0
                        ? Math.min(100, (participant.currentValue / challenge.type.target) * 100)
                        : 0,
                };
            })
        );

        // Sort by progress (completed first, then by value)
        return leaderboard
            .filter((entry) => entry.user !== null)
            .sort((a, b) => {
                if (a.completedAt && !b.completedAt) return -1;
                if (!a.completedAt && b.completedAt) return 1;
                return b.currentValue - a.currentValue;
            });
    },
});
