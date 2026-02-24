import { NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { cvUploads, profiles } from '@/lib/db/schema'
import { getUser } from '@/lib/dal'
import { getCandidateProfile, checkDuplicateProfiles } from '@/lib/dal/candidate-profiles'
import { parseSingleCv } from '@/lib/cv-parser/parse'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const user = await getUser()
    if (!user || user.role !== 'candidate') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { cvUploadId } = await request.json()
    if (!cvUploadId) {
      return NextResponse.json({ error: 'cvUploadId is required' }, { status: 400 })
    }

    // Verify this upload belongs to the candidate
    const [upload] = await db
      .select({ id: cvUploads.id })
      .from(cvUploads)
      .where(and(eq(cvUploads.id, cvUploadId), eq(cvUploads.uploadedBy, user.id)))
      .limit(1)

    if (!upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
    }

    // If candidate already has a profile, delete it and related data (re-upload)
    const existingProfile = await getCandidateProfile(user.id)
    if (existingProfile) {
      // Unlink any cv_uploads referencing this profile before deleting it
      await db.update(cvUploads).set({ profileId: null }).where(eq(cvUploads.profileId, existingProfile.id))
      await db.delete(profiles).where(eq(profiles.id, existingProfile.id))
    }

    // Parse the CV
    const result = await parseSingleCv(cvUploadId)

    if (result.success && result.profileId) {
      // Set userId on the new profile
      await db
        .update(profiles)
        .set({ userId: user.id })
        .where(eq(profiles.id, result.profileId))

      // Run duplicate detection
      const [newProfile] = await db
        .select({ name: profiles.name, email: profiles.email })
        .from(profiles)
        .where(eq(profiles.id, result.profileId))
        .limit(1)

      if (newProfile) {
        const flags = await checkDuplicateProfiles(newProfile.name, newProfile.email)
        if (flags.length > 0) {
          await db
            .update(profiles)
            .set({ duplicateNotes: flags.join('\n') })
            .where(eq(profiles.id, result.profileId))
        }
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('CV parse error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
