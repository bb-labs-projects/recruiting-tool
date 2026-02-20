'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { profiles, education, workHistory, barAdmissions } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { getUser } from '@/lib/dal'

// ---------------------------------------------------------------------------
// Helper: require candidate ownership of a profile
// ---------------------------------------------------------------------------

async function requireCandidateOwner(profileId: string) {
  const user = await getUser()
  if (!user || user.role !== 'candidate') {
    throw new Error('Unauthorized')
  }

  const [profile] = await db
    .select({
      id: profiles.id,
      status: profiles.status,
    })
    .from(profiles)
    .where(and(eq(profiles.id, profileId), eq(profiles.userId, user.id)))
    .limit(1)

  if (!profile) {
    throw new Error('Unauthorized')
  }

  return { user, profile }
}

// ---------------------------------------------------------------------------
// Helper: trigger re-review if profile is currently active
// ---------------------------------------------------------------------------

async function triggerReReviewIfActive(profileId: string) {
  await db
    .update(profiles)
    .set({ status: 'pending_review', updatedAt: new Date() })
    .where(and(eq(profiles.id, profileId), eq(profiles.status, 'active')))
}

// ---------------------------------------------------------------------------
// Action 1: updateCandidateProfileField
// ---------------------------------------------------------------------------

const EDITABLE_FIELDS = ['name', 'email', 'phone'] as const

const UpdateProfileFieldSchema = z.object({
  profileId: z.string().uuid(),
  fieldName: z.enum(EDITABLE_FIELDS),
  value: z.string(),
})

export async function updateCandidateProfileField(formData: FormData) {
  try {
    const parsed = UpdateProfileFieldSchema.safeParse({
      profileId: formData.get('profileId'),
      fieldName: formData.get('fieldName'),
      value: formData.get('value'),
    })

    if (!parsed.success) {
      return { error: 'Invalid input' }
    }

    const { profileId, fieldName, value } = parsed.data
    await requireCandidateOwner(profileId)

    await db
      .update(profiles)
      .set({
        [fieldName]: value,
        [`${fieldName}Confidence`]: 'high' as const,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, profileId))

    await triggerReReviewIfActive(profileId)

    revalidatePath('/candidate/profile')
    revalidatePath('/candidate')

    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Unauthorized' }
    }
    console.error('updateCandidateProfileField error:', error)
    return { error: 'Failed to update field' }
  }
}

// ---------------------------------------------------------------------------
// Action 2: updateCandidateEducation
// ---------------------------------------------------------------------------

const UpdateEducationSchema = z.object({
  educationId: z.string().uuid(),
  profileId: z.string().uuid(),
  institution: z.string().min(1, 'Institution is required'),
  degree: z.string().min(1, 'Degree is required'),
  field: z.string().min(1, 'Field of study is required'),
  year: z.string().optional().or(z.literal('')),
})

export async function updateCandidateEducation(formData: FormData) {
  try {
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

    await requireCandidateOwner(parsed.data.profileId)

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

    await triggerReReviewIfActive(parsed.data.profileId)

    revalidatePath('/candidate/profile')
    revalidatePath('/candidate')

    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Unauthorized' }
    }
    console.error('updateCandidateEducation error:', error)
    return { error: 'Failed to update education entry' }
  }
}

// ---------------------------------------------------------------------------
// Action 3: updateCandidateWorkHistory
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

export async function updateCandidateWorkHistory(formData: FormData) {
  try {
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

    await requireCandidateOwner(parsed.data.profileId)

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

    await triggerReReviewIfActive(parsed.data.profileId)

    revalidatePath('/candidate/profile')
    revalidatePath('/candidate')

    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Unauthorized' }
    }
    console.error('updateCandidateWorkHistory error:', error)
    return { error: 'Failed to update work history entry' }
  }
}

// ---------------------------------------------------------------------------
// Action 4: updateCandidateBarAdmission
// ---------------------------------------------------------------------------

const UpdateBarAdmissionSchema = z.object({
  barAdmissionId: z.string().uuid(),
  profileId: z.string().uuid(),
  jurisdiction: z.string().min(1, 'Jurisdiction is required'),
  year: z.string().optional().or(z.literal('')),
  status: z.string().optional().or(z.literal('')),
})

export async function updateCandidateBarAdmission(formData: FormData) {
  try {
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

    await requireCandidateOwner(parsed.data.profileId)

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

    await triggerReReviewIfActive(parsed.data.profileId)

    revalidatePath('/candidate/profile')
    revalidatePath('/candidate')

    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Unauthorized' }
    }
    console.error('updateCandidateBarAdmission error:', error)
    return { error: 'Failed to update bar admission entry' }
  }
}

// ---------------------------------------------------------------------------
// Action 5: submitProfileForReview
// ---------------------------------------------------------------------------

const SubmitForReviewSchema = z.object({
  profileId: z.string().uuid(),
})

export async function submitProfileForReview(formData: FormData) {
  try {
    const parsed = SubmitForReviewSchema.safeParse({
      profileId: formData.get('profileId'),
    })

    if (!parsed.success) {
      return { error: 'Invalid profile ID' }
    }

    const { profile } = await requireCandidateOwner(parsed.data.profileId)

    // Only allow submission if status is pending_review or rejected
    if (profile.status !== 'pending_review' && profile.status !== 'rejected') {
      return { error: 'Profile cannot be submitted in its current status' }
    }

    await db
      .update(profiles)
      .set({
        status: 'pending_review',
        rejectionNotes: null,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, parsed.data.profileId))

    revalidatePath('/candidate/profile')
    revalidatePath('/candidate')

    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Unauthorized' }
    }
    console.error('submitProfileForReview error:', error)
    return { error: 'Failed to submit profile for review' }
  }
}
