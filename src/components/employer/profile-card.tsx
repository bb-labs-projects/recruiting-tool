import Link from 'next/link'
import { Briefcase, GraduationCap, Scale } from 'lucide-react'
import { SaveButton } from '@/app/(authenticated)/employer/browse/saved-button'
import type { AnonymizedProfileDTO } from '@/lib/dal/employer-profiles'

export function ProfileCard({
  profile,
  isSaved,
}: {
  profile: AnonymizedProfileDTO
  isSaved: boolean
}) {
  return (
    <div className="group bg-white border border-[oklch(0.90_0_0)] rounded-lg p-5 shadow-[0_1px_3px_oklch(0_0_0_/_0.06)] hover:border-[oklch(0.80_0_0)] transition-custom relative flex flex-col">
      {/* Save heart */}
      <div className="absolute right-4 top-4">
        <SaveButton profileId={profile.id} initialSaved={isSaved} size="sm" />
      </div>

      {/* Overline + title */}
      <div className="flex flex-col gap-1 mb-4">
        <span className="font-mono text-[11px] uppercase tracking-wide text-[oklch(0.55_0_0)] font-medium">
          IP Professional
        </span>
        <h3 className="text-[oklch(0.12_0_0)] font-semibold text-[15px]">
          {profile.experienceRange} experience
        </h3>
        {profile.barAdmissions.length > 0 && (
          <span className="text-[oklch(0.55_0_0)] text-[13px]">
            {profile.barAdmissions.join(', ')}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="space-y-3 mb-6 flex-1">
        {profile.specializations.length > 0 && (
          <p className="text-[13px] text-[oklch(0.12_0_0)] leading-relaxed">
            {profile.specializations.join(', ')}
          </p>
        )}

        {profile.barAdmissions.length > 0 && (
          <div className="flex items-center gap-2 text-[13px] text-[oklch(0.12_0_0)]">
            <Scale className="text-[oklch(0.55_0_0)] size-3.5 shrink-0" />
            {profile.barAdmissions.join(', ')}
          </div>
        )}

        {profile.educationSummary.length > 0 && (
          <div className="flex items-center gap-2 text-[13px] text-[oklch(0.12_0_0)]">
            <GraduationCap className="text-[oklch(0.55_0_0)] size-3.5 shrink-0" />
            <span className="line-clamp-1">
              {profile.educationSummary[0]}
              {profile.educationSummary.length > 1 && (
                <span className="text-[oklch(0.55_0_0)]">
                  {' '}+{profile.educationSummary.length - 1} more
                </span>
              )}
            </span>
          </div>
        )}

        {profile.workHistorySummary.length > 0 && (
          <div className="flex items-center gap-2 text-[13px] text-[oklch(0.12_0_0)]">
            <Briefcase className="text-[oklch(0.55_0_0)] size-3.5 shrink-0" />
            <span className="line-clamp-1">
              {profile.workHistorySummary[0].title} - {profile.workHistorySummary[0].type}
              {profile.workHistorySummary.length > 1 && (
                <span className="text-[oklch(0.55_0_0)]">
                  {' '}+{profile.workHistorySummary.length - 1} more
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-[oklch(0.90_0_0)]">
        <Link
          href={`/employer/browse/${profile.id}`}
          className="w-full h-9 bg-[oklch(0.12_0_0)] hover:bg-[oklch(0.20_0_0)] text-white font-medium text-[13px] rounded-md flex items-center justify-center transition-custom"
        >
          View Details
        </Link>
      </div>
    </div>
  )
}
