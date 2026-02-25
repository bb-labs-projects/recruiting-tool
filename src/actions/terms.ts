'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { employerProfiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getUser } from '@/lib/dal'
import { getEmployerProfile } from '@/lib/dal/admin-employers'
import { CURRENT_TOB_VERSION } from '@/lib/tob-constants'

export type AcceptTermsState = { success?: boolean; error?: string } | undefined

export async function acceptTerms(
  _prevState: AcceptTermsState,
  formData: FormData
): Promise<AcceptTermsState> {
  try {
    const user = await getUser()
    if (!user || user.role !== 'employer') {
      return { error: 'Unauthorized' }
    }

    const accepted = formData.get('accepted') === 'true'
    if (!accepted) {
      return { error: 'You must accept the Terms of Business to continue' }
    }

    const profile = await getEmployerProfile(user.id)
    if (!profile) {
      return { error: 'Employer profile not found' }
    }

    await db
      .update(employerProfiles)
      .set({
        tobAcceptedAt: new Date(),
        tobVersion: CURRENT_TOB_VERSION,
        updatedAt: new Date(),
      })
      .where(eq(employerProfiles.id, profile.id))

    revalidatePath('/employer')
    revalidatePath('/employer/terms')
    return { success: true }
  } catch (error) {
    console.error('acceptTerms error:', error)
    return { error: 'Failed to accept terms' }
  }
}
