import { getUser } from '@/lib/dal'
import { getCandidateProfile } from '@/lib/dal/candidate-profiles'
import Link from 'next/link'
import { Upload } from 'lucide-react'

export default async function CandidateDashboardPage() {
  const user = await getUser()
  if (!user) return null

  const profile = await getCandidateProfile(user.id)

  if (!profile) {
    // Case A: No profile exists
    return (
      <div className="max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold font-sans">
            Welcome to Cromwell Chase
          </h1>
          <p className="text-sm text-muted-foreground">
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
          <h2 className="text-sm font-medium mb-4">How it works</h2>
          <ol className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="font-mono text-xs text-muted-foreground">1.</span>
              <span className="text-sm">Upload your CV in PDF or DOCX format</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-mono text-xs text-muted-foreground">2.</span>
              <span className="text-sm">Our system extracts your professional details</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-mono text-xs text-muted-foreground">3.</span>
              <span className="text-sm">Review, edit, and submit for approval</span>
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

  const statusLabel = {
    pending_review: 'Pending Review',
    active: 'Active',
    rejected: 'Rejected',
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold font-sans">
          Your Profile
        </h1>
        <div className="mt-1 inline-flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full inline-block ${statusDotColor[profile.status]}`} />
          <span className="text-sm">{statusLabel[profile.status]}</span>
        </div>
      </div>

      <div className="border-b border-border mb-6" />

      {/* Metrics */}
      <div className="flex items-start gap-6 mb-6">
        <div className="pr-6 border-r border-border">
          <p className="font-mono text-base font-semibold">
            {profile.profileSpecializations.length}
          </p>
          <p className="text-xs text-muted-foreground">Specializations</p>
        </div>
        <div className="pr-6 border-r border-border">
          <p className="font-mono text-base font-semibold">
            {profile.workHistory.length}
          </p>
          <p className="text-xs text-muted-foreground">Work History</p>
        </div>
        <div>
          <p className="font-mono text-base font-semibold">
            {profile.education.length}
          </p>
          <p className="text-xs text-muted-foreground">Education</p>
        </div>
      </div>

      {/* Rejection feedback */}
      {profile.status === 'rejected' && profile.rejectionNotes && (
        <div className="mb-6 border-l-2 border-[oklch(0.55_0.16_20)] pl-3">
          <p className="text-sm text-[oklch(0.55_0.16_20)]">
            {profile.rejectionNotes}
          </p>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex items-center gap-4">
        <Link
          href="/candidate/profile"
          className="text-sm text-brand hover:underline"
        >
          Edit your profile &gt;
        </Link>
        <Link
          href="/candidate/upload"
          className="text-sm text-brand hover:underline"
        >
          Re-upload CV &gt;
        </Link>
      </div>
    </div>
  )
}
