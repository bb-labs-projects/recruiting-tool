import { NextResponse } from 'next/server'
import { desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { jobAdUploads } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/auth/require-admin'

export async function GET() {
  try {
    await requireAdmin()

    const uploads = await db
      .select({
        id: jobAdUploads.id,
        filename: jobAdUploads.filename,
        status: jobAdUploads.status,
        errorMessage: jobAdUploads.errorMessage,
        jobId: jobAdUploads.jobId,
        createdAt: jobAdUploads.createdAt,
        parsedAt: jobAdUploads.parsedAt,
      })
      .from(jobAdUploads)
      .orderBy(desc(jobAdUploads.createdAt))

    return NextResponse.json(uploads)
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
