import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { jobAdUploads } from '@/lib/db/schema'
import { getUser } from '@/lib/dal'
import { getJobById } from '@/lib/dal/jobs'
import { parseSingleJobAd } from '@/lib/job-parser/parse'

export const maxDuration = 300

export async function POST(request: Request) {
  try {
    const user = await getUser()
    if (!user || user.role !== 'employer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { jobAdUploadId } = await request.json()

    if (!jobAdUploadId) {
      return NextResponse.json({ error: 'jobAdUploadId is required' }, { status: 400 })
    }

    // Verify the employer owns this upload
    const [upload] = await db
      .select({ uploadedBy: jobAdUploads.uploadedBy })
      .from(jobAdUploads)
      .where(eq(jobAdUploads.id, jobAdUploadId))

    if (!upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
    }

    if (upload.uploadedBy !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await parseSingleJobAd(jobAdUploadId, user.id)

    // Include full job details in response when parsing succeeds
    if (result.success && result.jobId) {
      const job = await getJobById(result.jobId)
      return NextResponse.json({ ...result, job })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Job ad parse error:', error)
    return NextResponse.json({ error: 'Parse failed' }, { status: 500 })
  }
}
