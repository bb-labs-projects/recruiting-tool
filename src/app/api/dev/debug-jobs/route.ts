import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jobs, jobMatches } from '@/lib/db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'
import { getCandidateProfile } from '@/lib/dal/candidate-profiles'

export async function GET() {
  const steps: Record<string, unknown> = {}

  try {
    // Step 1: Check if dev-preview candidate profile exists
    steps.step1 = 'Getting candidate profile for dev-preview user'
    const profile = await getCandidateProfile('00000000-0000-0000-0000-000000000003')
    steps.profileFound = !!profile
    steps.profileId = profile?.id ?? null

    if (!profile) {
      return NextResponse.json({ ...steps, error: 'No profile found for dev-preview candidate' })
    }

    // Step 2: Run the query
    steps.step2 = 'Running getOpenJobsForCandidate query'
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
          eq(jobMatches.profileId, profile.id)
        )
      )
      .where(eq(jobs.status, 'open'))
      .orderBy(
        desc(sql<number>`coalesce(${jobMatches.overallScore}, -1)`),
        desc(jobs.createdAt)
      )

    steps.step3 = 'Query succeeded'
    steps.rowCount = rows.length
    steps.firstRow = rows[0] ?? null

    return NextResponse.json(steps)
  } catch (e: unknown) {
    const err = e as Error
    return NextResponse.json({
      ...steps,
      error: err.message,
      stack: err.stack?.split('\n').slice(0, 5),
    }, { status: 500 })
  }
}
