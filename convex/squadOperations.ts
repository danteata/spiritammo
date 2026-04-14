import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const startSkirmish = mutation({
    args: {
        squadId: v.id('squads'),
        creatorId: v.id('users'),
        scriptureReferences: v.array(v.string()),
        accuracyThreshold: v.number(),
        timeLimitSec: v.number(),
        vpReward: v.number(),
    },
    handler: async (ctx, args) => {
        const accuracyThreshold = args.accuracyThreshold || 70
        const timeLimitSec = args.timeLimitSec || 60
        const vpReward = args.vpReward || 50
        const operationId = await ctx.db.insert('squadOperations', {
            squadId: args.squadId,
            type: 'skirmish',
            status: 'waiting',
            creatorId: args.creatorId,
            participants: [{
                userId: args.creatorId,
                displayName: '',
                score: 0,
                accuracy: 0,
                ready: true,
            }],
            config: {
                scriptureReferences: args.scriptureReferences,
                accuracyThreshold: args.accuracyThreshold,
                timeLimitSec: args.timeLimitSec,
                vpReward: args.vpReward,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
        })
        return operationId
    },
})

export const joinOperation = mutation({
    args: {
        operationId: v.id('squadOperations'),
        userId: v.id('users'),
        displayName: v.string(),
    },
    handler: async (ctx, args) => {
        const operation = await ctx.db.get(args.operationId)
        if (!operation) throw new Error('Operation not found')
        if (operation.status !== 'waiting') throw new Error('Operation is not waiting for participants')

        const updatedParticipants = [
            ...operation.participants,
            { userId: args.userId, displayName: args.displayName, score: 0, accuracy: 0, ready: true },
        ]

        await ctx.db.patch(args.operationId, {
            participants: updatedParticipants,
            updatedAt: Date.now(),
        })
        return true
    },
})

export const submitSkirmishResult = mutation({
    args: {
        operationId: v.id('squadOperations'),
        userId: v.id('users'),
        score: v.number(),
        accuracy: v.number(),
    },
    handler: async (ctx, args) => {
        const operation = await ctx.db.get(args.operationId)
        if (!operation) throw new Error('Operation not found')

        const updatedParticipants = operation.participants.map(p =>
            p.userId === args.userId
                ? { ...p, score: args.score, accuracy: args.accuracy, completedAt: Date.now() }
                : p,
        )

        const allCompleted = updatedParticipants.every(p => p.completedAt !== undefined)

        const results = allCompleted ? {
            winnerId: updatedParticipants.reduce((best, p) =>
                (p.accuracy ?? 0) > (best.accuracy ?? 0) ? p : best,
            ).userId as any,
            participants: updatedParticipants.map(p => ({
                userId: p.userId,
                score: p.score ?? 0,
                accuracy: p.accuracy ?? 0,
                versesCompleted: 1,
            })),
            vpAwarded: operation.config?.vpReward ?? 50,
            completedAt: Date.now(),
        } : undefined

        await ctx.db.patch(args.operationId, {
            participants: updatedParticipants,
            status: allCompleted ? 'completed' : 'active',
            results,
            updatedAt: Date.now(),
        })

        return { completed: allCompleted, results }
    },
})

export const getActiveSkirmish = query({
    args: { squadId: v.id('squads') },
    handler: async (ctx, args) => {
        const operations = await ctx.db
            .query('squadOperations')
            .withIndex('bySquadAndStatus', (q) =>
                q.eq('squadId', args.squadId).eq('status', 'active'),
            )
            .collect()
        return operations.filter(op => op.type === 'skirmish')
    },
})

export const getOperationHistory = query({
    args: { squadId: v.id('squads') },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('squadOperations')
            .withIndex('bySquadId', (q) => q.eq('squadId', args.squadId))
            .collect()
    },
})