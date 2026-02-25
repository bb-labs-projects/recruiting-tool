import Link from 'next/link'
import type { JobMatchDTO, MatchCardProfilePreview } from '@/lib/dal/job-matches'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScoreRing } from './score-ring'
import { Check, X, HelpCircle, Minus } from 'lucide-react'

// Helpers

function recommendationVariant(
  rec: string
): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (rec === 'Strong Match') return 'default'
  if (rec === 'Good Match') return 'secondary'
  if (rec === 'Partial Match') return 'outline'
  return 'destructive'
}

function barColor(score: number): string {
  if (score >= 75) return 'bg-green-500'
  if (score >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

function barTrack(): string {
  return 'bg-muted/40'
}

const dimensionConfig: { key: keyof JobMatchDTO['subscores']; label: string; weight: string }[] = [
  { key: 'specializationMatch', label: 'Specialization', weight: '25%' },
  { key: 'experienceFit', label: 'Experience', weight: '20%' },
  { key: 'technicalBackground', label: 'Technical', weight: '15%' },
  { key: 'credentials', label: 'Credentials', weight: '15%' },
  { key: 'locationAndLanguage', label: 'Location & Language', weight: '15%' },
  { key: 'leadershipAndBD', label: 'Leadership & BD', weight: '10%' },
]

const tagIcons = {
  met: Check,
  partial: HelpCircle,
  unmet: X,
  unknown: Minus,
} as const

const tagStyles = {
  met: 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300',
  partial: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
  unmet: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300',
  unknown: 'border-muted bg-muted/50 text-muted-foreground',
} as const

// Component

export function MatchCard({
  match,
  profile,
  profileBasePath = '/employer/browse',
}: {
  match: JobMatchDTO
  profile?: MatchCardProfilePreview
  profileBasePath?: string
}) {
  const displayName = profile?.name ?? 'IP Professional'
  const initials = profile?.initialsLabel ?? 'IP'

  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="space-y-5 pt-6">
        {/* Layer 1: Header */}
        <div className="flex items-center gap-4">
          {/* Initials circle */}
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {initials}
          </div>

          {/* Name + meta */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{displayName}</span>
              <Badge variant={recommendationVariant(match.recommendation)} className="shrink-0">
                {match.recommendation}
              </Badge>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {profile?.experienceRange && <span>{profile.experienceRange}</span>}
              {profile?.barAdmissions && profile.barAdmissions.length > 0 && (
                <span>{profile.barAdmissions.slice(0, 3).join(', ')}</span>
              )}
            </div>
          </div>

          {/* Score ring + view link */}
          <div className="flex shrink-0 flex-col items-center gap-1">
            <ScoreRing score={match.overallScore} size={56} />
            <Link
              href={`${profileBasePath}/${match.profileId}`}
              className="text-xs text-primary hover:underline"
            >
              View Profile
            </Link>
          </div>
        </div>

        {/* Layer 2: Dimension bars */}
        <div className="space-y-2">
          {dimensionConfig.map(({ key, label, weight }) => {
            const dim = match.subscores[key]
            if (!dim || dim.score === 0 && dim.explanation === 'N/A') return null
            return (
              <div key={key} className="group">
                <div className="mb-1 flex items-baseline justify-between text-xs">
                  <span className="font-medium">
                    {label} <span className="text-muted-foreground font-normal">({weight})</span>
                  </span>
                  <span className="tabular-nums font-semibold">{dim.score}</span>
                </div>
                <div className={`h-2 w-full overflow-hidden rounded-full ${barTrack()}`}>
                  <div
                    className={`h-full rounded-full transition-all ${barColor(dim.score)}`}
                    style={{ width: `${dim.score}%` }}
                  />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                  {dim.explanation}
                </p>
              </div>
            )
          })}
        </div>

        {/* Layer 3: Requirement tags */}
        {match.requirementTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {match.requirementTags.map((tag) => {
              const Icon = tagIcons[tag.status]
              return (
                <span
                  key={tag.requirement}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${tagStyles[tag.status]}`}
                >
                  <Icon className="size-3" />
                  {tag.requirement}
                </span>
              )
            })}
          </div>
        )}

        {/* Layer 4: Strengths & Gaps */}
        {(match.strengths.length > 0 || match.gaps.length > 0) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {match.strengths.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold text-green-700 dark:text-green-400">Strengths</p>
                <ul className="space-y-0.5">
                  {match.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs">
                      <span className="mt-0.5 text-green-500">+</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {match.gaps.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold text-red-700 dark:text-red-400">Gaps</p>
                <ul className="space-y-0.5">
                  {match.gaps.map((g, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs">
                      <span className="mt-0.5 text-red-500">&ndash;</span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
