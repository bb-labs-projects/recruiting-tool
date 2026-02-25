import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { cvUploads, profiles } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/auth/require-admin'
import { getSupabase, CV_BUCKET } from '@/lib/supabase'

function extractStoragePath(publicUrl: string): string {
  const marker = `/object/public/${CV_BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return ''
  return publicUrl.slice(idx + marker.length)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()

    const { id } = await params

    const [upload] = await db
      .select()
      .from(cvUploads)
      .where(eq(cvUploads.id, id))
      .limit(1)

    if (!upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
    }

    if (upload.status === 'parsing') {
      return NextResponse.json(
        { error: 'Cannot delete a CV that is currently being analyzed' },
        { status: 409 }
      )
    }

    // If a linked profile exists, unlink ALL cv_uploads referencing it, then delete
    if (upload.profileId) {
      await db.update(cvUploads).set({ profileId: null }).where(eq(cvUploads.profileId, upload.profileId))
      await db.delete(profiles).where(eq(profiles.id, upload.profileId))
    }

    // Delete the DB record
    await db.delete(cvUploads).where(eq(cvUploads.id, id))

    // Delete file from Supabase Storage
    const storagePath = upload.storagePath || extractStoragePath(upload.blobUrl)
    if (storagePath) {
      const supabase = getSupabase()
      const { error: storageError } = await supabase.storage.from(CV_BUCKET).remove([storagePath])
      if (storageError) {
        console.error('Failed to delete CV storage file:', storagePath, storageError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message === 'Unauthorized' || message === 'Forbidden') {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    console.error('Admin CV delete error:', error)
    return NextResponse.json({ error: 'Failed to delete upload' }, { status: 500 })
  }
}
