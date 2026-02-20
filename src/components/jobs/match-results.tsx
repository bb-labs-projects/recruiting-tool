import Link from 'next/link'
import type { JobMatchDTO } from '@/lib/dal/job-matches'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function scoreColor(score: number): string {
  if (score >= 75) return 'text-green-600 dark:text-green-400'
  if (score >= 50) return 'text-yellow-600 dark:text-yellow-400'
  if (score >= 25) return 'text-orange-600 dark:text-orange-400'
  return 'text-red-600 dark:text-red-400'
}

function recommendationVariant(
  rec: string
): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (rec === 'Strong Match') return 'default'
  if (rec === 'Good Match') return 'secondary'
  if (rec === 'Partial Match') return 'outline'
  return 'destructive'
}

const subscoreLabels: { key: string; label: string; weight: string }[] = [
  { key: 'specializationMatch', label: 'Specialization', weight: '30%' },
  { key: 'experienceFit', label: 'Experience', weight: '25%' },
  { key: 'technicalBackground', label: 'Technical', weight: '20%' },
  { key: 'barAdmissions', label: 'Bar', weight: '15%' },
  { key: 'locationMatch', label: 'Location', weight: '10%' },
]

export function MatchResults({ matches }: { matches: JobMatchDTO[] }) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        {matches.length} candidate{matches.length !== 1 ? 's' : ''} matched
      </p>

      {matches.map((match) => (
        <Card key={match.id}>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`text-3xl font-bold ${scoreColor(match.overallScore)}`}
                >
                  {match.overallScore}
                </span>
                <div>
                  <Badge variant={recommendationVariant(match.recommendation)}>
                    {match.recommendation}
                  </Badge>
                </div>
              </div>
              <Link
                href={`/employer/browse/${match.profileId}`}
                className="text-primary text-sm hover:underline"
              >
                View Profile
              </Link>
            </div>

            <p className="text-sm">{match.summary}</p>

            <div className="grid grid-cols-5 gap-2">
              {subscoreLabels.map(({ key, label, weight }) => {
                const sub = match.subscores[
                  key as keyof typeof match.subscores
                ] as { score: number; explanation: string }
                return (
                  <div key={key} className="text-center">
                    <p className="text-muted-foreground text-xs">
                      {label} ({weight})
                    </p>
                    <p
                      className={`text-lg font-semibold ${scoreColor(sub.score)}`}
                    >
                      {sub.score}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs leading-tight">
                      {sub.explanation}
                    </p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
