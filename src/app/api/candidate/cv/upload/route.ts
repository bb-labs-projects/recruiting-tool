import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cvUploads } from '@/lib/db/schema'
import { getUser } from '@/lib/dal'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HandleUploadBody

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const user = await getUser()
        if (!user || user.role !== 'candidate') {
          throw new Error('Forbidden')
        }
        return {
          allowedContentTypes: ['application/pdf'],
          maximumSizeInBytes: 10 * 1024 * 1024,
        }
      },
      onUploadCompleted: async () => {
        // Record creation handled by PUT endpoint below
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getUser()
    if (!user || user.role !== 'candidate') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { filename, blobUrl } = await request.json()

    const [record] = await db
      .insert(cvUploads)
      .values({
        filename,
        blobUrl,
        uploadedBy: user.id,
        status: 'uploaded',
      })
      .returning()

    return NextResponse.json(record)
  } catch {
    return NextResponse.json({ error: 'Failed to create upload record' }, { status: 500 })
  }
}
