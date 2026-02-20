import 'server-only'

import { cache } from 'react'
import { db } from '@/lib/db'
import { employerProfiles, users } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

/**
 * Get a single employer profile by user ID.
 * Returns full employer profile data for the authenticated employer or admin views.
 */
export const getEmployerProfile = cache(async (userId: string) => {
  const [profile] = await db
    .select()
    .from(employerProfiles)
    .where(eq(employerProfiles.userId, userId))
    .limit(1)

  return profile ?? null
})

/**
 * Get all employer profiles with user email for admin management.
 * Joins with users table to include email for display.
 * Ordered by creation date descending (newest first).
 */
export const getAllEmployerProfiles = cache(async () => {
  return db
    .select({
      id: employerProfiles.id,
      companyName: employerProfiles.companyName,
      contactName: employerProfiles.contactName,
      contactTitle: employerProfiles.contactTitle,
      status: employerProfiles.status,
      createdAt: employerProfiles.createdAt,
      reviewedAt: employerProfiles.reviewedAt,
      userEmail: users.email,
    })
    .from(employerProfiles)
    .innerJoin(users, eq(employerProfiles.userId, users.id))
    .orderBy(desc(employerProfiles.createdAt))
})
