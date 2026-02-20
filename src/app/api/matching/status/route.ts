import { NextResponse } from 'next/server'
import { getUser } from '@/lib/dal'
import { getJobById } from '@/lib/dal/jobs'
import { db } from '@/lib/db'
import { jobMatches } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

export async function GET(request: Request) {
  try {
    const user = await getUser()
    if (!user || (user.role !== 'admin' && user.role !== 'employer')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId is required' },
        { status: 400 }
      )
    }

    const job = await getJobById(jobId)
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Employer ownership check
    if (user.role === 'employer' && job.employerUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(jobMatches)
      .where(eq(jobMatches.jobId, jobId))

    return NextResponse.json({
      matchingStatus: job.matchingStatus,
      matchedAt: job.matchedAt,
      matchCount: Number(countRow.count),
    })
  } catch (error) {
    console.error('Matching status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
