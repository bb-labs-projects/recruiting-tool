import { NextResponse, after } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { parseSingleJobAd } from '@/lib/job-parser/parse'

export const maxDuration = 300

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const { jobAdUploadIds } = await request.json()

    if (!Array.isArray(jobAdUploadIds) || jobAdUploadIds.length === 0) {
      return NextResponse.json(
        { error: 'jobAdUploadIds must be a non-empty array' },
        { status: 400 }
      )
    }

    if (jobAdUploadIds.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 job ads per batch' },
        { status: 400 }
      )
    }

    after(async () => {
      for (const id of jobAdUploadIds) {
        try {
          await parseSingleJobAd(id)
        } catch (error) {
          console.error(`Failed to parse job ad ${id}:`, error)
        }
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    })

    return NextResponse.json(
      { message: 'Batch parsing started', count: jobAdUploadIds.length },
      { status: 202 }
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
