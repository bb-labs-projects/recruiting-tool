'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { employerProfiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getUser } from '@/lib/dal'
import { z } from 'zod'

async function requireAdmin() {
  const user = await getUser()
  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized')
  }
  return user
}

const UpdateNotesSchema = z.object({
  employerProfileId: z.string().uuid(),
  verificationNotes: z.string().max(5000),
})

export type VerificationNotesState =
  | { error: string }
  | { success: true }
  | undefined

export async function updateVerificationNotes(
  _prevState: VerificationNotesState,
  formData: FormData,
): Promise<VerificationNotesState> {
  try {
    await requireAdmin()

    const parsed = UpdateNotesSchema.safeParse({
      employerProfileId: formData.get('employerProfileId'),
      verificationNotes: formData.get('verificationNotes'),
    })

    if (!parsed.success) {
      return { error: 'Invalid input' }
    }

    await db
      .update(employerProfiles)
      .set({
        verificationNotes: parsed.data.verificationNotes || null,
        updatedAt: new Date(),
      })
      .where(eq(employerProfiles.id, parsed.data.employerProfileId))

    revalidatePath('/admin/employers')
    return { success: true }
  } catch (error) {
    console.error('updateVerificationNotes error:', error)
    return { error: 'Failed to update notes' }
  }
}
