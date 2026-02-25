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

const UpdateDomainsSchema = z.object({
  employerProfileId: z.string().uuid(),
  corporateDomains: z.string(), // comma-separated
})

export async function updateCorporateDomains(formData: FormData) {
  try {
    await requireAdmin()

    const parsed = UpdateDomainsSchema.safeParse({
      employerProfileId: formData.get('employerProfileId'),
      corporateDomains: formData.get('corporateDomains'),
    })

    if (!parsed.success) {
      return { error: 'Invalid input' }
    }

    const domains = parsed.data.corporateDomains
      .split(',')
      .map(d => d.trim().toLowerCase())
      .filter(d => d.length > 0)

    await db
      .update(employerProfiles)
      .set({
        corporateDomains: domains.length > 0 ? domains : null,
        updatedAt: new Date(),
      })
      .where(eq(employerProfiles.id, parsed.data.employerProfileId))

    revalidatePath('/admin/employers')
    return { success: true }
  } catch (error) {
    console.error('updateCorporateDomains error:', error)
    return { error: 'Failed to update domains' }
  }
}
