import Link from 'next/link'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Lock, Briefcase, GraduationCap, Scale } from 'lucide-react'
import { SaveButton } from '@/app/(authenticated)/employer/browse/saved-button'
import type { AnonymizedProfileDTO } from '@/lib/dal/employer-profiles'

/**
 * Anonymized candidate profile card for employer browse grid.
 * Displays ONLY non-PII data: specializations, experience range,
 * bar admissions, education summary, and anonymized work history.
 * NEVER shows name, email, phone, or employer names.
 * Includes save/unsave heart button with optimistic UI.
 */
export function ProfileCard({
  profile,
  isSaved,
}: {
  profile: AnonymizedProfileDTO
  isSaved: boolean
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>IP Professional</CardTitle>
          <CardDescription>{profile.experienceRange} experience</CardDescription>
        </div>
        <SaveButton profileId={profile.id} initialSaved={isSaved} size="sm" />
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        {/* Specializations */}
        {profile.specializations.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.specializations.map((spec) => (
              <Badge key={spec} variant="secondary">
                {spec}
              </Badge>
            ))}
          </div>
        )}

        {/* Technical Domains */}
        {profile.technicalDomains.length > 0 && (
          <p className="text-muted-foreground text-sm">
            {profile.technicalDomains.join(', ')}
          </p>
        )}

        {/* Bar Admissions */}
        {profile.barAdmissions.length > 0 && (
          <div className="flex items-start gap-2 text-sm">
            <Scale className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <span>{profile.barAdmissions.join(', ')}</span>
          </div>
        )}

        {/* Education Summary */}
        {profile.educationSummary.length > 0 && (
          <div className="flex items-start gap-2 text-sm">
            <GraduationCap className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <span>
              {profile.educationSummary[0]}
              {profile.educationSummary.length > 1 && (
                <span className="text-muted-foreground">
                  {' '}
                  +{profile.educationSummary.length - 1} more
                </span>
              )}
            </span>
          </div>
        )}

        {/* Work History Summary */}
        {profile.workHistorySummary.length > 0 && (
          <div className="flex items-start gap-2 text-sm">
            <Briefcase className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <div className="space-y-1">
              {profile.workHistorySummary.slice(0, 2).map((entry, i) => (
                <p key={i}>
                  {entry.title} - {entry.type}{' '}
                  <span className="text-muted-foreground">
                    ({entry.durationRange})
                  </span>
                </p>
              ))}
              {profile.workHistorySummary.length > 2 && (
                <p className="text-muted-foreground">
                  +{profile.workHistorySummary.length - 2} more positions
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/employer/browse/${profile.id}`}>
            <Lock className="size-4" />
            View Profile
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
