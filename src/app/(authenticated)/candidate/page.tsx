import { getUser } from '@/lib/dal'
import { getCandidateProfile } from '@/lib/dal/candidate-profiles'
import Link from 'next/link'
import { Upload, ChevronRight } from 'lucide-react'

export default async function CandidateDashboardPage() {
  const user = await getUser()
  if (!user) return null

  const profile = await getCandidateProfile(user.id)

  if (!profile) {
    // Case A: No profile exists
    return (
      <div className="max-w-3xl">
        <div className="mb-8">
          <h1 className="text-[oklch(0.12_0_0)] font-semibold text-[28px] tracking-tight mb-2">
            Welcome to Cromwell Chase
          </h1>
          <p className="text-[13px] text-[oklch(0.55_0_0)]">
            Get started by uploading your CV
          </p>
        </div>

        <div className="mb-8">
          <Link
            href="/candidate/upload"
            className="inline-flex items-center gap-2 bg-brand text-brand-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Upload className="size-4" />
            Upload Your CV
          </Link>
        </div>

        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-[oklch(0.55_0_0)] font-medium mb-4">
            How it works
          </h2>
          <ol className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="font-mono text-[12px] text-[oklch(0.55_0_0)]">1.</span>
              <span className="text-[13px] text-[oklch(0.12_0_0)]">Upload your CV in PDF or DOCX format</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-mono text-[12px] text-[oklch(0.55_0_0)]">2.</span>
              <span className="text-[13px] text-[oklch(0.12_0_0)]">Our system extracts your professional details</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-mono text-[12px] text-[oklch(0.55_0_0)]">3.</span>
              <span className="text-[13px] text-[oklch(0.12_0_0)]">Review, edit, and submit for approval</span>
            </li>
          </ol>
        </div>
      </div>
    )
  }

  // Case B: Profile exists
  const statusDotColor = {
    pending_review: 'bg-[oklch(0.70_0.14_85)]',
    active: 'bg-[oklch(0.55_0.14_155)]',
    rejected: 'bg-[oklch(0.55_0.16_20)]',
  }

  const statusTextColor = {
    pending_review: 'text-[oklch(0.70_0.14_85)]',
    active: 'text-[oklch(0.55_0.14_155)]',
    rejected: 'text-[oklch(0.55_0.16_20)]',
  }

  const statusLabel = {
    pending_review: 'Pending Review',
    active: 'Active',
    rejected: 'Rejected',
  }

  const lastUpdated = new Date(profile.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="max-w-3xl">
      {/* Profile Header */}
      <h1 className="text-[oklch(0.12_0_0)] font-semibold text-[28px] tracking-tight mb-2">
        Your Profile
      </h1>

      {/* Status row */}
      <div className="flex items-center gap-3 mb-6">
        <span className={`w-2 h-2 rounded-full ${statusDotColor[profile.status]}`} />
        <span className={`text-[13px] font-medium ${statusTextColor[profile.status]}`}>
          {statusLabel[profile.status]}
        </span>
        <span className="text-[12px] font-mono text-[oklch(0.55_0_0)]">
          Last updated: {lastUpdated}
        </span>
      </div>

      {/* Divider */}
      <div className="border-t border-[oklch(0.90_0_0)]" />

      {/* Rejection feedback */}
      {profile.status === 'rejected' && profile.rejectionNotes && (
        <div className="mt-6 border-l-2 border-[oklch(0.55_0.16_20)] pl-3">
          <p className="text-[13px] text-[oklch(0.55_0.16_20)]">
            {profile.rejectionNotes}
          </p>
        </div>
      )}

      {/* Metrics Row */}
      <div className="flex items-center gap-12 my-8">
        <div className="flex flex-col">
          <span className="font-mono text-[14px] font-medium text-[oklch(0.12_0_0)]">
            {profile.profileSpecializations.length}
          </span>
          <span className="text-[12px] text-[oklch(0.55_0_0)]">Specializations</span>
        </div>
        <div className="h-8 w-[1px] bg-[oklch(0.90_0_0)]" />
        <div className="flex flex-col">
          <span className="font-mono text-[14px] font-medium text-[oklch(0.12_0_0)]">
            {profile.workHistory.length}
          </span>
          <span className="text-[12px] text-[oklch(0.55_0_0)]">Work History</span>
        </div>
        <div className="h-8 w-[1px] bg-[oklch(0.90_0_0)]" />
        <div className="flex flex-col">
          <span className="font-mono text-[14px] font-medium text-[oklch(0.12_0_0)]">
            {profile.education.length}
          </span>
          <span className="text-[12px] text-[oklch(0.55_0_0)]">Education</span>
        </div>
      </div>

      {/* Quick Action Links */}
      <div className="flex gap-6 mb-8">
        <Link
          href="/candidate/profile"
          className="text-[14px] text-[oklch(0.78_0.14_75)] font-medium hover:underline flex items-center gap-1"
        >
          Edit your profile
          <ChevronRight className="size-4" />
        </Link>
        <Link
          href="/candidate/upload"
          className="text-[14px] text-[oklch(0.78_0.14_75)] font-medium hover:underline flex items-center gap-1"
        >
          Re-upload CV
          <ChevronRight className="size-4" />
        </Link>
      </div>

      {/* Divider */}
      <div className="border-t border-[oklch(0.90_0_0)] mb-10" />

      {/* Profile Preview Sections */}
      <div className="space-y-10">
        {/* Specializations */}
        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-[oklch(0.55_0_0)] font-medium mb-4">
            Specializations
          </h2>
          <p className="text-[13px] text-[oklch(0.12_0_0)] leading-relaxed">
            {profile.profileSpecializations.length > 0
              ? profile.profileSpecializations
                  .map((ps) => ps.specialization.name)
                  .join(', ')
              : 'None listed'}
          </p>
          <div className="border-t border-[oklch(0.90_0_0)] mt-8" />
        </div>

        {/* Work History */}
        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-[oklch(0.55_0_0)] font-medium mb-4">
            Work History
          </h2>
          {profile.workHistory.length > 0 ? (
            <div className="space-y-3">
              {profile.workHistory.map((wh) => (
                <div key={wh.id} className="flex justify-between items-baseline text-[13px]">
                  <span className="text-[oklch(0.12_0_0)]">
                    {wh.title} at {wh.employer}
                  </span>
                  <span className="font-mono text-[12px] text-[oklch(0.55_0_0)]">
                    {wh.startDate}{wh.endDate ? ` - ${wh.endDate}` : ' - Present'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-[oklch(0.55_0_0)]">None listed</p>
          )}
          <div className="border-t border-[oklch(0.90_0_0)] mt-8" />
        </div>

        {/* Education */}
        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-[oklch(0.55_0_0)] font-medium mb-4">
            Education
          </h2>
          {profile.education.length > 0 ? (
            <div className="space-y-3">
              {profile.education.map((ed) => (
                <div key={ed.id} className="flex justify-between items-baseline text-[13px]">
                  <span className="text-[oklch(0.12_0_0)]">
                    {ed.degree}, {ed.institution}
                  </span>
                  {ed.year && (
                    <span className="font-mono text-[12px] text-[oklch(0.55_0_0)]">
                      {ed.year}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-[oklch(0.55_0_0)]">None listed</p>
          )}
        </div>
      </div>
    </div>
  )
}
