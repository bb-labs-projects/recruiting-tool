'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { profiles, education, workHistory, barAdmissions, languages } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { getUser } from '@/lib/dal'

// ---------------------------------------------------------------------------
// Helper: require admin role
// ---------------------------------------------------------------------------

async function requireAdmin() {
  const user = await getUser()
  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized')
  }
  return user
}

// ---------------------------------------------------------------------------
// Action 1: approveProfile
// ---------------------------------------------------------------------------

const ApproveProfileSchema = z.object({
  profileId: z.string().uuid(),
})

export async function approveProfile(formData: FormData) {
  try {
    const user = await requireAdmin()

    const parsed = ApproveProfileSchema.safeParse({
      profileId: formData.get('profileId'),
    })

    if (!parsed.success) {
      return { error: 'Invalid profile ID' }
    }

    await db
      .update(profiles)
      .set({
        status: 'active',
        reviewedAt: new Date(),
        reviewedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, parsed.data.profileId))

    revalidatePath('/admin/candidates')
    revalidatePath(`/admin/candidates/${parsed.data.profileId}`)

    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Unauthorized' }
    }
    console.error('approveProfile error:', error)
    return { error: 'Failed to approve profile' }
  }
}

// ---------------------------------------------------------------------------
// Action 2: rejectProfile
// ---------------------------------------------------------------------------

const RejectProfileSchema = z.object({
  profileId: z.string().uuid(),
  rejectionNotes: z.string().min(1, 'Rejection reason is required'),
})

export async function rejectProfile(formData: FormData) {
  try {
    const user = await requireAdmin()

    const parsed = RejectProfileSchema.safeParse({
      profileId: formData.get('profileId'),
      rejectionNotes: formData.get('rejectionNotes'),
    })

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      return { error: fieldErrors.rejectionNotes?.[0] ?? fieldErrors.profileId?.[0] ?? 'Invalid input' }
    }

    await db
      .update(profiles)
      .set({
        status: 'rejected',
        rejectionNotes: parsed.data.rejectionNotes,
        reviewedAt: new Date(),
        reviewedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, parsed.data.profileId))

    revalidatePath('/admin/candidates')
    revalidatePath(`/admin/candidates/${parsed.data.profileId}`)

    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Unauthorized' }
    }
    console.error('rejectProfile error:', error)
    return { error: 'Failed to reject profile' }
  }
}

// ---------------------------------------------------------------------------
// Action 3: updateProfileField
// ---------------------------------------------------------------------------

const EDITABLE_FIELDS = ['name', 'email', 'phone'] as const

const UpdateProfileFieldSchema = z.object({
  profileId: z.string().uuid(),
  fieldName: z.enum(EDITABLE_FIELDS),
  value: z.string(),
})

export async function updateProfileField(formData: FormData) {
  try {
    await requireAdmin()

    const parsed = UpdateProfileFieldSchema.safeParse({
      profileId: formData.get('profileId'),
      fieldName: formData.get('fieldName'),
      value: formData.get('value'),
    })

    if (!parsed.success) {
      return { error: 'Invalid input' }
    }

    const { profileId, fieldName, value } = parsed.data

    await db
      .update(profiles)
      .set({
        [fieldName]: value,
        [`${fieldName}Confidence`]: 'high' as const,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, profileId))

    revalidatePath(`/admin/candidates/${profileId}`)
    revalidatePath('/admin/candidates')

    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Unauthorized' }
    }
    console.error('updateProfileField error:', error)
    return { error: 'Failed to update field' }
  }
}

// ---------------------------------------------------------------------------
// Action 4: updateEducation
// ---------------------------------------------------------------------------

const UpdateEducationSchema = z.object({
  educationId: z.string().uuid(),
  profileId: z.string().uuid(),
  institution: z.string().min(1, 'Institution is required'),
  degree: z.string().min(1, 'Degree is required'),
  field: z.string().min(1, 'Field of study is required'),
  year: z.string().optional().or(z.literal('')),
})

export async function updateEducation(formData: FormData) {
  try {
    await requireAdmin()

    const parsed = UpdateEducationSchema.safeParse({
      educationId: formData.get('educationId'),
      profileId: formData.get('profileId'),
      institution: formData.get('institution'),
      degree: formData.get('degree'),
      field: formData.get('field'),
      year: formData.get('year'),
    })

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      const firstError = Object.values(fieldErrors).flat()[0]
      return { error: firstError ?? 'Invalid input' }
    }

    await db
      .update(education)
      .set({
        institution: parsed.data.institution,
        degree: parsed.data.degree,
        field: parsed.data.field,
        year: parsed.data.year || null,
        confidence: 'high',
      })
      .where(
        and(
          eq(education.id, parsed.data.educationId),
          eq(education.profileId, parsed.data.profileId),
        )
      )

    revalidatePath(`/admin/candidates/${parsed.data.profileId}`)

    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Unauthorized' }
    }
    console.error('updateEducation error:', error)
    return { error: 'Failed to update education entry' }
  }
}

// ---------------------------------------------------------------------------
// Action 5: updateWorkHistory
// ---------------------------------------------------------------------------

const UpdateWorkHistorySchema = z.object({
  workHistoryId: z.string().uuid(),
  profileId: z.string().uuid(),
  employer: z.string().min(1, 'Employer is required'),
  title: z.string().min(1, 'Title is required'),
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
})

export async function updateWorkHistory(formData: FormData) {
  try {
    await requireAdmin()

    const parsed = UpdateWorkHistorySchema.safeParse({
      workHistoryId: formData.get('workHistoryId'),
      profileId: formData.get('profileId'),
      employer: formData.get('employer'),
      title: formData.get('title'),
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
      description: formData.get('description'),
    })

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      const firstError = Object.values(fieldErrors).flat()[0]
      return { error: firstError ?? 'Invalid input' }
    }

    await db
      .update(workHistory)
      .set({
        employer: parsed.data.employer,
        title: parsed.data.title,
        startDate: parsed.data.startDate || null,
        endDate: parsed.data.endDate || null,
        description: parsed.data.description || null,
        confidence: 'high',
      })
      .where(
        and(
          eq(workHistory.id, parsed.data.workHistoryId),
          eq(workHistory.profileId, parsed.data.profileId),
        )
      )

    revalidatePath(`/admin/candidates/${parsed.data.profileId}`)

    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Unauthorized' }
    }
    console.error('updateWorkHistory error:', error)
    return { error: 'Failed to update work history entry' }
  }
}

// ---------------------------------------------------------------------------
// Action 6: updateBarAdmission
// ---------------------------------------------------------------------------

const UpdateBarAdmissionSchema = z.object({
  barAdmissionId: z.string().uuid(),
  profileId: z.string().uuid(),
  jurisdiction: z.string().min(1, 'Jurisdiction is required'),
  year: z.string().optional().or(z.literal('')),
  status: z.string().optional().or(z.literal('')),
})

export async function updateBarAdmission(formData: FormData) {
  try {
    await requireAdmin()

    const parsed = UpdateBarAdmissionSchema.safeParse({
      barAdmissionId: formData.get('barAdmissionId'),
      profileId: formData.get('profileId'),
      jurisdiction: formData.get('jurisdiction'),
      year: formData.get('year'),
      status: formData.get('status'),
    })

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      const firstError = Object.values(fieldErrors).flat()[0]
      return { error: firstError ?? 'Invalid input' }
    }

    await db
      .update(barAdmissions)
      .set({
        jurisdiction: parsed.data.jurisdiction,
        year: parsed.data.year || null,
        status: parsed.data.status || null,
        confidence: 'high',
      })
      .where(
        and(
          eq(barAdmissions.id, parsed.data.barAdmissionId),
          eq(barAdmissions.profileId, parsed.data.profileId),
        )
      )

    revalidatePath(`/admin/candidates/${parsed.data.profileId}`)

    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Unauthorized' }
    }
    console.error('updateBarAdmission error:', error)
    return { error: 'Failed to update bar admission entry' }
  }
}

// ---------------------------------------------------------------------------
// Action 7: updateLanguage
// ---------------------------------------------------------------------------

const UpdateLanguageSchema = z.object({
  languageId: z.string().uuid(),
  profileId: z.string().uuid(),
  language: z.string().min(1, 'Language is required'),
  proficiency: z.string().optional().or(z.literal('')),
})

export async function updateLanguage(formData: FormData) {
  try {
    await requireAdmin()

    const parsed = UpdateLanguageSchema.safeParse({
      languageId: formData.get('languageId'),
      profileId: formData.get('profileId'),
      language: formData.get('language'),
      proficiency: formData.get('proficiency'),
    })

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      const firstError = Object.values(fieldErrors).flat()[0]
      return { error: firstError ?? 'Invalid input' }
    }

    await db
      .update(languages)
      .set({
        language: parsed.data.language,
        proficiency: parsed.data.proficiency || null,
        confidence: 'high',
      })
      .where(
        and(
          eq(languages.id, parsed.data.languageId),
          eq(languages.profileId, parsed.data.profileId),
        )
      )

    revalidatePath(`/admin/candidates/${parsed.data.profileId}`)

    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Unauthorized' }
    }
    console.error('updateLanguage error:', error)
    return { error: 'Failed to update language entry' }
  }
}

// ---------------------------------------------------------------------------
// Action 8: reorderEntries — reorder within a single category
// ---------------------------------------------------------------------------

const CATEGORY_TABLES = {
  education,
  workHistory,
  barAdmissions,
  languages,
} as const

type Category = keyof typeof CATEGORY_TABLES

const ReorderEntriesSchema = z.object({
  profileId: z.string().uuid(),
  category: z.enum(['education', 'workHistory', 'barAdmissions', 'languages']),
  orderedIds: z.array(z.string().uuid()),
})

export async function reorderEntries(input: {
  profileId: string
  category: Category
  orderedIds: string[]
}) {
  try {
    await requireAdmin()

    const parsed = ReorderEntriesSchema.safeParse(input)
    if (!parsed.success) {
      return { error: 'Invalid input' }
    }

    const { profileId, category, orderedIds } = parsed.data
    const table = CATEGORY_TABLES[category]

    await db.transaction(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await tx
          .update(table)
          .set({ sortOrder: i })
          .where(
            and(
              eq(table.id, orderedIds[i]),
              eq(table.profileId, profileId),
            )
          )
      }
    })

    revalidatePath(`/admin/candidates/${profileId}`)
    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Unauthorized' }
    }
    console.error('reorderEntries error:', error)
    return { error: 'Failed to reorder entries' }
  }
}

// ---------------------------------------------------------------------------
// Action 9: moveEntry — move entry from one category to another
// ---------------------------------------------------------------------------

const MoveEntrySchema = z.object({
  profileId: z.string().uuid(),
  sourceCategory: z.enum(['education', 'workHistory', 'barAdmissions', 'languages']),
  sourceId: z.string().uuid(),
  targetCategory: z.enum(['education', 'workHistory', 'barAdmissions', 'languages']),
  targetIndex: z.number().int().min(0),
})

export async function moveEntry(input: {
  profileId: string
  sourceCategory: Category
  sourceId: string
  targetCategory: Category
  targetIndex: number
}) {
  try {
    await requireAdmin()

    const parsed = MoveEntrySchema.safeParse(input)
    if (!parsed.success) {
      return { error: 'Invalid input' }
    }

    const { profileId, sourceCategory, sourceId, targetCategory, targetIndex } = parsed.data
    if (sourceCategory === targetCategory) {
      return { error: 'Use reorderEntries for same-category moves' }
    }

    const sourceTable = CATEGORY_TABLES[sourceCategory]
    const targetTable = CATEGORY_TABLES[targetCategory]

    await db.transaction(async (tx) => {
      // Read source entry
      const [sourceEntry] = await tx
        .select()
        .from(sourceTable)
        .where(
          and(
            eq(sourceTable.id, sourceId),
            eq(sourceTable.profileId, profileId),
          )
        )

      if (!sourceEntry) {
        throw new Error('Source entry not found')
      }

      // Build target values using field mapping
      const targetValues = mapFields(sourceEntry, sourceCategory, targetCategory, profileId)

      // Get existing target entries to figure out sort orders
      const existingTargetEntries = await tx
        .select({ id: targetTable.id, sortOrder: targetTable.sortOrder })
        .from(targetTable)
        .where(eq(targetTable.profileId, profileId))

      existingTargetEntries.sort((a, b) => a.sortOrder - b.sortOrder)

      // Insert new entry with target sort order (typed per table to satisfy TS)
      const insertValues = { ...targetValues, sortOrder: targetIndex }
      if (targetCategory === 'education') {
        await tx.insert(education).values(insertValues as typeof education.$inferInsert)
      } else if (targetCategory === 'workHistory') {
        await tx.insert(workHistory).values(insertValues as typeof workHistory.$inferInsert)
      } else if (targetCategory === 'barAdmissions') {
        await tx.insert(barAdmissions).values(insertValues as typeof barAdmissions.$inferInsert)
      } else {
        await tx.insert(languages).values(insertValues as typeof languages.$inferInsert)
      }

      // Reorder existing target entries to make room
      for (let i = 0; i < existingTargetEntries.length; i++) {
        const newOrder = i >= targetIndex ? i + 1 : i
        await tx
          .update(targetTable)
          .set({ sortOrder: newOrder })
          .where(eq(targetTable.id, existingTargetEntries[i].id))
      }

      // Delete from source
      await tx
        .delete(sourceTable)
        .where(
          and(
            eq(sourceTable.id, sourceId),
            eq(sourceTable.profileId, profileId),
          )
        )
    })

    revalidatePath(`/admin/candidates/${profileId}`)
    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Unauthorized' }
    }
    console.error('moveEntry error:', error)
    return { error: 'Failed to move entry' }
  }
}

// Field mapping helper for cross-category moves
function mapFields(
  source: Record<string, unknown>,
  from: Category,
  to: Category,
  profileId: string,
): Record<string, unknown> {
  const confidence = (source.confidence as string) || 'medium'

  if (from === 'education' && to === 'workHistory') {
    return {
      profileId,
      employer: source.institution || '',
      title: [source.degree, source.field].filter(Boolean).join(' in ') || '',
      startDate: source.year || null,
      endDate: null,
      description: null,
      confidence,
    }
  }
  if (from === 'education' && to === 'barAdmissions') {
    return {
      profileId,
      jurisdiction: source.institution || '',
      year: source.year || null,
      status: null,
      confidence,
    }
  }
  if (from === 'education' && to === 'languages') {
    return {
      profileId,
      language: source.institution || '',
      proficiency: null,
      confidence,
    }
  }
  if (from === 'workHistory' && to === 'education') {
    const startYear = typeof source.startDate === 'string' ? source.startDate.slice(0, 4) : null
    return {
      profileId,
      institution: source.employer || '',
      degree: source.title || '',
      field: '',
      year: startYear || null,
      confidence,
    }
  }
  if (from === 'workHistory' && to === 'barAdmissions') {
    const startYear = typeof source.startDate === 'string' ? source.startDate.slice(0, 4) : null
    return {
      profileId,
      jurisdiction: source.employer || '',
      year: startYear || null,
      status: null,
      confidence,
    }
  }
  if (from === 'workHistory' && to === 'languages') {
    return {
      profileId,
      language: source.employer || '',
      proficiency: null,
      confidence,
    }
  }
  if (from === 'barAdmissions' && to === 'education') {
    return {
      profileId,
      institution: source.jurisdiction || '',
      degree: '',
      field: '',
      year: source.year || null,
      confidence,
    }
  }
  if (from === 'barAdmissions' && to === 'workHistory') {
    return {
      profileId,
      employer: source.jurisdiction || '',
      title: '',
      startDate: source.year || null,
      endDate: null,
      description: null,
      confidence,
    }
  }
  if (from === 'barAdmissions' && to === 'languages') {
    return {
      profileId,
      language: source.jurisdiction || '',
      proficiency: null,
      confidence,
    }
  }
  if (from === 'languages' && to === 'education') {
    return {
      profileId,
      institution: source.language || '',
      degree: '',
      field: '',
      year: null,
      confidence,
    }
  }
  if (from === 'languages' && to === 'workHistory') {
    return {
      profileId,
      employer: source.language || '',
      title: '',
      startDate: null,
      endDate: null,
      description: null,
      confidence,
    }
  }
  if (from === 'languages' && to === 'barAdmissions') {
    return {
      profileId,
      jurisdiction: source.language || '',
      year: null,
      status: null,
      confidence,
    }
  }

  throw new Error(`Unsupported move: ${from} -> ${to}`)
}
