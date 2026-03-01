import { NextResponse } from 'next/server'
import { getCandidateProfile } from '@/lib/dal/candidate-profiles'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const steps: Record<string, unknown> = {}
  try {
    // Step 1: Simple profile query
    steps.step1 = 'Simple profile lookup'
    const [row] = await db.select({ id: profiles.id, name: profiles.name }).from(profiles).where(eq(profiles.userId, '00000000-0000-0000-0000-000000000003')).limit(1)
    steps.simpleWorks = !!row
    steps.profileId = row?.id

    // Step 2: Full relational query (getCandidateProfile)
    steps.step2 = 'getCandidateProfile (relational query)'
    const profile = await getCandidateProfile('00000000-0000-0000-0000-000000000003')
    steps.relationalWorks = !!profile
    steps.profileStatus = profile?.status

    return NextResponse.json(steps)
  } catch (e: unknown) {
    const err = e as Error & { cause?: Error }
    return NextResponse.json({
      ...steps,
      error: err.message?.slice(0, 300),
      cause: err.cause?.message?.slice(0, 300) ?? null,
    }, { status: 500 })
  }
}
