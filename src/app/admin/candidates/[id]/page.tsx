import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { db } from '@/lib/db'
import { StatusBadge } from '@/components/admin/status-badge'
import { ProfileForm, type ProfileFormData } from '@/components/admin/profile-form'
import { ProfileActions } from './profile-actions'
import { PdfViewer } from '@/components/admin/pdf-viewer'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'

export default async function ProfileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const profile = await db.query.profiles.findFirst({
    where: (profiles, { eq }) => eq(profiles.id, id),
    with: {
      education: true,
      workHistory: true,
      barAdmissions: true,
      profileSpecializations: { with: { specialization: true } },
      profileTechnicalDomains: { with: { technicalDomain: true } },
      cvUploads: true,
    },
  })

  if (!profile) {
    notFound()
  }

  // Transform junction table data for ProfileForm
  const profileData: ProfileFormData = {
    id: profile.id,
    name: profile.name,
    nameConfidence: profile.nameConfidence,
    email: profile.email,
    emailConfidence: profile.emailConfidence,
    phone: profile.phone,
    phoneConfidence: profile.phoneConfidence,
    education: profile.education.map((edu) => ({
      id: edu.id,
      institution: edu.institution,
      degree: edu.degree,
      field: edu.field,
      year: edu.year,
      confidence: edu.confidence,
    })),
    workHistory: profile.workHistory.map((wh) => ({
      id: wh.id,
      employer: wh.employer,
      title: wh.title,
      startDate: wh.startDate,
      endDate: wh.endDate,
      description: wh.description,
      confidence: wh.confidence,
    })),
    barAdmissions: profile.barAdmissions.map((ba) => ({
      id: ba.id,
      jurisdiction: ba.jurisdiction,
      year: ba.year,
      status: ba.status,
      confidence: ba.confidence,
    })),
    specializations: profile.profileSpecializations.map((ps) => ({
      name: ps.specialization.name,
      confidence: ps.confidence,
    })),
    technicalDomains: profile.profileTechnicalDomains.map((ptd) => ({
      name: ptd.technicalDomain.name,
      confidence: ptd.confidence,
    })),
  }

  // Find a CV with a blobUrl for the PDF viewer
  const cvWithPdf = profile.cvUploads.find((cv) => cv.blobUrl)
  const cvStoragePath = cvWithPdf?.storagePath ?? null
  const cvPublicUrl = cvWithPdf?.blobUrl ?? null
  const hasPdf = !!(cvStoragePath || cvPublicUrl)

  const headerContent = (
    <div className="space-y-4 mb-8">
      <Link
        href="/admin/candidates"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to candidates
      </Link>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight font-[family-name:var(--font-outfit)]">{profile.name}</h1>
          <div className="flex items-center gap-2">
            <StatusBadge status={profile.status} />
            {profile.reviewedAt && (
              <span className="text-xs text-muted-foreground">
                Reviewed {new Date(profile.reviewedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <ProfileActions
          profileId={profile.id}
          status={profile.status}
          rejectionNotes={profile.rejectionNotes}
        />
      </div>
      {profile.status === 'rejected' && profile.rejectionNotes && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-700">Rejection Notes:</p>
          <p className="text-sm text-red-600 mt-1">{profile.rejectionNotes}</p>
        </div>
      )}
    </div>
  )

  // Side-by-side layout when PDF exists
  if (hasPdf) {
    return (
      <ResizablePanelGroup orientation="horizontal" className="min-h-[calc(100vh-8rem)]">
        <ResizablePanel defaultSize={45} minSize={25}>
          <PdfViewer storagePath={cvStoragePath} publicUrl={cvPublicUrl} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={55} minSize={30}>
          <div className="h-full overflow-y-auto p-6">
            {headerContent}
            <ProfileForm profile={profileData} />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
  }

  // Full-width layout when no PDF
  return (
    <div className="mx-auto max-w-4xl p-6">
      {headerContent}
      <ProfileForm profile={profileData} />
    </div>
  )
}
