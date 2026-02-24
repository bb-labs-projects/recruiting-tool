import { getUser } from '@/lib/dal'
import { getEmployerProfile } from '@/lib/dal/admin-employers'
import { getAnonymizedProfileById, getFullProfileById } from '@/lib/dal/employer-profiles'
import { isProfileSaved } from '@/lib/dal/employer-saved'
import { isProfileUnlocked } from '@/lib/dal/employer-unlocks'
import { profileViews } from '@/lib/db/schema'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { UnlockButton } from '@/components/employer/unlock-button'
import { SaveButton } from '../saved-button'
import {
  ArrowLeft,
  Briefcase,
  GraduationCap,
  Scale,
  Cpu,
  Lock,
  Mail,
  Phone,
  Info,
} from 'lucide-react'

/**
 * Single profile detail page for employer viewing.
 *
 * APPROVAL GATE: Page-level check ensures only approved employers
 * can view profile details.
 *
 * CONDITIONAL PII: If employer has unlocked this profile (paid via Stripe),
 * shows full details (name, email, phone, employer names in work history).
 * Otherwise shows anonymized view with unlock CTA.
 *
 * VIEW TRACKING: Records a profile view for analytics on every page load.
 */
export default async function ProfileDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ unlocked?: string }>
}) {
  // Approval gate
  const user = await getUser()
  if (!user) redirect('/login')
  const employerProfile = await getEmployerProfile(user.id)
  if (!employerProfile || employerProfile.status !== 'approved') {
    redirect('/employer')
  }

  const { id } = await params
  const resolvedSearchParams = await searchParams

  // Check unlock status
  const unlocked = await isProfileUnlocked(user.id, id)

  // Check if profile is saved by this employer
  const saved = await isProfileSaved(user.id, id)

  // Fire-and-forget view tracking (non-blocking, silently ignore failures)
  db.insert(profileViews)
    .values({ employerUserId: user.id, profileId: id })
    .catch(() => {})

  // Pending payment banner state
  const showPendingBanner =
    resolvedSearchParams.unlocked === 'pending' && !unlocked

  if (unlocked) {
    // Fetch full profile with PII
    const fullProfile = await getFullProfileById(id, user.id)

    if (!fullProfile) {
      // Defensive: fall through to anonymized view if full profile unavailable
      return renderAnonymizedView(id, user.id, saved, false)
    }

    return (
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Back Link */}
        <Link
          href="/employer/browse"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Browse
        </Link>

        {/* Title Section -- actual name when unlocked */}
        <div className="flex items-center gap-3">
          <h1 className="font-[family-name:var(--font-outfit)] text-2xl font-bold tracking-tight">
            {fullProfile.name}
          </h1>
          <Badge variant="secondary">
            {fullProfile.experienceRange} experience
          </Badge>
          <SaveButton profileId={fullProfile.id} initialSaved={saved} />
        </div>

        {/* Main Content Card */}
        <Card className="rounded-xl shadow-sm">
          <CardContent className="space-y-6 pt-6">
            {/* Contact Information */}
            <section>
              <h2 className="font-[family-name:var(--font-outfit)] mb-3 text-lg font-semibold">
                Contact Information
              </h2>
              <div className="space-y-2">
                {fullProfile.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="text-muted-foreground size-4" />
                    <a
                      href={`mailto:${fullProfile.email}`}
                      className="text-primary hover:underline"
                    >
                      {fullProfile.email}
                    </a>
                  </div>
                )}
                {fullProfile.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="text-muted-foreground size-4" />
                    <a
                      href={`tel:${fullProfile.phone}`}
                      className="text-primary hover:underline"
                    >
                      {fullProfile.phone}
                    </a>
                  </div>
                )}
              </div>
            </section>

            <Separator />

            {/* Specializations */}
            {fullProfile.specializations.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-semibold">Specializations</h2>
                <div className="flex flex-wrap gap-2">
                  {fullProfile.specializations.map((spec) => (
                    <Badge key={spec} variant="secondary">
                      {spec}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {/* Technical Background */}
            {fullProfile.technicalDomains.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-semibold">
                  <Cpu className="mb-0.5 mr-2 inline-block size-5" />
                  Technical Background
                </h2>
                <div className="flex flex-wrap gap-2">
                  {fullProfile.technicalDomains.map((domain) => (
                    <Badge key={domain} variant="outline">
                      {domain}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            <Separator />

            {/* Bar Admissions */}
            {fullProfile.barAdmissions.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-semibold">
                  <Scale className="mb-0.5 mr-2 inline-block size-5" />
                  Bar Admissions
                </h2>
                <ul className="space-y-1.5">
                  {fullProfile.barAdmissions.map((admission) => (
                    <li
                      key={admission.jurisdiction}
                      className="text-sm"
                    >
                      {admission.jurisdiction}
                      {admission.status ? ` (${admission.status})` : ''}
                      {admission.year ? ` - ${admission.year}` : ''}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <Separator />

            {/* Education */}
            {fullProfile.education.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-semibold">
                  <GraduationCap className="mb-0.5 mr-2 inline-block size-5" />
                  Education
                </h2>
                <ul className="space-y-1.5">
                  {fullProfile.education.map((edu) => (
                    <li key={`${edu.degree}-${edu.institution}`} className="text-sm">
                      {edu.degree}, {edu.institution}
                      {edu.year ? ` (${edu.year})` : ''}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <Separator />

            {/* Work History -- full details with employer names */}
            {fullProfile.workHistory.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-semibold">
                  <Briefcase className="mb-0.5 mr-2 inline-block size-5" />
                  Experience
                </h2>
                <div className="space-y-4">
                  {fullProfile.workHistory.map((entry, i) => (
                    <div key={i}>
                      <p className="font-medium">{entry.title}</p>
                      <p className="text-muted-foreground text-sm">
                        {entry.employer}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {entry.startDate ?? 'Unknown'}
                        {' - '}
                        {entry.endDate ?? 'Present'}
                      </p>
                      {entry.description && (
                        <p className="mt-1 text-sm">{entry.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <Separator />

            {/* Unlocked state indicator */}
            <section className="flex items-center justify-center py-4">
              <UnlockButton profileId={fullProfile.id} isUnlocked={true} />
            </section>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Not unlocked -- show anonymized view
  return renderAnonymizedView(id, user.id, saved, showPendingBanner)
}

/**
 * Renders the anonymized profile view (no PII).
 * Extracted to a function for reuse in the unlocked-fallback path.
 */
async function renderAnonymizedView(
  id: string,
  userId: string,
  saved: boolean,
  showPendingBanner: boolean
) {
  const profile = await getAnonymizedProfileById(id)
  if (!profile) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Pending payment banner */}
      {showPendingBanner && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
          <Info className="mt-0.5 size-5 shrink-0 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Payment received!
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Your profile unlock is being processed. This page will update
              shortly -- please refresh in a moment.
            </p>
          </div>
        </div>
      )}

      {/* Back Link */}
      <Link
        href="/employer/browse"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Browse
      </Link>

      {/* Title Section */}
      <div className="flex items-center gap-3">
        <h1 className="font-[family-name:var(--font-outfit)] text-2xl font-bold tracking-tight">IP Professional</h1>
        <Badge variant="secondary">{profile.experienceRange} experience</Badge>
        <SaveButton profileId={profile.id} initialSaved={saved} />
      </div>

      {/* Main Content Card */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="space-y-6 pt-6">
          {/* Specializations */}
          {profile.specializations.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Specializations</h2>
              <div className="flex flex-wrap gap-2">
                {profile.specializations.map((spec) => (
                  <Badge key={spec} variant="secondary">
                    {spec}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* Technical Background */}
          {profile.technicalDomains.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">
                <Cpu className="mb-0.5 mr-2 inline-block size-5" />
                Technical Background
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.technicalDomains.map((domain) => (
                  <Badge key={domain} variant="outline">
                    {domain}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          <Separator />

          {/* Bar Admissions */}
          {profile.barAdmissions.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">
                <Scale className="mb-0.5 mr-2 inline-block size-5" />
                Bar Admissions
              </h2>
              <ul className="space-y-1.5">
                {profile.barAdmissions.map((admission) => (
                  <li key={admission} className="text-sm">
                    {admission}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Separator />

          {/* Education */}
          {profile.educationSummary.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">
                <GraduationCap className="mb-0.5 mr-2 inline-block size-5" />
                Education
              </h2>
              <ul className="space-y-1.5">
                {profile.educationSummary.map((edu) => (
                  <li key={edu} className="text-sm">
                    {edu}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Separator />

          {/* Experience / Work History */}
          {profile.workHistorySummary.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">
                <Briefcase className="mb-0.5 mr-2 inline-block size-5" />
                Experience
              </h2>
              <div className="space-y-4">
                {profile.workHistorySummary.map((entry, i) => (
                  <div key={i}>
                    <p className="font-medium">{entry.title}</p>
                    <p className="text-muted-foreground text-sm">
                      {entry.type}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {entry.durationRange}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <Separator />

          {/* Unlock CTA */}
          <section className="rounded-xl bg-stone-50 p-8 text-center">
            <Lock className="text-teal-400 mx-auto mb-3 size-8" />
            <h3 className="font-[family-name:var(--font-outfit)] text-lg font-semibold">
              Want to see this candidate&apos;s full details?
            </h3>
            <p className="text-muted-foreground mx-auto mt-1 mb-4 max-w-md text-sm">
              Unlock this profile to see their name, contact information, and
              complete work history.
            </p>
            <UnlockButton profileId={profile.id} isUnlocked={false} />
          </section>
        </CardContent>
      </Card>
    </div>
  )
}
