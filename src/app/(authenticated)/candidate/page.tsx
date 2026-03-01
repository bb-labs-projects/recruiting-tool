import { getUser } from '@/lib/dal'
import { getCandidateProfile } from '@/lib/dal/candidate-profiles'
import { getMatchesForCandidate } from '@/lib/dal/job-matches'
import Link from 'next/link'
import {
  Upload,
  ChevronRight,
  FileText,
  ScanSearch,
  UserCheck,
  Shield,
  Eye,
  EyeOff,
  Zap,
  Target,
  Lightbulb,
  TrendingUp,
} from 'lucide-react'
import { OpenToOffersToggle } from '@/components/candidate/open-to-offers-toggle'

function matchColor(recommendation: string): string {
  if (recommendation === 'Strong Match') return 'text-[oklch(0.55_0.14_155)]'
  if (recommendation === 'Good Match') return 'text-[oklch(0.55_0.10_250)]'
  if (recommendation === 'Partial Match') return 'text-[oklch(0.70_0.12_75)]'
  return 'text-[oklch(0.55_0_0)]'
}

function scoreBg(score: number): string {
  if (score >= 70) return 'bg-[oklch(0.55_0.14_155)]'
  if (score >= 40) return 'bg-[oklch(0.70_0.14_85)]'
  return 'bg-[oklch(0.55_0.16_20)]'
}

export default async function CandidateDashboardPage() {
  const user = await getUser()
  if (!user) return null

  const profile = await getCandidateProfile(user.id)

  if (!profile) {
    // Case A: No profile exists -- onboarding welcome (split layout)
    return (
      <div className="max-w-5xl">
        {/* Split layout: content left, upload + privacy right */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12 items-start">
          {/* Left column */}
          <div>
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-[oklch(0.12_0_0)] font-semibold text-[32px] tracking-tight mb-2">
                Welcome to Cromwell Chase
              </h1>
              <p className="text-[14px] text-[oklch(0.40_0_0)] leading-relaxed">
                We connect IP professionals with leading firms and in-house teams
                worldwide. Upload your CV to get started.
              </p>
            </div>

            {/* How it works */}
            <div className="mb-8">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-[oklch(0.55_0_0)] font-medium mb-5">
                How it works
              </h2>
              <div className="space-y-4">
                <div className="flex gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-[oklch(0.96_0_0)] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="font-mono text-[11px] font-semibold text-[oklch(0.40_0_0)]">1</span>
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[oklch(0.12_0_0)] mb-0.5">
                      Upload your CV
                    </p>
                    <p className="text-[13px] text-[oklch(0.50_0_0)] leading-relaxed">
                      PDF or DOCX. We automatically extract your qualifications,
                      work history, bar admissions, and technical expertise.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-[oklch(0.96_0_0)] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="font-mono text-[11px] font-semibold text-[oklch(0.40_0_0)]">2</span>
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[oklch(0.12_0_0)] mb-0.5">
                      Review and refine
                    </p>
                    <p className="text-[13px] text-[oklch(0.50_0_0)] leading-relaxed">
                      Edit any field for accuracy -- job titles, education,
                      bar admissions -- then submit for approval.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-[oklch(0.96_0_0)] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="font-mono text-[11px] font-semibold text-[oklch(0.40_0_0)]">3</span>
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[oklch(0.12_0_0)] mb-0.5">
                      Get matched to opportunities
                    </p>
                    <p className="text-[13px] text-[oklch(0.50_0_0)] leading-relaxed">
                      Your profile is matched against open positions. Signal
                      you&apos;re open to offers -- all while staying anonymous.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* What makes a strong profile */}
            <div className="border-t border-[oklch(0.90_0_0)] pt-6">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-[oklch(0.55_0_0)] font-medium mb-4">
                What makes a strong profile
              </h2>
              <div className="space-y-3">
                <div className="flex gap-2.5">
                  <Target className="size-3.5 text-[oklch(0.78_0.14_75)] mt-0.5 shrink-0" />
                  <p className="text-[13px] text-[oklch(0.40_0_0)]">
                    <strong className="text-[oklch(0.12_0_0)]">Clear specializations</strong> -- patent prosecution, litigation, licensing
                  </p>
                </div>
                <div className="flex gap-2.5">
                  <Zap className="size-3.5 text-[oklch(0.78_0.14_75)] mt-0.5 shrink-0" />
                  <p className="text-[13px] text-[oklch(0.40_0_0)]">
                    <strong className="text-[oklch(0.12_0_0)]">Technical depth</strong> -- biotech, software, EE, mechanical
                  </p>
                </div>
                <div className="flex gap-2.5">
                  <TrendingUp className="size-3.5 text-[oklch(0.78_0.14_75)] mt-0.5 shrink-0" />
                  <p className="text-[13px] text-[oklch(0.40_0_0)]">
                    <strong className="text-[oklch(0.12_0_0)]">Complete work history</strong> -- dates and descriptions matter
                  </p>
                </div>
                <div className="flex gap-2.5">
                  <Lightbulb className="size-3.5 text-[oklch(0.78_0.14_75)] mt-0.5 shrink-0" />
                  <p className="text-[13px] text-[oklch(0.40_0_0)]">
                    <strong className="text-[oklch(0.12_0_0)]">Bar admissions</strong> -- patent bar, state, international
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right column -- upload card + privacy (sticky) */}
          <div className="lg:sticky lg:top-24 space-y-4">
            <div className="rounded-xl border border-[oklch(0.90_0_0)] bg-white p-6 shadow-[0_1px_3px_oklch(0_0_0_/_0.06)]">
              <div className="flex flex-col items-center text-center">
                <div className="w-11 h-11 rounded-full bg-[oklch(0.96_0_0)] flex items-center justify-center mb-3">
                  <Upload className="size-5 text-[oklch(0.40_0_0)]" />
                </div>
                <h3 className="text-[15px] font-semibold text-[oklch(0.12_0_0)] mb-1">
                  Get started
                </h3>
                <p className="text-[12px] text-[oklch(0.50_0_0)] mb-4 leading-relaxed">
                  Upload your CV and we&apos;ll build your profile automatically.
                </p>
                <Link
                  href="/candidate/upload"
                  className="w-full h-10 bg-[oklch(0.12_0_0)] hover:bg-[oklch(0.20_0_0)] text-white font-medium text-[13px] rounded-md flex items-center justify-center gap-2 transition-custom"
                >
                  <Upload className="size-4" />
                  Upload Your CV
                </Link>
                <p className="text-[11px] text-[oklch(0.55_0_0)] mt-2.5">
                  PDF or DOCX, up to 10 MB
                </p>
              </div>

              {/* Step icons */}
              <div className="border-t border-[oklch(0.92_0_0)] mt-4 pt-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <FileText className="size-3.5 text-[oklch(0.55_0_0)] mx-auto mb-1" />
                    <p className="text-[10px] text-[oklch(0.50_0_0)]">Upload</p>
                  </div>
                  <div>
                    <ScanSearch className="size-3.5 text-[oklch(0.55_0_0)] mx-auto mb-1" />
                    <p className="text-[10px] text-[oklch(0.50_0_0)]">Review</p>
                  </div>
                  <div>
                    <UserCheck className="size-3.5 text-[oklch(0.55_0_0)] mx-auto mb-1" />
                    <p className="text-[10px] text-[oklch(0.50_0_0)]">Match</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy */}
            <div className="rounded-xl border border-[oklch(0.92_0_0)] bg-[oklch(0.98_0_0)] px-5 py-4">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.08em] text-[oklch(0.55_0_0)] font-medium mb-3">
                Your privacy
              </h3>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Shield className="size-3 text-[oklch(0.55_0_0)] mt-0.5 shrink-0" />
                  <p className="text-[11px] text-[oklch(0.40_0_0)] leading-relaxed">
                    <strong className="text-[oklch(0.20_0_0)]">Anonymized by default.</strong>{' '}
                    Employers never see your name, email, or employer names.
                  </p>
                </div>
                <div className="flex gap-2">
                  <EyeOff className="size-3 text-[oklch(0.55_0_0)] mt-0.5 shrink-0" />
                  <p className="text-[11px] text-[oklch(0.40_0_0)] leading-relaxed">
                    <strong className="text-[oklch(0.20_0_0)]">Pay to unlock.</strong>{' '}
                    Employers pay to see your full identity.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Eye className="size-3 text-[oklch(0.55_0_0)] mt-0.5 shrink-0" />
                  <p className="text-[11px] text-[oklch(0.40_0_0)] leading-relaxed">
                    <strong className="text-[oklch(0.20_0_0)]">Open to offers.</strong>{' '}
                    A discreet signal without revealing who you are.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Case B: Profile exists
  const matches = profile.status === 'active'
    ? await getMatchesForCandidate(profile.id)
    : []

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

      {/* Open to Offers toggle -- only when profile is active */}
      {profile.status === 'active' && (
        <div className="mt-6 flex items-center justify-between rounded-lg border border-[oklch(0.90_0_0)] bg-[oklch(0.98_0_0)] px-4 py-3">
          <div>
            <p className="text-[13px] font-medium text-[oklch(0.12_0_0)]">
              Availability
            </p>
            <p className="text-[12px] text-[oklch(0.55_0_0)]">
              Let employers know you&apos;re open to new opportunities
            </p>
          </div>
          <OpenToOffersToggle
            profileId={profile.id}
            initialValue={profile.openToOffers}
          />
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
        {matches.length > 0 && (
          <>
            <div className="h-8 w-[1px] bg-[oklch(0.90_0_0)]" />
            <div className="flex flex-col">
              <span className="font-mono text-[14px] font-medium text-[oklch(0.12_0_0)]">
                {matches.length}
              </span>
              <span className="text-[12px] text-[oklch(0.55_0_0)]">Job Matches</span>
            </div>
          </>
        )}
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

      {/* Job Matches Section */}
      {profile.status === 'active' && matches.length > 0 && (
        <div className="mb-10">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-[oklch(0.55_0_0)] font-medium mb-4">
            Your Matches
          </h2>
          <p className="text-[13px] text-[oklch(0.50_0_0)] mb-6">
            These roles match your profile. Employer details are revealed when they unlock your profile.
          </p>
          <div className="space-y-3">
            {matches.map((match) => (
              <div
                key={match.id}
                className="rounded-lg border border-[oklch(0.90_0_0)] p-4 hover:border-[oklch(0.80_0_0)] transition-custom"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[14px] font-medium text-[oklch(0.12_0_0)]">
                    {match.jobTitle}
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className={`text-[12px] font-medium ${matchColor(match.recommendation)}`}>
                      {match.recommendation}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1.5 bg-[oklch(0.90_0_0)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scoreBg(match.overallScore)}`}
                          style={{ width: `${match.overallScore}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-[oklch(0.40_0_0)]">
                        {match.overallScore}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-[12px] text-[oklch(0.50_0_0)] leading-relaxed mb-2">
                  {match.summary}
                </p>
                {match.strengths.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {match.strengths.map((s, i) => (
                      <span
                        key={i}
                        className="text-[11px] text-[oklch(0.55_0.14_155)] bg-[oklch(0.96_0.02_155)] px-2 py-0.5 rounded"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-[oklch(0.90_0_0)] mt-10" />
        </div>
      )}

      {/* No matches yet -- guidance */}
      {profile.status === 'active' && matches.length === 0 && (
        <div className="mb-10">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-[oklch(0.55_0_0)] font-medium mb-4">
            Your Matches
          </h2>
          <div className="rounded-lg border border-dashed border-[oklch(0.85_0_0)] bg-[oklch(0.98_0_0)] p-6 text-center">
            <Target className="size-5 text-[oklch(0.55_0_0)] mx-auto mb-2" />
            <p className="text-[13px] text-[oklch(0.40_0_0)]">
              No matches yet. When employers post roles that fit your profile,
              they&apos;ll appear here.
            </p>
          </div>
          <div className="border-t border-[oklch(0.90_0_0)] mt-10" />
        </div>
      )}

      {/* Pending/rejected: guidance to get approved */}
      {profile.status !== 'active' && (
        <div className="mb-10">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-[oklch(0.55_0_0)] font-medium mb-4">
            Improve your profile
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-3">
              <Target className="size-4 text-[oklch(0.78_0.14_75)] mt-0.5 shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-[oklch(0.12_0_0)] mb-0.5">Clear specializations</p>
                <p className="text-[12px] text-[oklch(0.50_0_0)]">
                  Be specific about your practice areas
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Zap className="size-4 text-[oklch(0.78_0.14_75)] mt-0.5 shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-[oklch(0.12_0_0)] mb-0.5">Technical depth</p>
                <p className="text-[12px] text-[oklch(0.50_0_0)]">
                  List your technical domains for better matching
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <TrendingUp className="size-4 text-[oklch(0.78_0.14_75)] mt-0.5 shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-[oklch(0.12_0_0)] mb-0.5">Complete dates</p>
                <p className="text-[12px] text-[oklch(0.50_0_0)]">
                  Full work history with dates helps scoring
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Lightbulb className="size-4 text-[oklch(0.78_0.14_75)] mt-0.5 shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-[oklch(0.12_0_0)] mb-0.5">Bar admissions</p>
                <p className="text-[12px] text-[oklch(0.50_0_0)]">
                  All jurisdictions increase your match potential
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-[oklch(0.90_0_0)] mt-10" />
        </div>
      )}

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
