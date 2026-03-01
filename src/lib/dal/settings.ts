import 'server-only'

import { cache } from 'react'
import { db } from '@/lib/db'
import { appSettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export type Theme = 'cromwell' | 'blackgold'

export const getTheme = cache(async (): Promise<Theme> => {
  try {
    const [row] = await db
      .select({ value: appSettings.value })
      .from(appSettings)
      .where(eq(appSettings.key, 'theme'))
      .limit(1)

    const val = row?.value
    if (val === 'cromwell' || val === 'blackgold') return val
  } catch {
    // Table may not exist yet before migration is applied
  }
  return 'cromwell'
})

export async function setTheme(theme: Theme): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key: 'theme', value: theme, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: theme, updatedAt: new Date() },
    })
}
