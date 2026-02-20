'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { employerProfiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
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
// Action 1: registerEmployer
// ---------------------------------------------------------------------------

export type RegisterEmployerState =
  | {
      success?: boolean
      error?: string
    }
  | undefined

const RegisterEmployerSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(255),
  companyWebsite: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  contactName: z.string().min(1, 'Contact name is required').max(255),
  contactTitle: z.string().max(255).optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
})

/**
 * Server action for employer registration form.
 *
 * Compatible with React useActionState:
 *   const [state, action, pending] = useActionState(registerEmployer, undefined)
 */
export async function registerEmployer(
  _prevState: RegisterEmployerState,
  formData: FormData
): Promise<RegisterEmployerState> {
  try {
    const user = await getUser()
    if (!user || user.role !== 'employer') {
      return { error: 'Unauthorized' }
    }

    const parsed = RegisterEmployerSchema.safeParse({
      companyName: formData.get('companyName'),
      companyWebsite: formData.get('companyWebsite'),
      contactName: formData.get('contactName'),
      contactTitle: formData.get('contactTitle'),
      phone: formData.get('phone'),
    })

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      return { error: Object.values(fieldErrors).flat()[0] ?? 'Invalid input' }
    }

    // Check if employer profile already exists (prevent duplicates)
    const [existing] = await db
      .select({ id: employerProfiles.id })
      .from(employerProfiles)
      .where(eq(employerProfiles.userId, user.id))
      .limit(1)

    if (existing) {
      return { error: 'Employer profile already exists' }
    }

    await db.insert(employerProfiles).values({
      userId: user.id,
      companyName: parsed.data.companyName,
      companyWebsite: parsed.data.companyWebsite || null,
      contactName: parsed.data.contactName,
      contactTitle: parsed.data.contactTitle || null,
      phone: parsed.data.phone || null,
    })

    revalidatePath('/employer')
    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Unauthorized' }
    }
    console.error('registerEmployer error:', error)
    return { error: 'Failed to register employer' }
  }
}

// ---------------------------------------------------------------------------
// Action 2: approveEmployer
// ---------------------------------------------------------------------------

const ApproveEmployerSchema = z.object({
  employerProfileId: z.string().uuid(),
})

export async function approveEmployer(formData: FormData) {
  try {
    const admin = await requireAdmin()

    const parsed = ApproveEmployerSchema.safeParse({
      employerProfileId: formData.get('employerProfileId'),
    })

    if (!parsed.success) {
      return { error: 'Invalid input' }
    }

    await db
      .update(employerProfiles)
      .set({
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: admin.id,
        updatedAt: new Date(),
      })
      .where(eq(employerProfiles.id, parsed.data.employerProfileId))

    revalidatePath('/admin/employers')
    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Unauthorized' }
    }
    console.error('approveEmployer error:', error)
    return { error: 'Failed to approve employer' }
  }
}

// ---------------------------------------------------------------------------
// Action 3: rejectEmployer
// ---------------------------------------------------------------------------

const RejectEmployerSchema = z.object({
  employerProfileId: z.string().uuid(),
  rejectionReason: z.string().min(1, 'Rejection reason is required'),
})

export async function rejectEmployer(formData: FormData) {
  try {
    const admin = await requireAdmin()

    const parsed = RejectEmployerSchema.safeParse({
      employerProfileId: formData.get('employerProfileId'),
      rejectionReason: formData.get('rejectionReason'),
    })

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      return {
        error:
          fieldErrors.rejectionReason?.[0] ??
          fieldErrors.employerProfileId?.[0] ??
          'Invalid input',
      }
    }

    await db
      .update(employerProfiles)
      .set({
        status: 'rejected',
        rejectionReason: parsed.data.rejectionReason,
        reviewedAt: new Date(),
        reviewedBy: admin.id,
        updatedAt: new Date(),
      })
      .where(eq(employerProfiles.id, parsed.data.employerProfileId))

    revalidatePath('/admin/employers')
    return { success: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Unauthorized' }
    }
    console.error('rejectEmployer error:', error)
    return { error: 'Failed to reject employer' }
  }
}
