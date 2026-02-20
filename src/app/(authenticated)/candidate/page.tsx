import { getUser } from '@/lib/dal'
import { getCandidateProfile } from '@/lib/dal/candidate-profiles'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  Upload,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Briefcase,
  GraduationCap,
  Scale,
} from 'lucide-react'

export default async function CandidateDashboardPage() {
  const user = await getUser()
  if (!user) return null

  const profile = await getCandidateProfile(user.id)

  if (!profile) {
    // Case A: No profile exists
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome to the IP Lawyer Network
          </h1>
          <p className="text-muted-foreground">
            Get started by uploading your CV
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Complete Your Profile</CardTitle>
              <CardDescription>
                Upload your CV to create your professional profile. Our system
                will automatically extract your qualifications, experience, and
                specializations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/candidate/upload">
                  <Upload className="size-4" />
                  Upload Your CV
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    1
                  </span>
                  <span>Upload your CV in PDF format</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    2
                  </span>
                  <span>Our system extracts your professional details</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    3
                  </span>
                  <span>Review, edit, and submit for approval</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Case B: Profile exists
  const statusConfig = {
    pending_review: {
      label: 'Pending Review',
      variant: 'outline' as const,
      className: 'border-amber-500 text-amber-700 bg-amber-50',
      icon: Clock,
    },
    active: {
      label: 'Active',
      variant: 'outline' as const,
      className: 'border-green-500 text-green-700 bg-green-50',
      icon: CheckCircle,
    },
    rejected: {
      label: 'Rejected',
      variant: 'outline' as const,
      className: 'border-red-500 text-red-700 bg-red-50',
      icon: XCircle,
    },
  }

  const status = statusConfig[profile.status]
  const StatusIcon = status.icon

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          Candidate Dashboard
        </h1>
        <p className="text-muted-foreground">{user.email}</p>
      </div>

      {/* Profile Summary */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{profile.name}</CardTitle>
              <CardDescription>Profile Status</CardDescription>
            </div>
            <Badge variant={status.variant} className={status.className}>
              <StatusIcon className="mr-1 size-3" />
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {profile.status === 'rejected' && profile.rejectionNotes && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
              <p className="font-medium">Rejection feedback:</p>
              <p>{profile.rejectionNotes}</p>
            </div>
          )}

          {profile.status === 'rejected' && (
            <p className="text-sm text-muted-foreground">
              You can edit your profile and resubmit for review.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Scale className="size-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">
                {profile.profileSpecializations.length}
              </p>
              <p className="text-sm text-muted-foreground">Specializations</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Briefcase className="size-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">
                {profile.workHistory.length}
              </p>
              <p className="text-sm text-muted-foreground">
                Work History Entries
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <GraduationCap className="size-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">
                {profile.education.length}
              </p>
              <p className="text-sm text-muted-foreground">Education Entries</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/candidate/profile">
            <FileText className="size-4" />
            View &amp; Edit Profile
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/candidate/upload">
            <Upload className="size-4" />
            Re-upload CV
          </Link>
        </Button>
      </div>
    </div>
  )
}
