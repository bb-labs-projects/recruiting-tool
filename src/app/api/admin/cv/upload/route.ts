import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cvUploads } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/auth/require-admin'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HandleUploadBody

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        await requireAdmin()
        return {
          allowedContentTypes: ['application/pdf'],
          maximumSizeInBytes: 10 * 1024 * 1024,
        }
      },
      onUploadCompleted: async ({ blob }) => {
        const { userId } = await requireAdmin()
        await db.insert(cvUploads).values({
          filename: blob.pathname,
          blobUrl: blob.url,
          uploadedBy: userId,
          status: 'uploaded',
        })
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PUT(request: Request) {
  try {
    const { userId } = await requireAdmin()
    const { filename, blobUrl } = await request.json()

    const [record] = await db
      .insert(cvUploads)
      .values({
        filename,
        blobUrl,
        uploadedBy: userId,
        status: 'uploaded',
      })
      .returning()

    return NextResponse.json(record)
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
