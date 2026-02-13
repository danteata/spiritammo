import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate a random invite code
function generateInviteCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Get squad by ID
export const getById = query({
    args: { squadId: v.id("squads") },
    handler: async (ctx, args) => {
        const squad = await ctx.db.get(args.squadId);
        if (!squad) return null;

        // Fetch member details
        const members = await Promise.all(
            squad.memberIds.map(async (memberId) => {
                const user = await ctx.db.get(memberId);
                return user ? {
                    _id: user._id,
                    displayName: user.displayName,
                    rank: user.rank,
                    avatar: user.avatar,
                    streak: user.streak,
                    valorPoints: user.valorPoints,
                } : null;
            })
        );

        return {
            ...squad,
            members: members.filter(Boolean),
        };
    },
});

// Get user's squads
export const getMySquads = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const user = await ctx.db
            .query("users")
            .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
            .first();

        if (!user) return [];

        // Get squads where user is a member
        const memberships = await ctx.db
            .query("squadMembers")
            .withIndex("byUser", (q) => q.eq("userId", user._id))
            .collect();

        const squads = await Promise.all(
            memberships.map(async (membership) => {
                const squad = await ctx.db.get(membership.squadId);
                if (!squad) return null;

                // Get member count
                const memberCount = squad.memberIds.length;

                return {
                    _id: squad._id,
                    name: squad.name,
                    description: squad.description,
                    memberCount,
                    role: membership.role,
                    isActive: squad.isActive,
                };
            })
        );

        return squads.filter(Boolean);
    },
});

// Create a new squad
export const create = mutation({
    args: {
        name: v.string(),
        description: v.optional(v.string()),
        maxMembers: v.optional(v.number()),
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
        const inviteCode = generateInviteCode();

        const squadId = await ctx.db.insert("squads", {
            name: args.name,
            description: args.description,
            creatorId: user._id,
            memberIds: [user._id],
            inviteCode,
            maxMembers: args.maxMembers || 50,
            isActive: true,
            createdAt: now,
            updatedAt: now,
        });

        // Add creator as leader
        await ctx.db.insert("squadMembers", {
            squadId,
            userId: user._id,
            role: "leader",
            joinedAt: now,
        });

        return { squadId, inviteCode };
    },
});

// Join a squad by invite code
export const joinByCode = mutation({
    args: {
        inviteCode: v.string(),
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

        const squad = await ctx.db
            .query("squads")
            .withIndex("byInviteCode", (q) => q.eq("inviteCode", args.inviteCode))
            .first();

        if (!squad) {
            throw new Error("Invalid invite code");
        }

        if (squad.memberIds.includes(user._id)) {
            throw new Error("Already a member of this squad");
        }

        if (squad.maxMembers && squad.memberIds.length >= squad.maxMembers) {
            throw new Error("Squad is full");
        }

        // Add user to squad
        await ctx.db.patch(squad._id, {
            memberIds: [...squad.memberIds, user._id],
            updatedAt: Date.now(),
        });

        // Create membership record
        await ctx.db.insert("squadMembers", {
            squadId: squad._id,
            userId: user._id,
            role: "member",
            joinedAt: Date.now(),
        });

        return squad._id;
    },
});

// Leave a squad
export const leave = mutation({
    args: {
        squadId: v.id("squads"),
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

        const squad = await ctx.db.get(args.squadId);
        if (!squad) {
            throw new Error("Squad not found");
        }

        if (!squad.memberIds.includes(user._id)) {
            throw new Error("Not a member of this squad");
        }

        // Remove user from squad
        const newMemberIds = squad.memberIds.filter((id) => id !== user._id);

        if (newMemberIds.length === 0) {
            // Delete squad if no members left
            await ctx.db.delete(squad._id);
        } else {
            await ctx.db.patch(squad._id, {
                memberIds: newMemberIds,
                updatedAt: Date.now(),
            });

            // If leader left, assign new leader
            if (squad.creatorId === user._id) {
                await ctx.db.patch(squad._id, {
                    creatorId: newMemberIds[0],
                });
            }
        }

        // Delete membership record
        const membership = await ctx.db
            .query("squadMembers")
            .withIndex("bySquadAndUser", (q) =>
                q.eq("squadId", args.squadId).eq("userId", user._id)
            )
            .first();

        if (membership) {
            await ctx.db.delete(membership._id);
        }

        return true;
    },
});

// Get squad members with presence
export const getMembersWithPresence = query({
    args: { squadId: v.id("squads") },
    handler: async (ctx, args) => {
        const squad = await ctx.db.get(args.squadId);
        if (!squad) return [];

        const members = await Promise.all(
            squad.memberIds.map(async (memberId) => {
                const user = await ctx.db.get(memberId);
                const presence = await ctx.db
                    .query("presence")
                    .withIndex("byUser", (q) => q.eq("userId", memberId))
                    .first();

                return {
                    _id: user?._id,
                    displayName: user?.displayName,
                    rank: user?.rank,
                    avatar: user?.avatar,
                    streak: user?.streak,
                    valorPoints: user?.valorPoints,
                    status: presence?.status || "offline",
                    currentActivity: presence?.currentActivity,
                    lastActive: user?.lastActive,
                };
            })
        );

        return members.filter(Boolean);
    },
});

// Regenerate invite code
export const regenerateInviteCode = mutation({
    args: { squadId: v.id("squads") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }

        const squad = await ctx.db.get(args.squadId);
        if (!squad) {
            throw new Error("Squad not found");
        }

        if (squad.creatorId) {
            const user = await ctx.db
                .query("users")
                .withIndex("byClerkId", (q) => q.eq("clerkId", identity.subject))
                .first();

            if (!user || user._id !== squad.creatorId) {
                throw new Error("Only the squad leader can regenerate the invite code");
            }
        }

        const newCode = generateInviteCode();
        await ctx.db.patch(args.squadId, {
            inviteCode: newCode,
            updatedAt: Date.now(),
        });

        return newCode;
    },
});
