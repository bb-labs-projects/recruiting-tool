import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
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
import { EmployerActions } from '@/components/admin/employer-actions'
import { cn } from '@/lib/utils'

const employerStatusStyles = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
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
      userEmail: users.email,
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
          <h1 className="text-2xl font-bold">{employer.companyName}</h1>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                employerStatusStyles[employer.status],
                'border-transparent'
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
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-sm font-medium text-destructive">
            Rejection Reason:
          </p>
          <p className="text-sm text-destructive/80 mt-1">
            {employer.rejectionReason}
          </p>
        </div>
      )}

      {/* Company Details */}
      <Card>
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
          </dl>
        </CardContent>
      </Card>

      <Separator />

      {/* Contact Details */}
      <Card>
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
      <Card>
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
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
