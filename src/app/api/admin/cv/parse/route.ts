import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { parseSingleCv } from '@/lib/cv-parser/parse'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const { cvUploadId } = await request.json()

    if (!cvUploadId) {
      return NextResponse.json({ error: 'cvUploadId is required' }, { status: 400 })
    }

    const result = await parseSingleCv(cvUploadId)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
