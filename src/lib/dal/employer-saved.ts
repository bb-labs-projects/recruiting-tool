import 'server-only'

import { cache } from 'react'
import { db } from '@/lib/db'
import { savedProfiles } from '@/lib/db/schema'
import { eq, and, inArray, desc } from 'drizzle-orm'

/**
 * Get which of the given profile IDs are saved by the employer.
 * Used on the browse page to show save indicators on profile cards (batch lookup).
 */
export const getSavedProfileIds = cache(
  async (
    employerUserId: string,
    profileIds: string[]
  ): Promise<Set<string>> => {
    if (profileIds.length === 0) return new Set()

    const saved = await db
      .select({ profileId: savedProfiles.profileId })
      .from(savedProfiles)
      .where(
        and(
          eq(savedProfiles.employerUserId, employerUserId),
          inArray(savedProfiles.profileId, profileIds)
        )
      )

    return new Set(saved.map((s) => s.profileId))
  }
)

/**
 * Get all saved profile IDs for an employer, ordered by most recently saved.
 * Used on the saved profiles page.
 */
export const getSavedProfiles = cache(
  async (employerUserId: string): Promise<string[]> => {
    const saved = await db
      .select({ profileId: savedProfiles.profileId })
      .from(savedProfiles)
      .where(eq(savedProfiles.employerUserId, employerUserId))
      .orderBy(desc(savedProfiles.savedAt))

    return saved.map((s) => s.profileId)
  }
)

/**
 * Check if a specific profile is saved by the employer.
 * Used on the profile detail page.
 */
export const isProfileSaved = cache(
  async (employerUserId: string, profileId: string): Promise<boolean> => {
    const [saved] = await db
      .select({ profileId: savedProfiles.profileId })
      .from(savedProfiles)
      .where(
        and(
          eq(savedProfiles.employerUserId, employerUserId),
          eq(savedProfiles.profileId, profileId)
        )
      )
      .limit(1)

    return !!saved
  }
)
