import 'server-only'

import { cache } from 'react'
import { db } from '@/lib/db'
import { jobMatches, profileUnlocks, jobs } from '@/lib/db/schema'
import { eq, and, desc, isNull, gte, inArray } from 'drizzle-orm'
import { bucketExperienceYears } from '@/lib/anonymize'

// Types

export type DimensionScore = { score: number; explanation: string }

export type MatchSubscores = {
  specializationMatch: DimensionScore
  experienceFit: DimensionScore
  technicalBackground: DimensionScore
  credentials: DimensionScore
  locationAndLanguage: DimensionScore
  leadershipAndBD: DimensionScore
}

export type RequirementTagDTO = {
  requirement: string
  status: 'met' | 'partial' | 'unmet' | 'unknown'
}

export type JobMatchDTO = {
  id: string
  profileId: string
  overallScore: number
  subscores: MatchSubscores
  requirementTags: RequirementTagDTO[]
  strengths: string[]
  gaps: string[]
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
  requirementTags: RequirementTagDTO[]
  strengths: string[]
  gaps: string[]
  summary: string
  recommendation: string
}

// Profile preview types for match cards

export type MatchCardProfilePreview = {
  id: string
  experienceRange: string
  specializations: string[]
  barAdmissions: string[]
  name: string | null
  initialsLabel: string
}

// Backwards-compatible parsing

const defaultDimension: DimensionScore = { score: 0, explanation: 'N/A' }

/**
 * Parse the subscores JSON blob with fallbacks for old 5-dimension data.
 * Old keys `barAdmissions` and `locationMatch` map to `credentials` and `locationAndLanguage`.
 * Missing `leadershipAndBD` defaults to { score: 0, explanation: 'N/A' }.
 * Missing `requirementTags`, `strengths`, `gaps` default to [].
 */
function parseScoringData(raw: string): {
  subscores: MatchSubscores
  requirementTags: RequirementTagDTO[]
  strengths: string[]
  gaps: string[]
} {
  const data = JSON.parse(raw)

  const subscores: MatchSubscores = {
    specializationMatch: data.specializationMatch ?? defaultDimension,
    experienceFit: data.experienceFit ?? defaultDimension,
    technicalBackground: data.technicalBackground ?? defaultDimension,
    credentials: data.credentials ?? data.barAdmissions ?? defaultDimension,
    locationAndLanguage: data.locationAndLanguage ?? data.locationMatch ?? defaultDimension,
    leadershipAndBD: data.leadershipAndBD ?? defaultDimension,
  }

  return {
    subscores,
    requirementTags: Array.isArray(data.requirementTags) ? data.requirementTags : [],
    strengths: Array.isArray(data.strengths) ? data.strengths : [],
    gaps: Array.isArray(data.gaps) ? data.gaps : [],
  }
}

function rowToDTO(r: typeof jobMatches.$inferSelect): JobMatchDTO {
  const { subscores, requirementTags, strengths, gaps } = parseScoringData(r.subscores)
  return {
    id: r.id,
    profileId: r.profileId,
    overallScore: r.overallScore,
    subscores,
    requirementTags,
    strengths,
    gaps,
    summary: r.summary,
    recommendation: r.recommendation,
    scoredAt: r.scoredAt,
    notifiedAt: r.notifiedAt,
  }
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

    return rows.map(rowToDTO)
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

    return rowToDTO(row)
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

    return rows.map(rowToDTO)
  }
)

// Profile preview loading for match cards

/**
 * Batch-load profile preview data for match cards.
 * Returns anonymized data by default; real name only if the employer has unlocked the profile.
 */
export async function getMatchCardProfiles(
  profileIds: string[],
  employerUserId: string
): Promise<Map<string, MatchCardProfilePreview>> {
  if (profileIds.length === 0) return new Map()

  // Batch-load unlock status
  const unlocks = await db
    .select({ profileId: profileUnlocks.profileId })
    .from(profileUnlocks)
    .where(
      and(
        eq(profileUnlocks.employerUserId, employerUserId),
        inArray(profileUnlocks.profileId, profileIds)
      )
    )
  const unlockedSet = new Set(unlocks.map((u) => u.profileId))

  // Load profiles with related data
  const profileRows = await db.query.profiles.findMany({
    where: (p, { inArray: inArr }) => inArr(p.id, profileIds),
    columns: { id: true, name: true },
    with: {
      profileSpecializations: {
        with: {
          specialization: { columns: { name: true } },
        },
      },
      barAdmissions: {
        columns: { jurisdiction: true },
      },
      workHistory: {
        columns: { startDate: true, endDate: true },
      },
    },
  })

  const result = new Map<string, MatchCardProfilePreview>()

  for (const p of profileRows) {
    const isUnlocked = unlockedSet.has(p.id)
    const name = isUnlocked ? p.name : null
    const initials = isUnlocked && p.name
      ? p.name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((w) => w[0].toUpperCase())
          .join('')
      : 'IP'

    result.set(p.id, {
      id: p.id,
      experienceRange: bucketExperienceYears(p.workHistory),
      specializations: p.profileSpecializations.map((ps) => ps.specialization.name),
      barAdmissions: p.barAdmissions.map((ba) => ba.jurisdiction),
      name,
      initialsLabel: initials,
    })
  }

  return result
}

// Candidate-facing match types and functions

export type CandidateMatchDTO = {
  id: string
  jobTitle: string
  overallScore: number
  recommendation: string
  summary: string
  strengths: string[]
  scoredAt: Date
}

/**
 * Get all job matches for a candidate's profile.
 * Only returns matches for open jobs. Hides employer identity.
 * Ordered by overall score descending.
 */
export const getMatchesForCandidate = cache(
  async (profileId: string): Promise<CandidateMatchDTO[]> => {
    const rows = await db
      .select({
        match: jobMatches,
        jobTitle: jobs.title,
        jobStatus: jobs.status,
      })
      .from(jobMatches)
      .innerJoin(jobs, eq(jobMatches.jobId, jobs.id))
      .where(
        and(
          eq(jobMatches.profileId, profileId),
          eq(jobs.status, 'open')
        )
      )
      .orderBy(desc(jobMatches.overallScore))

    return rows.map((r) => {
      const { strengths } = parseScoringData(r.match.subscores)
      return {
        id: r.match.id,
        jobTitle: r.jobTitle,
        overallScore: r.match.overallScore,
        recommendation: r.match.recommendation,
        summary: r.match.summary,
        strengths: strengths.slice(0, 3),
        scoredAt: r.match.scoredAt,
      }
    })
  }
)

// Write functions

/**
 * Insert a new match result.
 * Uses onConflictDoUpdate on the unique (jobId, profileId) index to update if re-scored.
 * Packs requirementTags, strengths, and gaps into the subscores JSON blob.
 */
export async function insertMatch(data: InsertMatchInput): Promise<void> {
  const blob = {
    ...data.subscores,
    requirementTags: data.requirementTags,
    strengths: data.strengths,
    gaps: data.gaps,
  }

  await db
    .insert(jobMatches)
    .values({
      jobId: data.jobId,
      profileId: data.profileId,
      overallScore: data.overallScore,
      subscores: JSON.stringify(blob),
      summary: data.summary,
      recommendation: data.recommendation,
    })
    .onConflictDoUpdate({
      target: [jobMatches.jobId, jobMatches.profileId],
      set: {
        overallScore: data.overallScore,
        subscores: JSON.stringify(blob),
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
