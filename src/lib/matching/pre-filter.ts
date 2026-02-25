import 'server-only'

import { db } from '@/lib/db'
import {
  profiles,
  profileSpecializations,
  specializations,
  profileTechnicalDomains,
  technicalDomains,
  barAdmissions,
  employerProfiles,
} from '@/lib/db/schema'
import { eq, and, or, exists, inArray, sql, type SQL } from 'drizzle-orm'
import type { JobForScoring } from './schema'
import { buildSuppressionConditions } from '@/lib/suppression'

/**
 * SQL pre-filter: eliminates candidates who don't match required
 * specializations, bar admissions, or technical domains.
 * Uses EXISTS subqueries on junction tables (same pattern as employer-profiles.ts).
 *
 * Returns profile IDs of candidates who pass the pre-filter.
 * Experience is NOT filtered here -- it is computed from work_history dates
 * in JS and scored by the Claude scoring step.
 */
export async function preFilterCandidates(
  job: Pick<
    JobForScoring,
    'requiredSpecializations' | 'requiredBar' | 'requiredTechnicalDomains'
  >,
  employerUserId?: string,
): Promise<string[]> {
  const conditions: SQL[] = [eq(profiles.status, 'active')]

  // Domain-based candidate suppression
  if (employerUserId) {
    const [employer] = await db
      .select({
        companyName: employerProfiles.companyName,
        corporateDomains: employerProfiles.corporateDomains,
      })
      .from(employerProfiles)
      .where(eq(employerProfiles.userId, employerUserId))
      .limit(1)

    if (employer) {
      const suppressionCondition = buildSuppressionConditions(
        employer.companyName,
        employer.corporateDomains,
      )
      if (suppressionCondition) {
        conditions.push(suppressionCondition)
      }
    }
  }

  // Requirement filters: use OR across categories so candidates matching ANY
  // requirement category pass through to AI scoring. The AI scorer handles
  // nuanced partial-match evaluation -- the pre-filter only gates on having
  // at least some relevance to the job.
  const requirementChecks: SQL[] = []

  if (job.requiredSpecializations.length > 0) {
    requirementChecks.push(
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
              inArray(specializations.name, job.requiredSpecializations)
            )
          )
      )
    )
  }

  if (job.requiredBar.length > 0) {
    requirementChecks.push(
      exists(
        db
          .select({ id: sql`1` })
          .from(barAdmissions)
          .where(
            and(
              eq(barAdmissions.profileId, profiles.id),
              inArray(barAdmissions.jurisdiction, job.requiredBar)
            )
          )
      )
    )
  }

  if (job.requiredTechnicalDomains.length > 0) {
    requirementChecks.push(
      exists(
        db
          .select({ id: sql`1` })
          .from(profileTechnicalDomains)
          .innerJoin(
            technicalDomains,
            eq(profileTechnicalDomains.technicalDomainId, technicalDomains.id)
          )
          .where(
            and(
              eq(profileTechnicalDomains.profileId, profiles.id),
              inArray(technicalDomains.name, job.requiredTechnicalDomains)
            )
          )
      )
    )
  }

  if (requirementChecks.length > 0) {
    conditions.push(or(...requirementChecks)!)
  }

  const rows = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(...conditions))

  return rows.map((r) => r.id)
}
