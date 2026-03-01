import 'server-only'

import { cache } from 'react'
import { db } from '@/lib/db'
import { profileViews, savedProfiles, profileUnlocks, jobMatches } from '@/lib/db/schema'
import { eq, gte, desc, count, sql } from 'drizzle-orm'

export type ActivityEvent = {
  id: string
  type: 'view' | 'save' | 'unlock' | 'match'
  timestamp: Date
}

export type ActivityStats = {
  viewsThisWeek: number
  totalSaves: number
  totalMatches: number
  totalUnlocks: number
}

export type CandidateActivity = {
  stats: ActivityStats
  events: ActivityEvent[]
}

/**
 * Fetch activity data for a candidate's profile.
 * Privacy: NEVER selects employerUserId. Only selects timestamp + table's own ID.
 */
export const getCandidateActivity = cache(
  async (profileId: string): Promise<CandidateActivity> => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [viewsWeek, saves, unlocks, matches] = await Promise.all([
      // Profile views this week
      db
        .select({ count: count() })
        .from(profileViews)
        .where(
          sql`${profileViews.profileId} = ${profileId} AND ${profileViews.viewedAt} >= ${sevenDaysAgo.toISOString()}`
        ),

      // Total saves (all time)
      db
        .select({ count: count() })
        .from(savedProfiles)
        .where(eq(savedProfiles.profileId, profileId)),

      // Unlocks last 30 days -- only id + timestamp
      db
        .select({ id: profileUnlocks.id, timestamp: profileUnlocks.unlockedAt })
        .from(profileUnlocks)
        .where(
          sql`${profileUnlocks.profileId} = ${profileId} AND ${profileUnlocks.unlockedAt} >= ${thirtyDaysAgo.toISOString()}`
        )
        .orderBy(desc(profileUnlocks.unlockedAt)),

      // Matches last 30 days -- only id + timestamp
      db
        .select({ id: jobMatches.id, timestamp: jobMatches.scoredAt })
        .from(jobMatches)
        .where(
          sql`${jobMatches.profileId} = ${profileId} AND ${jobMatches.scoredAt} >= ${thirtyDaysAgo.toISOString()}`
        )
        .orderBy(desc(jobMatches.scoredAt)),
    ])

    // Build recent events from unlocks + matches (views/saves are aggregate only)
    const events: ActivityEvent[] = []

    // Add recent views as individual events (last 30 days)
    const recentViews = await db
      .select({ id: profileViews.id, timestamp: profileViews.viewedAt })
      .from(profileViews)
      .where(
        sql`${profileViews.profileId} = ${profileId} AND ${profileViews.viewedAt} >= ${thirtyDaysAgo.toISOString()}`
      )
      .orderBy(desc(profileViews.viewedAt))
      .limit(10)

    for (const v of recentViews) {
      events.push({ id: v.id, type: 'view', timestamp: v.timestamp })
    }

    // Add recent saves (last 30 days)
    const recentSaves = await db
      .select({
        id: sql<string>`${savedProfiles.profileId} || '-' || ${savedProfiles.employerUserId}`,
        timestamp: savedProfiles.savedAt,
      })
      .from(savedProfiles)
      .where(
        sql`${savedProfiles.profileId} = ${profileId} AND ${savedProfiles.savedAt} >= ${thirtyDaysAgo.toISOString()}`
      )
      .orderBy(desc(savedProfiles.savedAt))
      .limit(10)

    for (const s of recentSaves) {
      events.push({ id: String(s.id), type: 'save', timestamp: s.timestamp })
    }

    for (const u of unlocks) {
      events.push({ id: u.id, type: 'unlock', timestamp: u.timestamp })
    }

    for (const m of matches) {
      events.push({ id: m.id, type: 'match', timestamp: m.timestamp })
    }

    // Sort all events chronologically (most recent first)
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    return {
      stats: {
        viewsThisWeek: viewsWeek[0]?.count ?? 0,
        totalSaves: saves[0]?.count ?? 0,
        totalMatches: matches.length,
        totalUnlocks: unlocks.length,
      },
      events: events.slice(0, 20),
    }
  }
)
