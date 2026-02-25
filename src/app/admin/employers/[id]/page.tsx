import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { employerProfiles, users } from '@/lib/db/schema'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { EmployerActions } from '@/components/admin/employer-actions'
import { VerificationSection } from '@/components/admin/verification-section'
import { updateCorporateDomains } from '@/actions/employer-domains'
import { cn } from '@/lib/utils'

const employerStatusStyles = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-teal-50 text-teal-700 border-teal-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
} as const

const employerStatusLabels = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
} as const

export default async function EmployerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Fetch employer profile with user email via join
  const [employer] = await db
    .select({
      id: employerProfiles.id,
      companyName: employerProfiles.companyName,
      companyWebsite: employerProfiles.companyWebsite,
      contactName: employerProfiles.contactName,
      contactTitle: employerProfiles.contactTitle,
      phone: employerProfiles.phone,
      status: employerProfiles.status,
      rejectionReason: employerProfiles.rejectionReason,
      reviewedAt: employerProfiles.reviewedAt,
      createdAt: employerProfiles.createdAt,
      tobAcceptedAt: employerProfiles.tobAcceptedAt,
      tobVersion: employerProfiles.tobVersion,
      userEmail: users.email,
      corporateEmailDomain: employerProfiles.corporateEmailDomain,
      isFreemailDomain: employerProfiles.isFreemailDomain,
      corporateDomains: employerProfiles.corporateDomains,
      tradeLicenceFilename: employerProfiles.tradeLicenceFilename,
      tradeLicenceStoragePath: employerProfiles.tradeLicenceStoragePath,
      tradeLicenceUploadedAt: employerProfiles.tradeLicenceUploadedAt,
      verificationNotes: employerProfiles.verificationNotes,
    })
    .from(employerProfiles)
    .innerJoin(users, eq(employerProfiles.userId, users.id))
    .where(eq(employerProfiles.id, id))
    .limit(1)

  if (!employer) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back link */}
      <Link
        href="/admin/employers"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to employers
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight font-[family-name:var(--font-outfit)]">{employer.companyName}</h1>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                employerStatusStyles[employer.status]
              )}
            >
              {employerStatusLabels[employer.status]}
            </Badge>
            {employer.reviewedAt && (
              <span className="text-xs text-muted-foreground">
                Reviewed{' '}
                {new Date(employer.reviewedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <EmployerActions
          employerProfileId={employer.id}
          status={employer.status}
          rejectionReason={employer.rejectionReason}
        />
      </div>

      {/* Rejection reason banner */}
      {employer.status === 'rejected' && employer.rejectionReason && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-700">
            Rejection Reason:
          </p>
          <p className="text-sm text-red-600 mt-1">
            {employer.rejectionReason}
          </p>
        </div>
      )}

      {/* Company Details */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Company Name
              </dt>
              <dd className="mt-1 text-sm">{employer.companyName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Company Website
              </dt>
              <dd className="mt-1 text-sm">
                {employer.companyWebsite ? (
                  <a
                    href={employer.companyWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {employer.companyWebsite}
                  </a>
                ) : (
                  <span className="text-muted-foreground">Not provided</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Email Domain
              </dt>
              <dd className="mt-1 text-sm flex items-center gap-2">
                {employer.corporateEmailDomain ?? (
                  <span className="text-muted-foreground">Unknown</span>
                )}
                {employer.isFreemailDomain && (
                  <Badge
                    variant="outline"
                    className="bg-amber-50 text-amber-700 border-amber-200"
                  >
                    Freemail
                  </Badge>
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Separator />

      {/* Corporate Domains (Suppression) */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>Corporate Domains</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              Current Domains
            </dt>
            <dd className="mt-1 text-sm">
              {employer.corporateDomains && employer.corporateDomains.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {employer.corporateDomains.map((domain) => (
                    <Badge key={domain} variant="outline">
                      {domain}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">None configured</span>
              )}
            </dd>
          </div>
          <Separator />
          <form action={async (formData: FormData) => { 'use server'; await updateCorporateDomains(formData) }} className="space-y-3">
            <input type="hidden" name="employerProfileId" value={employer.id} />
            <div className="space-y-2">
              <Label htmlFor="corporateDomains">Update Domains</Label>
              <Input
                id="corporateDomains"
                name="corporateDomains"
                type="text"
                defaultValue={employer.corporateDomains?.join(', ') ?? ''}
                placeholder="acme.com, acme.co.uk"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list. Used to suppress candidates with matching email domains.
              </p>
            </div>
            <Button type="submit" size="sm" variant="outline">
              Save Domains
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Contact Details */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Contact Name
              </dt>
              <dd className="mt-1 text-sm">{employer.contactName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Contact Title
              </dt>
              <dd className="mt-1 text-sm">
                {employer.contactTitle ?? (
                  <span className="text-muted-foreground">Not provided</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Email
              </dt>
              <dd className="mt-1 text-sm">{employer.userEmail}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Phone
              </dt>
              <dd className="mt-1 text-sm">
                {employer.phone ?? (
                  <span className="text-muted-foreground">Not provided</span>
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Separator />

      {/* Account Details */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Status
              </dt>
              <dd className="mt-1">
                <Badge
                  variant="outline"
                  className={cn(
                    employerStatusStyles[employer.status],
                    'border-transparent'
                  )}
                >
                  {employerStatusLabels[employer.status]}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Applied On
              </dt>
              <dd className="mt-1 text-sm">
                {new Date(employer.createdAt).toLocaleDateString()}
              </dd>
            </div>
            {employer.reviewedAt && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Reviewed On
                </dt>
                <dd className="mt-1 text-sm">
                  {new Date(employer.reviewedAt).toLocaleDateString()}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Terms of Business
              </dt>
              <dd className="mt-1 text-sm">
                {employer.tobAcceptedAt ? (
                  <span>
                    Accepted on{' '}
                    {new Date(employer.tobAcceptedAt).toLocaleDateString()}
                    {employer.tobVersion && ` (v${employer.tobVersion})`}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Not accepted</span>
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Separator />

      {/* Verification */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>Verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              Trade Licence
            </dt>
            <dd className="mt-1 text-sm">
              {employer.tradeLicenceStoragePath ? (
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-teal-600" />
                  <span>{employer.tradeLicenceFilename}</span>
                  {employer.tradeLicenceUploadedAt && (
                    <span className="text-xs text-muted-foreground">
                      Uploaded {new Date(employer.tradeLicenceUploadedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground">Not uploaded</span>
              )}
            </dd>
          </div>

          <VerificationSection
            employerProfileId={employer.id}
            tradeLicenceStoragePath={employer.tradeLicenceStoragePath}
            tradeLicenceFilename={employer.tradeLicenceFilename}
            verificationNotes={employer.verificationNotes}
          />
        </CardContent>
      </Card>
    </div>
  )
}
