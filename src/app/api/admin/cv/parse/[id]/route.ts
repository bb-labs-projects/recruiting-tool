import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { cvUploads } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/auth/require-admin'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()

    const { id } = await params

    const [upload] = await db
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
      .where(eq(cvUploads.id, id))
      .limit(1)

    if (!upload) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(upload)
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
