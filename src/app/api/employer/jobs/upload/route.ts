import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jobAdUploads } from '@/lib/db/schema'
import { getUser } from '@/lib/dal'
import { getSupabase, JOB_ADS_BUCKET } from '@/lib/supabase'

/**
 * POST: Generate a signed upload URL for the employer to upload directly to Supabase Storage.
 */
export async function POST(request: Request) {
  try {
    const user = await getUser()
    if (!user || user.role !== 'employer') {
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
    const path = `employer/${user.id}/${crypto.randomUUID()}-${safeName}`
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
    console.error('Job ad upload POST error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

/**
 * PUT: Create a DB record after the employer has uploaded to Supabase Storage.
 */
export async function PUT(request: Request) {
  try {
    const user = await getUser()
    if (!user || user.role !== 'employer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
        uploadedBy: user.id,
        status: 'uploaded',
      })
      .returning()

    return NextResponse.json(record)
  } catch (error) {
    console.error('Job ad upload PUT error:', error)
    return NextResponse.json({ error: 'Failed to create upload record' }, { status: 500 })
  }
}
