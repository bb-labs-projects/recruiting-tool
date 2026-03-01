import 'server-only'

import { cache } from 'react'
import { db } from '@/lib/db'
import { jobs, jobMatches } from '@/lib/db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'

export type CandidateJobDTO = {
  id: string
  title: string
  description: string | null
  requiredSpecializations: string[] | null
  preferredSpecializations: string[] | null
  minimumExperience: number | null
  preferredLocation: string | null
  requiredBar: string[] | null
  requiredTechnicalDomains: string[] | null
  createdAt: Date
  matchScore: number | null
  matchRecommendation: string | null
}

/**
 * Get all open jobs for the candidate browse page.
 * Left joins jobMatches so matched jobs include score/recommendation.
 * Never selects employer identity (no name, email, userId).
 * Ordered: matched jobs first (score DESC), then unmatched (createdAt DESC).
 */
export const getOpenJobsForCandidate = cache(
  async (profileId: string): Promise<CandidateJobDTO[]> => {
    const rows = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        description: jobs.description,
        requiredSpecializations: jobs.requiredSpecializations,
        preferredSpecializations: jobs.preferredSpecializations,
        minimumExperience: jobs.minimumExperience,
        preferredLocation: jobs.preferredLocation,
        requiredBar: jobs.requiredBar,
        requiredTechnicalDomains: jobs.requiredTechnicalDomains,
        createdAt: jobs.createdAt,
        matchScore: jobMatches.overallScore,
        matchRecommendation: jobMatches.recommendation,
      })
      .from(jobs)
      .leftJoin(
        jobMatches,
        and(
          eq(jobMatches.jobId, jobs.id),
          eq(jobMatches.profileId, profileId)
        )
      )
      .where(eq(jobs.status, 'open'))
      .orderBy(
        sql`CASE WHEN ${jobMatches.overallScore} IS NOT NULL THEN 0 ELSE 1 END`,
        desc(jobMatches.overallScore),
        desc(jobs.createdAt)
      )

    return rows
  }
)
