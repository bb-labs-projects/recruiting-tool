import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { setTheme, type Theme } from '@/lib/dal/settings'

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const theme = body?.theme

    if (theme !== 'cromwell' && theme !== 'blackgold') {
      return NextResponse.json(
        { error: 'Invalid theme. Must be "cromwell" or "blackgold".' },
        { status: 400 }
      )
    }

    await setTheme(theme as Theme)

    return NextResponse.json({ ok: true, theme })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Theme update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
