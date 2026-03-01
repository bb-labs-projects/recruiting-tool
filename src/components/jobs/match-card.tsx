'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { JobMatchDTO, MatchCardProfilePreview } from '@/lib/dal/job-matches'
import { ScoreRing } from './score-ring'
import { CheckCircle, TrendingUp, TrendingDown, Heart } from 'lucide-react'

function recommendationColor(rec: string): string {
  if (rec === 'Strong Match') return 'text-[oklch(0.55_0.14_155)]'
  if (rec === 'Good Match') return 'text-[oklch(0.55_0.10_250)]'
  if (rec === 'Partial Match') return 'text-[oklch(0.70_0.12_75)]'
  return 'text-[oklch(0.55_0.16_20)]'
}

const dimensionConfig: { key: keyof JobMatchDTO['subscores']; label: string }[] = [
  { key: 'specializationMatch', label: 'Specialization' },
  { key: 'experienceFit', label: 'Experience' },
  { key: 'technicalBackground', label: 'Technical' },
  { key: 'credentials', label: 'Credentials' },
  { key: 'locationAndLanguage', label: 'Location' },
  { key: 'leadershipAndBD', label: 'Leadership' },
]

export function MatchCard({
  match,
  profile,
  profileBasePath = '/employer/browse',
}: {
  match: JobMatchDTO
  profile?: MatchCardProfilePreview
  profileBasePath?: string
}) {
  const [expanded, setExpanded] = useState(false)

  const displayName = profile?.name ?? 'IP Professional'
  const initials = profile?.initialsLabel ?? 'IP'
  const visibleTags = match.requirementTags.slice(0, 3)

  return (
    <div
      className={`group cursor-pointer hover:bg-[oklch(0.97_0_0)] transition-custom ${expanded ? 'row-expanded' : ''}`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Main row */}
      <div className="grid grid-cols-[60px_1fr_100px_120px_minmax(0,2fr)_80px] gap-4 items-center px-4 py-4">
        <div>
          <ScoreRing score={match.overallScore} />
        </div>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[oklch(0.20_0_0)] flex items-center justify-center text-white text-[11px] font-medium shrink-0">
            {initials}
          </div>
          <span className="text-[14px] font-medium text-[oklch(0.12_0_0)] truncate">{displayName}</span>
        </div>
        <div className="font-mono text-[13px] text-[oklch(0.12_0_0)]">
          {profile?.experienceRange ?? '—'}
        </div>
        <div className={`text-[13px] font-medium ${recommendationColor(match.recommendation)}`}>
          {match.recommendation}
        </div>
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          {visibleTags.map((tag) => (
            <div key={tag.requirement} className="flex items-center gap-1 text-[12px] text-[oklch(0.12_0_0)] shrink-0">
              <CheckCircle className="text-[oklch(0.55_0.14_155)] size-3 shrink-0" />
              <span className="truncate max-w-[140px]">{tag.requirement}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
          <Link
            href={`${profileBasePath}/${match.profileId}`}
            className="text-[oklch(0.78_0.14_75)] text-[13px] font-medium hover:underline"
          >
            View
          </Link>
          <button className="text-[oklch(0.55_0_0)] hover:text-red-500 transition-custom">
            <Heart className="size-4" />
          </button>
        </div>
      </div>

      {/* Expandable content */}
      <div className="row-expandable overflow-hidden">
        <div className="min-h-0">
          <div className="px-4 pb-6 pt-2 bg-[oklch(0.97_0_0)]">
            <div className="border-t border-[oklch(0.90_0_0)] pt-6">
              {/* Score breakdown */}
              <div className="grid grid-cols-3 gap-x-8 gap-y-5 mb-8">
                {dimensionConfig.map(({ key, label }) => {
                  const dim = match.subscores[key]
                  if (!dim || (dim.score === 0 && dim.explanation === 'N/A')) return null
                  const barColor = dim.score >= 70
                    ? 'bg-[oklch(0.55_0.14_155)]'
                    : dim.score >= 40
                    ? 'bg-[oklch(0.70_0.14_85)]'
                    : 'bg-[oklch(0.55_0.16_20)]'
                  return (
                    <div key={key} className="group/dim relative">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] font-mono uppercase text-[oklch(0.55_0_0)]">{label}</div>
                        <div className="font-mono text-[11px] font-medium text-[oklch(0.30_0_0)]">{dim.score}</div>
                      </div>
                      <div className="h-1.5 w-full bg-[oklch(0.90_0_0)] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${barColor} rounded-full`}
                          style={{ width: `${dim.score}%` }}
                        />
                      </div>
                      {dim.explanation && dim.explanation !== 'N/A' && (
                        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-20 opacity-0 pointer-events-none group-hover/dim:opacity-100 group-hover/dim:pointer-events-auto transition-opacity duration-150 w-[420px]">
                          <div className="bg-[oklch(0.15_0_0)] text-white text-[12px] leading-[1.6] rounded-md px-4 py-3 shadow-lg">
                            {dim.explanation}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Strengths & Gaps */}
              {(match.strengths.length > 0 || match.gaps.length > 0) && (
                <div className="grid grid-cols-2 gap-12 mb-6">
                  {match.strengths.length > 0 && (
                    <div>
                      <h4 className="text-[12px] font-semibold text-[oklch(0.55_0.14_155)] mb-2 flex items-center gap-2">
                        <TrendingUp className="size-3.5" /> Strengths
                      </h4>
                      <ul className="space-y-1.5">
                        {match.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-[12px] text-[oklch(0.12_0_0)]">
                            <span className="text-[oklch(0.55_0.14_155)]">+</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {match.gaps.length > 0 && (
                    <div>
                      <h4 className="text-[12px] font-semibold text-[oklch(0.55_0.16_20)] mb-2 flex items-center gap-2">
                        <TrendingDown className="size-3.5" /> Gaps
                      </h4>
                      <ul className="space-y-1.5">
                        {match.gaps.map((g, i) => (
                          <li key={i} className="flex items-start gap-2 text-[12px] text-[oklch(0.12_0_0)]">
                            <span className="text-[oklch(0.55_0.16_20)]">-</span>
                            <span>{g}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
