import { getUser } from '@/lib/dal'
import { getCandidateProfile } from '@/lib/dal/candidate-profiles'
import { redirect } from 'next/navigation'
import {
  CandidateProfileForm,
  type CandidateProfileFormData,
} from '@/components/candidate/profile-form'
import { submitProfileForReview } from '@/actions/candidate-profiles'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  CheckCircle,
  Clock,
  XCircle,
  Upload,
  Info,
  AlertTriangle,
} from 'lucide-react'

export default async function CandidateProfilePage() {
  const user = await getUser()
  if (!user) return null

  const profile = await getCandidateProfile(user.id)

  if (!profile) {
    redirect('/candidate/upload')
  }

  // Transform DAL profile to form data (strip confidence fields)
  const formData: CandidateProfileFormData = {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    education: profile.education.map((e) => ({
      id: e.id,
      institution: e.institution,
      degree: e.degree,
      field: e.field,
      year: e.year,
    })),
    workHistory: profile.workHistory.map((w) => ({
      id: w.id,
      employer: w.employer,
      title: w.title,
      startDate: w.startDate,
      endDate: w.endDate,
      description: w.description,
    })),
    barAdmissions: profile.barAdmissions.map((b) => ({
      id: b.id,
      jurisdiction: b.jurisdiction,
      year: b.year,
      status: b.status,
    })),
    specializations: profile.profileSpecializations.map((ps) => ({
      name: ps.specialization.name,
    })),
    technicalDomains: profile.profileTechnicalDomains.map((ptd) => ({
      name: ptd.technicalDomain.name,
    })),
  }

  const statusConfig = {
    pending_review: {
      label: 'Pending Review',
      className: 'border-amber-200 text-amber-700 bg-amber-50',
      icon: Clock,
    },
    active: {
      label: 'Active',
      className: 'border-teal-200 text-teal-700 bg-teal-50',
      icon: CheckCircle,
    },
    rejected: {
      label: 'Rejected',
      className: 'border-red-200 text-red-700 bg-red-50',
      icon: XCircle,
    },
  }

  const status = statusConfig[profile.status]
  const StatusIcon = status.icon

  return (
    <div>
      {/* Header with status */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-[family-name:var(--font-outfit)]">My Profile</h1>
          <p className="text-muted-foreground">{profile.name}</p>
        </div>
        <Badge variant="outline" className={status.className}>
          <StatusIcon className="mr-1 size-3" />
          {status.label}
        </Badge>
      </div>

      {/* Status banners */}
      {profile.status === 'active' && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>
            Your profile is live and visible to employers. Editing will send it
            back for review.
          </p>
        </div>
      )}

      {profile.status === 'rejected' && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Your profile needs changes</p>
            {profile.rejectionNotes && (
              <p className="mt-1">{profile.rejectionNotes}</p>
            )}
            <p className="mt-1 text-muted-foreground">
              Edit your profile below and resubmit for review.
            </p>
          </div>
        </div>
      )}

      {profile.status === 'pending_review' && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <Clock className="mt-0.5 size-4 shrink-0" />
          <p>
            Your profile is being reviewed by our team. You can still edit your
            information below.
          </p>
        </div>
      )}

      {/* Profile form */}
      <CandidateProfileForm profile={formData} />

      {/* Action buttons */}
      <div className="mt-6 flex gap-3">
        {(profile.status === 'pending_review' ||
          profile.status === 'rejected') && (
          <form
            action={async (formData: FormData) => {
              'use server'
              await submitProfileForReview(formData)
            }}
          >
            <input type="hidden" name="profileId" value={profile.id} />
            <Button type="submit" className="rounded-lg transition-all">Submit for Review</Button>
          </form>
        )}
        <Button variant="outline" asChild className="rounded-lg transition-all">
          <Link href="/candidate/upload">
            <Upload className="size-4" />
            Re-upload CV
          </Link>
        </Button>
      </div>
    </div>
  )
}
