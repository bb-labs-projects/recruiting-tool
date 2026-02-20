'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { profiles, education, workHistory, barAdmissions } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
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
