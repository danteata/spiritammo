import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Update user presence
export const update = mutation({
    args: {
        squadId: v.optional(v.id("squads")),
        status: v.union(
            v.literal("online"),
            v.literal("training"),
            v.literal("battle"),
            v.literal("arsenal"),
            v.literal("offline")
        ),
        currentActivity: v.optional(v.string()),
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

        const now = Date.now();

        // Check if presence record exists
        const existingPresence = await ctx.db
            .query("presence")
            .withIndex("byUser", (q) => q.eq("userId", user._id))
            .first();

        if (existingPresence) {
            await ctx.db.patch(existingPresence._id, {
                squadId: args.squadId,
                status: args.status,
                currentActivity: args.currentActivity,
                updatedAt: now,
            });
            return existingPresence._id;
        } else {
            const presenceId = await ctx.db.insert("presence", {
                userId: user._id,
                squadId: args.squadId,
                status: args.status,
                currentActivity: args.currentActivity,
                updatedAt: now,
            });
            return presenceId;
        }
    },
});

// Get presence for a squad
export const getBySquad = query({
    args: {
        squadId: v.id("squads"),
    },
    handler: async (ctx, args) => {
        const presences = await ctx.db
            .query("presence")
            .withIndex("bySquad", (q) => q.eq("squadId", args.squadId))
            .collect();

        // Filter to only show online users (active in last 5 minutes)
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        const activePresences = presences.filter(
            (p) => p.updatedAt > fiveMinutesAgo && p.status !== "offline"
        );

        // Fetch user details
        const presenceWithUsers = await Promise.all(
            activePresences.map(async (presence) => {
                const user = await ctx.db.get(presence.userId);
                return {
                    ...presence,
                    user: user ? {
                        _id: user._id,
                        displayName: user.displayName,
                        rank: user.rank,
                        avatar: user.avatar,
                    } : null,
                };
            })
        );

        return presenceWithUsers.filter((p) => p.user !== null);
    },
});

// Get current user's presence
export const getMyPresence = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const user = await ctx.db
            .query("users")
            .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
            .first();

        if (!user) return null;

        const presence = await ctx.db
            .query("presence")
            .withIndex("byUser", (q) => q.eq("userId", user._id))
            .first();

        return presence;
    },
});

// Set offline status (call when app goes to background)
export const setOffline = mutation({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const user = await ctx.db
            .query("users")
            .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
            .first();

        if (!user) return;

        const presence = await ctx.db
            .query("presence")
            .withIndex("byUser", (q) => q.eq("userId", user._id))
            .first();

        if (presence) {
            await ctx.db.patch(presence._id, {
                status: "offline",
                updatedAt: Date.now(),
            });
        }
    },
});

// Get online count for a squad
export const getOnlineCount = query({
    args: {
        squadId: v.id("squads"),
    },
    handler: async (ctx, args) => {
        const presences = await ctx.db
            .query("presence")
            .withIndex("bySquad", (q) => q.eq("squadId", args.squadId))
            .collect();

        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        return presences.filter(
            (p) => p.updatedAt > fiveMinutesAgo && p.status !== "offline"
        ).length;
    },
});
