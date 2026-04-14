import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const declareSquadWar = mutation({
    args: {
        challengerSquadId: v.id('squads'),
        defenderSquadId: v.id('squads'),
        vpBounty: v.number(),
        scoringMetric: v.union(v.literal('accuracy'), v.literal('verse_count'), v.literal('total_xp')),
        durationDays: v.number(),
    },
    handler: async (ctx, args) => {
        const startDate = Date.now()
        const endDate = startDate + args.durationDays * 86400000

        const warId = await ctx.db.insert('squadWars', {
            challengerSquadId: args.challengerSquadId,
            defenderSquadId: args.defenderSquadId,
            status: 'declared',
            scoringMetric: args.scoringMetric,
            vpBounty: args.vpBounty,
            challengerScore: 0,
            defenderScore: 0,
            startDate,
            endDate,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        })
        return warId
    },
})

export const acceptSquadWar = mutation({
    args: {
        warId: v.id('squadWars'),
    },
    handler: async (ctx, args) => {
        const war = await ctx.db.get(args.warId)
        if (!war) throw new Error('War not found')
        if (war.status !== 'declared') throw new Error('War is not in declared status')

        await ctx.db.patch(args.warId, {
            status: 'active',
            updatedAt: Date.now(),
        })
        return true
    },
})

export const updateWarScore = mutation({
    args: {
        warId: v.id('squadWars'),
        squadId: v.id('squads'),
        scoreDelta: v.number(),
    },
    handler: async (ctx, args) => {
        const war = await ctx.db.get(args.warId)
        if (!war) throw new Error('War not found')
        if (war.status !== 'active') throw new Error('War is not active')

        if (args.squadId === war.challengerSquadId) {
            await ctx.db.patch(args.warId, {
                challengerScore: war.challengerScore + args.scoreDelta,
                updatedAt: Date.now(),
            })
        } else if (args.squadId === war.defenderSquadId) {
            await ctx.db.patch(args.warId, {
                defenderScore: war.defenderScore + args.scoreDelta,
                updatedAt: Date.now(),
            })
        }
    },
})

export const getSquadWarLeaderboard = query({
    args: { squadId: v.id('squads') },
    handler: async (ctx, args) => {
        const asChallenger = await ctx.db
            .query('squadWars')
            .withIndex('byChallenger', (q) => q.eq('challengerSquadId', args.squadId))
            .collect()

        const asDefender = await ctx.db
            .query('squadWars')
            .withIndex('byDefender', (q) => q.eq('defenderSquadId', args.squadId))
            .collect()

        return [...asChallenger, ...asDefender]
            .filter(w => w.status === 'active' || w.status === 'declared')
    },
})