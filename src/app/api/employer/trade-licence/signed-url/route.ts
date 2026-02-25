import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { getSupabase } from '@/lib/supabase'

const TRADE_LICENCE_BUCKET = 'trade-licences'

export async function GET(request: Request) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const storagePath = searchParams.get('path')

    if (!storagePath) {
      return NextResponse.json({ error: 'path parameter required' }, { status: 400 })
    }

    const supabase = getSupabase()
    const { data, error } = await supabase.storage
      .from(TRADE_LICENCE_BUCKET)
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
