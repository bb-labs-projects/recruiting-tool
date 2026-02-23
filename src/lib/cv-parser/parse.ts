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
} from '@/lib/db/schema'
import { CvParsedDataSchema } from './schema'
import { CV_EXTRACTION_PROMPT } from './prompt'

let _anthropic: Anthropic
const anthropic = () => (_anthropic ??= new Anthropic())

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

    // Fetch PDF from Vercel Blob and convert to base64
    const pdfResponse = await fetch(upload.blobUrl)
    if (!pdfResponse.ok) {
      throw new Error(
        `Failed to fetch PDF from blob storage: ${pdfResponse.status} ${pdfResponse.statusText}`
      )
    }
    const pdfBase64 = Buffer.from(await pdfResponse.arrayBuffer()).toString(
      'base64'
    )

    // Call Claude API with structured output
    const response = await anthropic().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
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
          ],
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
