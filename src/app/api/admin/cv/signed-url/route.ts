import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { getSupabase, CV_BUCKET } from '@/lib/supabase'

/**
 * GET: Generate a signed URL for viewing a CV in the admin panel.
 * Accepts ?path=<storagePath> or ?url=<publicUrl> query params.
 * Uses the service role key so it works even if the bucket is not public.
 */
export async function GET(request: Request) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    let storagePath = searchParams.get('path')
    const publicUrl = searchParams.get('url')

    if (!storagePath && publicUrl) {
      // Extract storage path from public URL
      const marker = `/object/public/${CV_BUCKET}/`
      const idx = publicUrl.indexOf(marker)
      if (idx !== -1) {
        storagePath = decodeURIComponent(publicUrl.slice(idx + marker.length))
      }
    }

    if (!storagePath) {
      return NextResponse.json({ error: 'path or url parameter required' }, { status: 400 })
    }

    const supabase = getSupabase()
    const { data, error } = await supabase.storage
      .from(CV_BUCKET)
      .createSignedUrl(storagePath, 3600) // 1 hour expiry

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ signedUrl: data.signedUrl })
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
