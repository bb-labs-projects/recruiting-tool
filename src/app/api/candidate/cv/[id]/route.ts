import { NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { cvUploads, profiles } from '@/lib/db/schema'
import { getUser } from '@/lib/dal'
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
    const user = await getUser()
    if (!user || user.role !== 'candidate') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Fetch the upload and verify ownership
    const [upload] = await db
      .select()
      .from(cvUploads)
      .where(and(eq(cvUploads.id, id), eq(cvUploads.uploadedBy, user.id)))
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
        console.error('Failed to delete storage file:', storagePath, storageError)
      }
    } else {
      console.warn('No storage path found for upload:', id, 'blobUrl:', upload.blobUrl)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('CV delete error:', error)
    return NextResponse.json({ error: 'Failed to delete upload' }, { status: 500 })
  }
}
