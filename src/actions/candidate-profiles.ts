'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import {
  profiles,
  education,
  workHistory,
  barAdmissions,
  specializations,
  profileSpecializations,
  technicalDomains,
  profileTechnicalDomains,
} from '@/lib/db/schema'
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
// Action 5: toggleOpenToOffers
// ---------------------------------------------------------------------------

const ToggleOpenToOffersSchema = z.object({
  profileId: z.string().uuid(),
  openToOffers: z.boolean(),
})

export async function toggleOpenToOffers(formData: FormData) {
  try {
    const parsed = ToggleOpenToOffersSchema.safeParse({
      profileId: formData.get('profileId'),
      openToOffers: formData.get('openToOffers') === 'true',
    })

    if (!parsed.success) {
      return { error: 'Invalid input' }
    }

    await requireCandidateOwner(parsed.data.profileId)

    await db
      .update(profiles)
      .set({
        openToOffers: parsed.data.openToOffers,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, parsed.data.profileId))

    revalidatePath('/candidate')
    revalidatePath('/candidate/profile')

    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Unauthorized' }
    }
    console.error('toggleOpenToOffers error:', error)
    return { error: 'Failed to update preference' }
  }
}

// ---------------------------------------------------------------------------
// Action 6: submitProfileForReview
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

// ---------------------------------------------------------------------------
// Action 7: addCandidateSpecialization
// ---------------------------------------------------------------------------

const AddSpecializationSchema = z.object({
  profileId: z.string().uuid(),
  name: z.string().min(1, 'Name is required').max(255),
})

export async function addCandidateSpecialization(formData: FormData) {
  try {
    const parsed = AddSpecializationSchema.safeParse({
      profileId: formData.get('profileId'),
      name: formData.get('name'),
    })

    if (!parsed.success) {
      return { error: 'Invalid input' }
    }

    const { profileId, name } = parsed.data
    await requireCandidateOwner(profileId)

    // Find or create the specialization lookup record
    const trimmedName = name.trim()
    let [existing] = await db
      .select({ id: specializations.id })
      .from(specializations)
      .where(eq(specializations.name, trimmedName))
      .limit(1)

    if (!existing) {
      ;[existing] = await db
        .insert(specializations)
        .values({ name: trimmedName })
        .returning({ id: specializations.id })
    }

    await db
      .insert(profileSpecializations)
      .values({
        profileId,
        specializationId: existing.id,
        confidence: 'high',
      })
      .onConflictDoNothing()

    await triggerReReviewIfActive(profileId)

    revalidatePath('/candidate/profile')
    revalidatePath('/candidate')

    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Unauthorized' }
    }
    console.error('addCandidateSpecialization error:', error)
    return { error: 'Failed to add specialization' }
  }
}

// ---------------------------------------------------------------------------
// Action 8: removeCandidateSpecialization
// ---------------------------------------------------------------------------

const RemoveSpecializationSchema = z.object({
  profileId: z.string().uuid(),
  specializationId: z.string().uuid(),
})

export async function removeCandidateSpecialization(formData: FormData) {
  try {
    const parsed = RemoveSpecializationSchema.safeParse({
      profileId: formData.get('profileId'),
      specializationId: formData.get('specializationId'),
    })

    if (!parsed.success) {
      return { error: 'Invalid input' }
    }

    const { profileId, specializationId } = parsed.data
    await requireCandidateOwner(profileId)

    await db
      .delete(profileSpecializations)
      .where(
        and(
          eq(profileSpecializations.profileId, profileId),
          eq(profileSpecializations.specializationId, specializationId),
        )
      )

    await triggerReReviewIfActive(profileId)

    revalidatePath('/candidate/profile')
    revalidatePath('/candidate')

    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Unauthorized' }
    }
    console.error('removeCandidateSpecialization error:', error)
    return { error: 'Failed to remove specialization' }
  }
}

// ---------------------------------------------------------------------------
// Action 9: addCandidateTechnicalDomain
// ---------------------------------------------------------------------------

const AddTechnicalDomainSchema = z.object({
  profileId: z.string().uuid(),
  name: z.string().min(1, 'Name is required').max(255),
})

export async function addCandidateTechnicalDomain(formData: FormData) {
  try {
    const parsed = AddTechnicalDomainSchema.safeParse({
      profileId: formData.get('profileId'),
      name: formData.get('name'),
    })

    if (!parsed.success) {
      return { error: 'Invalid input' }
    }

    const { profileId, name } = parsed.data
    await requireCandidateOwner(profileId)

    const trimmedName = name.trim()
    let [existing] = await db
      .select({ id: technicalDomains.id })
      .from(technicalDomains)
      .where(eq(technicalDomains.name, trimmedName))
      .limit(1)

    if (!existing) {
      ;[existing] = await db
        .insert(technicalDomains)
        .values({ name: trimmedName })
        .returning({ id: technicalDomains.id })
    }

    await db
      .insert(profileTechnicalDomains)
      .values({
        profileId,
        technicalDomainId: existing.id,
        confidence: 'high',
      })
      .onConflictDoNothing()

    await triggerReReviewIfActive(profileId)

    revalidatePath('/candidate/profile')
    revalidatePath('/candidate')

    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Unauthorized' }
    }
    console.error('addCandidateTechnicalDomain error:', error)
    return { error: 'Failed to add technical domain' }
  }
}

// ---------------------------------------------------------------------------
// Action 10: removeCandidateTechnicalDomain
// ---------------------------------------------------------------------------

const RemoveTechnicalDomainSchema = z.object({
  profileId: z.string().uuid(),
  technicalDomainId: z.string().uuid(),
})

export async function removeCandidateTechnicalDomain(formData: FormData) {
  try {
    const parsed = RemoveTechnicalDomainSchema.safeParse({
      profileId: formData.get('profileId'),
      technicalDomainId: formData.get('technicalDomainId'),
    })

    if (!parsed.success) {
      return { error: 'Invalid input' }
    }

    const { profileId, technicalDomainId } = parsed.data
    await requireCandidateOwner(profileId)

    await db
      .delete(profileTechnicalDomains)
      .where(
        and(
          eq(profileTechnicalDomains.profileId, profileId),
          eq(profileTechnicalDomains.technicalDomainId, technicalDomainId),
        )
      )

    await triggerReReviewIfActive(profileId)

    revalidatePath('/candidate/profile')
    revalidatePath('/candidate')

    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Unauthorized' }
    }
    console.error('removeCandidateTechnicalDomain error:', error)
    return { error: 'Failed to remove technical domain' }
  }
}

// ---------------------------------------------------------------------------
// Action 11: addCandidateBarAdmission
// ---------------------------------------------------------------------------

const AddBarAdmissionSchema = z.object({
  profileId: z.string().uuid(),
  jurisdiction: z.string().min(1, 'Jurisdiction is required').max(255),
  year: z.string().optional().or(z.literal('')),
  status: z.string().optional().or(z.literal('')),
})

export async function addCandidateBarAdmission(formData: FormData) {
  try {
    const parsed = AddBarAdmissionSchema.safeParse({
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

    const { profileId, jurisdiction, year, status } = parsed.data
    await requireCandidateOwner(profileId)

    await db.insert(barAdmissions).values({
      profileId,
      jurisdiction: jurisdiction.trim(),
      year: year?.trim() || null,
      status: status?.trim() || null,
      confidence: 'high',
      sortOrder: 0,
    })

    await triggerReReviewIfActive(profileId)

    revalidatePath('/candidate/profile')
    revalidatePath('/candidate')

    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Unauthorized' }
    }
    console.error('addCandidateBarAdmission error:', error)
    return { error: 'Failed to add bar admission' }
  }
}

// ---------------------------------------------------------------------------
// Action 12: removeCandidateBarAdmission
// ---------------------------------------------------------------------------

const RemoveBarAdmissionSchema = z.object({
  barAdmissionId: z.string().uuid(),
  profileId: z.string().uuid(),
})

export async function removeCandidateBarAdmission(formData: FormData) {
  try {
    const parsed = RemoveBarAdmissionSchema.safeParse({
      barAdmissionId: formData.get('barAdmissionId'),
      profileId: formData.get('profileId'),
    })

    if (!parsed.success) {
      return { error: 'Invalid input' }
    }

    const { barAdmissionId, profileId } = parsed.data
    await requireCandidateOwner(profileId)

    await db
      .delete(barAdmissions)
      .where(
        and(
          eq(barAdmissions.id, barAdmissionId),
          eq(barAdmissions.profileId, profileId),
        )
      )

    await triggerReReviewIfActive(profileId)

    revalidatePath('/candidate/profile')
    revalidatePath('/candidate')

    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Unauthorized' }
    }
    console.error('removeCandidateBarAdmission error:', error)
    return { error: 'Failed to remove bar admission' }
  }
}
