import 'server-only'

import { cache } from 'react'
import { db } from '@/lib/db'
import { jobMatches } from '@/lib/db/schema'
import { eq, and, desc, isNull, gte, inArray } from 'drizzle-orm'

// Types

export type MatchSubscores = {
  specializationMatch: { score: number; explanation: string }
  experienceFit: { score: number; explanation: string }
  technicalBackground: { score: number; explanation: string }
  locationMatch: { score: number; explanation: string }
  barAdmissions: { score: number; explanation: string }
}

export type JobMatchDTO = {
  id: string
  profileId: string
  overallScore: number
  subscores: MatchSubscores
  summary: string
  recommendation: string
  scoredAt: Date
  notifiedAt: Date | null
}

export type InsertMatchInput = {
  jobId: string
  profileId: string
  overallScore: number
  subscores: MatchSubscores
  summary: string
  recommendation: string
}

// Read functions (cached)

/**
 * Get all matches for a job, ordered by overallScore DESC.
 * Parses the subscores JSON string back into a typed object.
 */
export const getMatchesForJob = cache(
  async (jobId: string): Promise<JobMatchDTO[]> => {
    const rows = await db
      .select()
      .from(jobMatches)
      .where(eq(jobMatches.jobId, jobId))
      .orderBy(desc(jobMatches.overallScore))

    return rows.map((r) => ({
      id: r.id,
      profileId: r.profileId,
      overallScore: r.overallScore,
      subscores: JSON.parse(r.subscores) as MatchSubscores,
      summary: r.summary,
      recommendation: r.recommendation,
      scoredAt: r.scoredAt,
      notifiedAt: r.notifiedAt,
    }))
  }
)

/**
 * Check if a cached match exists for a job and profile.
 * Used by the matching pipeline to skip already-scored candidates.
 */
export const getMatchByJobAndProfile = cache(
  async (jobId: string, profileId: string): Promise<JobMatchDTO | null> => {
    const [row] = await db
      .select()
      .from(jobMatches)
      .where(
        and(eq(jobMatches.jobId, jobId), eq(jobMatches.profileId, profileId))
      )
      .limit(1)

    if (!row) return null

    return {
      id: row.id,
      profileId: row.profileId,
      overallScore: row.overallScore,
      subscores: JSON.parse(row.subscores) as MatchSubscores,
      summary: row.summary,
      recommendation: row.recommendation,
      scoredAt: row.scoredAt,
      notifiedAt: row.notifiedAt,
    }
  }
)

/**
 * Get matches where notifiedAt IS NULL, optionally filtered by minimum score.
 * Used by the notification system to avoid re-notifying.
 */
export const getUnnotifiedMatches = cache(
  async (jobId: string, minScore?: number): Promise<JobMatchDTO[]> => {
    const conditions = [
      eq(jobMatches.jobId, jobId),
      isNull(jobMatches.notifiedAt),
    ]

    if (minScore !== undefined) {
      conditions.push(gte(jobMatches.overallScore, minScore))
    }

    const rows = await db
      .select()
      .from(jobMatches)
      .where(and(...conditions))
      .orderBy(desc(jobMatches.overallScore))

    return rows.map((r) => ({
      id: r.id,
      profileId: r.profileId,
      overallScore: r.overallScore,
      subscores: JSON.parse(r.subscores) as MatchSubscores,
      summary: r.summary,
      recommendation: r.recommendation,
      scoredAt: r.scoredAt,
      notifiedAt: r.notifiedAt,
    }))
  }
)

// Write functions

/**
 * Insert a new match result.
 * Uses onConflictDoUpdate on the unique (jobId, profileId) index to update if re-scored.
 */
export async function insertMatch(data: InsertMatchInput): Promise<void> {
  await db
    .insert(jobMatches)
    .values({
      jobId: data.jobId,
      profileId: data.profileId,
      overallScore: data.overallScore,
      subscores: JSON.stringify(data.subscores),
      summary: data.summary,
      recommendation: data.recommendation,
    })
    .onConflictDoUpdate({
      target: [jobMatches.jobId, jobMatches.profileId],
      set: {
        overallScore: data.overallScore,
        subscores: JSON.stringify(data.subscores),
        summary: data.summary,
        recommendation: data.recommendation,
        scoredAt: new Date(),
        notifiedAt: null,
      },
    })
}

/**
 * Delete all cached matches for a job.
 * Called when job requirements change.
 */
export async function invalidateMatchesForJob(jobId: string): Promise<void> {
  await db.delete(jobMatches).where(eq(jobMatches.jobId, jobId))
}

/**
 * Set notifiedAt for the given match IDs.
 * Called after sending notification emails.
 */
export async function markMatchesNotified(matchIds: string[]): Promise<void> {
  if (matchIds.length === 0) return

  await db
    .update(jobMatches)
    .set({ notifiedAt: new Date() })
    .where(inArray(jobMatches.id, matchIds))
}
