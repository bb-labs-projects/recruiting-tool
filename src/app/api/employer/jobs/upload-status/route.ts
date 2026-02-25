import { NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { jobAdUploads, jobs } from '@/lib/db/schema'
import { getUser } from '@/lib/dal'

export async function GET() {
  try {
    const user = await getUser()
    if (!user || user.role !== 'employer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const uploads = await db
      .select({
        id: jobAdUploads.id,
        jobId: jobAdUploads.jobId,
        filename: jobAdUploads.filename,
        status: jobAdUploads.status,
        errorMessage: jobAdUploads.errorMessage,
        createdAt: jobAdUploads.createdAt,
        parsedAt: jobAdUploads.parsedAt,
        // Job fields (null when no job linked yet)
        jobTitle: jobs.title,
        jobDescription: jobs.description,
        jobRequiredSpecializations: jobs.requiredSpecializations,
        jobPreferredSpecializations: jobs.preferredSpecializations,
        jobMinimumExperience: jobs.minimumExperience,
        jobPreferredLocation: jobs.preferredLocation,
        jobRequiredBar: jobs.requiredBar,
        jobRequiredTechnicalDomains: jobs.requiredTechnicalDomains,
      })
      .from(jobAdUploads)
      .leftJoin(jobs, eq(jobAdUploads.jobId, jobs.id))
      .where(eq(jobAdUploads.uploadedBy, user.id))
      .orderBy(desc(jobAdUploads.createdAt))

    return NextResponse.json(uploads)
  } catch (error) {
    console.error('Job ad upload status error:', error)
    return NextResponse.json({ error: 'Failed to fetch upload status' }, { status: 500 })
  }
}
