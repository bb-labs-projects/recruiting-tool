'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { savedProfiles } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getUser } from '@/lib/dal'

/**
 * Toggle save/unsave a candidate profile for the current employer.
 * Performs insert-or-delete toggle on savedProfiles table.
 *
 * SECURITY: Checks user authentication and employer role before mutation.
 * Revalidates both browse and saved pages after mutation.
 */
export async function toggleSaveProfile(
  profileId: string
): Promise<{ error?: string; saved?: boolean }> {
  try {
    const user = await getUser()
    if (!user || user.role !== 'employer') {
      return { error: 'Unauthorized' }
    }

    // Check if already saved
    const [existing] = await db
      .select({ profileId: savedProfiles.profileId })
      .from(savedProfiles)
      .where(
        and(
          eq(savedProfiles.employerUserId, user.id),
          eq(savedProfiles.profileId, profileId)
        )
      )
      .limit(1)

    if (existing) {
      // Unsave: delete the record
      await db
        .delete(savedProfiles)
        .where(
          and(
            eq(savedProfiles.employerUserId, user.id),
            eq(savedProfiles.profileId, profileId)
          )
        )
      revalidatePath('/employer/browse')
      revalidatePath('/employer/saved')
      return { saved: false }
    } else {
      // Save: insert new record
      await db.insert(savedProfiles).values({
        employerUserId: user.id,
        profileId,
      })
      revalidatePath('/employer/browse')
      revalidatePath('/employer/saved')
      return { saved: true }
    }
  } catch {
    return { error: 'Failed to update saved status' }
  }
}
