import 'server-only'

import { cache } from 'react'
import { db } from '@/lib/db'
import { profileUnlocks, profileSpecializations, specializations } from '@/lib/db/schema'
import { eq, and, desc, inArray } from 'drizzle-orm'

/**
 * Check if an employer has already unlocked a specific profile.
 * Used to prevent double-charging and to gate PII access.
 */
export const isProfileUnlocked = cache(
  async (employerUserId: string, profileId: string): Promise<boolean> => {
    const [unlock] = await db
      .select({ id: profileUnlocks.id })
      .from(profileUnlocks)
      .where(
        and(
          eq(profileUnlocks.employerUserId, employerUserId),
          eq(profileUnlocks.profileId, profileId)
        )
      )
      .limit(1)

    return !!unlock
  }
)

/**
 * Get all profiles unlocked by an employer, ordered by most recent.
 * Joins with profileSpecializations -> specializations
 * to include specialization names for display in purchase history.
 */
export const getEmployerPurchases = cache(
  async (
    employerUserId: string
  ): Promise<
    {
      profileId: string
      amountPaid: number
      currency: string
      unlockedAt: Date
      specializations: string[]
    }[]
  > => {
    const unlocks = await db
      .select({
        profileId: profileUnlocks.profileId,
        amountPaid: profileUnlocks.amountPaid,
        currency: profileUnlocks.currency,
        unlockedAt: profileUnlocks.unlockedAt,
      })
      .from(profileUnlocks)
      .where(eq(profileUnlocks.employerUserId, employerUserId))
      .orderBy(desc(profileUnlocks.unlockedAt))

    if (unlocks.length === 0) return []

    // Batch-load specializations for all unlocked profiles
    const profileIds = unlocks.map((u) => u.profileId)
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

    return unlocks.map((u) => ({
      profileId: u.profileId,
      amountPaid: u.amountPaid,
      currency: u.currency,
      unlockedAt: u.unlockedAt,
      specializations: specsByProfile.get(u.profileId) ?? [],
    }))
  }
)
