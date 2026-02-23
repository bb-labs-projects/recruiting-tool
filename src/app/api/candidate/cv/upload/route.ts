import { NextResponse } from 'next/server'
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

    const path = `candidate/${user.id}/${crypto.randomUUID()}-${filename}`
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
  } catch {
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

    const supabase = getSupabase()
    const { data: urlData } = supabase.storage
      .from(CV_BUCKET)
      .getPublicUrl(path)

    const [record] = await db
      .insert(cvUploads)
      .values({
        filename,
        blobUrl: urlData.publicUrl,
        uploadedBy: user.id,
        status: 'uploaded',
      })
      .returning()

    return NextResponse.json(record)
  } catch {
    return NextResponse.json({ error: 'Failed to create upload record' }, { status: 500 })
  }
}
