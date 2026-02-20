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
