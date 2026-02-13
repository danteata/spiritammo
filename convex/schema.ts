import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // User profiles (synced from local storage)
    users: defineTable({
        clerkId: v.string(),
        displayName: v.string(),
        rank: v.string(),
        valorPoints: v.number(),
        streak: v.number(),
        totalPracticed: v.number(),
        averageAccuracy: v.optional(v.number()),
        avatar: v.optional(v.string()),
        lastActive: v.number(),
        createdAt: v.number(),
    })
        .index("byClerkId", ["clerkId"])
        .index("byValorPoints", ["valorPoints"])
        .index("byStreak", ["streak"]),

    // Squad groups
    squads: defineTable({
        name: v.string(),
        description: v.optional(v.string()),
        creatorId: v.id("users"),
        memberIds: v.array(v.id("users")),
        inviteCode: v.string(),
        maxMembers: v.optional(v.number()),
        isActive: v.boolean(),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("byCreator", ["creatorId"])
        .index("byInviteCode", ["inviteCode"]),

    // Squad membership (for easier queries)
    squadMembers: defineTable({
        squadId: v.id("squads"),
        userId: v.id("users"),
        role: v.union(v.literal("leader"), v.literal("member")),
        joinedAt: v.number(),
    })
        .index("bySquad", ["squadId"])
        .index("byUser", ["userId"])
        .index("bySquadAndUser", ["squadId", "userId"]),

    // Squad challenges (real-time)
    squadChallenges: defineTable({
        squadId: v.id("squads"),
        creatorId: v.id("users"),
        title: v.string(),
        description: v.string(),
        type: v.union(
            v.object({ kind: v.literal("rounds"), target: v.number() }),
            v.object({ kind: v.literal("accuracy"), target: v.number() }),
            v.object({ kind: v.literal("streak"), target: v.number() }),
            v.object({ kind: v.literal("verses"), target: v.number() })
        ),
        participants: v.array(v.object({
            userId: v.id("users"),
            currentValue: v.number(),
            completedAt: v.optional(v.number()),
        })),
        reward: v.optional(v.string()),
        startDate: v.number(),
        endDate: v.number(),
        status: v.union(v.literal("pending"), v.literal("active"), v.literal("completed"), v.literal("expired")),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("bySquad", ["squadId"])
        .index("byStatus", ["status"])
        .index("bySquadAndStatus", ["squadId", "status"]),

    // Real-time presence
    presence: defineTable({
        userId: v.id("users"),
        squadId: v.optional(v.id("squads")),
        status: v.union(
            v.literal("online"),
            v.literal("training"),
            v.literal("battle"),
            v.literal("arsenal"),
            v.literal("offline")
        ),
        currentActivity: v.optional(v.string()),
        updatedAt: v.number(),
    })
        .index("byUser", ["userId"])
        .index("bySquad", ["squadId"])
        .index("byStatus", ["status"]),

    // Practice session sync (for leaderboards)
    practiceSessions: defineTable({
        userId: v.id("users"),
        scriptureId: v.string(),
        reference: v.string(),
        accuracy: v.number(),
        duration: v.optional(v.number()),
        mode: v.union(v.literal("training"), v.literal("battle")),
        valorPointsEarned: v.number(),
        createdAt: v.number(),
    })
        .index("byUser", ["userId"])
        .index("byCreatedAt", ["createdAt"])
        .index("byUserAndDate", ["userId", "createdAt"]),

    // Leaderboards (denormalized for performance)
    leaderboards: defineTable({
        type: v.union(v.literal("valor"), v.literal("streak"), v.literal("accuracy"), v.literal("weekly")),
        userId: v.id("users"),
        score: v.number(),
        rank: v.number(),
        updatedAt: v.number(),
    })
        .index("byType", ["type"])
        .index("byTypeAndUser", ["type", "userId"])
        .index("byTypeAndScore", ["type", "score"]),
});
