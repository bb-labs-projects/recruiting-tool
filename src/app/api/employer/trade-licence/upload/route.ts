import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { employerProfiles } from '@/lib/db/schema'
import { getUser } from '@/lib/dal'
import { getSupabase } from '@/lib/supabase'

const TRADE_LICENCE_BUCKET = 'trade-licences'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
]

export async function POST(request: Request) {
  try {
    const user = await getUser()
    if (!user || user.role !== 'employer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File must be under 10MB' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only PDF, JPG, and PNG files are allowed' },
        { status: 400 },
      )
    }

    // Find employer profile for current user
    const [profile] = await db
      .select({ id: employerProfiles.id, tradeLicenceStoragePath: employerProfiles.tradeLicenceStoragePath })
      .from(employerProfiles)
      .where(eq(employerProfiles.userId, user.id))
      .limit(1)

    if (!profile) {
      return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 })
    }

    const supabase = getSupabase()

    // Remove old file if one exists
    if (profile.tradeLicenceStoragePath) {
      await supabase.storage
        .from(TRADE_LICENCE_BUCKET)
        .remove([profile.tradeLicenceStoragePath])
    }

    // Sanitize filename for storage path
    const safeName = file.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `employer/${user.id}/${crypto.randomUUID()}-${safeName}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from(TRADE_LICENCE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Trade licence upload error:', uploadError)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    // Update employer profile with the new trade licence info
    await db
      .update(employerProfiles)
      .set({
        tradeLicenceStoragePath: storagePath,
        tradeLicenceFilename: file.name,
        tradeLicenceUploadedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(employerProfiles.id, profile.id))

    return NextResponse.json({
      success: true,
      filename: file.name,
    })
  } catch (error) {
    console.error('Trade licence upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
