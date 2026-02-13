import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get current user by Clerk ID
export const getCurrentUser = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return null;
        }

        const user = await ctx.db
            .query("users")
            .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
            .first();

        return user;
    },
});

// Get user by ID
export const getById = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.userId);
    },
});

// Create or update user profile
export const upsertUser = mutation({
    args: {
        displayName: v.string(),
        rank: v.string(),
        valorPoints: v.number(),
        streak: v.number(),
        totalPracticed: v.number(),
        averageAccuracy: v.optional(v.number()),
        avatar: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const existingUser = await ctx.db
            .query("users")
            .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
            .first();

        const now = Date.now();

        if (existingUser) {
            // Update existing user
            await ctx.db.patch(existingUser._id, {
                displayName: args.displayName,
                rank: args.rank,
                valorPoints: args.valorPoints,
                streak: args.streak,
                totalPracticed: args.totalPracticed,
                averageAccuracy: args.averageAccuracy,
                avatar: args.avatar,
                lastActive: now,
            });
            return existingUser._id;
        } else {
            // Create new user
            const userId = await ctx.db.insert("users", {
                clerkId: identity.subject,
                displayName: args.displayName,
                rank: args.rank,
                valorPoints: args.valorPoints,
                streak: args.streak,
                totalPracticed: args.totalPracticed,
                averageAccuracy: args.averageAccuracy,
                avatar: args.avatar,
                lastActive: now,
                createdAt: now,
            });
            return userId;
        }
    },
});

// Update user stats (called after practice sessions)
export const updateStats = mutation({
    args: {
        valorPointsDelta: v.number(),
        streak: v.optional(v.number()),
        totalPracticedDelta: v.optional(v.number()),
        accuracy: v.optional(v.number()),
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

        const updates: Record<string, any> = {
            valorPoints: user.valorPoints + args.valorPointsDelta,
            lastActive: Date.now(),
        };

        if (args.streak !== undefined) {
            updates.streak = args.streak;
        }

        if (args.totalPracticedDelta !== undefined) {
            updates.totalPracticed = user.totalPracticed + args.totalPracticedDelta;
        }

        if (args.accuracy !== undefined && user.averageAccuracy !== undefined) {
            // Calculate rolling average
            const count = user.totalPracticed || 1;
            updates.averageAccuracy =
                (user.averageAccuracy * (count - 1) + args.accuracy) / count;
        } else if (args.accuracy !== undefined) {
            updates.averageAccuracy = args.accuracy;
        }

        await ctx.db.patch(user._id, updates);
        return user._id;
    },
});

// Get leaderboard
export const getLeaderboard = query({
    args: {
        type: v.union(
            v.literal("valor"),
            v.literal("streak"),
            v.literal("accuracy"),
            v.literal("weekly")
        ),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 10;

        const leaderboard = await ctx.db
            .query("leaderboards")
            .withIndex("byType", (q) => q.eq("type", args.type))
            .order("desc")
            .take(limit);

        // Fetch user details for each entry
        const entries = await Promise.all(
            leaderboard.map(async (entry) => {
                const user = await ctx.db.get(entry.userId);
                return {
                    ...entry,
                    user: user ? {
                        displayName: user.displayName,
                        rank: user.rank,
                        avatar: user.avatar,
                    } : null,
                };
            })
        );

        return entries;
    },
});

// Search users by display name
export const searchUsers = query({
    args: {
        query: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 10;

        // Simple search - in production, use a proper search solution
        const users = await ctx.db
            .query("users")
            .filter((q) =>
                q.or(
                    q.gte(q.field("displayName"), args.query),
                    q.lte(q.field("displayName"), args.query + "\uffff")
                )
            )
            .take(limit);

        return users.map((user) => ({
            _id: user._id,
            displayName: user.displayName,
            rank: user.rank,
            avatar: user.avatar,
        }));
    },
});
