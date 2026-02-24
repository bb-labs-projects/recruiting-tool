import { NextResponse } from 'next/server'
import { eq, and, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { cvUploads } from '@/lib/db/schema'
import { getUser } from '@/lib/dal'
import { getSupabase, CV_BUCKET } from '@/lib/supabase'

/**
 * POST: Generate a signed upload URL for the candidate to upload directly to Supabase Storage.
 */
export async function POST(request: Request) {
  try {
    const user = await getUser()
    if (!user || user.role !== 'candidate') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { filename } = await request.json()
    if (!filename) {
      return NextResponse.json({ error: 'filename is required' }, { status: 400 })
    }

    // Sanitize filename for storage path: strip accents, replace non-alphanumeric chars
    const safeName = filename
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `candidate/${user.id}/${crypto.randomUUID()}-${safeName}`
    const supabase = getSupabase()

    const { data, error } = await supabase.storage
      .from(CV_BUCKET)
      .createSignedUploadUrl(path)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      path: data.path,
      token: data.token,
    })
  } catch (error) {
    console.error('CV upload POST error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

/**
 * PUT: Create a DB record after the candidate has uploaded to Supabase Storage.
 */
export async function PUT(request: Request) {
  try {
    const user = await getUser()
    if (!user || user.role !== 'candidate') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { filename, path } = await request.json()

    // Clean up orphaned uploads (uploaded or failed) for this user
    await db
      .delete(cvUploads)
      .where(
        and(
          eq(cvUploads.uploadedBy, user.id),
          inArray(cvUploads.status, ['uploaded', 'failed'])
        )
      )

    const supabase = getSupabase()
    const { data: urlData } = supabase.storage
      .from(CV_BUCKET)
      .getPublicUrl(path)

    const [record] = await db
      .insert(cvUploads)
      .values({
        filename,
        blobUrl: urlData.publicUrl,
        storagePath: path,
        uploadedBy: user.id,
        status: 'uploaded',
      })
      .returning()

    return NextResponse.json(record)
  } catch (error) {
    console.error('CV upload PUT error:', error)
    return NextResponse.json({ error: 'Failed to create upload record' }, { status: 500 })
  }
}
