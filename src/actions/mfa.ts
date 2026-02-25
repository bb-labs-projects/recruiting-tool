'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { users, mfaRecoveryCodes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getUser } from '@/lib/dal'
import { verifyTotpCode, decryptSecret } from '@/lib/auth/mfa'

export async function disableMfa(formData: FormData) {
  try {
    const user = await getUser()
    if (!user) return { error: 'Unauthorized' }

    const code = formData.get('code') as string
    if (!code) return { error: 'TOTP code required' }

    // Need to get the full user with mfaSecret
    const [fullUser] = await db
      .select({ mfaSecret: users.mfaSecret, mfaEnabled: users.mfaEnabled })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1)

    if (!fullUser?.mfaEnabled || !fullUser.mfaSecret) {
      return { error: 'MFA is not enabled' }
    }

    const secret = decryptSecret(fullUser.mfaSecret)
    if (!verifyTotpCode(secret, code)) {
      return { error: 'Invalid code' }
    }

    // Disable MFA
    await db.update(users).set({
      mfaSecret: null,
      mfaEnabled: false,
      mfaVerifiedAt: null,
      updatedAt: new Date(),
    }).where(eq(users.id, user.id))

    // Delete recovery codes
    await db.delete(mfaRecoveryCodes).where(eq(mfaRecoveryCodes.userId, user.id))

    revalidatePath('/settings/mfa')
    return { success: true }
  } catch (error) {
    console.error('disableMfa error:', error)
    return { error: 'Failed to disable MFA' }
  }
}
