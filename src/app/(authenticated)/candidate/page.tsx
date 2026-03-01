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
    // Case A: No profile exists -- onboarding welcome
    return (
      <div className="max-w-3xl">
        <div className="mb-10">
          <h1 className="text-[oklch(0.12_0_0)] font-semibold text-[28px] tracking-tight mb-2">
            Welcome to Cromwell Chase
          </h1>
          <p className="text-[14px] text-[oklch(0.40_0_0)] leading-relaxed max-w-lg">
            We connect IP professionals with leading firms and in-house teams
            worldwide. Upload your CV to get started.
          </p>
        </div>

        {/* Upload CTA */}
        <div className="mb-12">
          <Link
            href="/candidate/upload"
            className="inline-flex items-center gap-3 bg-[oklch(0.12_0_0)] text-white rounded-lg px-6 py-3.5 text-[14px] font-medium hover:bg-[oklch(0.20_0_0)] transition-custom"
          >
            <Upload className="size-4" />
            Upload Your CV
          </Link>
          <p className="text-[12px] text-[oklch(0.55_0_0)] mt-2">
            PDF or DOCX, up to 10 MB
          </p>
        </div>

        {/* How it works -- expanded */}
        <div className="mb-12">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-[oklch(0.55_0_0)] font-medium mb-6">
            How it works
          </h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[oklch(0.96_0_0)] flex items-center justify-center shrink-0">
                <FileText className="size-4 text-[oklch(0.40_0_0)]" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-[oklch(0.12_0_0)] mb-1">
                  Upload your CV
                </p>
                <p className="text-[13px] text-[oklch(0.50_0_0)] leading-relaxed">
                  Upload your CV in PDF or DOCX format. Our system automatically
                  extracts your qualifications, work history, bar admissions,
                  and technical expertise.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[oklch(0.96_0_0)] flex items-center justify-center shrink-0">
                <ScanSearch className="size-4 text-[oklch(0.40_0_0)]" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-[oklch(0.12_0_0)] mb-1">
                  Review and refine
                </p>
                <p className="text-[13px] text-[oklch(0.50_0_0)] leading-relaxed">
                  Check the extracted details for accuracy. You can edit any
                  field -- job titles, education, bar admissions -- to make
                  sure your profile is complete and correct.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[oklch(0.96_0_0)] flex items-center justify-center shrink-0">
                <UserCheck className="size-4 text-[oklch(0.40_0_0)]" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-[oklch(0.12_0_0)] mb-1">
                  Get matched to opportunities
                </p>
                <p className="text-[13px] text-[oklch(0.50_0_0)] leading-relaxed">
                  Once approved, your profile is matched against open positions.
                  You&apos;ll see which roles align with your experience and can
                  signal that you&apos;re open to offers -- all while staying anonymous.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* What makes a strong profile */}
        <div className="border-t border-[oklch(0.90_0_0)] pt-8 mb-12">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-[oklch(0.55_0_0)] font-medium mb-6">
            What makes a strong profile
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-3">
              <Target className="size-4 text-[oklch(0.78_0.14_75)] mt-0.5 shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-[oklch(0.12_0_0)] mb-0.5">Clear specializations</p>
                <p className="text-[12px] text-[oklch(0.50_0_0)]">
                  Patent prosecution, litigation, licensing -- be specific about your practice areas
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Zap className="size-4 text-[oklch(0.78_0.14_75)] mt-0.5 shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-[oklch(0.12_0_0)] mb-0.5">Technical depth</p>
                <p className="text-[12px] text-[oklch(0.50_0_0)]">
                  List your technical domains -- biotech, software, EE -- so employers can find the right fit
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <TrendingUp className="size-4 text-[oklch(0.78_0.14_75)] mt-0.5 shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-[oklch(0.12_0_0)] mb-0.5">Complete work history</p>
                <p className="text-[12px] text-[oklch(0.50_0_0)]">
                  Include dates and descriptions. Longer tenure signals commitment to employers.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Lightbulb className="size-4 text-[oklch(0.78_0.14_75)] mt-0.5 shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-[oklch(0.12_0_0)] mb-0.5">Bar admissions</p>
                <p className="text-[12px] text-[oklch(0.50_0_0)]">
                  Patent bar, state bars, and international qualifications all increase your match potential
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy section */}
        <div className="border-t border-[oklch(0.90_0_0)] pt-8">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-[oklch(0.55_0_0)] font-medium mb-6">
            Your privacy
          </h2>
          <div className="space-y-4">
            <div className="flex gap-3">
              <Shield className="size-4 text-[oklch(0.55_0_0)] mt-0.5 shrink-0" />
              <p className="text-[13px] text-[oklch(0.40_0_0)] leading-relaxed">
                Your profile is <strong className="text-[oklch(0.12_0_0)]">anonymized by default</strong>.
                Employers see your specializations, experience level, and qualifications
                but never your name, email, phone, or employer names.
              </p>
            </div>
            <div className="flex gap-3">
              <EyeOff className="size-4 text-[oklch(0.55_0_0)] mt-0.5 shrink-0" />
              <p className="text-[13px] text-[oklch(0.40_0_0)] leading-relaxed">
                Employers must <strong className="text-[oklch(0.12_0_0)]">pay to unlock</strong> your
                full identity. You stay in control of your visibility.
              </p>
            </div>
            <div className="flex gap-3">
              <Eye className="size-4 text-[oklch(0.55_0_0)] mt-0.5 shrink-0" />
              <p className="text-[13px] text-[oklch(0.40_0_0)] leading-relaxed">
                Once your profile is live, you can signal that you&apos;re
                <strong className="text-[oklch(0.12_0_0)]"> open to offers</strong> --
                a discreet indicator visible to employers without revealing who you are.
              </p>
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
