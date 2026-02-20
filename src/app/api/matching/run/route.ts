import { NextResponse } from 'next/server'
import { getUser } from '@/lib/dal'
import { getJobById } from '@/lib/dal/jobs'
import { runMatchingForJob } from '@/lib/matching/run-matching'

export const maxDuration = 120

export async function POST(request: Request) {
  try {
    const user = await getUser()
    if (!user || (user.role !== 'admin' && user.role !== 'employer')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { jobId } = await request.json()
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

    if (job.status !== 'open') {
      return NextResponse.json(
        { error: 'Job must be open to run matching' },
        { status: 400 }
      )
    }

    if (job.matchingStatus === 'running') {
      return NextResponse.json(
        { error: 'Matching already in progress' },
        { status: 409 }
      )
    }

    const result = await runMatchingForJob(jobId)

    return NextResponse.json({
      success: true,
      matchCount: result.matchCount,
      errors: result.errors,
    })
  } catch (error) {
    console.error('Matching run error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
