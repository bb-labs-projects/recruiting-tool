import 'server-only'

import { db } from '@/lib/db'
import { workHistory, profiles } from '@/lib/db/schema'
import { eq, and, isNull, ilike, sql, not, exists, type SQL } from 'drizzle-orm'

/**
 * Extract domain from an email address.
 */
export function extractDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() ?? ''
}

/**
 * Build SQL suppression conditions for an employer.
 * Excludes candidates where:
 * 1. Their current employer (endDate IS NULL) fuzzy-matches the employer's company name
 * 2. Their profile email domain matches one of the employer's corporate domains
 *
 * Returns SQL conditions to add to a WHERE clause, or null if no suppression needed.
 */
export function buildSuppressionConditions(
  companyName: string,
  corporateDomains: string[] | null,
): SQL | null {
  const conditions: SQL[] = []

  // Suppress candidates currently working at the employer's company
  // Uses ILIKE for case-insensitive fuzzy matching
  if (companyName) {
    conditions.push(
      not(exists(
        db
          .select({ id: sql`1` })
          .from(workHistory)
          .where(
            and(
              eq(workHistory.profileId, profiles.id),
              isNull(workHistory.endDate),
              ilike(workHistory.employer, `%${companyName}%`)
            )
          )
      ))
    )
  }

  // Suppress candidates whose email domain matches corporate domains
  if (corporateDomains && corporateDomains.length > 0) {
    // Build OR conditions for each domain
    const domainConditions = corporateDomains.map(domain =>
      ilike(profiles.email, `%@${domain}`)
    )
    conditions.push(
      sql`NOT (${sql.join(domainConditions, sql` OR `)})`
    )
  }

  if (conditions.length === 0) return null

  return and(...conditions) ?? null
}
