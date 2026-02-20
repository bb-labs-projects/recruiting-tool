import 'server-only'

import { cache } from 'react'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq, sql, count } from 'drizzle-orm'
import { bucketExperienceYears, anonymizeWorkHistory } from '@/lib/anonymize'

// Source: https://nextjs.org/docs/app/guides/data-security (DTO pattern)

/**
 * Anonymized profile for employer browsing.
 * PII fields (name, email, phone) are NEVER selected from the database.
 * Work history employer names are suppressed.
 * Experience is shown as ranges.
 */
export type AnonymizedProfileDTO = {
  id: string
  specializations: string[]
  technicalDomains: string[]
  experienceRange: string
  educationSummary: string[]
  barAdmissions: string[]
  workHistorySummary: {
    title: string
    type: string
    durationRange: string
  }[]
}

/**
 * Get anonymized profiles for employer browsing.
 * Uses Drizzle column inclusion mode to whitelist ONLY safe fields.
 * PII (name, email, phone, employer names) is never selected.
 */
export const getAnonymizedProfiles = cache(
  async (filters?: {
    specialization?: string
    experienceRange?: string
    search?: string
    page?: number
    pageSize?: number
  }): Promise<{ profiles: AnonymizedProfileDTO[]; total: number }> => {
    const page = filters?.page ?? 1
    const pageSize = filters?.pageSize ?? 12

    // Query ONLY non-PII fields using Drizzle column inclusion mode
    const results = await db.query.profiles.findMany({
      where: (profiles, { eq }) => eq(profiles.status, 'active'),
      columns: {
        id: true,
        createdAt: true,
        // PII fields explicitly EXCLUDED by using inclusion mode:
        // name, email, phone, nameConfidence, emailConfidence, phoneConfidence
        // are NOT listed and therefore NEVER selected
      },
      with: {
        profileSpecializations: {
          with: {
            specialization: {
              columns: { name: true },
            },
          },
        },
        profileTechnicalDomains: {
          with: {
            technicalDomain: {
              columns: { name: true },
            },
          },
        },
        education: {
          columns: {
            institution: true,
            degree: true,
            field: true,
            year: true,
          },
        },
        barAdmissions: {
          columns: {
            jurisdiction: true,
            status: true,
            year: true,
          },
        },
        workHistory: {
          columns: {
            title: true,
            startDate: true,
            endDate: true,
            // employer is NOT listed -- never selected
            // description is NOT listed -- never selected
          },
        },
      },
      limit: pageSize,
      offset: (page - 1) * pageSize,
      orderBy: (profiles, { desc }) => [desc(profiles.createdAt)],
    })

    // Separate count query for total
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(profiles)
      .where(eq(profiles.status, 'active'))

    // Transform results into anonymized DTOs
    const anonymizedProfiles: AnonymizedProfileDTO[] = results.map(
      (profile) => ({
        id: profile.id,
        specializations: profile.profileSpecializations.map(
          (ps) => ps.specialization.name
        ),
        technicalDomains: profile.profileTechnicalDomains.map(
          (ptd) => ptd.technicalDomain.name
        ),
        experienceRange: bucketExperienceYears(profile.workHistory),
        educationSummary: profile.education.map(
          (e) => `${e.degree}, ${e.institution}`
        ),
        barAdmissions: profile.barAdmissions.map(
          (ba) =>
            `${ba.jurisdiction}${ba.status ? ` (${ba.status})` : ''}`
        ),
        workHistorySummary: anonymizeWorkHistory(profile.workHistory),
      })
    )

    return { profiles: anonymizedProfiles, total }
  }
)

/**
 * Get a single anonymized profile by ID for employer viewing.
 * Same column exclusion pattern as getAnonymizedProfiles.
 * Returns null if profile not found or not active.
 */
export const getAnonymizedProfileById = cache(
  async (id: string): Promise<AnonymizedProfileDTO | null> => {
    const profile = await db.query.profiles.findFirst({
      where: (profiles, { eq, and }) =>
        and(eq(profiles.id, id), eq(profiles.status, 'active')),
      columns: {
        id: true,
        createdAt: true,
      },
      with: {
        profileSpecializations: {
          with: {
            specialization: {
              columns: { name: true },
            },
          },
        },
        profileTechnicalDomains: {
          with: {
            technicalDomain: {
              columns: { name: true },
            },
          },
        },
        education: {
          columns: {
            institution: true,
            degree: true,
            field: true,
            year: true,
          },
        },
        barAdmissions: {
          columns: {
            jurisdiction: true,
            status: true,
            year: true,
          },
        },
        workHistory: {
          columns: {
            title: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    })

    if (!profile) return null

    return {
      id: profile.id,
      specializations: profile.profileSpecializations.map(
        (ps) => ps.specialization.name
      ),
      technicalDomains: profile.profileTechnicalDomains.map(
        (ptd) => ptd.technicalDomain.name
      ),
      experienceRange: bucketExperienceYears(profile.workHistory),
      educationSummary: profile.education.map(
        (e) => `${e.degree}, ${e.institution}`
      ),
      barAdmissions: profile.barAdmissions.map(
        (ba) =>
          `${ba.jurisdiction}${ba.status ? ` (${ba.status})` : ''}`
      ),
      workHistorySummary: anonymizeWorkHistory(profile.workHistory),
    }
  }
)
