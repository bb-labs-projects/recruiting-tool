import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jobAdUploads } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/auth/require-admin'
import { getSupabase, JOB_ADS_BUCKET } from '@/lib/supabase'

/**
 * POST: Generate a signed upload URL for the client to upload directly to Supabase Storage.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin()

    const { filename } = await request.json()
    if (!filename) {
      return NextResponse.json({ error: 'filename is required' }, { status: 400 })
    }

    // Sanitize filename for storage path: strip accents, replace non-alphanumeric chars
    const safeName = filename
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `admin/${crypto.randomUUID()}-${safeName}`
    const supabase = getSupabase()

    const { data, error } = await supabase.storage
      .from(JOB_ADS_BUCKET)
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
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

/**
 * PUT: Create a DB record after the client has uploaded to Supabase Storage.
 */
export async function PUT(request: Request) {
  try {
    const { userId } = await requireAdmin()
    const { filename, path } = await request.json()

    const supabase = getSupabase()
    const { data: urlData } = supabase.storage
      .from(JOB_ADS_BUCKET)
      .getPublicUrl(path)

    const [record] = await db
      .insert(jobAdUploads)
      .values({
        filename,
        blobUrl: urlData.publicUrl,
        storagePath: path,
        uploadedBy: userId,
        status: 'uploaded',
      })
      .returning()

    return NextResponse.json(record)
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
