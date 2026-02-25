import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import {
  cvUploads,
  profiles,
  specializations,
  profileSpecializations,
  education,
  technicalDomains,
  profileTechnicalDomains,
  barAdmissions,
  workHistory,
  languages,
} from '@/lib/db/schema'
import { getSupabase, CV_BUCKET } from '@/lib/supabase'
import { convertDocxToText } from '@/lib/docx-to-text'
import { CvParsedDataSchema } from './schema'
import { CV_EXTRACTION_PROMPT } from './prompt'

let _anthropic: Anthropic
const anthropic = () => (_anthropic ??= new Anthropic())

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Extract the storage path from a Supabase public URL.
 * e.g. "https://xxx.supabase.co/storage/v1/object/public/cvs/candidate/123/file.pdf"
 *   -> "candidate/123/file.pdf"
 */
function extractStoragePath(publicUrl: string): string {
  const marker = `/object/public/${CV_BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) {
    throw new Error(`Could not extract storage path from URL: ${publicUrl}`)
  }
  return decodeURIComponent(publicUrl.slice(idx + marker.length))
}

export async function parseSingleCv(
  cvUploadId: string
): Promise<{ success: boolean; profileId?: string; error?: string }> {
  try {
    // Fetch the cvUpload record
    const [upload] = await db
      .select()
      .from(cvUploads)
      .where(eq(cvUploads.id, cvUploadId))

    if (!upload) {
      return { success: false, error: `CV upload ${cvUploadId} not found` }
    }

    // Validate status allows parsing
    if (upload.status !== 'uploaded' && upload.status !== 'failed') {
      return {
        success: false,
        error: `CV upload ${cvUploadId} has status '${upload.status}', expected 'uploaded' or 'failed'`,
      }
    }

    // Update status to 'parsing'
    await db
      .update(cvUploads)
      .set({ status: 'parsing', updatedAt: new Date() })
      .where(eq(cvUploads.id, cvUploadId))

    // Download file from Supabase Storage using the service role client
    const storagePath = upload.storagePath ?? extractStoragePath(upload.blobUrl)
    const supabase = getSupabase()
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(CV_BUCKET)
      .download(storagePath)

    if (downloadError || !fileData) {
      throw new Error(
        `Failed to download file from storage: ${downloadError?.message ?? 'no data returned'}`
      )
    }

    const isDocx = upload.filename?.toLowerCase().endsWith('.docx')
    const fileBuffer = Buffer.from(await fileData.arrayBuffer())

    // Build content array based on file type
    let content: Anthropic.MessageCreateParams['messages'][0]['content']

    if (isDocx) {
      const docxText = await convertDocxToText(fileBuffer)
      content = [
        {
          type: 'text',
          text: 'CV Document Content:\n\n' + docxText + '\n\n' + CV_EXTRACTION_PROMPT,
        },
      ]
    } else {
      const pdfBase64 = fileBuffer.toString('base64')
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
          text: CV_EXTRACTION_PROMPT,
        },
      ]
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
        format: zodOutputFormat(CvParsedDataSchema),
      },
    })

    // Parse the structured response
    const firstBlock = response.content[0]
    if (!firstBlock || firstBlock.type !== 'text') {
      throw new Error('Unexpected response format: no text content block')
    }
    const parsed = CvParsedDataSchema.parse(JSON.parse(firstBlock.text))

    // Store parsed data in database using a transaction
    const profileId = await db.transaction(async (tx) => {
      // Insert profile
      const [profile] = await tx
        .insert(profiles)
        .values({
          name: parsed.name.value,
          nameConfidence: parsed.name.confidence,
          email: parsed.email.value || null,
          emailConfidence: parsed.email.confidence,
          phone: parsed.phone.value || null,
          phoneConfidence: parsed.phone.confidence,
        })
        .returning({ id: profiles.id })

      const pid = profile.id

      // Insert specializations
      for (const spec of parsed.specializations.value) {
        if (!spec) continue
        await tx
          .insert(specializations)
          .values({ name: spec })
          .onConflictDoNothing()
        const [specRow] = await tx
          .select()
          .from(specializations)
          .where(eq(specializations.name, spec))
        await tx.insert(profileSpecializations).values({
          profileId: pid,
          specializationId: specRow.id,
          confidence: parsed.specializations.confidence,
        })
      }

      // Insert education entries
      for (const edu of parsed.education.value) {
        await tx.insert(education).values({
          profileId: pid,
          institution: edu.institution,
          degree: edu.degree,
          field: edu.field,
          year: edu.year || null,
          confidence: parsed.education.confidence,
        })
      }

      // Insert technical domains
      for (const domain of parsed.technicalBackground.value) {
        if (!domain) continue
        await tx
          .insert(technicalDomains)
          .values({ name: domain })
          .onConflictDoNothing()
        const [domainRow] = await tx
          .select()
          .from(technicalDomains)
          .where(eq(technicalDomains.name, domain))
        await tx.insert(profileTechnicalDomains).values({
          profileId: pid,
          technicalDomainId: domainRow.id,
          confidence: parsed.technicalBackground.confidence,
        })
      }

      // Insert bar admissions
      for (const bar of parsed.barAdmissions.value) {
        await tx.insert(barAdmissions).values({
          profileId: pid,
          jurisdiction: bar.jurisdiction,
          year: bar.year || null,
          status: bar.status || null,
          confidence: parsed.barAdmissions.confidence,
        })
      }

      // Insert work history
      for (const work of parsed.workHistory.value) {
        await tx.insert(workHistory).values({
          profileId: pid,
          employer: work.employer,
          title: work.title,
          startDate: work.startDate || null,
          endDate: work.endDate || null,
          description: work.description || null,
          confidence: parsed.workHistory.confidence,
        })
      }

      // Insert languages
      for (const lang of parsed.languages.value) {
        await tx.insert(languages).values({
          profileId: pid,
          language: lang.language,
          proficiency: lang.proficiency || null,
          confidence: parsed.languages.confidence,
        })
      }

      // Update cvUpload with parsed status and profileId
      await tx
        .update(cvUploads)
        .set({
          status: 'parsed',
          profileId: pid,
          parsedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(cvUploads.id, cvUploadId))

      return pid
    })

    return { success: true, profileId }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown error during CV parsing'
    const truncatedMessage = message.slice(0, 500)

    // Update cvUpload status to 'failed'
    try {
      await db
        .update(cvUploads)
        .set({
          status: 'failed',
          errorMessage: truncatedMessage,
          updatedAt: new Date(),
        })
        .where(eq(cvUploads.id, cvUploadId))
    } catch {
      // If we can't update the status, there's nothing more we can do
    }

    return { success: false, error: truncatedMessage }
  }
}
