import { getUser } from '@/lib/dal'
import { getEmployerProfile } from '@/lib/dal/admin-employers'
import { getAnonymizedProfileById } from '@/lib/dal/employer-profiles'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { UnlockButton } from '@/components/employer/unlock-button'
import {
  ArrowLeft,
  Briefcase,
  GraduationCap,
  Scale,
  Cpu,
  Lock,
} from 'lucide-react'

/**
 * Single anonymized profile detail page for employer viewing.
 *
 * APPROVAL GATE: Page-level check ensures only approved employers
 * can view profile details.
 *
 * SECURITY: Uses getAnonymizedProfileById DAL which NEVER selects PII
 * fields from the database (column inclusion mode). Work history
 * shows title, type, duration -- NEVER employer name.
 */
export default async function ProfileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // Approval gate
  const user = await getUser()
  if (!user) redirect('/login')
  const employerProfile = await getEmployerProfile(user.id)
  if (!employerProfile || employerProfile.status !== 'approved') {
    redirect('/employer')
  }

  // Fetch anonymized profile
  const { id } = await params
  const profile = await getAnonymizedProfileById(id)
  if (!profile) notFound()

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

      {/* Title Section */}
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">IP Professional</h1>
        <Badge variant="secondary">{profile.experienceRange} experience</Badge>
      </div>

      {/* Main Content Card */}
      <Card>
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
          <section className="rounded-lg border border-dashed p-6 text-center">
            <Lock className="text-muted-foreground mx-auto mb-3 size-8" />
            <h3 className="text-lg font-semibold">
              Want to see this candidate&apos;s full details?
            </h3>
            <p className="text-muted-foreground mx-auto mt-1 mb-4 max-w-md text-sm">
              Unlock this profile to see their name, contact information, and
              complete work history.
            </p>
            <UnlockButton profileId={profile.id} />
          </section>
        </CardContent>
      </Card>
    </div>
  )
}
