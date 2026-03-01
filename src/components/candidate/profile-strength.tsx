import Link from 'next/link'
import { CheckCircle2, Circle } from 'lucide-react'
import type { ProfileStrengthResult } from '@/lib/profile-strength'

function scoreColor(score: number): string {
  if (score >= 80) return 'text-[oklch(0.55_0.14_155)]'
  if (score >= 50) return 'text-[oklch(0.70_0.14_85)]'
  return 'text-[oklch(0.55_0.16_20)]'
}

function barColor(score: number): string {
  if (score >= 80) return 'bg-[oklch(0.55_0.14_155)]'
  if (score >= 50) return 'bg-[oklch(0.70_0.14_85)]'
  return 'bg-[oklch(0.55_0.16_20)]'
}

export function ProfileStrength({ result }: { result: ProfileStrengthResult }) {
  return (
    <div className="mb-10">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-[oklch(0.55_0_0)] font-medium mb-4">
        Profile Strength
      </h2>

      {/* Score + progress bar */}
      <div className="mb-5">
        <span className={`font-mono text-[32px] font-semibold ${scoreColor(result.overallScore)}`}>
          {result.overallScore}
        </span>
        <span className="text-[12px] text-[oklch(0.55_0_0)] ml-1">/100</span>
        <div className="mt-2 h-2 w-full rounded-full bg-[oklch(0.92_0_0)]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor(result.overallScore)}`}
            style={{ width: `${result.overallScore}%` }}
          />
        </div>
        <p className="text-[12px] text-[oklch(0.55_0_0)] mt-1.5">
          {result.completedCount} of {result.totalCount} sections complete
        </p>
      </div>

      {/* Dimension checklist */}
      <div className="space-y-2.5">
        {result.dimensions.map((dim) => (
          <div key={dim.label} className="flex items-center gap-2.5">
            {dim.complete ? (
              <CheckCircle2 className="size-4 text-[oklch(0.55_0.14_155)] shrink-0" />
            ) : (
              <Circle className="size-4 text-[oklch(0.75_0_0)] shrink-0" />
            )}
            {dim.complete ? (
              <span className="text-[13px] text-[oklch(0.55_0_0)]">
                {dim.label}
              </span>
            ) : dim.href ? (
              <Link
                href={dim.href}
                className="text-[13px] text-[oklch(0.78_0.14_75)] font-medium hover:underline"
              >
                {dim.tip}
              </Link>
            ) : (
              <span className="text-[13px] text-[oklch(0.78_0.14_75)] font-medium">
                {dim.tip}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-[oklch(0.90_0_0)] mt-10" />
    </div>
  )
}
