import 'server-only'

import { cache } from 'react'
import { db } from '@/lib/db'
import {
  profiles,
  profileSpecializations,
  specializations,
  profileTechnicalDomains,
  technicalDomains,
  barAdmissions,
  education,
} from '@/lib/db/schema'
import { eq, and, exists, ilike, inArray, sql, type SQL } from 'drizzle-orm'
import { bucketExperienceYears, anonymizeWorkHistory } from '@/lib/anonymize'
import { isProfileUnlocked } from '@/lib/dal/employer-unlocks'

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
 * Multi-dimensional search filters for employer browse.
 */
export type SearchFilters = {
  search?: string
  specializations?: string[]
  technicalDomains?: string[]
  patentBar?: boolean
  experienceRange?: string
  location?: string
  page?: number
  pageSize?: number
}

/**
 * Escape ILIKE wildcard characters in user input.
 * Prevents %, _, and \ from being interpreted as wildcards.
 */
function escapeIlike(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&')
}

/**
 * Build dynamic SQL filter conditions from SearchFilters.
 * Uses EXISTS subqueries for junction table filtering.
 * NEVER references PII columns (name, email, phone, employer).
 */
function buildFilterConditions(filters: SearchFilters): SQL[] {
  const conditions: SQL[] = [eq(profiles.status, 'active')]

  // Specialization filter: EXISTS subquery on junction table
  if (filters.specializations?.length) {
    conditions.push(
      exists(
        db
          .select({ id: sql`1` })
          .from(profileSpecializations)
          .innerJoin(
            specializations,
            eq(profileSpecializations.specializationId, specializations.id)
          )
          .where(
            and(
              eq(profileSpecializations.profileId, profiles.id),
              inArray(specializations.name, filters.specializations)
            )
          )
      )
    )
  }

  // Technical domain filter: EXISTS subquery on junction table
  if (filters.technicalDomains?.length) {
    conditions.push(
      exists(
        db
          .select({ id: sql`1` })
          .from(profileTechnicalDomains)
          .innerJoin(
            technicalDomains,
            eq(
              profileTechnicalDomains.technicalDomainId,
              technicalDomains.id
            )
          )
          .where(
            and(
              eq(profileTechnicalDomains.profileId, profiles.id),
              inArray(technicalDomains.name, filters.technicalDomains)
            )
          )
      )
    )
  }

  // Patent bar filter: EXISTS on bar_admissions with USPTO jurisdiction
  if (filters.patentBar) {
    conditions.push(
      exists(
        db
          .select({ id: sql`1` })
          .from(barAdmissions)
          .where(
            and(
              eq(barAdmissions.profileId, profiles.id),
              ilike(barAdmissions.jurisdiction, '%USPTO%')
            )
          )
      )
    )
  }

  // Location filter: EXISTS on bar_admissions jurisdiction via ILIKE
  if (filters.location) {
    conditions.push(
      exists(
        db
          .select({ id: sql`1` })
          .from(barAdmissions)
          .where(
            and(
              eq(barAdmissions.profileId, profiles.id),
              ilike(
                barAdmissions.jurisdiction,
                `%${escapeIlike(filters.location)}%`
              )
            )
          )
      )
    )
  }

  // Free-text search across non-PII fields only
  // NEVER searches against profiles.name, profiles.email, profiles.phone, or workHistory.employer
  if (filters.search) {
    const term = `%${escapeIlike(filters.search)}%`
    conditions.push(sql`(
      EXISTS (
        SELECT 1 FROM profile_specializations ps
        JOIN specializations s ON ps.specialization_id = s.id
        WHERE ps.profile_id = ${profiles.id}
        AND s.name ILIKE ${term}
      )
      OR EXISTS (
        SELECT 1 FROM profile_technical_domains ptd
        JOIN technical_domains td ON ptd.technical_domain_id = td.id
        WHERE ptd.profile_id = ${profiles.id}
        AND td.name ILIKE ${term}
      )
      OR EXISTS (
        SELECT 1 FROM bar_admissions ba
        WHERE ba.profile_id = ${profiles.id}
        AND ba.jurisdiction ILIKE ${term}
      )
      OR EXISTS (
        SELECT 1 FROM education e
        WHERE e.profile_id = ${profiles.id}
        AND (e.institution ILIKE ${term} OR e.degree ILIKE ${term} OR e.field ILIKE ${term})
      )
    )`)
  }

  return conditions
}

/**
 * Get anonymized profiles for employer browsing with multi-dimensional filtering.
 * Uses two-query strategy:
 *   1. Filter query (select builder with EXISTS subqueries) to get matching IDs
 *   2. Data loading query (relational API with column inclusion mode) for anonymized data
 *
 * Experience range filtering is applied post-query since experience is computed
 * from work_history dates, not stored as a column.
 */
export const getAnonymizedProfiles = cache(
  async (
    filters?: SearchFilters
  ): Promise<{ profiles: AnonymizedProfileDTO[]; total: number }> => {
    const page = filters?.page ?? 1
    const pageSize = filters?.pageSize ?? 12
    const conditions = buildFilterConditions(filters ?? {})
    const whereConditions = and(...conditions)

    // Step 1: Filter query -- get all matching profile IDs (no pagination yet)
    const matchedRows = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(whereConditions)
      .orderBy(sql`${profiles.createdAt} DESC`)

    let matchedIds = matchedRows.map((r) => r.id)

    // Step 1b: Experience range post-filter (if set)
    // Experience is computed from work_history dates, not stored as a column.
    // For <1000 profiles this is fast enough without a materialized column.
    if (filters?.experienceRange && matchedIds.length > 0) {
      const workHistoryRows = await db.query.workHistory.findMany({
        where: (wh, { inArray: inArr }) => inArr(wh.profileId, matchedIds),
        columns: {
          profileId: true,
          startDate: true,
          endDate: true,
        },
      })

      // Group work history by profile
      const whByProfile = new Map<
        string,
        { startDate: string | null; endDate: string | null }[]
      >()
      for (const wh of workHistoryRows) {
        const existing = whByProfile.get(wh.profileId) ?? []
        existing.push({ startDate: wh.startDate, endDate: wh.endDate })
        whByProfile.set(wh.profileId, existing)
      }

      // Filter profiles whose computed experience range matches
      matchedIds = matchedIds.filter((id) => {
        const wh = whByProfile.get(id) ?? []
        return bucketExperienceYears(wh) === filters.experienceRange
      })
    }

    // Step 1c: Pagination on the filtered ID list
    const total = matchedIds.length
    const paginatedIds = matchedIds.slice(
      (page - 1) * pageSize,
      page * pageSize
    )

    if (paginatedIds.length === 0) {
      return { profiles: [], total }
    }

    // Step 2: Data loading -- relational query with column inclusion mode (anonymization)
    const results = await db.query.profiles.findMany({
      where: (profiles, { inArray: inArr }) =>
        inArr(profiles.id, paginatedIds),
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
    })

    // Preserve the order from the filter query (orderBy createdAt DESC)
    const orderMap = new Map(paginatedIds.map((id, i) => [id, i]))
    results.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0))

    // Step 3: Transform results into anonymized DTOs
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

/**
 * Full profile DTO for employers who have unlocked a candidate.
 * Includes PII fields (name, email, phone) and full work history
 * with employer names and descriptions.
 */
export type FullProfileDTO = {
  id: string
  name: string
  email: string | null
  phone: string | null
  specializations: string[]
  technicalDomains: string[]
  experienceRange: string
  education: {
    institution: string
    degree: string
    field: string
    year: string | null
  }[]
  barAdmissions: {
    jurisdiction: string
    status: string | null
    year: string | null
  }[]
  workHistory: {
    employer: string
    title: string
    startDate: string | null
    endDate: string | null
    description: string | null
  }[]
}

/**
 * Get a full profile by ID for an employer who has unlocked it.
 * Returns ALL fields including PII (name, email, phone) and full work history
 * with employer names and descriptions.
 *
 * Access is gated by unlock record: returns null if the employer has not unlocked
 * this profile or if the profile is not active.
 */
export const getFullProfileById = cache(
  async (
    profileId: string,
    employerUserId: string
  ): Promise<FullProfileDTO | null> => {
    // Gate access: only return PII if employer has paid for this profile
    const unlocked = await isProfileUnlocked(employerUserId, profileId)
    if (!unlocked) return null

    const profile = await db.query.profiles.findFirst({
      where: (profiles, { eq, and }) =>
        and(eq(profiles.id, profileId), eq(profiles.status, 'active')),
      columns: {
        id: true,
        name: true,
        email: true,
        phone: true,
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
            employer: true,
            title: true,
            startDate: true,
            endDate: true,
            description: true,
          },
        },
      },
    })

    if (!profile) return null

    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      specializations: profile.profileSpecializations.map(
        (ps) => ps.specialization.name
      ),
      technicalDomains: profile.profileTechnicalDomains.map(
        (ptd) => ptd.technicalDomain.name
      ),
      experienceRange: bucketExperienceYears(profile.workHistory),
      education: profile.education.map((e) => ({
        institution: e.institution,
        degree: e.degree,
        field: e.field,
        year: e.year,
      })),
      barAdmissions: profile.barAdmissions.map((ba) => ({
        jurisdiction: ba.jurisdiction,
        status: ba.status,
        year: ba.year,
      })),
      workHistory: profile.workHistory.map((wh) => ({
        employer: wh.employer,
        title: wh.title,
        startDate: wh.startDate,
        endDate: wh.endDate,
        description: wh.description,
      })),
    }
  }
)
