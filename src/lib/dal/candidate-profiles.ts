import 'server-only'

import { cache } from 'react'
import { db } from '@/lib/db'
import { profiles, cvUploads } from '@/lib/db/schema'
import { eq, desc, ilike, isNull, and } from 'drizzle-orm'

/**
 * Get the authenticated candidate's profile with all related data.
 * No anonymization -- this is the candidate's own data.
 */
export const getCandidateProfile = cache(async (userId: string) => {
  if (process.env.PREVIEW_MODE === 'true') return null

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
    with: {
      education: true,
      workHistory: true,
      barAdmissions: true,
      profileSpecializations: { with: { specialization: true } },
      profileTechnicalDomains: { with: { technicalDomain: true } },
      cvUploads: true,
    },
  })
  return profile ?? null
})

/**
 * Get the authenticated candidate's CV upload records.
 */
export const getCandidateUploads = cache(async (userId: string) => {
  return db
    .select()
    .from(cvUploads)
    .where(eq(cvUploads.uploadedBy, userId))
    .orderBy(desc(cvUploads.createdAt))
})

/**
 * Check for potential duplicate profiles among agency-uploaded profiles (userId IS NULL).
 * Returns an array of flag strings describing matches found.
 */
export async function checkDuplicateProfiles(
  name: string,
  email: string | null
): Promise<string[]> {
  const flags: string[] = []

  if (email) {
    const emailMatch = await db
      .select({ id: profiles.id, name: profiles.name })
      .from(profiles)
      .where(
        and(ilike(profiles.email, email), isNull(profiles.userId))
      )
      .limit(1)

    if (emailMatch.length > 0) {
      flags.push(
        `Email matches existing profile: ${emailMatch[0].name} (${emailMatch[0].id})`
      )
    }
  }

  if (name) {
    const nameMatch = await db
      .select({ id: profiles.id, name: profiles.name })
      .from(profiles)
      .where(
        and(ilike(profiles.name, name), isNull(profiles.userId))
      )
      .limit(1)

    if (nameMatch.length > 0) {
      flags.push(
        `Name matches existing profile: ${nameMatch[0].name} (${nameMatch[0].id})`
      )
    }
  }

  return flags
}
