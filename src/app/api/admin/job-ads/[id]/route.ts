import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { jobAdUploads, jobs } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/auth/require-admin'
import { getSupabase, JOB_ADS_BUCKET } from '@/lib/supabase'

function extractStoragePath(publicUrl: string): string {
  const marker = `/object/public/${JOB_ADS_BUCKET}/`
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
      .from(jobAdUploads)
      .where(eq(jobAdUploads.id, id))
      .limit(1)

    if (!upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
    }

    if (upload.status === 'parsing') {
      return NextResponse.json(
        { error: 'Cannot delete a job ad that is currently being analyzed' },
        { status: 409 }
      )
    }

    // If a linked job was created from this upload, delete it
    if (upload.jobId) {
      await db.delete(jobs).where(eq(jobs.id, upload.jobId))
    }

    // Delete the DB record
    await db.delete(jobAdUploads).where(eq(jobAdUploads.id, id))

    // Delete file from Supabase Storage
    const storagePath = upload.storagePath || extractStoragePath(upload.blobUrl)
    if (storagePath) {
      const supabase = getSupabase()
      const { error: storageError } = await supabase.storage.from(JOB_ADS_BUCKET).remove([storagePath])
      if (storageError) {
        console.error('Failed to delete job ad storage file:', storagePath, storageError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message === 'Unauthorized' || message === 'Forbidden') {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    console.error('Admin job ad delete error:', error)
    return NextResponse.json({ error: 'Failed to delete upload' }, { status: 500 })
  }
}
