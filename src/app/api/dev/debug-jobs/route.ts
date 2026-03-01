import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jobs, jobMatches, profiles } from '@/lib/db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'

export async function GET() {
  const steps: Record<string, unknown> = {}

  try {
    // Step 1: Basic DB connectivity test
    steps.step1 = 'Testing basic DB connectivity'
    const [row] = await db.select({ count: sql<number>`count(*)` }).from(jobs)
    steps.dbConnected = true
    steps.totalJobs = row?.count

    // Step 2: Simple profile lookup (not the full relational query)
    steps.step2 = 'Looking up dev-preview profile (simple query)'
    const [profile] = await db
      .select({ id: profiles.id, name: profiles.name, status: profiles.status })
      .from(profiles)
      .where(eq(profiles.userId, '00000000-0000-0000-0000-000000000003'))
      .limit(1)
    steps.profileFound = !!profile
    steps.profile = profile ?? null

    if (!profile) {
      return NextResponse.json({ ...steps, result: 'No profile for dev-preview candidate -- page would redirect to /candidate' })
    }

    // Step 3: Run the jobs query
    steps.step3 = 'Running getOpenJobsForCandidate query'
    const rows = await db
      .select({
        id: jobs.id,
        title: jobs.title,
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

    steps.step4 = 'Query succeeded'
    steps.rowCount = rows.length
    steps.rows = rows.slice(0, 3)

    return NextResponse.json(steps)
  } catch (e: unknown) {
    const err = e as Error & { cause?: Error }
    return NextResponse.json({
      ...steps,
      error: err.message?.slice(0, 300),
      cause: err.cause?.message?.slice(0, 300) ?? null,
      causeCode: (err.cause as unknown as Record<string, unknown>)?.code ?? null,
    }, { status: 500 })
  }
}
