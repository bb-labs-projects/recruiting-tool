import 'server-only'

import { cache } from 'react'
import { db } from '@/lib/db'
import {
  profiles,
  employerProfiles,
  profileUnlocks,
  profileViews,
  profileSpecializations,
  specializations,
  users,
} from '@/lib/db/schema'
import { count, sum, desc, eq, sql, inArray } from 'drizzle-orm'

/**
 * Aggregate analytics summary for the admin dashboard.
 */
export type AnalyticsSummary = {
  totalRevenue: number
  totalUnlocks: number
  totalViews: number
  activeProfiles: number
  approvedEmployers: number
  conversionRate: string
}

/**
 * Get aggregate analytics metrics across the platform.
 * Returns total revenue, unlock/view counts, active profiles,
 * approved employers, and the unlock conversion rate.
 */
export const getAnalyticsSummary = cache(
  async (): Promise<AnalyticsSummary> => {
    const [revenueRow] = await db
      .select({
        total: sum(profileUnlocks.amountPaid),
        count: count(),
      })
      .from(profileUnlocks)

    const totalRevenue = revenueRow?.total ? Number(revenueRow.total) : 0
    const totalUnlocks = revenueRow?.count ?? 0

    const [viewsRow] = await db
      .select({ count: count() })
      .from(profileViews)

    const totalViews = viewsRow?.count ?? 0

    const [profilesRow] = await db
      .select({ count: count() })
      .from(profiles)
      .where(eq(profiles.status, 'active'))

    const activeProfiles = profilesRow?.count ?? 0

    const [employersRow] = await db
      .select({ count: count() })
      .from(employerProfiles)
      .where(eq(employerProfiles.status, 'approved'))

    const approvedEmployers = employersRow?.count ?? 0

    const conversionRate =
      totalViews > 0
        ? ((totalUnlocks / totalViews) * 100).toFixed(1)
        : '0.0'

    return {
      totalRevenue,
      totalUnlocks,
      totalViews,
      activeProfiles,
      approvedEmployers,
      conversionRate,
    }
  }
)

/**
 * Top viewed profiles with view count and specializations.
 */
export type TopProfile = {
  profileId: string
  viewCount: number
  specializations: string[]
}

/**
 * Get the most viewed active profiles.
 * Groups profile views by profileId, joins with profiles to filter
 * only active ones, and batch-loads specializations for display.
 */
export const getTopProfiles = cache(
  async (limit = 10): Promise<TopProfile[]> => {
    const rows = await db
      .select({
        profileId: profileViews.profileId,
        viewCount: count(),
      })
      .from(profileViews)
      .innerJoin(profiles, eq(profileViews.profileId, profiles.id))
      .where(eq(profiles.status, 'active'))
      .groupBy(profileViews.profileId)
      .orderBy(sql`count(*) DESC`)
      .limit(limit)

    if (rows.length === 0) return []

    // Batch-load specializations for all matched profiles
    const profileIds = rows.map((r) => r.profileId)
    const specRows = await db
      .select({
        profileId: profileSpecializations.profileId,
        name: specializations.name,
      })
      .from(profileSpecializations)
      .innerJoin(
        specializations,
        eq(profileSpecializations.specializationId, specializations.id)
      )
      .where(inArray(profileSpecializations.profileId, profileIds))

    const specsByProfile = new Map<string, string[]>()
    for (const row of specRows) {
      const existing = specsByProfile.get(row.profileId) ?? []
      existing.push(row.name)
      specsByProfile.set(row.profileId, existing)
    }

    return rows.map((r) => ({
      profileId: r.profileId,
      viewCount: r.viewCount,
      specializations: specsByProfile.get(r.profileId) ?? [],
    }))
  }
)

/**
 * Recent unlock transaction with employer email and specializations.
 */
export type RecentUnlock = {
  profileId: string
  employerEmail: string
  amountPaid: number
  currency: string
  unlockedAt: Date
  specializations: string[]
}

/**
 * Get the most recent profile unlock transactions.
 * Joins with users table for employer email and batch-loads
 * specializations for display.
 */
export const getRecentUnlocks = cache(
  async (limit = 10): Promise<RecentUnlock[]> => {
    const rows = await db
      .select({
        profileId: profileUnlocks.profileId,
        employerEmail: users.email,
        amountPaid: profileUnlocks.amountPaid,
        currency: profileUnlocks.currency,
        unlockedAt: profileUnlocks.unlockedAt,
      })
      .from(profileUnlocks)
      .innerJoin(users, eq(profileUnlocks.employerUserId, users.id))
      .orderBy(desc(profileUnlocks.unlockedAt))
      .limit(limit)

    if (rows.length === 0) return []

    // Batch-load specializations for all unlocked profiles
    const profileIds = rows.map((r) => r.profileId)
    const specRows = await db
      .select({
        profileId: profileSpecializations.profileId,
        name: specializations.name,
      })
      .from(profileSpecializations)
      .innerJoin(
        specializations,
        eq(profileSpecializations.specializationId, specializations.id)
      )
      .where(inArray(profileSpecializations.profileId, profileIds))

    const specsByProfile = new Map<string, string[]>()
    for (const row of specRows) {
      const existing = specsByProfile.get(row.profileId) ?? []
      existing.push(row.name)
      specsByProfile.set(row.profileId, existing)
    }

    return rows.map((r) => ({
      profileId: r.profileId,
      employerEmail: r.employerEmail,
      amountPaid: r.amountPaid,
      currency: r.currency,
      unlockedAt: r.unlockedAt,
      specializations: specsByProfile.get(r.profileId) ?? [],
    }))
  }
)
