import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { jobAdUploads, jobs } from '@/lib/db/schema'
import { getSupabase, JOB_ADS_BUCKET } from '@/lib/supabase'
import { createJob } from '@/lib/dal/jobs'
import { convertDocxToText } from '@/lib/docx-to-text'
import { JobAdParsedDataSchema } from './schema'
import { JOB_AD_EXTRACTION_PROMPT } from './prompt'

let _anthropic: Anthropic
const anthropic = () => (_anthropic ??= new Anthropic())

/**
 * Extract the storage path from a Supabase public URL.
 * e.g. "https://xxx.supabase.co/storage/v1/object/public/job-ads/employer/123/file.pdf"
 *   -> "employer/123/file.pdf"
 */
function extractStoragePath(publicUrl: string): string {
  const marker = `/object/public/${JOB_ADS_BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) {
    throw new Error(`Could not extract storage path from URL: ${publicUrl}`)
  }
  return decodeURIComponent(publicUrl.slice(idx + marker.length))
}

export async function parseSingleJobAd(
  jobAdUploadId: string,
  employerUserId?: string
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    // Fetch the jobAdUploads record
    const [upload] = await db
      .select()
      .from(jobAdUploads)
      .where(eq(jobAdUploads.id, jobAdUploadId))

    if (!upload) {
      return { success: false, error: `Job ad upload ${jobAdUploadId} not found` }
    }

    // Validate status allows parsing
    if (upload.status !== 'uploaded' && upload.status !== 'failed') {
      return {
        success: false,
        error: `Job ad upload ${jobAdUploadId} has status '${upload.status}', expected 'uploaded' or 'failed'`,
      }
    }

    // Update status to 'parsing'
    await db
      .update(jobAdUploads)
      .set({ status: 'parsing', updatedAt: new Date() })
      .where(eq(jobAdUploads.id, jobAdUploadId))

    // Download file from Supabase Storage
    const storagePath = upload.storagePath ?? extractStoragePath(upload.blobUrl)
    const supabase = getSupabase()
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(JOB_ADS_BUCKET)
      .download(storagePath)

    if (downloadError || !fileData) {
      throw new Error(
        `Failed to download file from storage: ${downloadError?.message ?? 'no data returned'}`
      )
    }

    // Detect file type from filename extension
    const ext = upload.filename.split('.').pop()?.toLowerCase()

    // Build Claude message content based on file type
    let content: Anthropic.Messages.ContentBlockParam[]

    if (ext === 'pdf') {
      const pdfBase64 = Buffer.from(await fileData.arrayBuffer()).toString('base64')
      content = [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: pdfBase64,
          },
        },
        {
          type: 'text',
          text: JOB_AD_EXTRACTION_PROMPT,
        },
      ]
    } else if (ext === 'docx') {
      const buffer = Buffer.from(await fileData.arrayBuffer())
      const text = await convertDocxToText(buffer)
      content = [
        {
          type: 'text',
          text: `${JOB_AD_EXTRACTION_PROMPT}\n\n---\n\nDocument content:\n\n${text}`,
        },
      ]
    } else {
      throw new Error(`Unsupported file type: .${ext}. Only PDF and DOCX files are supported.`)
    }

    // Call Claude API with structured output
    const response = await anthropic().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content,
        },
      ],
      output_config: {
        format: zodOutputFormat(JobAdParsedDataSchema),
      },
    })

    // Parse the structured response
    const firstBlock = response.content[0]
    if (!firstBlock || firstBlock.type !== 'text') {
      throw new Error('Unexpected response format: no text content block')
    }
    const parsed = JobAdParsedDataSchema.parse(JSON.parse(firstBlock.text))

    // Create a draft job using the parsed data
    const effectiveEmployerUserId = employerUserId ?? upload.uploadedBy
    const jobId = await createJob({
      employerUserId: effectiveEmployerUserId,
      createdBy: upload.uploadedBy,
      status: 'draft',
      title: parsed.title.value,
      description: parsed.description.value || null,
      requiredSpecializations: parsed.requiredSpecializations.value,
      preferredSpecializations: parsed.preferredSpecializations.value,
      minimumExperience: parsed.minimumExperience.value,
      preferredLocation: parsed.location.value || null,
      requiredBar: parsed.requiredBar.value,
      requiredTechnicalDomains: parsed.requiredTechnicalDomains.value,
    })

    // Update jobAdUploads record with jobId, status 'parsed', parsedAt
    await db
      .update(jobAdUploads)
      .set({
        jobId,
        status: 'parsed',
        parsedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(jobAdUploads.id, jobAdUploadId))

    return { success: true, jobId }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown error during job ad parsing'
    const truncatedMessage = message.slice(0, 500)

    // Update jobAdUploads status to 'failed'
    try {
      await db
        .update(jobAdUploads)
        .set({
          status: 'failed',
          errorMessage: truncatedMessage,
          updatedAt: new Date(),
        })
        .where(eq(jobAdUploads.id, jobAdUploadId))
    } catch {
      // If we can't update the status, there's nothing more we can do
    }

    return { success: false, error: truncatedMessage }
  }
}
