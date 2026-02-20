import 'server-only'

import { cache } from 'react'
import { db } from '@/lib/db'
import { jobs, jobMatches, users, employerProfiles } from '@/lib/db/schema'
import { eq, desc, sql, and, inArray } from 'drizzle-orm'

// DTOs

export type JobListDTO = {
  id: string
  title: string
  status: 'draft' | 'open' | 'closed' | 'archived'
  matchingStatus: 'pending' | 'running' | 'completed' | 'failed'
  matchCount: number
  createdAt: Date
  updatedAt: Date
}

export type JobDetailDTO = {
  id: string
  employerUserId: string
  title: string
  description: string | null
  status: 'draft' | 'open' | 'closed' | 'archived'
  matchingStatus: 'pending' | 'running' | 'completed' | 'failed'
  requiredSpecializations: string[] | null
  preferredSpecializations: string[] | null
  minimumExperience: number | null
  preferredLocation: string | null
  requiredBar: string[] | null
  requiredTechnicalDomains: string[] | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
  matchedAt: Date | null
  employerEmail: string
}

export type AdminJobListDTO = {
  id: string
  title: string
  status: 'draft' | 'open' | 'closed' | 'archived'
  matchingStatus: 'pending' | 'running' | 'completed' | 'failed'
  employerCompanyName: string | null
  matchCount: number
  createdAt: Date
}

// Input types

export type CreateJobInput = {
  employerUserId: string
  title: string
  description?: string | null
  status?: 'draft' | 'open' | 'closed' | 'archived'
  requiredSpecializations?: string[] | null
  preferredSpecializations?: string[] | null
  minimumExperience?: number | null
  preferredLocation?: string | null
  requiredBar?: string[] | null
  requiredTechnicalDomains?: string[] | null
  createdBy: string
}

export type UpdateJobInput = {
  title?: string
  description?: string | null
  status?: 'draft' | 'open' | 'closed' | 'archived'
  requiredSpecializations?: string[] | null
  preferredSpecializations?: string[] | null
  minimumExperience?: number | null
  preferredLocation?: string | null
  requiredBar?: string[] | null
  requiredTechnicalDomains?: string[] | null
}

// Read functions (cached)

/**
 * Get all jobs for an employer, ordered by createdAt DESC.
 * Includes match count via subquery.
 */
export const getJobsByEmployer = cache(
  async (employerUserId: string): Promise<JobListDTO[]> => {
    const matchCountSq = db
      .select({
        jobId: jobMatches.jobId,
        count: sql<number>`count(*)`.as('count'),
      })
      .from(jobMatches)
      .groupBy(jobMatches.jobId)
      .as('match_counts')

    const rows = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        status: jobs.status,
        matchingStatus: jobs.matchingStatus,
        matchCount: sql<number>`coalesce(${matchCountSq.count}, 0)`,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
      })
      .from(jobs)
      .leftJoin(matchCountSq, eq(jobs.id, matchCountSq.jobId))
      .where(eq(jobs.employerUserId, employerUserId))
      .orderBy(desc(jobs.createdAt))

    return rows.map((r) => ({
      ...r,
      matchCount: Number(r.matchCount),
    }))
  }
)

/**
 * Get a single job with all fields.
 * Joins with users table to get employer email for notifications.
 */
export const getJobById = cache(
  async (jobId: string): Promise<JobDetailDTO | null> => {
    const [row] = await db
      .select({
        id: jobs.id,
        employerUserId: jobs.employerUserId,
        title: jobs.title,
        description: jobs.description,
        status: jobs.status,
        matchingStatus: jobs.matchingStatus,
        requiredSpecializations: jobs.requiredSpecializations,
        preferredSpecializations: jobs.preferredSpecializations,
        minimumExperience: jobs.minimumExperience,
        preferredLocation: jobs.preferredLocation,
        requiredBar: jobs.requiredBar,
        requiredTechnicalDomains: jobs.requiredTechnicalDomains,
        createdBy: jobs.createdBy,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        matchedAt: jobs.matchedAt,
        employerEmail: users.email,
      })
      .from(jobs)
      .innerJoin(users, eq(jobs.employerUserId, users.id))
      .where(eq(jobs.id, jobId))
      .limit(1)

    return row ?? null
  }
)

/**
 * Get all jobs for admin management.
 * Includes employer company name and match count.
 */
export const getJobsForAdmin = cache(async (): Promise<AdminJobListDTO[]> => {
  const matchCountSq = db
    .select({
      jobId: jobMatches.jobId,
      count: sql<number>`count(*)`.as('count'),
    })
    .from(jobMatches)
    .groupBy(jobMatches.jobId)
    .as('match_counts')

  const rows = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      status: jobs.status,
      matchingStatus: jobs.matchingStatus,
      employerCompanyName: employerProfiles.companyName,
      matchCount: sql<number>`coalesce(${matchCountSq.count}, 0)`,
      createdAt: jobs.createdAt,
    })
    .from(jobs)
    .leftJoin(employerProfiles, eq(jobs.employerUserId, employerProfiles.userId))
    .leftJoin(matchCountSq, eq(jobs.id, matchCountSq.jobId))
    .orderBy(desc(jobs.createdAt))

  return rows.map((r) => ({
    ...r,
    matchCount: Number(r.matchCount),
  }))
})

/**
 * Get open jobs that need matching.
 * Returns lightweight fields for the matching pipeline pre-filter step.
 */
export const getOpenJobsForMatching = cache(async () => {
  const rows = await db
    .select({
      id: jobs.id,
      employerUserId: jobs.employerUserId,
      title: jobs.title,
      requiredSpecializations: jobs.requiredSpecializations,
      preferredSpecializations: jobs.preferredSpecializations,
      minimumExperience: jobs.minimumExperience,
      preferredLocation: jobs.preferredLocation,
      requiredBar: jobs.requiredBar,
      requiredTechnicalDomains: jobs.requiredTechnicalDomains,
      matchingStatus: jobs.matchingStatus,
      matchedAt: jobs.matchedAt,
    })
    .from(jobs)
    .where(
      and(
        eq(jobs.status, 'open'),
        inArray(jobs.matchingStatus, ['pending', 'failed'])
      )
    )
    .orderBy(jobs.createdAt)

  return rows
})

// Write functions

/**
 * Create a new job. Returns the inserted job ID.
 */
export async function createJob(data: CreateJobInput): Promise<string> {
  const [row] = await db
    .insert(jobs)
    .values({
      employerUserId: data.employerUserId,
      title: data.title,
      description: data.description,
      status: data.status ?? 'draft',
      requiredSpecializations: data.requiredSpecializations,
      preferredSpecializations: data.preferredSpecializations,
      minimumExperience: data.minimumExperience,
      preferredLocation: data.preferredLocation,
      requiredBar: data.requiredBar,
      requiredTechnicalDomains: data.requiredTechnicalDomains,
      createdBy: data.createdBy,
    })
    .returning({ id: jobs.id })

  return row.id
}

/**
 * Update a job. Sets updatedAt to now.
 * If status or requirement fields change, resets matchingStatus to 'pending'.
 */
export async function updateJob(
  jobId: string,
  data: UpdateJobInput
): Promise<void> {
  const requirementFields: (keyof UpdateJobInput)[] = [
    'requiredSpecializations',
    'preferredSpecializations',
    'minimumExperience',
    'preferredLocation',
    'requiredBar',
    'requiredTechnicalDomains',
  ]

  const requirementsChanged = requirementFields.some(
    (field) => data[field] !== undefined
  )

  await db
    .update(jobs)
    .set({
      ...data,
      updatedAt: new Date(),
      ...(requirementsChanged ? { matchingStatus: 'pending' as const } : {}),
    })
    .where(eq(jobs.id, jobId))
}

/**
 * Update just the matching status for a job.
 * If status is 'completed', also sets matchedAt to now.
 */
export async function updateJobMatchingStatus(
  jobId: string,
  status: 'pending' | 'running' | 'completed' | 'failed'
): Promise<void> {
  await db
    .update(jobs)
    .set({
      matchingStatus: status,
      updatedAt: new Date(),
      ...(status === 'completed' ? { matchedAt: new Date() } : {}),
    })
    .where(eq(jobs.id, jobId))
}
