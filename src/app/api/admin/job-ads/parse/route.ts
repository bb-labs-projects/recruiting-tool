import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { parseSingleJobAd } from '@/lib/job-parser/parse'

export const maxDuration = 300

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const { jobAdUploadId } = await request.json()

    if (!jobAdUploadId) {
      return NextResponse.json({ error: 'jobAdUploadId is required' }, { status: 400 })
    }

    const result = await parseSingleJobAd(jobAdUploadId)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
