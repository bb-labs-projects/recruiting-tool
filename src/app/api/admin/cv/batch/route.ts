import { NextResponse, after } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { parseSingleCv } from '@/lib/cv-parser/parse'

export const maxDuration = 300

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const { cvUploadIds } = await request.json()

    if (!Array.isArray(cvUploadIds) || cvUploadIds.length === 0) {
      return NextResponse.json(
        { error: 'cvUploadIds must be a non-empty array' },
        { status: 400 }
      )
    }

    if (cvUploadIds.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 CVs per batch' },
        { status: 400 }
      )
    }

    after(async () => {
      for (const id of cvUploadIds) {
        try {
          await parseSingleCv(id)
        } catch (error) {
          console.error(`Failed to parse CV ${id}:`, error)
        }
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    })

    return NextResponse.json(
      { message: 'Batch parsing started', count: cvUploadIds.length },
      { status: 202 }
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
