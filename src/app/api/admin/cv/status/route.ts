import { NextResponse } from 'next/server'
import { desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { cvUploads } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/auth/require-admin'

export async function GET() {
  try {
    await requireAdmin()

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
      .orderBy(desc(cvUploads.createdAt))

    return NextResponse.json(uploads)
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
