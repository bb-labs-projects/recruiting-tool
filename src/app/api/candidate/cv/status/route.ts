import { NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { cvUploads } from '@/lib/db/schema'
import { getUser } from '@/lib/dal'

export async function GET() {
  try {
    const user = await getUser()
    if (!user || user.role !== 'candidate') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const uploads = await db
      .select({
        id: cvUploads.id,
        filename: cvUploads.filename,
        status: cvUploads.status,
        errorMessage: cvUploads.errorMessage,
        profileId: cvUploads.profileId,
        createdAt: cvUploads.createdAt,
        parsedAt: cvUploads.parsedAt,
      })
      .from(cvUploads)
      .where(eq(cvUploads.uploadedBy, user.id))
      .orderBy(desc(cvUploads.createdAt))

    return NextResponse.json(uploads)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 })
  }
}
