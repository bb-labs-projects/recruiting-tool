import Link from 'next/link'
import { CheckCircle2, Circle } from 'lucide-react'
import type { ProfileStrengthResult } from '@/lib/profile-strength'

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 50) return 'text-amber-500'
  return 'text-destructive'
}

function barColor(score: number): string {
  if (score >= 80) return 'bg-emerald-600'
  if (score >= 50) return 'bg-amber-500'
  return 'bg-destructive'
}

export function ProfileStrength({ result }: { result: ProfileStrengthResult }) {
  return (
    <div className="mb-10">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium mb-4">
        Profile Strength
      </h2>

      {/* Score + progress bar */}
      <div className="mb-5">
        <span className={`font-mono text-[32px] font-semibold ${scoreColor(result.overallScore)}`}>
          {result.overallScore}
        </span>
        <span className="text-[12px] text-muted-foreground ml-1">/100</span>
        <div className="mt-2 h-2 w-full rounded-full bg-border">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor(result.overallScore)}`}
            style={{ width: `${result.overallScore}%` }}
          />
        </div>
        <p className="text-[12px] text-muted-foreground mt-1.5">
          {result.completedCount} of {result.totalCount} sections complete
        </p>
      </div>

      {/* Dimension checklist */}
      <div className="space-y-2.5">
        {result.dimensions.map((dim) => (
          <div key={dim.label} className="flex items-center gap-2.5">
            {dim.complete ? (
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            ) : (
              <Circle className="size-4 text-muted-foreground/50 shrink-0" />
            )}
            {dim.complete ? (
              <span className="text-[13px] text-muted-foreground">
                {dim.label}
              </span>
            ) : dim.href ? (
              <Link
                href={dim.href}
                className="text-[13px] text-brand font-medium hover:underline"
              >
                {dim.tip}
              </Link>
            ) : (
              <span className="text-[13px] text-brand font-medium">
                {dim.tip}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-border mt-10" />
    </div>
  )
}
