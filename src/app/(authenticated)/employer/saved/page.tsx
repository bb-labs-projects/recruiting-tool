import { getUser } from '@/lib/dal'
import { getEmployerProfile } from '@/lib/dal/admin-employers'
import { getSavedProfiles } from '@/lib/dal/employer-saved'
import { getAnonymizedProfileById } from '@/lib/dal/employer-profiles'
import { redirect } from 'next/navigation'
import { ProfileCard } from '@/components/employer/profile-card'
import { Heart, Users } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

/**
 * Saved profiles page -- shows all profiles the employer has saved for later review.
 *
 * APPROVAL GATE: Same pattern as browse page -- only approved employers can access.
 *
 * DATA LOADING: Gets saved profile IDs from employer-saved DAL, then loads each
 * anonymized profile via employer-profiles DAL. Filters out nulls in case a
 * profile was deactivated since being saved.
 *
 * All profiles are inherently saved, so isSaved={true} for every card.
 */
export default async function SavedProfilesPage() {
  // Approval gate
  const user = await getUser()
  if (!user) redirect('/login')
  const employerProfile = await getEmployerProfile(user.id)
  if (!employerProfile || employerProfile.status !== 'approved') {
    redirect('/employer')
  }

  // ToB gate -- must accept Terms of Business before accessing saved profiles
  if (!employerProfile.tobAcceptedAt) {
    redirect('/employer/terms')
  }

  // Load saved profile IDs (ordered by most recently saved)
  const savedProfileIds = await getSavedProfiles(user.id)

  // Load anonymized data for each saved profile
  const profileResults = await Promise.all(
    savedProfileIds.map((id) => getAnonymizedProfileById(id))
  )

  // Filter out nulls (profile may have been deactivated since being saved)
  const profiles = profileResults.filter(
    (p): p is NonNullable<typeof p> => p !== null
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h1 className="font-[family-name:var(--font-outfit)] text-2xl font-bold tracking-tight">Saved Profiles</h1>
        <p className="text-muted-foreground mt-1">
          Profiles you&apos;ve saved for later review
        </p>
      </div>

      {/* Count */}
      <p className="text-muted-foreground text-sm">
        {profiles.length} saved profile{profiles.length !== 1 ? 's' : ''}
      </p>

      {/* Profile Cards Grid */}
      {profiles.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} isSaved={true} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-xl py-20">
          <Heart className="text-teal-400 mb-4 size-12" />
          <h3 className="font-[family-name:var(--font-outfit)] text-lg font-semibold">No saved profiles yet</h3>
          <p className="text-muted-foreground mt-1 max-w-md text-center text-sm">
            Browse candidates and save profiles you&apos;re interested in to see
            them here.
          </p>
          <Button asChild variant="link" className="mt-2">
            <Link href="/employer/browse">Browse Candidates</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
